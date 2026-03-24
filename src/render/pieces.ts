import * as THREE from 'three';
import { squareToWorld } from '../chess/mapping';
import type { BoardSquare, ChessPieceColor, ChessPieceState, ChessPieceType } from '../chess/state';
import {
  createCombatFeedbackController,
  type CombatFeedbackSnapshot
} from './combat-feedback';
import {
  createCombatPresentationController,
  type CombatPresentationBindings,
  type CombatPresentationEventInput,
  type CombatPresentationSnapshot,
  type CombatPresentationStateInput
} from './combat-presentation';
import {
  createCaptureAnimationController,
  getCaptureAnimationDurationMs
} from './capture-animations';
import {
  createPieceAssetInstance,
  getPieceAssetMode,
  type PieceAssetMode,
  type PieceAssetTemplates
} from './loaders';
import { createPlaceholderPieceMaterials } from './piece-material-style';
import {
  createPieceAnimationController,
  type PieceAnimationSnapshot
} from './piece-animations';

interface RenderResources {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

interface RenderedPiece extends RenderResources {
  boardAnchor: THREE.Group;
  presentation: PieceVisualPresentationSettings;
  visualRoot: THREE.Group;
}

interface PieceGroupUserData {
  baseYaw?: number;
  color?: ChessPieceColor;
  id?: string;
  square?: BoardSquare;
  type?: ChessPieceType;
}

interface MeshPosition {
  x: number;
  y: number;
  z: number;
}

interface PieceVisualPresentationSettings {
  hoverBaseOffset: number;
  hoverBobAmplitude: number;
  hoverBobPhase: number;
  hoverBobSpeed: number;
  isHoveringVisual: boolean;
}

interface PieceLayerSyncOptions {
  animateMovedPieceId?: string | null;
  combatEvent?: CombatPresentationEventInput | null;
  captureSquare?: BoardSquare | null;
  immediate?: boolean;
}

export interface PiecePresentationDebugSnapshot {
  boardAnchorPosition: MeshPosition;
  color: ChessPieceColor;
  currentVisualHoverYOffset: number;
  hoverBaseOffset: number;
  hoverBobAmplitude: number;
  hoverBobSpeed: number;
  id: string;
  isHoveringVisual: boolean;
  square: BoardSquare;
  type: ChessPieceType;
  visualRootPosition: MeshPosition;
}

export interface PieceLayerAnimationSnapshot extends PieceAnimationSnapshot {
  combat: CombatPresentationSnapshot;
  feedback: CombatFeedbackSnapshot;
}

export interface ChessPieceLayer {
  clearCombatPresentation: (options?: { removeVictim?: boolean; snapToFinal?: boolean }) => void;
  dispose: () => void;
  getAnimationState: () => PieceLayerAnimationSnapshot;
  getPresentationDebugState: () => PiecePresentationDebugSnapshot[];
  getVisualMode: () => PieceAssetMode;
  group: THREE.Group;
  setPieceAssets: (pieceTemplates: PieceAssetTemplates, pieces: ChessPieceState[]) => void;
  step: (deltaMs: number) => void;
  syncCombatPresentation: (state: CombatPresentationStateInput) => void;
  syncPieces: (pieces: ChessPieceState[], options?: PieceLayerSyncOptions) => void;
}

export function createPieceLayer(initialPieces: ChessPieceState[] = []): ChessPieceLayer {
  const group = new THREE.Group();
  group.name = 'piece-layer';

  let pieceTemplates: PieceAssetTemplates = {};
  let presentationElapsedMs = 0;
  const combatFeedbackController = createCombatFeedbackController();
  const combatPresentationController = createCombatPresentationController();
  const captureAnimationController = createCaptureAnimationController();
  const moveAnimationController = createPieceAnimationController();
  const exitingPieces = new Map<string, RenderedPiece>();
  const renderedPieces = new Map<string, RenderedPiece>();

  const syncPieces = (pieces: ChessPieceState[], options: PieceLayerSyncOptions = {}): void => {
    const nextIds = new Set(pieces.map((piece) => piece.id));
    const shouldSnapAll = options.immediate ?? false;
    const animateMovedPieceId = shouldSnapAll ? null : options.animateMovedPieceId ?? null;
    const combatEvent = shouldSnapAll ? null : options.combatEvent ?? null;
    const captureSquare = shouldSnapAll ? null : options.captureSquare ?? null;

    if (shouldSnapAll) {
      combatFeedbackController.clear();
      combatPresentationController.clear();
      clearExitingPieces();
      captureAnimationController.clear();
      moveAnimationController.clear();
    } else if (combatEvent) {
      moveCapturedPieceToExitingLayer(combatEvent.capturedSquare, false);
    } else if (captureSquare) {
      moveCapturedPieceToExitingLayer(captureSquare, true);
    }

    for (const [pieceId, renderedPiece] of renderedPieces.entries()) {
      if (nextIds.has(pieceId)) {
        continue;
      }

      moveAnimationController.remove(pieceId);
      group.remove(renderedPiece.boardAnchor);
      disposeRenderedPiece(renderedPiece);
      renderedPieces.delete(pieceId);
    }

    for (const piece of pieces) {
      let renderedPiece = renderedPieces.get(piece.id);

      if (renderedPiece && didPieceModelChange(renderedPiece.boardAnchor, piece)) {
        moveAnimationController.remove(piece.id);
        group.remove(renderedPiece.boardAnchor);
        disposeRenderedPiece(renderedPiece);
        renderedPieces.delete(piece.id);
        renderedPiece = undefined;
      }

      if (!renderedPiece) {
        renderedPiece = createRenderedPiece(piece, pieceTemplates);
        renderedPieces.set(piece.id, renderedPiece);
        group.add(renderedPiece.boardAnchor);
      }

      const targetPosition = getPieceWorldPosition(piece);
      const shouldAnimateMovedPiece =
        animateMovedPieceId === piece.id && renderedPiece.boardAnchor.position.distanceToSquared(targetPosition) > 0.0001;

      applyPieceMetadata(renderedPiece, piece);

      if (combatEvent && piece.id === combatEvent.attackerId) {
        moveAnimationController.remove(piece.id);
        moveAnimationController.snapTo(piece.id, renderedPiece.boardAnchor, targetPosition);
        resetRenderedPieceVisuals(renderedPiece, presentationElapsedMs);
        continue;
      }

      if (shouldAnimateMovedPiece) {
        moveAnimationController.animateTo(piece.id, renderedPiece.boardAnchor, targetPosition);
        continue;
      }

      moveAnimationController.snapTo(piece.id, renderedPiece.boardAnchor, targetPosition);
    }

    syncIdlePiecePresentations();
  };

  syncPieces(initialPieces, { immediate: true });

  return {
    clearCombatPresentation: ({ removeVictim = false, snapToFinal = false } = {}) => {
      const clearedSnapshot = combatPresentationController.clear({ snapToFinal });
      combatFeedbackController.clear();

      if (removeVictim && clearedSnapshot.victimId) {
        removeExitingPiece(clearedSnapshot.victimId);
      }

      syncIdlePiecePresentations();
    },
    dispose: () => {
      combatFeedbackController.clear();
      combatPresentationController.clear();
      clearExitingPieces();
      captureAnimationController.clear();
      moveAnimationController.clear();

      for (const renderedPiece of renderedPieces.values()) {
        disposeRenderedPiece(renderedPiece);
      }

      renderedPieces.clear();
      group.clear();
    },
    getAnimationState: () => {
      const moveSnapshot = moveAnimationController.getSnapshot();
      const capturePieceIds = captureAnimationController.getActivePieceIds();
      const combatSnapshot = combatPresentationController.getSnapshot();
      const feedbackSnapshot = combatFeedbackController.getSnapshot();

      return {
        activeCapturePieceIds: capturePieceIds,
        activePieceIds: moveSnapshot.activePieceIds,
        captureDurationMs: getCaptureAnimationDurationMs(),
        combat: combatSnapshot,
        durationMs: moveSnapshot.durationMs,
        feedback: feedbackSnapshot,
        isAnimating: moveSnapshot.isAnimating || capturePieceIds.length > 0 || combatSnapshot.active || feedbackSnapshot.active
      };
    },
    getPresentationDebugState: () =>
      [...renderedPieces.values()].map((renderedPiece) => ({
        boardAnchorPosition: toMeshPosition(renderedPiece.boardAnchor.position),
        color: getRenderedPieceColor(renderedPiece),
        currentVisualHoverYOffset: renderedPiece.visualRoot.position.y,
        hoverBaseOffset: renderedPiece.presentation.hoverBaseOffset,
        hoverBobAmplitude: renderedPiece.presentation.hoverBobAmplitude,
        hoverBobSpeed: renderedPiece.presentation.hoverBobSpeed,
        id: getRenderedPieceId(renderedPiece),
        isHoveringVisual: renderedPiece.presentation.isHoveringVisual,
        square: getRenderedPieceSquare(renderedPiece),
        type: getRenderedPieceType(renderedPiece),
        visualRootPosition: toMeshPosition(renderedPiece.visualRoot.position)
      })),
    getVisualMode: () => getPieceAssetMode(pieceTemplates),
    group,
    setPieceAssets: (nextPieceTemplates, pieces) => {
      pieceTemplates = { ...nextPieceTemplates };
      combatFeedbackController.clear();
      combatPresentationController.clear();
      clearExitingPieces();
      captureAnimationController.clear();
      moveAnimationController.clear();

      for (const renderedPiece of renderedPieces.values()) {
        group.remove(renderedPiece.boardAnchor);
        disposeRenderedPiece(renderedPiece);
      }

      renderedPieces.clear();
      syncPieces(pieces, { immediate: true });
    },
    step: (deltaMs) => {
      presentationElapsedMs += deltaMs;
      moveAnimationController.step(deltaMs);
      const completedCaptureIds = captureAnimationController.step(deltaMs);

      for (const pieceId of completedCaptureIds) {
        const exitingPiece = exitingPieces.get(pieceId);

        if (!exitingPiece) {
          continue;
        }

        group.remove(exitingPiece.boardAnchor);
        disposeRenderedPiece(exitingPiece);
        exitingPieces.delete(pieceId);
      }

      syncIdlePiecePresentations();
    },
    syncCombatPresentation: (state) => {
      if (state.mode !== 'combat' || !state.combatEvent || !state.combatPhase) {
        const clearedSnapshot = combatPresentationController.clear({ snapToFinal: true });
        combatFeedbackController.clear();

        if (clearedSnapshot.victimId) {
          removeExitingPiece(clearedSnapshot.victimId);
        }

        syncIdlePiecePresentations();
        return;
      }

      const bindings = getCombatPresentationBindings(state.combatEvent);

      if (!bindings) {
        combatFeedbackController.clear();
        combatPresentationController.clear();
        return;
      }

      combatPresentationController.syncState(state, bindings);
      combatFeedbackController.syncState(state, bindings);
    },
    syncPieces
  };

  function clearExitingPieces(): void {
    for (const [pieceId, exitingPiece] of exitingPieces.entries()) {
      captureAnimationController.remove(pieceId);
      group.remove(exitingPiece.boardAnchor);
      disposeRenderedPiece(exitingPiece);
      exitingPieces.delete(pieceId);
    }
  }

  function findRenderedPieceIdAtSquare(square: BoardSquare): string | null {
    for (const [pieceId, renderedPiece] of renderedPieces.entries()) {
      if (getRenderedPieceSquare(renderedPiece) === square) {
        return pieceId;
      }
    }

    return null;
  }

  function getCombatPresentationBindings(
    combatEvent: CombatPresentationEventInput
  ): CombatPresentationBindings | null {
    const attackerPiece = renderedPieces.get(combatEvent.attackerId);
    const victimPiece = exitingPieces.get(combatEvent.victimId);

    if (!attackerPiece || !victimPiece) {
      return null;
    }

    return {
      attackerAnchor: attackerPiece.boardAnchor,
      attackerGroup: attackerPiece.visualRoot,
      victimAnchor: victimPiece.boardAnchor,
      victimGroup: victimPiece.visualRoot,
      victimMaterials: victimPiece.materials
    };
  }

  function moveCapturedPieceToExitingLayer(square: BoardSquare, animateOut: boolean): void {
    const capturedPieceId = findRenderedPieceIdAtSquare(square);

    if (!capturedPieceId) {
      return;
    }

    const capturedPiece = renderedPieces.get(capturedPieceId);

    if (!capturedPiece) {
      return;
    }

    renderedPieces.delete(capturedPieceId);
    exitingPieces.set(capturedPieceId, capturedPiece);
    moveAnimationController.remove(capturedPieceId);
    resetRenderedPieceVisuals(capturedPiece, presentationElapsedMs);

    if (animateOut) {
      captureAnimationController.animateOut(capturedPieceId, capturedPiece.visualRoot, capturedPiece.materials);
    }
  }

  function removeExitingPiece(pieceId: string): void {
    const exitingPiece = exitingPieces.get(pieceId);

    if (!exitingPiece) {
      return;
    }

    captureAnimationController.remove(pieceId);
    group.remove(exitingPiece.boardAnchor);
    disposeRenderedPiece(exitingPiece);
    exitingPieces.delete(pieceId);
  }

  function syncIdlePiecePresentations(): void {
    const activeCapturePieceIds = new Set(captureAnimationController.getActivePieceIds());
    const activeCombatPieceIds = getActiveCombatPieceIds();

    for (const [pieceId, renderedPiece] of renderedPieces.entries()) {
      if (activeCapturePieceIds.has(pieceId) || activeCombatPieceIds.has(pieceId)) {
        continue;
      }

      applyIdlePiecePresentation(renderedPiece, presentationElapsedMs);
    }

    for (const [pieceId, renderedPiece] of exitingPieces.entries()) {
      if (activeCapturePieceIds.has(pieceId) || activeCombatPieceIds.has(pieceId)) {
        continue;
      }

      applyIdlePiecePresentation(renderedPiece, presentationElapsedMs);
    }
  }

  function getActiveCombatPieceIds(): Set<string> {
    const ids = new Set<string>();
    const combatSnapshot = combatPresentationController.getSnapshot();

    if (combatSnapshot.attackerId) {
      ids.add(combatSnapshot.attackerId);
    }

    if (combatSnapshot.victimId) {
      ids.add(combatSnapshot.victimId);
    }

    return ids;
  }
}

function createRenderedPiece(piece: ChessPieceState, pieceTemplates: PieceAssetTemplates): RenderedPiece {
  const assetGroup = createPieceAssetInstance(pieceTemplates, piece.type, piece.color);

  if (assetGroup) {
    return createRenderedPieceContainer(piece, assetGroup);
  }

  return createPlaceholderRenderedPiece(piece);
}

function createPlaceholderRenderedPiece(piece: ChessPieceState): RenderedPiece {
  const modelGroup = new THREE.Group();
  modelGroup.name = `piece-${piece.id}-model`;

  const materials = createPlaceholderPieceMaterials(piece.color);
  const geometries: THREE.BufferGeometry[] = [];

  const addMesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: MeshPosition,
    rotation?: THREE.Euler
  ): void => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);

    if (rotation) {
      mesh.rotation.copy(rotation);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    modelGroup.add(mesh);
    geometries.push(geometry);
  };

  addMesh(new THREE.CylinderGeometry(0.23, 0.27, 0.12, 24), materials.body, { x: 0, y: 0.06, z: 0 });
  addMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 24), materials.trim, { x: 0, y: 0.16, z: 0 });

  switch (piece.type) {
    case 'pawn':
      addMesh(new THREE.CylinderGeometry(0.11, 0.14, 0.28, 20), materials.body, { x: 0, y: 0.34, z: 0 });
      addMesh(new THREE.SphereGeometry(0.11, 18, 18), materials.trim, { x: 0, y: 0.56, z: 0 });
      break;
    case 'rook':
      addMesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), materials.body, { x: 0, y: 0.34, z: 0 });
      addMesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), materials.trim, { x: 0, y: 0.56, z: 0 });
      for (const offsetX of [-0.1, 0.1]) {
        for (const offsetZ of [-0.1, 0.1]) {
          addMesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), materials.body, { x: offsetX, y: 0.65, z: offsetZ });
        }
      }
      break;
    case 'knight':
      addMesh(new THREE.CylinderGeometry(0.12, 0.18, 0.2, 18), materials.body, { x: 0, y: 0.29, z: 0 });
      addMesh(
        new THREE.BoxGeometry(0.2, 0.36, 0.18),
        materials.body,
        { x: 0.02, y: 0.52, z: 0.01 },
        new THREE.Euler(0, 0, -0.26)
      );
      addMesh(
        new THREE.ConeGeometry(0.12, 0.26, 5),
        materials.trim,
        { x: 0.06, y: 0.74, z: 0.05 },
        new THREE.Euler(Math.PI / 2.1, 0, -0.5)
      );
      break;
    case 'bishop':
      addMesh(new THREE.CylinderGeometry(0.1, 0.16, 0.4, 18), materials.body, { x: 0, y: 0.39, z: 0 });
      addMesh(new THREE.ConeGeometry(0.14, 0.24, 18), materials.trim, { x: 0, y: 0.67, z: 0 });
      addMesh(new THREE.SphereGeometry(0.05, 14, 14), materials.accent, { x: 0, y: 0.83, z: 0 });
      break;
    case 'queen':
      addMesh(new THREE.CylinderGeometry(0.12, 0.18, 0.5, 20), materials.body, { x: 0, y: 0.44, z: 0 });
      addMesh(new THREE.ConeGeometry(0.18, 0.2, 24), materials.trim, { x: 0, y: 0.73, z: 0 });
      addMesh(new THREE.SphereGeometry(0.08, 18, 18), materials.accent, { x: 0, y: 0.9, z: 0 });
      break;
    case 'king':
      addMesh(new THREE.CylinderGeometry(0.12, 0.18, 0.54, 20), materials.body, { x: 0, y: 0.46, z: 0 });
      addMesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), materials.trim, { x: 0, y: 0.77, z: 0 });
      addMesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), materials.accent, { x: 0, y: 0.93, z: 0 });
      addMesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), materials.accent, { x: 0, y: 0.93, z: 0 });
      break;
  }

  return createRenderedPieceContainer(piece, modelGroup, {
    geometries,
    materials: [materials.body, materials.trim, materials.accent]
  });
}

