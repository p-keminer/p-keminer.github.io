import * as THREE from 'three';
import { squareToWorld } from '../chess/mapping';
import type { BoardSquare, ChessPieceType } from '../chess/state';
import {
  getCyberMechStyleProfile,
  sampleCyberMechOvershoot,
  sampleCyberMechProgress,
  sampleCyberMechPulse,
  sampleCyberMechSettle,
  type CyberMechStyleProfile,
  type CyberMechWeightClass
} from './combat-cyber-mech-style';
import {
  getCombatMotionProfile,
  sampleCombatPhaseProgress,
  type CombatMotionProfile
} from './combat-motion-profiles';

export type CombatPresentationPhase = 'intro' | 'attack' | 'impact' | 'resolve' | 'return';

export interface CombatPresentationBindings {
  attackerAnchor: THREE.Object3D;
  attackerGroup: THREE.Group;
  victimAnchor: THREE.Object3D;
  victimGroup: THREE.Group;
  victimMaterials: THREE.Material[];
}

export interface CombatPresentationEventInput {
  attackerId: string;
  attackerType: ChessPieceType;
  capturedSquare: BoardSquare;
  from: BoardSquare;
  to: BoardSquare;
  victimId: string;
  victimType: ChessPieceType;
}

export interface CombatPresentationStateInput {
  combatEvent: CombatPresentationEventInput | null;
  combatPhase: CombatPresentationPhase | null;
  combatPhaseProgress: number;
  mode: 'board' | 'combat';
}

export interface CombatPresentationSnapshot {
  active: boolean;
  attackerId: string | null;
  attackerProfile: ChessPieceType | null;
  attackerWeightClass: CyberMechWeightClass | null;
  motionStyle: string | null;
  phase: CombatPresentationPhase | null;
  progress: number;
  styleLabel: string | null;
  worldStyle: string | null;
  victimId: string | null;
  victimProfile: ChessPieceType | null;
  victimWeightClass: CyberMechWeightClass | null;
}

export interface CombatPresentationController {
  clear: (options?: { snapToFinal?: boolean }) => CombatPresentationSnapshot;
  getSnapshot: () => CombatPresentationSnapshot;
  syncState: (input: CombatPresentationStateInput, bindings: CombatPresentationBindings | null) => boolean;
}

interface GroupPose {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
}

interface MaterialPose {
  material: THREE.Material;
  opacity: number;
  transparent: boolean;
}

interface ActiveCombatPresentation {
  attackerBasePose: GroupPose;
  attackerFinalPosition: THREE.Vector3;
  attackerGroup: THREE.Group;
  attackerMotionProfile: CombatMotionProfile;
  attackerStyleProfile: CyberMechStyleProfile;
  attackDirection: THREE.Vector3;
  event: CombatPresentationEventInput;
  key: string;
  phase: CombatPresentationPhase;
  progress: number;
  sideDirection: THREE.Vector3;
  victimBasePose: GroupPose;
  victimGroup: THREE.Group;
  victimImpactDirection: THREE.Vector3;
  victimMaterials: MaterialPose[];
  victimMotionProfile: CombatMotionProfile;
  victimStyleProfile: CyberMechStyleProfile;
  victimPosition: THREE.Vector3;
}

const PIECE_BASE_HEIGHT = 0.898; // = BOARD_SURFACE_Y: Blender Z=2.4221 → Three.js Y=0.898

