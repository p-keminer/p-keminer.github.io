import * as THREE from 'three';
import { DRACOLoader, GLTFLoader } from 'three-stdlib';
import type { ChessPieceColor, ChessPieceType } from '../chess/state';
import {
  applyPieceMaterialSlot as applySharedPieceMaterialSlot,
  getStarterPieceSlotPalette
} from './piece-material-style';

export const BOARD_MODEL_FILE = 'board.glb';
export const BOARD_CYBER_MODEL_FILE = 'board_cyber.glb';
export const ROOM_REDESIGN_MODEL_FILE = 'room-redesign.glb';
export const LEGACY_ROOM_MODEL_FILE = 'room.glb';

const ROOM_MODEL_CANDIDATES = [ROOM_REDESIGN_MODEL_FILE, LEGACY_ROOM_MODEL_FILE] as const;

// ─── Cyber-Board-Ausrichtungskonstanten ──────────────────────────────────────
// Das Blender-Cyber-Board verwendet SQ=0,50 und GAP=0,012, sodass jeder
// Quadratschritt 0,512 Blender-Einheiten beträgt. Das Spielgitter verwendet
// einen Schritt von 1,0 Einheiten pro Quadrat. Die Anwendung dieser
// einheitlichen Skalierung macht einen Blender-Schritt gleich einer Spieleinheit.
const BOARD_CYBER_SCALE = 1.0 / 0.512; // ≈ 1.953125

export const PIECE_MODEL_FILES: Record<ChessPieceType, string> = {
  bishop: 'bishop.glb',
  king: 'king.glb',
  knight: 'knight.glb',
  pawn: 'pawn.glb',
  queen: 'queen.glb',
  rook: 'rook.glb'
};

export type BoardAssetMode = 'glb' | 'placeholder';
export type AssetLoadProgressReporter = (progress: number) => void;
export type PieceAssetMode = 'glb' | 'mixed' | 'placeholder';
export type PieceAssetTemplates = Partial<Record<ChessPieceType, THREE.Group>>;

export interface BoardVisualAssets {
  board: THREE.Group | null;
  loadedBoardFile: string | null;
}

export interface PieceVisualAssets {
  loadedPieceFiles: string[];
  pieceTemplates: PieceAssetTemplates;
}

const PIECE_TARGET_HEIGHT: Record<ChessPieceType, number> = {
  bishop: 1.04,
  king: 1.2,
  knight: 0.98,
  pawn: 0.72,
  queen: 1.1,
  rook: 0.9
};

const PIECE_MAX_FOOTPRINT = 0.72;
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({ type: 'wasm' });
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
function applyRoomRedesignMaterialOverrides(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    if (node.name === 'Embedded_Lamp_Shade') {
      const lampShadeMaterial = new THREE.MeshBasicMaterial({ color: 0x020203 });
      lampShadeMaterial.name = 'MAT_Lamp_Shade_Unlit_Black';
      node.material = lampShadeMaterial;
      node.castShadow = true;
      node.receiveShadow = false;
      return;
    }

    if (node.name === 'Left_Window_Glass') {
      const glassMaterials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of glassMaterials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.transparent = true;
        material.opacity = 0.18;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;
        material.roughness = 0.16;
        material.metalness = 0.05;
        material.needsUpdate = true;
      }
      node.renderOrder = 2;
      node.castShadow = false;
      node.receiveShadow = false;
      return;
    }

    if (/^Left_Window_(?:Night_Sky|Moon|Stars)$/.test(node.name)) {
      node.castShadow = false;
      node.receiveShadow = false;
    }
  });
}