function createRenderedPieceContainer(
  piece: ChessPieceState,
  modelGroup: THREE.Group,
  resources: RenderResources = collectRenderResources(modelGroup)
): RenderedPiece {
  const boardAnchor = new THREE.Group();
  boardAnchor.name = `piece-${piece.id}-board-anchor`;
  const visualRoot = new THREE.Group();
  visualRoot.name = `piece-${piece.id}-visual-root`;
  boardAnchor.add(visualRoot);
  visualRoot.add(modelGroup);

  const renderedPiece: RenderedPiece = {
    boardAnchor,
    geometries: resources.geometries,
    materials: resources.materials,
    presentation: createPieceVisualPresentationSettings(piece),
    visualRoot
  };

  applyPieceMetadata(renderedPiece, piece);
  applyPieceBaseOrientation(renderedPiece.visualRoot);
  resetRenderedPieceVisuals(renderedPiece, 0);
  return renderedPiece;
}

function collectRenderResources(group: THREE.Group): RenderResources {
  const geometries: THREE.BufferGeometry[] = [];
  const materials = new Set<THREE.Material>();

  group.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    geometries.push(node.geometry);

    if (Array.isArray(node.material)) {
      node.material.forEach((material) => materials.add(material));
      return;
    }

    materials.add(node.material);
  });

  return {
    geometries,
    materials: [...materials]
  };
}

