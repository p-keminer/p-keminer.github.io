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
import { deviceTier, isMobileDevice } from './device-tier';
import { createDemandFrameLoop, type DemandFrameLoop } from './demand-frame-loop';
import { createAdaptiveResolution, getBaseRenderDpr, type ResolutionMode } from './adaptive-resolution';
import { createRoomRenderTiming } from './room-render-timing';
import { profileRoomPasses } from './room-pass-timing';
import { createBoardInteraction, type BoardInteractionLayer } from './interaction';
import { createSceneLights, type SceneLights } from './lights';
import eveningProfile from './room-evening-profile.json';
import {
  createRoomQualityController,
  type RoomQualityController
} from './room-quality';
import { loadRoomPresentationAssets } from './room-assets';
import { createRoomStaticBatches } from './room-static-batches';
import { createBloomEffect, type BloomEffect } from './bloom';
import {
  DEFAULT_PIECE_ASSET_SET,
  ROOM_REFINED_MODEL_FILE,
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

export type RoomFocusTargetId = 'aboutEmbed' | 'board' | 'certificateEmbed' | 'comicEmbed' | 'comicScreen' | 'displayCase' | 'horrorEmbed' | 'legalWall' | 'overview' | 'performanceEmbed' | 'portfolioEmbed' | 'pictureFrame' | 'pictureFrameDetail' | 'tvSelect' | 'workbench';

export type StartFlowMode = 'boardFocus' | 'displayCaseFocus' | 'introTransition' | 'menu' | 'roomExplore';

export interface StartFlowStateInput {
  certificateTopicId?: string;
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
      interactionMode: 'marker' | 'surface';
      isFocused: boolean;
      isVisible: boolean;
      label: string;
      screenHeight: number;
      screenWidth: number;
      screenX: number;
      screenY: number;
    }>;
    certificateFrames: Array<{
      id: string;
      isVisible: boolean;
      label: string;
      screenHeight: number;
      screenWidth: number;
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
  prepareInitialRender: (onProgress?: (progress: number) => void) => Promise<void>;
  resetCameraState: () => void;
  requestLookAroundReset: (onComplete: () => void) => void;
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
  onRoomAssetProgress?: (progress: number) => void;
  onRoomAssetReady?: () => void;
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
  roomGroup: THREE.Group;
  roomPieceNodes: THREE.Object3D[];
  roomQuality: RoomQualityController;
  disposeRoomResources: () => void;
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

interface RoomCalibration {
  isRedesign: boolean;
  offset: THREE.Vector3;
  scale: number;
}

function resolveRoomCalibration(room: THREE.Object3D): RoomCalibration {
  const chessAnchors: THREE.Object3D[] = [];

  room.traverse((node) => {
    if (node.userData.hotspot === true && node.userData.role === 'chess') {
      chessAnchors.push(node);
    }
  });

  const chessAnchor = chessAnchors[0];
  if (!chessAnchor) {
    return {
      isRedesign: false,
      offset: ROOM_OFFSET.clone(),
      scale: ROOM_SCALE
    };
  }

  const squareStep = Number(chessAnchor.userData.square_step);
  const boardSurfaceSourceY = Number(chessAnchor.userData.board_surface_z);

  if (!Number.isFinite(squareStep) || squareStep <= 0 || !Number.isFinite(boardSurfaceSourceY)) {
    return {
      isRedesign: false,
      offset: ROOM_OFFSET.clone(),
      scale: ROOM_SCALE
    };
  }

  room.updateMatrixWorld(true);
  const boardCenter = chessAnchor.getWorldPosition(new THREE.Vector3());
  const scale = 1 / squareStep;

  return {
    isRedesign: true,
    offset: new THREE.Vector3(
      -boardCenter.x * scale,
      BOARD_SURFACE_Y - boardSurfaceSourceY * scale,
      -boardCenter.z * scale
    ),
    scale
  };
}

function copyCameraPreset(target: CameraPreset, source: CameraPreset): void {
  Object.assign(target.position, source.position);
  Object.assign(target.target, source.target);
}

function zoomCameraPreset(preset: CameraPreset, factor: number): CameraPreset {
  const dx = preset.position.x - preset.target.x;
  const dy = preset.position.y - preset.target.y;
  const dz = preset.position.z - preset.target.z;

  return {
    position: {
      x: preset.target.x + dx * factor,
      y: preset.target.y + dy * factor,
      z: preset.target.z + dz * factor
    },
    target: { ...preset.target }
  };
}

function applyRedesignOverviewPreset(roomGroup: THREE.Group): void {
  roomGroup.updateMatrixWorld(true);

  // Entspricht der freigegebenen Blender-Gesamtansicht des Redesign-Raums.
  // Die Punkte liegen bereits im von glTF verwendeten Y-up-Koordinatensystem.
  const position = roomGroup.localToWorld(new THREE.Vector3(1.0, 2.25, 7.8));
  const target = roomGroup.localToWorld(new THREE.Vector3(0.75, 1.16, -1.08));
  if (import.meta.env.DEV) {
    // Repeatable browser close-ups of the real exported meshes and shaders.
    const views: Record<string, [number[], number[]]> = {
      mouse: [[0.95, 1.20, -1.15], [0.47, 0.90, -2.0]],
      lamp: [[-2.45, 1.4, -1.2], [-3.18, 1.0, -2.04]],
      instruments: [[1.85, 1.4, -0.85], [2.02, 1.1, -2.1]],
      chair: [[1.15, 1.55, 1.5], [0.1, 0.9, -0.48]],
      curtains: [[-0.55, 1.82, 1.25], [-3.315, 1.85, -1.10]]
    };
    const view = views[new URLSearchParams(window.location.search).get('inspect') ?? ''];
    if (view) {
      position.copy(roomGroup.localToWorld(new THREE.Vector3().fromArray(view[0])));
      target.copy(roomGroup.localToWorld(new THREE.Vector3().fromArray(view[1])));
    }
  }
  const preset: CameraPreset = {
    position: { x: position.x, y: position.y, z: position.z },
    target: { x: target.x, y: target.y, z: target.z }
  };

  copyCameraPreset(MENU_CAMERA_PRESET, preset);
  copyCameraPreset(PORTRAIT_MENU_CAMERA_PRESET, zoomCameraPreset(preset, 0.9));
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.overview, preset);
}

function applyRedesignLegalCornerPreset(roomGroup: THREE.Group): void {
  roomGroup.updateMatrixWorld(true);

  // Breite Eckperspektive des rechten Arbeitsplatzes. Die weit links liegende,
  // niedrige Blender-Pose (-0.30, -5.30, 1.15) blickt auf
  // (2.45, 0.45, 1.06). So bleiben Oszilloskop und Werkzeugwand vollstaendig
  // sichtbar, waehrend das Tisch-Endpanel den 3D-Drucker nicht mehr verdeckt.
  // glTF konvertiert Blender Z-up (x, y, z) nach Y-up (x, z, -y).
  const position = roomGroup.localToWorld(new THREE.Vector3(-0.30, 1.15, 5.30));
  const target = roomGroup.localToWorld(new THREE.Vector3(2.45, 1.06, -0.45));

  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.legalWall, {
    position: { x: position.x, y: position.y, z: position.z },
    target: { x: target.x, y: target.y, z: target.z }
  });
}

const REDESIGN_MONITOR_FOCUS_DISTANCE = 13;
const REDESIGN_MONITOR_EMBED_DISTANCE = 1.9;
const REDESIGN_CERTIFICATE_EMBED_DISTANCE = 1.9;
let redesignPictureFrameDetailPreset: CameraPreset | null = null;
const redesignCertificateEmbedPresets = new Map<string, CameraPreset>();

function getMonitorCameraPreset(anchor: THREE.Object3D, distance: number): CameraPreset {
  const target = anchor.getWorldPosition(new THREE.Vector3());
  const front = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(anchor.getWorldQuaternion(new THREE.Quaternion()))
    .normalize();
  const position = target.clone().addScaledVector(front, distance);

  return {
    position: { x: position.x, y: position.y, z: position.z },
    target: { x: target.x, y: target.y, z: target.z }
  };
}

function updateHotspotAnchor(id: Exclude<RoomFocusTargetId, 'overview'>, anchor: THREE.Vector3): void {
  ROOM_HOTSPOT_DEFINITIONS.find((hotspot) => hotspot.id === id)?.anchor.copy(anchor);
}

