import { buildCombatEvent, createPresentationStateMachine } from './combat';
import { createCombatSfxController } from '../audio/combat-sfx';
import { createSoundController } from '../audio/sound';
import { createChessEngine } from '../chess/engine';
import type { BoardSquare, ChessGameSnapshot, ChessPieceType } from '../chess/state';
import { ENABLE_TV_SHOWCASE } from '../config/feature-flags';
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
  enterRoom: () => void;
  renderGameToText: () => string;
}

interface MountGameOptions {
  onLoadProgress?: (progress: number) => void;
}

interface GameInteractionControllerState {
  legalTargetSquares: BoardSquare[];
  selectedSquare: BoardSquare | null;
}

type TvSelectionId = 'comic' | 'horror';

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
    activeCertificateTopicId: string;
    activePictureFrameDetailId: string;
    activeTvSelection: TvSelectionId;
    certificateEmbedReady: boolean;
    currentRoomFocusTarget: RoomFocusTargetId | null;
    gameplayInteractionEnabled: boolean;
    hoveredRoomHotspot: RoomFocusTargetId | null;
    aboutEmbedReady: boolean;
    introTransitionActive: boolean;
    performanceEmbedReady: boolean;
    portfolioEmbedReady: boolean;
    roomFocusTransitionActive: boolean;
    state: StartFlowMode;
  };
  statusPresentation: ChessGameSnapshot['statusPresentation'];
  turn: ChessGameSnapshot['activeColor'];
  undoAvailable: ChessGameSnapshot['undoAvailable'];
}

type MonitorPageTarget = 'aboutEmbed' | 'certificateEmbed' | 'performanceEmbed' | 'portfolioEmbed';

const START_FLOW_INTRO_DURATION_MS = 1400;
const ROOM_FOCUS_TRANSITION_DURATION_MS = 2000;
const MONITOR_PAGE_SETTLE_DURATION_MS = 0;
const MONITOR_ENTRY_BLACKOUT_DURATION_MS = 180;
const MONITOR_PAGE_MIN_BLACKOUT_MS = 300;
const ROOM_TV_SHOWCASE_TARGETS = new Set<RoomFocusTargetId>([
  'comicEmbed',
  'comicScreen',
  'horrorEmbed',
  'tvSelect'
]);

function isMonitorPageTarget(target: RoomFocusTargetId): target is MonitorPageTarget {
  return (
    target === 'aboutEmbed' ||
    target === 'certificateEmbed' ||
    target === 'performanceEmbed' ||
    target === 'portfolioEmbed'
  );
}
const ROOM_FOCUS_TARGET_OPTIONS: ReadonlyArray<{ id: RoomFocusTargetId; label: string }> = [
  { id: 'overview', label: 'Room Overview' },
  { id: 'displayCase', label: 'Zertifikate' },
  { id: 'board', label: 'Schachbrett' },
  { id: 'workbench', label: 'Workbench' },
  { id: 'performanceEmbed', label: 'Leistungsnachweise Bildschirm' },
  { id: 'portfolioEmbed', label: 'Portfolio Bildschirm' },
  { id: 'aboutEmbed', label: 'Über mich Bildschirm' },
  { id: 'certificateEmbed', label: 'Zertifikate' },
  { id: 'pictureFrame', label: 'Leistungsnachweise' },
  ...(ENABLE_TV_SHOWCASE
    ? [
        { id: 'comicEmbed', label: 'Über mich (Legacy-Video)' },
        { id: 'comicScreen', label: 'TV' },
        { id: 'tvSelect', label: 'TV' },
        { id: 'horrorEmbed', label: 'KI-Trailer' }
      ] satisfies ReadonlyArray<{ id: RoomFocusTargetId; label: string }>
    : []),
  { id: 'pictureFrameDetail', label: 'Certificate Detail' }
];

function normalizePublicRoomFocusTarget(target: RoomFocusTargetId): RoomFocusTargetId {
  if (!ENABLE_TV_SHOWCASE && ROOM_TV_SHOWCASE_TARGETS.has(target)) {
    return 'aboutEmbed';
  }

  return target;
}