function applyPieceMetadata(renderedPiece: RenderedPiece, piece: ChessPieceState): void {
  const userData: PieceGroupUserData = {
    ...(renderedPiece.boardAnchor.userData as PieceGroupUserData),
    baseYaw: getPieceBaseYaw(piece.color),
    color: piece.color,
    id: piece.id,
    square: piece.square,
    type: piece.type
  };

  renderedPiece.boardAnchor.userData = userData;
  renderedPiece.visualRoot.userData = {
    ...(renderedPiece.visualRoot.userData as PieceGroupUserData),
    baseYaw: userData.baseYaw
  };
}

function didPieceModelChange(boardAnchor: THREE.Group, piece: ChessPieceState): boolean {
  return boardAnchor.userData.color !== piece.color || boardAnchor.userData.type !== piece.type;
}

function disposeRenderedPiece(renderedPiece: RenderedPiece): void {
  for (const geometry of renderedPiece.geometries) {
    geometry.dispose();
  }

  for (const material of renderedPiece.materials) {
    material.dispose();
  }
}

function createPieceVisualPresentationSettings(piece: ChessPieceState): PieceVisualPresentationSettings {
  if (piece.type === 'knight') {
    return {
      hoverBaseOffset: 0.36,
      hoverBobAmplitude: 0.03,
      hoverBobPhase: createHoverPhase(piece.id),
      hoverBobSpeed: 2.1,
      isHoveringVisual: true
    };
  }

  return {
    hoverBaseOffset: 0,
    hoverBobAmplitude: 0,
    hoverBobPhase: 0,
    hoverBobSpeed: 0,
    isHoveringVisual: false
  };
}