export async function loadRoomAsset(onProgress?: AssetLoadProgressReporter): Promise<THREE.Group | null> {
  const reportProgress = createMonotonicProgressReporter(onProgress);
  reportProgress(0);

  for (const candidateFile of ROOM_MODEL_CANDIDATES) {
    try {
      const room = await loadModel(candidateFile, reportProgress);
      if (candidateFile === ROOM_REDESIGN_MODEL_FILE) {
        applyRoomRedesignMaterialOverrides(room);
      }
      room.userData.roomAssetFile = candidateFile;
      reportProgress(1);
      return room;
    } catch {
      // Das Redesign ist das primaere Asset. Der bestehende Raum bleibt als
      // bewusst nicht-destruktiver Rueckfall erhalten.
    }
  }

  reportProgress(1);
  return null;
}

export function getBoardAssetMode(boardTemplate: THREE.Group | null): BoardAssetMode {
  return boardTemplate ? 'glb' : 'placeholder';
}

export function getPieceAssetMode(pieceTemplates: PieceAssetTemplates): PieceAssetMode {
  const loadedCount = Object.keys(pieceTemplates).length;

  if (loadedCount === 0) {
    return 'placeholder';
  }

  return loadedCount === Object.keys(PIECE_MODEL_FILES).length ? 'glb' : 'mixed';
}

export async function loadBoardVisualAsset(onProgress?: AssetLoadProgressReporter): Promise<BoardVisualAssets> {
  const reportProgress = createMonotonicProgressReporter(onProgress);
  reportProgress(0);

  // Versuchen Sie zuerst das Cyber-Board; Fallback zum ursprünglichen board.glb, wenn nicht vorhanden.
  for (const candidateFile of [BOARD_CYBER_MODEL_FILE, BOARD_MODEL_FILE]) {
    try {
      const board = prepareBoardTemplate(await loadModel(candidateFile, reportProgress), candidateFile);
      reportProgress(1);
      return {
        board,
        loadedBoardFile: candidateFile
      };
    } catch {
      // Fehlender oder beschädigter Kandidat — versuchen Sie den nächsten.
    }
  }

  reportProgress(1);
  return {
    board: null,
    loadedBoardFile: null
  };
}

export async function loadPieceVisualAssets(
  onProgress?: AssetLoadProgressReporter
): Promise<PieceVisualAssets> {
  const loadedPieceFiles: string[] = [];
  const pieceTemplates: PieceAssetTemplates = {};
  const pieceTypes = Object.keys(PIECE_MODEL_FILES) as ChessPieceType[];
  const pieceProgress = new Map<ChessPieceType, number>(pieceTypes.map(pieceType => [pieceType, 0]));
  const reportPieceProgress = (pieceType: ChessPieceType, progress: number): void => {
    const previousProgress = pieceProgress.get(pieceType) ?? 0;
    pieceProgress.set(pieceType, Math.max(previousProgress, clampLoadProgress(progress)));
    const combinedProgress = pieceTypes.reduce(
      (total, currentPieceType) => total + (pieceProgress.get(currentPieceType) ?? 0),
      0
    ) / pieceTypes.length;
    onProgress?.(combinedProgress);
  };

  onProgress?.(0);

  await Promise.all(
    pieceTypes.map(async pieceType => {
      const modelFile = PIECE_MODEL_FILES[pieceType];

      try {
        const model = await loadModel(modelFile, progress => reportPieceProgress(pieceType, progress));
        pieceTemplates[pieceType] = preparePieceTemplate(model, pieceType);
        loadedPieceFiles.push(modelFile);
      } catch {
        // Fehlende oder beschädigte Modelle fallen absichtlich auf prozedurale Platzhalter zurück.
      }

      reportPieceProgress(pieceType, 1);
    })
  );

  onProgress?.(1);
  loadedPieceFiles.sort();

  return {
    loadedPieceFiles,
    pieceTemplates
  };
}

export function createBoardAssetInstance(boardTemplate: THREE.Group): THREE.Group {
  const clone = cloneSceneWithOwnResources(boardTemplate);
  clone.name = 'board-asset-instance';
  return clone;
}

// Cache für geteilte Materialien/Geometrien pro Typ+Farbe.
// Erster Klon erstellt eigene Ressourcen + Palette, alle weiteren teilen sie.
const pieceAssetCache = new Map<string, THREE.Group>();

