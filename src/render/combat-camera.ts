import * as THREE from 'three';
import type { BoardSquare } from '../chess/state';
import { squareToWorld } from '../chess/mapping';
import { DEFAULT_CAMERA_PRESET, type CameraPreset } from './camera';

export type CombatCameraMode = 'board' | 'combatHold' | 'combatTransitionIn' | 'combatTransitionOut';
export type CombatCameraPriority = 'combatCinematic' | 'returnToInspect' | 'userInspect';
export type CombatCameraSide = 'left' | 'none' | 'right';

export interface CombatCameraEventInput {
  capturedSquare: BoardSquare;
  from: BoardSquare;
  to: BoardSquare;
}

export interface CombatCameraStateInput {
  combatDurationMs: number | null;
  combatEvent: CombatCameraEventInput | null;
  combatRemainingMs: number;
  mode: 'board' | 'combat';
}

export interface CombatCameraSnapshot {
  combatSide: CombatCameraSide;
  combatSourcePosition: { x: number; y: number; z: number };
  combatSourceTarget: { x: number; y: number; z: number };
  inspectPosition: { x: number; y: number; z: number };
  inspectTarget: { x: number; y: number; z: number };
  mode: CombatCameraMode;
  position: { x: number; y: number; z: number };
  priority: CombatCameraPriority;
  returnPosition: { x: number; y: number; z: number };
  returnTarget: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export interface CombatCameraController {
  getSnapshot: () => CombatCameraSnapshot;
  reset: () => boolean;
  setInspectPose: (preset: CameraPreset) => boolean;
  step: (deltaMs: number) => boolean;
  syncState: (input: CombatCameraStateInput) => boolean;
}

interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface CombatCameraCandidate {
  pose: CameraPose;
  side: Exclude<CombatCameraSide, 'none'>;
}

interface CombatCameraCandidates {
  leftCandidate: CombatCameraCandidate;
  rightCandidate: CombatCameraCandidate;
}

interface CreateCombatCameraControllerOptions {
  camera: THREE.PerspectiveCamera;
}

const TRANSITION_IN_MS = 400;
const TRANSITION_OUT_MS = 300;
// Look-at target Y during combat: board surface (0.898) + mid-piece offset (0.42).
const COMBAT_TARGET_HEIGHT = 1.32;
const COMBAT_CAMERA_HEIGHT = 1.8;
const COMBAT_SIDE_DISTANCE = 5.5;
const MIN_PIVOT_RADIUS = 0.001;

export function createCombatCameraController({
  camera
}: CreateCombatCameraControllerOptions): CombatCameraController {
  const defaultPose = presetToPose(DEFAULT_CAMERA_PRESET);
  let combatSourcePose = clonePose(defaultPose);
  let inspectPose = clonePose(defaultPose);
  let returnPose = clonePose(inspectPose);
  let currentPose = clonePose(inspectPose);
  let fromPose = clonePose(inspectPose);
  let toPose = clonePose(inspectPose);
  let combatPivot = defaultPose.target.clone();
  let activeEventKey: string | null = null;
  let activeSide: CombatCameraSide = 'none';
  let mode: CombatCameraMode = 'board';
  let phaseElapsedMs = 0;

  applyPose(camera, currentPose);

  return {
    getSnapshot: () => ({
      combatSide: activeSide,
      combatSourcePosition: vectorToFixed(combatSourcePose.position),
      combatSourceTarget: vectorToFixed(combatSourcePose.target),
      inspectPosition: vectorToFixed(inspectPose.position),
      inspectTarget: vectorToFixed(inspectPose.target),
      mode,
      position: vectorToFixed(currentPose.position),
      priority: getPriority(mode),
      returnPosition: vectorToFixed(returnPose.position),
      returnTarget: vectorToFixed(returnPose.target),
      target: vectorToFixed(currentPose.target)
    }),
    reset: () => {
      const didChange =
        mode !== 'board' ||
        !inspectPose.position.equals(defaultPose.position) ||
        !inspectPose.target.equals(defaultPose.target) ||
        !currentPose.position.equals(defaultPose.position) ||
        !currentPose.target.equals(defaultPose.target);

      activeEventKey = null;
      activeSide = 'none';
      mode = 'board';
      phaseElapsedMs = 0;
      combatSourcePose = clonePose(defaultPose);
      inspectPose = clonePose(defaultPose);
      returnPose = clonePose(defaultPose);
      currentPose = clonePose(defaultPose);
      fromPose = clonePose(defaultPose);
      toPose = clonePose(defaultPose);
      combatPivot = defaultPose.target.clone();
      applyPose(camera, currentPose);
      return didChange;
    },
    setInspectPose: (preset) => {
      const nextInspectPose = presetToPose(preset);
      const didChange =
        !inspectPose.position.equals(nextInspectPose.position) || !inspectPose.target.equals(nextInspectPose.target);

      if (!didChange) {
        return false;
      }

      inspectPose = nextInspectPose;

      if (mode === 'board') {
        combatSourcePose = clonePose(inspectPose);
        returnPose = clonePose(inspectPose);
        currentPose = clonePose(inspectPose);
        fromPose = clonePose(inspectPose);
        toPose = clonePose(inspectPose);
        applyPose(camera, currentPose);
      }

      return true;
    },
    step: (deltaMs) => {
      if (mode === 'board' || mode === 'combatHold') {
        return false;
      }

      const duration = mode === 'combatTransitionIn' ? TRANSITION_IN_MS : TRANSITION_OUT_MS;
      const nextElapsedMs = Math.min(phaseElapsedMs + Math.max(deltaMs, 0), duration);

      if (nextElapsedMs === phaseElapsedMs) {
        return false;
      }

      phaseElapsedMs = nextElapsedMs;
      const progress = easeInOutCubic(phaseElapsedMs / duration);
      currentPose = sphericalLerpPose(fromPose, toPose, combatPivot, progress);
      applyPose(camera, currentPose);

      if (phaseElapsedMs >= duration) {
        currentPose = clonePose(toPose);
        applyPose(camera, currentPose);

        if (mode === 'combatTransitionIn') {
          mode = 'combatHold';
        } else {
          mode = 'board';
          activeEventKey = null;
          activeSide = 'none';
        }

        phaseElapsedMs = 0;
      }

      return true;
    },
    syncState: (input) => {
      if (input.mode === 'combat' && input.combatEvent) {
        const nextEventKey = getCombatEventKey(input.combatEvent);

        if (activeEventKey !== nextEventKey) {
          activeEventKey = nextEventKey;
          combatSourcePose = clonePose(inspectPose);
          returnPose = clonePose(inspectPose);

          const combatCandidates = buildCombatCandidates(input.combatEvent);
          combatPivot = combatCandidates.leftCandidate.pose.target.clone();

          const combatPose = chooseCombatCandidate(combatSourcePose, combatCandidates);
          activeSide = combatPose.side;
          startTransition(combatPose.pose, 'combatTransitionIn');
          return true;
        }

        if (mode !== 'combatTransitionOut' && shouldTransitionOut(input)) {
          startTransition(returnPose, 'combatTransitionOut');
          return true;
        }

        return false;
      }

      if (mode === 'board') {
        return false;
      }

      if (mode !== 'combatTransitionOut') {
        startTransition(returnPose, 'combatTransitionOut');
        return true;
      }

      return false;
    }
  };

  function startTransition(targetPose: CameraPose, nextMode: CombatCameraMode): void {
    fromPose = clonePose(currentPose);
    toPose = clonePose(targetPose);
    phaseElapsedMs = 0;
    mode = nextMode;

    if (nextMode === 'combatTransitionIn' || nextMode === 'combatTransitionOut') {
      currentPose = clonePose(fromPose);
      applyPose(camera, currentPose);
    }
  }
}

function buildCombatCandidates(event: CombatCameraEventInput): CombatCameraCandidates {
  const attackerWorld = squareToWorld(event.from);
  const targetWorld = squareToWorld(event.to);
  const victimWorld = squareToWorld(event.capturedSquare);
  const attackerPosition = new THREE.Vector3(attackerWorld.x, 0, attackerWorld.z);
  const targetPosition = new THREE.Vector3(targetWorld.x, 0, targetWorld.z);
  const victimPosition = new THREE.Vector3(victimWorld.x, 0, victimWorld.z);
  const combatPosition = targetPosition.clone();
  const combatForward = targetPosition.clone().sub(attackerPosition);

  if (combatForward.lengthSq() < 0.0001) {
    combatForward.copy(victimPosition).sub(attackerPosition);
  }

  if (combatForward.lengthSq() < 0.0001) {
    combatForward.set(0.4, 0, -1);
  }

  combatForward.normalize();

  const worldUp = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(worldUp, combatForward);

  if (side.lengthSq() < 0.0001) {
    side.set(-combatForward.z, 0, combatForward.x);
  }

  side.normalize();

  const upOffset = new THREE.Vector3(0, COMBAT_CAMERA_HEIGHT, 0);
  const target = combatPosition.clone();
  target.y = COMBAT_TARGET_HEIGHT;

  return {
    leftCandidate: buildCombatCandidate('left', combatPosition, target, side, upOffset),
    rightCandidate: buildCombatCandidate('right', combatPosition, target, side.clone().multiplyScalar(-1), upOffset)
  };
}

function chooseCombatCandidate(inspectPose: CameraPose, candidates: CombatCameraCandidates): CombatCameraCandidate {
  const combatTarget = candidates.leftCandidate.pose.target;
  const userAngle = Math.atan2(inspectPose.position.z - combatTarget.z, inspectPose.position.x - combatTarget.x);
  const leftAngle = Math.atan2(
    candidates.leftCandidate.pose.position.z - combatTarget.z,
    candidates.leftCandidate.pose.position.x - combatTarget.x
  );
  const rightAngle = Math.atan2(
    candidates.rightCandidate.pose.position.z - combatTarget.z,
    candidates.rightCandidate.pose.position.x - combatTarget.x
  );
  const leftDiff = Math.abs(normalizeAngle(userAngle - leftAngle));
  const rightDiff = Math.abs(normalizeAngle(userAngle - rightAngle));

  if (Math.abs(leftDiff - rightDiff) > 0.0001) {
    return leftDiff < rightDiff ? candidates.leftCandidate : candidates.rightCandidate;
  }

  const leftTravel = candidates.leftCandidate.pose.position.distanceTo(inspectPose.position);
  const rightTravel = candidates.rightCandidate.pose.position.distanceTo(inspectPose.position);
  return leftTravel <= rightTravel ? candidates.leftCandidate : candidates.rightCandidate;
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) {
    angle -= 2 * Math.PI;
  }

