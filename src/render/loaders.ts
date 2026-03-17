import * as THREE from 'three';
import { DRACOLoader, GLTFLoader } from 'three-stdlib';
import type { ChessPieceColor, ChessPieceType } from '../chess/state';
import {
  applyPieceMaterialSlot as applySharedPieceMaterialSlot,
  getCyberMechZonePalette,
  getStarterPieceSlotPalette,
  type PieceMaterialSlot
} from './piece-material-style';

export const BOARD_MODEL_FILE = 'board.glb';
export const BOARD_CYBER_MODEL_FILE = 'board_cyber.glb';
export const DEFAULT_PIECE_ASSET_SET = 'blockout';

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
export type PieceAssetMode = 'glb' | 'mixed' | 'placeholder';
export type PieceAssetSet = 'starter' | 'blockout';
export type PieceAssetTemplates = Partial<Record<ChessPieceType, THREE.Group>>;
export type PieceAssetFileMap = Partial<Record<ChessPieceType, string>>;

export interface BoardVisualAssets {
  board: THREE.Group | null;
  loadedBoardFile: string | null;
}

export interface PieceAssetFallbackInfo {
  requested: string;
  resolved: string;
}

export type PieceAssetFallbackMap = Partial<Record<ChessPieceType, PieceAssetFallbackInfo>>;

export interface PieceVisualAssets {
  loadedPieceFiles: string[];
  pieceAssetFallbacks: PieceAssetFallbackMap;
  pieceAssetFiles: PieceAssetFileMap;
  pieceAssetSet: PieceAssetSet;
  pieceTemplates: PieceAssetTemplates;
}

export interface ChessVisualAssets extends BoardVisualAssets, PieceVisualAssets {
  loadedFiles: string[];
}

interface PieceTemplateUserData {
  preservesSourceMaterials?: boolean;
  sourceFile?: string;
  usesSourcePalette?: boolean;
}

interface PieceHighlightStyle {
  color: THREE.Color;
  emissive: THREE.Color;
  emissiveIntensity: number;
}

interface BlockoutNeonStyleSet {
  command: PieceHighlightStyle;
  core: PieceHighlightStyle;
  sensor: PieceHighlightStyle;
}

