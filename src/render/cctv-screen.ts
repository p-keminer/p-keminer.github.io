import * as THREE from 'three';

const MESH_NAME = 'merged_mon_cctv_uv';
const TEX_SIZE = 256;

export interface CCTVScreen {
  attach(roomRoot: THREE.Object3D): void;
  tick(elapsedMs: number): void;
  renderToTarget(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

export function createCCTVScreen(): CCTVScreen {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#040810';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Grid
  ctx.strokeStyle = 'rgba(0, 180, 255, 0.08)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < TEX_SIZE; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, TEX_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(TEX_SIZE, i); ctx.stroke();
  }

  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let y = 0; y < TEX_SIZE; y += 4) {
    ctx.fillRect(0, y, TEX_SIZE, 2);
  }

  // Radar circles
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.2)';
  ctx.lineWidth = 1;
  for (const r of [30, 60, 90]) {
    ctx.beginPath(); ctx.arc(TEX_SIZE / 2, TEX_SIZE / 2, r, 0, Math.PI * 2); ctx.stroke();
  }

  // Cross-hair
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.15)';
  ctx.beginPath(); ctx.moveTo(TEX_SIZE / 2, 20); ctx.lineTo(TEX_SIZE / 2, TEX_SIZE - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, TEX_SIZE / 2); ctx.lineTo(TEX_SIZE - 20, TEX_SIZE / 2); ctx.stroke();

  // Status text
  ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
  ctx.font = '10px monospace';
  ctx.fillText('SECTOR 7-G', 12, 20);
  ctx.fillText('STATUS: ONLINE', 12, 34);
  ctx.fillText('SIGNAL: NOMINAL', 12, TEX_SIZE - 14);

  // Blips
  ctx.fillStyle = 'rgba(0, 255, 180, 0.6)';
  ctx.beginPath(); ctx.arc(TEX_SIZE / 2 + 25, TEX_SIZE / 2 - 15, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255, 60, 40, 0.5)';
  ctx.beginPath(); ctx.arc(TEX_SIZE / 2 - 40, TEX_SIZE / 2 + 30, 2.5, 0, Math.PI * 2); ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

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
    tick(): void {},
    renderToTarget(): void {},
    dispose(): void { texture.dispose(); }
  };
}
