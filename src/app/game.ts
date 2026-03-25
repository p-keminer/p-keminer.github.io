import { buildCombatEvent, createPresentationStateMachine } from './combat';
import { createCombatSfxController } from '../audio/combat-sfx';
import { createSoundController } from '../audio/sound';
import { createChessEngine } from '../chess/engine';
import type { BoardSquare, ChessGameSnapshot, ChessPieceType } from '../chess/state';
import type { CombatPresentationEventInput } from '../render/combat-presentation';
import {
  DEFAULT_PIECE_ASSET_SET,
  loadBoardVisualAsset,
  loadPieceVisualAssets,
  type PieceAssetSet
} from '../render/loaders';
import {
  createBoardPreviewScene,
  type BoardPreviewSnapshot,
  type RoomFocusTargetId,
  type StartFlowMode
} from '../render/scene';
import { renderControls } from '../ui/controls';
import { hideLegalOverlay, showLegalOverlay } from '../ui/legal-overlay';

export interface MountedGame {
  advanceTime: (ms: number) => void;
  assetsReady: Promise<void>;
  debugPreviewCombatCamera: (options?: {
    attackerType?: ChessPieceType;
    capturedSquare?: BoardSquare;
    durationMs?: number;
    from?: BoardSquare;
    mode?: 'board' | 'combat';
    phase?: NonNullable<GameSnapshot['presentation']['combatPhase']>;
    phaseProgress?: number;
    remainingMs?: number;
    to?: BoardSquare;
    victimType?: ChessPieceType;
  }) => void;
  destroy: () => void;
  renderGameToText: () => string;
}

interface GameInteractionControllerState {
  legalTargetSquares: BoardSquare[];
  selectedSquare: BoardSquare | null;
}

interface GameSnapshot extends BoardPreviewSnapshot {
  assetLoading: {
    pendingPieceAssetSet: PieceAssetSet | null;
    pieces: boolean;
  };
  capturedPieces: ChessGameSnapshot['capturedPieces'];
  checkedKingSquare: ChessGameSnapshot['checkedKingSquare'];
  fen: string;
  gameOver: ChessGameSnapshot['gameOver'];
  gameResult: ChessGameSnapshot['gameResult'];
  gameStatus: ChessGameSnapshot['status'];
  inCheck: ChessGameSnapshot['inCheck'];
  lastMove: ChessGameSnapshot['lastMove'];
  moveHistory: ChessGameSnapshot['moveHistory'];
  presentation: ReturnType<ReturnType<typeof createPresentationStateMachine>['getSnapshot']>;
  restartAvailable: ChessGameSnapshot['restartAvailable'];
  sound: {
    combat: ReturnType<ReturnType<typeof createCombatSfxController>['getSnapshot']>;
    lastEvent: string | null;
  };
  startFlow: {
    activePictureFrameDetailId: string;
    currentRoomFocusTarget: RoomFocusTargetId | null;
    gameplayInteractionEnabled: boolean;
    hoveredRoomHotspot: RoomFocusTargetId | null;
    introTransitionActive: boolean;
    roomFocusTransitionActive: boolean;
    state: StartFlowMode;
  };
  statusPresentation: ChessGameSnapshot['statusPresentation'];
  turn: ChessGameSnapshot['activeColor'];
  undoAvailable: ChessGameSnapshot['undoAvailable'];
}

const START_FLOW_INTRO_DURATION_MS = 1400;
const ROOM_FOCUS_TRANSITION_DURATION_MS = 700;
const ROOM_FOCUS_TARGET_OPTIONS: ReadonlyArray<{ id: RoomFocusTargetId; label: string }> = [
  { id: 'overview', label: 'Room Overview' },
  { id: 'displayCase', label: 'Zertifikate' },
  { id: 'board', label: 'Schachbrett' },
  { id: 'workbench', label: 'Workbench' },
  { id: 'pictureFrame', label: 'Leistungsnachweise' },
  { id: 'pictureFrameDetail', label: 'Certificate Detail' },
  { id: 'webEmbed', label: 'Portfolio Website' }
];