export function createCombatPresentationController(): CombatPresentationController {
  let activePresentation: ActiveCombatPresentation | null = null;

  return {
    clear: ({ snapToFinal = false } = {}) => {
      const snapshot = getSnapshot(activePresentation);

      if (!activePresentation) {
        return snapshot;
      }

      if (snapToFinal) {
        applyNeutralPose(activePresentation.attackerGroup, activePresentation.attackerFinalPosition);
        setMaterialOpacity(activePresentation.victimMaterials, 0);
        activePresentation.victimGroup.visible = false;
      } else {
        restoreMaterialPoses(activePresentation.victimMaterials);
        restoreGroupPose(activePresentation.attackerGroup, activePresentation.attackerBasePose);
        restoreGroupPose(activePresentation.victimGroup, activePresentation.victimBasePose);
      }

      activePresentation = null;
      return snapshot;
    },
    getSnapshot: () => getSnapshot(activePresentation),
    syncState: (input, bindings) => {
      if (input.mode !== 'combat' || !input.combatEvent || !input.combatPhase || !bindings) {
        return false;
      }

      const nextKey = getCombatPresentationKey(input.combatEvent);

      if (activePresentation?.key !== nextKey) {
        if (activePresentation) {
          restoreMaterialPoses(activePresentation.victimMaterials);
          restoreGroupPose(activePresentation.attackerGroup, activePresentation.attackerBasePose);
          restoreGroupPose(activePresentation.victimGroup, activePresentation.victimBasePose);
        }

        activePresentation = createActiveCombatPresentation(input.combatEvent, bindings);
      }

      if (!activePresentation) {
        return false;
      }

      const nextProgress = clamp01(input.combatPhaseProgress);
      const didChange =
        activePresentation.phase !== input.combatPhase || Math.abs(activePresentation.progress - nextProgress) > 0.0001;

      if (!didChange) {
        return false;
      }

      activePresentation.phase = input.combatPhase;
      activePresentation.progress = nextProgress;
      applyCombatPhase(activePresentation);
      return true;
    }
  };
}

