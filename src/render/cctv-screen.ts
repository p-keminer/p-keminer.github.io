import * as THREE from 'three';

const MESH_LEFT = 'mon_cctv_left';
const MESH_RIGHT = 'mon_cctv_right';
const TEX_SIZE = 512;

export interface CCTVScreen {
  attach(roomRoot: THREE.Object3D): void;
  tick(elapsedMs: number): void;
  renderToTarget(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void;
  dispose(): void;
}

// ── Farben ──────────────────────────────────────────────────────────────
const BG        = '#0a0e14';
const BORDER    = 'rgba(0, 180, 255, 0.12)';
const TITLE_BAR = 'rgba(0, 140, 220, 0.18)';
const TITLE_TXT = 'rgba(0, 200, 255, 0.7)';
const DIM_TXT   = 'rgba(0, 180, 255, 0.30)';
const PROMPT    = 'rgba(0, 255, 160, 0.65)';
const CODE_TXT  = 'rgba(0, 200, 255, 0.45)';
const KEYWORD   = 'rgba(200, 120, 255, 0.55)';
const STRING    = 'rgba(160, 220, 100, 0.50)';
const COMMENT   = 'rgba(80, 110, 140, 0.40)';
const NUM_TXT   = 'rgba(255, 180, 80, 0.50)';
const SCANLINE  = 'rgba(0, 0, 0, 0.10)';
const WARN_TXT  = 'rgba(255, 200, 60, 0.55)';
const OK_TXT    = 'rgba(0, 255, 160, 0.50)';
const RED_TXT   = 'rgba(255, 80, 80, 0.50)';
const GRAPH_BG  = 'rgba(0, 20, 40, 0.5)';
const GRAPH_LINE = 'rgba(0, 200, 255, 0.4)';
const GRAPH_FILL = 'rgba(0, 200, 255, 0.08)';

// ── Hilfsfunktionen ─────────────────────────────────────────────────────

function drawWallpaper(ctx: CanvasRenderingContext2D): void {
  const wallpaper = ctx.createLinearGradient(0, 0, TEX_SIZE, TEX_SIZE);
  wallpaper.addColorStop(0, '#0d1117');
  wallpaper.addColorStop(0.4, '#101820');
  wallpaper.addColorStop(0.7, '#0c1520');
  wallpaper.addColorStop(1, '#0a0f18');
  ctx.fillStyle = wallpaper;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Noise dots
  ctx.fillStyle = 'rgba(0, 160, 255, 0.015)';
  for (let i = 0; i < 300; i++) {
    const nx = (Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * TEX_SIZE;
    const ny = (Math.sin(i * 269.5 + 183.3) * 0.5 + 0.5) * TEX_SIZE;
    ctx.fillRect(nx, ny, 1, 1);
  }

  // Grid
  ctx.strokeStyle = 'rgba(0, 180, 255, 0.025)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < TEX_SIZE; i += 24) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, TEX_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(TEX_SIZE, i); ctx.stroke();
  }
}

function drawTerminal(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  title: string,
  lines: { color: string; text: string }[]
): void {
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = TITLE_BAR;
  ctx.fillRect(x + 1, y + 1, w - 2, 14);

  const dotY = y + 8;
  for (const [i, c] of ['rgba(255,80,80,0.6)', 'rgba(255,200,60,0.5)', 'rgba(80,220,80,0.5)'].entries()) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 8 + i * 9, dotY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = TITLE_TXT;
  ctx.font = '9px monospace';
  ctx.fillText(title, x + 36, y + 11);

  ctx.fillStyle = 'rgba(0, 8, 16, 0.5)';
  ctx.fillRect(x + 1, y + 15, w - 2, h - 16);

  ctx.font = '8px monospace';
  const lineH = 10;
  const startY = y + 26;
  const maxLines = Math.floor((h - 20) / lineH);
  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    ctx.fillStyle = lines[i].color;
    ctx.fillText(lines[i].text, x + 6, startY + i * lineH);
  }
}

