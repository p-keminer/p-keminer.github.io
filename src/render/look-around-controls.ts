import * as THREE from 'three';

// Maximum pan angle in each direction (±45°)
const MAX_ANGLE_RAD = THREE.MathUtils.degToRad(45);

export interface LookAroundControls {
  /** Current yaw/pitch offset in radians. Apply after setting camera to base preset. */
  getOffset(): { yaw: number; pitch: number };
  /** Enable or disable the controller. Resets drag state. */
  setEnabled(enabled: boolean): void;
  /** Reset yaw/pitch to zero (call when navigating to a new area). */
  reset(): void;
  /** Remove all event listeners. */
  dispose(): void;
}

/**
 * Look-around controller — touch-only.
 * Keeps camera position fixed but lets the user rotate the view direction
 * by dragging a finger. Limited to ±45° in both axes.
 *
 * Sensitivity is normalised to the DOM element size so a full-width swipe
 * covers the entire ±45° range regardless of screen size.
 *
 * Multi-touch is detected: when a second finger lands, dragging pauses so
 * pinch-to-zoom (handled elsewhere) doesn't cause wild camera jumps.
 *
 * @param domElement  Canvas element to attach to.
 * @param onChange    Called on every touch-move that changes the offset.
 *                    Use to keep DOM overlays (hotspots) in sync with the
 *                    rotated camera without waiting for the next state event.
 */
export function createLookAroundControls(
  domElement: HTMLElement,
  onChange?: () => void
): LookAroundControls {
  let enabled = false;
  let yaw = 0;   // horizontal offset (radians)
  let pitch = 0; // vertical offset (radians)

  // Track active touch pointers to detect multi-touch and ignore pinch gestures.
  let primaryPointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let activeTouchCount = 0;

  function onPointerDown(e: PointerEvent): void {
    // Touch only — desktop mouse drag is not handled here.
    if (!enabled || e.pointerType !== 'touch') return;

    activeTouchCount++;

    // Only start dragging with the first finger
    if (activeTouchCount === 1) {
      primaryPointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      domElement.setPointerCapture(e.pointerId);
    }
    // Second+ finger: stop dragging to avoid conflict with pinch-to-zoom
  }

  function onPointerMove(e: PointerEvent): void {
    if (!enabled || e.pointerType !== 'touch') return;
    // Only process moves from the primary finger, and only when exactly 1 touch is active
    if (e.pointerId !== primaryPointerId || activeTouchCount !== 1) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Normalise delta to DOM element size — full-width swipe = full ±MAX range
    const w = Math.max(domElement.clientWidth, 1);
    const h = Math.max(domElement.clientHeight, 1);

    yaw   = THREE.MathUtils.clamp(yaw   - (dx / w) * MAX_ANGLE_RAD * 2, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
    pitch = THREE.MathUtils.clamp(pitch - (dy / h) * MAX_ANGLE_RAD * 2, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);

    onChange?.();
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;

    activeTouchCount = Math.max(0, activeTouchCount - 1);

    if (e.pointerId === primaryPointerId) {
      primaryPointerId = null;
    }
  }

  domElement.addEventListener('pointerdown',   onPointerDown);
  domElement.addEventListener('pointermove',   onPointerMove);
  domElement.addEventListener('pointerup',     onPointerUp);
  domElement.addEventListener('pointercancel', onPointerUp);

  return {
    getOffset: () => ({ yaw, pitch }),

    setEnabled(val: boolean): void {
      enabled = val;
      if (!val) {
        primaryPointerId = null;
        activeTouchCount = 0;
      }
    },

    reset(): void {
      yaw = 0;
      pitch = 0;
      primaryPointerId = null;
      activeTouchCount = 0;
    },

    dispose(): void {
      domElement.removeEventListener('pointerdown',   onPointerDown);
      domElement.removeEventListener('pointermove',   onPointerMove);
      domElement.removeEventListener('pointerup',     onPointerUp);
      domElement.removeEventListener('pointercancel', onPointerUp);
    }
  };
}