function applyRedesignMonitorNavigation(roomGroup: THREE.Group): void {
  roomGroup.updateMatrixWorld(true);

  const left = roomGroup.getObjectByName('Anchor_Monitor_01');
  const center = roomGroup.getObjectByName('Anchor_Monitor_02');
  const right = roomGroup.getObjectByName('Anchor_Monitor_03');

  if (!left || !center || !right) {
    return;
  }

  const leftCenter = left.getWorldPosition(new THREE.Vector3());
  const centerCenter = center.getWorldPosition(new THREE.Vector3());
  const rightCenter = right.getWorldPosition(new THREE.Vector3());

  // Die drei unsichtbaren HTML-Hitflächen liegen exakt über den realen
  // Bildschirmflächen. Die Anker bleiben nur als Legacy-Fallback erhalten.
  updateHotspotAnchor('performanceEmbed', leftCenter);
  updateHotspotAnchor('portfolioEmbed', centerCenter);
  updateHotspotAnchor('aboutEmbed', rightCenter);

  const leftFocus = getMonitorCameraPreset(left, REDESIGN_MONITOR_FOCUS_DISTANCE);
  const leftEmbed = getMonitorCameraPreset(left, REDESIGN_MONITOR_EMBED_DISTANCE);
  const centerFocus = getMonitorCameraPreset(center, REDESIGN_MONITOR_FOCUS_DISTANCE);
  const centerEmbed = getMonitorCameraPreset(center, REDESIGN_MONITOR_EMBED_DISTANCE);
  const rightFocus = getMonitorCameraPreset(right, REDESIGN_MONITOR_FOCUS_DISTANCE);
  const rightEmbed = getMonitorCameraPreset(right, REDESIGN_MONITOR_EMBED_DISTANCE);

  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.pictureFrame, leftFocus);
  redesignPictureFrameDetailPreset = leftEmbed;
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.performanceEmbed, leftEmbed);
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.workbench, centerFocus);
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.portfolioEmbed, centerEmbed);
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.aboutEmbed, rightEmbed);
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.comicScreen, rightFocus);
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.comicEmbed, rightEmbed);
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.horrorEmbed, rightEmbed);
  copyCameraPreset(ROOM_FOCUS_TARGET_PRESETS.tvSelect, rightEmbed);

  // Die acht bestehenden Leistungsnachweis-Ziele liegen als 4x2-Raster auf
  // der linken Monitorfläche. Dokumentlogik und IDs bleiben unverändert.
  const monitorRotation = left.getWorldQuaternion(new THREE.Quaternion());
  const horizontal = new THREE.Vector3(1, 0, 0).applyQuaternion(monitorRotation).normalize();
  const vertical = new THREE.Vector3(0, 1, 0).applyQuaternion(monitorRotation).normalize();
  const columns = [-3.25, -1.08, 1.08, 3.25];
  const rows = [1.25, -1.25];

  PICTURE_FRAME_ANCHORS.forEach((frame, index) => {
    const row = Math.floor(index / columns.length);
    const column = index % columns.length;
    frame.anchor
      .copy(leftCenter)
      .addScaledVector(horizontal, columns[column] ?? 0)
      .addScaledVector(vertical, rows[row] ?? 0);
  });
}

function applyRedesignCertificateNavigation(roomGroup: THREE.Group): void {
  roomGroup.updateMatrixWorld(true);
  redesignCertificateEmbedPresets.clear();

  for (const topic of CERTIFICATE_TOPIC_DEFINITIONS) {
    const anchor = roomGroup.getObjectByName(topic.anchorObjectName);
    if (!anchor) {
      continue;
    }

    redesignCertificateEmbedPresets.set(
      topic.id,
      getMonitorCameraPreset(anchor, REDESIGN_CERTIFICATE_EMBED_DISTANCE)
    );
  }
}
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
// Basispose für Desktop-Menü und Raumübersicht. Auf Mobilgeräten im Querformat
// verwendet getMenuCameraPreset() stattdessen die sichere, näher liegende
// Freikamera-Pose der Übersicht.
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
  // Zertifikats-Platzhalter — wird im Redesign dynamisch aus dem gewählten
  // Anchor_Certificate_* berechnet.
  certificateEmbed: {
    position: { x: -21.4, y: 7.0, z: 6.0 },
    target: { x: -28.4, y: 7.0, z: 6.0 }
  },
  // Öffentlicher Über-mich-Embed — fährt direkt in den rechten Monitor.
  aboutEmbed: {
    position: { x: 0, y: 9.8, z: -4 },
    target: { x: 0, y: 9.8, z: -10 }
  },
  // Comic-Film Display — Nahaufnahme des schwarzen Bildschirms über dem Schachbrett.
  comicScreen: {
    position: { x: 0, y: 9.8, z: 2 },
    target: { x: 0, y: 9.8, z: -10 }
  },
  // Comic-Film Embed — Kamera vollständig hinein in den Comic-Bildschirm.
  comicEmbed: {
    position: { x: 0, y: 9.8, z: -4 },
    target: { x: 0, y: 9.8, z: -10 }
  },
  // Horror-Film Embed — gleiche Kameraposition wie comicEmbed.
  horrorEmbed: {
    position: { x: 0, y: 9.8, z: -4 },
    target: { x: 0, y: 9.8, z: -10 }
  },
  // TV-Auswahl — gleiche Position wie comicEmbed (rein in den Bildschirm).
  tvSelect: {
    position: { x: 0, y: 9.8, z: -4 },
    target: { x: 0, y: 9.8, z: -10 }
  },
  // Vitrine — hinten-links im Raum.
  displayCase: {
    position: { x: -20.5, y: 4.5, z: 9.0 },
    target: { x: -24.9, y: 2.7, z: -8.0 }
  },
  // Rechtliche Wand — rechte Seite des Raums, frontal (wie Workbench-Muster).
  legalWall: {
    position: { x: -8.0, y: 3.5, z: 25.0 },
    target: { x: 4.0, y: 3.5, z: 25.0 }
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
  // Leistungsnachweise-Embed — fährt direkt in den linken Monitor.
  performanceEmbed: {
    position: { x: -21.4, y: 7.0, z: 6.0 },
    target: { x: -28.4, y: 7.0, z: 6.0 }
  },
  // Öffentlicher Portfolio-Platzhalter — fährt direkt in den mittleren Monitor.
  portfolioEmbed: {
    position: { x: -24.5, y: 3.22, z: 18.01 },
    target: { x: -26.27, y: 3.22, z: 18.01 }
  },
};

const ROOM_HOTSPOT_DEFINITIONS: ReadonlyArray<{
  anchor: THREE.Vector3;
  focusTarget: Exclude<RoomFocusTargetId, 'overview'>;
  id: Exclude<RoomFocusTargetId, 'overview'>;
  label: string;
  surfaceObjectName?: string;
}> = [
  {
    anchor: new THREE.Vector3(0.15, 4.5, 0.55),
    focusTarget: 'board',
    id: 'board',
    label: 'Schachbrett'
  },
  {
    anchor: new THREE.Vector3(0, 9.5, -4),
    focusTarget: 'aboutEmbed',
    id: 'aboutEmbed',
    label: 'Über mich',
    surfaceObjectName: 'mon_cctv_right'
  },
  {
    anchor: new THREE.Vector3(-25.15, 9.12, 4.51),
    focusTarget: 'performanceEmbed',
    id: 'performanceEmbed',
    label: 'Leistungsnachweise',
    surfaceObjectName: 'mon_cctv_left'
  },
  {
    anchor: new THREE.Vector3(-17.47, 6.5, 29.56),
    focusTarget: 'portfolioEmbed',
    id: 'portfolioEmbed',
    label: 'Portfolio',
    surfaceObjectName: 'Monitor_02_Screen'
  }
];