interface BlockoutPiecePalette {
  base: PieceMaterialSlot;
  command: PieceMaterialSlot;
  eye: PieceMaterialSlot;
  heart: PieceMaterialSlot;
  signal: PieceMaterialSlot;
  trim: PieceMaterialSlot;
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
const BLOCKOUT_PIECE_MODEL_DIRECTORY = 'blockout';
const BLOCKOUT_SOURCE_MATERIAL_PRESERVE_FILES = new Set(['blockout/king.glb']);
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
const BLOCKOUT_TEMPLATE_TARGET_HEIGHT_OVERRIDE_BY_TYPE: Partial<Record<ChessPieceType, number>> = {
  king: 1.36,
  rook: 1.12
};
const BLOCKOUT_TEMPLATE_MAX_FOOTPRINT_OVERRIDE_BY_TYPE: Partial<Record<ChessPieceType, number>> = {
  king: 1.68,
  rook: 0.94
};
const BLOCKOUT_TEMPLATE_GROUND_NUDGE_BY_TYPE: Partial<Record<ChessPieceType, number>> = {
  pawn: -0.035,
  rook: -0.05
};
const BLOCKOUT_BASE_OVERRIDE_TOKENS = ['eye_ring', 'foot', 'hub', 'shoulder', 'shoe', 'stabilizer_foot'];
const BLOCKOUT_STRUCTURE_TOKENS = [
  'ankle',
  'arm',
  'border',
  'fin',
  'frame',
  'joint',
  'leg',
  'neck',
  'pelvis',
  'rail',
  'ring',
  'trim'
];
const BLOCKOUT_BASE_TOKENS = ['base', 'belly', 'body', 'cap', 'cyl', 'dome', 'head', 'pod', 'shell', 'torso'];
const BLOCKOUT_CANONICAL_WHITE_BASE = '#ebf5ff';
const BLOCKOUT_CANONICAL_WHITE_EYE = '#47ebf5';
const BLOCKOUT_CANONICAL_WHITE_SIGNAL = '#d84255';
const BLOCKOUT_CANONICAL_WHITE_TRIM = '#1c3d80';
const BLOCKOUT_CANONICAL_BLACK_BASE = '#15181e';
const BLOCKOUT_CANONICAL_BLACK_NEON_RED = '#ff2e2e';
const BLOCKOUT_CANONICAL_BLACK_TRIM = '#c7a23a';
const BLOCKOUT_CANONICAL_COMMAND_NEON = '#ff8d0d';
const BLOCKOUT_NEON_SENSOR_INTENSITY = 1.85;
const BLOCKOUT_NEON_CORE_INTENSITY = 2.15;
const BLOCKOUT_NEON_COMMAND_INTENSITY = 2.35;

export async function loadRoomAsset(): Promise<THREE.Group | null> {
  try {
    return await loadModel('room.glb');
  } catch {
    return null;
  }
}

export function getExpectedModelFiles(pieceAssetSet: PieceAssetSet = DEFAULT_PIECE_ASSET_SET): string[] {
  // Das Board wird über loadedBoardFile gemeldet (cyber → board_cyber.glb,
  // Fallback → board.glb). Das Auflisten von BOARD_CYBER_MODEL_FILE als primäre
  // erwartete Datei hält die Debug-Überlagerung genau, wenn sich das neue
  // Asset vorhanden ist.
  return [BOARD_CYBER_MODEL_FILE, ...Object.keys(PIECE_MODEL_FILES).map((pieceType) => getRequestedPieceModelFile(pieceType as ChessPieceType, pieceAssetSet))];
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

export async function loadBoardVisualAsset(): Promise<BoardVisualAssets> {
  // Versuchen Sie zuerst das Cyber-Board; Fallback zum ursprünglichen board.glb, wenn nicht vorhanden.
  for (const candidateFile of [BOARD_CYBER_MODEL_FILE, BOARD_MODEL_FILE]) {
    try {
      return {
        board: prepareBoardTemplate(await loadModel(candidateFile), candidateFile),
        loadedBoardFile: candidateFile
      };
    } catch {
      // Fehlender oder beschädigter Kandidat — versuchen Sie den nächsten.
    }
  }

  return {
    board: null,
    loadedBoardFile: null
  };
}

export async function loadPieceVisualAssets(pieceAssetSet: PieceAssetSet = DEFAULT_PIECE_ASSET_SET): Promise<PieceVisualAssets> {
  const loadedPieceFiles: string[] = [];
  const pieceAssetFallbacks: PieceAssetFallbackMap = {};
  const pieceAssetFiles: PieceAssetFileMap = {};
  const pieceTemplates: PieceAssetTemplates = {};

  await Promise.all(
    Object.keys(PIECE_MODEL_FILES).map(async (pieceTypeValue) => {
      const pieceType = pieceTypeValue as ChessPieceType;
      const requestedFile = getRequestedPieceModelFile(pieceType, pieceAssetSet);

      for (const candidateFile of getPieceModelCandidateFiles(pieceType, pieceAssetSet)) {
        try {
          const model = await loadModel(candidateFile);
          pieceTemplates[pieceType] = preparePieceTemplate(model, pieceType, candidateFile);
          pieceAssetFiles[pieceType] = candidateFile;
          loadedPieceFiles.push(candidateFile);

          if (candidateFile !== requestedFile) {
            pieceAssetFallbacks[pieceType] = {
              requested: requestedFile,
              resolved: candidateFile
            };
          }

          return;
        } catch {
          // Fehlende oder beschädigte Modelle fallen absichtlich auf den nächsten Kandidaten zurück, dann auf prozeduale Platzhalter.
        }
      }
    })
  );

  loadedPieceFiles.sort();

  return {
    loadedPieceFiles,
    pieceAssetFallbacks,
    pieceAssetFiles,
    pieceAssetSet,
    pieceTemplates
  };
}

export async function loadChessVisualAssets(pieceAssetSet: PieceAssetSet = DEFAULT_PIECE_ASSET_SET): Promise<ChessVisualAssets> {
  const [boardAssets, pieceAssets] = await Promise.all([loadBoardVisualAsset(), loadPieceVisualAssets(pieceAssetSet)]);
  const loadedFiles = [
    ...(boardAssets.loadedBoardFile ? [boardAssets.loadedBoardFile] : []),
    ...pieceAssets.loadedPieceFiles
  ];

  loadedFiles.sort();

  return {
    ...boardAssets,
    loadedFiles,
    ...pieceAssets
  };
}

export function createBoardAssetInstance(boardTemplate: THREE.Group): THREE.Group {
  const clone = cloneSceneWithOwnResources(boardTemplate);
  clone.name = 'board-asset-instance';
  return clone;
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

  const clone = cloneSceneWithOwnResources(template);
  clone.name = `${type}-${color}-asset-instance`;
  applyPiecePalette(clone, color);
  return clone;
}

export function modelPath(fileName: string): string {
  return `/models/${fileName}?v=7`;
}

async function loadModel(fileName: string): Promise<THREE.Group> {
  const gltf = await loader.loadAsync(modelPath(fileName));
  const root = new THREE.Group();
  root.name = fileName.replace('.glb', '').replace(/\//g, '-');

  for (const child of gltf.scene.children.slice()) {
    root.add(child);
  }

  gltf.scene.clear();
  enableShadows(root);
  return root;
}

function getPieceModelCandidateFiles(pieceType: ChessPieceType, pieceAssetSet: PieceAssetSet): string[] {
  const starterFile = PIECE_MODEL_FILES[pieceType];

  if (pieceAssetSet === 'starter') {
    return [starterFile];
  }

  return [getRequestedPieceModelFile(pieceType, pieceAssetSet), starterFile];
}

function getRequestedPieceModelFile(pieceType: ChessPieceType, pieceAssetSet: PieceAssetSet): string {
  const starterFile = PIECE_MODEL_FILES[pieceType];

  if (pieceAssetSet === 'starter') {
    return starterFile;
  }

  return `${BLOCKOUT_PIECE_MODEL_DIRECTORY}/${starterFile}`;
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

function preparePieceTemplate(root: THREE.Group, type: ChessPieceType, sourceFile: string): THREE.Group {
  root.name = `${type}-template`;
  pruneTemplateHelperMeshes(root, sourceFile);
  enableShadows(root);
  const preserveSourceMaterials = shouldPreserveSourceMaterials(sourceFile);
  root.userData = {
    ...(root.userData as PieceTemplateUserData),
    preservesSourceMaterials: preserveSourceMaterials,
    sourceFile,
    usesSourcePalette: sourceFile.startsWith(`${BLOCKOUT_PIECE_MODEL_DIRECTORY}/`)
  };

  root.updateMatrixWorld(true);

  const initialBounds = new THREE.Box3().setFromObject(root);
  const size = initialBounds.getSize(new THREE.Vector3());
  const targetHeight = getPieceTargetHeight(type, sourceFile);
  const heightScale = targetHeight / Math.max(size.y, 0.001);
  const footprintScale = getPieceMaxFootprint(type, sourceFile) / Math.max(size.x, size.z, 0.001);
  const scale = Math.min(heightScale, footprintScale);

  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(root);
  const center = scaledBounds.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.y -= scaledBounds.min.y;
  root.position.z -= center.z;
  root.position.y += getBlockoutTemplateGroundNudge(sourceFile, type);
  root.updateMatrixWorld(true);

  return root;
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
  if (preservesSourceMaterials(root) && color === 'white') {
    applyPreservedBlockoutTrimOverrides(root, color);
    applyBlockoutNeonSet(root, color);
    return;
  }

  if (usesSourcePalette(root)) {
    applySourcePalette(root, color);
    applyBlockoutNeonSet(root, color);
    return;
  }

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

  applyBlockoutNeonSet(root, color);
}

function applySourcePalette(root: THREE.Object3D, color: ChessPieceColor): void {
  const palette = getCanonicalBlockoutPalette(color);

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(node.material) ? node.material : [node.material];

    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        continue;
      }

      const slot = getBlockoutPaletteSlot(node, material, palette);
      if (!slot) {
        material.transparent = true;
        continue;
      }

      material.color = new THREE.Color(slot.color);
      material.metalness = slot.metalness;
      material.roughness = slot.roughness;
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
      material.toneMapped = true;
      material.transparent = true;
    }
  });
}

