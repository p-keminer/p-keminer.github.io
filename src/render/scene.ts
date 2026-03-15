import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { BoardSquare, ChessPieceColor, ChessPieceState, ChessPieceType } from '../chess/state';
import { createChessboard, type ChessboardMesh } from './board';
import {
  createBoardCameraControls,
  type BoardCameraControls,
  type BoardCameraControlsSnapshot
} from './board-camera-controls';
import { computeFreeCameraEntryPreset, createRoomCameraControls, type RoomCameraControls } from './room-camera-controls';
import { createLookAroundControls, type LookAroundControls } from './look-around-controls';
import {
  createCombatCameraController,
  type CombatCameraController,
  type CombatCameraStateInput
} from './combat-camera';
import type { CombatPresentationStateInput } from './combat-presentation';
import { applyCameraPreset, createBoardCamera, type CameraPreset, resizeCamera } from './camera';
import { createBoardInteraction, type BoardInteractionLayer } from './interaction';
import { createSceneLights, type SceneLights } from './lights';
import { createBloomEffect, type BloomEffect } from './bloom';
import {
  DEFAULT_PIECE_ASSET_SET,
  loadRoomAsset,
  type BoardAssetMode,
  type BoardVisualAssets,
  type ChessVisualAssets,
  type PieceAssetFallbackMap,
  type PieceAssetFileMap,
  type PieceAssetMode,
  type PieceAssetSet,
  type PieceVisualAssets
} from './loaders';
import {
  createPieceLayer,
  type ChessPieceLayer,
  type PieceLayerAnimationSnapshot,
  type PiecePresentationDebugSnapshot
} from './pieces';
import { createCCTVScreen, type CCTVScreen } from './cctv-screen';

export interface BoardPresentationStateInput extends CombatPresentationStateInput {
  combatDurationMs: CombatCameraStateInput['combatDurationMs'];
  combatRemainingMs: CombatCameraStateInput['combatRemainingMs'];
}

export type RoomFocusTargetId = 'board' | 'displayCase' | 'overview' | 'pictureFrame' | 'pictureFrameDetail' | 'webEmbed' | 'workbench';

export type StartFlowMode = 'boardFocus' | 'displayCaseFocus' | 'introTransition' | 'menu' | 'roomExplore';

export interface StartFlowStateInput {
  focusFromTarget: RoomFocusTargetId;
  focusProgress: number;
  focusTarget: RoomFocusTargetId;
  mode: StartFlowMode;
  pendingMenuReturn?: boolean;
  pictureFrameDetailId?: string;
  progress: number;
}

export interface BoardPreviewSnapshot {
  animation: PieceLayerAnimationSnapshot;
  assets: {
    board: BoardAssetMode;
    loadedModelFiles: string[];
    loadedPieceModelFiles: string[];
    pieceAssetFallbacks: PieceAssetFallbackMap;
    pieceAssetFiles: PieceAssetFileMap;
    pieceAssetSet: PieceAssetSet;
    pieces: PieceAssetMode;
  };
  board: {
    coordinateSystem: string;
    darkSquares: number;
    lightSquares: number;
    sampleSquares: {
      a1: { x: number; z: number };
      h8: { x: number; z: number };
    };
    squareCount: number;
  };
  camera: {
    combatSide: string;
    combatSourcePosition: { x: number; y: number; z: number };
    combatSourceTarget: { x: number; y: number; z: number };
    controlsLocked: boolean;
    gestureMode: BoardCameraControlsSnapshot['gestureMode'];
    inspectPosition: { x: number; y: number; z: number };
    inspectTarget: { x: number; y: number; z: number };
    mode: string;
    position: { x: number; y: number; z: number };
    priority: string;
    returnPosition: { x: number; y: number; z: number };
    returnTarget: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
  };
  interaction: {
    checkedKingSquare: BoardSquare | null;
    highlightPriority: readonly string[];
    hoveredSquare: string | null;
    legalTargetSquares: BoardSquare[];
    lastMoveSquares: BoardSquare[];
    selectedSquare: string | null;
  };
  mode: 'chess_js_game_preview';
  pieces: {
    blackCount: number;
    placements: Array<{
      boardAnchorPosition: PiecePresentationDebugSnapshot['boardAnchorPosition'];
      color: ChessPieceColor;
      currentVisualHoverYOffset: number;
      hoverBaseOffset: number;
      hoverBobAmplitude: number;
      hoverBobSpeed: number;
      id: string;
      isHoveringVisual: boolean;
      square: string;
      type: ChessPieceType;
      visualRootPosition: PiecePresentationDebugSnapshot['visualRootPosition'];
    }>;
    totalCount: number;
    whiteCount: number;
  };
  roomExplore: {
    hotspots: Array<{
      focusTarget: RoomFocusTargetId;
      id: Exclude<RoomFocusTargetId, 'overview'>;
      isFocused: boolean;
      isVisible: boolean;
      label: string;
      screenX: number;
      screenY: number;
    }>;
    pictureFrames: Array<{
      id: string;
      isVisible: boolean;
      label: string;
      screenX: number;
      screenY: number;
    }>;
  };
  renderer: {
    height: number;
    width: number;
  };
  status: string;
}

