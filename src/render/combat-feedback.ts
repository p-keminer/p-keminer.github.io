import * as THREE from 'three';
import { getCombatFlavorProfile, type CombatFlavorProfile } from '../app/combat-flavor';
import type { ChessPieceColor } from '../chess/state';
import type {
  CombatPresentationBindings,
  CombatPresentationEventInput,
  CombatPresentationPhase,
  CombatPresentationStateInput
} from './combat-presentation';

const IMPACT_FLASH_COLOR = new THREE.Color('#dff7ff');
const SHUTDOWN_COLOR = new THREE.Color('#ff6a3d');
const SPARK_COLOR = new THREE.Color('#ffb347');
const WHITE_SIGNAL_COLOR = new THREE.Color('#47ebf5');
const BLACK_SIGNAL_COLOR = new THREE.Color('#ff2e2e');
const COMMAND_SIGNAL_COLOR = new THREE.Color('#ff8d0d');

export interface CombatFeedbackSnapshot {
  active: boolean;
  attackerFlavorLabel: string | null;
  corePulseActive: boolean;
  impactPulseActive: boolean;
  phase: CombatPresentationPhase | null;
  progress: number;
  servoAccentActive: boolean;
  shutdownActive: boolean;
  sparkActive: boolean;
  victimFlavorLabel: string | null;
}

export interface CombatFeedbackController {
  clear: () => CombatFeedbackSnapshot;
  getSnapshot: () => CombatFeedbackSnapshot;
  syncState: (input: CombatPresentationStateInput, bindings: CombatPresentationBindings | null) => boolean;
}

interface EffectPalette {
  command: THREE.Color;
  primary: THREE.Color;
}

interface EffectResources {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
}

interface FeedbackMaterialPose {
  emissive: THREE.Color;
  emissiveIntensity: number;
  material: THREE.MeshStandardMaterial;
}

interface ActiveCombatFeedback {
  attackerFlavor: CombatFlavorProfile;
  attackerRoot: THREE.Group;
  corePulse: THREE.Mesh;
  event: CombatPresentationEventInput;
  impactPulse: THREE.Mesh;
  key: string;
  phase: CombatPresentationPhase;
  progress: number;
  resources: EffectResources;
  servoAccent: THREE.Mesh;
  shutdownBeacon: THREE.Mesh;
  sparkMeshes: THREE.Mesh[];
  sparkRoot: THREE.Group;
  victimFlavor: CombatFlavorProfile;
  victimMaterialPoses: FeedbackMaterialPose[];
  victimRoot: THREE.Group;
}

export function createCombatFeedbackController(): CombatFeedbackController {
  let activeFeedback: ActiveCombatFeedback | null = null;

  return {
    clear: () => {
      const snapshot = getSnapshot(activeFeedback);

      if (!activeFeedback) {
        return snapshot;
      }

      restoreVictimMaterials(activeFeedback.victimMaterialPoses);
      activeFeedback.attackerRoot.removeFromParent();
      activeFeedback.victimRoot.removeFromParent();
      disposeResources(activeFeedback.resources);
      activeFeedback = null;
      return snapshot;
    },
    getSnapshot: () => getSnapshot(activeFeedback),
    syncState: (input, bindings) => {
      if (input.mode !== 'combat' || !input.combatEvent || !input.combatPhase || !bindings) {
        return false;
      }

      const nextKey = getCombatFeedbackKey(input.combatEvent);

      if (activeFeedback?.key !== nextKey) {
        if (activeFeedback) {
          restoreVictimMaterials(activeFeedback.victimMaterialPoses);
          activeFeedback.attackerRoot.removeFromParent();
          activeFeedback.victimRoot.removeFromParent();
          disposeResources(activeFeedback.resources);
        }

        activeFeedback = createActiveCombatFeedback(input.combatEvent, bindings);
      }

      if (!activeFeedback) {
        return false;
      }

      const nextProgress = clamp01(input.combatPhaseProgress);
      const didChange =
        activeFeedback.phase !== input.combatPhase || Math.abs(activeFeedback.progress - nextProgress) > 0.0001;

      if (!didChange) {
        return false;
      }

      activeFeedback.phase = input.combatPhase;
      activeFeedback.progress = nextProgress;
      applyCombatFeedbackPhase(activeFeedback);
      return true;
    }
  };
}

