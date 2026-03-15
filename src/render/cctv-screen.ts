import * as THREE from 'three';

const MESH_NAME = 'merged_mon_cctv_uv';
const W = 256;
const H = 256;

export interface CCTVScreen {
  /** Swap the material on the CCTV monitor mesh found in the room GLB. */
  attach(roomRoot: THREE.Object3D): void;
  /** Redraw the canvas — call once per animation frame. */
  tick(elapsedMs: number): void;
  dispose(): void;
}

export function createCCTVScreen(): CCTVScreen {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Pre-allocate the noise buffer — reused every frame to avoid GC pressure.
  const imageData = ctx.createImageData(W, H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  function tick(elapsedMs: number): void {
    // ── Green-tinted static noise ──────────────────────────────────────────
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 55 + 8) | 0;
      data[i]     = 0;              // R
      data[i + 1] = v;              // G — green-phosphor tint
      data[i + 2] = (v * 0.25) | 0; // B — faint blue
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    // ── Scanline sweep ─────────────────────────────────────────────────────
    const scanY = Math.floor((elapsedMs * 0.07) % H);

    // Bright leading edge
    ctx.fillStyle = 'rgba(80, 255, 160, 0.18)';
    ctx.fillRect(0, scanY, W, 2);

    // Soft glow trail behind the line
    ctx.fillStyle = 'rgba(80, 255, 160, 0.06)';
    ctx.fillRect(0, (scanY - 10 + H) % H, W, 10);

    texture.needsUpdate = true;
  }

  function attach(roomRoot: THREE.Object3D): void {
    roomRoot.traverse((node) => {
      if (node.name !== MESH_NAME || !(node instanceof THREE.Mesh)) return;
      node.material = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false
      });
    });
  }

  return {
    attach,
    tick,
    dispose(): void {
      texture.dispose();
    }
  };
}
