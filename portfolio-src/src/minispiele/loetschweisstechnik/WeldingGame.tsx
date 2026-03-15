import { useEffect, useRef, useState } from "react";

// ─── Canvas constants ────────────────────────────────────────────────────────
const CW         = 640;
const CH         = 340;
const SEAM_Y     = 166;     // center of target seam
const SEAM_X0    = 64;      // seam starts
const SEAM_X1    = 576;     // seam ends
const SEAM_HALF  = 11;      // ±11 px tolerance zone
const MASK_VW    = 88;      // viewport-hole width
const MASK_VH    = 68;      // viewport-hole height
const MASK_SPD   = 2.5;     // mask movement speed px/frame at 60 fps
const MAX_SPEED  = 8;       // px/frame — faster = "too fast" flag
const NEED_COV   = 0.82;    // fraction of seam that must be covered
const NEED_QUAL  = 0.97;    // fraction of weld points that must be in zone
const VIO_LIMIT  = 2200;    // ms grace period after mask violation

const IS_MOBILE = typeof window !== "undefined" && (window.innerWidth < 900 || navigator.maxTouchPoints > 0);
// Mobile: ~20 % easier thresholds (screen too compressed)
const EFF_SEAM_HALF = IS_MOBILE ? 14  : SEAM_HALF;
const EFF_NEED_COV  = IS_MOBILE ? 0.65 : NEED_COV;
const EFF_NEED_QUAL = IS_MOBILE ? 0.78 : NEED_QUAL;
const JOYSTICK_R    = 52;   // joystick visual radius
const JOYSTICK_MAX  = 40;   // max drag distance (px)
const ELECTRODE_SPD = 3.5;  // electrode move speed from joystick (px / frame)

const monoFont = "'JetBrains Mono','Fira Mono','Courier New',monospace";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  hue: number; // 20–55
}

interface WState {
  ex: number; ey: number;         // electrode position
  mvx: number; mvy: number;       // mask viewport center
  welding: boolean;
  keys: Record<string, boolean>;  // w/a/s/d
  mobileWeld: boolean;
  mobileDx: number; mobileDy: number; // joystick-driven electrode velocity
  particles: Particle[];
  coverage: Set<number>;          // floor(x) values welded in zone
  good: number; total: number;
  prevX: number; prevY: number;
  violation: boolean;
  vioTimer: number;               // ms remaining in grace period
  lastTime: number;
  phase: "playing" | "failed" | "complete";
  failReason: string;
}

function makeState(): WState {
  return {
    ex: CW / 2, ey: SEAM_Y,
    mvx: CW / 2, mvy: SEAM_Y,
    welding: false, mobileWeld: false,
    mobileDx: 0, mobileDy: 0,
    keys: {},
    particles: [],
    coverage: new Set(),
    good: 0, total: 0,
    prevX: -1, prevY: -1,
    violation: false, vioTimer: 0,
    lastTime: 0,
    phase: "playing",
    failReason: "",
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPos(canvas: HTMLCanvasElement, e: PointerEvent | React.PointerEvent) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width)  * CW,
    y: ((e.clientY - r.top)  / r.height) * CH,
  };
}

function emitSparks(state: WState, x: number, y: number, n = 8) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 18 + Math.random() * 18,
      maxLife: 36,
      hue: 20 + Math.random() * 35,
    });
  }
}