export function mountGame(root: HTMLDivElement, options: MountGameOptions = {}): MountedGame {
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
  let monitorPageReadyTarget: MonitorPageTarget | null = null;
  let monitorPageSettleElapsedMs = 0;
  let roomFocusFromTarget: RoomFocusTargetId = 'overview';
  let startFlowState: StartFlowMode = 'menu';
  let roomFocusTarget: RoomFocusTargetId = 'overview';
  let hoveredRoomHotspot: RoomFocusTargetId | null = null;
  let hoveredPictureFrameId: string | null = null;
  let hoveredCertificateTopicId: string | null = null;
  let activeCertificateTopicId = 'cs50';
  let activePictureFrameDetailId = 'frame0';
  let activeTvSelection: TvSelectionId = 'comic';
  let pendingMenuReturn = false;
  let legalWallTab: 'impressum' | 'datenschutz' = 'impressum';
  const controllerState: GameInteractionControllerState = {
    legalTargetSquares: [],
    selectedSquare: null
  };

  const initialLoadProgress = {
    board: 0,
    pieces: 0,
    room: 0,
    warmup: 0
  };
  const reportInitialLoadProgress = (
    channel: keyof typeof initialLoadProgress,
    progress: number
  ): void => {
    const clampedProgress = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
    initialLoadProgress[channel] = Math.max(initialLoadProgress[channel], clampedProgress);
    options.onLoadProgress?.(
      initialLoadProgress.room * 0.65 +
      initialLoadProgress.pieces * 0.10 +
      initialLoadProgress.board * 0.05 +
      initialLoadProgress.warmup * 0.20
    );
  };
  options.onLoadProgress?.(0);

  // Intro-Overlay-Gate: Raum, Figuren und Brett müssen vollständig vorbereitet
  // sein. Danach wird die tatsächliche GPU-/Render-Bereitschaft geprüft.
  let resolveBoardLoaded!: () => void;
  let resolveRoomLoaded!: () => void;
  let resolvePiecesLoaded!: () => void;
  const coreAssetsReady = Promise.all([
    new Promise<void>(r => { resolveBoardLoaded = r; }),
    new Promise<void>(r => { resolveRoomLoaded = r; }),
    new Promise<void>(r => { resolvePiecesLoaded = r; })
  ]);

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
        beginStartFlowTransitionToTarget('performanceEmbed');
      }

      return;
    }

    if (action === 'direct-to-portfolio') {
      if (startFlowState === 'menu') {
        beginStartFlowTransitionToTarget('portfolioEmbed');
      }

      return;
    }

    if (action === 'direct-to-about') {
      if (startFlowState === 'menu') {
        beginStartFlowTransitionToTarget('aboutEmbed');
      }

      return;
    }

    if (action === 'direct-to-certificates') {
      if (startFlowState === 'menu') {
        activeCertificateTopicId = 'cs50';
        beginStartFlowTransitionToTarget('certificateEmbed');
      }

      return;
    }

    // Legacy-Einstieg für den optionalen TV-/Comic-Showcase. Der öffentliche
    // Über-mich-Button verwendet ausschließlich den neuen aboutEmbed-Pfad.
    if (action === 'direct-to-comic') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'menu') {
        beginStartFlowTransitionToTarget('comicEmbed');
      }

      return;
    }

    if (action === 'back-from-comic-embed') {
      if (startFlowState === 'roomExplore' && roomFocusTarget === 'comicEmbed' && !isRoomFocusTransitionActive()) {
        activeTvSelection = 'comic';
        if (ENABLE_TV_SHOWCASE) {
          // Sofort zurück zur TV-Auswahl ohne Kamerafahrt.
          roomFocusFromTarget = 'tvSelect';
          roomFocusTarget = 'tvSelect';
          roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
          syncStartFlowToPreview();
        } else {
          focusRoomTarget('overview');
        }
      }

      return;
    }

    if (action === 'activate-comic-from-tv') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'roomExplore' && roomFocusTarget === 'tvSelect' && !isRoomFocusTransitionActive()) {
        activeTvSelection = 'comic';
        syncPanels();
      }

      return;
    }

    if (action === 'activate-horror-from-tv') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'roomExplore' && roomFocusTarget === 'tvSelect' && !isRoomFocusTransitionActive()) {
        activeTvSelection = 'horror';
        syncPanels();
      }

      return;
    }

    if (action === 'toggle-tv-selection') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'roomExplore' && roomFocusTarget === 'tvSelect' && !isRoomFocusTransitionActive()) {
        activeTvSelection = activeTvSelection === 'comic' ? 'horror' : 'comic';
        syncPanels();
      }

      return;
    }

    if (action === 'select-comic-from-tv') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'roomExplore' && roomFocusTarget === 'tvSelect' && !isRoomFocusTransitionActive()) {
        activeTvSelection = 'comic';
        // Sofort umschalten ohne Kamerafahrt
        roomFocusFromTarget = 'comicEmbed';
        roomFocusTarget = 'comicEmbed';
        roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
        syncStartFlowToPreview();
      }

      return;
    }

    if (action === 'select-horror-from-tv') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'roomExplore' && roomFocusTarget === 'tvSelect' && !isRoomFocusTransitionActive()) {
        activeTvSelection = 'horror';
        // Sofort umschalten ohne Kamerafahrt
        roomFocusFromTarget = 'horrorEmbed';
        roomFocusTarget = 'horrorEmbed';
        roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
        syncStartFlowToPreview();
      }

      return;
    }

    if (action === 'back-from-tv-select') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'roomExplore' && roomFocusTarget === 'tvSelect' && !isRoomFocusTransitionActive()) {
        focusRoomTarget('overview');
      }

      return;
    }

    if (action === 'back-from-horror-embed') {
      if (ENABLE_TV_SHOWCASE && startFlowState === 'roomExplore' && roomFocusTarget === 'horrorEmbed' && !isRoomFocusTransitionActive()) {
        activeTvSelection = 'horror';
        // Sofort zurück zur TV-Auswahl ohne Kamerafahrt.
        roomFocusFromTarget = 'tvSelect';
        roomFocusTarget = 'tvSelect';
        roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
        syncStartFlowToPreview();
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

    if (action === 'return-to-overview-from-tv') {
      if (startFlowState === 'roomExplore' && !isRoomFocusTransitionActive()) {
        focusRoomTarget('overview');
      }

      return;
    }

    if (action === 'return-to-menu-from-focus') {
      if (startFlowState === 'roomExplore' && !isRoomFocusTransitionActive()) {
        returnToMenuFromFocus();
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

    const certificateButton = target.closest<HTMLButtonElement>('[data-certificate-topic]');
    if (
      certificateButton &&
      !certificateButton.disabled &&
      roomFocusTarget === 'overview' &&
      !isRoomFocusTransitionActive()
    ) {
      activeCertificateTopicId = certificateButton.dataset.certificateTopic ?? 'cs50';
      focusRoomTarget('certificateEmbed');
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
    hoveredCertificateTopicId = null;
  };

  const handleRoomHotspotPointerOver = (event: PointerEvent): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      hoveredRoomHotspot = null;
      hoveredPictureFrameId = null;
      hoveredCertificateTopicId = null;
      return;
    }

    const hotspotButton = target.closest<HTMLButtonElement>('[data-room-hotspot]');
    const hotspotId = hotspotButton?.dataset.roomHotspot;
    hoveredRoomHotspot = isRoomHotspotId(hotspotId) ? hotspotId : null;

    const frameDiv = target.closest<HTMLElement>('[data-frame-id]');
    hoveredPictureFrameId = frameDiv?.dataset.frameId ?? null;

    const certificateButton = target.closest<HTMLElement>('[data-certificate-topic]');
    hoveredCertificateTopicId = certificateButton?.dataset.certificateTopic ?? null;
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

  const syncEmbeddedVideoNav = (): void => {
    const activeNav = roomHotspotsRoot.querySelector<HTMLElement>(
      '.comic-screen-overlay .web-embed-nav, .horror-screen-overlay .web-embed-nav'
    );
    const activeFrame = roomHotspotsRoot.querySelector<HTMLIFrameElement>(
      '.comic-screen-overlay iframe, .horror-screen-overlay iframe'
    );

    if (!activeNav || !activeFrame || window.innerWidth < 768) {
      if (activeNav) {
        activeNav.style.left = '';
        activeNav.style.right = '';
        activeNav.style.width = '';
        activeNav.style.maxWidth = '';
        activeNav.style.transform = '';
      }
      return;
    }

    const applyPosition = (): void => {
      const frameRect = activeFrame.getBoundingClientRect();
      let clipLeft = 0;
      let clipWidth = frameRect.width;

      try {
        const frameWindow = activeFrame.contentWindow;
        const frameDocument = activeFrame.contentDocument;
        if (frameWindow && frameDocument?.documentElement) {
          const frameStyles = frameWindow.getComputedStyle(frameDocument.documentElement);
          const leftRaw = (
            frameStyles.getPropertyValue('--media-frame-left') ||
            frameStyles.getPropertyValue('--comic-frame-left') ||
            '0px'
          ).trim();
          const widthRaw = (
            frameStyles.getPropertyValue('--media-frame-width') ||
            frameStyles.getPropertyValue('--comic-frame-width') ||
            ''
          ).trim();

          if (leftRaw.endsWith('px')) {
            const leftValue = parseFloat(leftRaw);
            if (Number.isFinite(leftValue)) {
              clipLeft = leftValue;
            }
          }

          if (widthRaw.endsWith('px')) {
            const widthValue = parseFloat(widthRaw);
            if (Number.isFinite(widthValue) && widthValue > 0) {
              clipWidth = widthValue;
            }
          }
        }
      } catch {
        // Same-origin iframes expose sizing data; if not available we keep the default nav layout.
      }

      if (clipWidth >= frameRect.width - 4) {
        activeNav.style.left = '';
        activeNav.style.right = '';
        activeNav.style.width = '';
        activeNav.style.maxWidth = '';
        activeNav.style.transform = '';
        return;
      }

      const insetX = 56;
      const alignedWidth = Math.max(0, clipWidth - insetX);
      activeNav.style.left = `${Math.round(frameRect.left + clipLeft + insetX)}px`;
      activeNav.style.right = 'auto';
      activeNav.style.width = `${Math.round(alignedWidth)}px`;
      activeNav.style.maxWidth = `${Math.round(alignedWidth)}px`;
      activeNav.style.transform = 'none';
    };

    if (activeFrame.dataset.navSyncBound !== '1') {
      activeFrame.dataset.navSyncBound = '1';
      activeFrame.addEventListener('load', () => {
        window.requestAnimationFrame(applyPosition);
        window.setTimeout(applyPosition, 120);
        window.setTimeout(applyPosition, 320);
      });
    }

    window.requestAnimationFrame(applyPosition);
  };

  window.addEventListener('resize', syncEmbeddedVideoNav);

  const syncMonitorPageFrame = (): void => {
    const frame = roomHotspotsRoot.querySelector<HTMLDivElement>('.monitor-page-frame');
    const iframe = frame?.querySelector<HTMLIFrameElement>('iframe');
    if (!frame || !iframe || frame.dataset.loadBound === '1') {
      return;
    }

    frame.dataset.loadBound = '1';
    const overlay = frame.closest<HTMLDivElement>('.monitor-page-overlay');
    const blackoutStartedAt = performance.now();
    const revealLoadedFrame = (): void => {
      const remainingBlackoutMs = Math.max(
        0,
        MONITOR_PAGE_MIN_BLACKOUT_MS - (performance.now() - blackoutStartedAt)
      );
      window.setTimeout(() => {
        // Zwei Paints geben dem lokalen Dokument Zeit für sein erstes vollständiges
        // Bild. Bis dahin deckt die schwarze Fläche auch Toolbar und Preload ab.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (frame.isConnected) {
              frame.classList.add('is-ready');
              overlay?.classList.add('is-ready');
            }
          });
        });
      }, remainingBlackoutMs);
    };

    iframe.addEventListener('load', revealLoadedFrame, { once: true });
  };

  const syncPanels = (): void => {
    if (startFlowState !== 'roomExplore') {
      hoveredRoomHotspot = null;
      hoveredPictureFrameId = null;
      hoveredCertificateTopicId = null;
    } else {
      if (roomFocusTarget !== 'pictureFrame') {
        hoveredPictureFrameId = null;
      }
      if (roomFocusTarget !== 'overview') {
        hoveredCertificateTopicId = null;
      }
    }
    const snapshot = buildGameSnapshot();
    const currentTarget = snapshot.startFlow.currentRoomFocusTarget;
    const activeMonitorPageKey =
      snapshot.startFlow.certificateEmbedReady && currentTarget === 'certificateEmbed'
        ? `certificateEmbed:${encodeURIComponent(snapshot.startFlow.activeCertificateTopicId)}`
        : snapshot.startFlow.performanceEmbedReady && currentTarget === 'performanceEmbed'
          ? 'performanceEmbed'
          : snapshot.startFlow.aboutEmbedReady && currentTarget === 'aboutEmbed'
            ? 'aboutEmbed'
            : snapshot.startFlow.portfolioEmbedReady && currentTarget === 'portfolioEmbed'
              ? 'portfolioEmbed'
              : null;
    const mountedMonitorPageKey =
      roomHotspotsRoot
        .querySelector<HTMLElement>('[data-monitor-page-key]')
        ?.dataset.monitorPageKey ?? null;

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
    // ResizeObserver und andere Szenenupdates synchronisieren weiterhin die
    // Shell, duerfen eine bereits geladene Monitorseite aber nicht neu mounten.
    // Sonst wird das iframe zerstoert, der 3D-Raum blitzt durch und der
    // Ladehinweis erscheint erneut. Bei Ziel-/Themenwechsel wird normal neu
    // gerendert, weil sich der stabile Seitenschluessel dann aendert.
    if (activeMonitorPageKey === null || mountedMonitorPageKey !== activeMonitorPageKey) {
      roomHotspotsRoot.innerHTML =
        (snapshot.startFlow.state === 'roomExplore' || snapshot.startFlow.state === 'menu')
          ? renderRoomHotspots(snapshot, hoveredRoomHotspot, hoveredPictureFrameId, hoveredCertificateTopicId)
          : '';
      syncMonitorPageFrame();
    }

    // Vollbild-Einbettungen blenden die 3D-Kopf- und Fußzeile vollständig aus.
    const isPerformanceEmbed =
      snapshot.startFlow.performanceEmbedReady && currentTarget === 'performanceEmbed';
    const isCertificateEmbed =
      snapshot.startFlow.certificateEmbedReady && currentTarget === 'certificateEmbed';
    const isAboutEmbed =
      snapshot.startFlow.aboutEmbedReady && currentTarget === 'aboutEmbed';
    const isPortfolioEmbed =
      snapshot.startFlow.portfolioEmbedReady && currentTarget === 'portfolioEmbed';
    document.body.classList.toggle('performance-embed-active', isPerformanceEmbed);
    document.body.classList.toggle('certificate-embed-active', isCertificateEmbed);
    document.body.classList.toggle('about-embed-active', isAboutEmbed);
    document.body.classList.toggle('portfolio-embed-active', isPortfolioEmbed);

    // Body-Klasse umschalten für comicEmbed/tvSelect/horrorEmbed (Header/Footer ausblenden)
    const isComicEmbed =
      !snapshot.startFlow.roomFocusTransitionActive &&
      (currentTarget === 'comicEmbed' ||
        (ENABLE_TV_SHOWCASE && (currentTarget === 'tvSelect' || currentTarget === 'horrorEmbed')));
    document.body.classList.toggle('comic-embed-active', isComicEmbed);

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

    syncEmbeddedVideoNav();
  };

  const preview = createBoardPreviewScene({
    container: sceneRoot,
    onRoomAssetProgress: progress => reportInitialLoadProgress('room', progress),
    onRoomAssetReady: () => {
      reportInitialLoadProgress('room', 1);
      resolveRoomLoaded();
    },
    onSquareClick: handleSquareClick,
    onStateChange: () => {
      syncPanels();
    },
    pieces: engine.getSnapshot().pieces
  });

  const assetsReady = coreAssetsReady.then(() =>
    preview.prepareInitialRender(progress => reportInitialLoadProgress('warmup', progress))
  );

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
      durationMs = 2310,
      from = 'e4',
      mode = 'combat',
      phase = 'intro',
      phaseProgress = 0,
      remainingMs = 2310,
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
      document.body.classList.remove(
        'performance-embed-active',
        'certificate-embed-active',
        'about-embed-active',
        'portfolio-embed-active',
        'comic-embed-active'
      );
      preview.dispose();
      root.innerHTML = '';
    },
    enterRoom: () => {
      if (startFlowState === 'menu') {
        beginStartFlowTransition();
        syncPanels();
      }
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
        activeCertificateTopicId,
        activePictureFrameDetailId,
        activeTvSelection,
        aboutEmbedReady: monitorPageReadyTarget === 'aboutEmbed',
        certificateEmbedReady: monitorPageReadyTarget === 'certificateEmbed',
        currentRoomFocusTarget: startFlowState === 'menu' ? null : roomFocusTarget,
        gameplayInteractionEnabled: isGameplayInteractionEnabled(),
        hoveredRoomHotspot,
        introTransitionActive: startFlowState === 'introTransition',
        performanceEmbedReady: monitorPageReadyTarget === 'performanceEmbed',
        portfolioEmbedReady: monitorPageReadyTarget === 'portfolioEmbed',
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
      const assets = await loadBoardVisualAsset(progress => reportInitialLoadProgress('board', progress));

      if (isDisposed || requestId !== boardAssetRequestId) {
        return;
      }

      preview.applyBoardAsset(assets);
    } catch {
      // Asset-Laden ist optional; Platzhalter bleiben bei Fehlern aktiv.
    } finally {
      reportInitialLoadProgress('board', 1);
      resolveBoardLoaded();
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
      const assets = await loadPieceVisualAssets(
        nextPieceAssetSet,
        progress => reportInitialLoadProgress('pieces', progress)
      );

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
        reportInitialLoadProgress('pieces', 1);
        resolvePiecesLoaded();
        syncPanels();
      }
    }
  }

  function resetMonitorPageReveal(): void {
    monitorPageReadyTarget = null;
    monitorPageSettleElapsedMs = 0;
  }

  function beginStartFlowTransition(): void {
    resetMonitorPageReveal();
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
    const publicTarget = normalizePublicRoomFocusTarget(target) as Exclude<RoomFocusTargetId, 'overview'>;
    resetMonitorPageReveal();

    // Animiere direkt von Übersicht (= Menü-Kamera) zum gegebenen Ziel ohne
    // zuerst bei der Übersicht-Freikamera-Status anzuhalten. Das vermeidet den
    // Eingangs/Ausgangs-Animations-Konflikt der auftritt wenn beginStartFlowTransition
    // roomCameraFree aktiviert bevor focusRoomTarget es deaktiviert.
    startFlowState = 'roomExplore';
    hoveredRoomHotspot = null;
    roomFocusFromTarget = 'overview';
    roomFocusTarget = publicTarget;
    roomFocusElapsedMs = 0;
    syncStartFlowToPreview();
    ensureStartFlowLoop();
  }

  function returnToMenu(): void {
    resetMonitorPageReveal();
    // Menü-Ka mera passt zur Übersicht-Position, deshalb kein sichtbarer Sprung.
    startFlowState = 'menu';
    hoveredRoomHotspot = null;
    hoveredPictureFrameId = null;
    hoveredCertificateTopicId = null;
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
        resetMonitorPageReveal();
        syncStartFlowToPreview();
        stopStartFlowLoop();
        return;
      }

      syncStartFlowToPreview();
      return;
    }

    const safeMs = Math.max(ms, 0);

    if (isRoomFocusTransitionActive()) {
      roomFocusElapsedMs = Math.min(roomFocusElapsedMs + safeMs, ROOM_FOCUS_TRANSITION_DURATION_MS);

      if (roomFocusElapsedMs >= ROOM_FOCUS_TRANSITION_DURATION_MS) {
        roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
        // Am Endpunkt übernimmt der schwarze Handoff sofort; das lokale iframe
        // wird im folgenden State-Schritt ohne zusätzliche Haltezeit gemountet.
        syncStartFlowToPreview();
        if (pendingMenuReturn && roomFocusTarget === 'overview') {
          pendingMenuReturn = false;
          returnToMenu();
        } else if (!isMonitorPageTarget(roomFocusTarget)) {
          stopStartFlowLoop();
        }
        return;
      }

      syncStartFlowToPreview();
      return;
    }

    const settlingMonitorPageTarget = getMonitorPageSettleTarget();
    if (settlingMonitorPageTarget) {
      monitorPageSettleElapsedMs = Math.min(
        monitorPageSettleElapsedMs + safeMs,
        MONITOR_PAGE_SETTLE_DURATION_MS
      );

      if (monitorPageSettleElapsedMs >= MONITOR_PAGE_SETTLE_DURATION_MS) {
        monitorPageReadyTarget = settlingMonitorPageTarget;
        stopStartFlowLoop();
        syncPanels();
      }
      return;
    }

    stopStartFlowLoop();
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
    startFlowFrameHandle = window.requestAnimationFrame(handleStartFlowFrame);
  }

  function handleStartFlowFrame(timestamp: number): void {
    startFlowFrameHandle = 0;
    // Kamerafahrten sind zeitbasiert: ausgelassene Browser-Frames dürfen die
    // vorgesehene Dauer nicht künstlich verlängern.
    const deltaMs = Math.max(timestamp - startFlowLastFrameTime, 0);
    startFlowLastFrameTime = timestamp;

    advanceStartFlow(deltaMs);

    if (!isDisposed && isStartFlowAnimationActive()) {
      startFlowFrameHandle = window.requestAnimationFrame(handleStartFlowFrame);
    }
  }

  function stopStartFlowLoop(): void {
    if (startFlowFrameHandle === 0) {
      return;
    }

    window.cancelAnimationFrame(startFlowFrameHandle);
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

    const deltaMs = Math.max(timestamp - presentationLastFrameTime, 0);
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
      certificateTopicId: activeCertificateTopicId,
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
    const publicTarget = normalizePublicRoomFocusTarget(nextTarget);

    if (
      startFlowState !== 'roomExplore' ||
      isRoomFocusTransitionActive() ||
      getMonitorPageSettleTarget() !== null ||
      publicTarget === roomFocusTarget
    ) {
      return;
    }

    resetMonitorPageReveal();
    roomFocusFromTarget = roomFocusTarget;
    roomFocusTarget = publicTarget;
    roomFocusElapsedMs = 0;
    syncStartFlowToPreview();
    ensureStartFlowLoop();
  }

  function enterBoardFocus(): void {
    resetMonitorPageReveal();
    startFlowState = 'boardFocus';
    hoveredRoomHotspot = null;
    roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
    syncStartFlowToPreview();
    stopStartFlowLoop();
  }

  function enterDisplayCaseFocus(): void {
    resetMonitorPageReveal();
    startFlowState = 'displayCaseFocus';
    hoveredRoomHotspot = null;
    roomFocusElapsedMs = ROOM_FOCUS_TRANSITION_DURATION_MS;
    syncStartFlowToPreview();
    stopStartFlowLoop();
  }

  function returnToRoomExplore(): void {
    resetMonitorPageReveal();
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

  function getMonitorPageSettleTarget(): MonitorPageTarget | null {
    if (
      startFlowState === 'roomExplore' &&
      roomFocusFromTarget !== roomFocusTarget &&
      isMonitorPageTarget(roomFocusTarget) &&
      roomFocusElapsedMs >= ROOM_FOCUS_TRANSITION_DURATION_MS &&
      monitorPageReadyTarget !== roomFocusTarget
    ) {
      return roomFocusTarget;
    }

    return null;
  }

  function isStartFlowAnimationActive(): boolean {
    return (
      startFlowState === 'introTransition' ||
      isRoomFocusTransitionActive() ||
      getMonitorPageSettleTarget() !== null
    );
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

function renderRoomHotspots(
  snapshot: GameSnapshot,
  hoveredRoomHotspot: RoomFocusTargetId | null,
  hoveredPictureFrameId: string | null,
  hoveredCertificateTopicId: string | null
): string {
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

      if (hotspot.interactionMode === 'surface') {
        const width = Math.max(28, hotspot.screenWidth);
        const height = Math.max(24, hotspot.screenHeight);
        return `
          <button
            aria-label="${hotspot.label} öffnen"
            class="room-surface-hotspot ${isHovered ? 'room-surface-hotspot--hovered' : ''}"
            data-room-hotspot="${hotspot.id}"
            type="button"
            style="left: ${hotspot.screenX}px; top: ${hotspot.screenY}px; width: ${width}px; height: ${height}px;"
          >
            <span class="visually-hidden">${hotspot.label} öffnen</span>
          </button>
        `;
      }

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

  const certificateButtons = showHotspots
    ? snapshot.roomExplore.certificateFrames
        .filter((frame) => frame.isVisible)
        .map((frame) => {
          const width = Math.max(22, frame.screenWidth);
          const height = Math.max(22, frame.screenHeight);
          return `
            <button
              aria-label="Zertifikatsthema ${frame.label} öffnen"
              class="certificate-surface-hotspot ${hoveredCertificateTopicId === frame.id ? 'certificate-surface-hotspot--hovered' : ''}"
              data-certificate-topic="${frame.id}"
              type="button"
              style="left: ${frame.screenX}px; top: ${frame.screenY}px; width: ${width}px; height: ${height}px;"
            >
              <span class="visually-hidden">${frame.label} öffnen</span>
            </button>
          `;
        })
        .join('')
    : '';

  const focusedHotspot = hotspots.find((h) => h.isFocused);
  const infoPlate = focusedHotspot
    ? `
      <div class="room-focus-plate" aria-live="polite">
        <p class="room-focus-plate-eyebrow">Viewing</p>
        <p class="room-focus-plate-name">${focusedHotspot.label}</p>
      </div>
    `
    : '';

  const currentMonitorTarget = snapshot.startFlow.currentRoomFocusTarget;
  const currentMonitorPageReady =
    (currentMonitorTarget === 'certificateEmbed' && snapshot.startFlow.certificateEmbedReady) ||
    (currentMonitorTarget === 'performanceEmbed' && snapshot.startFlow.performanceEmbedReady) ||
    (currentMonitorTarget === 'aboutEmbed' && snapshot.startFlow.aboutEmbedReady) ||
    (currentMonitorTarget === 'portfolioEmbed' && snapshot.startFlow.portfolioEmbedReady);
  const monitorEntryBlackout =
    currentMonitorTarget !== null &&
    isMonitorPageTarget(currentMonitorTarget) &&
    !currentMonitorPageReady
      ? `<div
           aria-hidden="true"
           class="monitor-entry-blackout ${snapshot.startFlow.roomFocusTransitionActive ? 'monitor-entry-blackout--delayed' : 'monitor-entry-blackout--solid'}"
           style="--monitor-entry-blackout-delay: ${Math.max(0, ROOM_FOCUS_TRANSITION_DURATION_MS - MONITOR_ENTRY_BLACKOUT_DURATION_MS)}ms; --monitor-entry-blackout-duration: ${MONITOR_ENTRY_BLACKOUT_DURATION_MS}ms;"
         ></div>`
      : '';

  const certificateEmbedOverlay =
    snapshot.startFlow.certificateEmbedReady &&
    snapshot.startFlow.currentRoomFocusTarget === 'certificateEmbed'
      ? `<div
           class="certificate-embed-overlay monitor-page-overlay"
           data-monitor-page-key="certificateEmbed:${encodeURIComponent(snapshot.startFlow.activeCertificateTopicId)}"
         >
           <div class="certificate-embed-toolbar monitor-page-toolbar" aria-label="Zertifikate verlassen">
             <button
               class="web-embed-nav__btn"
               data-control="room-focus"
               data-room-focus-target="overview"
               type="button"
             >Zur&uuml;ck zum Raum</button>
             <button
               class="web-embed-nav__btn"
               data-control="return-to-menu-from-focus"
               type="button"
             >Zum Hauptmen&uuml;</button>
           </div>
           <div class="certificate-embed-frame monitor-page-frame">
             <div class="certificate-embed-preload monitor-page-preload" role="status">
               Zertifikatsbereich wird ge&ouml;ffnet&nbsp;&hellip;
             </div>
             <iframe
                src="/zertifikate/index.html?thema=${encodeURIComponent(snapshot.startFlow.activeCertificateTopicId)}"
                title="Zertifikate"
                loading="eager"
                referrerpolicy="no-referrer"
                allow="accelerometer 'none'; camera 'none'; display-capture 'none'; encrypted-media 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; picture-in-picture 'none'; publickey-credentials-get 'none'; usb 'none'"
             ></iframe>
           </div>
         </div>`
      : '';

  // ── Leistungsnachweise im linken Monitor ─────────────────────────────
  // Der neue öffentliche Ablauf ist vom alten Bilderrahmen-/Dokumentpfad
  // getrennt. Das iframe erscheint erst nach Abschluss der Kamerafahrt.
  const performanceEmbedOverlay =
    snapshot.startFlow.performanceEmbedReady &&
    snapshot.startFlow.currentRoomFocusTarget === 'performanceEmbed'
      ? `<div
           class="performance-embed-overlay monitor-page-overlay"
           data-monitor-page-key="performanceEmbed"
         >
           <div class="performance-embed-toolbar monitor-page-toolbar" aria-label="Leistungsnachweise verlassen">
             <button
               class="web-embed-nav__btn"
               data-control="room-focus"
               data-room-focus-target="overview"
               type="button"
             >Zur&uuml;ck zum Raum</button>
             <button
               class="web-embed-nav__btn"
               data-control="return-to-menu-from-focus"
               type="button"
             >Zum Hauptmen&uuml;</button>
           </div>
           <div class="performance-embed-frame monitor-page-frame">
             <div class="performance-embed-preload monitor-page-preload" role="status">
               Leistungsnachweise werden geöffnet&nbsp;&hellip;
             </div>
             <iframe
                src="/leistungsnachweise/index.html?v=2026-08-10-ten-study-sections"
                title="Leistungsnachweise"
                loading="eager"
                referrerpolicy="no-referrer"
                allow="accelerometer 'none'; camera 'none'; display-capture 'none'; encrypted-media 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; picture-in-picture 'none'; publickey-credentials-get 'none'; usb 'none'"
             ></iframe>
           </div>
         </div>`
      : '';

  // ── Über mich im rechten Monitor ────────────────────────────────────
  // Der öffentliche Pfad ist vollständig vom optionalen Comic-/Video-
  // Showcase getrennt und verwendet dieselbe Ankunftsphase wie links.
  const aboutEmbedOverlay =
    snapshot.startFlow.aboutEmbedReady &&
    snapshot.startFlow.currentRoomFocusTarget === 'aboutEmbed'
      ? `<div
           class="about-embed-overlay monitor-page-overlay"
           data-monitor-page-key="aboutEmbed"
         >
           <div class="about-embed-toolbar monitor-page-toolbar" aria-label="Über mich verlassen">
             <button
               class="web-embed-nav__btn"
               data-control="room-focus"
               data-room-focus-target="overview"
               type="button"
             >Zur&uuml;ck zum Raum</button>
             <button
               class="web-embed-nav__btn"
               data-control="return-to-menu-from-focus"
               type="button"
             >Zum Hauptmen&uuml;</button>
           </div>
           <div class="about-embed-frame monitor-page-frame">
             <div class="about-embed-preload monitor-page-preload" role="status">
               &Uuml;ber-mich-Seite wird ge&ouml;ffnet&nbsp;&hellip;
             </div>
             <iframe
                src="/ueber-mich/index.html?v=2026-08-09-profile-readme-v2"
               title="Über mich"
                loading="eager"
                referrerpolicy="no-referrer"
                allow="accelerometer 'none'; camera 'none'; display-capture 'none'; encrypted-media 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; picture-in-picture 'none'; publickey-credentials-get 'none'; usb 'none'"
             ></iframe>
           </div>
         </div>`
      : '';

  // ── Bilderrahmen-Glanz-Ringe (nur pictureFrame Fokus) ────────────────
  const pictureFrameGlows =
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'pictureFrame'
      ? snapshot.roomExplore.pictureFrames
          .filter((f) => f.isVisible)
          .map(
            (f, index) => `
            <button
              class="picture-frame-hotspot ${hoveredPictureFrameId === f.id ? 'picture-frame-hotspot--hovered' : ''}"
              data-frame-id="${f.id}"
              type="button"
              aria-label="Semester ${index + 1} öffnen"
              style="left: ${f.screenX}px; top: ${f.screenY}px;"
            >
              <span>Semester ${index + 1}</span>
            </button>
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
  const FRAME_DOCUMENTS: Record<string, { alt: string; src: string; title: string }> = {
    frame0: {
      alt: 'Notenspiegel Semester 1',
      src: '/assets/leistungsnachweise/notenspiegel-semester-1.png',
      title: 'Notenspiegel Semester 1'
    }
  };
  const pictureFrameDetailOverlay =
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'pictureFrameDetail'
      ? (() => {
          const semester = FRAME_SEMESTER[snapshot.startFlow.activePictureFrameDetailId] ?? '?';
          const document = FRAME_DOCUMENTS[snapshot.startFlow.activePictureFrameDetailId];
          if (document) {
            return `
            <div class="document-viewer-overlay">
              <div class="document-viewer-shell" role="dialog" aria-label="${document.title}">
                <img class="document-viewer-image" src="${document.src}" alt="${document.alt}" loading="eager" decoding="async" />
              </div>
            </div>`;
          }
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

  // ── Portfolio im mittleren Monitor ──────────────────────────────────
  // Der öffentliche Platzhalterpfad bleibt von der bisherigen React-App
  // getrennt und verwendet dieselbe Ankunftsphase wie die anderen Monitore.
  const portfolioEmbedOverlay =
    snapshot.startFlow.portfolioEmbedReady &&
    snapshot.startFlow.currentRoomFocusTarget === 'portfolioEmbed'
      ? `<div
           class="portfolio-embed-overlay monitor-page-overlay"
           data-monitor-page-key="portfolioEmbed"
         >
           <div class="portfolio-embed-toolbar monitor-page-toolbar" aria-label="Portfolio verlassen">
             <button
               class="web-embed-nav__btn"
               data-control="room-focus"
               data-room-focus-target="overview"
               type="button"
             >Zur&uuml;ck zum Raum</button>
             <button
               class="web-embed-nav__btn"
               data-control="return-to-menu-from-focus"
               type="button"
             >Zum Hauptmen&uuml;</button>
           </div>
           <div class="portfolio-embed-frame monitor-page-frame">
             <div class="portfolio-embed-preload monitor-page-preload" role="status">
               Portfolio wird ge&ouml;ffnet&nbsp;&hellip;
             </div>
             <iframe
                src="/portfolio-platzhalter/index.html"
                title="Portfolio"
                loading="eager"
                referrerpolicy="no-referrer"
                allow="accelerometer 'none'; camera 'none'; display-capture 'none'; encrypted-media 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; picture-in-picture 'none'; publickey-credentials-get 'none'; usb 'none'"
             ></iframe>
           </div>
         </div>`
      : '';

  // TV-Auswahl-Overlay (tvSelect Fokus)
  const tvSelectOverlay =
    ENABLE_TV_SHOWCASE &&
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'tvSelect'
      ? (() => {
          const tvPrograms: Record<TvSelectionId, {
            activateControl: string;
            ariaLabel: string;
            channel: string;
            cta: string;
            meta: string;
            playControl: string;
            posterSrc: string;
            title: string;
          }> = {
            comic: {
              activateControl: 'activate-comic-from-tv',
              ariaLabel: 'Ueber mich abspielen',
              channel: 'CH 01 - Persoenlich',
              cta: 'Jetzt ansehen',
              meta: 'Comic-Flow - 10 Szenen - ca. 3 Min.',
              playControl: 'select-comic-from-tv',
              posterSrc: '/comic-film/cover.webp',
              title: 'Ueber mich'
            },
            horror: {
              activateControl: 'activate-horror-from-tv',
              ariaLabel: 'KI-Trailer abspielen',
              channel: 'CH 02 - Genre',
              cta: 'Trailer starten',
              meta: 'Horror-Trailer - 1:36 Min. - Cinematic',
              playControl: 'select-horror-from-tv',
              posterSrc: '/horror-film/cover.webp',
              title: 'KI-Trailer'
            }
          };

          const activeId = snapshot.startFlow.activeTvSelection;
          const standbyId: TvSelectionId = activeId === 'comic' ? 'horror' : 'comic';
          const activeProgram = tvPrograms[activeId];
          const standbyProgram = tvPrograms[standbyId];
          const renderTvCard = (program: typeof activeProgram, state: 'active' | 'standby'): string => {
            const isActive = state === 'active';
            return `
              <button
                class="tv-select-card tv-select-card--${state}"
                data-control="${isActive ? program.playControl : program.activateControl}"
                type="button"
                aria-label="${isActive ? program.ariaLabel : program.title + ' als aktiven Sender waehlen'}"
                ${isActive ? 'aria-current="true"' : ''}
              >
                <span class="tv-select-card__poster" aria-hidden="true">
                  <img src="${program.posterSrc}" alt="" loading="eager" decoding="async">
                </span>
                <span class="tv-select-card__body">
                  <span class="tv-select-card__channel">${program.channel}</span>
                  <span class="tv-select-card__title">${program.title}</span>
                  <span class="tv-select-card__meta">${program.meta}</span>
                  <span class="tv-select-card__cta">${isActive ? program.cta : 'Zum Kanal'}</span>
                </span>
              </button>`;
          };

          return `<div class="tv-select-overlay">
            <div class="mobile-landscape-lock" role="status" aria-live="polite">
              <div class="mobile-landscape-lock__message">In Landscape Ansicht nicht verf&uuml;gbar</div>
            </div>
            <div class="tv-select-shell">
              <div class="tv-select-header">
                <h2 class="tv-select-title">Heute im Showcase</h2>
              </div>
              <div class="tv-select-track" aria-label="Programmauswahl">
                <div class="tv-select-carousel">
                  ${renderTvCard(activeProgram, 'active')}
                  ${renderTvCard(standbyProgram, 'standby')}
                </div>
              </div>
            </div>
            <div class="web-embed-nav">
              <button class="web-embed-nav__btn" data-control="back-from-tv-select" type="button">Zur&uuml;ck</button>
              <button class="web-embed-nav__btn" data-control="return-to-menu-from-focus" type="button">Zum Hauptmen&uuml;</button>
            </div>
          </div>`;
        })()
      : '';

  const comicEmbedNavButtons = ENABLE_TV_SHOWCASE
    ? `<button class="web-embed-nav__btn" data-control="back-from-comic-embed" type="button">Zurück</button>
       <button class="web-embed-nav__btn" data-control="return-to-overview-from-tv" type="button">Zur Übersicht</button>
       <button class="web-embed-nav__btn" data-control="return-to-menu-from-focus" type="button">Zum Hauptmenü</button>`
    : `<button class="web-embed-nav__btn" data-control="back-from-comic-embed" type="button">Zurück</button>
       <button class="web-embed-nav__btn" data-control="return-to-menu-from-focus" type="button">Zum Hauptmenü</button>`;

  const comicEmbedOverlay =
    ENABLE_TV_SHOWCASE &&
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'comicEmbed'
      ? `<div class="comic-screen-overlay">
           <iframe
             src="/comic-film/index.html"
             title="Über mich"
             referrerpolicy="no-referrer"
             allow="fullscreen; accelerometer 'none'; camera 'none'; display-capture 'none'; encrypted-media 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; picture-in-picture 'none'; publickey-credentials-get 'none'; usb 'none'"
             allowfullscreen
           ></iframe>
           <div class="web-embed-nav">
             ${comicEmbedNavButtons}
           </div>
         </div>`
      : '';

  // ── Horror-Embed-Overlay (nur horrorEmbed Fokus) ────────────────────────
  const horrorEmbedOverlay =
    ENABLE_TV_SHOWCASE &&
    !snapshot.startFlow.roomFocusTransitionActive &&
    snapshot.startFlow.currentRoomFocusTarget === 'horrorEmbed'
      ? `<div class="horror-screen-overlay">
           <iframe
             src="/horror-film/index.html"
             title="KI-Trailer"
             referrerpolicy="no-referrer"
             allow="autoplay; fullscreen; accelerometer 'none'; camera 'none'; display-capture 'none'; encrypted-media 'none'; geolocation 'none'; gyroscope 'none'; magnetometer 'none'; microphone 'none'; midi 'none'; payment 'none'; picture-in-picture 'none'; publickey-credentials-get 'none'; usb 'none'"
             allowfullscreen
           ></iframe>
           <div class="web-embed-nav">
             <button class="web-embed-nav__btn" data-control="back-from-horror-embed" type="button">Zurück</button>
             <button class="web-embed-nav__btn" data-control="return-to-overview-from-tv" type="button">Zur Übersicht</button>
             <button class="web-embed-nav__btn" data-control="return-to-menu-from-focus" type="button">Zum Hauptmenü</button>
           </div>
         </div>`
      : '';

  return `
    <div class="room-hotspots-layer">
      ${monitorEntryBlackout}
      ${hotspotButtons}
      ${certificateButtons}
      ${certificateEmbedOverlay}
      ${performanceEmbedOverlay}
      ${aboutEmbedOverlay}
      ${portfolioEmbedOverlay}
      ${pictureFrameGlows}
      ${pictureFrameDetailOverlay}
      ${tvSelectOverlay}
      ${comicEmbedOverlay}
      ${horrorEmbedOverlay}
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
    // Vollbild-Embeds rendern ihre Navigation direkt im jeweiligen Overlay.
    if (
      !roomFocusTransitionActive &&
      (
        currentRoomFocusTarget === 'certificateEmbed' ||
        currentRoomFocusTarget === 'performanceEmbed' ||
        currentRoomFocusTarget === 'portfolioEmbed' ||
        currentRoomFocusTarget === 'aboutEmbed'
      )
    ) {
      return '';
    }

    // comicEmbed/tvSelect/horrorEmbed: Buttons werden im jeweiligen Overlay gerendert
    if (!roomFocusTransitionActive && (currentRoomFocusTarget === 'comicEmbed' || currentRoomFocusTarget === 'comicScreen' || currentRoomFocusTarget === 'tvSelect' || currentRoomFocusTarget === 'horrorEmbed')) {
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

  // ── Menü / Intro: direkte Einstiegs-Buttons ────────────────────────────────
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
      <div class="control-row">
        <button class="control-button control-button--secondary" data-control="direct-to-about" type="button" ${buttonDisabled ? 'disabled' : ''}>
          Über mich
        </button>
      </div>
      <div class="control-row">
        <button class="control-button control-button--secondary" data-control="direct-to-certificates" type="button" ${buttonDisabled ? 'disabled' : ''}>
          Zertifikate
        </button>
      </div>
    </div>
  `;
}

function isRoomFocusTargetId(value: string | undefined): value is RoomFocusTargetId {
  return value === 'aboutEmbed' || value === 'certificateEmbed' || value === 'portfolioEmbed' || value === 'board' || value === 'comicEmbed' || value === 'comicScreen' || value === 'displayCase' || value === 'horrorEmbed' || value === 'legalWall' || value === 'overview' || value === 'performanceEmbed' || value === 'tvSelect' || value === 'workbench' || value === 'pictureFrame' || value === 'pictureFrameDetail';
}

function isRoomHotspotId(value: string | undefined): value is Exclude<RoomFocusTargetId, 'overview'> {
  return value === 'aboutEmbed' || value === 'portfolioEmbed' || value === 'board' || value === 'comicEmbed' || value === 'comicScreen' || value === 'displayCase' || value === 'horrorEmbed' || value === 'performanceEmbed' || value === 'pictureFrame' || value === 'tvSelect' || value === 'workbench';
}
