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

export type RoomFocusTargetId = 'board' | 'displayCase' | 'legalWall' | 'overview' | 'pictureFrame' | 'pictureFrameDetail' | 'webEmbed' | 'workbench';

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

// ── Raum-Kalibrierung beim Import ──────────────────────────────────────────
// raum.glb wurde mit Schachfeld-Schrittweite 0.512 Blender-Units exportiert.
// ROOM_SCALE konvertiert Blender-Units zu Three.js-Spielunits (1 Unit = 1 Feld).
// ROOM_OFFSET positioniert den Raum so, dass die Schachfeld-Mitte mit dem
// Three.js-Ursprung (0, 0, 0) übereinstimmt.
//
// Nach einem frischen Blender-Export neu kalibrieren:
//   1. Öffnen Sie die neue room.glb in Three.js (oder nutzen das Debug-Overlay).
//   2. Messen Sie die Seitenlänge eines Feldes in Blender-Units = BLENDER_STEP.
//   3. Setzen Sie ROOM_SCALE = 1.0 / BLENDER_STEP.
//   4. Finden Sie die Schachfeld-Mitte in Blender-Koordinaten (x, y, z) = BC.
//   5. Setzen Sie ROOM_OFFSET = new THREE.Vector3(-BC.x * ROOM_SCALE, -BC.y * ROOM_SCALE, -BC.z * ROOM_SCALE).
const ROOM_SCALE = 1 / 0.512; // ein Blender-Feld (0.512 m) → eine Three.js-Unit
// ROOM_OFFSET.z = 15.426: korrigiert, sodass die aktuellen Feldmittel mit
// squareToWorld ausgerichtet sind (sq_a1 → Z=+3.5, sq_a8 → Z=−3.5).
// Der ursprüngliche Wert 15.826 verschob Felder 0.4 Units zu weit in +Z,
// was zu X-Z-Fehlausrichtung bei Hover/Markierung führte.
const ROOM_OFFSET = new THREE.Vector3(-11.123, -3.833, 15.426);
// Tatsächliche Spieloberfläche Y — gemessen an der board_base_plate-Oberseite in raum2.blend:
// Blender Z=2.4221 → Three.js Y=0.898.
// Beeinflusst: board.group.position.y, Figuren-Anker Y und Interaktions-surfaceY.
// Nach jedem Blender-Export, der das Schachfeld verschiebt, neu messen.
const BOARD_SURFACE_Y = 0.898; // = 2.4221 * ROOM_SCALE + ROOM_OFFSET.y

// ── Kamera-Presets ────────────────────────────────────────────────────────
// Raum-Grenzen in Three.js (nach ROOM_OFFSET.z-Korrektur):
//   X −29.6..+10.8  Y −5.8..+16.1  Z −13.0..+31.1  (alle Z-Werte sind 0.4 weniger)
// Wichtige Bereiche:
//   Schachfeld    → Three.js (0, 0.93, 0)
//   Werkbank      → Monitore bei X ≈ −26.3, Y = 3.22, Z = 12.0–24.0
//   Vitrine       → Mitte (−24.9, 2.7, −8.0)
//   Zertifikats-  → Mitte (−28.4, 4.7, 1.2)
//   rahmen
//
// MENU_CAMERA_PRESET und overview müssen identisch bleiben — "Raum erkunden" überspringt
// die introTransition und die Kamera ist bereits in der Übersicht-Position.
const MENU_CAMERA_PRESET: CameraPreset = {
  position: { x: 1.8, y: 8.41, z: 66.99 },
  target: { x: -14.76, y: 6.0, z: 8.95 }
};