function createActiveCombatFeedback(
  event: CombatPresentationEventInput,
  bindings: CombatPresentationBindings
): ActiveCombatFeedback {
  const resources: EffectResources = {
    geometries: new Set<THREE.BufferGeometry>(),
    materials: new Set<THREE.Material>()
  };
  const attackerFlavor = getCombatFlavorProfile(event.attackerType);
  const victimFlavor = getCombatFlavorProfile(event.victimType);
  const attackerPalette = getEffectPalette(getPieceColor(bindings.attackerGroup));
  const attackerMetrics = measureGroupMetrics(bindings.attackerGroup);
  const victimMetrics = measureGroupMetrics(bindings.victimGroup);
  const attackerRoot = new THREE.Group();
  const victimRoot = new THREE.Group();
  attackerRoot.name = `combat-feedback-attacker-${event.attackerId}`;
  victimRoot.name = `combat-feedback-victim-${event.victimId}`;
  attackerRoot.renderOrder = 2;
  victimRoot.renderOrder = 2;

  const corePulse = createGlowMesh(
    new THREE.SphereGeometry(
      clamp(attackerMetrics.radius * 0.42 * attackerFlavor.render.corePulseScale, 0.14, 0.3),
      18,
      18
    ),
    attackerPalette.primary,
    resources
  );
  corePulse.position.y = clamp(attackerMetrics.height * attackerFlavor.render.corePulseLift, 0.24, 0.9);
  attackerRoot.add(corePulse);

  const servoAccent = createGlowMesh(
    new THREE.TorusGeometry(
      clamp(attackerMetrics.radius * 0.62 * attackerFlavor.render.servoScale, 0.16, 0.38),
      clamp(attackerMetrics.radius * 0.08 * attackerFlavor.render.servoScale, 0.02, 0.06),
      10,
      32
    ),
    attackerPalette.command,
    resources
  );
  servoAccent.rotation.x = Math.PI / 2;
  servoAccent.position.y = clamp(attackerMetrics.height * 0.26, 0.18, 0.56);
  attackerRoot.add(servoAccent);

  const impactPulse = createGlowMesh(
    new THREE.TorusGeometry(
      clamp(victimMetrics.radius * 0.58 * victimFlavor.render.impactPulseScale, 0.16, 0.42),
      clamp(victimMetrics.radius * 0.06 * victimFlavor.render.impactPulseScale, 0.015, 0.05),
      10,
      32
    ),
    IMPACT_FLASH_COLOR,
    resources
  );
  impactPulse.rotation.x = Math.PI / 2;
  impactPulse.position.y = clamp(victimMetrics.height * 0.56, 0.22, 0.9);
  victimRoot.add(impactPulse);

  const sparkRoot = new THREE.Group();
  sparkRoot.name = `combat-feedback-sparks-${event.victimId}`;
  sparkRoot.position.y = impactPulse.position.y;
  victimRoot.add(sparkRoot);

  const sparkGeometry = new THREE.BoxGeometry(
    0.024,
    clamp(victimMetrics.height * 0.26 * victimFlavor.render.sparkLengthScale, 0.12, 0.44),
    0.024
  );
  const sparkMeshes: THREE.Mesh[] = [];
  registerGeometry(resources, sparkGeometry);

  for (let index = 0; index < victimFlavor.render.sparkCount; index += 1) {
    const sparkMaterial = createGlowMaterial(SPARK_COLOR);
    registerMaterial(resources, sparkMaterial);
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    const angle = (index / victimFlavor.render.sparkCount) * Math.PI * 2;
    const spread = 0.08 * victimFlavor.render.sparkSpread;
    spark.position.set(Math.cos(angle) * spread, 0, Math.sin(angle) * spread);
    spark.rotation.z = Math.PI / 2.6;
    spark.rotation.y = angle;
    sparkRoot.add(spark);
    sparkMeshes.push(spark);
  }

  const shutdownBeacon = createGlowMesh(
    new THREE.SphereGeometry(
      clamp(victimMetrics.radius * 0.18 * victimFlavor.render.shutdownScale, 0.08, 0.18),
      14,
      14
    ),
    SHUTDOWN_COLOR,
    resources
  );
  shutdownBeacon.position.set(0, clamp(victimMetrics.height * 0.78, 0.32, 1.04), victimMetrics.radius * 0.14);
  victimRoot.add(shutdownBeacon);

  bindings.attackerGroup.add(attackerRoot);
  bindings.victimGroup.add(victimRoot);

  const activeFeedback: ActiveCombatFeedback = {
    attackerFlavor,
    attackerRoot,
    corePulse,
    event,
    impactPulse,
    key: getCombatFeedbackKey(event),
    phase: 'intro',
    progress: -1,
    resources,
    servoAccent,
    shutdownBeacon,
    sparkMeshes,
    sparkRoot,
    victimFlavor,
    victimMaterialPoses: bindings.victimMaterials
      .filter((material): material is THREE.MeshStandardMaterial => material instanceof THREE.MeshStandardMaterial)
      .map((material) => ({
        emissive: material.emissive.clone(),
        emissiveIntensity: material.emissiveIntensity,
        material
      })),
    victimRoot
  };

  resetEffectMeshes(activeFeedback);
  restoreVictimMaterials(activeFeedback.victimMaterialPoses);
  return activeFeedback;
}