function applyCombatPhase(activePresentation: ActiveCombatPresentation): void {
  const {
    attackerBasePose,
    attackerFinalPosition,
    attackerGroup,
    attackerMotionProfile,
    attackerStyleProfile,
    attackDirection,
    phase,
    progress,
    sideDirection,
    victimBasePose,
    victimGroup,
    victimImpactDirection,
    victimMaterials,
    victimMotionProfile,
    victimStyleProfile,
    victimPosition
  } = activePresentation;
  const attackSign = attackDirection.x >= 0 ? 1 : -1;
  const introPreloadDistance =
    attackerMotionProfile.intro.windupDistance + attackerStyleProfile.preloadAmount * 0.075;
  const attackOvershootDistance =
    attackerMotionProfile.attack.overshootDistance + attackerStyleProfile.mechanicalOvershoot * 0.1;
  const attackSideArc =
    attackerMotionProfile.attack.sideArc + attackerStyleProfile.servoSnap * 0.03 + attackerStyleProfile.energyPulse * 0.018;
  const impactRecoilDistance =
    attackerMotionProfile.impact.recoilDistance + attackerStyleProfile.impactRecoil * 0.055;
  const impactRecoilLift =
    attackerMotionProfile.impact.recoilLift + attackerStyleProfile.energyPulse * 0.04;
  const windupPosition = attackerBasePose.position.clone().addScaledVector(
    attackDirection,
    -introPreloadDistance
  );
  const strikePosition = attackerBasePose.position
    .clone()
    .lerp(victimPosition, attackerMotionProfile.attack.strikeDistance)
    .addScaledVector(attackDirection, attackOvershootDistance);
  const recoilPosition = strikePosition
    .clone()
    .addScaledVector(attackDirection, -impactRecoilDistance);

  restoreMaterialPoses(victimMaterials);
  restoreGroupPose(attackerGroup, attackerBasePose);
  restoreGroupPose(victimGroup, victimBasePose);
  victimGroup.position.copy(victimPosition);

  if (phase === 'intro') {
    const introPhaseProgress = sampleCombatPhaseProgress(attackerMotionProfile.intro, progress);
    const introProgress = sampleCyberMechProgress(introPhaseProgress, attackerStyleProfile);
    const preloadPulse = sampleCyberMechPulse(progress, attackerStyleProfile);

    attackerGroup.position.lerpVectors(attackerBasePose.position, windupPosition, introProgress);
    attackerGroup.position.addScaledVector(attackDirection, sampleCyberMechSettle(progress, attackerStyleProfile) * 0.035);
    attackerGroup.position.y +=
      Math.sin(progress * Math.PI) * (attackerMotionProfile.intro.lift + preloadPulse * 0.05);
    attackerGroup.rotation.z =
      attackSign * (attackerMotionProfile.intro.roll + attackerStyleProfile.preloadAmount * 0.05) * introProgress;
    attackerGroup.rotation.x =
      (attackerMotionProfile.intro.pitch - attackerStyleProfile.stiffness * 0.03) * introProgress;
    attackerGroup.scale.setScalar(
      THREE.MathUtils.lerp(1, attackerMotionProfile.intro.scaleTo - attackerStyleProfile.preloadAmount * 0.015, introProgress)
    );
    victimGroup.position.y += Math.sin(progress * Math.PI) * (0.01 + victimStyleProfile.energyPulse * 0.008);
    return;
  }

  if (phase === 'attack') {
    const attackPhaseProgress = sampleCombatPhaseProgress(attackerMotionProfile.attack, progress);
    const attackProgress = sampleCyberMechProgress(attackPhaseProgress, attackerStyleProfile);
    const servoPulse = sampleCyberMechPulse(progress, attackerStyleProfile);
    const terminalOvershoot = sampleCyberMechOvershoot(progress, attackerStyleProfile);

    attackerGroup.position.lerpVectors(windupPosition, strikePosition, attackProgress);
    attackerGroup.position.addScaledVector(
      sideDirection,
      Math.sin(progress * Math.PI) * attackSideArc * attackSign
    );
    attackerGroup.position.addScaledVector(attackDirection, terminalOvershoot * 0.075);
    attackerGroup.position.y += Math.sin(progress * Math.PI) * (attackerMotionProfile.attack.lift + servoPulse * 0.07);
    attackerGroup.rotation.z =
      attackSign *
      THREE.MathUtils.lerp(
        attackerMotionProfile.intro.roll,
        -(attackerMotionProfile.attack.roll + attackerStyleProfile.servoSnap * 0.08) * 0.5,
        attackProgress
      );
    attackerGroup.rotation.x = THREE.MathUtils.lerp(
      attackerMotionProfile.intro.pitch,
      attackerMotionProfile.attack.pitch - attackerStyleProfile.stiffness * 0.045,
      attackProgress
    );
    attackerGroup.scale.setScalar(
      THREE.MathUtils.lerp(
        attackerMotionProfile.intro.scaleTo,
        attackerMotionProfile.attack.scaleTo + attackerStyleProfile.energyPulse * 0.025,
        attackProgress
      )
    );
    victimGroup.scale.setScalar(THREE.MathUtils.lerp(1, 0.99 - victimStyleProfile.stiffness * 0.01, Math.sin(progress * Math.PI)));
    return;
  }

  if (phase === 'impact') {
    const impactProgress = sampleCyberMechProgress(
      sampleCombatPhaseProgress(attackerMotionProfile.impact, progress),
      attackerStyleProfile
    );
    const victimImpactProgress = sampleCyberMechProgress(
      sampleCombatPhaseProgress(victimMotionProfile.impact, progress),
      victimStyleProfile
    );
    const hitPulse = Math.sin(victimImpactProgress * Math.PI);
    const impactSettle = sampleCyberMechSettle(progress, attackerStyleProfile);
    const impactPulse = sampleCyberMechPulse(progress, attackerStyleProfile);
    const victimKickDistance =
      victimMotionProfile.impact.victimKickDistance +
      attackerStyleProfile.impactRecoil * 0.05 +
      victimStyleProfile.impactRecoil * 0.03;
    const victimKickHeight =
      victimMotionProfile.impact.victimKickHeight + victimStyleProfile.energyPulse * 0.035;

    attackerGroup.position.lerpVectors(strikePosition, recoilPosition, impactProgress);
    attackerGroup.position.addScaledVector(attackDirection, impactSettle * 0.045);
    attackerGroup.position.y += Math.sin((1 - impactProgress) * Math.PI) * (impactRecoilLift + impactPulse * 0.03);
    attackerGroup.rotation.z =
      attackSign *
      THREE.MathUtils.lerp(
        -attackerMotionProfile.attack.roll * 0.4,
        attackerMotionProfile.impact.roll + attackerStyleProfile.impactRecoil * 0.08,
        impactProgress
      );
    attackerGroup.rotation.x = THREE.MathUtils.lerp(
      attackerMotionProfile.attack.pitch - attackerStyleProfile.stiffness * 0.045,
      -attackerStyleProfile.impactRecoil * 0.06,
      impactProgress
    );

    victimGroup.position.addScaledVector(victimImpactDirection, victimKickDistance * hitPulse);
    victimGroup.position.addScaledVector(sideDirection, attackerStyleProfile.servoSnap * 0.02 * hitPulse * attackSign);
    victimGroup.position.y += victimKickHeight * hitPulse;
    victimGroup.rotation.z = attackSign * (victimMotionProfile.impact.roll + victimStyleProfile.impactRecoil * 0.08) * hitPulse;
    victimGroup.rotation.x = (victimMotionProfile.impact.pitch - victimStyleProfile.stiffness * 0.045) * hitPulse;
    victimGroup.scale.setScalar(THREE.MathUtils.lerp(1, victimMotionProfile.impact.victimScaleTo, hitPulse));
    return;
  }

  if (phase === 'resolve') {
    const resolveProgress = sampleCyberMechProgress(
      sampleCombatPhaseProgress(attackerMotionProfile.resolve, progress),
      attackerStyleProfile
    );
    const victimResolveProgress = sampleCyberMechProgress(
      sampleCombatPhaseProgress(victimMotionProfile.resolve, progress),
      victimStyleProfile
    );
    const resolveSettle = sampleCyberMechSettle(progress, attackerStyleProfile);
    const victimResolveSettle = sampleCyberMechSettle(progress, victimStyleProfile);
    const resolveOvershoot = sampleCyberMechOvershoot(progress, attackerStyleProfile);

    attackerGroup.position.lerpVectors(recoilPosition, attackerFinalPosition, resolveProgress);
    attackerGroup.position.addScaledVector(attackDirection, (resolveSettle + resolveOvershoot * 0.45) * 0.05);
    attackerGroup.position.y +=
      Math.sin(progress * Math.PI) * (attackerMotionProfile.resolve.attackerLift + attackerStyleProfile.energyPulse * 0.025);
    attackerGroup.rotation.z =
      attackSign *
      THREE.MathUtils.lerp(
        attackerMotionProfile.impact.roll * 0.35,
        attackerMotionProfile.resolve.roll + attackerStyleProfile.settleAmount * 0.035,
        resolveProgress
      );
    attackerGroup.rotation.x = THREE.MathUtils.lerp(
      -attackerStyleProfile.impactRecoil * 0.06,
      attackerMotionProfile.resolve.pitch,
      resolveProgress
    );

    victimGroup.position.addScaledVector(
      victimImpactDirection,
      (victimMotionProfile.resolve.victimDriftDistance + victimStyleProfile.mechanicalOvershoot * 0.03) *
        victimResolveProgress
    );
    victimGroup.position.addScaledVector(sideDirection, victimResolveSettle * 0.05 * attackSign);
    victimGroup.position.y +=
      (victimMotionProfile.resolve.victimDriftHeight + victimStyleProfile.energyPulse * 0.03) * victimResolveProgress;
    victimGroup.rotation.z =
      attackSign *
      THREE.MathUtils.lerp(
        victimMotionProfile.impact.roll * 0.8,
        victimMotionProfile.resolve.roll + victimStyleProfile.settleAmount * 0.045,
        victimResolveProgress
      );
    victimGroup.rotation.x = THREE.MathUtils.lerp(
        victimMotionProfile.impact.pitch * 0.8,
      victimMotionProfile.resolve.pitch - victimStyleProfile.stiffness * 0.03,
      victimResolveProgress
    );
    victimGroup.scale.setScalar(THREE.MathUtils.lerp(1, victimMotionProfile.resolve.victimScaleTo, victimResolveProgress));
    setMaterialOpacity(victimMaterials, 1 - victimResolveProgress);

    if (progress >= 0.999) {
      victimGroup.visible = false;
    }

    return;
  }

  const returnProgress = sampleCyberMechProgress(
    sampleCombatPhaseProgress(attackerMotionProfile.return, progress),
    attackerStyleProfile
  );
  const returnSettle = sampleCyberMechSettle(progress, attackerStyleProfile);
  applyNeutralPose(attackerGroup, attackerFinalPosition);
  attackerGroup.position.addScaledVector(attackDirection, returnSettle * 0.04);
  attackerGroup.position.y +=
    Math.sin((1 - returnProgress) * Math.PI) * (attackerMotionProfile.return.lift + attackerStyleProfile.settleAmount * 0.03);
  attackerGroup.rotation.z =
    attackSign * (attackerMotionProfile.return.roll + attackerStyleProfile.settleAmount * 0.03) * (1 - returnProgress);
  attackerGroup.rotation.x =
    (attackerMotionProfile.return.pitch - attackerStyleProfile.stiffness * 0.02) * (1 - returnProgress);
  setMaterialOpacity(victimMaterials, 0);
  victimGroup.visible = false;
}