const CERTIFICATE_TOPIC_DEFINITIONS: ReadonlyArray<{
  anchorObjectName: string;
  id: string;
  label: string;
  surfaceObjectName: string;
}> = [
  { anchorObjectName: 'Anchor_Certificate_08', id: 'cs50', label: 'CS50', surfaceObjectName: 'Certificate_08_Paper' },
  { anchorObjectName: 'Anchor_Certificate_07', id: 'cisco', label: 'Cisco', surfaceObjectName: 'Certificate_07_Paper' },
  { anchorObjectName: 'Anchor_Certificate_06', id: 'tryhackme', label: 'TryHackMe', surfaceObjectName: 'Certificate_06_Paper' },
  { anchorObjectName: 'Anchor_Certificate_05', id: 'jetbrains', label: 'JetBrains', surfaceObjectName: 'Certificate_05_Paper' }
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

function createSemesterOneFrameTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 900;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, '#151515');
    background.addColorStop(1, '#050505');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const labelCenterX = canvas.width / 2 - 94;
    const labelOffsetY = -84;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 54px Segoe UI, sans-serif';
    ctx.fillText('SEMESTER', labelCenterX, 424 + labelOffsetY);
    ctx.font = '800 78px Segoe UI, sans-serif';
    ctx.fillText('1', labelCenterX, 528 + labelOffsetY);

  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function attachSemesterOneFrameTexture(roomRoot: THREE.Object3D, texture: THREE.CanvasTexture): void {
  const frameMaterial = new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color('#050505') },
      frameMap: { value: texture },
      yMax: { value: 5.98 },
      yMin: { value: 4.42 },
      zMax: { value: -4.10 },
      zMin: { value: -5.60 }
    },
    vertexShader: `
      varying vec3 vLocalPosition;

      void main() {
        vLocalPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform sampler2D frameMap;
      uniform float yMax;
      uniform float yMin;
      uniform float zMax;
      uniform float zMin;
      varying vec3 vLocalPosition;

      void main() {
        float inside =
          step(yMin, vLocalPosition.y) *
          step(vLocalPosition.y, yMax) *
          step(zMin, vLocalPosition.z) *
          step(vLocalPosition.z, zMax);

        vec2 uv = vec2(
          1.0 - ((vLocalPosition.z - zMin) / (zMax - zMin)),
          1.0 - ((vLocalPosition.y - yMin) / (yMax - yMin))
        );
        vec4 mapped = texture2D(frameMap, clamp(uv, 0.0, 1.0));
        vec3 color = mix(baseColor, mapped.rgb, inside);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  roomRoot.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node.name !== 'merged_cert_mat_back') return;
    node.material = frameMaterial;
  });
}

export function createBoardPreviewScene({
  container,
  onRoomAssetProgress,
  onRoomAssetReady,
  onStateChange,
  onSquareClick,
  pieces
}: CreateBoardPreviewSceneOptions): BoardPreviewApp {
  let isDisposed = false;
  let dirty = true;
  let frameLoop: DemandFrameLoop | undefined;
  function markDirty(): void {
    if (isDisposed) return;
    dirty = true;
    frameLoop?.request();
  }
  let currentPieces = pieces.map((piece) => ({ ...piece }));
  let loadedBoardFile: string | null = null;
  let loadedPieceModelFiles: string[] = [];
  let pieceAssetFallbacks: PieceAssetFallbackMap = {};
  let pieceAssetFiles: PieceAssetFileMap = {};
  let pieceAssetSet: PieceAssetSet = DEFAULT_PIECE_ASSET_SET;
  const stage = createStageScene(
    container,
    onStateChange,
    onRoomAssetProgress,
    onRoomAssetReady,
    onSquareClick,
    currentPieces,
    () => isDisposed,
    markDirty
  );
  // onChange-Throttle: Touch-Move feuert bei jedem Pixel — wir coalesce auf
  // den nächsten Animation-Frame damit syncPanels max. 1× pro Frame läuft.
  let lookAroundStateChangePending = false;
  const lookAround: LookAroundControls = createLookAroundControls(
    stage.renderer.domElement,
    () => {
      markDirty();
      if (!lookAroundStateChangePending) {
        lookAroundStateChangePending = true;
        requestAnimationFrame(() => {
          lookAroundStateChangePending = false;
          if (!isDisposed) onStateChange?.();
        });
      }
    }
  );
  const size = new THREE.Vector2();
  // Wiederverwendbarer Scratch-Vektor — vermeidet Pro-Frame-Vector3-Speicherung in Hotspot-Projektion.
  const _projScratch = new THREE.Vector3();
  const _surfaceBounds = new THREE.Box3();
  const _surfaceCorner = new THREE.Vector3();
  const clockState = { elapsedMs: 0 };
  let presentationMode: BoardPresentationStateInput['mode'] = 'board';
  let startFlowMode: StartFlowMode = 'menu';
  let startFlowFocusFromTarget: RoomFocusTargetId = 'overview';
  let startFlowFocusProgress = 1;
  let startFlowFocusTarget: RoomFocusTargetId = 'overview';
  let startFlowProgress = 0;
  let activePictureFrameDetailId = 'frame0';
  let activeCertificateTopicId = 'cs50';
  let roomCameraFree = false;
  let startFlowPendingMenuReturn = false;

  // Look-around state must exist before the initial camera pose is applied.
  // The menu is draggable now, so these values are read during the first
  // synchronous scene setup rather than only after entering the room.
  const _worldUp = new THREE.Vector3(0, 1, 0);
  const _lookAroundScratch = {
    pos: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    rotated: new THREE.Vector3(),
    lookTarget: new THREE.Vector3()
  };
  const LOOK_AROUND_TARGETS: ReadonlyArray<RoomFocusTargetId> = [
    'overview', 'displayCase', 'pictureFrame', 'workbench'
  ];
  let cameraExitSnapshot: CameraPreset | null = null;
  let lookAroundFadeStartMs = 0;
  const LOOK_AROUND_FADE_DURATION_MS = 900;

  let isPortrait = false;
  const measureStartup = new URLSearchParams(window.location.search).has('timing');
  const measurePasses = import.meta.env.DEV && new URLSearchParams(window.location.search).get('timing') === 'passes';
  let timingFrameId = 0;
  const profileRendering = import.meta.env.DEV && new URLSearchParams(window.location.search).has('profile');
  const requestedResolution = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('resolution') : null;
  const resolutionMode: ResolutionMode = requestedResolution === 'full' || requestedResolution === 'motion'
    || requestedResolution === 'reduced' || requestedResolution === 'reference'
    ? requestedResolution : 'adaptive';
  let presentationReady = false;
  let hasRenderedCameraPose = false;
  const renderedCameraPosition = new THREE.Vector3();
  const renderedCameraQuaternion = new THREE.Quaternion();
  const drawingBufferSize = new THREE.Vector2();
  let renderCssWidth = 1, renderCssHeight = 1, baseRenderDpr = 1;
  let appliedCssWidth = 0, appliedCssHeight = 0, appliedDpr = 0, appliedBaseDpr = 0;
  const gl = stage.renderer.getContext();
  const renderTiming = import.meta.env.DEV && measureStartup && gl instanceof WebGL2RenderingContext
    ? createRoomRenderTiming(gl, measurePasses ? 128 : 32) : null;
  const viewportLimits = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
  const maxTargetSize = Math.min(stage.renderer.capabilities.maxTextureSize, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number);
  const renderLimits = { width: Math.min(maxTargetSize, viewportLimits[0]), height: Math.min(maxTargetSize, viewportLimits[1]) };
  const resolution = createAdaptiveResolution(resolutionMode, (scale, reason) => {
    if (profileRendering) console.info('[room resolution]', JSON.stringify({ mode: resolutionMode, scale, reason }));
    markDirty();
  });

  function applyRenderSize(): boolean {
    const dpr = baseRenderDpr * resolution.getScale();
    // Collapsed panels can round the main or smaller transmission buffer to zero.
    // Wait for their next layout update instead of creating an invalid framebuffer.
    const bufferWidth = Math.floor(renderCssWidth * dpr);
    const bufferHeight = Math.floor(renderCssHeight * dpr);
    if (Math.floor(bufferWidth * stage.renderer.transmissionResolutionScale) < 1 ||
        Math.floor(bufferHeight * stage.renderer.transmissionResolutionScale) < 1) return false;
    if (renderCssWidth === appliedCssWidth && renderCssHeight === appliedCssHeight &&
        dpr === appliedDpr && baseRenderDpr === appliedBaseDpr) return true;
    // This path only changes render buffers. Layout/controls/camera projection
    // must not be reset when a camera animation changes resolution.
    stage.renderer.setDrawingBufferSize(renderCssWidth, renderCssHeight, dpr);
    stage.renderer.getDrawingBufferSize(drawingBufferSize);
    stage.bloom.setSize(drawingBufferSize.x, drawingBufferSize.y,
      Math.floor(renderCssWidth * baseRenderDpr), Math.floor(renderCssHeight * baseRenderDpr));
    appliedCssWidth = renderCssWidth;
    appliedCssHeight = renderCssHeight;
    appliedDpr = dpr;
    appliedBaseDpr = baseRenderDpr;
    if (profileRendering) console.info('[room buffer]', JSON.stringify({
      mode: resolutionMode, scale: resolution.getScale(), width: drawingBufferSize.x, height: drawingBufferSize.y
    }));
    return true;
  }

  let profileSteps = 0;
  let lastRenderProfile: Record<string, number | undefined> | null = null;
  frameLoop = createDemandFrameLoop(step, profileRendering ? () => {
    console.info('[room idle]', JSON.stringify({ steps: profileSteps, mode: startFlowMode, render: lastRenderProfile }));
  } : undefined);
  const handleVisibilityChange = (): void => {
    frameLoop?.setEnabled(!document.hidden);
    resolution.reset();
    hasRenderedCameraPose = false;
    if (!document.hidden) markDirty();
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  handleVisibilityChange();

  applyStartFlowCameraPose();
  syncStartFlowInteractionLock();

  const resize = (): void => {
    if (isDisposed) return;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const nextBaseDpr = getBaseRenderDpr(width, height, window.devicePixelRatio || 1, deviceTier, renderLimits);
    if (width !== renderCssWidth || height !== renderCssHeight || nextBaseDpr !== baseRenderDpr) {
      renderCssWidth = width;
      renderCssHeight = height;
      baseRenderDpr = nextBaseDpr;
      resolution.reset(true);
      hasRenderedCameraPose = false;
    }
    applyRenderSize();
    resizeCamera(stage.camera, width, height);
    isPortrait = stage.camera.aspect < 1;
    const isMobileLandscape = isMobileDevice && !isPortrait;
    stage.roomCameraControls.setPortraitMode(isPortrait);
    stage.roomCameraControls.setLandscapeLock(isMobileLandscape);
    // Keep the authored overview composition intact: no leftward look and
    // only a short rightward glance.  Wider movement exposes the outside of
    // the room model at the left/right canvas edges.
    lookAround.setAllowPitch(false);
    lookAround.setMaxYawLeft(0);
    lookAround.setMaxYawRight(
      isPortrait ? 3 : getAspectSafeOverviewRightYaw(stage.camera.aspect)
    );
    markDirty();
    // Hotspot-Positionen nach Resize neu berechnen — immer wenn roomExplore
    // aktiv ist, da alle 3D-projizierten Buttons (Übersicht + Bilderrahmen)
    // auf Canvas-Pixel-Koordinaten basieren und nach einem Resize falsch liegen.
    // requestAnimationFrame stellt sicher, dass onStateChange erst nach
    // vollständiger Initialisierung (preview-Rückgabe in game.ts) aufgerufen
    // wird und keinen synchronen ResizeObserver-Feedback-Loop auslöst.
    if (startFlowMode === 'roomExplore') {
      window.requestAnimationFrame(() => { if (!isDisposed) onStateChange?.(); });
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });

  resizeObserver.observe(container);
  resize();

  function step(deltaMs: number): boolean {
    if (isDisposed) return false;
    if (profileRendering) profileSteps += 1;
    clockState.elapsedMs += deltaMs;

    const seconds = clockState.elapsedMs / 1000;
    // Subtile Überkopf-Drift des Key-Lichts — hält das Board lebendig
    // ohne sichtbares Flimmern auf statischer Geometrie. Aktiv nur in boardFocus;
    // in Raum-Erkunden würde der bewegte Schatten irritieren.
    // Drift nur alle ~200ms (~5 Hz) aktualisieren statt 60 Hz —
    // visuell identisch aber verhindert ständige Shadow-Map-Neuberechnung.
    if (startFlowMode === 'boardFocus') {
      const newKX = -9 + Math.sin(seconds * 0.18) * 1.5;
      const newKZ =  5 + Math.cos(seconds * 0.13) * 1.5;
      const driftThreshold = 0.02;
      if (Math.abs(stage.lights.key.position.x - newKX) > driftThreshold ||
          Math.abs(stage.lights.key.position.z - newKZ) > driftThreshold) {
        stage.lights.key.position.x = newKX;
        stage.lights.key.position.z = newKZ;
        stage.renderer.shadowMap.needsUpdate = true;
        markDirty();
      }
    } else {
      const keyLightNeedsReset =
        Math.abs(stage.lights.key.position.x + 9) > 0.0001 ||
        Math.abs(stage.lights.key.position.z - 5) > 0.0001;
      if (keyLightNeedsReset) {
        stage.lights.key.position.x = -9;
        stage.lights.key.position.z = 5;
        stage.renderer.shadowMap.needsUpdate = true;
        markDirty();
      }
    }
    const piecesWereAnimating = stage.pieceLayer.getAnimationState().isAnimating;
    if (piecesWereAnimating) stage.pieceLayer.step(deltaMs);
    const piecesAreAnimating = piecesWereAnimating && stage.pieceLayer.getAnimationState().isAnimating;
    // Draw the final move/capture frame too: step can finish an animation and
    // remove its active flag while still changing the visible final pose.
    if (piecesWereAnimating) {
      markDirty();
    }
    // Combat-Kamera-Transitions melden true wenn sich die Pose geändert hat.
    if (stage.cameraController.step(deltaMs)) {
      markDirty();
    }
    stage.cctvScreen.tick(clockState.elapsedMs);
    const cameraLockChanged = syncCameraControlLock();
    applyStartFlowCameraPose();
    // Camera return can finish after the app's combat state has settled.
    // Publish the final unlock so controls do not retain a stale disabled state.
    if (cameraLockChanged) onStateChange?.();

    if (dirty) {
      dirty = false;
      render();
    }
    const cameraMode = stage.cameraController.getMode();
    // App transitions and room/look controls request their own frames through
    // markDirty. Only these scene-owned animations need a continuing loop.
    return startFlowMode === 'boardFocus' || piecesAreAnimating ||
      cameraMode === 'combatTransitionIn' || cameraMode === 'combatTransitionOut';
  }

  let profileFrames = 0;
  function render(): void {
    if (isDisposed) return;
    const cameraMoved = presentationReady && hasRenderedCameraPose &&
      (renderedCameraPosition.distanceToSquared(stage.camera.position) > 1e-10 ||
       1 - Math.abs(renderedCameraQuaternion.dot(stage.camera.quaternion)) > 1e-10);
    const cameraMode = stage.cameraController.getMode();
    const continuousCamera = startFlowMode === 'introTransition' || startFlowFocusProgress < 1 ||
      stage.roomCameraControls.isAnimating() || cameraMode === 'combatTransitionIn' || cameraMode === 'combatTransitionOut';
    resolution.observeCameraFrame(performance.now(), cameraMoved, continuousCamera && !document.hidden);
    if (!applyRenderSize()) return;
    const previousAutoReset = stage.renderer.info.autoReset;
    if (profileRendering) {
      stage.renderer.info.autoReset = false;
      stage.renderer.info.reset();
    }
    if (measurePasses && renderTiming) {
      // Pass queries replace the whole-frame query; elapsed queries cannot nest.
      stage.cctvScreen.renderToTarget(stage.scene, stage.renderer);
      profileRoomPasses(stage.renderer, renderTiming, {
        moving: cameraMoved, continuous: continuousCamera && !document.hidden,
        width: stage.renderer.domElement.width, height: stage.renderer.domElement.height,
        frameId: ++timingFrameId
      }, onPass => stage.bloom.render(stage.scene, stage.camera, onPass));
    } else {
      renderTiming?.beginFrame({
        moving: cameraMoved, continuous: continuousCamera && !document.hidden,
        width: stage.renderer.domElement.width, height: stage.renderer.domElement.height
      });
      try {
        // Current monitor surfaces are static; this hook remains for optional feeds.
        stage.cctvScreen.renderToTarget(stage.scene, stage.renderer);
        stage.bloom.render(stage.scene, stage.camera);
      } finally {
        renderTiming?.endFrame();
      }
    }
    renderedCameraPosition.copy(stage.camera.position);
    renderedCameraQuaternion.copy(stage.camera.quaternion);
    hasRenderedCameraPose = true;
    if (profileRendering) {
      lastRenderProfile = {
        calls: stage.renderer.info.render.calls, triangles: stage.renderer.info.render.triangles,
        textures: stage.renderer.info.memory.textures, programs: stage.renderer.info.programs?.length,
        transmissionScale: stage.renderer.transmissionResolutionScale,
        width: stage.renderer.domElement.width, height: stage.renderer.domElement.height
      };
      if (profileFrames++ % 60 === 0) console.info('[room render]', JSON.stringify(lastRenderProfile));
      stage.renderer.info.autoReset = previousAutoReset;
    }
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
        certificateFrames: getCertificateFrameSnapshots(),
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

  function syncCameraControlLock(): boolean {
    stage.interaction.setHighlightsVisible(presentationMode !== 'combat');
    const cameraMode = stage.cameraController.getMode();
    return stage.boardCameraControls.setLocked(startFlowMode !== 'boardFocus' || presentationMode === 'combat' || cameraMode !== 'board');
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

    // Look-around: horizontal per left-mouse drag or one-finger touch while
    // the camera position stays fixed. The main menu remains completely
    // static; interaction starts only in the existing stable room views:
    //   Übersicht (Raum erkunden), Vitrine (Zertifikate),
    //   Bilderrahmen (Leistungsnachweise), Werkbank
    // Deaktiviert in: menu, portfolioEmbed (iframe), pictureFrameDetail
    // (Nahaufnahme), boardFocus (Board-Kamera übernimmt) und introTransition.
    // Muss vollständig am Ziel angekommen sein (nicht unter Transition).
    // During the exit fade the offset is still rendered, but interaction is
    // locked so no new gesture can start while the camera is moving.
    const isStableRoomView =
      startFlowMode === 'roomExplore' &&
      LOOK_AROUND_TARGETS.includes(startFlowFocusTarget) &&
      startFlowFocusProgress >= 1;
    const isLookAroundView = isStableRoomView;
    const isLookAroundFading = lookAroundFadeStartMs > 0;
    const canInteractWithLookAround =
      isLookAroundView &&
      !startFlowPendingMenuReturn &&
      !isLookAroundFading;

    lookAround.setEnabled(canInteractWithLookAround);

    if (isLookAroundView || isLookAroundFading) {
      let { yaw, pitch } = lookAround.getOffset();
      // Sanftes Ausblenden des Look-Around während der Exit-Animation
      if (isLookAroundFading) {
        const fadeElapsed = performance.now() - lookAroundFadeStartMs;
        const fadeT = Math.min(fadeElapsed / LOOK_AROUND_FADE_DURATION_MS, 1);
        const fadeFactor = 1 - fadeT; // 1 → 0
        yaw *= fadeFactor;
        pitch *= fadeFactor;
      }
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
        stage.camera.lookAt(_lookAroundScratch.lookTarget.copy(_lookAroundScratch.pos).add(_lookAroundScratch.rotated));
      }
    }
  }

  function getMenuCameraPreset(): CameraPreset {
    if (isPortrait) {
      return PORTRAIT_MENU_CAMERA_PRESET;
    }

    // Das Hauptmenü teilt auf Mobile/Tablet im Querformat exakt die sichere
    // Endpose von "Raum erkunden". So gibt es beim Start keinen Zoom und die
    // Modellhülle bleibt außerhalb des Sichtfelds.
    return isMobileDevice
      ? computeFreeCameraEntryPreset(ROOM_FOCUS_TARGET_PRESETS.overview, false, true)
      : MENU_CAMERA_PRESET;
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
      return getMenuCameraPreset();
    }

    if (startFlowMode === 'introTransition') {
      const menuPreset = getMenuCameraPreset();
      const overviewPreset = isMobileDevice && !isPortrait
        ? computeFreeCameraEntryPreset(getRoomFocusTargetPreset('overview'), false, true)
        : getRoomFocusTargetPreset('overview');
      return lerpCameraPreset(menuPreset, overviewPreset, easeInOutSmootherstep(startFlowProgress));
    }

    // Startpunkt der Transition: Kamera-Snapshot (wo die Kamera tatsächlich war)
    // oder normales Preset als Fallback.
    const fromPreset = cameraExitSnapshot !== null
      ? cameraExitSnapshot
      : getRoomFocusTargetPreset(startFlowFocusFromTarget);
    // Wenn zum overview übergegangen wird aktiviert sich die Freikamera in der
    // gezoomten Ruheposition. Das dient als toPreset damit die Interpolation
    // genau dort endet und kein Sprung auftritt wenn die Freikamera übernimmt.
    // Ausnahme: Bei der Rückkehr zum Menü landet die Kamera in dessen eigener
    // Pose: Desktop auf dem Basisradius, Mobile/Tablet im Querformat in der
    // identischen sicheren Übersichtspose.
    const toPreset = startFlowFocusTarget === 'overview'
      ? (startFlowPendingMenuReturn
          ? getMenuCameraPreset()
          : computeFreeCameraEntryPreset(
              getRoomFocusTargetPreset('overview'),
              isPortrait,
              isMobileDevice && !isPortrait
            ))
      : getRoomFocusTargetPreset(startFlowFocusTarget);

    if (startFlowFocusFromTarget === startFlowFocusTarget || startFlowFocusProgress >= 1) {
      // Transition abgeschlossen — Snapshot verbraucht.
      cameraExitSnapshot = null;
      return toPreset;
    }

    const t = easeInOutSmootherstep(startFlowFocusProgress);
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
      const projected = hotspot.surfaceObjectName
        ? projectRoomSurface(hotspot.surfaceObjectName, hotspot.anchor)
        : {
            ...projectRoomHotspotAnchor(hotspot.anchor),
            screenHeight: 0,
            screenWidth: 0
          };
      return {
        focusTarget: hotspot.focusTarget,
        id: hotspot.id,
        interactionMode: hotspot.surfaceObjectName ? 'surface' : 'marker',
        isFocused: startFlowFocusTarget === hotspot.focusTarget,
        isVisible: projected.isVisible,
        label: hotspot.label,
        screenHeight: projected.screenHeight,
        screenWidth: projected.screenWidth,
        screenX: projected.screenX,
        screenY: projected.screenY
      };
    });
  }

  function getCertificateFrameSnapshots(): BoardPreviewSnapshot['roomExplore']['certificateFrames'] {
    if (
      startFlowMode !== 'roomExplore' ||
      startFlowFocusTarget !== 'overview' ||
      startFlowFocusProgress < 1
    ) {
      return [];
    }

    return CERTIFICATE_TOPIC_DEFINITIONS.map((topic) => {
      const projected = projectRoomSurface(topic.surfaceObjectName);
      return {
        id: topic.id,
        isVisible: projected.isVisible,
        label: topic.label,
        screenHeight: projected.screenHeight,
        screenWidth: projected.screenWidth,
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

  function projectRoomSurface(
    objectName: string,
    fallbackAnchor = new THREE.Vector3()
  ): {
    isVisible: boolean;
    screenHeight: number;
    screenWidth: number;
    screenX: number;
    screenY: number;
  } {
    const object = stage.roomGroup.getObjectByName(objectName);
    if (!object) {
      const fallback = projectRoomHotspotAnchor(fallbackAnchor);
      return { ...fallback, screenHeight: 0, screenWidth: 0 };
    }

    _surfaceBounds.setFromObject(object);
    if (_surfaceBounds.isEmpty()) {
      const fallback = projectRoomHotspotAnchor(fallbackAnchor);
      return { ...fallback, screenHeight: 0, screenWidth: 0 };
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < 8; index += 1) {
      _surfaceCorner
        .set(
          index & 1 ? _surfaceBounds.max.x : _surfaceBounds.min.x,
          index & 2 ? _surfaceBounds.max.y : _surfaceBounds.min.y,
          index & 4 ? _surfaceBounds.max.z : _surfaceBounds.min.z
        )
        .project(stage.camera);
      const x = (_surfaceCorner.x * 0.5 + 0.5) * size.x;
      const y = (-_surfaceCorner.y * 0.5 + 0.5) * size.y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const center = _surfaceBounds.getCenter(_projScratch).project(stage.camera);
    return {
      isVisible:
        center.z >= -1 &&
        center.z <= 1 &&
        maxX >= 0 &&
        minX <= size.x &&
        maxY >= 0 &&
        minY <= size.y,
      screenHeight: Math.max(0, maxY - minY),
      screenWidth: Math.max(0, maxX - minX),
      screenX: (minX + maxX) / 2,
      screenY: (minY + maxY) / 2
    };
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
      markDirty();
      onStateChange?.();
    },
    applyPieceAssets: (assets) => {
      loadedPieceModelFiles = [...assets.loadedPieceFiles];
      pieceAssetFallbacks = { ...assets.pieceAssetFallbacks };
      pieceAssetFiles = { ...assets.pieceAssetFiles };
      pieceAssetSet = assets.pieceAssetSet;
      stage.pieceLayer.setPieceAssets(assets.pieceTemplates, currentPieces);
      markDirty();
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
      markDirty();
      onStateChange?.();
    },
    dispose: () => {
      if (isDisposed) return;
      isDisposed = true;
      frameLoop?.dispose();
      resolution.dispose();
      renderTiming?.dispose();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      stage.boardCameraControls.dispose();
      stage.roomCameraControls.dispose();
      stage.interaction.dispose();
      stage.board.dispose();
      stage.pieceLayer.dispose();
      stage.bloom.dispose();
      stage.roomQuality.dispose();
      stage.disposeRoomResources();
      lookAround.dispose();
      stage.cctvScreen.dispose();
      stage.renderer.dispose();
      container.innerHTML = '';
    },
    getSnapshot,
    prepareInitialRender: async (onProgress) => {
      // assetsReady is a readiness signal. A destroyed instance must never
      // resolve it and let an old continuation dismiss a new instance's intro.
      const cancelled = (): Promise<void> => new Promise(() => {});
      if (isDisposed) return cancelled();
      onProgress?.(0.08);
      if (measureStartup) performance.mark('portfolio:warmup-start');

      try {
        await stage.renderer.compileAsync(stage.scene, stage.camera);
      } catch {
        if (isDisposed) return cancelled();
        stage.renderer.compile(stage.scene, stage.camera);
      }

      if (isDisposed) return cancelled();
      onProgress?.(0.78);
      if (measureStartup) performance.mark('portfolio:shaders-ready');
      dirty = false;
      render();

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });
      if (isDisposed) return cancelled();
      presentationReady = true;
      if (measureStartup) performance.mark('portfolio:room-ready');
      resolution.reset();
      if (profileRendering) console.info('[room ready render]', JSON.stringify(lastRenderProfile));
      onProgress?.(1);
    },
    resetCameraState: () => {
      stage.boardCameraControls.reset();
      stage.cameraController.reset();
      syncCameraControlLock();
      markDirty();
      onStateChange?.();
    },
    requestLookAroundReset: (onComplete: () => void) => {
      if (lookAround.getOffset().yaw === 0 && lookAround.getOffset().pitch === 0) {
        onComplete();
        return;
      }
      lookAround.animateReset(() => {
        markDirty();
        onComplete();
      });
    },
    resetPresentationState: () => {
      presentationMode = 'board';
      stage.pieceLayer.clearCombatPresentation();
      // Board-Orbit-Position bewahren — nur Combat-Kamera zurücksetzen.
      // boardCameraControls.reset() wird NUR bei explizitem "Kamera zentrieren" aufgerufen.
      stage.cameraController.reset();
      syncCameraControlLock();
      markDirty();
      onStateChange?.();
    },
    renderGameToText,
    syncStartFlowState: (nextState) => {
      const previousFocusProgress = startFlowFocusProgress;
      const previousPendingMenuReturn = startFlowPendingMenuReturn;
      const previousPictureFrameDetailId = activePictureFrameDetailId;
      const previousCertificateTopicId = activeCertificateTopicId;
      startFlowFocusFromTarget = nextState.focusFromTarget;
      startFlowFocusProgress = THREE.MathUtils.clamp(nextState.focusProgress, 0, 1);
      // Beim Verlassen eines Fokus-Ziels oder Mode-Wechsel: aktuelle Kamera-Position
      // als Snapshot sichern, damit die Transition genau von dort startet wo die
      // Kamera gerade steht — egal ob Look-Around, Freikamera oder Standard-Preset.
      // Ausnahme: Rückkehr zum Menü mit aktiver Freikamera — dort übernimmt
      // die animateExit den Fade-Out des Look-Around.
      const focusTargetChanged = startFlowFocusTarget !== nextState.focusTarget;
      const modeChanged = startFlowMode !== nextState.mode;
      const isMenuReturnFromFreeCamera = roomCameraFree && nextState.mode === 'menu';
      // Desktop menu and overview share the base preset; Mobile/Tablet in
      // landscape shares the final free-camera pose. Preserve the user's
      // horizontal look offset when this mode-only switch has no camera move.
      const isMenuToOverviewEntry =
        startFlowMode === 'menu' &&
        nextState.mode === 'roomExplore' &&
        startFlowFocusTarget === 'overview' &&
        nextState.focusTarget === 'overview';
      if (
        (focusTargetChanged || modeChanged) &&
        !isMenuReturnFromFreeCamera &&
        !isMenuToOverviewEntry
      ) {
        // Snapshot der aktuellen Kamera-Position + Blickrichtung.
        // Target-Distanz vom Basis-Preset übernehmen damit die Lerp-Interpolation
        // keine verzerrten Winkel erzeugt (sonst wäre der Snapshot-Target nur 1 Unit
        // entfernt während das Ziel-Preset 10+ Units hat).
        const camPos = stage.camera.position;
        const camDir = new THREE.Vector3();
        stage.camera.getWorldDirection(camDir);
        const basePreset = getRoomFocusTargetPreset(startFlowFocusTarget);
        const baseDist = Math.sqrt(
          (basePreset.target.x - basePreset.position.x) ** 2 +
          (basePreset.target.y - basePreset.position.y) ** 2 +
          (basePreset.target.z - basePreset.position.z) ** 2
        );
        const d = Math.max(baseDist, 1);
        cameraExitSnapshot = {
          position: { x: camPos.x, y: camPos.y, z: camPos.z },
          target: { x: camPos.x + camDir.x * d, y: camPos.y + camDir.y * d, z: camPos.z + camDir.z * d }
        };
        lookAround.reset();
      }
      startFlowFocusTarget = nextState.focusTarget;
      startFlowMode = nextState.mode;
      startFlowProgress = THREE.MathUtils.clamp(nextState.progress, 0, 1);
      startFlowPendingMenuReturn = nextState.pendingMenuReturn ?? false;
      if (nextState.pictureFrameDetailId !== undefined) {
        activePictureFrameDetailId = nextState.pictureFrameDetailId;
      }
      if (nextState.certificateTopicId !== undefined) {
        activeCertificateTopicId = nextState.certificateTopicId;
      }
      const focusTransitionReachedEndpoint =
        previousFocusProgress < 1 && startFlowFocusProgress >= 1;
      const shellStateChanged =
        focusTargetChanged ||
        modeChanged ||
        focusTransitionReachedEndpoint ||
        previousPendingMenuReturn !== startFlowPendingMenuReturn ||
        previousPictureFrameDetailId !== activePictureFrameDetailId ||
        previousCertificateTopicId !== activeCertificateTopicId;

      // Nur der linke Hauptmonitor übernimmt während der Leistungsnachweis-Fahrt
      // die warme Seitenfarbe. Beim Zurückfahren blendet er wieder zu Schwarz,
      // während alle übrigen Anzeigen unverändert dunkel bleiben.
      let performancePreviewMix = 0;
      if (startFlowFocusTarget === 'performanceEmbed') {
        performancePreviewMix = THREE.MathUtils.clamp(startFlowFocusProgress / 0.18, 0, 1);
      } else if (startFlowFocusFromTarget === 'performanceEmbed' && startFlowFocusProgress < 1) {
        performancePreviewMix = THREE.MathUtils.clamp(1 - startFlowFocusProgress / 0.35, 0, 1);
      }
      stage.cctvScreen.setPerformancePreviewMix(performancePreviewMix);

      let aboutPreviewMix = 0;
      if (startFlowFocusTarget === 'aboutEmbed') {
        aboutPreviewMix = THREE.MathUtils.clamp(startFlowFocusProgress / 0.18, 0, 1);
      } else if (startFlowFocusFromTarget === 'aboutEmbed' && startFlowFocusProgress < 1) {
        aboutPreviewMix = THREE.MathUtils.clamp(1 - startFlowFocusProgress / 0.35, 0, 1);
      }
      stage.cctvScreen.setAboutPreviewMix(aboutPreviewMix);

      let portfolioPreviewMix = 0;
      if (startFlowFocusTarget === 'portfolioEmbed') {
        portfolioPreviewMix = THREE.MathUtils.clamp(startFlowFocusProgress / 0.18, 0, 1);
      } else if (startFlowFocusFromTarget === 'portfolioEmbed' && startFlowFocusProgress < 1) {
        portfolioPreviewMix = THREE.MathUtils.clamp(1 - startFlowFocusProgress / 0.35, 0, 1);
      }
      stage.cctvScreen.setPortfolioPreviewMix(portfolioPreviewMix);

      // Engine-Figuren immer sichtbar — sie ersetzen die statischen Raum-Figuren
      // und sind nur in boardFocus interaktiv (via boardInteraction.setEnabled).
      const isBoardFocus = startFlowMode === 'boardFocus';
      stage.pieceLayer.group.visible = true;

      // Statische GLB-Raum-Figuren permanent versteckt — Engine-Figuren übernehmen.
      for (const node of stage.roomPieceNodes) {
        if (node.visible) {
          node.visible = false;
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
        cameraExitSnapshot = null;
        // Nur auf Desktop den Eingangs-Zoom spielen. Auf mobilen Geräten im
        // Querformat muss die Übersicht direkt in ihrer sicheren Endpose
        // erscheinen: Der weit entfernte Start-Radius würde dort die
        // Raumbegrenzung am rechten Rand sichtbar machen. Hochformat bleibt
        // durch das bestehende Drehen-Overlay ohnehin gesperrt.
        // Wenn von einem Fokus-Ziel zurück kommt hat die Transition die Kamera
        // bereits bewegt; wir landen in der gezoomten Position ohne zweite Animation.
        if (startFlowFocusFromTarget === 'overview' && !(isMobileDevice && !isPortrait)) {
          stage.roomCameraControls.startEntranceAnimation();
        }
        stage.roomCameraControls.setEnabled(true);
        roomCameraFree = true;
      } else if (!shouldBeFree && roomCameraFree) {
        stage.roomCameraControls.setEnabled(false);
        if (startFlowMode === 'menu' && isMobileDevice && !isPortrait) {
          // Das Mobile-Landscape-Menü nutzt dieselbe Endpose wie die
          // Raumübersicht. Daher beim Zurückkehren weder herauszoomen noch
          // danach wieder hineinspringen.
          roomCameraFree = false;
          lookAroundFadeStartMs = 0;
          lookAround.reset();
        } else if (startFlowMode === 'menu') {
          // Zurück zum Menü: animiert das Zoom-Out damit die Kamera nicht springt.
          // syncStartFlowState wird hier nicht wieder in enger Schleife aufgerufen,
          // deshalb feuert der animateExit-Callback zuverlässig.
          // Starte Look-Around-Fade-Out parallel zur Zoom-Exit-Animation
          lookAroundFadeStartMs = performance.now();
          stage.roomCameraControls.animateExit(() => {
            roomCameraFree = false;
            lookAroundFadeStartMs = 0;
            lookAround.reset();
          });
        } else {
          // Navigation zu Fokus-Ziel: cameraExitSnapshot wurde bereits oben erfasst.
          roomCameraFree = false;
        }
      }

      markDirty();
      // Controls and hotspots are hidden throughout a focus transition. Rebuilding
      // their complete DOM on every camera frame caused avoidable layout/GC work;
      // the shell only needs synchronization at state changes and arrival.
      if (shellStateChanged) {
        syncCameraControlLock();
        syncStartFlowInteractionLock();
        if (startFlowMode === 'boardFocus') {
          applyCameraPreset(stage.camera, stage.boardCameraControls.getPose());
        } else {
          applyStartFlowCameraPose();
        }
        onStateChange?.();
      }
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
      markDirty();
      onStateChange?.();
    },
    syncInteractionState: (nextState) => {
      stage.interaction.setHighlightState(nextState);
      markDirty();
      onStateChange?.();
    },
    syncPieces: (piecesToRender, options) => {
      currentPieces = piecesToRender.map((piece) => ({ ...piece }));
      stage.pieceLayer.syncPieces(currentPieces, options);
      stage.renderer.shadowMap.needsUpdate = true;
      markDirty();
      onStateChange?.();
    }
  };

  function getRoomFocusTargetPreset(target: RoomFocusTargetId): CameraPreset {
    if (target === 'board') {
      return stage.boardCameraControls.getPose();
    }

    if (target === 'certificateEmbed') {
      return (
        redesignCertificateEmbedPresets.get(activeCertificateTopicId) ??
        ROOM_FOCUS_TARGET_PRESETS.certificateEmbed
      );
    }

    if (target === 'pictureFrameDetail' && redesignPictureFrameDetailPreset) {
      return redesignPictureFrameDetailPreset;
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
  onRoomAssetProgress: ((progress: number) => void) | undefined,
  onRoomAssetReady: (() => void) | undefined,
  onSquareClick: ((square: BoardSquare) => void) | undefined,
  pieces: ChessPieceState[],
  isDisposed: () => boolean,
  onDirty?: () => void
): StageScene {
  const scene = new THREE.Scene();
  // Fog kalibriert für overview-Kamera bei Z=68 schaut auf Raum-Mitte Z≈9.
  // Near=80 hält alles im Raum scharf (Rückwand ist ~81 Units entfernt);
  // far=150 lässt Geometrie sanft verblassen jenseits des Far-Clips.
  // Board-Fokus nutzt viel kürzere Kamera-Abstände deshalb Fog ist unsichtbar dort.
  scene.fog = new THREE.Fog('#0d0d18', 80, 150);

  // Die Hauptszene wird in ein eigenes, nicht-multisampletes Bloom-Target
  // gerendert. Context-MSAA würde daher nur das abschließende Vollbild-Quad
  // abtasten und bringt dort keinen sichtbaren Kantenglättungsgewinn.
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
  // Transmissive Lampen-/Fenstergläser benötigen intern einen zusätzlichen
  // Szenenpass. Eine kleinere Auflösung spart dort viele Samples, ohne die
  // eigentliche Raumdarstellung oder Materialparameter zu verändern.
  const referenceGlass = import.meta.env.DEV && new URLSearchParams(window.location.search).get('glass') === 'reference';
  renderer.transmissionResolutionScale = referenceGlass
    ? (deviceTier === 'high' ? 0.5 : 0.35)
    : (deviceTier === 'high' ? 0.35 : 0.25);
  // outputColorSpace + toneMapping werden in BloomEffect's Composite
  // Shader behandelt (ACESFilmic + sRGB Gamma). Wir setzen NoToneMapping auf dem Renderer
  // deshalb wendet er keine doppelte Tone-Mapping an beim Rendern zum Scene RT.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap ist veraltet in r183 — THREE fällt zurück auf PCFShadowMap.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Shadow-Map nicht jeden Frame neu berechnen — nur bei explizitem needsUpdate = true.
  // Das spart erheblich GPU-Zeit wenn sich die Lichtposition nicht ändert.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;  // initiale Berechnung
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
  const roomQuality = createRoomQualityController(renderer);
  const bloom = createBloomEffect(renderer, {
    threshold: 0.90,  // höherer Threshold → weniger Pixel qualifizieren sich
    strength:  0.25,  // schwächerer additiver Bloom-Anteil
    blurScale: 1.5,   // engerer Glow-Radius
    exposure:  1.50
  });
  // Pose-/Interaction-Änderungen markieren die Szene als dirty statt direkt zu rendern.
  // Der nächste rAF-Frame in step() erledigt den Render.
  function onPoseChangeDirty(): void {
    onDirty?.();
    onStateChange?.();
  }
  const boardCameraControls = createBoardCameraControls({
    domElement: renderer.domElement,
    onPoseChange: (preset) => {
      cameraController.setInspectPose(preset);
      onPoseChangeDirty();
    }
  });
  const roomCameraControls = createRoomCameraControls({
    domElement: renderer.domElement,
    onPoseChange: (preset) => {
      // Sofort anwenden für responsiven Feedback; applyStartFlowCameraPose
      // wendet es auch jeden Frame an während roomCameraFree wahr ist.
      camera.position.set(preset.position.x, preset.position.y, preset.position.z);
      camera.lookAt(preset.target.x, preset.target.y, preset.target.z);
      onPoseChangeDirty();
    }
  });
  const board = createChessboard();
  const pieceLayer = createPieceLayer(pieces);
  const interaction = createBoardInteraction({
    board,
    camera,
    domElement: renderer.domElement,
    onChange: () => {
      onPoseChangeDirty();
    },
    onSquareClick,
    scene,
    surfaceY: BOARD_SURFACE_Y
  });

  scene.add(lights.group);
  scene.add(board.group);
  scene.add(pieceLayer.group);
  const semesterOnePreviewTexture = createSemesterOneFrameTexture(renderer);

  // PMREM Umwelt-Kartierung auf metallische Oberflächen anwenden.
  // Niedriges Sigma (0.04) behält scharfe Reflexionen auf polierten Oberflächen.
  // environmentIntensity bleibt niedrig damit Reflexionen Glanz hinzufügen ohne
  // die dunkle Cyber-Atmosphäre auszuwaschen.
  const roomEnvironment = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(roomEnvironment, 0.04);
  scene.environment = environmentTarget.texture;
  roomEnvironment.dispose();
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
  let disposeRoomModel: (() => void) | undefined;
  let disposeRoomBatches: (() => void) | undefined;
  let roomModelProgress = 0;
  let roomLightMapProgress = 0;
  const reportRoomAssetProgress = (): void => {
    if (!isDisposed()) onRoomAssetProgress?.(roomModelProgress * 0.5 + roomLightMapProgress * 0.5);
  };

  onRoomAssetProgress?.(0);

  void loadRoomPresentationAssets({
    skipRefined: import.meta.env.DEV && new URLSearchParams(window.location.search).get('room') === 'original',
    isCancelled: isDisposed,
    onModelProgress: progress => {
      roomModelProgress = Math.max(roomModelProgress, progress);
      reportRoomAssetProgress();
    },
    onLightMapProgress: progress => {
      roomLightMapProgress = Math.max(roomLightMapProgress, progress);
      reportRoomAssetProgress();
    }
  }).then(pair => {
    if (!pair) return;
    const { room, lightMap, disposeModel } = pair;
    let { displayLut } = pair;
    if (isDisposed()) {
      lightMap?.dispose();
      displayLut?.dispose();
      disposeModel();
      return;
    }
    let unclaimedLightMap = lightMap;
    disposeRoomModel = disposeModel;
    try {
      const calibration = resolveRoomCalibration(room);
      roomGroup.scale.setScalar(calibration.scale);
      roomGroup.position.copy(calibration.offset);
      const authoredScale = Number(room.userData.room_lightmap_scale);
      const authoredLighting = Number.isFinite(authoredScale) && authoredScale > 0;
      const authoredMultiplierPower = room.userData.room_lightmap_multiplier_power === 2 ? 2 : 1;

      for (const child of room.children.slice()) {
        roomGroup.add(child);
      }

      roomGroup.updateMatrixWorld(true);
      if (calibration.isRedesign) {
        applyRedesignOverviewPreset(roomGroup);
        applyRedesignLegalCornerPreset(roomGroup);
        applyRedesignMonitorNavigation(roomGroup);
        applyRedesignCertificateNavigation(roomGroup);
        lights.applyRoomRedesignProfile(roomGroup);
        scene.background = new THREE.Color('#01040b');
        scene.fog = new THREE.Fog('#01040b', 80, 150);
        scene.environmentIntensity = 0.05;

        if (lightMap) {
          // apply() takes ownership before configuring individual materials,
          // including when the model has no eligible lightmapped meshes.
          unclaimedLightMap = null;
          const lightmappedMeshes = roomQuality.apply(roomGroup, lightMap, authoredLighting
            ? { scale: authoredScale, multiplierPower: authoredMultiplierPower, environment: scene.environment } : undefined);
          if (lightmappedMeshes > 0) {
            lights.applyBakedRoomProfile(authoredLighting);
            if (authoredLighting) {
              bloom.setExposure(2 ** -0.2);
              bloom.setDisplayGrade(eveningProfile.browserDisplay.exposureEV, eveningProfile.browserDisplay.whiteBalance);
              if (displayLut) {
                displayLut.colorSpace = THREE.NoColorSpace;
                displayLut.flipY = false;
                displayLut.minFilter = THREE.LinearFilter;
                displayLut.magFilter = THREE.LinearFilter;
                displayLut.generateMipmaps = false;
                bloom.setDisplayLut(displayLut);
                displayLut = null; // Bloom owns the texture from this point on.
              }
            }
            if (import.meta.env.DEV) console.info('[room lighting]', JSON.stringify({
              authoredLighting, lightmappedMeshes, lightmapScale: authoredScale || null,
              lightmapMultiplierPower: authoredMultiplierPower,
              meshCount: roomGroup.getObjectsByProperty('isMesh', true).length
            }));
          }
        }
      }

      roomGroup.traverse((node) => {
        if (ROOM_PIECE_PATTERN.test(node.name)) {
          roomPieceNodes.push(node);
          node.visible = false;
        }
      });
      cctvScreen.attach(roomGroup);
      attachSemesterOneFrameTexture(roomGroup, semesterOnePreviewTexture);
      const mergeDisabled = import.meta.env.DEV && new URLSearchParams(window.location.search).get('roomMerge') === 'off';
      if (room.userData.roomAssetFile === ROOM_REFINED_MODEL_FILE && !mergeDisabled) {
        // Material overrides and individually hidden GLB pieces must be final first.
        try {
          const batches = createRoomStaticBatches(roomGroup);
          disposeRoomBatches = batches.dispose;
          if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('profile')) {
            console.info('[room batches]', JSON.stringify(batches.stats));
          }
        } catch (error) {
          // The helper restores source visibility if preparation fails.
          console.warn('Room batching unavailable; using individual meshes', error);
        }
      }
      renderer.shadowMap.needsUpdate = true;
      onDirty?.();
      onStateChange?.();
    } finally {
      // Release resources not consumed by the controllers, including if scene
      // setup throws before the corresponding ownership transfer.
      unclaimedLightMap?.dispose();
      displayLut?.dispose();
    }
  }).catch(error => {
    if (!isDisposed()) console.warn('Room initialization failed', error);
  }).finally(() => {
    if (isDisposed()) return;
    onRoomAssetProgress?.(1);
    onRoomAssetReady?.();
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
    roomGroup,
    roomPieceNodes,
    roomQuality,
    disposeRoomResources: () => {
      disposeRoomBatches?.();
      disposeRoomBatches = undefined;
      disposeRoomModel?.();
      disposeRoomModel = undefined;
      semesterOnePreviewTexture.dispose();
      environmentTarget.dispose();
      scene.environment = null;
      roomGroup.clear();
    },
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

function easeInOutSmootherstep(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const OVERVIEW_FULL_RIGHT_YAW_ASPECT = 1.5;
const OVERVIEW_ZERO_RIGHT_YAW_ASPECT = 1.875;
const OVERVIEW_MAX_RIGHT_YAW_DEGREES = 4.5;

function getAspectSafeOverviewRightYaw(aspect: number): number {
  if (aspect <= OVERVIEW_FULL_RIGHT_YAW_ASPECT) {
    return OVERVIEW_MAX_RIGHT_YAW_DEGREES;
  }

  const normalizedAspect = THREE.MathUtils.clamp(
    (aspect - OVERVIEW_FULL_RIGHT_YAW_ASPECT) /
      (OVERVIEW_ZERO_RIGHT_YAW_ASPECT - OVERVIEW_FULL_RIGHT_YAW_ASPECT),
    0,
    1
  );
  const easedAspect = normalizedAspect * normalizedAspect * (3 - 2 * normalizedAspect);
  return OVERVIEW_MAX_RIGHT_YAW_DEGREES * (1 - easedAspect);
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