function applyPreservedBlockoutTrimOverrides(root: THREE.Object3D, color: ChessPieceColor): void {
  const sourceFile = getPieceSourceFile(root);

  if (color !== 'white' || sourceFile !== 'blockout/king.glb') {
    return;
  }

  const palette = getCanonicalBlockoutPalette(color);

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    const nodeName = node.name.toLowerCase();
    const materials = Array.isArray(node.material) ? node.material : [node.material];

    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        continue;
      }

      const materialName = material.name.toLowerCase();

      if (!isKingOuterRingTrimPart(nodeName, materialName)) {
        continue;
      }

      applyPieceMaterialSlot(material, palette.trim);
    }
  });
}

function getBlockoutPaletteSlot(
  node: THREE.Mesh,
  material: THREE.MeshStandardMaterial,
  palette: BlockoutPiecePalette
): PieceMaterialSlot | null {
  const nodeName = node.name.toLowerCase();
  const materialName = material.name.toLowerCase();
  const token = `${nodeName} ${materialName}`;

  if (isRookWheelBasePart(nodeName)) {
    return palette.base;
  }

  if (isRookWheelTrimPart(nodeName)) {
    return palette.trim;
  }

  if (isBishopEyeRingTrimPart(nodeName) || isRookCoreFrameTrimPart(nodeName)) {
    return palette.trim;
  }

  if (isKnightEyeRingTrimPart(nodeName)) {
    return palette.trim;
  }

  if (isKingOuterRingTrimPart(nodeName, materialName)) {
    return palette.trim;
  }

  if (containsAnyToken(token, BLOCKOUT_BASE_OVERRIDE_TOKENS)) {
    return palette.base;
  }

  if (isRookSignalHighlight(nodeName)) {
    return palette.signal;
  }

  if (isHeartHighlight(nodeName, materialName)) {
    return palette.heart;
  }

  if (isEmblemHighlight(nodeName, materialName)) {
    return palette.command;
  }

  if (isEyeHighlight(nodeName, materialName)) {
    return palette.eye;
  }

  if (containsAnyToken(materialName, ['trim', 'structure', 'mat_accent'])) {
    return palette.trim;
  }

  if (containsAnyToken(materialName, ['body', 'primary', 'secondary', 'mat_body'])) {
    return palette.base;
  }

  if (containsAnyToken(token, BLOCKOUT_STRUCTURE_TOKENS)) {
    return palette.trim;
  }

  if (containsAnyToken(token, BLOCKOUT_BASE_TOKENS)) {
    return palette.base;
  }

  return palette.base;
}

