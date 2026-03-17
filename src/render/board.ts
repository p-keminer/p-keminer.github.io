import * as THREE from 'three';
import { squareToWorld } from '../chess/mapping';
import { createBoardAssetInstance, type BoardAssetMode } from './loaders';

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 1;

export const BOARD_COLORS = {
  dark: '#6e4b33',
  frame: '#342012',
  light: '#f2dfbf',
  plinth: '#1e1610'
};

export interface ChessboardMesh {
  darkSquareCount: number;
  dispose: () => void;
  getVisualMode: () => BoardAssetMode;
  group: THREE.Group;
  lightSquareCount: number;
  setVisualBoardAsset: (boardTemplate: THREE.Group | null) => void;
  squares: THREE.Mesh[];
}

export function createChessboard(): ChessboardMesh {
  const group = new THREE.Group();
  group.name = 'chessboard';

  const visualRoot = new THREE.Group();
  visualRoot.name = 'board-visual-root';
  group.add(visualRoot);

  const coordinateLabels = createCoordinateLabelsGroup();
  group.add(coordinateLabels.group);

  const fallbackVisual = createFallbackBoardVisual();
  let currentVisual: THREE.Object3D = fallbackVisual;
  let currentMode: BoardAssetMode = 'placeholder';

  visualRoot.add(fallbackVisual);

  // Holografisches Projektionsgitter — scharfe additive Scan-Linien auf den GLB-
  // Projektionszonen, die der Spieloberfläche ihren „Energiegitter"-Eindruck verleihen.
  const holoGrid = createHolographicGridOverlay();
  group.add(holoGrid.mesh);

  const squares: THREE.Mesh[] = [];
  let lightSquareCount = 0;
  let darkSquareCount = 0;
  const hitSquareMaterial = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    depthWrite: false,
    opacity: 0,
    transparent: true
  });

  for (let rank = 1; rank <= BOARD_SIZE; rank += 1) {
    for (let file = 0; file < BOARD_SIZE; file += 1) {
      const squareName = `${String.fromCharCode(97 + file)}${rank}`;
      const isLightSquare = (file + rank) % 2 === 0;
      const world = squareToWorld(squareName);
      const square = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.16, 0.98), hitSquareMaterial);

      square.name = `hit-${squareName}`;
      square.position.set(world.x, 0, world.z);
      square.castShadow = false;
      square.receiveShadow = false;
      square.userData.square = squareName;

      if (isLightSquare) {
        lightSquareCount += 1;
      } else {
        darkSquareCount += 1;
      }

      squares.push(square);
      group.add(square);
    }
  }

  return {
    darkSquareCount,
    dispose: () => {
      hitSquareMaterial.dispose();
      coordinateLabels.dispose();
      holoGrid.dispose();

      for (const square of squares) {
        square.geometry.dispose();
      }

      if (currentVisual === fallbackVisual) {
        disposeObject(fallbackVisual, true);
      } else {
        disposeObject(currentVisual, true);
        disposeObject(fallbackVisual, true);
      }
    },
    getVisualMode: () => currentMode,
    group,
    lightSquareCount,
    setVisualBoardAsset: (boardTemplate) => {
      visualRoot.remove(currentVisual);

      if (currentVisual !== fallbackVisual) {
        disposeObject(currentVisual, true);
      }

      if (boardTemplate) {
        currentVisual = createBoardAssetInstance(boardTemplate);
        currentMode = 'glb';
      } else {
        currentVisual = fallbackVisual;
        currentMode = 'placeholder';
      }

      visualRoot.add(currentVisual);
    },
    squares
  };
}

function createCoordinateLabelsGroup(): {
  dispose: () => void;
  group: THREE.Group;
} {
  const group = new THREE.Group();
  group.name = 'board-coordinate-labels';
  const resources: Array<{ material: THREE.SpriteMaterial; texture: THREE.CanvasTexture }> = [];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

  for (const file of files) {
    const fileWorld = squareToWorld(`${file}1`);

    group.add(createCoordinateLabelSprite(file, { x: fileWorld.x, y: 0.28, z: 4.25 }, resources));
    group.add(createCoordinateLabelSprite(file, { x: fileWorld.x, y: 0.28, z: -4.25 }, resources));
  }

  for (const rank of ranks) {
    const rankWorld = squareToWorld(`a${rank}`);

    group.add(createCoordinateLabelSprite(rank, { x: -4.25, y: 0.28, z: rankWorld.z }, resources));
    group.add(createCoordinateLabelSprite(rank, { x: 4.25, y: 0.28, z: rankWorld.z }, resources));
  }

  return {
    dispose: () => {
      for (const resource of resources) {
        resource.material.dispose();
        resource.texture.dispose();
      }
    },
    group
  };
}

