import * as THREE from 'three';

const MESH_NAME = 'merged_mon_cctv_uv';

// Resolution of the off-screen render — low enough to look lo-fi/surveillance-y.
const RT_SIZE = 256;

export interface CCTVScreen {
  /** Swap the material on the CCTV monitor mesh found in the room GLB. */
  attach(roomRoot: THREE.Object3D): void;
  /**
   * Render the scene from the CCTV camera into the render target.
   * Call this BEFORE the main bloom render so the texture is up to date.
   */
  renderToTarget(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

export function createCCTVScreen(): CCTVScreen {
  const renderTarget = new THREE.WebGLRenderTarget(RT_SIZE, RT_SIZE, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    colorSpace: THREE.SRGBColorSpace
  });

  // Angled surveillance view of the chess board — roughly from the corner
  // of the room looking down toward the board centre.
  const cctvCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  cctvCamera.position.set(7, 11, -5);
  cctvCamera.lookAt(0, 0.5, 0);

  function renderToTarget(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, cctvCamera);
    renderer.setRenderTarget(null);
  }

  function attach(roomRoot: THREE.Object3D): void {
    roomRoot.traverse((node) => {
      if (node.name !== MESH_NAME || !(node instanceof THREE.Mesh)) return;
      node.material = new THREE.MeshBasicMaterial({
        map: renderTarget.texture,
        toneMapped: false
      });
    });
  }

  return {
    attach,
    renderToTarget,
    dispose(): void {
      renderTarget.dispose();
    }
  };
}