export interface BoardPreviewApp {
  advanceTime: (ms: number) => void;
  applyBoardAsset: (assets: BoardVisualAssets) => void;
  applyPieceAssets: (assets: PieceVisualAssets) => void;
  applyVisualAssets: (assets: ChessVisualAssets) => void;
  dispose: () => void;
  getSnapshot: () => BoardPreviewSnapshot;
  resetCameraState: () => void;
  resetPresentationState: () => void;
  renderGameToText: () => string;
  syncStartFlowState: (state: StartFlowStateInput) => void;
  syncPresentationState: (state: BoardPresentationStateInput) => void;
  syncInteractionState: (state: {
    checkedKingSquare: BoardSquare | null;
    lastMoveSquares: BoardSquare[];
    legalTargetSquares: BoardSquare[];
    selectedSquare: BoardSquare | null;
  }) => void;
  syncPieces: (
    pieces: ChessPieceState[],
    options?: {
      animateMovedPieceId?: string | null;
      combatEvent?: CombatPresentationStateInput['combatEvent'];
      captureSquare?: BoardSquare | null;
      immediate?: boolean;
    }
  ) => void;
}

interface CreateBoardPreviewSceneOptions {
  container: HTMLDivElement;
  onStateChange?: () => void;
  onSquareClick?: (square: BoardSquare) => void;
  pieces: ChessPieceState[];
}

interface StageScene {
  bloom: BloomEffect;
  board: ChessboardMesh;
  camera: THREE.PerspectiveCamera;
  cameraController: CombatCameraController;
  boardCameraControls: BoardCameraControls;
  cctvScreen: CCTVScreen;
  interaction: BoardInteractionLayer;
  lights: SceneLights;
  pieceLayer: ChessPieceLayer;
  renderer: THREE.WebGLRenderer;
  roomCameraControls: RoomCameraControls;
  roomPieceNodes: THREE.Object3D[];
  scene: THREE.Scene;
}

// ── Room import calibration ────────────────────────────────────────────────
// raum.glb was exported with chess square step = 0.512 Blender units.
// ROOM_SCALE converts Blender units to Three.js game units (1 game unit = 1 chess square).
// ROOM_OFFSET positions the room so its chess board center aligns with the Three.js world
// origin (0, 0, 0).
//
// To re-calibrate after a fresh Blender export:
//   1. Open the new room.glb in Three.js (or use the debug overlay to inspect positions).
//   2. Measure the side length of one board square in Blender world units = BLENDER_STEP.
//   3. Set ROOM_SCALE = 1.0 / BLENDER_STEP.
//   4. Find the chess board center in Blender world coords (x, y, z) = BC.
//   5. Set ROOM_OFFSET = new THREE.Vector3(-BC.x * ROOM_SCALE, -BC.y * ROOM_SCALE, -BC.z * ROOM_SCALE).
const ROOM_SCALE = 1 / 0.512; // one Blender chess square (0.512 m) → one Three.js unit
// ROOM_OFFSET.z = 15.426: corrected so the actual board square centres align with
// squareToWorld (sq_a1 → Z=+3.5, sq_a8 → Z=−3.5).  The original value 15.826 placed
// board squares 0.4 units too far in +Z, causing hover/highlight X-Z misalignment.
const ROOM_OFFSET = new THREE.Vector3(-11.123, -3.833, 15.426);
// Actual playing surface Y — measured from board_base_plate top face in raum2.blend:
// Blender Z=2.4221 → Three.js Y=0.898.
// Drives: board.group.position.y, piece anchor Y, and interaction surfaceY.
// Re-measure after any Blender export that repositions the chess board.
const BOARD_SURFACE_Y = 0.898; // = 2.4221 * ROOM_SCALE + ROOM_OFFSET.y

// ── Camera presets ─────────────────────────────────────────────────────────
// Room bounds in Three.js (after ROOM_OFFSET.z correction):
//   X −29.6..+10.8  Y −5.8..+16.1  Z −13.0..+31.1  (all Z values are 0.4 less than before)
// Key areas:
//   chess board   → Three.js (0, 0.93, 0)
//   workbench     → monitors at X ≈ −26.3, Y = 3.22, Z = 12.0–24.0
//   display case  → centre (−24.9, 2.7, −8.0)
//   cert frames   → centre (−28.4, 4.7, 1.2)
//
// MENU_CAMERA_PRESET and overview MUST remain identical — "Raum erkunden" skips
// the introTransition so the camera is already at the overview position.
const MENU_CAMERA_PRESET: CameraPreset = {
  position: { x: 1.8, y: 8.41, z: 66.99 },
  target: { x: -14.76, y: 6.0, z: 8.95 }
};

// Portrait menu: one zoom step closer (radius × 0.9) so the room feels
// closer on narrow screens, but still 2 steps away from the max-zoom
// overview position used in room explore.
const PORTRAIT_MENU_CAMERA_PRESET: CameraPreset = (() => {
  const dx = MENU_CAMERA_PRESET.position.x - MENU_CAMERA_PRESET.target.x;
  const dy = MENU_CAMERA_PRESET.position.y - MENU_CAMERA_PRESET.target.y;
  const dz = MENU_CAMERA_PRESET.position.z - MENU_CAMERA_PRESET.target.z;
  const f = 0.9;
  return {
    position: {
      x: MENU_CAMERA_PRESET.target.x + dx * f,
      y: MENU_CAMERA_PRESET.target.y + dy * f,
      z: MENU_CAMERA_PRESET.target.z + dz * f
    },
    target: MENU_CAMERA_PRESET.target
  };
})();

