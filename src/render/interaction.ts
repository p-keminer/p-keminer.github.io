import * as THREE from 'three';
import { squareToWorld } from '../chess/mapping';
import type { BoardSquare } from '../chess/state';
import type { ChessboardMesh } from './board';

export const HIGHLIGHT_PRIORITY = [
  'checkedKingSquare',
  'selectedSquare',
  'legalTargetSquare',
  'lastMoveSquare',
  'hoveredSquare'
] as const;

export interface BoardInteractionState {
  checkedKingSquare: BoardSquare | null;
  highlightPriority: readonly string[];
  hoveredSquare: BoardSquare | null;
  legalTargetSquares: BoardSquare[];
  lastMoveSquares: BoardSquare[];
  selectedSquare: BoardSquare | null;
}

export interface BoardInteractionLayer {
  dispose: () => void;
  getState: () => BoardInteractionState;
  setEnabled: (enabled: boolean) => void;
  setHighlightState: (
    state: Pick<BoardInteractionState, 'checkedKingSquare' | 'lastMoveSquares' | 'legalTargetSquares' | 'selectedSquare'>
  ) => void;
}

interface CreateBoardInteractionOptions {
  board: ChessboardMesh;
  camera: THREE.PerspectiveCamera;
  domElement: HTMLCanvasElement;
  onChange?: (state: BoardInteractionState) => void;
  onSquareClick?: (square: BoardSquare) => void;
  scene: THREE.Scene;
  /** Welt-Raum Y der Boardfläche. Markierer-Y-Offsets werden oben drauf addiert. */
  surfaceY?: number;
}

interface HighlightMarker {
  mesh: THREE.Mesh;
  y: number;
}