  while (angle < -Math.PI) {
    angle += 2 * Math.PI;
  }

  return angle;
}

function buildCombatCandidate(
  side: Exclude<CombatCameraSide, 'none'>,
  combatPosition: THREE.Vector3,
  target: THREE.Vector3,
  sideDirection: THREE.Vector3,
  upOffset: THREE.Vector3
): CombatCameraCandidate {
  const position = combatPosition.clone().addScaledVector(sideDirection, COMBAT_SIDE_DISTANCE).add(upOffset);

  return {
    pose: {
      position,
      target: target.clone()
    },
    side
  };
}

function getCombatEventKey(event: CombatCameraEventInput): string {
  return `${event.from}-${event.to}-${event.capturedSquare}`;
}

function shouldTransitionOut(input: CombatCameraStateInput): boolean {
  if (input.combatDurationMs === null) {
    return false;
  }

  return input.combatRemainingMs <= TRANSITION_OUT_MS;
}

function presetToPose(preset: CameraPreset): CameraPose {
  return {
    position: new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z),
    target: new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z)
  };
}

function clonePose(pose: CameraPose): CameraPose {
  return {
    position: pose.position.clone(),
    target: pose.target.clone()
  };
}

function sphericalLerpPose(from: CameraPose, to: CameraPose, pivot: THREE.Vector3, t: number): CameraPose {
  const fromOffset = from.position.clone().sub(pivot);
  const toOffset = to.position.clone().sub(pivot);
  const fromRadius = Math.max(fromOffset.length(), MIN_PIVOT_RADIUS);
  const toRadius = Math.max(toOffset.length(), MIN_PIVOT_RADIUS);
  const fromDirection = normalizeOrFallback(fromOffset, new THREE.Vector3(0, 1, 0));
  const toDirection = normalizeOrFallback(toOffset, fromDirection);
  const direction = slerpUnitVectors(fromDirection, toDirection, t);
  const radius = THREE.MathUtils.lerp(fromRadius, toRadius, t);

  return {
    position: pivot.clone().addScaledVector(direction, radius),
    target: from.target.clone().lerp(to.target, t)
  };
}