const ROOM_FOCUS_TARGET_PRESETS: Record<Exclude<RoomFocusTargetId, 'board'>, CameraPreset> = {
  // Display case — back-left of the room.
  displayCase: {
    position: { x: -20.5, y: 4.5, z: 9.0 },
    target: { x: -24.9, y: 2.7, z: -8.0 }
  },
  // Full-room overview — same as MENU_CAMERA_PRESET (see above).
  overview: {
    position: { x: 1.8, y: 8.41, z: 66.99 },
    target: { x: -14.76, y: 6.0, z: 8.95 }
  },
  // Workbench monitor wall.
  workbench: {
    position: { x: -9.5, y: 3.5, z: 18.0 },
    target: { x: -26.27, y: 3.22, z: 18.01 }
  },
  // Certificate / picture frames — left wall.
  pictureFrame: {
    position: { x: -7.0, y: 3.5, z: 1.2 },
    target: { x: -28.4, y: 4.5, z: 1.2 }
  },
  // Close-up of first certificate (top-left) — navigated to by clicking the frame.
  pictureFrameDetail: {
    position: { x: -21.4, y: 7.0, z: 6.0 },
    target: { x: -28.4, y: 7.0, z: 6.0 }
  },
  // Monitor close-up — camera zoomed fully into the workbench screen.
  webEmbed: {
    position: { x: -24.5, y: 3.22, z: 18.01 },
    target: { x: -26.27, y: 3.22, z: 18.01 }
  }
};

const ROOM_HOTSPOT_DEFINITIONS: ReadonlyArray<{
  anchor: THREE.Vector3;
  focusTarget: Exclude<RoomFocusTargetId, 'overview'>;
  id: Exclude<RoomFocusTargetId, 'overview'>;
  label: string;
}> = [
  {
    anchor: new THREE.Vector3(0.15, 4.5, 0.55),
    focusTarget: 'board',
    id: 'board',
    label: 'Schachbrett'
  },
  {
    anchor: new THREE.Vector3(-15.5, 5.22, 2.29),
    focusTarget: 'displayCase',
    id: 'displayCase',
    label: 'Zertifikate'
  },
  {
    anchor: new THREE.Vector3(-25.15, 9.12, 4.51),
    focusTarget: 'pictureFrame',
    id: 'pictureFrame',
    label: 'Leistungsnachweise'
  },
  {
    anchor: new THREE.Vector3(-17.47, 6.5, 29.56),
    focusTarget: 'workbench',
    id: 'workbench',
    label: 'Portfolio'
  }
];

// Interactive picture frames shown when focused on the pictureFrame target.
// Each entry defines the world-space center of the frame for screen projection.
// Horizontal step: -3.29 Z units per frame. Upper row Y=7.0, lower row Y=3.2.
const PICTURE_FRAME_ANCHORS: ReadonlyArray<{ id: string; anchor: THREE.Vector3; label: string }> = [
  // Upper row (left → right)
  { id: 'frame0', anchor: new THREE.Vector3(-28.4, 7.0,  6.0),  label: 'Certificate' },
  { id: 'frame2', anchor: new THREE.Vector3(-28.4, 7.0,  2.71), label: 'Certificate' },
  { id: 'frame3', anchor: new THREE.Vector3(-28.4, 7.0, -0.76), label: 'Certificate' },
  { id: 'frame4', anchor: new THREE.Vector3(-28.4, 7.0, -4.05), label: 'Certificate' },
  // Lower row (left → right)
  { id: 'frame1', anchor: new THREE.Vector3(-28.4, 3.2,  6.0),  label: 'Certificate' },
  { id: 'frame5', anchor: new THREE.Vector3(-28.4, 3.2,  2.71), label: 'Certificate' },
  { id: 'frame6', anchor: new THREE.Vector3(-28.4, 3.2, -0.76), label: 'Certificate' },
  { id: 'frame7', anchor: new THREE.Vector3(-28.4, 3.2, -4.05), label: 'Certificate' }
];