function containsAnyToken(value: string, tokens: string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function getCanonicalBlockoutPalette(color: ChessPieceColor): BlockoutPiecePalette {
  const zonePalette = getCyberMechZonePalette(color);
  const whitePalette: BlockoutPiecePalette = {
    base: { ...zonePalette.armor, color: BLOCKOUT_CANONICAL_WHITE_BASE },
    command: { ...zonePalette.command, color: BLOCKOUT_CANONICAL_COMMAND_NEON },
    eye: { ...zonePalette.sensor, color: BLOCKOUT_CANONICAL_WHITE_EYE },
    heart: { ...zonePalette.core, color: BLOCKOUT_CANONICAL_WHITE_SIGNAL },
    signal: { ...zonePalette.sensor, color: BLOCKOUT_CANONICAL_WHITE_EYE },
    trim: { ...zonePalette.frame, color: BLOCKOUT_CANONICAL_WHITE_TRIM }
  };

  if (color === 'white') {
    return whitePalette;
  }

  return {
    base: { ...zonePalette.armor, color: BLOCKOUT_CANONICAL_BLACK_BASE },
    command: { ...zonePalette.command, color: BLOCKOUT_CANONICAL_COMMAND_NEON },
    eye: { ...zonePalette.sensor, color: BLOCKOUT_CANONICAL_BLACK_NEON_RED },
    heart: { ...zonePalette.core, color: BLOCKOUT_CANONICAL_BLACK_NEON_RED },
    signal: { ...zonePalette.sensor, color: BLOCKOUT_CANONICAL_BLACK_NEON_RED },
    trim: { ...zonePalette.frame, color: BLOCKOUT_CANONICAL_BLACK_TRIM }
  };
}

function getBlockoutTemplateGroundNudge(sourceFile: string, type: ChessPieceType): number {
  if (!sourceFile.startsWith(`${BLOCKOUT_PIECE_MODEL_DIRECTORY}/`)) {
    return 0;
  }

  return BLOCKOUT_TEMPLATE_GROUND_NUDGE_BY_TYPE[type] ?? 0;
}

function getPieceTargetHeight(type: ChessPieceType, sourceFile: string): number {
  if (!sourceFile.startsWith(`${BLOCKOUT_PIECE_MODEL_DIRECTORY}/`)) {
    return PIECE_TARGET_HEIGHT[type];
  }

  return BLOCKOUT_TEMPLATE_TARGET_HEIGHT_OVERRIDE_BY_TYPE[type] ?? PIECE_TARGET_HEIGHT[type];
}

function getPieceMaxFootprint(type: ChessPieceType, sourceFile: string): number {
  if (!sourceFile.startsWith(`${BLOCKOUT_PIECE_MODEL_DIRECTORY}/`)) {
    return PIECE_MAX_FOOTPRINT;
  }

  return BLOCKOUT_TEMPLATE_MAX_FOOTPRINT_OVERRIDE_BY_TYPE[type] ?? PIECE_MAX_FOOTPRINT;
}

function pruneTemplateHelperMeshes(root: THREE.Object3D, sourceFile: string): void {
  const removablePrefixes = getTemplateHelperNodePrefixes(sourceFile);

  if (removablePrefixes.length === 0) {
    return;
  }

  const nodesToRemove: THREE.Object3D[] = [];

  root.traverse((node) => {
    if (node === root) {
      return;
    }

    const nodeName = node.name.toLowerCase();

    if (removablePrefixes.some((prefix) => nodeName.startsWith(prefix))) {
      nodesToRemove.push(node);
    }
  });

  for (const node of nodesToRemove) {
    node.removeFromParent();
  }
}

function getTemplateHelperNodePrefixes(sourceFile: string): readonly string[] {
  if (sourceFile === 'blockout/king.glb') {
    return ['knight_hover_'];
  }

  return [];
}

function shouldPreserveSourceMaterials(sourceFile: string): boolean {
  return BLOCKOUT_SOURCE_MATERIAL_PRESERVE_FILES.has(sourceFile);
}

function applyBlockoutNeonSet(root: THREE.Object3D, color: ChessPieceColor): void {
  const sourceFile = getPieceSourceFile(root);

  if (!sourceFile?.startsWith(`${BLOCKOUT_PIECE_MODEL_DIRECTORY}/`)) {
    return;
  }

  const neonStyles = getBlockoutNeonStyles(color);

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    const nodeName = node.name.toLowerCase();
    const materials = Array.isArray(node.material) ? node.material : [node.material];

    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        continue;
      }

      const materialName = material.name.toLowerCase();
      const highlightStyle = getBlockoutNeonStyleForPart(nodeName, materialName, sourceFile, neonStyles);

      if (!highlightStyle) {
        continue;
      }

      setPieceHighlightStyle(material, highlightStyle);
    }
  });
}

