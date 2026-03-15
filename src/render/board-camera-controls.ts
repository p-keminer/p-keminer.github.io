import * as THREE from 'three';
import { DEFAULT_CAMERA_PRESET, type CameraPreset } from './camera';

type CameraGestureMode = 'idle' | 'orbit' | 'pan';

export interface BoardCameraControlsSnapshot {
  controlsLocked: boolean;
  gestureMode: CameraGestureMode;
}

export interface BoardCameraControls {
  dispose: () => void;
  getPose: () => CameraPreset;
  getSnapshot: () => BoardCameraControlsSnapshot;
  reset: () => boolean;
  setLocked: (locked: boolean) => boolean;
}

interface CreateBoardCameraControlsOptions {
  domElement: HTMLCanvasElement;
  onPoseChange: (preset: CameraPreset) => void;
}

const MIN_RADIUS = 7.2;
const MAX_RADIUS = 16.5;
const MIN_PHI = 0.58;
const MAX_PHI = 1.3 - (5 * Math.PI) / 180; // last 5° at bottom locked
const MAX_TARGET_OFFSET = 1.65;
const MAX_TARGET_HEIGHT = 0.9;
// Total horizontal rotation range: 170° to the LEFT from the default starting angle.
// Prevents the camera from orbiting to the opponent's side of the board.
const THETA_LEFT_RANGE = (170 * Math.PI) / 180; // 170° in radians