function applyCombatFeedbackPhase(activeFeedback: ActiveCombatFeedback): void {
  resetEffectMeshes(activeFeedback);
  restoreVictimMaterials(activeFeedback.victimMaterialPoses);
  const attackerRenderFlavor = activeFeedback.attackerFlavor.render;
  const victimRenderFlavor = activeFeedback.victimFlavor.render;

  if (activeFeedback.phase === 'intro') {
    const envelope = 0.35 + Math.sin(activeFeedback.progress * Math.PI) * 0.65;
    setGlowState(
      activeFeedback.corePulse,
      (0.11 + envelope * 0.13) * attackerRenderFlavor.corePulseOpacity,
      0.82 + envelope * 0.28 * attackerRenderFlavor.corePulseScale
    );
    setGlowState(
      activeFeedback.servoAccent,
      (0.06 + envelope * 0.08) * attackerRenderFlavor.servoOpacity,
      0.94 + envelope * 0.12 * attackerRenderFlavor.servoScale
    );
    activeFeedback.servoAccent.rotation.z = activeFeedback.progress * Math.PI * 0.2 * attackerRenderFlavor.servoSpin;
    return;
  }

  if (activeFeedback.phase === 'attack') {
    const envelope = Math.sin(activeFeedback.progress * Math.PI);
    setGlowState(
      activeFeedback.corePulse,
      (0.16 + envelope * 0.16) * attackerRenderFlavor.corePulseOpacity,
      0.92 + envelope * 0.32 * attackerRenderFlavor.corePulseScale
    );
    setGlowState(
      activeFeedback.servoAccent,
      (0.14 + envelope * 0.14) * attackerRenderFlavor.servoOpacity,
      1 + envelope * 0.18 * attackerRenderFlavor.servoScale
    );
    activeFeedback.servoAccent.rotation.z = activeFeedback.progress * Math.PI * 1.4 * attackerRenderFlavor.servoSpin;
    activeFeedback.servoAccent.rotation.y = activeFeedback.progress * Math.PI * 0.2;
    return;
  }

  if (activeFeedback.phase === 'impact') {
    const pulse = Math.sin(activeFeedback.progress * Math.PI);
    setGlowState(
      activeFeedback.impactPulse,
      (0.2 + (1 - activeFeedback.progress) * 0.28) * victimRenderFlavor.impactPulseOpacity,
      0.78 + activeFeedback.progress * 0.95 * victimRenderFlavor.impactPulseScale
    );
    setSparkState(
      activeFeedback.sparkMeshes,
      (0.18 + pulse * 0.2) * victimRenderFlavor.sparkOpacity,
      0.72 + pulse * 0.9 * victimRenderFlavor.sparkLengthScale
    );
    activeFeedback.sparkRoot.rotation.y =
      activeFeedback.progress * Math.PI * victimRenderFlavor.sparkRotationSpeed;
    applyVictimImpactFlash(activeFeedback.victimMaterialPoses, pulse, victimRenderFlavor.impactFlashStrength);
    return;
  }

  if (activeFeedback.phase === 'resolve') {
    const flicker = sampleShutdownFlicker(activeFeedback.progress, victimRenderFlavor.shutdownFlicker);
    setGlowState(
      activeFeedback.shutdownBeacon,
      (0.08 + flicker * 0.18) * victimRenderFlavor.shutdownOpacity,
      0.88 + flicker * 0.22 * victimRenderFlavor.shutdownScale
    );
    applyVictimShutdownSignal(
      activeFeedback.victimMaterialPoses,
      activeFeedback.progress,
      flicker,
      victimRenderFlavor.shutdownSignalStrength
    );
    return;
  }

  const settle = 1 - activeFeedback.progress;
  setGlowState(
    activeFeedback.servoAccent,
    (0.05 + settle * 0.08) * attackerRenderFlavor.servoOpacity,
    0.92 + settle * 0.12 * attackerRenderFlavor.servoScale
  );
  activeFeedback.servoAccent.rotation.z = settle * Math.PI * 0.24 * attackerRenderFlavor.servoSpin;
}