export function mountGame(root: HTMLDivElement): MountedGame {
  const engine = createChessEngine();
  const presentationStateMachine = createPresentationStateMachine();
  const soundController = createSoundController();
  const combatSfxController = createCombatSfxController({ soundController });
  let boardAssetRequestId = 0;
  let isDisposed = false;
  let pendingPieceAssetSet: PieceAssetSet | null = null;
  let presentationFrameHandle = 0;
  let presentationLastFrameTime = 0;
  let pieceAssetRequestId = 0;
  let pieceAssetSetLoading = false;
  let startFlowFrameHandle = 0;
  let startFlowLastFrameTime = 0;
  let startFlowElapsedMs = 0;
  let roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
  let roomFocusFromTarget: RoomFocusTargetId = 'overview';
  let startFlowState: StartFlowMode = 'menu';
  let roomFocusTarget: RoomFocusTargetId = 'overview';
  let hoveredRoomHotspot: RoomFocusTargetId | null = null;
  let hoveredPictureFrameId: string | null = null;
  let activePictureFrameDetailId = 'frame0';
  let pendingMenuReturn = false;
  let legalWallTab: 'impressum' | 'datenschutz' = 'impressum';
  const controllerState: GameInteractionControllerState = {
    legalTargetSquares: [],
    selectedSquare: null
  };

  // Intro-Overlay-Gate: wird aufgelöst wenn Raum-GLB zuerst geladen wurde UND erstes
  // Figuren-Asset-Set abgeschlossen ist. Beide sind nötig damit die Szene beim Eintritt korrekt aussieht.
  let resolveRoomLoaded!: () => void;
  let resolvePiecesLoaded!: () => void;
  const assetsReady = Promise.all([
    new Promise<void>(r => { resolveRoomLoaded = r; }),
    new Promise<void>(r => { resolvePiecesLoaded = r; })
  ]).then(() => new Promise<void>(resolve => {
    // GLBs sind heruntergeladen und geparst — aber die GPU muss noch WebGL-Programme
    // (Shader) kompilieren und Texturen während der ersten Render-Frames hochladen.
    // Zähle 60 rAF-Ticks, dann warte 2 s mehr damit alle Background-Aufgaben
    // (Shader-Kompilierung, Textur-Uploads) vollständig verteilt sind.
    let frames = 0;
    function tick(): void {
      if (++frames >= 60) {
        setTimeout(resolve, 2000);
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }));

  root.innerHTML = `
    <main class="app-shell">
      <section class="stage-panel">
        <div class="stage-frame" style="position: relative;">
          <div class="scene-root" data-scene-root></div>
          <div data-room-hotspots-root style="inset: 0; pointer-events: none; position: absolute;"></div>
          <div class="canvas-hud-controls" data-controls-root></div>
        </div>
      </section>
    </main>
  `;

  const sceneRoot = root.querySelector<HTMLDivElement>('[data-scene-root]');
  const controlsRoot = root.querySelector<HTMLElement>('[data-controls-root]');
  const roomHotspotsRoot = root.querySelector<HTMLDivElement>('[data-room-hotspots-root]');

  if (!sceneRoot || !controlsRoot || !roomHotspotsRoot) {
    throw new Error('Missing game shell mount points.');
  }

  const isPieceAssetToggleLocked = (): boolean =>
    pieceAssetSetLoading || presentationStateMachine.getSnapshot().mode === 'combat';

  const handleControlsClick = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-control]');

    if (!button || button.disabled) {
      return;
    }

    const action = button.dataset.control;

    if (action === 'start-game') {
      if (startFlowState === 'menu') {
        beginStartFlowTransition();
      }

      return;
    }

    if (action === 'room-focus') {
      const requestedTarget = button.dataset.roomFocusTarget;

      if (startFlowState === 'roomExplore' && isRoomFocusTargetId(requestedTarget)) {
        focusRoomTarget(requestedTarget);
      }

      return;
    }

    if (action === 'enter-board-focus') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'board' && !isRoomFocusTransitionActive()) {
        enterBoardFocus();
      }

      return;
    }

    if (action === 'enter-display-case-focus') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'displayCase' && !isRoomFocusTransitionActive()) {
        enterDisplayCaseFocus();
      }

      return;
    }

    if (action === 'direct-to-leistungen') {
      if (startFlowState === 'menu') {
        beginStartFlowTransitionToTarget('pictureFrame');
      }

      return;
    }

    if (action === 'direct-to-portfolio') {
      if (startFlowState === 'menu') {
        beginStartFlowTransitionToTarget('webEmbed');
      }

      return;
    }

    if (action === 'enter-web-embed') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'workbench' && !isRoomFocusTransitionActive()) {
        focusRoomTarget('webEmbed');
      }

      return;
    }

    if (action === 'legal-impressum' || action === 'legal-datenschutz') {
      if (startFlowState === 'menu' || startFlowState === 'roomExplore') {
        legalWallTab = action === 'legal-impressum' ? 'impressum' : 'datenschutz';
        if (startFlowState === 'menu') {
          beginStartFlowTransitionToTarget('legalWall');
        } else {
          focusRoomTarget('legalWall');
        }
      }
      return;
    }

    if (action === 'legal-to-overview') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'legalWall') {
        focusRoomTarget('overview');
      }
      return;
    }

    if (action === 'legal-to-menu') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'legalWall') {
        returnToMenuFromFocus();
      }
      return;
    }

    if (action === 'return-to-room') {
      if (startFlowState === 'boardFocus' || startFlowState === 'displayCaseFocus') {
        returnToRoomExplore();
      }

      return;
    }

    if (action === 'return-to-menu') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'overview' && !isRoomFocusTransitionActive()) {
        // Erst Look-Around sanft zurückschwenken, dann Menü-Transition starten.
        preview.requestLookAroundReset(() => {
          returnToMenu();
        });
      }

      return;
    }

    if (action === 'return-to-menu-from-focus') {
      if (startFlowState === 'roomExplore' && !isRoomFocusTransitionActive()) {
        returnToMenuFromFocus();
      }

      return;
    }

    if (action === 'back-from-web-embed') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'webEmbed' && !isRoomFocusTransitionActive()) {
        focusRoomTarget('workbench');
      }

      return;
    }

    if (action === 'back-from-picture-frame-detail') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'pictureFrameDetail' && !isRoomFocusTransitionActive()) {
        focusRoomTarget('pictureFrame');
      }

      return;
    }

    if (startFlowState !== 'boardFocus') {
      return;
    }

    if (action === 'piece-asset-set') {
      const requestedAssetSet = button.dataset.pieceAssetSet;

      if (
        (requestedAssetSet === 'starter' || requestedAssetSet === 'blockout') &&
        !isPieceAssetToggleLocked() &&
        requestedAssetSet !== preview.getSnapshot().assets.pieceAssetSet
      ) {
        void loadPieceAssets(requestedAssetSet);
      }

      return;
    }

    if (action === 'camera-reset') {
      preview.resetCameraState();
      syncPanels();
      return;
    }

    if (action === 'restart') {
      engine.restart();
      clearPresentationState();
      resetTransientInteractionState();
      syncSceneFromState(engine.getSnapshot(), { immediate: true });
      syncPanels();
      return;
    }

    if (action === 'undo' && engine.undo()) {
      clearPresentationState();
      resetTransientInteractionState();
      syncSceneFromState(engine.getSnapshot(), { immediate: true });
      syncPanels();
    }
  };

  const handleRoomHotspotClick = (event: Event): void => {
    // [data-control]-Klicks die in der Hotspots-Schicht leben
    // (z.B. web-embed-nav Buttons) an Controls-Handler weiterleiten.
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-control]')) {
      handleControlsClick(event);
      return;
    }

    if (startFlowState !== 'roomExplore') {
      return;
    }

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const hotspotButton = target.closest<HTMLButtonElement>('[data-room-hotspot]');

    if (!hotspotButton || hotspotButton.disabled) {
      // Prüfe auf Bilderrahmen-Klick
      const frameDiv = target.closest<HTMLElement>('[data-frame-id]');
      if (frameDiv) {
        activePictureFrameDetailId = frameDiv.dataset.frameId ?? 'frame0';
        focusRoomTarget('pictureFrameDetail');
      }
      return;
    }

    const hotspotId = hotspotButton.dataset.roomHotspot;

    if (isRoomHotspotId(hotspotId)) {
      focusRoomTarget(hotspotId);
    }
  };

  const handleRoomHotspotPointerLeave = (): void => {
    hoveredRoomHotspot = null;
    hoveredPictureFrameId = null;
  };

  const handleRoomHotspotPointerOver = (event: PointerEvent): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      hoveredRoomHotspot = null;
      hoveredPictureFrameId = null;
      return;
    }

    const hotspotButton = target.closest<HTMLButtonElement>('[data-room-hotspot]');
    const hotspotId = hotspotButton?.dataset.roomHotspot;
    hoveredRoomHotspot = isRoomHotspotId(hotspotId) ? hotspotId : null;

    const frameDiv = target.closest<HTMLElement>('[data-frame-id]');
    hoveredPictureFrameId = frameDiv?.dataset.frameId ?? null;
  };

  controlsRoot.addEventListener('click', handleControlsClick);
  roomHotspotsRoot.addEventListener('click', handleRoomHotspotClick);
  roomHotspotsRoot.addEventListener('pointerleave', handleRoomHotspotPointerLeave);
  roomHotspotsRoot.addEventListener('pointerover', handleRoomHotspotPointerOver);

  const handleGlobalLegalClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest<HTMLButtonElement>('[data-legal-tab]');
    if (!btn || btn.disabled) return;
    const tab = btn.dataset.legalTab as 'impressum' | 'datenschutz';
    if (tab !== 'impressum' && tab !== 'datenschutz') return;
    legalWallTab = tab;
    if (startFlowState === 'menu' || startFlowState === 'roomExplore') {
      if (startFlowState === 'menu') {
        beginStartFlowTransitionToTarget('legalWall');
      } else {
        focusRoomTarget('legalWall');
      }
      syncPanels();
    }
  };

  document.addEventListener('click', handleGlobalLegalClick);

  const syncPanels = (): void => {
    if (startFlowState !== 'roomExplore') {
      hoveredRoomHotspot = null;
      hoveredPictureFrameId = null;
    } else if (roomFocusTarget !== 'pictureFrame') {
      hoveredPictureFrameId = null;
    }
    const snapshot = buildGameSnapshot();

    controlsRoot.innerHTML =
      snapshot.startFlow.state === 'boardFocus'
        ? renderControls({
            cameraLocked: snapshot.camera.controlsLocked,
            gameOver: snapshot.gameOver,
            restartAvailable: snapshot.restartAvailable,
            showReturnToRoom: true,
            undoAvailable: snapshot.undoAvailable
          })
        : renderStartFlowControls(
            snapshot.startFlow.state,
            snapshot.startFlow.currentRoomFocusTarget,
            snapshot.startFlow.roomFocusTransitionActive
          );
    roomHotspotsRoot.innerHTML =
      (snapshot.startFlow.state === 'roomExplore' || snapshot.startFlow.state === 'menu')
        ? renderRoomHotspots(snapshot, hoveredRoomHotspot, hoveredPictureFrameId)
        : '';

    // Body-Klasse umschalten damit CSS den 3D-Site-Header/Footer in webEmbed verstecken kann
    const isWebEmbed =
      !snapshot.startFlow.roomFocusTransitionActive &&
      snapshot.startFlow.currentRoomFocusTarget === 'webEmbed';
    document.body.classList.toggle('web-embed-active', isWebEmbed);

    // Legal Overlay ein-/ausblenden wenn legalWall Transition abgeschlossen
    const isAtLegalWall =
      !snapshot.startFlow.roomFocusTransitionActive &&
      snapshot.startFlow.currentRoomFocusTarget === 'legalWall';
    if (isAtLegalWall) {
      showLegalOverlay(legalWallTab);
    } else {
      hideLegalOverlay();
    }

    // Footer-Buttons aktiv/inaktiv je nach Zustand
    const legalFooterActive =
      snapshot.startFlow.state === 'menu' || snapshot.startFlow.state === 'roomExplore';
    document.querySelectorAll<HTMLButtonElement>('[data-legal-tab]').forEach(btn => {
      btn.disabled = !legalFooterActive;
    });
  };

  const preview = createBoardPreviewScene({
    container: sceneRoot,
    onSquareClick: handleSquareClick,
    onStateChange: () => {
      resolveRoomLoaded();
      syncPanels();
    },
    pieces: engine.getSnapshot().pieces
  });

  syncStartFlowToPreview();
  syncSceneFromState(engine.getSnapshot(), { immediate: true });
  syncPresentationState();
  void loadBoardAssets();
  void loadPieceAssets(DEFAULT_PIECE_ASSET_SET, { showLoadingState: false });

  return {
    advanceTime: (ms: number) => {
      advanceStartFlow(ms);
      preview.advanceTime(ms);
      advancePresentationState(ms);
      syncPanels();
    },
    assetsReady,
    debugPreviewCombatCamera: ({
      attackerType = 'queen',
      capturedSquare = 'd5',
      durationMs = 920,
      from = 'e4',
      mode = 'combat',
      phase = 'intro',
      phaseProgress = 0,
      remainingMs = 920,
      to = 'd5',
      victimType = 'rook'
    } = {}) => {
      if (mode !== 'combat') {
        combatSfxController.clear({ stopAudio: true });
        preview.resetPresentationState();
        syncStartFlowToPreview();
        syncSceneFromState(engine.getSnapshot(), { immediate: true });
        syncPanels();
        return;
      }

      const debugAttacker = {
        color: 'white',
        id: 'debug-attacker',
        square: from,
        type: attackerType
      } as const;
      const debugVictim = {
        color: 'black',
        id: 'debug-victim',
        square: capturedSquare,
        type: victimType
      } as const;
      const debugCombatEvent = {
        attackerId: debugAttacker.id,
        attackerType: debugAttacker.type,
        capturedSquare,
        from,
        to,
        victimId: debugVictim.id,
        victimType: debugVictim.type
      } satisfies CombatPresentationEventInput;

      combatSfxController.clear({ stopAudio: true });
      preview.syncPieces([debugAttacker, debugVictim], { immediate: true });
      preview.syncPieces([{ ...debugAttacker, square: to }], { combatEvent: debugCombatEvent });
      const debugPresentationState = {
        combatDurationMs: durationMs,
        combatElapsedMs: 0,
        combatEvent: {
          attacker: {
            color: debugAttacker.color,
            id: debugAttacker.id,
            square: to,
            type: debugAttacker.type
          },
          capturedSquare,
          from,
          move: {
            captured: debugVictim.type,
            capturedSquare,
            color: debugAttacker.color,
            from,
            piece: debugAttacker.type,
            san: `${debugAttacker.type}x${capturedSquare}`,
            to
          },
          to,
          victim: {
            color: debugVictim.color,
            id: debugVictim.id,
            square: capturedSquare,
            type: debugVictim.type
          }
        },
        combatPhase: phase,
        combatPhaseProgress: phaseProgress,
        combatRemainingMs: remainingMs,
        interactionLocked: true,
        mode
      } as const;
      combatSfxController.syncState(debugPresentationState);
      preview.syncPresentationState({
        combatDurationMs: durationMs,
        combatEvent: debugCombatEvent,
        combatPhase: phase,
        combatPhaseProgress: phaseProgress,
        combatRemainingMs: remainingMs,
        mode
      });
      syncPanels();
    },
    destroy: () => {
      isDisposed = true;
      stopStartFlowLoop();
      stopPresentationLoop();
      controlsRoot.removeEventListener('click', handleControlsClick);
      roomHotspotsRoot.removeEventListener('click', handleRoomHotspotClick);
      roomHotspotsRoot.removeEventListener('pointerleave', handleRoomHotspotPointerLeave);
      roomHotspotsRoot.removeEventListener('pointerover', handleRoomHotspotPointerOver);
      document.removeEventListener('click', handleGlobalLegalClick);
      hideLegalOverlay();
      preview.dispose();
      root.innerHTML = '';
    },
    renderGameToText: () => JSON.stringify(buildGameSnapshot())
  };

  function buildGameSnapshot(): GameSnapshot {
    const renderSnapshot = preview.getSnapshot();
    const engineSnapshot = engine.getSnapshot();

    return {
      assetLoading: {
        pendingPieceAssetSet: pieceAssetSetLoading ? pendingPieceAssetSet : null,
        pieces: pieceAssetSetLoading
      },
      ...renderSnapshot,
      capturedPieces: engineSnapshot.capturedPieces,
      checkedKingSquare: engineSnapshot.checkedKingSquare,
      fen: engineSnapshot.fen,
      gameOver: engineSnapshot.gameOver,
      gameResult: engineSnapshot.gameResult,
      gameStatus: engineSnapshot.status,
      inCheck: engineSnapshot.inCheck,
      lastMove: engineSnapshot.lastMove,
      moveHistory: engineSnapshot.moveHistory,
      presentation: presentationStateMachine.getSnapshot(),
      restartAvailable: engineSnapshot.restartAvailable,
      sound: {
        ...soundController.getSnapshot(),
        combat: combatSfxController.getSnapshot()
      },
      startFlow: {
        activePictureFrameDetailId,
        currentRoomFocusTarget: startFlowState === 'menu' ? null : roomFocusTarget,
        gameplayInteractionEnabled: isGameplayInteractionEnabled(),
        hoveredRoomHotspot,
        introTransitionActive: startFlowState === 'introTransition',
        roomFocusTransitionActive: isRoomFocusTransitionActive(),
        state: startFlowState
      },
      statusPresentation: engineSnapshot.statusPresentation,
      turn: engineSnapshot.activeColor,
      undoAvailable: engineSnapshot.undoAvailable
    };
  }

  function handleSquareClick(square: BoardSquare): void {
    if (!isGameplayInteractionEnabled()) {
      return;
    }

    const engineSnapshot = engine.getSnapshot();

    if (engineSnapshot.gameOver) {
      return;
    }

    if (presentationStateMachine.isInteractionLocked()) {
      return;
    }

    if (
      controllerState.selectedSquare &&
      controllerState.legalTargetSquares.includes(square) &&
      engine.tryMove(controllerState.selectedSquare, square)
    ) {
      const nextSnapshot = engine.getSnapshot();
      const combatEvent = buildCombatEvent(engineSnapshot, nextSnapshot);
      resetTransientInteractionState();
      syncSceneFromState(nextSnapshot, {
        animateMovedPieceId: combatEvent ? null : getAnimatedPieceId(nextSnapshot),
        combatEvent: combatEvent ? mapCombatPresentationEvent(combatEvent) : null,
        captureSquare: combatEvent ? null : nextSnapshot.lastMove?.capturedSquare ?? null
      });
      if (combatEvent) {
        presentationStateMachine.beginCombat(combatEvent);
        syncPresentationState();
        ensurePresentationLoop();
      }
      playMoveSound(soundController, nextSnapshot);
      syncPanels();
      return;
    }

    if (controllerState.selectedSquare === square) {
      resetTransientInteractionState();
      syncHighlightsFromState(engine.getSnapshot());
      return;
    }

    if (engine.canSelectSquare(square)) {
      controllerState.selectedSquare = square;
      controllerState.legalTargetSquares = engine.getLegalTargetSquares(square);
      syncHighlightsFromState(engine.getSnapshot());
    }
  }

  function resetTransientInteractionState(): void {
    controllerState.selectedSquare = null;
    controllerState.legalTargetSquares = [];
  }

  function syncHighlightsFromState(engineSnapshot: ChessGameSnapshot): void {
    preview.syncInteractionState({
      checkedKingSquare: engineSnapshot.checkedKingSquare,
      lastMoveSquares: engineSnapshot.lastMove ? [engineSnapshot.lastMove.from, engineSnapshot.lastMove.to] : [],
      legalTargetSquares: controllerState.legalTargetSquares,
      selectedSquare: controllerState.selectedSquare
    });
  }

  function syncSceneFromState(
    engineSnapshot: ChessGameSnapshot,
    options: {
      animateMovedPieceId?: string | null;
      combatEvent?: CombatPresentationEventInput | null;
      captureSquare?: BoardSquare | null;
      immediate?: boolean;
    } = { immediate: true }
  ): void {
    preview.syncPieces(engineSnapshot.pieces, options);
    syncHighlightsFromState(engineSnapshot);
  }

  async function loadBoardAssets(): Promise<void> {
    const requestId = ++boardAssetRequestId;

    try {
      const assets = await loadBoardVisualAsset();

      if (isDisposed || requestId !== boardAssetRequestId) {
        return;
      }

      preview.applyBoardAsset(assets);
    } catch {
      // Asset-Laden ist optional; Platzhalter bleiben bei Fehlern aktiv.
    }
  }

  async function loadPieceAssets(
    nextPieceAssetSet: PieceAssetSet,
    options: { showLoadingState?: boolean } = {}
  ): Promise<void> {
    const requestId = ++pieceAssetRequestId;
    pendingPieceAssetSet = nextPieceAssetSet;
    pieceAssetSetLoading = options.showLoadingState ?? true;
    syncPanels();

    try {
      const assets = await loadPieceVisualAssets(nextPieceAssetSet);

      if (isDisposed || requestId !== pieceAssetRequestId) {
        return;
      }

      preview.applyPieceAssets(assets);
    } catch {
      // Figuren-Asset-Laden ist optional; bestehende GLBs oder Platzhalter bleiben aktiv bei Fehler.
    } finally {
      if (!isDisposed && requestId === pieceAssetRequestId) {
        pieceAssetSetLoading = false;
        pendingPieceAssetSet = null;
        resolvePiecesLoaded();
        syncPanels();
      }
    }
  }

  function beginStartFlowTransition(): void {
    // Überspringe introTransition — die Menü-Kamera zeigt bereits die Übersicht,
    // also landen wir direkt in roomExplore in der Übersicht-Position ohne
    // Kamera-Bewegung. Der introTransition-Status und advanceStartFlow-Pfad
    // werden aus Rückwärts-Compat behalten aber werden hier nicht mehr betreten.
    startFlowState = 'roomExplore';
    hoveredRoomHotspot = null;
    roomFocusFromTarget = 'overview';
    roomFocusTarget = 'overview';
    roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
    syncStartFlowToPreview();
    stopStartFlowLoop();
  }

  function beginStartFlowTransitionToTarget(target: Exclude<RoomFocusTargetId, 'overview'>): void {
    // Animiere direkt von Übersicht (= Menü-Kamera) zum gegebenen Ziel ohne
    // zuerst bei der Übersicht-Freikamera-Status anzuhalten. Das vermeidet den
    // Eingangs/Ausgangs-Animations-Konflikt der auftritt wenn beginStartFlowTransition
    // roomCameraFree aktiviert bevor focusRoomTarget es deaktiviert.
    startFlowState = 'roomExplore';
    hoveredRoomHotspot = null;
    roomFocusFromTarget = 'overview';
    roomFocusTarget = target;
    roomFocusElapsedMs = 0;
    syncStartFlowToPreview();
    ensureStartFlowLoop();
  }

  function returnToMenu(): void {
    // Menü-Ka mera passt zur Übersicht-Position, deshalb kein sichtbarer Sprung.
    startFlowState = 'menu';
    hoveredRoomHotspot = null;
    hoveredPictureFrameId = null;
    roomFocusFromTarget = 'overview';
    roomFocusTarget = 'overview';
    roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
    syncStartFlowToPreview();
    stopStartFlowLoop();
    syncPanels();
  }

  function returnToMenuFromFocus(): void {
    // Animiere Kamera zurück zur Übersicht/Menü-Position zuerst, dann schalte
    // zu Menü-Status wenn Transition abgeschlossen ist (via pendingMenuReturn).
    pendingMenuReturn = true;
    returnToRoomExplore();
  }

  function advanceStartFlow(ms: number): void {
    if (startFlowState === 'introTransition') {
      startFlowElapsedMs = Math.min(startFlowElapsedMs + Math.max(ms, 0), START_FLOW_INTRO_DURATION_MS);

      if (startFlowElapsedMs >= START_FLOW_INTRO_DURATION_MS) {
        startFlowElapsedMs = START_FLOW_INTRO_DURATION_MS;
        startFlowState = 'roomExplore';
        hoveredRoomHotspot = null;
        roomFocusFromTarget = 'overview';
        roomFocusTarget = 'overview';
        roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
        syncStartFlowToPreview();
        stopStartFlowLoop();
        return;
      }

      syncStartFlowToPreview();
      return;
    }

    if (!isRoomFocusTransitionActive()) {
      stopStartFlowLoop();
      return;
    }

    roomFocusElapsedMs = Math.min(roomFocusElapsedMs + Math.max(ms, 0), ROOM_FOCUS_TRANSITION_DURATION_MS);

    if (roomFocusElapsedMs >= ROOM_FOCUS_TRANSITION_DURATION_MS) {
      roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
      syncStartFlowToPreview();
      stopStartFlowLoop();
      if (pendingMenuReturn && roomFocusTarget === 'overview') {
        pendingMenuReturn = false;
        returnToMenu();
      }
      return;
    }

    syncStartFlowToPreview();
  }

  function advancePresentationState(ms: number): void {
    if (presentationStateMachine.advance(ms)) {
      syncPresentationState();

      if (presentationStateMachine.getSnapshot().mode === 'board') {
        stopPresentationLoop();
      }

      syncPanels();
    }
  }

  function clearPresentationState(): void {
    const hadPresentationState = presentationStateMachine.clear();
    combatSfxController.clear({ stopAudio: true });
    preview.resetPresentationState();
    syncStartFlowToPreview();

    if (hadPresentationState) {
      stopPresentationLoop();
    }
  }

  function ensureStartFlowLoop(): void {
    if (startFlowFrameHandle !== 0) {
      return;
    }

    startFlowLastFrameTime = performance.now();
    startFlowFrameHandle = window.setTimeout(handleStartFlowFrame, 16);
  }

  function handleStartFlowFrame(): void {
    startFlowFrameHandle = 0;
    const timestamp = performance.now();
    const deltaMs = Math.min(timestamp - startFlowLastFrameTime, 32);
    startFlowLastFrameTime = timestamp;

    advanceStartFlow(deltaMs);

    if (!isDisposed && isStartFlowAnimationActive()) {
      startFlowFrameHandle = window.setTimeout(handleStartFlowFrame, 16);
    }
  }

  function stopStartFlowLoop(): void {
    if (startFlowFrameHandle === 0) {
      return;
    }

    window.clearTimeout(startFlowFrameHandle);
    startFlowFrameHandle = 0;
  }

  function ensurePresentationLoop(): void {
    if (presentationFrameHandle !== 0) {
      return;
    }

    presentationLastFrameTime = performance.now();
    presentationFrameHandle = window.requestAnimationFrame(handlePresentationFrame);
  }

  function handlePresentationFrame(timestamp: number): void {
    presentationFrameHandle = 0;

    const deltaMs = Math.min(timestamp - presentationLastFrameTime, 32);
    presentationLastFrameTime = timestamp;

    advancePresentationState(deltaMs);

    if (!isDisposed && presentationStateMachine.getSnapshot().mode === 'combat') {
      presentationFrameHandle = window.requestAnimationFrame(handlePresentationFrame);
    }
  }

  function stopPresentationLoop(): void {
    if (presentationFrameHandle === 0) {
      return;
    }

    window.cancelAnimationFrame(presentationFrameHandle);
    presentationFrameHandle = 0;
  }

  function syncPresentationState(): void {
    const presentationSnapshot = presentationStateMachine.getSnapshot();
    combatSfxController.syncState(presentationSnapshot);
    preview.syncPresentationState({
      combatDurationMs: presentationSnapshot.combatDurationMs,
      combatEvent: presentationSnapshot.combatEvent
        ? {
            attackerId: presentationSnapshot.combatEvent.attacker.id,
            attackerType: presentationSnapshot.combatEvent.attacker.type,
            capturedSquare: presentationSnapshot.combatEvent.capturedSquare,
            from: presentationSnapshot.combatEvent.from,
            to: presentationSnapshot.combatEvent.to,
            victimId: presentationSnapshot.combatEvent.victim.id,
            victimType: presentationSnapshot.combatEvent.victim.type
          }
        : null,
      combatPhase: presentationSnapshot.combatPhase,
      combatPhaseProgress: presentationSnapshot.combatPhaseProgress,
      combatRemainingMs: presentationSnapshot.combatRemainingMs,
      mode: presentationSnapshot.mode
    });
  }

  function syncStartFlowToPreview(): void {
    preview.syncStartFlowState({
      focusFromTarget: roomFocusFromTarget,
      focusProgress: isRoomFocusTransitionActive() ? roomFocusElapsedMs / ROOM_FOCUS_TRANSITION_DURATION_MS : 1,
      focusTarget: roomFocusTarget,
      mode: startFlowState,
      pendingMenuReturn,
      pictureFrameDetailId: activePictureFrameDetailId,
      progress:
        startFlowState === 'introTransition'
          ? startFlowElapsedMs / START_FLOW_INTRO_DURATION_MS
          : startFlowState === 'boardFocus' || startFlowState === 'roomExplore'
            ? 1
            : 0
    });
  }

  function isGameplayInteractionEnabled(): boolean {
    return startFlowState === 'boardFocus';
  }

  function focusRoomTarget(nextTarget: RoomFocusTargetId): void {
    if (startFlowState !== 'roomExplore' || isRoomFocusTransitionActive() || nextTarget === roomFocusTarget) {
      return;
    }

    roomFocusFromTarget = roomFocusTarget;
    roomFocusTarget = nextTarget;
    roomFocusElapsedMs = 0;
    syncStartFlowToPreview();
    ensureStartFlowLoop();
  }

  function enterBoardFocus(): void {
    startFlowState = 'boardFocus';
    hoveredRoomHotspot = null;
    roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
    syncStartFlowToPreview();
    stopStartFlowLoop();
  }

  function enterDisplayCaseFocus(): void {
    startFlowState = 'displayCaseFocus';
    hoveredRoomHotspot = null;
    roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
    syncStartFlowToPreview();
    stopStartFlowLoop();
  }

  function returnToRoomExplore(): void {
    // Leite Kamera-Ursprung für Rückkehr-Bewegung von welchem
    // Fokus-Modus gerade aktiv ist. Szene getRoomFocusTargetPreset() löst
    // 'board' zur Live-boardCameraControls-Position und 'displayCase' zur
    // festen displayCase-Preset auf — deshalb existierender lerpCameraPreset-Pfad
    // handhabt volle Transition ohne neuen Kamera-Code.
    const fromTarget: RoomFocusTargetId =
      startFlowState === 'boardFocus'       ? 'board'       :
      startFlowState === 'displayCaseFocus' ? 'displayCase' :
      roomFocusTarget; // wenn bereits in roomExplore, starten vom aktuellen Ziel

    startFlowState = 'roomExplore';
    hoveredRoomHotspot = null;
    roomFocusFromTarget = fromTarget;
    roomFocusTarget = 'overview';
    // starten bei t=0 damit Transition animiert anstatt springt.
    roomFocusElapsedMs = 0;
    syncStartFlowToPreview();
    // Behalte Start-Flow-Loop laufend bis Kamera overview erreicht.
    ensureStartFlowLoop();
    syncPanels();
  }

  function isRoomFocusTransitionActive(): boolean {
    return startFlowState === 'roomExplore' && roomFocusFromTarget !== roomFocusTarget && roomFocusElapsedMs < ROOM_FOCUS_TRANSITION_DURATION_MS;
  }

  function isStartFlowAnimationActive(): boolean {
    return startFlowState === 'introTransition' || isRoomFocusTransitionActive();
  }
}