export function createBoardPreviewScene({
  container,
  onStateChange,
  onSquareClick,
  pieces
}: CreateBoardPreviewSceneOptions): BoardPreviewApp {
  let currentPieces = pieces.map((piece) => ({ ...piece }));
  let loadedBoardFile: string | null = null;
  let loadedPieceModelFiles: string[] = [];
  let pieceAssetFallbacks: PieceAssetFallbackMap = {};
  let pieceAssetFiles: PieceAssetFileMap = {};
  let pieceAssetSet: PieceAssetSet = DEFAULT_PIECE_ASSET_SET;
  const stage = createStageScene(container, onStateChange, onSquareClick, currentPieces);
  const lookAround: LookAroundControls = createLookAroundControls(
    stage.renderer.domElement,
    // onChange — called on every touch-move. Always sync DOM so hotspot buttons
    // (overview + pictureFrame) follow the rotated camera without a frame lag.
    () => { onStateChange?.(); }
  );
  const size = new THREE.Vector2();
  // Reusable scratch vector — avoids per-frame Vector3 allocation in hotspot projection.
  const _projScratch = new THREE.Vector3();
  const clockState = { elapsedMs: 0 };
  let presentationMode: BoardPresentationStateInput['mode'] = 'board';
  let startFlowMode: StartFlowMode = 'menu';
  let startFlowFocusFromTarget: RoomFocusTargetId = 'overview';
  let startFlowFocusProgress = 1;
  let startFlowFocusTarget: RoomFocusTargetId = 'overview';
  let startFlowProgress = 0;
  let activePictureFrameDetailId = 'frame0';
  let roomCameraFree = false;
  let freeCameraExitPreset: CameraPreset | null = null;
  let startFlowPendingMenuReturn = false;
  let frameHandle = 0;
  let lastFrameTime = performance.now();

  let isPortrait = false;

  applyStartFlowCameraPose();
  syncStartFlowInteractionLock();

  const resize = (): void => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    stage.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.renderer.setSize(width, height, false);
    stage.bloom.setSize(
      Math.floor(width * Math.min(window.devicePixelRatio || 1, 2)),
      Math.floor(height * Math.min(window.devicePixelRatio || 1, 2))
    );
    resizeCamera(stage.camera, width, height);
    isPortrait = stage.camera.aspect < 1;
    stage.roomCameraControls.setPortraitMode(isPortrait);
    lookAround.setAllowPitch(!isPortrait);
    lookAround.setMaxYawLeft(isPortrait ? 13 : 45);
    render();
    // Hotspot-Positionen nach Resize neu berechnen — immer wenn roomExplore
    // aktiv ist, da alle 3D-projizierten Buttons (overview + pictureFrame)
    // auf Canvas-Pixel-Koordinaten basieren und nach einem Resize falsch liegen.
    // requestAnimationFrame stellt sicher, dass onStateChange erst nach
    // vollständiger Initialisierung (preview-Rückgabe in game.ts) aufgerufen
    // wird und keinen synchronen ResizeObserver-Feedback-Loop auslöst.
    if (startFlowMode === 'roomExplore') {
      window.requestAnimationFrame(() => onStateChange?.());
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });

  resizeObserver.observe(container);
  resize();

  const animate = (timestamp: number): void => {
    const deltaMs = Math.min(timestamp - lastFrameTime, 32);
    lastFrameTime = timestamp;
    step(deltaMs);
    frameHandle = window.requestAnimationFrame(animate);
  };

  frameHandle = window.requestAnimationFrame(animate);

  function step(deltaMs: number): void {
    clockState.elapsedMs += deltaMs;

    const seconds = clockState.elapsedMs / 1000;
    // Subtle overhead drift on the key light — keeps the board feeling alive
    // without visible flicker on static geometry.  Only active in boardFocus;
    // in room explore the moving shadow makes the floor look like it rotates.
    if (startFlowMode === 'boardFocus') {
      stage.lights.key.position.x = -9 + Math.sin(seconds * 0.18) * 1.5;
      stage.lights.key.position.z =  5 + Math.cos(seconds * 0.13) * 1.5;
    } else {
      stage.lights.key.position.x = -9;
      stage.lights.key.position.z =  5;
    }
    stage.pieceLayer.step(deltaMs);
    stage.cameraController.step(deltaMs);
    stage.cctvScreen.tick(clockState.elapsedMs);
    syncCameraControlLock();
    applyStartFlowCameraPose();

    render();
  }

  function render(): void {
    stage.bloom.render(stage.scene, stage.camera);
  }

  function getSnapshot(): BoardPreviewSnapshot {
    stage.renderer.getSize(size);
    const interactionState = stage.interaction.getState();
    const cameraState = stage.cameraController.getSnapshot();
    const cameraControlsState = stage.boardCameraControls.getSnapshot();
    const startFlowCameraPose = getStartFlowCameraPreset();
    const piecePresentationDebugState = new Map(
      stage.pieceLayer.getPresentationDebugState().map((snapshot) => [snapshot.id, snapshot] as const)
    );

    return {
      animation: stage.pieceLayer.getAnimationState(),
      assets: {
        board: stage.board.getVisualMode(),
        loadedModelFiles: [...(loadedBoardFile ? [loadedBoardFile] : []), ...loadedPieceModelFiles],
        loadedPieceModelFiles: [...loadedPieceModelFiles],
        pieceAssetFallbacks: { ...pieceAssetFallbacks },
        pieceAssetFiles: { ...pieceAssetFiles },
        pieceAssetSet,
        pieces: stage.pieceLayer.getVisualMode()
      },
      board: {
        coordinateSystem: 'origin at board center, +x runs from file a to h, +z runs from rank 8 toward rank 1',
        darkSquares: stage.board.darkSquareCount,
        lightSquares: stage.board.lightSquareCount,
        sampleSquares: {
          a1: { x: -3.5, z: 3.5 },
          h8: { x: 3.5, z: -3.5 }
        },
        squareCount: stage.board.squares.length
      },
      camera: {
        combatSide: cameraState.combatSide,
        combatSourcePosition: cameraState.combatSourcePosition,
        combatSourceTarget: cameraState.combatSourceTarget,
        controlsLocked: cameraControlsState.controlsLocked,
        gestureMode: cameraControlsState.gestureMode,
        inspectPosition: cameraState.inspectPosition,
        inspectTarget: cameraState.inspectTarget,
        mode: cameraState.mode,
        position: startFlowCameraPose ? { ...startFlowCameraPose.position } : cameraState.position,
        priority: cameraState.priority,
        returnPosition: cameraState.returnPosition,
        returnTarget: cameraState.returnTarget,
        target: startFlowCameraPose ? { ...startFlowCameraPose.target } : cameraState.target
      },
      interaction: {
        checkedKingSquare: interactionState.checkedKingSquare,
        highlightPriority: interactionState.highlightPriority,
        hoveredSquare: interactionState.hoveredSquare,
        legalTargetSquares: interactionState.legalTargetSquares,
        lastMoveSquares: interactionState.lastMoveSquares,
        selectedSquare: interactionState.selectedSquare
      },
      mode: 'chess_js_game_preview',
      pieces: {
        blackCount: currentPieces.filter((piece) => piece.color === 'black').length,
        placements: currentPieces.map((piece) => {
          const presentationSnapshot = piecePresentationDebugState.get(piece.id);

          return {
            boardAnchorPosition: presentationSnapshot?.boardAnchorPosition ?? { x: 0, y: 0, z: 0 },
            color: piece.color,
            currentVisualHoverYOffset: presentationSnapshot?.currentVisualHoverYOffset ?? 0,
            hoverBaseOffset: presentationSnapshot?.hoverBaseOffset ?? 0,
            hoverBobAmplitude: presentationSnapshot?.hoverBobAmplitude ?? 0,
            hoverBobSpeed: presentationSnapshot?.hoverBobSpeed ?? 0,
            id: piece.id,
            isHoveringVisual: presentationSnapshot?.isHoveringVisual ?? false,
            square: piece.square,
            type: piece.type,
            visualRootPosition: presentationSnapshot?.visualRootPosition ?? { x: 0, y: 0, z: 0 }
          };
        }),
        totalCount: currentPieces.length,
        whiteCount: currentPieces.filter((piece) => piece.color === 'white').length
      },
      roomExplore: {
        hotspots: getRoomHotspotSnapshots(),
        pictureFrames: getPictureFrameSnapshots()
      },
      renderer: {
        height: size.y,
        width: size.x
      },
      status: 'Interactive chess board ready'
    };
  }

  function renderGameToText(): string {
    return JSON.stringify(getSnapshot());
  }

  function syncCameraControlLock(): void {
    const cameraMode = stage.cameraController.getSnapshot().mode;
    stage.boardCameraControls.setLocked(startFlowMode !== 'boardFocus' || presentationMode === 'combat' || cameraMode !== 'board');
  }

  function syncStartFlowInteractionLock(): void {
    stage.interaction.setEnabled(startFlowMode === 'boardFocus');
  }

  function applyStartFlowCameraPose(): void {
    const preset = getStartFlowCameraPreset();

    if (!preset) {
      lookAround.setEnabled(false);
      return;
    }

    applyCameraPreset(stage.camera, preset);

    // Look-around (touch only): rotate view direction ±45° while keeping
    // camera position fixed. Active in the four user-facing areas:
    //   overview (Raum erkunden), displayCase (Zertifikate),
    //   pictureFrame (Leistungsnachweise), workbench (Portfolio)
    // Disabled in: webEmbed (iframe covers the view), pictureFrameDetail
    // (close-up), boardFocus (board camera takes over), menu/introTransition.
    // Must be fully arrived at the target (not mid-transition).
    const LOOK_AROUND_TARGETS: ReadonlyArray<RoomFocusTargetId> = [
      'overview', 'displayCase', 'pictureFrame', 'workbench'
    ];
    const isFixedView =
      startFlowMode === 'roomExplore' &&
      LOOK_AROUND_TARGETS.includes(startFlowFocusTarget) &&
      startFlowFocusProgress >= 1;

    lookAround.setEnabled(isFixedView);

    if (isFixedView) {
      const { yaw, pitch } = lookAround.getOffset();
      if (yaw !== 0 || pitch !== 0) {
        const pos = stage.camera.position.clone();
        // Base look direction: preset position → preset target
        const forward = new THREE.Vector3(
          preset.target.x - preset.position.x,
          preset.target.y - preset.position.y,
          preset.target.z - preset.position.z
        ).normalize();
        // Right axis for pitch (perpendicular to forward + world-up)
        const right = new THREE.Vector3()
          .crossVectors(forward, new THREE.Vector3(0, 1, 0))
          .normalize();
        // Apply yaw around world Y, then pitch around right vector
        forward
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
          .applyAxisAngle(right, pitch)
          .normalize();
        stage.camera.lookAt(pos.clone().add(forward));
      }
    }
  }

  function getStartFlowCameraPreset(): CameraPreset | null {
    if (startFlowMode === 'boardFocus') {
      return null;
    }

    // Room free camera is active — return its live pose so applyStartFlowCameraPose
    // applies it every frame, overriding any cameraController movement.
    if (roomCameraFree) {
      return stage.roomCameraControls.getPose();
    }

    if (startFlowMode === 'displayCaseFocus') {
      return ROOM_FOCUS_TARGET_PRESETS.displayCase;
    }

    if (startFlowMode === 'menu') {
      return isPortrait ? PORTRAIT_MENU_CAMERA_PRESET : MENU_CAMERA_PRESET;
    }

    if (startFlowMode === 'introTransition') {
      const menuPreset = isPortrait ? PORTRAIT_MENU_CAMERA_PRESET : MENU_CAMERA_PRESET;
      return lerpCameraPreset(menuPreset, getRoomFocusTargetPreset('overview'), easeInOutCubic(startFlowProgress));
    }

    const fromPreset = (startFlowFocusFromTarget === 'overview' && freeCameraExitPreset !== null)
      ? freeCameraExitPreset
      : getRoomFocusTargetPreset(startFlowFocusFromTarget);
    // When transitioning TO overview the free camera will activate at the
    // zoomed-in resting position.  Use that as toPreset so the lerp ends
    // exactly there and no jump occurs when the free camera takes over.
    // Exception: when returning to menu we want to land at the exact menu
    // camera position (baseRadius), not the zoomed-in variant.
    const toPreset = startFlowFocusTarget === 'overview'
      ? (startFlowPendingMenuReturn
          ? getRoomFocusTargetPreset('overview')
          : computeFreeCameraEntryPreset(getRoomFocusTargetPreset('overview'), isPortrait))
      : getRoomFocusTargetPreset(startFlowFocusTarget);

    if (startFlowFocusFromTarget === startFlowFocusTarget || startFlowFocusProgress >= 1) {
      return toPreset;
    }

    const t = easeInOutCubic(startFlowFocusProgress);
    const isDisplayCaseTransition =
      startFlowFocusTarget === 'displayCase' || startFlowFocusFromTarget === 'displayCase';
    return isDisplayCaseTransition
      ? arcLerpCameraPreset(fromPreset, toPreset, t, 4.0)
      : lerpCameraPreset(fromPreset, toPreset, t);
  }

  function getRoomHotspotSnapshots(): BoardPreviewSnapshot['roomExplore']['hotspots'] {
    if (startFlowMode !== 'roomExplore') {
      return [];
    }

    return ROOM_HOTSPOT_DEFINITIONS.map((hotspot) => {
      const projected = projectRoomHotspotAnchor(hotspot.anchor);
      return {
        focusTarget: hotspot.focusTarget,
        id: hotspot.id,
        isFocused: startFlowFocusTarget === hotspot.focusTarget,
        isVisible: projected.isVisible,
        label: hotspot.label,
        screenX: projected.screenX,
        screenY: projected.screenY
      };
    });
  }

  function getPictureFrameSnapshots(): BoardPreviewSnapshot['roomExplore']['pictureFrames'] {
    if (startFlowMode !== 'roomExplore' || startFlowFocusTarget !== 'pictureFrame' || startFlowFocusProgress < 1) {
      return [];
    }

    return PICTURE_FRAME_ANCHORS.map((frame) => {
      const projected = projectRoomHotspotAnchor(frame.anchor);
      return {
        id: frame.id,
        isVisible: projected.isVisible,
        label: frame.label,
        screenX: projected.screenX,
        screenY: projected.screenY
      };
    });
  }

  function projectRoomHotspotAnchor(anchor: THREE.Vector3): { isVisible: boolean; screenX: number; screenY: number } {
    const projected = _projScratch.copy(anchor).project(stage.camera);
    const isVisible =
      projected.z >= -1 &&
      projected.z <= 1 &&
      projected.x >= -1 &&
      projected.x <= 1 &&
      projected.y >= -1 &&
      projected.y <= 1;

    return {
      isVisible,
      screenX: (projected.x * 0.5 + 0.5) * size.x,
      screenY: (-projected.y * 0.5 + 0.5) * size.y
    };
  }

  return {
    advanceTime: (ms: number) => {
      step(ms);
    },
    applyBoardAsset: (assets) => {
      loadedBoardFile = assets.loadedBoardFile;
      stage.board.setVisualBoardAsset(assets.board);
      render();
      onStateChange?.();
    },
    applyPieceAssets: (assets) => {
      loadedPieceModelFiles = [...assets.loadedPieceFiles];
      pieceAssetFallbacks = { ...assets.pieceAssetFallbacks };
      pieceAssetFiles = { ...assets.pieceAssetFiles };
      pieceAssetSet = assets.pieceAssetSet;
      stage.pieceLayer.setPieceAssets(assets.pieceTemplates, currentPieces);
      render();
      onStateChange?.();
    },
    applyVisualAssets: (assets) => {
      loadedBoardFile = assets.loadedBoardFile;
      loadedPieceModelFiles = [...assets.loadedPieceFiles];
      pieceAssetFallbacks = { ...assets.pieceAssetFallbacks };
      pieceAssetFiles = { ...assets.pieceAssetFiles };
      pieceAssetSet = assets.pieceAssetSet;
      stage.board.setVisualBoardAsset(assets.board);
      stage.pieceLayer.setPieceAssets(assets.pieceTemplates, currentPieces);
      render();
      onStateChange?.();
    },
    dispose: () => {
      window.cancelAnimationFrame(frameHandle);
      resizeObserver.disconnect();
      stage.boardCameraControls.dispose();
      stage.roomCameraControls.dispose();
      stage.interaction.dispose();
      stage.board.dispose();
      stage.pieceLayer.dispose();
      stage.bloom.dispose();
      lookAround.dispose();
      stage.cctvScreen.dispose();
      stage.renderer.dispose();
      container.innerHTML = '';
    },
    getSnapshot,
    resetCameraState: () => {
      stage.boardCameraControls.reset();
      stage.cameraController.reset();
      syncCameraControlLock();
      render();
      onStateChange?.();
    },
    resetPresentationState: () => {
      presentationMode = 'board';
      stage.pieceLayer.clearCombatPresentation();
      stage.boardCameraControls.reset();
      stage.cameraController.reset();
      syncCameraControlLock();
      render();
      onStateChange?.();
    },
    renderGameToText,
    syncStartFlowState: (nextState) => {
      startFlowFocusFromTarget = nextState.focusFromTarget;
      startFlowFocusProgress = THREE.MathUtils.clamp(nextState.focusProgress, 0, 1);
      // Reset look-around when navigating to a new area so each fixed view
      // starts from the default look direction.
      if (startFlowFocusTarget !== nextState.focusTarget) {
        lookAround.reset();
      }
      startFlowFocusTarget = nextState.focusTarget;
      startFlowMode = nextState.mode;
      startFlowProgress = THREE.MathUtils.clamp(nextState.progress, 0, 1);
      startFlowPendingMenuReturn = nextState.pendingMenuReturn ?? false;
      if (nextState.pictureFrameDetailId !== undefined) {
        activePictureFrameDetailId = nextState.pictureFrameDetailId;
      }

      // Pieces are only shown in boardFocus — they float visibly in room-explore
      // otherwise.  The board group stays permanently hidden (room GLB provides
      // the visual; raycasting via board.squares is unaffected by visibility).
      const isBoardFocus = startFlowMode === 'boardFocus';
      stage.pieceLayer.group.visible = isBoardFocus;

      // Hide the static GLB room pieces when boardFocus is active so they
      // don't overlap the Three.js engine pieces.  Show them in all other modes.
      const roomPiecesVisible = !isBoardFocus;
      for (const node of stage.roomPieceNodes) {
        if (node.visible !== roomPiecesVisible) {
          node.visible = roomPiecesVisible;
        }
      }

      // ── Room free camera ──────────────────────────────────────────────────
      // Free-roam is active while in roomExplore at the overview target with
      // no pending transition.  Any other target or in-flight transition hands
      // control back to the preset lerp system.
      const shouldBeFree =
        startFlowMode === 'roomExplore' &&
        startFlowFocusTarget === 'overview' &&
        startFlowFocusProgress >= 1 &&
        !startFlowPendingMenuReturn;

      if (shouldBeFree && !roomCameraFree) {
        // Seed controls from the overview preset so the camera starts at the
        // correct position.  The user can then orbit/pan freely from there.
        stage.roomCameraControls.setPose(ROOM_FOCUS_TARGET_PRESETS.overview);
        freeCameraExitPreset = null;
        // Only play the entrance zoom when first entering from the menu.
        // When returning from a focus target the transition already moved the
        // camera; we land at the zoomed-in position without a second animation.
        if (startFlowFocusFromTarget === 'overview') {
          stage.roomCameraControls.startEntranceAnimation();
        }
        stage.roomCameraControls.setEnabled(true);
        roomCameraFree = true;
      } else if (!shouldBeFree && roomCameraFree) {
        stage.roomCameraControls.setEnabled(false);
        if (startFlowMode === 'menu') {
          // Returning to menu: animate the zoom-out so the camera doesn't snap.
          // syncStartFlowState won't be called again in a tight loop here, so
          // the animateExit callback reliably fires.
          stage.roomCameraControls.animateExit(() => {
            roomCameraFree = false;
          });
        } else {
          // Navigating to a focus target: capture the live free-camera pose so
          // the transition lerp starts from the actual zoomed position, not the
          // fixed overview preset.
          freeCameraExitPreset = stage.roomCameraControls.getPose();
          roomCameraFree = false;
        }
      }

      syncCameraControlLock();
      syncStartFlowInteractionLock();
      if (startFlowMode === 'boardFocus') {
        applyCameraPreset(stage.camera, stage.boardCameraControls.getPose());
      } else {
        applyStartFlowCameraPose();
      }
      render();
      onStateChange?.();
    },
    syncPresentationState: (nextState) => {
      presentationMode = nextState.mode;
      stage.cameraController.syncState({
        combatDurationMs: nextState.combatDurationMs,
        combatEvent: nextState.combatEvent
          ? {
              capturedSquare: nextState.combatEvent.capturedSquare,
              from: nextState.combatEvent.from,
              to: nextState.combatEvent.to
            }
          : null,
        combatRemainingMs: nextState.combatRemainingMs,
        mode: nextState.mode
      });
      syncCameraControlLock();
      stage.pieceLayer.syncCombatPresentation(nextState);
      render();
      onStateChange?.();
    },
    syncInteractionState: (nextState) => {
      stage.interaction.setHighlightState(nextState);
      render();
      onStateChange?.();
    },
    syncPieces: (piecesToRender, options) => {
      currentPieces = piecesToRender.map((piece) => ({ ...piece }));
      stage.pieceLayer.syncPieces(currentPieces, options);
      render();
      onStateChange?.();
    }
  };

  function getRoomFocusTargetPreset(target: RoomFocusTargetId): CameraPreset {
    if (target === 'board') {
      return stage.boardCameraControls.getPose();
    }

    if (target === 'pictureFrameDetail') {
      const frame = PICTURE_FRAME_ANCHORS.find((f) => f.id === activePictureFrameDetailId);
      if (frame) {
        return {
          position: { x: -21.4, y: frame.anchor.y, z: frame.anchor.z },
          target:   { x: -28.4, y: frame.anchor.y, z: frame.anchor.z }
        };
      }
    }

    return ROOM_FOCUS_TARGET_PRESETS[target];
  }
}