function getPieceWorldPosition(piece: ChessPieceState): THREE.Vector3 {
  return getPieceWorldPositionFromSquare(piece.square);
}

function getPieceWorldPositionFromSquare(square: BoardSquare): THREE.Vector3 {
  const world = squareToWorld(square);
  // 0.898 = BOARD_SURFACE_Y: board_base_plate Oberseite in raum2.blend
  // (Blender Z=2.4221 → Three.js Y=0.898).
  return new THREE.Vector3(world.x, 0.898, world.z);
}

function resetRenderedPieceVisuals(renderedPiece: RenderedPiece, elapsedMs: number): void {
  applyIdlePiecePresentation(renderedPiece, elapsedMs);

  for (const material of renderedPiece.materials) {
    material.transparent = true;
    material.opacity = 1;
  }
}

function applyPieceBaseOrientation(group: THREE.Group): void {
  group.rotation.y = getGroupBaseYaw(group);
}

function getGroupBaseYaw(group: THREE.Group): number {
  return ((group.userData as PieceGroupUserData).baseYaw ?? 0);
}

function getPieceBaseYaw(color: ChessPieceColor): number {
  return color === 'white' ? Math.PI : 0;
}

function applyIdlePiecePresentation(renderedPiece: RenderedPiece, elapsedMs: number): void {
  renderedPiece.visualRoot.position.set(0, getPieceVisualHoverOffset(renderedPiece.presentation, elapsedMs), 0);
  renderedPiece.visualRoot.rotation.set(0, getGroupBaseYaw(renderedPiece.visualRoot), 0);
  renderedPiece.visualRoot.scale.set(1, 1, 1);
  renderedPiece.visualRoot.visible = true;
}

