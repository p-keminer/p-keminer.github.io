import * as THREE from 'three';

const MAX_ANGLE_RAD = THREE.MathUtils.degToRad(45);
const MOUSE_DRAG_THRESHOLD_PX = 5;
const TOUCH_DRAG_THRESHOLD_PX = 8;

type LookPointerType = 'mouse' | 'touch';

export interface LookAroundControls {
  /** Current yaw/pitch offset in radians. Apply after setting the base camera preset. */
  getOffset(): { yaw: number; pitch: number };
  /** Enable or disable interaction. Disabling also cancels and releases an active gesture. */
  setEnabled(enabled: boolean): void;
  /** Allow or block vertical look. When blocked, only yaw is retained. */
  setAllowPitch(allow: boolean): void;
  /** Maximum positive yaw (looking left) in degrees. */
  setMaxYawLeft(degrees: number): void;
  /** Maximum negative yaw (looking right) in degrees. */
  setMaxYawRight(degrees: number): void;
  /** Reset yaw/pitch and cancel an active gesture. */
  reset(): void;
  /** Animate yaw/pitch back to zero. */
  animateReset(onComplete: () => void): void;
  /** Whether a reset animation is currently active. */
  isAnimatingReset(): boolean;
  /** Remove all event listeners. */
  dispose(): void;
}

/**
 * Fixed-position look controller for left-mouse drag and one-finger touch.
 *
 * A small movement threshold keeps taps intact. Once a real drag happened,
 * the synthetic click generated for that same gesture is consumed on the
 * canvas before board or raycast listeners can observe it.
 *
 * A second touch marks the gesture as pinch-contaminated and restores the
 * offset from the first touch-down. The separate room camera controller can
 * therefore continue to own two-finger pinch zoom without a yaw jump.
 */
