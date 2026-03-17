import * as THREE from 'three';

const MESH_NAME = 'merged_mon_cctv_uv';

// Auflösung des Off-Screen-Render – niedrig genug, um lo-fi/Überwachungs-artig auszusehen.
// Reduziert auf 128 für Performance (CCTV-Monitor ist klein, 256 unötig).
const RT_SIZE = 128;

// ── Sicherer Winkelbereich ────────────────────────────────────────────────────────
// Die Board-Kamera beginnt bei Kugelkoordinaten-Theta ≈ 0.717 rad (Position 6.8, _, 7.8)
// und darf 170° nach rechts gehen (Theta abnehmen).
//
// In der CCTV-Konvention (x = cos(a), z = sin(a)):
//   cctv_angle = π/2 − spherical_theta
//   board start  → 0.85 rad
//   board end    → 0.85 + 2.97 = 3.82 rad  (170° weiter)
//
// Wir verwenden nur die mittleren ~100° dieses Bereichs mit 20° Rändern auf jeder Seite
// damit die Kamera nie eine Wand ausschneidet. Der Sweep ist sinusförmig hin und her, daher
// kann er nie außerhalb der definierten Grenzen abdriften.
const SWEEP_CENTER   = 0.85 + (2.97 / 2);   // ≈ 2.34 rad — midpoint of valid arc
const SWEEP_HALF     = 0.87;                 // ≈ 50°  on each side of centre
const SWEEP_SPEED    = 0.10;                 // rad/s — full cycle ≈ 63 s
const ORBIT_RADIUS   = 11;                   // fixed distance — no zoom pulse
const ORBIT_HEIGHT   = 9;

const _target = new THREE.Vector3(0, 0.5, 0);

export interface CCTVScreen {
  /** Das Material auf dem CCTV-Monitor-Mesh wechseln, das im Raum-GLB gefunden wird. */
  attach(roomRoot: THREE.Object3D): void;
  /** Die CCTV-Kameraposition vorantreiben – einmal pro Animation-Frame aufrufen. */
  tick(elapsedMs: number): void;
  /**
   * Die Szene aus der CCTV-Kamera ins Render-Target rendern.
   * BEVOR der Hauptbloom-Render aufrufen, damit die Textur aktuell ist.
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
  // WebGL-Render-Targets haben ihren Ursprung unten links, während die Mesh-UV
  // oben links erwartet – die Textur vertikal umkehren, um die Rotation zu korrigieren.
  renderTarget.texture.repeat.set(1, -1);
  renderTarget.texture.offset.set(0, 1);

  // Diese Kamera gehört vollständig zum CCTV-System.
  // Sie wird dem Renderer nie als aktive Kamera für die Hauptansicht zugewiesen.
  const cctvCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
  cctvCamera.position.set(ORBIT_RADIUS, ORBIT_HEIGHT, 0);
  cctvCamera.lookAt(_target);

  function tick(elapsedMs: number): void {
    const t = elapsedMs / 1000;
    // Sinusförmiges Hin-und-Her – bleibt streng innerhalb von [SWEEP_CENTER ± SWEEP_HALF].
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
