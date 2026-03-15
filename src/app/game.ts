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
import { renderOverlay } from '../ui/overlays';

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
  { id: 'displayCase', label: 'Display Case' },
  { id: 'board', label: 'Chess Table' },
  { id: 'workbench', label: 'Workbench' },
  { id: 'pictureFrame', label: 'Performance Reports' },
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
  const controllerState: GameInteractionControllerState = {
    legalTargetSquares: [],
    selectedSquare: null
  };

  // Intro overlay gate: resolves when room GLB is first loaded AND first piece
  // asset set completes.  Both are required so the scene looks correct on entry.
  let resolveRoomLoaded!: () => void;
  let resolvePiecesLoaded!: () => void;
  const assetsReady = Promise.all([
    new Promise<void>(r => { resolveRoomLoaded = r; }),
    new Promise<void>(r => { resolvePiecesLoaded = r; })
  ]).then(() => new Promise<void>(resolve => {
    // GLBs are downloaded and parsed — but the GPU still needs to compile
    // WebGL programs (shaders) and upload textures during the first render
    // frames.  Count 60 rAF ticks, then wait an additional 2 s so all
    // background tasks (shader compilation, texture uploads) fully settle.
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

      <aside class="info-panel">
        <section class="panel" data-overlay-root></section>
      </aside>
    </main>
  `;

  const sceneRoot = root.querySelector<HTMLDivElement>('[data-scene-root]');
  const controlsRoot = root.querySelector<HTMLElement>('[data-controls-root]');
  const overlayRoot = root.querySelector<HTMLElement>('[data-overlay-root]');
  const roomHotspotsRoot = root.querySelector<HTMLDivElement>('[data-room-hotspots-root]');

  if (!sceneRoot || !controlsRoot || !overlayRoot || !roomHotspotsRoot) {
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
        beginStartFlowTransition();
        focusRoomTarget('pictureFrame');
      }

      return;
    }

    if (action === 'direct-to-portfolio') {
      if (startFlowState === 'menu') {
        beginStartFlowTransition();
        focusRoomTarget('webEmbed');
      }

      return;
    }

    if (action === 'enter-web-embed') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'workbench' && !isRoomFocusTransitionActive()) {
        focusRoomTarget('webEmbed');
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
        returnToMenu();
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
    if (startFlowState !== 'roomExplore') {
      return;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const hotspotButton = target.closest<HTMLButtonElement>('[data-room-hotspot]');

    if (!hotspotButton || hotspotButton.disabled) {
      // Check for picture frame click
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
    overlayRoot.innerHTML = renderOverlay(buildOverlayMessage(snapshot));
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
      // Asset loading is optional; placeholders stay active on any failure.
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
      // Piece asset loading is optional; existing GLBs or placeholders stay active on failure.
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
    // Skip introTransition — the menu camera already shows the overview, so we
    // land directly in roomExplore at the overview position without any camera
    // movement.  The introTransition state and advanceStartFlow path are kept
    // for backwards compat but are no longer entered from here.
    startFlowState = 'roomExplore';
    hoveredRoomHotspot = null;
    roomFocusFromTarget = 'overview';
    roomFocusTarget = 'overview';
    roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
    syncStartFlowToPreview();
    stopStartFlowLoop();
  }

  function returnToMenu(): void {
    // Menu camera matches the overview position, so no visible snap occurs.
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
    // Derive the camera origin for the return move from whichever focus mode
    // is currently active.  The scene's getRoomFocusTargetPreset() resolves
    // 'board' to the live boardCameraControls pose and 'displayCase' to the
    // fixed displayCase preset — so the existing lerpCameraPreset path handles
    // the full transition without any new camera code.
    const fromTarget: RoomFocusTargetId =
      startFlowState === 'boardFocus'       ? 'board'       :
      startFlowState === 'displayCaseFocus' ? 'displayCase' :
      'overview';

    startFlowState = 'roomExplore';
    hoveredRoomHotspot = null;
    roomFocusFromTarget = fromTarget;
    roomFocusTarget = 'overview';
    // Start at t=0 so the transition animates rather than snapping.
    roomFocusElapsedMs = 0;
    syncStartFlowToPreview();
    // Keep the start-flow loop running until the camera reaches overview.
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

function buildOverlayMessage(snapshot: GameSnapshot): string {
  if (snapshot.startFlow.state === 'menu') {
    return 'Vollständige Raumansicht. Klicke „Raum erkunden" um zur Navigation zu wechseln.';
  }

  if (snapshot.startFlow.state === 'introTransition') {
    return 'Kamerafahrt läuft. Board-Interaktion bleibt gesperrt bis Room Explore bereit ist.';
  }

  if (snapshot.startFlow.state === 'displayCaseFocus') {
    return 'Vitrinenansicht aktiv. Board-Interaktion inaktiv. „Zurück zum Raum" um zu navigieren.';
  }

  if (snapshot.startFlow.state === 'roomExplore') {
    if (snapshot.startFlow.roomFocusTransitionActive) {
      return 'Kamerafahrt läuft …';
    }

    if (snapshot.startFlow.currentRoomFocusTarget === 'board') {
      return 'Schachbrett im Fokus — „Spiel starten" klicken um zu spielen.';
    }

    if (snapshot.startFlow.currentRoomFocusTarget === 'displayCase') {
      return 'Vitrine im Fokus — „Vitrine erkunden" für Nahansicht.';
    }

    if (snapshot.startFlow.currentRoomFocusTarget === 'workbench') {
      return 'Workbench im Fokus.';
    }

    if (snapshot.startFlow.currentRoomFocusTarget === 'pictureFrame') {
      return 'Bilderrahmen im Fokus.';
    }

    return 'Raum-Navigation aktiv. Ziel per Button anfahren.';
  }

  if (snapshot.presentation.mode === 'combat' && snapshot.presentation.combatEvent) {
    const { attacker, victim, capturedSquare } = snapshot.presentation.combatEvent;
    const combatPhase = snapshot.presentation.combatPhase ?? 'combat';
    const styleLabel = snapshot.animation.combat.styleLabel ? ` ${snapshot.animation.combat.styleLabel}` : '';
    return `Combat ${combatPhase}:${styleLabel} ${attacker.color} ${attacker.type} engages ${victim.color} ${victim.type} on ${capturedSquare}.`;
  }

  if (snapshot.gameOver) {
    return `${snapshot.gameResult.text} Use Restart to reset the board${snapshot.undoAvailable ? ' or Undo to step back one half-move.' : '.'}`;
  }

  if (snapshot.inCheck && snapshot.checkedKingSquare) {
    return `${capitalize(snapshot.turn)} king is in check on ${snapshot.checkedKingSquare}.`;
  }

  if (snapshot.interaction.selectedSquare && snapshot.interaction.legalTargetSquares.length > 0) {
    return `Selected ${snapshot.interaction.selectedSquare}. Legal targets: ${snapshot.interaction.legalTargetSquares.join(', ')}.`;
  }

  if (snapshot.lastMove) {
    return `Last move: ${snapshot.lastMove.san} (${snapshot.lastMove.from} -> ${snapshot.lastMove.to}). Select a ${snapshot.turn} piece to continue.`;
  }

  return '';
}

function capitalize(value: string): string {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function formatCapturedSummary(pieces: ChessPieceType[]): string {
  if (pieces.length === 0) {
    return 'none';
  }

  const counts = new Map<ChessPieceType, number>();

  for (const piece of pieces) {
    counts.set(piece, (counts.get(piece) ?? 0) + 1);
  }

  return ['queen', 'rook', 'bishop', 'knight', 'pawn']
    .filter((piece) => counts.has(piece as ChessPieceType))
    .map((piece) => `${piece} x${counts.get(piece as ChessPieceType)}`)
    .join(', ');
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

function formatCombatEventSummary(snapshot: GameSnapshot): string {
  if (!snapshot.presentation.combatEvent) {
    return 'none';
  }

  const { attacker, victim, capturedSquare } = snapshot.presentation.combatEvent;
  return `${attacker.type} -> ${victim.type} on ${capturedSquare}`;
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

function formatCombatAnimationSummary(snapshot: GameSnapshot): string {
  if (!snapshot.animation.combat.active) {
    return 'idle';
  }

  const style = snapshot.animation.combat.motionStyle ?? 'generic';
  const styleLabel = snapshot.animation.combat.styleLabel ?? 'style';
  return `${snapshot.animation.combat.phase ?? 'combat'} ${styleLabel}/${style} (${snapshot.animation.combat.attackerId ?? 'unknown'} vs ${snapshot.animation.combat.victimId ?? 'unknown'})`;
}

function formatCombatFeedbackSummary(snapshot: GameSnapshot): string {
  if (!snapshot.animation.feedback.active) {
    return 'idle';
  }

  const flags = [
    snapshot.animation.feedback.corePulseActive ? 'core' : null,
    snapshot.animation.feedback.servoAccentActive ? 'servo' : null,
    snapshot.animation.feedback.impactPulseActive ? 'impact' : null,
    snapshot.animation.feedback.sparkActive ? 'spark' : null,
    snapshot.animation.feedback.shutdownActive ? 'shutdown' : null
  ].filter((flag): flag is string => flag !== null);

  const flavor =
    snapshot.animation.feedback.attackerFlavorLabel && snapshot.animation.feedback.victimFlavorLabel
      ? ` ${snapshot.animation.feedback.attackerFlavorLabel} -> ${snapshot.animation.feedback.victimFlavorLabel}`
      : '';

  return `${snapshot.animation.feedback.phase ?? 'combat'} [${flags.join(', ')}]${flavor}`;
}

function formatCombatMotionProfileSummary(snapshot: GameSnapshot): string {
  if (!snapshot.animation.combat.active) {
    return 'none';
  }

  const attackerProfile = snapshot.animation.combat.attackerProfile ?? 'unknown';
  const victimProfile = snapshot.animation.combat.victimProfile ?? 'unknown';
  const style = snapshot.animation.combat.motionStyle ?? 'generic';
  return `${attackerProfile} -> ${victimProfile} (${style})`;
}

function formatCombatStyleSummary(snapshot: GameSnapshot): string {
  if (!snapshot.animation.combat.active) {
    return 'none';
  }

  const worldStyle = snapshot.animation.combat.worldStyle ?? 'unknown-world';
  const styleLabel = snapshot.animation.combat.styleLabel ?? 'unknown-style';
  const attackerWeight = snapshot.animation.combat.attackerWeightClass ?? 'unknown';
  const victimWeight = snapshot.animation.combat.victimWeightClass ?? 'unknown';
  return `${worldStyle} ${styleLabel} (${attackerWeight} -> ${victimWeight})`;
}

function formatCombatSfxSummary(snapshot: GameSnapshot): string {
  if (!snapshot.sound.combat.activeCue) {
    return 'idle';
  }

  const flavor =
    snapshot.sound.combat.attackerFlavorLabel && snapshot.sound.combat.victimFlavorLabel
      ? ` ${snapshot.sound.combat.attackerFlavorLabel} -> ${snapshot.sound.combat.victimFlavorLabel}`
      : '';

  return `${snapshot.sound.combat.activeCue} (${snapshot.sound.combat.phase ?? 'combat'})${flavor}`;
}

function formatPieceAssetFilesSummary(snapshot: GameSnapshot): string {
  const entries = Object.entries(snapshot.assets.pieceAssetFiles);

  if (entries.length === 0) {
    return 'none yet';
  }

  return entries
    .sort(([leftType], [rightType]) => leftType.localeCompare(rightType))
    .map(([pieceType, filePath]) => `${pieceType}: ${filePath}`)
    .join(', ');
}

function formatPieceAssetFallbackSummary(snapshot: GameSnapshot): string {
  const entries = Object.entries(snapshot.assets.pieceAssetFallbacks);

  if (entries.length === 0) {
    return 'none';
  }

  return entries
    .sort(([leftType], [rightType]) => leftType.localeCompare(rightType))
    .map(([pieceType, fallback]) => `${pieceType}: ${fallback.requested} -> ${fallback.resolved}`)
    .join(', ');
}

const ROOM_HOTSPOT_SUBTITLES: Record<string, string> = {
  board: 'Enter to play',
  displayCase: 'View pieces'
};

function renderRoomHotspots(snapshot: GameSnapshot, hoveredRoomHotspot: RoomFocusTargetId | null, hoveredPictureFrameId: string | null): string {
  const isRoomExplore = snapshot.startFlow.state === 'roomExplore';

  // ── Camera XYZ debug overlay ───────────────────────────────────────────
  const { x, y, z } = snapshot.camera.position;
  const { x: tx, y: ty, z: tz } = snapshot.camera.target;
  const fmt = (v: number): string => v.toFixed(2).padStart(7);
  const cameraOverlay = `
    <div style="
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(0,0,0,0.65);
      color: #e0e0e0;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.6;
      padding: 6px 10px;
      border-radius: 4px;
      pointer-events: none;
      user-select: none;
      white-space: pre;
    ">Kamera pos  x${fmt(x)} y${fmt(y)} z${fmt(z)}
Blick  ziel x${fmt(tx)} y${fmt(ty)} z${fmt(tz)}</div>
  `;

  if (!isRoomExplore) {
    return `<div class="room-hotspots-layer">${cameraOverlay}</div>`;
  }

  // ── Hotspot buttons (overview only, not during transition) ───────────────
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

      return `
        <button
          aria-label="${hotspot.label}"
          class="room-hotspot-btn ${stateClass}"
          data-room-hotspot="${hotspot.id}"
          type="button"
          style="left: ${hotspot.screenX}px; top: ${hotspot.screenY}px;"
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

  // ── Picture frame glow rings (pictureFrame focus only) ────────────────
  const pictureFrameGlows =
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'pictureFrame'
      ? snapshot.roomExplore.pictureFrames
          .filter((f) => f.isVisible)
          .map(
            (f) => `
            <div
              class="picture-frame-hotspot${hoveredPictureFrameId === f.id ? ' picture-frame-hotspot--hovered' : ''}"
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

  // ── Web embed overlay (webEmbed focus only) ──────────────────────────────
  const webEmbedOverlay =
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'webEmbed'
      ? `<div class="web-embed-overlay">
           <iframe src="/portfolio/index.html" title="Portfolio" allowfullscreen></iframe>
         </div>`
      : '';

  return `
    <div class="room-hotspots-layer">
      ${hotspotButtons}
      ${pictureFrameGlows}
      ${webEmbedOverlay}
      ${infoPlate}
      ${cameraOverlay}
    </div>
  `;
}

function renderStartFlowControls(
  startFlowState: StartFlowMode,
  currentRoomFocusTarget: RoomFocusTargetId | null,
  roomFocusTransitionActive: boolean
): string {
  // ── Display Case focus: single back button ──────────────────────────────
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

  // ── Room explore: only Zur Übersicht + contextual action ────────────────
  if (startFlowState === 'roomExplore') {
    // webEmbed: only a back-to-workbench button
    if (!roomFocusTransitionActive && currentRoomFocusTarget === 'webEmbed') {
      return `
        <div class="control-group">
          <p class="control-label">Portfolio</p>
          <div class="control-row">
            <button class="control-button control-button--secondary" data-control="back-from-web-embed" type="button">
              Zurück
            </button>
          </div>
        </div>
      `;
    }

    // pictureFrameDetail: only a back-to-pictureFrame button
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

    return `
      <div class="control-group">
        <p class="control-label">Navigation</p>
        <div class="control-row">
          <button
            class="control-button control-button--secondary"
            data-control="room-focus"
            data-room-focus-target="overview"
            type="button"
            ${roomFocusTransitionActive || currentRoomFocusTarget === 'overview' ? 'disabled' : ''}
          >
            Zur Übersicht
          </button>
        </div>
        ${contextAction}
      </div>
    `;
  }

  // ── Menu / intro: three entry buttons ───────────────────────────────────
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
  return value === 'board' || value === 'displayCase' || value === 'overview' || value === 'workbench' || value === 'pictureFrame' || value === 'pictureFrameDetail' || value === 'webEmbed';
}

function isRoomHotspotId(value: string | undefined): value is Exclude<RoomFocusTargetId, 'overview'> {
  return value === 'board' || value === 'displayCase' || value === 'pictureFrame' || value === 'workbench';
}

function getRoomFocusLabel(target: RoomFocusTargetId | null): string {
  const match = ROOM_FOCUS_TARGET_OPTIONS.find((option) => option.id === target);
  return match?.label ?? 'None';
}