function createFallbackBoardVisual(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'fallback-board-visual';

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.42, 9.2),
    new THREE.MeshStandardMaterial({ color: BOARD_COLORS.frame, metalness: 0.15, roughness: 0.78 })
  );
  frame.position.y = -0.28;
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(6.6, 7.4, 0.45, 48),
    new THREE.MeshStandardMaterial({ color: BOARD_COLORS.plinth, metalness: 0.08, roughness: 0.82 })
  );
  plinth.position.y = -0.68;
  plinth.receiveShadow = true;
  group.add(plinth);

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: BOARD_COLORS.light,
    metalness: 0.06,
    roughness: 0.58
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: BOARD_COLORS.dark,
    metalness: 0.08,
    roughness: 0.7
  });

  for (let rank = 1; rank <= BOARD_SIZE; rank += 1) {
    for (let file = 0; file < BOARD_SIZE; file += 1) {
      const squareName = `${String.fromCharCode(97 + file)}${rank}`;
      const isLightSquare = (file + rank) % 2 === 0;
      const world = squareToWorld(squareName);
      const square = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.14, 0.96),
        isLightSquare ? lightMaterial : darkMaterial
      );

      square.position.set(world.x, 0, world.z);
      square.castShadow = false;
      square.receiveShadow = true;
      group.add(square);
    }
  }

  return group;
}

// ─── Holografische Spieloberfläche ─────────────────────────────────────────────────
//
// Die GLB-Kacheln sq_light / sq_dark sind in loaders.ts versteckt, sodass der physische
// Rahmen / die Schienen / der Sockel als die Mech-Tech-Basis-Schicht gelesen werden.
// Diese prozedurale Oberfläche ersetzt sie mit einem zwei-schichtigen Projektionseffekt:
//
//   1. Basis-Energiefeld — eine einzige 8×8-Ebene mit sanftem einheitlichem Türkis-Glanz,
//      die den Spielbereich in eine kohärente Energieplattform verbindet.
//   2. Zoneneebenen × 64 — pro-Quadrat 0,94×0,94-Ebenen mit leichtem Innenabstand,
//      um die Oberfläche in sichtbare Projektionszonen zu unterteilen. Helle und dunkle
//      Quadrate verwenden unterschiedliche Leuchtkraft, damit das Schachbrettmuster lesbar bleibt.
//
// Alle Elemente verwenden AdditiveBlending, sodass sie als emittiertes Licht erscheinen,
// das auf die physische Basis projiziert wird, anstatt undurchsichtige physische Objekte zu sein.

function createHolographicPlaySurface(): { dispose: () => void; group: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'holo-play-surface';

  // ── 1. Basis-Energiefeld ──────────────────────────────────────────────────
  const baseFieldGeometry = new THREE.PlaneGeometry(8.0, 8.0);
  const baseFieldMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color('#001a22'),
    depthWrite: false,
    opacity: 0.18,
    transparent: true
  });
  const baseField = new THREE.Mesh(baseFieldGeometry, baseFieldMaterial);
  baseField.name = 'holo-base-field';
  baseField.rotation.x = -Math.PI / 2;
  baseField.position.y = 0.07;
  baseField.renderOrder = 2;
  baseField.castShadow = false;
  baseField.receiveShadow = false;
  group.add(baseField);

  // ── 2. Zoneneebenen ────────────────────────────────────────────────────────
  const zoneGeometry = new THREE.PlaneGeometry(0.94, 0.94);

  // Lichtzonen: merklich heller, damit die Schachbrettmuster-Unterscheidung erhalten bleibt.
  const lightZoneMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color('#005a70'),
    depthWrite: false,
    opacity: 0.60,
    transparent: true
  });

  // Dunkle Zonen: sehr gedimmt — ausreichend vorhanden, um die Lücke zu füllen, aber nicht konkurrierend.
  const darkZoneMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color('#001520'),
    depthWrite: false,
    opacity: 0.28,
    transparent: true
  });

  for (let file = 0; file < BOARD_SIZE; file++) {
    for (let rank = 0; rank < BOARD_SIZE; rank++) {
      // Entsprechen Sie der Hit-Square-Licht/Dunkel-Konvention:
      //   Hit-Quadrate verwenden 1-indizierte Ränge → isLight = (file + rank) % 2 === 0
      //   hier ist der Rang 0-indiziert → isLight wenn (file + (rank+1)) % 2 === 0
      //                                              = (file + rank) % 2 !== 0
      const isLight = (file + rank) % 2 !== 0;
      const squareName = `${String.fromCharCode(97 + file)}${rank + 1}`;
      const world = squareToWorld(squareName);

      const mesh = new THREE.Mesh(zoneGeometry, isLight ? lightZoneMaterial : darkZoneMaterial);
      mesh.name = `holo-zone-${squareName}`;
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(world.x, 0.072, world.z);
      mesh.renderOrder = 3;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    }
  }

  return {
    group,
    dispose: () => {
      baseFieldGeometry.dispose();
      baseFieldMaterial.dispose();
      zoneGeometry.dispose();
      lightZoneMaterial.dispose();
      darkZoneMaterial.dispose();
    }
  };
}

