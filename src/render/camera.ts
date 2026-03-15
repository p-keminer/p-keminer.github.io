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
  // On portrait screens (aspect < 1) the fixed vertical FOV makes the board
  // appear small because the horizontal FOV becomes very narrow. We widen
  // the vertical FOV so that the horizontal FOV stays close to the desktop
  // baseline: hFov = 2·atan(aspect · tan(baseFov/2)).
  // On landscape (aspect >= 1) we keep the original 34° FOV.
  if (camera.aspect < 1) {
    // Target: keep the same horizontal extent as a landscape 1:1 screen.
    // vFov = 2·atan( tan(baseFov/2) / aspect )
    const baseRad = THREE.MathUtils.degToRad(BASE_FOV);
    const vFov = 2 * Math.atan(Math.tan(baseRad / 2) / camera.aspect);
    camera.fov = THREE.MathUtils.radToDeg(vFov);
  } else {
    camera.fov = BASE_FOV;
  }
  camera.updateProjectionMatrix();
}