function createStageScene(
  container: HTMLDivElement,
  onStateChange: (() => void) | undefined,
  onSquareClick: ((square: BoardSquare) => void) | undefined,
  pieces: ChessPieceState[]
): StageScene {
  const scene = new THREE.Scene();
  // Fog calibrated for the overview camera at Z=68 looking at room centre Z≈9.
  // Near=80 keeps everything within the room crisp (back wall is ~81 units away);
  // far=150 lets geometry fade out gently beyond the far clip.
  // Board focus uses much shorter camera distances so fog is invisible there.
  scene.fog = new THREE.Fog('#0d0d18', 80, 150);

  // antialias: true gives MSAA on the intermediate passes inside BloomEffect;
  // the final composite blit to screen also benefits from it.
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  // outputColorSpace + toneMapping are handled inside BloomEffect's composite
  // shader (ACESFilmic + sRGB gamma).  We set NoToneMapping on the renderer
  // so it doesn't double-apply tone-mapping when rendering to the scene RT.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap is deprecated in r183 — THREE falls back to PCFShadowMap.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Tone-mapping is applied in the BloomEffect composite shader.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = 'board-canvas';

  container.innerHTML = '';
  container.append(renderer.domElement);

  // PMREM environment map — gives metallic/glossy GLB surfaces physically
  // correct reflections.  RoomEnvironment generates a simple neutral studio
  // probe; it's quick to compute and avoids an external HDRI asset.
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const camera = createBoardCamera(1);
  const cameraController = createCombatCameraController({ camera });
  const lights = createSceneLights();
  const bloom = createBloomEffect(renderer, {
    threshold: 0.90,  // höherer Threshold → weniger Pixel qualifizieren sich
    strength:  0.25,  // schwächerer additiver Bloom-Anteil
    blurScale: 1.5,   // engerer Glow-Radius
    exposure:  1.25
  });
  const boardCameraControls = createBoardCameraControls({
    domElement: renderer.domElement,
    onPoseChange: (preset) => {
      cameraController.setInspectPose(preset);
      bloom.render(scene, camera);
      onStateChange?.();
    }
  });
  const roomCameraControls = createRoomCameraControls({
    domElement: renderer.domElement,
    onPoseChange: (preset) => {
      // Apply immediately for responsive feedback; applyStartFlowCameraPose
      // will also apply it every frame while roomCameraFree is true.
      camera.position.set(preset.position.x, preset.position.y, preset.position.z);
      camera.lookAt(preset.target.x, preset.target.y, preset.target.z);
      bloom.render(scene, camera);
      onStateChange?.();
    }
  });
  const board = createChessboard();
  const pieceLayer = createPieceLayer(pieces);
  const interaction = createBoardInteraction({
    board,
    camera,
    domElement: renderer.domElement,
    onChange: () => {
      bloom.render(scene, camera);
      onStateChange?.();
    },
    onSquareClick,
    scene,
    surfaceY: BOARD_SURFACE_Y
  });

  scene.add(lights.group);
  scene.add(board.group);
  scene.add(pieceLayer.group);

  // Apply PMREM environment map for metallic surface reflections.
  // Low sigma (0.04) keeps sharp reflections on polished surfaces.
  // environmentIntensity is kept low so reflections add sheen without
  // washing out the dark cyber atmosphere.
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;
  pmrem.dispose();

  // The room GLB occupies the same world position as the Three.js board, so
  // we permanently hide the board's visual group.  The individual board.squares
  // meshes are still raycasted directly by createBoardInteraction (Three.js
  // does not check visible on objects passed to intersectObjects, so hit-
  // testing is unaffected).  Pieces are hidden until boardFocus is entered.
  board.group.visible = false;
  board.group.position.y = BOARD_SURFACE_Y; // align raycasting squares with room board surface
  pieceLayer.group.visible = false;

  // Room GLB: scale + translate so the Blender chess board center aligns with
  // the Three.js game origin (0, 0, 0).  ROOM_SCALE and ROOM_OFFSET are the
  // calibration constants defined at the top of this file.
  const roomGroup = new THREE.Group();
  roomGroup.scale.setScalar(ROOM_SCALE);
  roomGroup.position.copy(ROOM_OFFSET);
  scene.add(roomGroup);

  // Static chess piece nodes from the room GLB — hidden when boardFocus is
  // active (Three.js engine pieces take over) and shown otherwise.
  const roomPieceNodes: THREE.Object3D[] = [];
  const ROOM_PIECE_PATTERN = /^[wb]_(bishop|rook|knight|queen|king|pawn)/i;
  const cctvScreen = createCCTVScreen();

  loadRoomAsset().then((room) => {
    if (room) {
      for (const child of room.children.slice()) {
        roomGroup.add(child);
      }
      roomGroup.traverse((node) => {
        if (ROOM_PIECE_PATTERN.test(node.name)) {
          roomPieceNodes.push(node);
        }
      });
      cctvScreen.attach(roomGroup);
      onStateChange?.();
    }
  });

  return {
    bloom,
    board,
    camera,
    cameraController,
    boardCameraControls,
    cctvScreen,
    interaction,
    lights,
    pieceLayer,
    renderer,
    roomCameraControls,
    roomPieceNodes,
    scene
  };
}

function lerpCameraPreset(from: CameraPreset, to: CameraPreset, t: number): CameraPreset {
  const progress = THREE.MathUtils.clamp(t, 0, 1);

  return {
    position: {
      x: THREE.MathUtils.lerp(from.position.x, to.position.x, progress),
      y: THREE.MathUtils.lerp(from.position.y, to.position.y, progress),
      z: THREE.MathUtils.lerp(from.position.z, to.position.z, progress)
    },
    target: {
      x: THREE.MathUtils.lerp(from.target.x, to.target.x, progress),
      y: THREE.MathUtils.lerp(from.target.y, to.target.y, progress),
      z: THREE.MathUtils.lerp(from.target.z, to.target.z, progress)
    }
  };
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

// Lerps between two presets with a parabolic Y arc on the camera position.
// arcLift defines the maximum height added at t=0.5 (sin bell curve).
function arcLerpCameraPreset(from: CameraPreset, to: CameraPreset, t: number, arcLift: number): CameraPreset {
  const base = lerpCameraPreset(from, to, t);
  const lift = arcLift * Math.sin(Math.PI * t);
  return {
    position: { x: base.position.x, y: base.position.y + lift, z: base.position.z },
    target: base.target
  };
}