function drawTaskbar(ctx: CanvasRenderingContext2D): void {
  const taskbarH = 20;
  const taskbarY = TEX_SIZE - taskbarH;

  ctx.fillStyle = 'rgba(8, 14, 24, 0.85)';
  ctx.fillRect(0, taskbarY, TEX_SIZE, taskbarH);
  ctx.strokeStyle = 'rgba(0, 140, 220, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, taskbarY); ctx.lineTo(TEX_SIZE, taskbarY); ctx.stroke();

  const icons = [
    { color: 'rgba(0, 200, 255, 0.5)', label: '>' },
    { color: 'rgba(160, 220, 100, 0.5)', label: 'V' },
    { color: 'rgba(255, 120, 50, 0.4)', label: 'F' },
    { color: 'rgba(200, 120, 255, 0.4)', label: 'D' },
  ];
  ctx.font = '9px monospace';
  for (let i = 0; i < icons.length; i++) {
    const ix = 6 + i * 24;
    const iy = taskbarY + 4;
    ctx.fillStyle = 'rgba(0, 20, 40, 0.6)';
    ctx.fillRect(ix, iy, 18, 12);
    ctx.strokeStyle = icons[i].color;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(ix, iy, 18, 12);
    ctx.fillStyle = icons[i].color;
    ctx.fillText(icons[i].label, ix + 5, iy + 10);
  }

  ctx.fillStyle = 'rgba(0, 200, 255, 0.40)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('23:47', TEX_SIZE - 8, taskbarY + 13);
  ctx.fillText('2026-03-26', TEX_SIZE - 8, taskbarY + 6);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(0, 255, 160, 0.35)';
  ctx.fillText('CPU 48%', TEX_SIZE - 110, taskbarY + 13);
  ctx.fillStyle = 'rgba(0, 180, 255, 0.30)';
  ctx.fillText('RAM 62%', TEX_SIZE - 180, taskbarY + 13);
}

function drawOverlay(ctx: CanvasRenderingContext2D): void {
  // Scanlines
  ctx.fillStyle = SCANLINE;
  for (let y = 0; y < TEX_SIZE; y += 3) {
    ctx.fillRect(0, y, TEX_SIZE, 1);
  }

  // CRT vignette
  const grad = ctx.createRadialGradient(
    TEX_SIZE / 2, TEX_SIZE / 2, TEX_SIZE * 0.2,
    TEX_SIZE / 2, TEX_SIZE / 2, TEX_SIZE * 0.7
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  seed: number
): void {
  ctx.fillStyle = GRAPH_BG;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0, 140, 220, 0.08)';
  ctx.lineWidth = 0.5;
  for (let gy = y; gy < y + h; gy += 12) {
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }

  // Graph line
  ctx.strokeStyle = GRAPH_LINE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const points: number[] = [];
  for (let i = 0; i <= w; i += 3) {
    const v = Math.sin(i * 0.05 + seed) * 0.3
            + Math.sin(i * 0.12 + seed * 2.1) * 0.2
            + Math.sin(i * 0.02 + seed * 0.7) * 0.4;
    const py = y + h / 2 - v * (h * 0.4);
    points.push(py);
    if (i === 0) ctx.moveTo(x + i, py);
    else ctx.lineTo(x + i, py);
  }
  ctx.stroke();

  // Fill under graph
  ctx.fillStyle = GRAPH_FILL;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const px = x + i * 3;
    if (i === 0) ctx.moveTo(px, points[i]);
    else ctx.lineTo(px, points[i]);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
}

// ── Screen 1: Terminal Desktop ──────────────────────────────────────────

function createTerminalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  drawWallpaper(ctx);

  drawTerminal(ctx, 8, 8, 240, 150, 'p-keminer@arch ~ $', [
    { color: PROMPT,  text: '$ neofetch' },
    { color: CODE_TXT, text: '        ___        ' },
    { color: CODE_TXT, text: '       /   \\     OS: Arch Linux x86_64' },
    { color: CODE_TXT, text: '      /     \\    Kernel: 6.8.2-arch1' },
    { color: CODE_TXT, text: '     /  /\\   \\   Uptime: 47d 12h 33m' },
    { color: CODE_TXT, text: '    /  /  \\   \\  Packages: 1284' },
    { color: CODE_TXT, text: '   /  /    \\   \\ Shell: zsh 5.9' },
    { color: CODE_TXT, text: '  /  /______\\   \\DE: Hyprland' },
    { color: CODE_TXT, text: ' /___________\\  CPU: Ryzen 9 7950X' },
    { color: CODE_TXT, text: '               GPU: RTX 4090' },
    { color: CODE_TXT, text: '               RAM: 12.4G / 64G' },
    { color: DIM_TXT,  text: '' },
    { color: PROMPT,  text: '$ _' },
  ]);

  drawTerminal(ctx, 256, 8, 248, 120, 'nvim scene.ts', [
    { color: DIM_TXT,  text: '  1 ' },
    { color: KEYWORD,  text: '  2  import * as THREE' },
    { color: STRING,   text: "  3    from 'three';" },
    { color: DIM_TXT,  text: '  4 ' },
    { color: KEYWORD,  text: '  5  export function' },
    { color: CODE_TXT, text: '  6    createScene() {' },
    { color: CODE_TXT, text: '  7    const renderer =' },
    { color: KEYWORD,  text: '  8      new WebGLRenderer' },
    { color: CODE_TXT, text: '  9    renderer.shadowMap' },
    { color: COMMENT,  text: ' 10    // bloom pipeline' },
  ]);

  drawTerminal(ctx, 8, 168, 200, 135, 'htop', [
    { color: PROMPT,  text: 'CPU [||||||||      ] 48%' },
    { color: PROMPT,  text: 'MEM [||||||||||    ] 62%' },
    { color: PROMPT,  text: 'SWP [||            ]  8%' },
    { color: DIM_TXT,  text: '' },
    { color: CODE_TXT, text: ' PID  USER  CPU%  CMD' },
    { color: NUM_TXT,  text: ' 2847 root  12.3  node' },
    { color: NUM_TXT,  text: ' 3012 root   8.7  vite' },
    { color: NUM_TXT,  text: ' 3156 pk     5.2  nvim' },
    { color: NUM_TXT,  text: ' 1024 root   3.1  docker' },
    { color: NUM_TXT,  text: '  891 pk     2.4  zsh' },
    { color: NUM_TXT,  text: '  442 root   1.8  Xorg' },
  ]);

  drawTerminal(ctx, 216, 138, 288, 165, 'git log --oneline', [
    { color: NUM_TXT,  text: 'a3f9d21 feat: bloom pipeline' },
    { color: NUM_TXT,  text: 'b7c2e08 fix: shadow acne' },
    { color: NUM_TXT,  text: 'e1d4f33 perf: dirty flag' },
    { color: NUM_TXT,  text: 'c8a1b72 feat: combat camera' },
    { color: NUM_TXT,  text: '91f2d45 refactor: pieces' },
    { color: NUM_TXT,  text: 'f4e8a19 feat: room model' },
    { color: NUM_TXT,  text: '2b7c931 init: three.js setup' },
    { color: DIM_TXT,  text: '' },
    { color: PROMPT,  text: '$ git status' },
    { color: STRING,   text: '  On branch main' },
    { color: STRING,   text: '  working tree clean' },
    { color: DIM_TXT,  text: '' },
    { color: PROMPT,  text: '$ _' },
  ]);

  drawTaskbar(ctx);
  drawOverlay(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── Screen 2: System Analytics Dashboard ────────────────────────────────

function createAnalyticsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Dark dashboard background
  const bg = ctx.createLinearGradient(0, 0, 0, TEX_SIZE);
  bg.addColorStop(0, '#080c14');
  bg.addColorStop(1, '#0a1018');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // ── Header bar ──────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0, 20, 40, 0.7)';
  ctx.fillRect(0, 0, TEX_SIZE, 18);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(TEX_SIZE, 18); ctx.stroke();

  ctx.fillStyle = TITLE_TXT;
  ctx.font = 'bold 9px monospace';
  ctx.fillText('SYSTEM ANALYTICS', 8, 12);
  ctx.fillStyle = OK_TXT;
  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('LIVE', TEX_SIZE - 8, 12);
  // Blinking dot
  ctx.fillStyle = 'rgba(0, 255, 160, 0.7)';
  ctx.beginPath(); ctx.arc(TEX_SIZE - 32, 9, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'left';

  // ── Network Traffic Graph (top) ─────────────────────────────────────
  ctx.fillStyle = DIM_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('NETWORK I/O', 8, 32);
  ctx.fillStyle = CODE_TXT;
  ctx.font = '8px monospace';
  ctx.fillText('IN: 2.4 MB/s', 100, 32);
  ctx.fillStyle = WARN_TXT;
  ctx.fillText('OUT: 847 KB/s', 200, 32);
  drawGraph(ctx, 8, 36, TEX_SIZE - 16, 60, 1.7);

  // ── CPU Cores (mid-left) ────────────────────────────────────────────
  ctx.fillStyle = DIM_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('CPU CORES', 8, 112);

  const coreData = [72, 45, 88, 31, 56, 19, 63, 41, 92, 27, 50, 38, 77, 15, 68, 34];
  ctx.font = '6px monospace';
  for (let i = 0; i < 16; i++) {
    const cx = 8 + (i % 8) * 30;
    const cy = 118 + Math.floor(i / 8) * 24;
    const pct = coreData[i];
    const barW = 24;
    const fillW = barW * pct / 100;

    // Bar background
    ctx.fillStyle = 'rgba(0, 20, 40, 0.6)';
    ctx.fillRect(cx, cy, barW, 6);
    // Bar fill
    ctx.fillStyle = pct > 80 ? RED_TXT : pct > 50 ? WARN_TXT : OK_TXT;
    ctx.fillRect(cx, cy, fillW, 6);
    // Border
    ctx.strokeStyle = 'rgba(0, 140, 220, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cx, cy, barW, 6);
    // Label
    ctx.fillStyle = DIM_TXT;
    ctx.fillText(`${pct}`, cx + 7, cy + 14);
  }

  // ── Memory & Disk (mid-right area) ──────────────────────────────────
  const panelX = 260;
  ctx.fillStyle = DIM_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('MEMORY', panelX, 112);

  // Memory ring (simplified as arc)
  const ringX = panelX + 40;
  const ringY = 140;
  const ringR = 22;
  ctx.strokeStyle = 'rgba(0, 40, 60, 0.4)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = OK_TXT;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.62); ctx.stroke();
  ctx.fillStyle = CODE_TXT;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('62%', ringX, ringY + 3);
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('39.7G / 64G', panelX, 174);

  // ── Docker Containers ───────────────────────────────────────────────
  ctx.fillStyle = DIM_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('CONTAINERS', 8, 180);

  const containers = [
    { name: 'nginx-proxy',  status: 'UP', cpu: '1.2%', color: OK_TXT },
    { name: 'postgres-db',  status: 'UP', cpu: '4.8%', color: OK_TXT },
    { name: 'redis-cache',  status: 'UP', cpu: '0.3%', color: OK_TXT },
    { name: 'node-api',     status: 'UP', cpu: '8.1%', color: OK_TXT },
    { name: 'grafana',      status: 'UP', cpu: '2.4%', color: OK_TXT },
    { name: 'certbot',      status: 'EXIT', cpu: '0.0%', color: RED_TXT },
  ];

  ctx.font = '7px monospace';
  for (let i = 0; i < containers.length; i++) {
    const cy = 190 + i * 12;
    const c = containers[i];
    // Status dot
    ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.arc(14, cy, 2, 0, Math.PI * 2); ctx.fill();
    // Name
    ctx.fillStyle = CODE_TXT;
    ctx.fillText(c.name, 22, cy + 3);
    // Status
    ctx.fillStyle = c.color;
    ctx.fillText(c.status, 110, cy + 3);
    // CPU
    ctx.fillStyle = DIM_TXT;
    ctx.fillText(c.cpu, 148, cy + 3);
  }

  // ── Disk I/O Graph (bottom) ─────────────────────────────────────────
  ctx.fillStyle = DIM_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('DISK I/O', 8, 270);
  ctx.fillStyle = CODE_TXT;
  ctx.font = '8px monospace';
  ctx.fillText('READ: 124 MB/s', 80, 270);
  ctx.fillStyle = WARN_TXT;
  ctx.fillText('WRITE: 47 MB/s', 210, 270);
  drawGraph(ctx, 8, 276, TEX_SIZE - 16, 50, 4.2);

  // ── Uptime / Status Footer ──────────────────────────────────────────
  ctx.fillStyle = DIM_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('UPTIME: 47d 12h 33m', 8, 342);
  ctx.fillText('LOAD: 3.42  2.18  1.97', 8, 354);
  ctx.fillStyle = OK_TXT;
  ctx.fillText('ALL SYSTEMS NOMINAL', 200, 342);

  // ── Alerts ──────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255, 200, 60, 0.08)';
  ctx.fillRect(8, 360, TEX_SIZE - 16, 28);
  ctx.strokeStyle = 'rgba(255, 200, 60, 0.15)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(8, 360, TEX_SIZE - 16, 28);
  ctx.fillStyle = WARN_TXT;
  ctx.font = '7px monospace';
  ctx.fillText('ALERT: certbot container exited (code 0)', 14, 373);
  ctx.fillStyle = DIM_TXT;
  ctx.fillText('Certificate renewal completed successfully', 14, 384);

  // ── Taskbar ────────────────────────────────────────────────────────
  const taskbarH = 20;
  const taskbarY = TEX_SIZE - taskbarH;

  ctx.fillStyle = 'rgba(8, 14, 24, 0.85)';
  ctx.fillRect(0, taskbarY, TEX_SIZE, taskbarH);
  ctx.strokeStyle = 'rgba(0, 140, 220, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, taskbarY); ctx.lineTo(TEX_SIZE, taskbarY); ctx.stroke();

  // Taskbar icons
  const aIcons = [
    { color: 'rgba(0, 255, 160, 0.5)', label: 'S' },
    { color: 'rgba(0, 200, 255, 0.5)', label: 'G' },
    { color: 'rgba(255, 120, 50, 0.4)', label: 'P' },
    { color: 'rgba(200, 120, 255, 0.4)', label: 'D' },
  ];
  ctx.font = '9px monospace';
  for (let i = 0; i < aIcons.length; i++) {
    const ix = 6 + i * 24;
    const iy = taskbarY + 4;
    ctx.fillStyle = 'rgba(0, 20, 40, 0.6)';
    ctx.fillRect(ix, iy, 18, 12);
    ctx.strokeStyle = aIcons[i].color;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(ix, iy, 18, 12);
    ctx.fillStyle = aIcons[i].color;
    ctx.fillText(aIcons[i].label, ix + 5, iy + 10);
  }

  ctx.fillStyle = 'rgba(0, 200, 255, 0.40)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('23:47', TEX_SIZE - 8, taskbarY + 13);
  ctx.fillText('2026-03-26', TEX_SIZE - 8, taskbarY + 6);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(0, 255, 160, 0.35)';
  ctx.fillText('NET OK', TEX_SIZE - 120, taskbarY + 13);
  ctx.fillStyle = 'rgba(0, 180, 255, 0.30)';
  ctx.fillText('6 RUNNING', TEX_SIZE - 200, taskbarY + 13);

  drawOverlay(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ── Factory ─────────────────────────────────────────────────────────────

export function createCCTVScreen(): CCTVScreen {
  const texLeft = createTerminalTexture();
  const texRight = createAnalyticsTexture();

  function attach(roomRoot: THREE.Object3D): void {
    roomRoot.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (node.name === MESH_LEFT) {
        node.material = new THREE.MeshBasicMaterial({
          map: texLeft,
          toneMapped: false
        });
      } else if (node.name === MESH_RIGHT) {
        node.material = new THREE.MeshBasicMaterial({
          map: texRight,
          toneMapped: false
        });
      }
    });
  }

  return {
    attach,
    tick(): void {},
    renderToTarget(): void {},
    dispose(): void {
      texLeft.dispose();
      texRight.dispose();
    }
  };
}