function isRookWheelBasePart(nodeName: string): boolean {
  return nodeName === 'rook_wheel' || nodeName === 'rook_wheel_hub';
}

function isRookWheelTrimPart(nodeName: string): boolean {
  return nodeName === 'rook_wheel_axle';
}

function isRookSignalHighlight(nodeName: string): boolean {
  return nodeName === 'rook_core_shield' || nodeName === 'rook_eye_lens';
}

function isRookCoreFrameTrimPart(nodeName: string): boolean {
  return nodeName === 'rook_core_frame';
}

function isBishopEyeRingTrimPart(nodeName: string): boolean {
  return nodeName === 'bishop_eye_ring';
}

function isKnightEyeRingTrimPart(nodeName: string): boolean {
  return nodeName.startsWith('springer_eye_ring') || nodeName.startsWith('spr_eyering');
}

function isKingOuterRingTrimPart(nodeName: string, materialName: string): boolean {
  return (
    nodeName.startsWith('springer_eye_ring') ||
    nodeName.startsWith('spr_eyering') ||
    nodeName.startsWith('knight_crown_') ||
    materialName.startsWith('knight_trim_dark')
  );
}

function isKingEyeNode(nodeName: string): boolean {
  return nodeName === 'koenig_head_eye' || nodeName === 'k_eye';
}