// Portrait-Menü: ein Zoom-Schritt näher (Radius × 0.9) sodass der Raum
// auf schmalen Bildschirmen näher wirkt, aber immer noch 2 Schritte vom
// maximalen Zoom entfernt ist (Übersicht in Raum-Erkunden).
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
  // Vitrine — hinten-links im Raum.
  displayCase: {
    position: { x: -20.5, y: 4.5, z: 9.0 },
    target: { x: -24.9, y: 2.7, z: -8.0 }
  },
  // Rechtliche Wand — rechte Seite des Raums beim Eingang.
  legalWall: {
    position: { x: -4.0, y: 4.5, z: 32.0 },
    target: { x: 8.0, y: 3.0, z: 18.0 }
  },
  // Vollständige Raum-Übersicht — gleich wie MENU_CAMERA_PRESET (siehe oben).
  overview: {
    position: { x: 1.8, y: 8.41, z: 66.99 },
    target: { x: -14.76, y: 6.0, z: 8.95 }
  },
  // Werkbank-Monitor-Wand.
  workbench: {
    position: { x: -9.5, y: 3.5, z: 18.0 },
    target: { x: -26.27, y: 3.22, z: 18.01 }
  },
  // Zertifikate / Bilderrahmen — linke Wand.
  pictureFrame: {
    position: { x: -7.0, y: 3.5, z: 1.2 },
    target: { x: -28.4, y: 4.5, z: 1.2 }
  },
  // Nahaufnahme des ersten Zertifikats (oben-links) — navigiert durch Klick.
  pictureFrameDetail: {
    position: { x: -21.4, y: 7.0, z: 6.0 },
    target: { x: -28.4, y: 7.0, z: 6.0 }
  },
  // Monitor-Nahaufnahme — Kamera vollständig hinein in den Werkbank-Bildschirm.
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