// ─── Main render ─────────────────────────────────────────────────────────────
function drawFrame(ctx: CanvasRenderingContext2D, s: WState) {
  ctx.clearRect(0, 0, CW, CH);

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
  bgGrad.addColorStop(0, "#0c0e18");
  bgGrad.addColorStop(1, "#12141e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CW, CH);

  // Grid lines (subtle)
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < CW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
  for (let y = 0; y < CH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }
  ctx.restore();

  // Top plate (steel blue-gray)
  const topGrad = ctx.createLinearGradient(0, 70, 0, SEAM_Y - 4);
  topGrad.addColorStop(0, "#4a5260");
  topGrad.addColorStop(1, "#3a4050");
  ctx.fillStyle = topGrad;
  ctx.fillRect(28, 70, CW - 56, SEAM_Y - 70 - 4);

  // Bottom plate (slightly lighter)
  const botGrad = ctx.createLinearGradient(0, SEAM_Y + 4, 0, 270);
  botGrad.addColorStop(0, "#505868");
  botGrad.addColorStop(1, "#404858");
  ctx.fillStyle = botGrad;
  ctx.fillRect(28, SEAM_Y + 4, CW - 56, 270 - (SEAM_Y + 4));

  // Plate surface sheen lines
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 60; x < CW - 30; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 72); ctx.lineTo(x + 12, 72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, 268); ctx.lineTo(x + 6, 268); ctx.stroke();
  }
  ctx.restore();

  // Seam target zone (amber glow)
  ctx.save();
  ctx.globalAlpha = 0.28;
  const seamGrad = ctx.createLinearGradient(0, SEAM_Y - EFF_SEAM_HALF, 0, SEAM_Y + EFF_SEAM_HALF);
  seamGrad.addColorStop(0, "rgba(255,160,20,0)");
  seamGrad.addColorStop(0.5, "rgba(255,160,20,1)");
  seamGrad.addColorStop(1, "rgba(255,160,20,0)");
  ctx.fillStyle = seamGrad;
  ctx.fillRect(SEAM_X0, SEAM_Y - EFF_SEAM_HALF, SEAM_X1 - SEAM_X0, EFF_SEAM_HALF * 2);
  ctx.restore();

  // Target seam center dashes
  ctx.save();
  ctx.setLineDash([9, 7]);
  ctx.strokeStyle = "rgba(255,180,40,0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SEAM_X0, SEAM_Y);
  ctx.lineTo(SEAM_X1, SEAM_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Seam start/end tick marks
  ctx.save();
  ctx.strokeStyle = "rgba(255,200,80,0.6)";
  ctx.lineWidth = 2;
  [[SEAM_X0, -1], [SEAM_X1, 1]].forEach(([x]) => {
    ctx.beginPath();
    ctx.moveTo(x, SEAM_Y - 16);
    ctx.lineTo(x, SEAM_Y + 16);
    ctx.stroke();
  });
  ctx.restore();

  // Weld beads
  for (const pt of s.coverage) {
    // Draw the weld bead at this coverage x position
    const bx = pt;
    const by = SEAM_Y;
    ctx.save();
    ctx.globalAlpha = 0.78;
    const wGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 7);
    wGrad.addColorStop(0, "#ffee88");
    wGrad.addColorStop(0.4, "#f07020");
    wGrad.addColorStop(1, "transparent");
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.ellipse(bx, by, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Out-of-zone weld marks
  for (const pt of s.good === s.total ? [] : []) {
    void pt; // only show bad mark separately if needed
  }

  // Spark particles
  for (const p of s.particles) {
    const a = (p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a * 0.92;
    ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
    const r = Math.max(0.5, a * 2.8);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Electrode cursor
  if (!s.welding && !s.mobileWeld) {
    ctx.save();
    ctx.strokeStyle = "rgba(130,205,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.ex, s.ey, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(130,205,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.ex - 16, s.ey); ctx.lineTo(s.ex + 16, s.ey);
    ctx.moveTo(s.ex, s.ey - 16); ctx.lineTo(s.ex, s.ey + 16);
    ctx.stroke();
    ctx.restore();
  } else {
    // Active welding arc glow
    ctx.save();
    const arcG = ctx.createRadialGradient(s.ex, s.ey, 0, s.ex, s.ey, 22);
    arcG.addColorStop(0, "rgba(255,255,220,0.98)");
    arcG.addColorStop(0.25, "rgba(255,190,40,0.82)");
    arcG.addColorStop(0.6, "rgba(255,100,10,0.4)");
    arcG.addColorStop(1, "transparent");
    ctx.fillStyle = arcG;
    ctx.beginPath();
    ctx.arc(s.ex, s.ey, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Mask overlay (full canvas dark, viewport hole cut out)
  const vx = s.mvx - MASK_VW / 2;
  const vy = s.mvy - MASK_VH / 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.91)";
  ctx.beginPath();
  ctx.rect(0, 0, CW, CH);
  ctx.rect(vx, vy, MASK_VW, MASK_VH);
  ctx.fill("evenodd");
  ctx.restore();

  // Viewport border
  const blinkOn = (Date.now() % 480) < 240;
  const borderColor = s.violation
    ? (blinkOn ? "rgba(255,50,50,0.95)" : "rgba(120,20,20,0.5)")
    : "rgba(180,210,255,0.30)";
  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = s.violation ? 2.5 : 1.5;
  ctx.strokeRect(vx, vy, MASK_VW, MASK_VH);
  ctx.restore();

  // Violation warning text
  if (s.violation) {
    ctx.save();
    ctx.font = `bold 11px ${monoFont}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,80,80,0.92)";
    ctx.fillText("⚠ Maske nachführen! [WASD]", CW / 2, 30);
    ctx.restore();
  }

  // Progress bar
  const cov = s.coverage.size / (SEAM_X1 - SEAM_X0);
  const qual = s.total > 0 ? s.good / s.total : 1;
  ctx.save();
  // Track
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath();
  ctx.roundRect(30, 14, CW - 60, 7, 3);
  ctx.fill();
  // Fill
  const pColor = cov >= EFF_NEED_COV && qual >= EFF_NEED_QUAL ? "#4ade80" : (cov > 0.5 ? "#ffaa20" : "#ff7730");
  ctx.fillStyle = pColor;
  ctx.beginPath();
  ctx.roundRect(30, 14, Math.max(0, (CW - 60) * Math.min(1, cov)), 7, 3);
  ctx.fill();
  // Quality dot
  const qColor = qual >= NEED_QUAL ? "#4ade80" : "#f87171";
  ctx.fillStyle = qColor;
  ctx.beginPath();
  ctx.arc(CW - 16, 17, 5, 0, Math.PI * 2);
  ctx.fill();
  // Labels
  ctx.font = `9px ${monoFont}`;
  ctx.fillStyle = "rgba(200,220,255,0.4)";
  ctx.textAlign = "left";
  ctx.fillText(`Naht ${Math.round(cov * 100)}%`, 30, 30);
  ctx.textAlign = "right";
  ctx.fillText(`Präzision ${Math.round(qual * 100)}%`, CW - 28, 30);
  // Controls hint
  ctx.fillStyle = "rgba(150,180,220,0.35)";
  ctx.textAlign = "right";
  ctx.fillText("Elektrode: Maus  ·  Maske: WASD  ·  Schweißen: Mausklick halten", CW - 28, 44);
  ctx.restore();
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
  onAbort: () => void;
}

export default function WeldingGame({ onComplete, onAbort }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<WState>(makeState());
  const rafRef    = useRef(0);
  const [phase, setPhase]       = useState<WState["phase"]>("playing");
  const [failReason, setFail]   = useState("");
  const joyCenterRef = useRef<{ x: number; y: number } | null>(null);
  const joyThumbRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    stateRef.current.lastTime = performance.now();

    // ── Game loop ──────────────────────────────────────────────────────────
    function tick(now: number) {
      const s = stateRef.current; // re-read every frame so restart() works
      const dt = Math.min((now - s.lastTime) / (1000 / 60), 3); // dt in "frames at 60fps"
      s.lastTime = now;
      if (s.phase !== "playing") {
        drawFrame(ctx!, s);
        rafRef.current = requestAnimationFrame(tick); // keep loop alive for restart
        return;
      }

      // Move mask with WASD / mobile pad
      if (s.keys["w"] || s.keys["ArrowUp"])    s.mvy = Math.max(MASK_VH / 2, s.mvy - MASK_SPD * dt);
      if (s.keys["s"] || s.keys["ArrowDown"])  s.mvy = Math.min(CH - MASK_VH / 2, s.mvy + MASK_SPD * dt);
      if (s.keys["a"] || s.keys["ArrowLeft"])  s.mvx = Math.max(MASK_VW / 2, s.mvx - MASK_SPD * dt);
      if (s.keys["d"] || s.keys["ArrowRight"]) s.mvx = Math.min(CW - MASK_VW / 2, s.mvx + MASK_SPD * dt);

      // Joystick-driven electrode movement (mobile)
      s.ex = Math.max(8, Math.min(CW - 8, s.ex + s.mobileDx * dt));
      s.ey = Math.max(8, Math.min(CH - 8, s.ey + s.mobileDy * dt));

      const welding = s.welding || s.mobileWeld;

      if (welding) {
        // Check if electrode is inside mask viewport
        const inVP = (
          s.ex > s.mvx - MASK_VW / 2 &&
          s.ex < s.mvx + MASK_VW / 2 &&
          s.ey > s.mvy - MASK_VH / 2 &&
          s.ey < s.mvy + MASK_VH / 2
        );

        if (!inVP) {
          if (!s.violation) {
            s.violation = true;
            s.vioTimer = VIO_LIMIT;
          } else {
            s.vioTimer -= (1000 / 60) * dt;
            if (s.vioTimer <= 0) {
              s.phase = "failed";
              s.failReason = "Wir können blind geschweißten Nähten nicht vertrauen!";
              setFail(s.failReason);
              setPhase("failed");
              // no return — fall through to drawFrame + rAF at end of tick
            }
          }
        } else {
          s.violation = false;
          s.vioTimer = 0;
        }

        // Weld point
        const dx = s.prevX >= 0 ? Math.abs(s.ex - s.prevX) : 0;
        const dy = s.prevY >= 0 ? Math.abs(s.ey - s.prevY) : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const tooFast = dist > MAX_SPEED;

        const inZone = Math.abs(s.ey - SEAM_Y) <= EFF_SEAM_HALF;
        const inSeamX = s.ex >= SEAM_X0 && s.ex <= SEAM_X1;

        s.total++;
        if (inZone && !tooFast) s.good++;
        if (inZone && inSeamX && !tooFast) {
          const cx = Math.floor(s.ex);
          s.coverage.add(cx);
        }

        s.prevX = s.ex;
        s.prevY = s.ey;

        // Emit sparks
        if (Math.random() < 0.55) emitSparks(s, s.ex, s.ey, 4 + Math.floor(Math.random() * 5));

        // Check for speed warning feedback
        if (tooFast && s.total % 20 === 0 && s.total > 0) {
          // Visual flash; no direct canvas call here — handled in drawFrame
        }
      } else {
        s.prevX = -1;
        s.prevY = -1;
        if (s.violation) {
          s.vioTimer -= (1000 / 60) * dt;
          if (s.vioTimer <= 0) {
            s.violation = false;
          }
        }
      }

      // Update particles
      s.particles = s.particles.filter(p => p.life > 0);
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.32 * dt;
        p.vx *= 0.97;
        p.life -= 1 * dt;
      }

      // Check completion
      const cov = s.coverage.size / (SEAM_X1 - SEAM_X0);
      const qual = s.total > 30 ? s.good / s.total : 1;
      if (cov >= EFF_NEED_COV && qual >= EFF_NEED_QUAL && s.total > 60) {
        s.phase = "complete";
        setPhase("complete");
      }

      drawFrame(ctx!, s);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    // ── Keyboard ──────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault();
        stateRef.current.keys[e.key] = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { stateRef.current.keys[e.key] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ── Pointer handlers on canvas ────────────────────────────────────────────
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPos(canvas, e);
    stateRef.current.ex = x;
    stateRef.current.ey = y;
  };
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPos(canvas, e);
    stateRef.current.ex = x;
    stateRef.current.ey = y;
    stateRef.current.welding = true;
  };
  const onCanvasPointerUp = () => { stateRef.current.welding = false; };

  // Mobile weld button
  const onWeldDown = () => { stateRef.current.mobileWeld = true; };
  const onWeldUp   = () => { stateRef.current.mobileWeld = false; };

  // Mobile mask D-pad
  const mk = (key: string, down: boolean) => { stateRef.current.keys[key] = down; };

  const padBtn = (label: string, key: string) => (
    <button
      type="button"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); mk(key, true); }}
      onPointerUp={() => mk(key, false)}
      onPointerCancel={() => mk(key, false)}
      onPointerLeave={() => mk(key, false)}
      style={{
        width: 44, height: 44, borderRadius: 10,
        border: "1px solid rgba(130,180,255,0.25)",
        background: "rgba(30,50,80,0.8)",
        color: "rgba(180,210,255,0.85)",
        fontSize: 18, cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        userSelect: "none", WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      {label}
    </button>
  );

  const restart = () => {
    stateRef.current = makeState();
    setPhase("playing");
    setFail("");
  };

  return (
    <div style={{
      background: "#07101e",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      width: "min(calc(100vw - 16px), 660px)",
    }}>
      {/* Title bar */}
      <div style={{
        background: "#0e1c30", padding: "7px 14px",
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
      }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#f87171" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#fbbf24" }} />
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#4ade80" }} />
        <span style={{
          fontFamily: monoFont, fontSize: 11, color: "#4a6080", marginLeft: 6,
        }}>
          LEVEL 1 · SCHWEISSEN — Elektrode führen + Maske nachziehen [WASD]
        </span>
        <button
          type="button"
          onClick={onAbort}
          style={{
            marginLeft: "auto", width: 28, height: 28, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)", color: "#8aadcc",
            fontSize: "0.82rem", cursor: "pointer", lineHeight: 1,
          }}
        >✕</button>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ display: "block", width: "100%", height: "auto", touchAction: "none" }}
          onPointerMove={onCanvasPointerMove}
          onPointerDown={onCanvasPointerDown}
          onPointerUp={onCanvasPointerUp}
          onPointerLeave={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
        />

        {/* Overlay: failed or complete */}
        {phase !== "playing" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 16, padding: 24,
          }}>
            {phase === "failed" ? (
              <>
                <div style={{ fontSize: 32 }}>⚠</div>
                <div style={{
                  fontFamily: monoFont, fontSize: 13, color: "#f87171",
                  textAlign: "center", lineHeight: 1.5, maxWidth: 380,
                }}>
                  {failReason}
                </div>
                <button
                  type="button"
                  onClick={restart}
                  style={{
                    padding: "10px 24px",
                    background: "rgba(255,120,40,0.15)",
                    border: "1px solid rgba(255,120,40,0.45)",
                    borderRadius: 10, color: "#ffaa60",
                    fontFamily: monoFont, fontSize: 12, cursor: "pointer",
                  }}
                >
                  NOCHMAL VERSUCHEN
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36 }}>✅</div>
                <div style={{
                  fontFamily: monoFont, fontSize: 14, color: "#4ade80",
                  textAlign: "center", lineHeight: 1.5,
                }}>
                  Schweißnaht akzeptiert!<br/>
                  <span style={{ color: "rgba(180,210,255,0.5)", fontSize: 11 }}>
                    Weiter zu Level 2: Löten
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onComplete}
                  style={{
                    padding: "10px 28px",
                    background: "rgba(40,200,100,0.15)",
                    border: "1px solid rgba(60,220,120,0.50)",
                    borderRadius: 10, color: "rgba(140,240,180,0.95)",
                    fontFamily: monoFont, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", letterSpacing: "0.08em",
                  }}
                >
                  WEITER ▶
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile controls */}
      {IS_MOBILE && (
        <div style={{
          background: "rgba(3,6,14,0.98)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 14px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {/* Mask D-pad */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontFamily: monoFont, fontSize: 9, color: "rgba(120,160,200,0.4)", letterSpacing: "0.1em", marginBottom: 2 }}>
              MASKE
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gap: 2 }}>
              <div />
              {padBtn("↑", "w")}
              <div />
              {padBtn("←", "a")}
              {padBtn("·", "")}
              {padBtn("→", "d")}
              <div />
              {padBtn("↓", "s")}
              <div />
            </div>
          </div>

          {/* Electrode joystick + weld */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontFamily: monoFont, fontSize: 9, color: "rgba(255,160,80,0.4)", letterSpacing: "0.1em", marginBottom: 2 }}>
              ELEKTRODE
            </span>
            <div
              style={{
                width: JOYSTICK_R * 2, height: JOYSTICK_R * 2,
                borderRadius: "50%",
                background: "rgba(255,120,20,0.12)",
                border: "2px solid rgba(255,140,30,0.35)",
                position: "relative",
                touchAction: "none", userSelect: "none",
                WebkitUserSelect: "none" as never,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = e.currentTarget.getBoundingClientRect();
                joyCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                onWeldDown();
              }}
              onPointerMove={(e) => {
                if (!joyCenterRef.current) return;
                const dx = e.clientX - joyCenterRef.current.x;
                const dy = e.clientY - joyCenterRef.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const clamped = Math.min(dist, JOYSTICK_MAX);
                const angle = Math.atan2(dy, dx);
                const nx = dist > 0.5 ? clamped * Math.cos(angle) : 0;
                const ny = dist > 0.5 ? clamped * Math.sin(angle) : 0;
                stateRef.current.mobileDx = (nx / JOYSTICK_MAX) * ELECTRODE_SPD;
                stateRef.current.mobileDy = (ny / JOYSTICK_MAX) * ELECTRODE_SPD;
                if (joyThumbRef.current) joyThumbRef.current.style.transform = `translate(${nx}px, ${ny}px)`;
              }}
              onPointerUp={() => {
                joyCenterRef.current = null;
                stateRef.current.mobileDx = 0;
                stateRef.current.mobileDy = 0;
                if (joyThumbRef.current) joyThumbRef.current.style.transform = "translate(0,0)";
                onWeldUp();
              }}
              onPointerCancel={() => {
                joyCenterRef.current = null;
                stateRef.current.mobileDx = 0;
                stateRef.current.mobileDy = 0;
                if (joyThumbRef.current) joyThumbRef.current.style.transform = "translate(0,0)";
                onWeldUp();
              }}
            >
              {/* Thumb */}
              <div
                ref={joyThumbRef}
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,140,30,0.45)",
                  border: "2px solid rgba(255,160,40,0.7)",
                  boxShadow: "0 0 12px rgba(255,120,20,0.3)",
                  transition: "transform 0.06s",
                  pointerEvents: "none",
                }}
              />
            </div>
            <span style={{ fontFamily: monoFont, fontSize: 8, color: "rgba(255,160,80,0.3)", marginTop: 2 }}>
              ZIEHEN + SCHWEISSEN
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