export function createLookAroundControls(
  domElement: HTMLElement,
  onChange?: () => void
): LookAroundControls {
  let enabled = false;
  let allowPitch = false;
  let maxYawPositive = MAX_ANGLE_RAD;
  let maxYawNegative = MAX_ANGLE_RAD;
  let yaw = 0;
  let pitch = 0;

  let primaryPointerId: number | null = null;
  let primaryPointerType: LookPointerType | null = null;
  let pointerCaptureActive = false;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;
  let suppressNextClick = false;

  let activeTouchCount = 0;
  let snapshotYaw = 0;
  let snapshotPitch = 0;
  let gestureContaminated = false;

  const RESET_DURATION_MS = 400;
  let resetRafId = 0;
  let resetStartTime = 0;
  let resetStartYaw = 0;
  let resetStartPitch = 0;
  let resetOnComplete: (() => void) | null = null;

  function beginPrimaryPointer(event: PointerEvent, pointerType: LookPointerType): void {
    primaryPointerId = event.pointerId;
    primaryPointerType = pointerType;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;
    dragging = false;
    snapshotYaw = yaw;
    snapshotPitch = pitch;
    gestureContaminated = false;

    try {
      domElement.setPointerCapture(event.pointerId);
      pointerCaptureActive = true;
    } catch {
      pointerCaptureActive = false;
    }
  }

  function releasePrimaryPointer(): void {
    const pointerId = primaryPointerId;
    const shouldRelease = pointerId !== null && pointerCaptureActive;

    primaryPointerId = null;
    primaryPointerType = null;
    pointerCaptureActive = false;
    dragging = false;

    if (!shouldRelease || pointerId === null) {
      return;
    }

    try {
      if (domElement.hasPointerCapture(pointerId)) {
        domElement.releasePointerCapture(pointerId);
      }
    } catch {
      // Capture can already be gone after a browser-level cancellation.
    }
  }

  function cancelGesture(): void {
    releasePrimaryPointer();
    activeTouchCount = 0;
    gestureContaminated = false;
  }

  function onPointerDown(event: PointerEvent): void {
    // A new physical gesture must never inherit click suppression from an
    // earlier drag for which the browser emitted no click.
    suppressNextClick = false;

    if (!enabled || resetOnComplete !== null) {
      return;
    }

    if (event.pointerType === 'mouse') {
      if (!event.isPrimary || event.button !== 0 || primaryPointerId !== null) {
        return;
      }

      beginPrimaryPointer(event, 'mouse');
      return;
    }

    if (event.pointerType !== 'touch') {
      return;
    }

    activeTouchCount += 1;

    if (activeTouchCount === 1 && primaryPointerId === null) {
      beginPrimaryPointer(event, 'touch');
      return;
    }

    if (primaryPointerType !== 'touch' || gestureContaminated) {
      return;
    }

    gestureContaminated = true;
    dragging = false;
    const changed = yaw !== snapshotYaw || pitch !== snapshotPitch;
    yaw = snapshotYaw;
    pitch = snapshotPitch;
    if (changed) {
      onChange?.();
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!enabled || event.pointerId !== primaryPointerId || primaryPointerType === null) {
      return;
    }

    if (primaryPointerType === 'mouse' && (event.buttons & 1) === 0) {
      const shouldSuppressClick = dragging;
      releasePrimaryPointer();
      suppressNextClick = shouldSuppressClick;
      return;
    }

    if (
      primaryPointerType === 'touch' &&
      (activeTouchCount !== 1 || gestureContaminated)
    ) {
      return;
    }

    if (!dragging) {
      const threshold = primaryPointerType === 'touch'
        ? TOUCH_DRAG_THRESHOLD_PX
        : MOUSE_DRAG_THRESHOLD_PX;
      const distance = Math.hypot(
        event.clientX - pointerStartX,
        event.clientY - pointerStartY
      );

      if (distance < threshold) {
        return;
      }

      dragging = true;
    }

    event.preventDefault();

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;

    const width = Math.max(domElement.clientWidth, 1);
    const height = Math.max(domElement.clientHeight, 1);
    const nextYaw = THREE.MathUtils.clamp(
      yaw - (dx / width) * MAX_ANGLE_RAD * 2,
      -maxYawNegative,
      maxYawPositive
    );
    const nextPitch = allowPitch
      ? THREE.MathUtils.clamp(
          pitch - (dy / height) * MAX_ANGLE_RAD * 2,
          -MAX_ANGLE_RAD,
          MAX_ANGLE_RAD
        )
      : 0;

    if (nextYaw === yaw && nextPitch === pitch) {
      return;
    }

    yaw = nextYaw;
    pitch = nextPitch;
    onChange?.();
  }

  function onPointerUpOrCancel(event: PointerEvent): void {
    const isTouch = event.pointerType === 'touch';
    if (isTouch) {
      activeTouchCount = Math.max(0, activeTouchCount - 1);
    }

    if (event.pointerId !== primaryPointerId) {
      return;
    }

    const shouldSuppressClick =
      event.type === 'pointerup' && dragging && !gestureContaminated;
    releasePrimaryPointer();
    suppressNextClick = shouldSuppressClick;

    if (activeTouchCount === 0) {
      gestureContaminated = false;
    }
  }

  function onLostPointerCapture(event: PointerEvent): void {
    if (event.pointerId !== primaryPointerId) {
      return;
    }

    primaryPointerId = null;
    primaryPointerType = null;
    pointerCaptureActive = false;
    dragging = false;
    activeTouchCount = 0;
    gestureContaminated = false;
  }

  function onClickCapture(event: MouseEvent): void {
    if (!suppressNextClick || !enabled) {
      suppressNextClick = false;
      return;
    }

    suppressNextClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerup', onPointerUpOrCancel);
  domElement.addEventListener('pointercancel', onPointerUpOrCancel);
  domElement.addEventListener('lostpointercapture', onLostPointerCapture);
  domElement.addEventListener('click', onClickCapture, true);

  return {
    getOffset: () => ({ yaw, pitch }),

    setEnabled(nextEnabled: boolean): void {
      if (enabled === nextEnabled) {
        return;
      }

      enabled = nextEnabled;
      if (!enabled) {
        cancelGesture();
        suppressNextClick = false;
      }
    },

    setAllowPitch(allow: boolean): void {
      allowPitch = allow;
      if (!allowPitch) {
        pitch = 0;
      }
    },

    setMaxYawLeft(degrees: number): void {
      maxYawPositive = THREE.MathUtils.clamp(
        THREE.MathUtils.degToRad(degrees),
        0,
        MAX_ANGLE_RAD
      );
      yaw = Math.min(yaw, maxYawPositive);
    },

    setMaxYawRight(degrees: number): void {
      maxYawNegative = THREE.MathUtils.clamp(
        THREE.MathUtils.degToRad(degrees),
        0,
        MAX_ANGLE_RAD
      );
      yaw = Math.max(yaw, -maxYawNegative);
    },

    reset(): void {
      cancelAnimationFrame(resetRafId);
      resetOnComplete = null;
      yaw = 0;
      pitch = 0;
      suppressNextClick = false;
      cancelGesture();
    },

    animateReset(onComplete: () => void): void {
      cancelGesture();
      if (Math.abs(yaw) < 0.001 && Math.abs(pitch) < 0.001) {
        yaw = 0;
        pitch = 0;
        onComplete();
        return;
      }

      cancelAnimationFrame(resetRafId);
      resetStartYaw = yaw;
      resetStartPitch = pitch;
      resetStartTime = performance.now();
      resetOnComplete = onComplete;
      tickResetAnimation();
    },

    isAnimatingReset(): boolean {
      return resetOnComplete !== null;
    },

    dispose(): void {
      cancelAnimationFrame(resetRafId);
      resetOnComplete = null;
      cancelGesture();
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerup', onPointerUpOrCancel);
      domElement.removeEventListener('pointercancel', onPointerUpOrCancel);
      domElement.removeEventListener('lostpointercapture', onLostPointerCapture);
      domElement.removeEventListener('click', onClickCapture, true);
    }
  };

  function tickResetAnimation(): void {
    const elapsed = performance.now() - resetStartTime;
    const t = Math.min(elapsed / RESET_DURATION_MS, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    yaw = resetStartYaw * (1 - eased);
    pitch = resetStartPitch * (1 - eased);
    onChange?.();

    if (t < 1) {
      resetRafId = requestAnimationFrame(tickResetAnimation);
      return;
    }

    yaw = 0;
    pitch = 0;
    const callback = resetOnComplete;
    resetOnComplete = null;
    callback?.();
  }
}