// Interaktive Bilderrahmen angezeigt wenn auf das pictureFrame-Ziel fokussiert.
// Jeder Eintrag definiert die Welt-Koordinaten der Rahmenmitte für die Bildschirm-Projektion.
// Horizontaler Schritt: -3.29 Z-Units pro Rahmen. Oben Y=7.0, unten Y=3.2.
const PICTURE_FRAME_ANCHORS: ReadonlyArray<{ id: string; anchor: THREE.Vector3; label: string }> = [
  // Obere Reihe (links → rechts)
  { id: 'frame0', anchor: new THREE.Vector3(-28.4, 7.0,  6.0),  label: 'Zertifikat' },
  { id: 'frame2', anchor: new THREE.Vector3(-28.4, 7.0,  2.71), label: 'Zertifikat' },
  { id: 'frame3', anchor: new THREE.Vector3(-28.4, 7.0, -0.76), label: 'Zertifikat' },
  { id: 'frame4', anchor: new THREE.Vector3(-28.4, 7.0, -4.05), label: 'Zertifikat' },
  // Untere Reihe (links → rechts)
  { id: 'frame1', anchor: new THREE.Vector3(-28.4, 3.2,  6.0),  label: 'Zertifikat' },
  { id: 'frame5', anchor: new THREE.Vector3(-28.4, 3.2,  2.71), label: 'Zertifikat' },
  { id: 'frame6', anchor: new THREE.Vector3(-28.4, 3.2, -0.76), label: 'Zertifikat' },
  { id: 'frame7', anchor: new THREE.Vector3(-28.4, 3.2, -4.05), label: 'Zertifikat' }
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
    // onChange — wird bei jedem Touch-Move aufgerufen. DOM immer synchronisieren damit
    // Hotspot-Buttons (Übersicht + Bilderrahmen) der rotierten Kamera ohne Frame-Lag folgen.
    () => { onStateChange?.(); }
  );
  const size = new THREE.Vector2();
  // Wiederverwendbarer Scratch-Vektor — vermeidet Pro-Frame-Vector3-Speicherung in Hotspot-Projektion.
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
    // aktiv ist, da alle 3D-projizierten Buttons (Übersicht + Bilderrahmen)
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
    // Subtile Überkopf-Drift des Key-Lichts — hält das Board lebedig
    // ohne sichtbares Flimmern auf statischer Geometrie. Aktiv nur in boardFocus;
    // in Raum-Erkunden würde der bewegte Schatten aussehen wie Bodendrehung.
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
    // CCTV-Feed in sein Off-Screen-Ziel rendern VOR dem Hauptpass
    // damit die Bildschirm-Textur aktuell ist wenn Bloom die Szene zusammenstellt.
    stage.cctvScreen.renderToTarget(stage.scene, stage.renderer);
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

  // Vector3-Pool für Look-Around: Reuse statt ständig neue zu allocaten
  const _worldUp = new THREE.Vector3(0, 1, 0);
  const _lookAroundScratch = {
    pos: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    rotated: new THREE.Vector3()
  };

  const LOOK_AROUND_TARGETS: ReadonlyArray<RoomFocusTargetId> = [
    'overview', 'displayCase', 'pictureFrame', 'workbench'
  ];

  function applyStartFlowCameraPose(): void {
    const preset = getStartFlowCameraPreset();

    if (!preset) {
      lookAround.setEnabled(false);
      return;
    }

    applyCameraPreset(stage.camera, preset);

    // Look-Around (nur Touch): Blickrichtung ±45° drehen während Kamera-Position
    // fix bleibt. Aktiv in vier Benutzer-Bereichen:
    //   Übersicht (Raum erkunden), Vitrine (Zertifikate),
    //   Bilderrahmen (Leistungsnachweise), Werkbank (Portfolio)
    // Deaktiviert in: webEmbed (iframe bedeckt die Ansicht), pictureFrameDetail
    // (Nahaufnahme), boardFocus (Board-Kamera übernimmt), menu/introTransition.
    // Muss vollständig am Ziel angekommen sein (nicht unter Transition).
    const isFixedView =
      startFlowMode === 'roomExplore' &&
      LOOK_AROUND_TARGETS.includes(startFlowFocusTarget) &&
      startFlowFocusProgress >= 1;

    lookAround.setEnabled(isFixedView);

    if (isFixedView) {
      const { yaw, pitch } = lookAround.getOffset();
      if (yaw !== 0 || pitch !== 0) {
        _lookAroundScratch.pos.copy(stage.camera.position);
        // Basis-Blickrichtung: preset-Position → preset-Ziel
        _lookAroundScratch.forward.set(
          preset.target.x - preset.position.x,
          preset.target.y - preset.position.y,
          preset.target.z - preset.position.z
        ).normalize();
        // Rechts-Achse für Neigung (senkrecht zu Forward + World-Up)
        _lookAroundScratch.right
          .crossVectors(_lookAroundScratch.forward, _worldUp)
          .normalize();
        // Yaw um World-Y anwenden, dann Pitch um Rechts-Vektor
        _lookAroundScratch.rotated
          .copy(_lookAroundScratch.forward)
          .applyAxisAngle(_worldUp, yaw)
          .applyAxisAngle(_lookAroundScratch.right, pitch)
          .normalize();
        stage.camera.lookAt(_lookAroundScratch.pos.clone().add(_lookAroundScratch.rotated));
      }
    }
  }

  function getStartFlowCameraPreset(): CameraPreset | null {
    if (startFlowMode === 'boardFocus') {
      return null;
    }

    // Raum-Freikamera ist aktiv — rückgabe der Live-Position damit applyStartFlowCameraPose
    // sie jeden Frame anwendet und Bewegungen der cameraController überschreibt.
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
    // Wenn zum overview übergegangen wird aktiviert sich die Freikamera in der
    // gezoomten Ruheposition. Das dient als toPreset damit die Interpolation
    // genau dort endet und kein Sprung auftritt wenn die Freikamera übernimmt.
    // Ausnahme: wenn zum Menü zurückgekehrt wird soll man genau in der Menü-
    // Kamera-Position landen (baseRadius), nicht in der gezoomten Variante.
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
    const isLegalWallTransition =
      startFlowFocusTarget === 'legalWall' || startFlowFocusFromTarget === 'legalWall';
    return isLegalWallTransition
      ? swingLerpCameraPreset(fromPreset, toPreset, t)
      : isDisplayCaseTransition
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

      // Figuren werden nur in boardFocus gezeigt — sie schweben sichtbar in Raum-Erkunden.
      // Die Board-Gruppe bleibt permanent versteckt (Raum-GLB stellt die Grafik;
      // Raycasting via board.squares ist von visibility nicht beeinflusst).
      const isBoardFocus = startFlowMode === 'boardFocus';
      stage.pieceLayer.group.visible = isBoardFocus;

      // Statische GLB-Raum-Figuren verstecken wenn boardFocus aktiv ist damit sie
      // nicht die Three.js-Engine-Figuren überlagern. In allen anderen Modi zeigen.
      const roomPiecesVisible = !isBoardFocus;
      for (const node of stage.roomPieceNodes) {
        if (node.visible !== roomPiecesVisible) {
          node.visible = roomPiecesVisible;
        }
      }

      // ── Freikamera des Raums ──────────────────────────────────────────────────
      // Freie Bewegung ist aktiv wenn in roomExplore beim overview-Ziel ohne
      // ausstehende Transition. Jedes andere Ziel oder aktive Transition gibt
      // Kontrolle zurück an das Preset-Interpolationssystem.
      const shouldBeFree =
        startFlowMode === 'roomExplore' &&
        startFlowFocusTarget === 'overview' &&
        startFlowFocusProgress >= 1 &&
        !startFlowPendingMenuReturn;

      if (shouldBeFree && !roomCameraFree) {
        // Steuerungen von der overview-Preset aus initialisieren damit die Kamera
        // in der richtigen Position startet. Der Benutzer kann dann frei dahinter orbiten/scannen.
        stage.roomCameraControls.setPose(ROOM_FOCUS_TARGET_PRESETS.overview);
        freeCameraExitPreset = null;
        // Nur den Eingangs-Zoom spielen wenn zum ersten Mal vom Menü eintritt.
        // Wenn von einem Fokus-Ziel zurück kommt hat die Transition die Kamera
        // bereits bewegt; wir landen in der gezoomten Position ohne zweite Animation.
        if (startFlowFocusFromTarget === 'overview') {
          stage.roomCameraControls.startEntranceAnimation();
        }
        stage.roomCameraControls.setEnabled(true);
        roomCameraFree = true;
      } else if (!shouldBeFree && roomCameraFree) {
        stage.roomCameraControls.setEnabled(false);
        if (startFlowMode === 'menu') {
          // Zurück zum Menü: animiert das Zoom-Out damit die Kamera nicht springt.
          // syncStartFlowState wird hier nicht wieder in enger Schleife aufgerufen,
          // deshalb feuert der animateExit-Callback zuverlässig.
          stage.roomCameraControls.animateExit(() => {
            roomCameraFree = false;
          });
        } else {
          // Navigation zu Fokus-Ziel: erfasse die Live-Freikamera-Position damit
          // die Transitions-Interpolation von der aktuellen gezoomten Position startet,
          // nicht vom fixen overview-Preset.
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
  // Fog kalibriert für overview-Kamera bei Z=68 schaut auf Raum-Mitte Z≈9.
  // Near=80 hält alles im Raum scharf (Rückwand ist ~81 Units entfernt);
  // far=150 lässt Geometrie sanft verblassen jenseits des Far-Clips.
  // Board-Fokus nutzt viel kürzere Kamera-Abstände deshalb Fog ist unsichtbar dort.
  scene.fog = new THREE.Fog('#0d0d18', 80, 150);

  // antialias: true gibt MSAA auf den Zwischendurchläufen in BloomEffect;
  // die finale zusammengefügte Ausgabe zum Bildschirm profitiert auch davon.
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  // outputColorSpace + toneMapping werden in BloomEffect's Composite
  // Shader behandelt (ACESFilmic + sRGB Gamma). Wir setzen NoToneMapping auf dem Renderer
  // deshalb wendet er keine doppelte Tone-Mapping an beim Rendern zum Scene RT.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap ist veraltet in r183 — THREE fällt zurück auf PCFShadowMap.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Tone-Mapping wird in BloomEffect Composite Shader angewendet.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = 'board-canvas';

  container.innerHTML = '';
  container.append(renderer.domElement);

  // PMREM Umwelt-Kartierung — verleiht metallische/glänzende GLB-Oberflächen
  // physikalisch korrekte Reflexionen. RoomEnvironment erzeugt eine einfache
  // neutrale Studio-Sonde; es ist schnell zu berechnen und vermeidet ein externes HDRI-Asset.
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
      // Sofort anwenden für responsiven Feedback; applyStartFlowCameraPose
      // wendet es auch jeden Frame an während roomCameraFree wahr ist.
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

  // PMREM Umwelt-Kartierung auf metallische Oberflächen anwenden.
  // Niedriges Sigma (0.04) behält scharfe Reflexionen auf polierten Oberflächen.
  // environmentIntensity bleibt niedrig damit Reflexionen Glanz hinzufügen ohne
  // die dunkle Cyber-Atmosphäre auszuwaschen.
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;
  pmrem.dispose();

  // Das Raum-GLB besetzt die gleiche Welt-Position wie das Three.js-Board,
  // deshalb verstecken wir permanent die Board-Visual-Gruppe. Die einzelnen
  // board.squares-Meshes werden immer noch direkt durch createBoardInteraction
  // raycasted (Three.js prüft nicht visible auf Objekte die zu intersectObjects
  // übergeben werden, deshalb ist Hit-Testing unbeeinträchtigt).
  // Figuren werden versteckt bis boardFocus eintritt.
  board.group.visible = false;
  board.group.position.y = BOARD_SURFACE_Y; // Raycast-Quadrate mit Raum-Board-Oberfläche ausrichten
  pieceLayer.group.visible = false;

  // Raum-GLB: skalieren + verschieben damit die Blender-Schachfeld-Mitte mit
  // dem Three.js-Spiel-Ursprung (0, 0, 0) ausgerichtet ist. ROOM_SCALE und
  // ROOM_OFFSET sind die Kalibrierungs-Konstanten oben in dieser Datei definiert.
  const roomGroup = new THREE.Group();
  roomGroup.scale.setScalar(ROOM_SCALE);
  roomGroup.position.copy(ROOM_OFFSET);
  scene.add(roomGroup);

  // Statische Schachfiguren-Knoten aus dem Raum-GLB — versteckt wenn boardFocus
  // aktiv (Three.js-Engine-Figuren übernehmen) und sichtbar ansonsten.
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

// Interpoliert zwischen zwei Presets mit einem parabolischen Y-Bogen auf der Kamera-Position.
// arcLift definiert die maximale Höhe die bei t=0.5 hinzugefügt wird (Sinus-Glockenkurve).
function arcLerpCameraPreset(from: CameraPreset, to: CameraPreset, t: number, arcLift: number): CameraPreset {
  const base = lerpCameraPreset(from, to, t);
  const lift = arcLift * Math.sin(Math.PI * t);
  return {
    position: { x: base.position.x, y: base.position.y + lift, z: base.position.z },
    target: base.target
  };
}

// Quadratische Bézier-Kameraschwenk für einen kinematischen Bogenschwenk.
// Der Kontrollpunkt liegt seitlich und leicht erhöht zwischen Start und Ziel.
function swingLerpCameraPreset(from: CameraPreset, to: CameraPreset, t: number): CameraPreset {
  const progress = THREE.MathUtils.clamp(t, 0, 1);
  const midX = (from.position.x + to.position.x) / 2 + 7;
  const midY = (from.position.y + to.position.y) / 2 + 2.5;
  const midZ = (from.position.z + to.position.z) / 2 - 5;
  const b0 = (1 - progress) * (1 - progress);
  const b1 = 2 * (1 - progress) * progress;
  const b2 = progress * progress;
  return {
    position: {
      x: b0 * from.position.x + b1 * midX + b2 * to.position.x,
      y: b0 * from.position.y + b1 * midY + b2 * to.position.y,
      z: b0 * from.position.z + b1 * midZ + b2 * to.position.z
    },
    target: {
      x: THREE.MathUtils.lerp(from.target.x, to.target.x, progress),
      y: THREE.MathUtils.lerp(from.target.y, to.target.y, progress),
      z: THREE.MathUtils.lerp(from.target.z, to.target.z, progress)
    }
  };
}

