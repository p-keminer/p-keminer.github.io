import * as THREE from 'three';
import type { CameraPreset } from './camera';

export interface RoomCameraControls {
  animateExit: (onComplete: () => void) => void;
  dispose: () => void;
  getPose: () => CameraPreset;
  setEnabled: (enabled: boolean) => void;
  setLandscapeLock: (locked: boolean) => void;
  setPortraitMode: (portrait: boolean) => void;
  setPose: (preset: CameraPreset) => void;
  startEntranceAnimation: () => void;
}

interface CreateRoomCameraControlsOptions {
  domElement: HTMLCanvasElement;
  onPoseChange: (preset: CameraPreset) => void;
}

// Jeder Schritt mit dem Scrollrad multipliziert den Radius mit diesem Faktor (Zoom-In = verringert)
const ZOOM_FACTOR_PER_STEP = 0.9;
// Maximale Anzahl von Zoom-In-Schritten aus dem anfänglichen Übersichtsradius
const MAX_ZOOM_STEPS = 3;
const ENTRANCE_DURATION_MS = 700;
const EXIT_DURATION_MS = 500;

export function createRoomCameraControls({
  domElement,
  onPoseChange
}: CreateRoomCameraControlsOptions): RoomCameraControls {
  const target = new THREE.Vector3(-10, 6, 8.6);
  const spherical = new THREE.Spherical(63, 1.0, -0.85);

  let enabled = false;
  let portraitMode = false;
  let landscapeLocked = false;
  // baseRadius ist der Radius beim letzten setPose-Aufruf — dient als Zoom-Out-Obergrenze
  let baseRadius = spherical.radius;
  let minZoomRadius = baseRadius * Math.pow(ZOOM_FACTOR_PER_STEP, MAX_ZOOM_STEPS);

  let entranceRafId = 0;
  let entranceStartTime = 0;
  let entranceStartRadius = baseRadius;
  let entranceEndRadius = baseRadius;

  let exitRafId = 0;
  let exitStartTime = 0;
  let exitStartRadius = baseRadius;
  let exitOnComplete: (() => void) | null = null;

  // ── Touch-Pinch-zum-Zoomen ──────────────────────────────────────────────
  const activeTouches = new Map<number, { x: number; y: number }>();
  let pinchStartDistance = 0;
  let pinchStartRadius = 0;

  // rAF-Coalescing: Wheel/Pinch-Events feuern öfter als der Bildschirm
  // aktualisieren kann (besonders auf 120Hz Tablets). Wir bündeln auf max 1× pro Frame.
  let poseUpdateScheduled = false;
  function schedulePoseUpdate(): void {
    if (poseUpdateScheduled) return;
    poseUpdateScheduled = true;
    requestAnimationFrame(() => {
      poseUpdateScheduled = false;
      onPoseChange(buildCurrentPose());
    });
  }

  domElement.addEventListener('wheel', handleWheel, { passive: false });
  domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
  domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
  domElement.addEventListener('touchend', handleTouchEnd);
  domElement.addEventListener('touchcancel', handleTouchEnd);

  return {
    dispose: () => {
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(entranceRafId);
      cancelAnimationFrame(exitRafId);
    },
    getPose: () => buildCurrentPose(),
    setEnabled: (nextEnabled: boolean) => {
      enabled = nextEnabled;
      if (!nextEnabled) {
        cancelAnimationFrame(entranceRafId);
      }
    },
    setLandscapeLock: (locked: boolean) => {
      landscapeLocked = locked;
    },
    setPortraitMode: (portrait: boolean) => {
      // Hinweis: Dies löst kein erneutes Rendern aus sich selbst.
      // Es wird immer in resize() aufgerufen, auf das ein render()-Aufruf folgt.
      portraitMode = portrait;
    },
    animateExit: (onComplete: () => void) => {
      cancelAnimationFrame(entranceRafId);
      cancelAnimationFrame(exitRafId);
      exitStartRadius = spherical.radius;
      exitOnComplete = onComplete;
      exitStartTime = performance.now();
      animateExit();
    },
    setPose: (preset: CameraPreset) => {
      cancelAnimationFrame(entranceRafId);
      cancelAnimationFrame(exitRafId);
      const pos = new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z);
      target.set(preset.target.x, preset.target.y, preset.target.z);
      const offset = pos.clone().sub(target);
      spherical.setFromVector3(offset);
      baseRadius = spherical.radius;
      minZoomRadius = baseRadius * Math.pow(ZOOM_FACTOR_PER_STEP, MAX_ZOOM_STEPS);
      // Hochformat: sofort zum maximalen Zoom. Landscape-Mobile: zwei Schritte näher. Desktop: ein Schritt näher.
      spherical.radius = portraitMode ? minZoomRadius
        : landscapeLocked ? baseRadius * Math.pow(ZOOM_FACTOR_PER_STEP, 2)
        : baseRadius * ZOOM_FACTOR_PER_STEP;
    },
    startEntranceAnimation: () => {
      cancelAnimationFrame(entranceRafId);
      // Beginnen von der nicht gezoomten Übersichtsposition und einblenden.
      spherical.radius = baseRadius;
      entranceStartRadius = baseRadius;
      // Hochformat: zu maximalem Zoom animieren. Landscape-Mobile: zwei Schritte. Desktop: ein Schritt.
      entranceEndRadius = portraitMode ? minZoomRadius
        : landscapeLocked ? baseRadius * Math.pow(ZOOM_FACTOR_PER_STEP, 2)
        : baseRadius * ZOOM_FACTOR_PER_STEP;
      entranceStartTime = performance.now();
      animateEntrance();
    }
  };

  function animateEntrance(): void {
    const elapsed = performance.now() - entranceStartTime;
    const t = Math.min(elapsed / ENTRANCE_DURATION_MS, 1);
    const eased = 1 - Math.pow(1 - t, 3); // Ease-Out-Kubisch
    spherical.radius = entranceStartRadius + (entranceEndRadius - entranceStartRadius) * eased;
    onPoseChange(buildCurrentPose());
    if (t < 1) {
      entranceRafId = requestAnimationFrame(animateEntrance);
    }
  }

  function animateExit(): void {
    const elapsed = performance.now() - exitStartTime;
    const t = Math.min(elapsed / EXIT_DURATION_MS, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease-In-Out-Quadratisch
    spherical.radius = exitStartRadius + (baseRadius - exitStartRadius) * eased;
    onPoseChange(buildCurrentPose());
    if (t < 1) {
      exitRafId = requestAnimationFrame(animateExit);
    } else {
      exitOnComplete?.();
      exitOnComplete = null;
    }
  }

  function buildCurrentPose(): CameraPreset {
    const position = new THREE.Vector3().setFromSpherical(spherical).add(target);

    return {
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z }
    };
  }

  function handleWheel(event: WheelEvent): void {
    if (!enabled || portraitMode || landscapeLocked) {
      return;
    }

    event.preventDefault();
    cancelAnimationFrame(entranceRafId);

    // Zoom-In (deltaY < 0) oder Zoom-Out (deltaY > 0), begrenzt zwischen minZoomRadius und baseRadius
    const zoomFactor = 1 + event.deltaY * 0.001;
    spherical.radius = clamp(spherical.radius * zoomFactor, minZoomRadius, baseRadius);
    schedulePoseUpdate();
  }

  // ── Touch-Pinch-zum-Zoomen-Handler ────────────────────────────────────────

  function getTouchDistance(): number {
    const pts = [...activeTouches.values()];
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(event: TouchEvent): void {
    if (!enabled || portraitMode || landscapeLocked) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const t = event.changedTouches[i];
      activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }

    if (activeTouches.size >= 2) {
      cancelAnimationFrame(entranceRafId);
      pinchStartDistance = getTouchDistance();
      pinchStartRadius = spherical.radius;
      event.preventDefault();
    }
  }

  function handleTouchMove(event: TouchEvent): void {
    if (!enabled || portraitMode || landscapeLocked || activeTouches.size < 2) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const t = event.changedTouches[i];
      const prev = activeTouches.get(t.identifier);
      if (prev) {
        prev.x = t.clientX;
        prev.y = t.clientY;
      }
    }

    const currentDistance = getTouchDistance();
    const scale = pinchStartDistance / Math.max(currentDistance, 1);
    spherical.radius = clamp(pinchStartRadius * scale, minZoomRadius, baseRadius);
    schedulePoseUpdate();
    event.preventDefault();
  }

  function handleTouchEnd(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      activeTouches.delete(event.changedTouches[i].identifier);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns the camera position that the free camera will rest at when
 * setPose() is called with the given preset.  Use this as the transition
 * toPreset so the lerp ends exactly where the free camera activates.
 *
 * @param portrait  If true, returns the max-zoom position (3 steps in)
 *                  matching portrait mode's setPose behaviour.
 */
export function computeFreeCameraEntryPreset(preset: CameraPreset, portrait = false): CameraPreset {
  const tgt = new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z);
  const offset = new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z).sub(tgt);
  const sph = new THREE.Spherical().setFromVector3(offset);
  sph.radius *= portrait ? Math.pow(ZOOM_FACTOR_PER_STEP, MAX_ZOOM_STEPS) : ZOOM_FACTOR_PER_STEP;
  const pos = new THREE.Vector3().setFromSpherical(sph).add(tgt);
  return {
    position: { x: pos.x, y: pos.y, z: pos.z },
    target: preset.target
  };
}