function createActiveCombatPresentation(
  event: CombatPresentationEventInput,
  bindings: CombatPresentationBindings
): ActiveCombatPresentation {
  const attackerBasePose = createGroupPose(bindings.attackerGroup);
  const victimBasePose = createGroupPose(bindings.victimGroup);
  const attackerBasePosition = getLocalPresentationPosition(bindings.attackerAnchor, event.from, attackerBasePose.position.y);
  const attackerFinalPosition = getLocalPresentationPosition(bindings.attackerAnchor, event.to, attackerBasePose.position.y);
  const victimPosition = getLocalPresentationPosition(bindings.victimAnchor, event.capturedSquare, victimBasePose.position.y);
  const attackDirection = getWorldPosition(event.capturedSquare).sub(getWorldPosition(event.from));
  const attackerMotionProfile = getCombatMotionProfile(event.attackerType);
  const attackerStyleProfile = getCyberMechStyleProfile(event.attackerType);
  const victimMotionProfile = getCombatMotionProfile(event.victimType);
  const victimStyleProfile = getCyberMechStyleProfile(event.victimType);

  if (attackDirection.lengthSq() < 0.0001) {
    attackDirection.copy(attackerFinalPosition).sub(attackerBasePosition);
  }

  if (attackDirection.lengthSq() < 0.0001) {
    attackDirection.set(0.4, 0, -1);
  }

  attackDirection.normalize();

  const sideDirection = new THREE.Vector3(-attackDirection.z, 0, attackDirection.x);

  if (sideDirection.lengthSq() < 0.0001) {
    sideDirection.set(1, 0, 0);
  }

  sideDirection.normalize();

  bindings.attackerGroup.position.copy(attackerBasePosition);
  setGroupNeutralRotation(bindings.attackerGroup);
  bindings.attackerGroup.scale.set(1, 1, 1);
  bindings.attackerGroup.visible = true;

  bindings.victimGroup.position.copy(victimPosition);
  setGroupNeutralRotation(bindings.victimGroup);
  bindings.victimGroup.scale.set(1, 1, 1);
  bindings.victimGroup.visible = true;

  const victimMaterialPoses = bindings.victimMaterials.map((material) => ({
    material,
    opacity: material.opacity,
    transparent: material.transparent
  }));

  restoreMaterialPoses(victimMaterialPoses);

  return {
    attackerBasePose,
    attackerFinalPosition,
    attackerGroup: bindings.attackerGroup,
    attackerMotionProfile,
    attackerStyleProfile,
    attackDirection,
    event,
    key: getCombatPresentationKey(event),
    phase: 'intro',
    progress: 0,
    sideDirection,
    victimBasePose,
    victimGroup: bindings.victimGroup,
    victimImpactDirection: attackDirection
      .clone()
      .addScaledVector(sideDirection, (attackerMotionProfile.attack.sideArc + attackerStyleProfile.servoSnap * 0.02) * 0.35)
      .normalize(),
    victimMaterials: victimMaterialPoses,
    victimMotionProfile,
    victimStyleProfile,
    victimPosition
  };
}