function applyVictimImpactFlash(materialPoses: FeedbackMaterialPose[], strength: number, flashStrength: number): void {
  const mix = clamp01((0.26 + strength * 0.44) * flashStrength);

  for (const materialPose of materialPoses) {
    materialPose.material.emissive.copy(materialPose.emissive).lerp(IMPACT_FLASH_COLOR, mix);
    materialPose.material.emissiveIntensity = materialPose.emissiveIntensity + (0.22 + strength * 0.88) * flashStrength;
  }
}

function applyVictimShutdownSignal(
  materialPoses: FeedbackMaterialPose[],
  progress: number,
  flicker: number,
  signalStrength: number
): void {
  const mix = clamp01(((1 - progress) * 0.35 + flicker * 0.28) * signalStrength);

  for (const materialPose of materialPoses) {
    materialPose.material.emissive.copy(materialPose.emissive).lerp(SHUTDOWN_COLOR, mix);
    materialPose.material.emissiveIntensity =
      materialPose.emissiveIntensity * (1 - progress * 0.72) + flicker * 0.34 * signalStrength;
  }
}

function resetEffectMeshes(activeFeedback: ActiveCombatFeedback): void {
  hideGlow(activeFeedback.corePulse);
  hideGlow(activeFeedback.servoAccent);
  hideGlow(activeFeedback.impactPulse);
  hideGlow(activeFeedback.shutdownBeacon);
  setSparkState(activeFeedback.sparkMeshes, 0, 0.65);
  activeFeedback.sparkRoot.rotation.set(0, 0, 0);
}

function setGlowState(mesh: THREE.Mesh, opacity: number, scale: number): void {
  const material = mesh.material;

  if (!(material instanceof THREE.MeshBasicMaterial)) {
    return;
  }

  mesh.visible = opacity > 0.001;
  mesh.scale.setScalar(scale);
  material.opacity = clamp01(opacity);
}

function hideGlow(mesh: THREE.Mesh): void {
  setGlowState(mesh, 0, 0.001);
}

