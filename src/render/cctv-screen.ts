import * as THREE from 'three';

const MESH_NAME = 'merged_mon_cctv_uv';

// Resolution of the off-screen render — low enough to look lo-fi/surveillance-y.
const RT_SIZE = 256;

// ── Safe angle range ──────────────────────────────────────────────────────
// The board camera starts at Spherical theta ≈ 0.717 rad (position 6.8, _, 7.8)
// and is allowed 170° to the right (decreasing theta).
//
// In the CCTV convention (x = cos(a), z = sin(a)):
//   cctv_angle = π/2 − spherical_theta
//   board start  → 0.85 rad
//   board end    → 0.85 + 2.97 = 3.82 rad  (170° further)
//
// We use only the middle ~100° of that range with 20° margins on each side
// so the camera never clips a wall.  The sweep is a sine-based ping-pong so
// it can never drift outside the defined limits.
const SWEEP_CENTER   = 0.85 + (2.97 / 2);   // ≈ 2.34 rad — midpoint of valid arc
const SWEEP_HALF     = 0.87;                 // ≈ 50°  on each side of centre
const SWEEP_SPEED    = 0.10;                 // rad/s — full cycle ≈ 63 s
const ORBIT_RADIUS   = 11;                   // fixed distance — no zoom pulse
const ORBIT_HEIGHT   = 9;

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
  // WebGL render targets have their origin at the bottom-left, while the mesh
  // UV expects top-left — flip the texture vertically to correct the rotation.
  renderTarget.texture.repeat.set(1, -1);
  renderTarget.texture.offset.set(0, 1);

  // This camera belongs entirely to the CCTV system.
  // It is never assigned to the renderer as the active camera for the main view.
  const cctvCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  cctvCamera.position.set(ORBIT_RADIUS, ORBIT_HEIGHT, 0);
  cctvCamera.lookAt(_target);

  function tick(elapsedMs: number): void {
    const t = elapsedMs / 1000;
    // Sine-based ping-pong — stays strictly within [SWEEP_CENTER ± SWEEP_HALF].
    const angle = SWEEP_CENTER + Math.sin(t * SWEEP_SPEED) * SWEEP_HALF;
    cctvCamera.position.set(
      Math.cos(angle) * ORBIT_RADIUS,
      ORBIT_HEIGHT,
      Math.sin(angle) * ORBIT_RADIUS
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
