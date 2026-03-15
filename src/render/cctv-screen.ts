import * as THREE from 'three';

const MESH_NAME = 'merged_mon_cctv_uv';

// Resolution of the off-screen render — low enough to look lo-fi/surveillance-y.
const RT_SIZE = 256;

// Orbit parameters for the CCTV camera pan loop.
// The camera slowly circles the board at a fixed height, with a gentle
// radius pulse to simulate a slow zoom in/out.  Only the cctvCamera is
// moved — the main camera and all other scene objects are untouched.
const ORBIT_RADIUS_BASE = 11;   // base distance from board centre
const ORBIT_RADIUS_PULSE = 2.5; // ±pulse on top of base (slow zoom feel)
const ORBIT_HEIGHT = 9;         // fixed Y
const ORBIT_SPEED = 0.06;       // radians per second (very slow pan)
const PULSE_SPEED = 0.18;       // radians per second (slow zoom cycle)

const _target = new THREE.Vector3(0, 0.5, 0);

export interface CCTVScreen {
  /** Swap the material on the CCTV monitor mesh found in the room GLB. */
  attach(roomRoot: THREE.Object3D): void;
  /** Advance the CCTV camera position — call once per animation frame. */
  tick(elapsedMs: number): void;
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

  // This camera belongs entirely to the CCTV system.
  // It is never assigned to the renderer as the active camera for the main view.
  const cctvCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  cctvCamera.position.set(ORBIT_RADIUS_BASE, ORBIT_HEIGHT, 0);
  cctvCamera.lookAt(_target);

  function tick(elapsedMs: number): void {
    const t = elapsedMs / 1000;
    const angle  = t * ORBIT_SPEED;
    const radius = ORBIT_RADIUS_BASE + Math.sin(t * PULSE_SPEED) * ORBIT_RADIUS_PULSE;
    cctvCamera.position.set(
      Math.cos(angle) * radius,
      ORBIT_HEIGHT,
      Math.sin(angle) * radius
    );
    cctvCamera.lookAt(_target);
  }

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
    tick,
    renderToTarget,
    dispose(): void {
      renderTarget.dispose();
    }
  };
}