export function createBoardCameraControls({
  domElement,
  onPoseChange
}: CreateBoardCameraControlsOptions): BoardCameraControls {
  const defaultTarget = new THREE.Vector3(
    DEFAULT_CAMERA_PRESET.target.x,
    DEFAULT_CAMERA_PRESET.target.y,
    DEFAULT_CAMERA_PRESET.target.z
  );
  const defaultOffset = new THREE.Vector3(
    DEFAULT_CAMERA_PRESET.position.x - DEFAULT_CAMERA_PRESET.target.x,
    DEFAULT_CAMERA_PRESET.position.y - DEFAULT_CAMERA_PRESET.target.y,
    DEFAULT_CAMERA_PRESET.position.z - DEFAULT_CAMERA_PRESET.target.z
  );
  const spherical = new THREE.Spherical().setFromVector3(defaultOffset);
  // Pre-computed default spherical angles — avoids two temporary Spherical allocations in reset().
  const defaultSpherical = new THREE.Spherical().setFromVector3(defaultOffset);
  const target = defaultTarget.clone();
  // Theta clamp: from the default starting angle, only 170° to the right is allowed.
  // Left of the starting position is always locked.
  const minTheta = spherical.theta - THETA_LEFT_RANGE;   // 170° to the right
  const maxTheta = spherical.theta;                       // no rotation to the left of start
  let controlsLocked = false;
  let gestureMode: CameraGestureMode = 'idle';
  let activePointerId: number | null = null;
  let pointerCaptureActive = false;

  // ── Touch support ──────────────────────────────────────────────────────
  // Single-finger drag → orbit, two-finger pinch → zoom.
  // We track active touches separately from the mouse/pointer gesture above.
  const activeTouches = new Map<number, { x: number; y: number }>();
  let touchGestureMode: 'idle' | 'orbit' | 'pinch' = 'idle';
  let pinchStartDistance = 0;
  let pinchStartRadius = 0;

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
  domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
  domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
  domElement.addEventListener('touchend', handleTouchEnd);
  domElement.addEventListener('touchcancel', handleTouchEnd);
  window.addEventListener('keydown', handleKeyDown);

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
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      cancelGesture();
    },
    getPose: () => buildCurrentPose(),
    getSnapshot: () => ({
      controlsLocked,
      gestureMode
    }),
    reset: () => {
      const didChange =
        !target.equals(defaultTarget) ||
        spherical.radius !== defaultOffset.length() ||
        spherical.theta !== defaultSpherical.theta ||
        spherical.phi !== defaultSpherical.phi;

      target.copy(defaultTarget);
      spherical.setFromVector3(defaultOffset);
      cancelGesture();
      onPoseChange(buildCurrentPose());
      return didChange;
    },
    setLocked: (locked) => {
      if (controlsLocked === locked) {
        return false;
      }

      controlsLocked = locked;

      if (controlsLocked) {
        cancelGesture();
      }

      return true;
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
    event.preventDefault();
  }

  function handleMiddleMouseInterception(event: MouseEvent): void {
    if (event.button !== 1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (controlsLocked || isEditableTarget(event.target)) {
      return;
    }

    if (event.key.toLowerCase() !== 'r') {
      return;
    }

    event.preventDefault();
    target.copy(defaultTarget);
    spherical.setFromVector3(defaultOffset);
    cancelGesture();
    onPoseChange(buildCurrentPose());
  }

  function handlePointerDown(event: PointerEvent): void {
    if (controlsLocked) {
      return;
    }

    if (event.button === 2) {
      gestureMode = event.shiftKey ? 'pan' : 'orbit';
    } else if (event.button === 1) {
      gestureMode = 'pan';
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
    if (controlsLocked || activePointerId !== event.pointerId || gestureMode === 'idle') {
      return;
    }

    if (!pointerCaptureActive && event.buttons === 0) {
      cancelGesture();
      return;
    }

    event.preventDefault();

    if (gestureMode === 'orbit') {
      spherical.theta = clamp(spherical.theta - event.movementX * 0.0085, minTheta, maxTheta);
      spherical.phi = clamp(spherical.phi + event.movementY * 0.0068, MIN_PHI, MAX_PHI);
      onPoseChange(buildCurrentPose());
      return;
    }

    const pose = buildCurrentPose();
    const position = new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z);
    const currentTarget = new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z);
    const viewDirection = currentTarget.clone().sub(position).normalize();
    const right = new THREE.Vector3().crossVectors(viewDirection, new THREE.Vector3(0, 1, 0)).normalize();
    const forward = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize();
    const panScale = spherical.radius * 0.0023;

    target.addScaledVector(right, -event.movementX * panScale);
    target.addScaledVector(forward, event.movementY * panScale);
    target.x = clamp(target.x, -MAX_TARGET_OFFSET, MAX_TARGET_OFFSET);
    target.y = clamp(target.y, 0, MAX_TARGET_HEIGHT);
    target.z = clamp(target.z, -MAX_TARGET_OFFSET, MAX_TARGET_OFFSET);

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
    if (controlsLocked) {
      return;
    }

    event.preventDefault();
    const zoomFactor = 1 + event.deltaY * 0.0012;
    spherical.radius = clamp(spherical.radius * zoomFactor, MIN_RADIUS, MAX_RADIUS);
    onPoseChange(buildCurrentPose());
  }

  // ── Touch gesture handlers ─────────────────────────────────────────────
  // Single finger = orbit, two fingers = pinch-to-zoom.

  function getTouchDistance(touches: Map<number, { x: number; y: number }>): number {
    const pts = [...touches.values()];
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(event: TouchEvent): void {
    if (controlsLocked) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const t = event.changedTouches[i];
      activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (activeTouches.size === 1) {
      touchGestureMode = 'orbit';
      // Prevent the browser from also firing pointer/mouse events for this touch,
      // which would cause the existing orbit handler to apply the same delta twice.
      event.preventDefault();
    } else if (activeTouches.size >= 2) {
      // Switch from orbit to pinch when a second finger lands
      touchGestureMode = 'pinch';
      pinchStartDistance = getTouchDistance(activeTouches);
      pinchStartRadius = spherical.radius;
      event.preventDefault();
    }
  }

  function handleTouchMove(event: TouchEvent): void {
    if (controlsLocked || touchGestureMode === 'idle') return;

    // Update stored positions
    for (let i = 0; i < event.changedTouches.length; i++) {
      const t = event.changedTouches[i];
      const prev = activeTouches.get(t.identifier);
      if (!prev) continue;

      if (touchGestureMode === 'orbit' && activeTouches.size === 1) {
        const dx = t.clientX - prev.x;
        const dy = t.clientY - prev.y;
        spherical.theta = clamp(spherical.theta - dx * 0.0085, minTheta, maxTheta);
        spherical.phi = clamp(spherical.phi + dy * 0.0068, MIN_PHI, MAX_PHI);
        onPoseChange(buildCurrentPose());
        event.preventDefault();
      }

      prev.x = t.clientX;
      prev.y = t.clientY;
    }

    if (touchGestureMode === 'pinch' && activeTouches.size >= 2) {
      const currentDistance = getTouchDistance(activeTouches);
      const scale = pinchStartDistance / Math.max(currentDistance, 1);
      spherical.radius = clamp(pinchStartRadius * scale, MIN_RADIUS, MAX_RADIUS);
      onPoseChange(buildCurrentPose());
      event.preventDefault();
    }
  }

  function handleTouchEnd(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      activeTouches.delete(event.changedTouches[i].identifier);
    }

    if (activeTouches.size === 0) {
      touchGestureMode = 'idle';
    } else if (activeTouches.size === 1) {
      // Went from pinch back to one finger — switch to orbit.
      // Re-snapshot the remaining finger's current position from targetTouches
      // so the first orbit move doesn't compute a large stale delta.
      touchGestureMode = 'orbit';
      for (let i = 0; i < event.targetTouches.length; i++) {
        const t = event.targetTouches[i];
        const entry = activeTouches.get(t.identifier);
        if (entry) {
          entry.x = t.clientX;
          entry.y = t.clientY;
        }
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName));
}