export function clearPieceAssetCache(): void {
  pieceAssetCache.clear();
}

export function createPieceAssetInstance(
  pieceTemplates: PieceAssetTemplates,
  type: ChessPieceType,
  color: ChessPieceColor
): THREE.Group | null {
  const template = pieceTemplates[type];

  if (!template) {
    return null;
  }

  const cacheKey = `${type}-${color}`;
  let canonical = pieceAssetCache.get(cacheKey);

  if (!canonical) {
    // Erster Klon: eigene Geometrie + Material + Palette
    canonical = cloneSceneWithOwnResources(template);
    canonical.name = `${cacheKey}-canonical`;
    applyPiecePalette(canonical, color);
    pieceAssetCache.set(cacheKey, canonical);
  }

  // Weitere Klone: teilen Geometrie, klonen Material für individuelle Opacity
  const instance = cloneSceneWithSharedGeometry(canonical);
  instance.name = `${type}-${color}-asset-instance`;
  return instance;
}

export function modelPath(fileName: string): string {
  return `/models/${fileName}?v=37`;
}

function clampLoadProgress(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function createMonotonicProgressReporter(
  reporter?: AssetLoadProgressReporter
): AssetLoadProgressReporter {
  let previousProgress = 0;

  return progress => {
    previousProgress = Math.max(previousProgress, clampLoadProgress(progress));
    reporter?.(previousProgress);
  };
}

async function loadModel(
  fileName: string,
  onProgress?: AssetLoadProgressReporter
): Promise<THREE.Group> {
  const reportProgress = createMonotonicProgressReporter(onProgress);
  const gltf = await loader.loadAsync(modelPath(fileName), event => {
    if (event.total > 0) {
      // The final six percent are reserved for GLB parsing and Draco decoding,
      // which continue after the network transfer has completed.
      reportProgress((event.loaded / event.total) * 0.94);
    }
  });
  reportProgress(1);
  const root = new THREE.Group();
  root.name = fileName.replace('.glb', '').replace(/\//g, '-');

  for (const child of gltf.scene.children.slice()) {
    root.add(child);
  }

  gltf.scene.clear();
  enableShadows(root);
  return root;
}

function prepareBoardTemplate(root: THREE.Group, sourceFile: string): THREE.Group {
  root.name = 'board-template';

  if (sourceFile === BOARD_CYBER_MODEL_FILE) {
    // Skalieren Sie das Blender-Asset so, dass sein 0,512-Unit-Quadratschritt
    // dem 1,0-Unit-Quadratschritt des Spiels entspricht. Nach dieser Transformation
    // sitzt die Board-Oberfläche bei ungefähr Y ≈ 0,068, was mit dem Fallback-Board-
    // Platzhalter übereinstimmt (dessen Quadratoberflächenspitzen bei Y ≈ 0,07 liegen).
    // Es wird keine zusätzliche Y-Verschiebung angewendet, damit die Figuren mit ihren
    // Basen bei Y = 0 stehen bleiben.
    root.scale.setScalar(BOARD_CYBER_SCALE);

    // Stellen Sie das Emissiv-Glühen wieder her, das die ACESFilmic-Tonabbildung
    // komprimiert. Materialien mit dem Namen emit_* sind die Cyan-Akzentstreifen,
    // Eckenstifte und der Energiekern. Das Einstellen von toneMapped=false ermöglicht
    // das Rendern mit voller HDR-Helligkeit, statt von der Tonkurve in die
    // Mitte-Grau gezogen zu werden.
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }

      const materials = Array.isArray(node.material) ? node.material : [node.material];

      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) {
          continue;
        }

        // Cyan-Akzentstreifen, Eckenstifte, Energiekern — verstärken Sie die
        // Blender-Emissionsstärke, die die ACESFilmic-Tonabbildung komprimieren würde.
        if (material.name.toLowerCase().startsWith('emit_')) {
          material.toneMapped = false;
          material.emissiveIntensity = material.emissiveIntensity > 0
            ? Math.max(material.emissiveIntensity, 1.0) * 2.0
            : 3.0;
        }

        // Holografische Projektionskacheln — Blender definiert die Basisfarbe,
        // Emission und Alpha (sq_light: emit 5,0 alpha 0,52; sq_dark: emit 2,5
        // alpha 0,28). GLTF trägt alles davon über KHR_materials_emissive_strength
        // + alphaMode=BLEND. Wir müssen nur die Tonabbildung deaktivieren, damit
        // die projizierte Lichtfarbe nicht komprimiert wird. depthWrite=false
        // stellt sicher, dass Hervorhebungsmarkierungen (Hover, Auswahl, Schach)
        // immer über den halbtransparenten Projektionskacheln sichtbar sind.
        if (material.name === 'sq_light' || material.name === 'sq_dark') {
          material.toneMapped = false;
          material.depthWrite = false;
          // Fallback-Intensitäten, wenn KHR_materials_emissive_strength nicht vorhanden ist.
          if (material.emissiveIntensity === 0) {
            material.emissiveIntensity = material.name === 'sq_light' ? 5.0 : 2.0;
          }
          // Fallback-Transparenz, wenn alphaMode nicht übertragen wurde.
          if (!material.transparent) {
            material.transparent = true;
            material.opacity = material.name === 'sq_light' ? 0.38 : 0.16;
          }
        }

        // Einheitliches Projektionsfeld — die große durchscheinende Ebene zwischen
        // der physischen Basis und den schwebenden Quadratkacheln. Mit depthWrite=false
        // gekennzeichnet, damit es die Kacheln oder Hervorhebungsmarkierungen darüber
        // niemals verdeckt.
        if (material.name === 'proj_field_mat') {
          material.toneMapped = false;
          material.depthWrite = false;
          if (!material.transparent) {
            material.transparent = true;
            material.opacity = 0.14;
          }
        }
      }
    });
  }

  enableShadows(root);
  return root;
}