function applyPose(camera: THREE.PerspectiveCamera, pose: CameraPose): void {
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
}

function normalizeOrFallback(vector: THREE.Vector3, fallback: THREE.Vector3): THREE.Vector3 {
  if (vector.lengthSq() < MIN_PIVOT_RADIUS * MIN_PIVOT_RADIUS) {
    return fallback.clone().normalize();
  }

  return vector.clone().normalize();
}

function slerpUnitVectors(from: THREE.Vector3, to: THREE.Vector3, t: number): THREE.Vector3 {
  const dot = THREE.MathUtils.clamp(from.dot(to), -1, 1);

  if (dot > 0.9995) {
    return from.clone().lerp(to, t).normalize();
  }

  if (dot < -0.9995) {
    let axis = new THREE.Vector3().crossVectors(from, new THREE.Vector3(0, 1, 0));

    if (axis.lengthSq() < MIN_PIVOT_RADIUS * MIN_PIVOT_RADIUS) {
      axis = new THREE.Vector3().crossVectors(from, new THREE.Vector3(1, 0, 0));
    }

    axis.normalize();
    return from.clone().applyAxisAngle(axis, Math.PI * t).normalize();
  }

  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const fromWeight = Math.sin((1 - t) * theta) / sinTheta;
  const toWeight = Math.sin(t * theta) / sinTheta;

  return from
    .clone()
    .multiplyScalar(fromWeight)
    .add(to.clone().multiplyScalar(toWeight))
    .normalize();
}

function vectorToFixed(vector: THREE.Vector3): { x: number; y: number; z: number } {
  return {
    x: Number(vector.x.toFixed(2)),
    y: Number(vector.y.toFixed(2)),
    z: Number(vector.z.toFixed(2))
  };
}

function getPriority(mode: CombatCameraMode): CombatCameraPriority {
  if (mode === 'combatTransitionOut') {
    return 'returnToInspect';
  }

  if (mode === 'board') {
    return 'userInspect';
  }

  return 'combatCinematic';
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}
