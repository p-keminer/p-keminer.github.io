import * as THREE from 'three';

export interface CameraPreset {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export const DEFAULT_CAMERA_PRESET: CameraPreset = {
  position: { x: 6.8, y: 8.2, z: 7.8 },
  target: { x: 0, y: 0.2, z: 0 }
};

export function createBoardCamera(aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 100);
  applyCameraPreset(camera, DEFAULT_CAMERA_PRESET);
  return camera;
}

export function applyCameraPreset(camera: THREE.PerspectiveCamera, preset: CameraPreset): void {
  camera.position.set(preset.position.x, preset.position.y, preset.position.z);
  camera.lookAt(preset.target.x, preset.target.y, preset.target.z);
}

export function resizeCamera(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}