function createGroupPose(group: THREE.Group): GroupPose {
  return {
    position: group.position.clone(),
    rotation: group.rotation.clone(),
    scale: group.scale.clone(),
    visible: group.visible
  };
}

function getCombatPresentationKey(event: CombatPresentationEventInput): string {
  return `${event.attackerId}-${event.victimId}-${event.from}-${event.to}-${event.capturedSquare}`;
}

function getSnapshot(activePresentation: ActiveCombatPresentation | null): CombatPresentationSnapshot {
  return {
    active: activePresentation !== null,
    attackerId: activePresentation?.event.attackerId ?? null,
    attackerProfile: activePresentation?.attackerMotionProfile.id ?? null,
    attackerWeightClass: activePresentation?.attackerStyleProfile.weightClass ?? null,
    motionStyle: activePresentation?.attackerMotionProfile.motionStyle ?? null,
    phase: activePresentation?.phase ?? null,
    progress: activePresentation?.progress ?? 0,
    styleLabel: activePresentation?.attackerStyleProfile.label ?? null,
    worldStyle: activePresentation?.attackerStyleProfile.worldStyle ?? null,
    victimId: activePresentation?.event.victimId ?? null,
    victimProfile: activePresentation?.victimMotionProfile.id ?? null,
    victimWeightClass: activePresentation?.victimStyleProfile.weightClass ?? null
  };
}