function getAnimatedPieceId(snapshot: ChessGameSnapshot): string | null {
  if (!snapshot.lastMove) {
    return null;
  }

  return snapshot.pieces.find((piece) => piece.square === snapshot.lastMove?.to)?.id ?? null;
}

function playMoveSound(soundController: ReturnType<typeof createSoundController>, snapshot: ChessGameSnapshot): void {
  if (snapshot.lastMove?.captured) {
    soundController.playCapture();
  } else {
    soundController.playMove();
  }

  if (snapshot.inCheck) {
    soundController.playCheck();
  }
}

function mapCombatPresentationEvent(combatEvent: NonNullable<GameSnapshot['presentation']['combatEvent']>): CombatPresentationEventInput {
  return {
    attackerId: combatEvent.attacker.id,
    attackerType: combatEvent.attacker.type,
    capturedSquare: combatEvent.capturedSquare,
    from: combatEvent.from,
    to: combatEvent.to,
    victimId: combatEvent.victim.id,
    victimType: combatEvent.victim.type
  };
}

const ROOM_HOTSPOT_SUBTITLES: Record<string, string> = {
  board: 'Klicken zum Spielen'
};

function renderRoomHotspots(snapshot: GameSnapshot, hoveredRoomHotspot: RoomFocusTargetId | null, hoveredPictureFrameId: string | null): string {
  const isRoomExplore = snapshot.startFlow.state === 'roomExplore';

  if (!isRoomExplore) {
    return '<div class="room-hotspots-layer"></div>';
  }

  // ── Hotspot-Buttons (nur Übersicht, nicht während Transition) ───────────────
  const showHotspots =
    !snapshot.startFlow.roomFocusTransitionActive &&
    (snapshot.startFlow.currentRoomFocusTarget === 'overview' || snapshot.startFlow.currentRoomFocusTarget === null);
  const hotspots = showHotspots ? snapshot.roomExplore.hotspots.filter((hotspot) => hotspot.isVisible) : [];

  const hotspotButtons = hotspots
    .map((hotspot) => {
      const isHovered = hoveredRoomHotspot === hotspot.id;
      const stateClass = hotspot.isFocused
        ? 'room-hotspot-btn--focused'
        : isHovered
          ? 'room-hotspot-btn--hovered'
          : '';
      const subtitle = ROOM_HOTSPOT_SUBTITLES[hotspot.id] ?? '';

      // Beschränke damit Button nie über Leinwand-Kant überströmt.
      const padX = 70;
      const padY = 40;
      const cx = Math.max(padX, Math.min(hotspot.screenX, snapshot.renderer.width - padX));
      const cy = Math.max(padY, Math.min(hotspot.screenY, snapshot.renderer.height - padY));

      return `
        <button
          aria-label="${hotspot.label}"
          class="room-hotspot-btn ${stateClass}"
          data-room-hotspot="${hotspot.id}"
          type="button"
          style="left: ${cx}px; top: ${cy}px;"
          ${snapshot.startFlow.roomFocusTransitionActive ? 'disabled' : ''}
        >
          <span class="room-hotspot-indicator" aria-hidden="true"></span>
          <span class="room-hotspot-text">
            <span class="room-hotspot-label">${hotspot.label}</span>
            ${subtitle ? `<span class="room-hotspot-sublabel">${subtitle}</span>` : ''}
          </span>
        </button>
      `;
    })
    .join('');

  const focusedHotspot = hotspots.find((h) => h.isFocused);
  const infoPlate = focusedHotspot
    ? `
      <div class="room-focus-plate" aria-live="polite">
        <p class="room-focus-plate-eyebrow">Viewing</p>
        <p class="room-focus-plate-name">${focusedHotspot.label}</p>
      </div>
    `
    : '';

  // ── Bilderrahmen-Glanz-Ringe (nur pictureFrame Fokus) ────────────────
  const pictureFrameGlows =
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'pictureFrame'
      ? snapshot.roomExplore.pictureFrames
          .filter((f) => f.isVisible)
          .map(
            (f) => `
            <div
              class="picture-frame-hotspot"
              data-frame-id="${f.id}"
              role="button"
              tabindex="0"
              aria-label="${f.label}"
              style="left: ${f.screenX}px; top: ${f.screenY}px;"
            ></div>
          `
          )
          .join('')
      : '';

  // ── Bilderrahmen-Detail-Platzhalter (nur pictureFrameDetail Fokus) ──────
  // Ordnet Rahmen-IDs zu Semester-Nummern (oben-links → unten-rechts Reihenfolge).
  const FRAME_SEMESTER: Record<string, number> = {
    frame0: 1, frame2: 2, frame3: 3, frame4: 4,
    frame1: 5, frame5: 6, frame6: 7, frame7: 8
  };
  const pictureFrameDetailOverlay =
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'pictureFrameDetail'
      ? (() => {
          const semester = FRAME_SEMESTER[snapshot.startFlow.activePictureFrameDetailId] ?? '?';
          return `
            <div class="frame-detail-overlay">
              <p class="frame-detail-semester">Semester ${semester}</p>
              <p class="frame-detail-placeholder">
                Hier folgen Leistungsnachweise sobald<br>
                sie für das jeweilige Semester vorhanden sind.
              </p>
            </div>`;
        })()
      : '';

  // ── Web-Embed-Overlay (nur webEmbed Fokus) ──────────────────────────────
  const webEmbedOverlay =
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'webEmbed'
      ? `<div class="web-embed-overlay">
           <iframe src="/portfolio/index.html" title="Portfolio" allowfullscreen></iframe>
           <div class="web-embed-nav">
             <button class="web-embed-nav__btn" data-control="back-from-web-embed" type="button">Zurück</button>
             <button class="web-embed-nav__btn" data-control="return-to-menu-from-focus" type="button">Zum Hauptmenü</button>
           </div>
         </div>`
      : '';

  return `
    <div class="room-hotspots-layer">
      ${hotspotButtons}
      ${pictureFrameGlows}
      ${pictureFrameDetailOverlay}
      ${webEmbedOverlay}
      ${infoPlate}
    </div>
  `;
}