function preparePieceTemplate(root: THREE.Group, type: ChessPieceType): THREE.Group {
  root.name = `${type}-template`;
  enableShadows(root);
  root.updateMatrixWorld(true);

  const initialBounds = new THREE.Box3().setFromObject(root);
  const size = initialBounds.getSize(new THREE.Vector3());
  const heightScale = PIECE_TARGET_HEIGHT[type] / Math.max(size.y, 0.001);
  const footprintScale = PIECE_MAX_FOOTPRINT / Math.max(size.x, size.z, 0.001);
  const scale = Math.min(heightScale, footprintScale);

  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(root);
  const center = scaledBounds.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.y -= scaledBounds.min.y;
  root.position.z -= center.z;
  root.updateMatrixWorld(true);

  return root;
}

function cloneSceneWithSharedGeometry(template: THREE.Group): THREE.Group {
  const clone = template.clone(true);

  clone.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    node.castShadow = true;
    node.receiveShadow = true;
    // Geometrie wird geteilt (großer Speicher-Gewinn).
    // Material wird geklont damit Opacity/Visibility pro Figur individuell bleibt.
    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => material.clone());
      return;
    }

    node.material = node.material.clone();
  });

  return clone;
}

function cloneSceneWithOwnResources(template: THREE.Group): THREE.Group {
  const clone = template.clone(true);

  clone.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    node.castShadow = true;
    node.receiveShadow = true;
    node.geometry = node.geometry.clone();

    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => material.clone());
      return;
    }

    node.material = node.material.clone();
  });

  return clone;
}

function enableShadows(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function applyPiecePalette(root: THREE.Object3D, color: ChessPieceColor): void {
  const palette = getStarterPieceSlotPalette(color);

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(node.material) ? node.material : [node.material];

    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        continue;
      }

      const slotName = material.name.toLowerCase();
      const token = slotName.includes('accent') ? 'accent' : slotName.includes('trim') ? 'trim' : 'body';
      const slot = palette[token];

      applySharedPieceMaterialSlot(material, slot);
    }
  });
}