function getWorldPosition(square: BoardSquare): THREE.Vector3 {
  const worldPosition = squareToWorld(square);
  return new THREE.Vector3(worldPosition.x, PIECE_BASE_HEIGHT, worldPosition.z);
}

function getLocalPresentationPosition(anchor: THREE.Object3D, square: BoardSquare, baseY: number): THREE.Vector3 {
  const worldPosition = getWorldPosition(square);
  const localPosition = anchor.worldToLocal(worldPosition.clone());
  localPosition.y += baseY;
  return localPosition;
}

function restoreGroupPose(group: THREE.Group, pose: GroupPose): void {
  group.position.copy(pose.position);
  group.rotation.copy(pose.rotation);
  group.scale.copy(pose.scale);
  group.visible = pose.visible;
}

function applyNeutralPose(group: THREE.Group, position: THREE.Vector3): void {
  group.position.copy(position);
  setGroupNeutralRotation(group);
  group.scale.set(1, 1, 1);
  group.visible = true;
}

function setGroupNeutralRotation(group: THREE.Group): void {
  group.rotation.set(0, getGroupBaseYaw(group), 0);
}

function getGroupBaseYaw(group: THREE.Group): number {
  return typeof group.userData.baseYaw === 'number' ? group.userData.baseYaw : 0;
}

function restoreMaterialPoses(materialPoses: MaterialPose[]): void {
  for (const materialPose of materialPoses) {
    materialPose.material.opacity = materialPose.opacity;
    materialPose.material.transparent = materialPose.transparent;
  }
}

function setMaterialOpacity(materialPoses: MaterialPose[], opacity: number): void {
  const clampedOpacity = clamp01(opacity);

  for (const materialPose of materialPoses) {
    materialPose.material.transparent = true;
    materialPose.material.opacity = clampedOpacity;
  }
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
