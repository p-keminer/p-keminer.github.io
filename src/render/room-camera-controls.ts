import * as THREE from 'three';
import type { CameraPreset } from './camera';

type RoomGestureMode = 'idle' | 'orbit' | 'pan';

export interface RoomCameraControls {
  dispose: () => void;
  getPose: () => CameraPreset;
  setEnabled: (enabled: boolean) => void;
  setPose: (preset: CameraPreset) => void;
}

interface CreateRoomCameraControlsOptions {
  domElement: HTMLCanvasElement;
  onPoseChange: (preset: CameraPreset) => void;
}

const MIN_RADIUS = 3;
const MAX_RADIUS = 200;
const MIN_PHI = 0.08;
const MAX_PHI = Math.PI - 0.08;

// Room world bounds (generous — user calibrating camera positions)
const TARGET_MIN_X = -60;
const TARGET_MAX_X = 30;
const TARGET_MIN_Y = -10;
const TARGET_MAX_Y = 30;
const TARGET_MIN_Z = -30;
const TARGET_MAX_Z = 60;

export function createRoomCameraControls({
  domElement,
  onPoseChange
}: CreateRoomCameraControlsOptions): RoomCameraControls {
  const target = new THREE.Vector3(-10, 6, 8.6);
  const spherical = new THREE.Spherical(63, 1.0, -0.85); // roughly overview position

  // Scratch vectors for pan calculations — reused every pointermove, avoids GC pressure.
  const _panPos   = new THREE.Vector3();
  const _panTgt   = new THREE.Vector3();
  const _panView  = new THREE.Vector3();
  const _panRight = new THREE.Vector3();
  const _panFwd   = new THREE.Vector3();
  const _panUp    = new THREE.Vector3(0, 1, 0);

  let enabled = false;
  let gestureMode: RoomGestureMode = 'idle';
  let activePointerId: number | null = null;
  let pointerCaptureActive = false;

  domElement.addEventListener('contextmenu', handleContextMenu);
  domElement.addEventListener('mousedown', handleMiddleMouseInterception, true);
  domElement.addEventListener('mouseup', handleMiddleMouseInterception, true);
  domElement.addEventListener('click', handleMiddleMouseInterception, true);
  domElement.addEventListener('auxclick', handleMiddleMouseInterception, true);
  domElement.addEventListener('pointerdown', handlePointerDown);
  domElement.addEventListener('pointermove', handlePointerMove);
  domElement.addEventListener('pointerup', handlePointerUpOrCancel);
  domElement.addEventListener('pointercancel', handlePointerUpOrCancel);
  domElement.addEventListener('lostpointercapture', handleLostPointerCapture);
  domElement.addEventListener('wheel', handleWheel, { passive: false });

  return {
    dispose: () => {
      domElement.removeEventListener('contextmenu', handleContextMenu);
      domElement.removeEventListener('mousedown', handleMiddleMouseInterception, true);
      domElement.removeEventListener('mouseup', handleMiddleMouseInterception, true);
      domElement.removeEventListener('click', handleMiddleMouseInterception, true);
      domElement.removeEventListener('auxclick', handleMiddleMouseInterception, true);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerUpOrCancel);
      domElement.removeEventListener('pointercancel', handlePointerUpOrCancel);
      domElement.removeEventListener('lostpointercapture', handleLostPointerCapture);
      domElement.removeEventListener('wheel', handleWheel);
      cancelGesture();
    },
    getPose: () => buildCurrentPose(),
    setEnabled: (nextEnabled: boolean) => {
      enabled = nextEnabled;

      if (!enabled) {
        cancelGesture();
      }
    },
    setPose: (preset: CameraPreset) => {
      const pos = new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z);
      target.set(preset.target.x, preset.target.y, preset.target.z);
      const offset = pos.clone().sub(target);
      spherical.setFromVector3(offset);
      spherical.radius = clamp(spherical.radius, MIN_RADIUS, MAX_RADIUS);
      spherical.phi = clamp(spherical.phi, MIN_PHI, MAX_PHI);
    }
  };

  function buildCurrentPose(): CameraPreset {
    const position = new THREE.Vector3().setFromSpherical(spherical).add(target);

    return {
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z }
    };
  }

  function cancelGesture(): void {
    if (activePointerId !== null && pointerCaptureActive && domElement.hasPointerCapture(activePointerId)) {
      domElement.releasePointerCapture(activePointerId);
    }

    activePointerId = null;
    gestureMode = 'idle';
    pointerCaptureActive = false;
  }

  function handleContextMenu(event: MouseEvent): void {
    if (!enabled) {
      return;
    }

    event.preventDefault();
  }

  function handleMiddleMouseInterception(event: MouseEvent): void {
    if (!enabled || event.button !== 1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!enabled) {
      return;
    }

    if (event.button === 0) {
      gestureMode = event.shiftKey ? 'pan' : 'orbit';
    } else if (event.button === 1) {
      gestureMode = 'pan';
    } else if (event.button === 2) {
      gestureMode = event.shiftKey ? 'pan' : 'orbit';
    } else {
      return;
    }

    activePointerId = event.pointerId;

    try {
      domElement.setPointerCapture(event.pointerId);
      pointerCaptureActive = true;
    } catch {
      pointerCaptureActive = false;
    }

    event.preventDefault();
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!enabled || activePointerId !== event.pointerId || gestureMode === 'idle') {
      return;
    }

    if (!pointerCaptureActive && event.buttons === 0) {
      cancelGesture();
      return;
    }

    event.preventDefault();

    if (gestureMode === 'orbit') {
      spherical.theta -= event.movementX * 0.005;
      spherical.phi = clamp(spherical.phi + event.movementY * 0.004, MIN_PHI, MAX_PHI);
      onPoseChange(buildCurrentPose());
      return;
    }

    const pose = buildCurrentPose();
    _panPos.set(pose.position.x, pose.position.y, pose.position.z);
    _panTgt.set(pose.target.x, pose.target.y, pose.target.z);
    _panView.subVectors(_panTgt, _panPos).normalize();
    _panRight.crossVectors(_panView, _panUp).normalize();
    _panFwd.crossVectors(_panUp, _panRight).normalize();
    const right = _panRight;
    const forward = _panFwd;
    const panScale = spherical.radius * 0.002;

    target.addScaledVector(right, -event.movementX * panScale);
    target.addScaledVector(forward, event.movementY * panScale);
    target.x = clamp(target.x, TARGET_MIN_X, TARGET_MAX_X);
    target.y = clamp(target.y, TARGET_MIN_Y, TARGET_MAX_Y);
    target.z = clamp(target.z, TARGET_MIN_Z, TARGET_MAX_Z);

    onPoseChange(buildCurrentPose());
  }

  function handlePointerUpOrCancel(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) {
      return;
    }

    cancelGesture();
  }

  function handleLostPointerCapture(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) {
      return;
    }

    activePointerId = null;
    gestureMode = 'idle';
    pointerCaptureActive = false;
  }

  function handleWheel(event: WheelEvent): void {
    if (!enabled) {
      return;
    }

    event.preventDefault();
    const zoomFactor = 1 + event.deltaY * 0.001;
    spherical.radius = clamp(spherical.radius * zoomFactor, MIN_RADIUS, MAX_RADIUS);
    onPoseChange(buildCurrentPose());
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
