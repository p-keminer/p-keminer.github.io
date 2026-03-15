import * as THREE from 'three';

export interface CameraPreset {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export const DEFAULT_CAMERA_PRESET: CameraPreset = {
  position: { x: 6.8, y: 8.2, z: 7.8 },
  target: { x: 0, y: 0.2, z: 0 }
};

export const BASE_FOV = 34;

export function createBoardCamera(aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.1, 100);
  applyCameraPreset(camera, DEFAULT_CAMERA_PRESET);
  return camera;
}

export function applyCameraPreset(camera: THREE.PerspectiveCamera, preset: CameraPreset): void {
  camera.position.set(preset.position.x, preset.position.y, preset.position.z);
  camera.lookAt(preset.target.x, preset.target.y, preset.target.z);
}

export function resizeCamera(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  camera.aspect = width / Math.max(height, 1);
  camera.fov = BASE_FOV;
  camera.updateProjectionMatrix();
}

/**
 * Widens the vertical FOV on portrait screens so the chess board fills the
 * screen width. Only call this in boardFocus mode — room-explore presets were
 * calibrated for BASE_FOV and look distorted with a wider angle.
 */
export function applyBoardFocusFov(camera: THREE.PerspectiveCamera): void {
  if (camera.aspect < 1) {
    const baseRad = THREE.MathUtils.degToRad(BASE_FOV);
    const vFov = 2 * Math.atan(Math.tan(baseRad / 2) / camera.aspect);
    camera.fov = THREE.MathUtils.radToDeg(vFov);
  } else {
    camera.fov = BASE_FOV;
  }
  camera.updateProjectionMatrix();
}