export function createBoardInteraction({
  board,
  camera,
  domElement,
  onChange,
  onSquareClick,
  scene,
  surfaceY = 0
}: CreateBoardInteractionOptions): BoardInteractionLayer {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const state: BoardInteractionState = {
    checkedKingSquare: null,
    highlightPriority: HIGHLIGHT_PRIORITY,
    hoveredSquare: null,
    legalTargetSquares: [],
    lastMoveSquares: [],
    selectedSquare: null
  };
  let enabled = true;
  let cachedRect: DOMRect | null = null;
  let pointerMoveScheduled = false;

  // Cache dom element rect — wird aktualisiert auf resize
  const updateRectCache = (): void => {
    cachedRect = domElement.getBoundingClientRect();
  };

  const resizeObserver = new ResizeObserver(() => {
    updateRectCache();
  });

  updateRectCache();
  resizeObserver.observe(domElement);

  const highlightGroup = new THREE.Group();
  highlightGroup.name = 'board-interaction-highlights';

  const hoveredMarker = createSquareMarker({
    color: '#76d6ff',
    emissive: '#0b6b87',
    opacity: 0.42,
    y: 0.11
  });
  const selectedMarker = createSquareMarker({
    color: '#ffd56f',
    emissive: '#9e5a00',
    opacity: 0.56,
    y: 0.17
  });
  const checkedKingMarker = createSquareMarker({
    color: '#ff8484',
    emissive: '#8a0615',
    opacity: 0.68,
    y: 0.21
  });
  const lastMoveFromMarker = createSquareMarker({
    color: '#c4a16a',
    emissive: '#6d4610',
    opacity: 0.34,
    y: 0.105
  });
  const lastMoveToMarker = createSquareMarker({
    color: '#efe0a8',
    emissive: '#806720',
    opacity: 0.42,
    y: 0.115
  });
  const legalTargetMarkers = Array.from({ length: 32 }, () =>
    createDiskMarker({
      color: '#8ce6a9',
      emissive: '#15783d',
      opacity: 0.48,
      y: 0.095
    })
  );

  highlightGroup.add(
    hoveredMarker.mesh,
    lastMoveFromMarker.mesh,
    lastMoveToMarker.mesh,
    ...legalTargetMarkers.map((marker) => marker.mesh),
    selectedMarker.mesh,
    checkedKingMarker.mesh
  );
  scene.add(highlightGroup);

  const emitChange = (): void => {
    onChange?.(getState());
  };

  const updateHighlights = (): void => {
    const occupiedByHigherPriority = new Set<BoardSquare>();
    const checkedKingSquare = state.checkedKingSquare;

    syncMarker(checkedKingMarker, checkedKingSquare);

    if (checkedKingSquare) {
      occupiedByHigherPriority.add(checkedKingSquare);
    }

    const selectedSquare =
      state.selectedSquare && !occupiedByHigherPriority.has(state.selectedSquare) ? state.selectedSquare : null;
    syncMarker(selectedMarker, selectedSquare);

    if (selectedSquare) {
      occupiedByHigherPriority.add(selectedSquare);
    }

    const legalTargetSquares = state.legalTargetSquares.filter((square) => !occupiedByHigherPriority.has(square));
    syncLegalTargetMarkers(legalTargetSquares);

    legalTargetSquares.forEach((square) => {
      occupiedByHigherPriority.add(square);
    });

    const lastMoveSquares = state.lastMoveSquares.map((square) =>
      occupiedByHigherPriority.has(square) ? null : square
    );
    syncMarker(lastMoveFromMarker, lastMoveSquares[0] ?? null);
    syncMarker(lastMoveToMarker, lastMoveSquares[1] ?? null);

    state.lastMoveSquares.forEach((square) => {
      occupiedByHigherPriority.add(square);
    });

    const hoveredSquare =
      state.hoveredSquare && !occupiedByHigherPriority.has(state.hoveredSquare) ? state.hoveredSquare : null;
    syncMarker(hoveredMarker, hoveredSquare);
    domElement.style.cursor = state.hoveredSquare ? 'pointer' : 'default';
  };

  const setHoveredSquare = (nextSquare: BoardSquare | null): void => {
    if (state.hoveredSquare === nextSquare) {
      return;
    }

    state.hoveredSquare = nextSquare;
    updateHighlights();
    emitChange();
  };

  const pickSquare = (clientX: number, clientY: number): BoardSquare | null => {
    const rect = cachedRect || domElement.getBoundingClientRect();

    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(board.squares, false)[0];
    const square = hit?.object.userData.square;

    return typeof square === 'string' ? (square as BoardSquare) : null;
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!enabled) {
      setHoveredSquare(null);
      return;
    }

    // Touch-Events sollen keinen Hover-Marker zeigen — der blitzt sonst
    // kurz auf bevor der Click verarbeitet wird (sichtbar auf Tablets).
    if (event.pointerType === 'touch') {
      return;
    }

    if (pointerMoveScheduled) {
      return;
    }

    pointerMoveScheduled = true;
    const clientX = event.clientX;
    const clientY = event.clientY;

    requestAnimationFrame(() => {
      pointerMoveScheduled = false;
      setHoveredSquare(pickSquare(clientX, clientY));
    });
  };

  const handlePointerLeave = (): void => {
    setHoveredSquare(null);
  };

  const handleClick = (event: MouseEvent): void => {
    if (!enabled) {
      return;
    }

    const clickedSquare = pickSquare(event.clientX, event.clientY);

    if (!clickedSquare) {
      return;
    }

    setHoveredSquare(clickedSquare);
    onSquareClick?.(clickedSquare);
  };

  domElement.addEventListener('pointermove', handlePointerMove);
  domElement.addEventListener('pointerleave', handlePointerLeave);
  domElement.addEventListener('click', handleClick);

  updateHighlights();

  function getState(): BoardInteractionState {
    return {
      checkedKingSquare: state.checkedKingSquare,
      highlightPriority: state.highlightPriority,
      hoveredSquare: state.hoveredSquare,
      legalTargetSquares: [...state.legalTargetSquares],
      lastMoveSquares: [...state.lastMoveSquares],
      selectedSquare: state.selectedSquare
    };
  }

  function setHighlightState(
    nextState: Pick<BoardInteractionState, 'checkedKingSquare' | 'lastMoveSquares' | 'legalTargetSquares' | 'selectedSquare'>
  ): void {
    const didChange =
      state.checkedKingSquare !== nextState.checkedKingSquare ||
      state.selectedSquare !== nextState.selectedSquare ||
      state.legalTargetSquares.join(',') !== nextState.legalTargetSquares.join(',') ||
      state.lastMoveSquares.join(',') !== nextState.lastMoveSquares.join(',');

    if (!didChange) {
      return;
    }

    state.checkedKingSquare = nextState.checkedKingSquare;
    state.selectedSquare = nextState.selectedSquare;
    state.legalTargetSquares = [...nextState.legalTargetSquares];
    state.lastMoveSquares = [...nextState.lastMoveSquares];
    updateHighlights();
    emitChange();
  }

  function syncLegalTargetMarkers(squares: BoardSquare[]): void {
    for (let index = 0; index < legalTargetMarkers.length; index++) {
      const marker = legalTargetMarkers[index];
      if (index < squares.length) {
        syncMarker(marker, squares[index]);
      } else if (marker.mesh.visible) {
        marker.mesh.visible = false;
      } else {
        break;
      }
    }
  }

  function syncMarker(marker: HighlightMarker, square: BoardSquare | null): void {
    if (!square) {
      marker.mesh.visible = false;
      return;
    }

    const world = squareToWorld(square);
    marker.mesh.position.set(world.x, surfaceY + marker.y, world.z);
    marker.mesh.visible = true;
  }

  return {
    dispose: () => {
      resizeObserver.disconnect();
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerleave', handlePointerLeave);
      domElement.removeEventListener('click', handleClick);
      domElement.style.cursor = 'default';

      scene.remove(highlightGroup);
      disposeMarker(hoveredMarker);
      disposeMarker(lastMoveFromMarker);
      disposeMarker(lastMoveToMarker);
      disposeMarker(selectedMarker);
      disposeMarker(checkedKingMarker);
      legalTargetMarkers.forEach((marker) => disposeMarker(marker));
    },
    getState,
    setEnabled: (nextEnabled) => {
      if (enabled === nextEnabled) {
        return;
      }

      enabled = nextEnabled;

      if (!enabled) {
        setHoveredSquare(null);
        domElement.style.cursor = 'default';
      }
    },
    setHighlightState
  };
}

function createSquareMarker({
  color,
  emissive,
  opacity,
  y
}: {
  color: string;
  emissive: string;
  opacity: number;
  y: number;
}): HighlightMarker {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.04, 0.94),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.35,
      metalness: 0.05,
      roughness: 0.34,
      opacity,
      transparent: true
    })
  );

  mesh.visible = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = Math.round(y * 1000);

  return {
    mesh,
    y
  };
}

function createDiskMarker({
  color,
  emissive,
  opacity,
  y
}: {
  color: string;
  emissive: string;
  opacity: number;
  y: number;
}): HighlightMarker {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.03, 24),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.24,
      metalness: 0.05,
      roughness: 0.45,
      opacity,
      transparent: true
    })
  );

  mesh.visible = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = Math.round(y * 1000);

  return {
    mesh,
    y
  };
}

function disposeMarker(marker: HighlightMarker): void {
  marker.mesh.geometry.dispose();

  if (Array.isArray(marker.mesh.material)) {
    marker.mesh.material.forEach((material) => material.dispose());
    return;
  }

  marker.mesh.material.dispose();
}