function isKingEmblemNode(nodeName: string): boolean {
  return nodeName === 'koenig_emblem' || nodeName === 'k_emblem';
}

function getBlockoutNeonStyles(color: ChessPieceColor): BlockoutNeonStyleSet {
  if (color === 'white') {
    return {
      command: createNeonHighlightStyle(BLOCKOUT_CANONICAL_COMMAND_NEON, BLOCKOUT_NEON_COMMAND_INTENSITY),
      core: createNeonHighlightStyle(BLOCKOUT_CANONICAL_WHITE_SIGNAL, BLOCKOUT_NEON_CORE_INTENSITY),
      sensor: createNeonHighlightStyle(BLOCKOUT_CANONICAL_WHITE_EYE, BLOCKOUT_NEON_SENSOR_INTENSITY)
    };
  }

  return {
    command: createNeonHighlightStyle(BLOCKOUT_CANONICAL_COMMAND_NEON, BLOCKOUT_NEON_COMMAND_INTENSITY),
    core: createNeonHighlightStyle(BLOCKOUT_CANONICAL_BLACK_NEON_RED, BLOCKOUT_NEON_CORE_INTENSITY),
    sensor: createNeonHighlightStyle(BLOCKOUT_CANONICAL_BLACK_NEON_RED, BLOCKOUT_NEON_SENSOR_INTENSITY)
  };
}

function createNeonHighlightStyle(color: string, emissiveIntensity: number): PieceHighlightStyle {
  const neonColor = new THREE.Color(color);

  return {
    color: neonColor.clone(),
    emissive: neonColor.clone(),
    emissiveIntensity
  };
}

function getBlockoutNeonStyleForPart(
  nodeName: string,
  materialName: string,
  sourceFile: string,
  neonStyles: BlockoutNeonStyleSet
): PieceHighlightStyle | null {
  if (isBlockoutTrimProtectedPart(nodeName, materialName)) {
    return null;
  }

  if (sourceFile === 'blockout/bishop.glb' && isHeartHighlight(nodeName, materialName)) {
    return neonStyles.sensor;
  }

  if (sourceFile === 'blockout/rook.glb' && nodeName === 'rook_core_shield') {
    return neonStyles.sensor;
  }

  if (sourceFile === 'blockout/king.glb' && isKingEyeNode(nodeName)) {
    return neonStyles.command;
  }

  if (isCommandNeonPart(nodeName, materialName, sourceFile)) {
    return neonStyles.command;
  }

  if (isCoreNeonPart(nodeName, materialName)) {
    return neonStyles.core;
  }

  if (isSensorNeonPart(nodeName, materialName)) {
    return neonStyles.sensor;
  }

  return null;
}