// ─── Holografische Gitter-Überlagerung ─────────────────────────────────────────────────

// Canvas-basierte Projektionsgitter-Textur: dünne Cyan-Linien an jeder Quadrat-
// grenze mit kleinen Eckpunkten an Schnittpunkten. Das Ergebnis wird als
// subtile additive Überlagerung gerendert — genug, um eine taktische Energiefläche zu suggerieren,
// ohne Rauschen hinzuzufügen oder die Spielbarkeit zu beeinträchtigen.
function createHolographicGridTexture(): THREE.CanvasTexture {
  const SIZE = 512;
  const CELLS = 8;
  const CELL_PX = SIZE / CELLS; // 64 px per square

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create holographic grid context.');
  }

  ctx.clearRect(0, 0, SIZE, SIZE);

  // Dünne Gitterlinien an Quadratgrenzen
  ctx.strokeStyle = 'rgba(0, 224, 236, 1.0)';
  ctx.lineWidth = 0.9;

  for (let i = 0; i <= CELLS; i++) {
    const pos = i * CELL_PX;

    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(SIZE, pos);
    ctx.stroke();
  }

  // Kleine Eckpunkte an jeder Gitter-Kreuzung
  ctx.fillStyle = 'rgba(0, 240, 255, 1.0)';

  for (let r = 0; r <= CELLS; r++) {
    for (let c = 0; c <= CELLS; c++) {
      ctx.beginPath();
      ctx.arc(c * CELL_PX, r * CELL_PX, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createHolographicGridOverlay(): { dispose: () => void; mesh: THREE.Mesh } {
  const texture = createHolographicGridTexture();
  const geometry = new THREE.PlaneGeometry(8, 8);
  const material = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: texture,
    // Stärker als die vorherige 0,25, da die Sq_Tiles jetzt versteckt sind —
    // die Gitterlinien tragen die primäre Verantwortung für die Quadratgrenzen-Definition.
    opacity: 0.40,
    transparent: true
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'holo-grid-overlay';
  mesh.rotation.x = -Math.PI / 2;
  // Sitzt knapp über der GLB-Brett-Oberfläche (~0,068 nach BOARD_CYBER_SCALE);
  // weit unter Hervorhebungsmarkierungen, die bei Y = 0,095 beginnen.
  mesh.position.y = 0.085;
  // renderOrder 4: über der GLB-Brett-Oberfläche (0), unter Koordinaten-
  // label-Sprites (50) und allen Hervorhebungsmarkierungen (95–210).
  mesh.renderOrder = 4;
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  return {
    dispose: () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    mesh
  };
}

function disposeObject(object: THREE.Object3D, shouldDisposeResources: boolean): void {
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !shouldDisposeResources) {
      return;
    }

    node.geometry.dispose();

    if (Array.isArray(node.material)) {
      node.material.forEach((material) => material.dispose());
      return;
    }

    node.material.dispose();
  });
}

function createCoordinateLabelSprite(
  value: string,
  position: { x: number; y: number; z: number },
  resources: Array<{ material: THREE.SpriteMaterial; texture: THREE.CanvasTexture }>
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create board coordinate label context.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(33, 18, 10, 0.92)';
  context.beginPath();
  context.roundRect(12, 20, 104, 88, 28);
  context.fill();

  context.strokeStyle = 'rgba(241, 223, 194, 0.75)';
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = '#f4dfbf';
  context.font = '700 58px Georgia';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(value, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    depthWrite: false,
    map: texture,
    transparent: true
  });

  resources.push({ material, texture });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(position.x, position.y, position.z);
  sprite.scale.set(0.52, 0.52, 0.52);
  sprite.renderOrder = 50;
  return sprite;
}