function renderStartFlowControls(
  startFlowState: StartFlowMode,
  currentRoomFocusTarget: RoomFocusTargetId | null,
  roomFocusTransitionActive: boolean
): string {
  // ── Vitrine-Fokus: einzelner Zurück-Button ──────────────────────────────
  if (startFlowState === 'displayCaseFocus') {
    return `
      <div class="control-group">
        <p class="control-label">Vitrine</p>
        <div class="control-row">
          <button class="control-button control-button--secondary" data-control="return-to-room" type="button">
            Zurück zum Raum
          </button>
        </div>
      </div>
    `;
  }

  // ── Raum erkunden: nur Zur Übersicht + kontextuelle Aktion ────────────────
  if (startFlowState === 'roomExplore') {
    // webEmbed: Buttons werden im web-embed-overlay div selbst gerendert
    if (!roomFocusTransitionActive && currentRoomFocusTarget === 'webEmbed') {
      return '';
    }

    // legalWall: Impressum / Datenschutz — Zur Übersicht + Zum Hauptmenü
    if (!roomFocusTransitionActive && currentRoomFocusTarget === 'legalWall') {
      return `
        <div class="control-group">
          <p class="control-label">Rechtliches</p>
          <div class="control-row">
            <button class="control-button control-button--secondary" data-control="legal-to-overview" type="button">
              Zur Übersicht
            </button>
            <button class="control-button control-button--secondary" data-control="legal-to-menu" type="button">
              Zum Hauptmenü
            </button>
          </div>
        </div>
      `;
    }

    // pictureFrame: Überblick aller Rahmen — Zurück-zum-Menü anbieten
    if (!roomFocusTransitionActive && currentRoomFocusTarget === 'pictureFrame') {
      return `
        <div class="control-group">
          <p class="control-label">Leistungsnachweise</p>
          <div class="control-row">
            <button class="control-button control-button--secondary" data-control="room-focus" data-room-focus-target="overview" type="button">
              Zur Übersicht
            </button>
            <button class="control-button control-button--secondary" data-control="return-to-menu-from-focus" type="button">
              Zum Hauptmenü
            </button>
          </div>
        </div>
      `;
    }

    // pictureFrameDetail: nur ein Zurück-zu-Bilderrahmen-Button
    if (!roomFocusTransitionActive && currentRoomFocusTarget === 'pictureFrameDetail') {
      return `
        <div class="control-group">
          <p class="control-label">Leistungsnachweise</p>
          <div class="control-row">
            <button class="control-button control-button--secondary" data-control="back-from-picture-frame-detail" type="button">
              Zurück
            </button>
          </div>
        </div>
      `;
    }

    const contextAction =
      !roomFocusTransitionActive && currentRoomFocusTarget === 'board'
        ? `
          <div class="control-row">
            <button class="control-button" data-control="enter-board-focus" type="button">
              Spiel starten
            </button>
          </div>`
        : !roomFocusTransitionActive && currentRoomFocusTarget === 'workbench'
          ? `
          <div class="control-row">
            <button class="control-button control-button--secondary" data-control="enter-web-embed" type="button">
              2D Webseite betreten
            </button>
          </div>`
          : !roomFocusTransitionActive && currentRoomFocusTarget === 'overview'
            ? `
          <div class="control-row">
            <button class="control-button control-button--secondary" data-control="return-to-menu" type="button">
              Zurück
            </button>
          </div>`
            : '';

    // In der Übersicht: nur den Kontext-Button (Zurück) zeigen, kein "Zur Übersicht"
    if (currentRoomFocusTarget === 'overview') {
      return contextAction ? `
        <div class="control-group">
          <p class="control-label">Navigation</p>
          ${contextAction}
        </div>
      ` : '';
    }

    // Während Kamerafahrt keine Buttons anzeigen — erst am Fokusziel
    if (roomFocusTransitionActive) {
      return '';
    }

    return `
      <div class="control-group">
        <p class="control-label">Navigation</p>
        <div class="control-row">
          <button
            class="control-button control-button--secondary"
            data-control="room-focus"
            data-room-focus-target="overview"
            type="button"
          >
            Zur Übersicht
          </button>
        </div>
        ${contextAction}
      </div>
    `;
  }

  // ── Menü / Intro: drei Einstiegs-Buttons ───────────────────────────────────
  const buttonDisabled = startFlowState !== 'menu';

  return `
    <div class="control-group">
      <p class="control-label">Willkommen</p>
      <div class="control-row">
        <button class="control-button" data-control="start-game" type="button" ${buttonDisabled ? 'disabled' : ''}>
          Raum erkunden
        </button>
      </div>
      <div class="control-row">
        <button class="control-button control-button--secondary" data-control="direct-to-portfolio" type="button" ${buttonDisabled ? 'disabled' : ''}>
          Zum Portfolio
        </button>
      </div>
      <div class="control-row">
        <button class="control-button control-button--secondary" data-control="direct-to-leistungen" type="button" ${buttonDisabled ? 'disabled' : ''}>
          Zu den Leistungsnachweisen
        </button>
      </div>
    </div>
  `;
}

function isRoomFocusTargetId(value: string | undefined): value is RoomFocusTargetId {
  return value === 'board' || value === 'displayCase' || value === 'legalWall' || value === 'overview' || value === 'workbench' || value === 'pictureFrame' || value === 'pictureFrameDetail' || value === 'webEmbed';
}

function isRoomHotspotId(value: string | undefined): value is Exclude<RoomFocusTargetId, 'overview'> {
  return value === 'board' || value === 'displayCase' || value === 'pictureFrame' || value === 'workbench';
}