function setSparkState(sparkMeshes: THREE.Mesh[], opacity: number, scaleY: number): void {
  for (let index = 0; index < sparkMeshes.length; index += 1) {
    const spark = sparkMeshes[index];
    const material = spark.material;

    if (!(material instanceof THREE.MeshBasicMaterial)) {
      continue;
    }

    spark.visible = opacity > 0.001;
    spark.scale.set(1, scaleY * (1 + index * 0.08), 1);
    material.opacity = clamp01(opacity * (1 - index * 0.12));
  }
}

function createGlowMesh(
  geometry: THREE.BufferGeometry,
  color: THREE.Color,
  resources: EffectResources
): THREE.Mesh {
  registerGeometry(resources, geometry);
  const material = createGlowMaterial(color);
  registerMaterial(resources, material);
  return new THREE.Mesh(geometry, material);
}

function createGlowMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color,
    depthWrite: false,
    opacity: 0,
    toneMapped: false,
    transparent: true
  });
}

function restoreVictimMaterials(materialPoses: FeedbackMaterialPose[]): void {
  for (const materialPose of materialPoses) {
    materialPose.material.emissive.copy(materialPose.emissive);
    materialPose.material.emissiveIntensity = materialPose.emissiveIntensity;
  }
}

function measureGroupMetrics(group: THREE.Group): { height: number; radius: number } {
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());

  return {
    height: Math.max(size.y, 0.48),
    radius: Math.max(Math.max(size.x, size.z) * 0.5, 0.16)
  };
}

function getPieceColor(group: THREE.Group): ChessPieceColor {
  const color = (group.parent?.userData as { color?: ChessPieceColor } | undefined)?.color;
  return color === 'black' ? 'black' : 'white';
}

function getEffectPalette(color: ChessPieceColor): EffectPalette {
  if (color === 'white') {
    return {
      command: COMMAND_SIGNAL_COLOR.clone(),
      primary: WHITE_SIGNAL_COLOR.clone()
    };
  }

  return {
    command: COMMAND_SIGNAL_COLOR.clone(),
    primary: BLACK_SIGNAL_COLOR.clone()
  };
}

function registerGeometry(resources: EffectResources, geometry: THREE.BufferGeometry): void {
  resources.geometries.add(geometry);
}

function registerMaterial(resources: EffectResources, material: THREE.Material): void {
  resources.materials.add(material);
}

function disposeResources(resources: EffectResources): void {
  for (const geometry of resources.geometries) {
    geometry.dispose();
  }

  for (const material of resources.materials) {
    material.dispose();
  }
}

function getCombatFeedbackKey(event: CombatPresentationEventInput): string {
  return `${event.attackerId}-${event.victimId}-${event.from}-${event.to}-${event.capturedSquare}`;
}

function getSnapshot(activeFeedback: ActiveCombatFeedback | null): CombatFeedbackSnapshot {
  return {
    active: activeFeedback !== null,
    attackerFlavorLabel: activeFeedback?.attackerFlavor.label ?? null,
    corePulseActive: activeFeedback?.phase === 'intro' || activeFeedback?.phase === 'attack',
    impactPulseActive: activeFeedback?.phase === 'impact',
    phase: activeFeedback?.phase ?? null,
    progress: activeFeedback?.progress ?? 0,
    servoAccentActive:
      activeFeedback?.phase === 'intro' ||
      activeFeedback?.phase === 'attack' ||
      activeFeedback?.phase === 'return',
    shutdownActive: activeFeedback?.phase === 'resolve',
    sparkActive: activeFeedback?.phase === 'impact',
    victimFlavorLabel: activeFeedback?.victimFlavor.label ?? null
  };
}

function sampleShutdownFlicker(progress: number, flickerScale: number): number {
  const envelope = 1 - clamp01(progress);
  const flickerA = Math.sin(progress * Math.PI * (10 + flickerScale * 3)) * 0.5 + 0.5;
  const flickerB = Math.sin(progress * Math.PI * (16 + flickerScale * 5) + 0.65) * 0.5 + 0.5;
  return envelope * (0.25 + flickerA * 0.45 + flickerB * 0.3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