function setPieceHighlightStyle(material: THREE.MeshStandardMaterial, style: PieceHighlightStyle): void {
  material.color.copy(style.color);
  material.emissive.copy(style.emissive);
  material.emissiveIntensity = style.emissiveIntensity;
  material.toneMapped = false;
  material.transparent = true;
}

function applyPieceMaterialSlot(material: THREE.MeshStandardMaterial, slot: PieceMaterialSlot): void {
  material.color = new THREE.Color(slot.color);
  material.metalness = slot.metalness;
  material.roughness = slot.roughness;
  material.emissive.setHex(0x000000);
  material.emissiveIntensity = 0;
  material.toneMapped = true;
  material.transparent = true;
}

function isBlockoutTrimProtectedPart(nodeName: string, materialName: string): boolean {
  return (
    isBishopEyeRingTrimPart(nodeName) ||
    isKnightEyeRingTrimPart(nodeName) ||
    isKingOuterRingTrimPart(nodeName, materialName) ||
    isRookCoreFrameTrimPart(nodeName)
  );
}

function isCommandNeonPart(nodeName: string, materialName: string, sourceFile: string): boolean {
  if (sourceFile === 'blockout/king.glb' && materialName.startsWith('koenig_orange')) {
    return true;
  }

  return isEmblemHighlight(nodeName, materialName);
}

function isEmblemHighlight(nodeName: string, materialName: string): boolean {
  return containsAnyToken(`${nodeName} ${materialName}`, ['badge', 'crest', 'emblem', 'glyph', 'insignia', 'sigil']);
}

function isCoreNeonPart(nodeName: string, materialName: string): boolean {
  return isHeartHighlight(nodeName, materialName);
}

function isSensorNeonPart(nodeName: string, materialName: string): boolean {
  return isEyeHighlight(nodeName, materialName);
}

function isEyeHighlight(nodeName: string, materialName: string): boolean {
  if (nodeName.includes('sensor_core')) {
    return true;
  }

  if (nodeName.includes('springer_eye') || nodeName.includes('spr_eye')) {
    return true;
  }

  if (nodeName.includes('springer_arm_glow') || nodeName.includes('spr_ag_')) {
    return true;
  }

  if (nodeName.includes('eye_lens')) {
    return true;
  }

  return nodeName.includes('visor') && materialName.includes('glow');
}

function isHeartHighlight(nodeName: string, materialName: string): boolean {
  if (nodeName.includes('heart') && !nodeName.includes('border')) {
    return true;
  }

  return materialName.includes('glow_ht');
}

function createComplementarySlot(slot: PieceMaterialSlot, darknessBias = 0): PieceMaterialSlot {
  const color = getComplementaryColor(new THREE.Color(slot.color));

  if (darknessBias > 0) {
    color.lerp(new THREE.Color(0x000000), THREE.MathUtils.clamp(darknessBias, 0, 1));
  }

  return {
    color: `#${color.getHexString()}`,
    metalness: slot.metalness,
    roughness: slot.roughness
  };
}

function getComplementaryColor(color: THREE.Color): THREE.Color {
  return new THREE.Color(1 - color.r, 1 - color.g, 1 - color.b);
}

function usesSourcePalette(root: THREE.Object3D): boolean {
  return Boolean((root.userData as PieceTemplateUserData).usesSourcePalette);
}

function preservesSourceMaterials(root: THREE.Object3D): boolean {
  return Boolean((root.userData as PieceTemplateUserData).preservesSourceMaterials);
}

function getPieceSourceFile(root: THREE.Object3D): string | null {
  return ((root.userData as PieceTemplateUserData).sourceFile ?? null);
}