function getPieceVisualHoverOffset(presentation: PieceVisualPresentationSettings, elapsedMs: number): number {
  if (!presentation.isHoveringVisual) {
    return 0;
  }

  const bobOffset =
    Math.sin((elapsedMs / 1000) * presentation.hoverBobSpeed + presentation.hoverBobPhase) * presentation.hoverBobAmplitude;

  return presentation.hoverBaseOffset + bobOffset;
}

function createHoverPhase(pieceId: string): number {
  let hash = 0;

  for (let index = 0; index < pieceId.length; index += 1) {
    hash = (hash * 31 + pieceId.charCodeAt(index)) >>> 0;
  }

  return (hash / 0xffffffff) * Math.PI * 2;
}

function getRenderedPieceColor(renderedPiece: RenderedPiece): ChessPieceColor {
  return ((renderedPiece.boardAnchor.userData as PieceGroupUserData).color ?? 'white') as ChessPieceColor;
}

function getRenderedPieceId(renderedPiece: RenderedPiece): string {
  return ((renderedPiece.boardAnchor.userData as PieceGroupUserData).id ?? '') as string;
}

function getRenderedPieceSquare(renderedPiece: RenderedPiece): BoardSquare {
  return ((renderedPiece.boardAnchor.userData as PieceGroupUserData).square ?? 'a1') as BoardSquare;
}

function getRenderedPieceType(renderedPiece: RenderedPiece): ChessPieceType {
  return ((renderedPiece.boardAnchor.userData as PieceGroupUserData).type ?? 'pawn') as ChessPieceType;
}

function toMeshPosition(vector: THREE.Vector3): MeshPosition {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}
