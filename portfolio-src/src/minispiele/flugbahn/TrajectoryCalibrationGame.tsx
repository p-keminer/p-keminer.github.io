import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type PhysicsParams,
  type TPoint,
  calcTrajectory,
  computeV0,
  ARENA_W,
  ARENA_H,
  GROUND_Y,
  LAUNCHER_X,
  BOT_RADIUS,
  BOT_MIN_X,
  BOT_MAX_X,
} from "./trajectoryPhysics";

// ── Style constants ───────────────────────────────────────────────────────────
const C = {
  bg: "rgba(6,14,32,0.97)",
  border: "rgba(0,180,255,0.25)",
  accent: "rgba(0,180,255,0.9)",
  accentDim: "rgba(0,180,255,0.5)",
  text: "rgba(220,235,255,0.88)",
  textMuted: "rgba(140,170,210,0.6)",
  green: "#4ade80",
  orange: "#ffb830",
  red: "rgba(255,80,70,0.9)",
  mono: "'JetBrains Mono', monospace",
};

const HITS_TO_WIN = 3;
const BOT_BASE_SPEED = 58; // px/s

// ── Canvas drawing helpers ────────────────────────────────────────────────────
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Replicates the IsoBot + RobotGrinder SVG from RobotScene.tsx as a canvas drawing
function drawGrinderRobot(
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  discOnArm: boolean,
  discRotation: number
) {
  const bx = LAUNCHER_X;
  const baseY = GROUND_Y;
  const sc = 1.25; // pixel scale (matches scene's scale≈1.16 look)

  // Colors from RobotGrinder: bodyColor="#3090e0" headColor="#1a60b0" eyeColor="#88ddff"
  const bodyCol = "#3090e0";
  const darkCol = "#1a60b0";
  const eyeCol  = "#88ddff";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(bx, baseY + 3, 18 * sc, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Feet ──
  ctx.fillStyle = darkCol;
  ctx.beginPath(); ctx.roundRect(bx - 11 * sc, baseY - 5, 9 * sc, 5, 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx + 2 * sc,  baseY - 5, 9 * sc, 5, 2); ctx.fill();

  // ── Legs ──
  const legTop = baseY - 5 - 14 * sc;
  ctx.fillStyle = bodyCol;
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.roundRect(bx - 9 * sc, legTop, 7 * sc, 14 * sc, 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx + 2 * sc, legTop, 7 * sc, 14 * sc, 2); ctx.fill();
  ctx.globalAlpha = 1;

  // ── Body ──
  const bodyTop = legTop - 24 * sc;
  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.roundRect(bx - 13 * sc, bodyTop, 26 * sc, 24 * sc, 4); ctx.fill();

  // Chest panel (dark inset)
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.roundRect(bx - 8 * sc, bodyTop + 4, 16 * sc, 10 * sc, 2); ctx.fill();

  // Chest dots (matching SVG: two eyeColor circles)
  ctx.fillStyle = eyeCol;
  ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.arc(bx - 4 * sc, bodyTop + 4 + 5 * sc, 2.2 * sc, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + 4 * sc, bodyTop + 4 + 5 * sc, 2.2 * sc, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Accent bar
  ctx.strokeStyle = eyeCol;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(bx - 5 * sc, bodyTop + 4 + 13 * sc);
  ctx.lineTo(bx + 5 * sc, bodyTop + 4 + 13 * sc);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Neck ──
  const neckTop = bodyTop - 6 * sc;
  ctx.fillStyle = darkCol;
  ctx.beginPath(); ctx.roundRect(bx - 5 * sc, neckTop, 10 * sc, 6 * sc, 2); ctx.fill();

  // ── Head ──
  const headTop = neckTop - 20 * sc;
  ctx.fillStyle = darkCol;
  ctx.beginPath(); ctx.roundRect(bx - 14 * sc, headTop, 28 * sc, 20 * sc, 5); ctx.fill();

  // Eye sockets (dark bg)
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(bx - 10 * sc, headTop + 2, 8 * sc, 6 * sc, 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx + 2 * sc,  headTop + 2, 8 * sc, 6 * sc, 2); ctx.fill();

  // Eye glow (matching SVG rect fills)
  ctx.fillStyle = eyeCol;
  ctx.beginPath(); ctx.roundRect(bx - 9 * sc, headTop + 3, 6 * sc, 4 * sc, 1); ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx + 3 * sc, headTop + 3, 6 * sc, 4 * sc, 1); ctx.fill();

  // ── Antenna ──
  ctx.strokeStyle = eyeCol;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, headTop);
  ctx.lineTo(bx, headTop - 10 * sc + 3);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = eyeCol;
  ctx.beginPath();
  ctx.arc(bx, headTop - 10 * sc, 3, 0, Math.PI * 2);
  ctx.fill();

  // ── Left arm (passive, matching SVG: rect x=-20 y=2 w=8 h=16) ──
  ctx.fillStyle = bodyCol;
  ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.roundRect(bx - 21 * sc, bodyTop + 2, 8 * sc, 16 * sc, 3); ctx.fill();
  ctx.globalAlpha = 1;

  // ── Right arm (swinging, with disc — matching SVG grinder-arm) ──
  const pivotX = bx + 13 * sc;
  const pivotY = bodyTop + 4;
  const armLen = 30 * sc;
  const angleRad = (angleDeg * Math.PI) / 180;
  const tipX = pivotX + Math.cos(angleRad) * armLen;
  const tipY = pivotY - Math.sin(angleRad) * armLen;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(-angleRad);
  ctx.fillStyle = darkCol;
  ctx.beginPath();
  ctx.roundRect(-4, 0, 8 * sc, armLen, 3);
  ctx.fill();
  ctx.restore();

  // Pivot joint
  ctx.fillStyle = eyeCol;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── Disc at arm tip (matching SVG: dashed circle + center + sparks) ──
  if (discOnArm) {
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(discRotation);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#aaaaaa";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    // Sparks (matching SVG yellow circles)
    ctx.fillStyle = "#ffe066";
    ctx.beginPath(); ctx.arc(-2, -5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5,  -4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Angle arc indicator
  ctx.strokeStyle = "rgba(136,221,255,0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 20, -Math.PI / 2, -angleRad);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  topY: number,
  stunned: boolean
) {
  const padding = 9;
  ctx.font = `bold 10px 'JetBrains Mono', monospace`;
  const tw = ctx.measureText(text).width;
  const bw = tw + padding * 2;
  const bh = 20;
  const bx = cx - bw / 2;
  const by = topY - bh - 10;

  const bg    = stunned ? "rgba(32,6,6,0.96)"       : "rgba(6,16,38,0.96)";
  const brdr  = stunned ? "rgba(255,80,60,0.75)"     : "rgba(0,180,255,0.55)";
  const color = stunned ? "#ff9090"                  : "#9ec8f0";

  roundRectPath(ctx, bx, by, bw, bh, 5);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = brdr;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tail
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(cx - 4, by + bh);
  ctx.lineTo(cx + 4, by + bh);
  ctx.lineTo(cx, by + bh + 7);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, by + bh / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Replicates the RobotRoomba SVG from RobotScene.tsx as a canvas drawing
function drawRoomba(
  ctx: CanvasRenderingContext2D,
  x: number,
  dir: number,
  stunned: boolean,
  speech: string | null,
  wobbleY: number,
  brushAngle: number
) {
  const cy = GROUND_Y - 10 + wobbleY;
  const rx = 28; // matches SVG rx={28}
  const ry = 13; // matches SVG ry={13}

  // Shadow (matching SVG: <ellipse rx={30} ry={14} fill="rgba(0,0,0,0.26)"/>)
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(x, cy + ry + 1, rx + 2, ry * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body disc — outer ellipse (matching SVG fill="#3c3c3c")
  ctx.fillStyle = stunned ? "#4a1a1a" : "#3c3c3c";
  ctx.beginPath();
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top surface — lighter ellipse (matching SVG fill="#525252" rx=25 ry=11 cy-=2)
  ctx.fillStyle = stunned ? "#622222" : "#525252";
  ctx.beginPath();
  ctx.ellipse(x, cy - 2, rx - 3, ry - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring — dirt bin boundary (matching SVG rx=14 ry=6 stroke="#2c2c2c")
  ctx.strokeStyle = stunned ? "#3c1010" : "#2c2c2c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, cy - 2, 14, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Bump sensor arc — front edge (matching SVG path approximation)
  ctx.strokeStyle = stunned ? "#7a3030" : "#686868";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  // Arc from left-ish to right-ish tracing the front half of the outer body
  ctx.ellipse(x, cy - 2, rx - 4, ry - 3, 0, dir > 0 ? -0.9 : Math.PI + 0.9, dir > 0 ? 0.9 : Math.PI - 0.9);
  ctx.stroke();

  // Status LED (matching SVG: #4ade80 normal / #00ccff secured, r=2.5 on upper-right)
  ctx.fillStyle = stunned ? "#ff4040" : "#4ade80";
  ctx.shadowColor = stunned ? "rgba(255,60,60,0.8)" : "rgba(74,222,128,0.8)";
  ctx.shadowBlur = 5;
  const ledX = x + dir * (rx - 12);
  const ledY = cy - ry + 4;
  ctx.beginPath();
  ctx.arc(ledX, ledY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Side brush (matching SVG: cross + diagonal lines + center circle, spinning)
  // Positioned on the side opposite to travel direction
  const brushX = x - dir * (rx - 2);
  const brushY = cy - 4;
  ctx.save();
  ctx.translate(brushX, brushY);
  ctx.rotate(brushAngle);
  ctx.strokeStyle = stunned ? "#664040" : "#999999";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "square";
  // Matching SVG: 4 lines (h, v, diag1, diag2) = 8 spoke ends
  const spokeHalf = 5.5;
  ctx.beginPath();
  ctx.moveTo(-spokeHalf, 0); ctx.lineTo(spokeHalf, 0);
  ctx.moveTo(0, -spokeHalf); ctx.lineTo(0, spokeHalf);
  ctx.moveTo(-spokeHalf * 0.7, -spokeHalf * 0.7); ctx.lineTo(spokeHalf * 0.7, spokeHalf * 0.7);
  ctx.moveTo(spokeHalf * 0.7, -spokeHalf * 0.7); ctx.lineTo(-spokeHalf * 0.7, spokeHalf * 0.7);
  ctx.stroke();
  ctx.fillStyle = stunned ? "#664040" : "#888888";
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineCap = "butt";

  // Speech bubble
  if (speech) {
    drawSpeechBubble(ctx, speech, x, cy - ry - 4, stunned);
  }
}

function drawDiscProjectile(
  ctx: CanvasRenderingContext2D,
  path: TPoint[],
  frame: number,
  rotation: number
) {
  if (frame >= path.length) return;
  const p = path[frame];

  // Trail (fading discs)
  const trailLen = 8;
  for (let i = Math.max(0, frame - trailLen); i < frame; i++) {
    const tp = path[i];
    const alpha = ((i - (frame - trailLen)) / trailLen) * 0.3;
    const r = 4 * ((i - (frame - trailLen)) / trailLen);
    ctx.save();
    ctx.translate(tp.x, tp.y);
    ctx.rotate(rotation - (frame - i) * 0.2);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180,190,200,0.6)";
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Main disc
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation);

  // Outer disc with glow
  ctx.shadowColor = "rgba(160,200,255,0.5)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(170,180,195,0.9)";
  ctx.fill();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "rgba(230,240,255,0.9)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // Center hub
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#aabbcc";
  ctx.fill();

  // Radial lines (like a saw/disc)
  ctx.strokeStyle = "rgba(200,210,220,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 3.5, Math.sin(a) * 3.5);
    ctx.lineTo(Math.cos(a) * 8.5, Math.sin(a) * 8.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawImpact(
  ctx: CanvasRenderingContext2D,
  x: number,
  progress: number // 0→1
) {
  const r = 30 * progress;
  const alpha = 1 - progress;
  ctx.strokeStyle = `rgba(255,80,40,${alpha * 0.85})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, GROUND_Y - 8, r, 0, Math.PI * 2);
  ctx.stroke();

  const r2 = 18 * progress;
  ctx.strokeStyle = `rgba(255,200,60,${alpha * 0.65})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, GROUND_Y - 8, r2, 0, Math.PI * 2);
  ctx.stroke();

  // Spark lines
  const spokes = 6;
  ctx.strokeStyle = `rgba(255,160,40,${alpha * 0.7})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.4, GROUND_Y - 8 + Math.sin(a) * r * 0.4);
    ctx.lineTo(x + Math.cos(a) * r * 0.9, GROUND_Y - 8 + Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
}

// ── Slider component ──────────────────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  description: string;
}

function SliderRow({ label, unit, value, min, max, step, display, onChange, description }: SliderRowProps) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: "0.68rem", fontFamily: C.mono, color: C.accentDim, letterSpacing: "0.08em" }}>
            {label}
          </span>
          <span style={{ fontSize: "0.6rem", color: C.textMuted, fontFamily: C.mono, marginLeft: 6 }}>
            {description}
          </span>
        </div>
        <span style={{ fontSize: "0.72rem", fontFamily: C.mono, color: C.text, minWidth: 70, textAlign: "right" }}>
          {display} <span style={{ color: C.textMuted, fontSize: "0.6rem" }}>{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "rgba(0,180,255,0.9)", cursor: "pointer", height: 4 }}
      />
    </div>
  );
}

// ── Main game component ───────────────────────────────────────────────────────
interface TrajectoryCalibrationGameProps {
  onComplete: () => void;
}

type GamePhase = "idle" | "flying" | "success";

const DEFAULT_PARAMS: PhysicsParams = {
  drehzahl: 6,
  loslasspunkt: 45,
  wurfmasse: 2.5,
  winkel: 40,
};

const HIT_SPEECHES = ["?!#@!!", "!!ERROR!!", "AAARGH!", "X____X", "☠☠☠", "SYSTEM FAIL", "ERROR 418"];
const IDLE_SPEECHES = ["beep", "brrt", "...", "boop", "zrrr", "♪", "blip", ">_<"];

export default function TrajectoryCalibrationGame({ onComplete }: TrajectoryCalibrationGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── React state (for UI controls) ──
  const [params, setParams] = useState<PhysicsParams>(DEFAULT_PARAMS);
  const [hits, setHits] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [canFire, setCanFire] = useState(true);

  // ── Game loop refs (no re-renders) ──
  const stateRef = useRef({
    botX: 350,
    botDir: 1,
    botStunned: false,
    hits: 0,
    phase: "idle" as GamePhase,
    projectile: {
      active: false,
      path: [] as TPoint[],
      frame: 0,
    },
    speech: null as { text: string; timer: number } | null,
    trajectory: [] as TPoint[],
    params: DEFAULT_PARAMS,
    lastTime: 0,
    impactAnim: null as { x: number; progress: number } | null,
    wobbleTime: 0,
    discRotation: 0,
    brushAngle: 0,
    attemptCount: 0,      // incremented on every fire; drives difficulty scaling
    dirChangeTimer: 2.0,  // seconds until next random direction change
  });
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // ── Trajectory preview + telemetry (memoized, no setState in effect) ──
  const trajectoryPreview = useMemo(() => calcTrajectory(params), [params]);
  const telemetry = useMemo(() => {
    const last = trajectoryPreview[trajectoryPreview.length - 1];
    const v0 = computeV0(params);
    return {
      landingX: Math.round(Math.max(0, last.x)),
      flightTime: last.t.toFixed(2),
      v0: Math.round(v0),
    };
  }, [params, trajectoryPreview]);

  // ── Sync params → game-loop refs (no setState) ──
  useEffect(() => {
    stateRef.current.trajectory = trajectoryPreview;
    stateRef.current.params = params;
  }, [params, trajectoryPreview]);

  // ── Canvas game loop ──
  const drawScene = useCallback((
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current
  ) => {
    const W = ARENA_W, H = ARENA_H;

    // Background
    ctx.fillStyle = "#020810";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(0,160,255,0.05)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Ground glow
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y - 2, 0, H);
    groundGrad.addColorStop(0, "rgba(0,180,255,0.18)");
    groundGrad.addColorStop(1, "rgba(0,40,100,0.25)");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // Ground line
    ctx.strokeStyle = "rgba(0,190,255,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    // Floor grid detail lines
    ctx.strokeStyle = "rgba(0,120,200,0.1)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, GROUND_Y); ctx.lineTo(gx, H); ctx.stroke();
    }

    // Trajectory preview (dotted, only when idle) — cut to ~42% so player can't read the landing spot
    if (s.phase === "idle" && s.trajectory.length > 1) {
      const cutoff = Math.max(2, Math.floor(s.trajectory.length * 0.42));
      const visible = s.trajectory.slice(0, cutoff);
      ctx.strokeStyle = "rgba(0,180,255,0.28)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.moveTo(visible[0].x, visible[0].y);
      for (const p of visible) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Fade-out dot at the arc tip to indicate the preview is truncated
      const tip = visible[visible.length - 1];
      ctx.fillStyle = "rgba(0,180,255,0.25)";
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grinder robot launcher
    drawGrinderRobot(ctx, s.params.winkel, !s.projectile.active, s.discRotation);

    // Projectile (disc in flight)
    if (s.projectile.active) {
      drawDiscProjectile(ctx, s.projectile.path, s.projectile.frame, s.discRotation);
    }

    // Impact animation
    if (s.impactAnim) {
      drawImpact(ctx, s.impactAnim.x, s.impactAnim.progress);
    }

    // Vacuum Roomba
    const wobble = s.botStunned ? Math.sin(s.wobbleTime * 22) * 2 : 0;
    drawRoomba(ctx, s.botX, s.botDir, s.botStunned, s.speech?.text ?? null, wobble, s.brushAngle);

    // Success overlay
    if (s.phase === "success") {
      ctx.fillStyle = "rgba(4,20,10,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#4ade80";
      ctx.font = `bold 18px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("KALIBRIERUNG ABGESCHLOSSEN", W / 2, H / 2 - 14);
      ctx.font = `13px 'JetBrains Mono', monospace`;
      ctx.fillStyle = "rgba(100,220,150,0.7)";
      ctx.fillText("Abwurfeinheit stabil eingestellt", W / 2, H / 2 + 14);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxRaw = canvas.getContext("2d");
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    let rafId: number;

    // Random idle speech bubbles for bot
    const speechId = setInterval(() => {
      const s = stateRef.current;
      if (!s.botStunned && s.phase !== "success" && Math.random() < 0.38) {
        const text = IDLE_SPEECHES[Math.floor(Math.random() * IDLE_SPEECHES.length)];
        s.speech = { text, timer: 1.4 };
      }
    }, 2800);

    function tick(now: number) {
      const s = stateRef.current;
      const dt = s.lastTime > 0 ? Math.min((now - s.lastTime) / 1000, 0.05) : 0.016;
      s.lastTime = now;

      // Speech timer
      if (s.speech) {
        s.speech.timer -= dt;
        if (s.speech.timer <= 0) s.speech = null;
      }

      // Impact animation
      if (s.impactAnim) {
        s.impactAnim.progress = Math.min(1, s.impactAnim.progress + dt * 1.8);
        if (s.impactAnim.progress >= 1) s.impactAnim = null;
      }

      // Wobble timer + disc rotation
      if (s.botStunned) {
        s.wobbleTime += dt;
      } else {
        s.wobbleTime = 0;
      }
      s.discRotation += s.projectile.active ? 0.28 : 0.04;
      s.brushAngle += dt * 9; // ~1.4 rot/s, matches CSS brush-spin 0.7s

      // Move bot (difficulty scales with attemptCount)
      if (!s.botStunned && s.phase !== "success") {
        // Speed: +40% per attempt, capped at 5 attempts worth
        const diff = Math.min(s.attemptCount, 5);
        const speedMult = 1 + diff * 0.4; // attempt 1→1.4×, 2→1.8×, 3→2.2×, …
        const speed = BOT_BASE_SPEED * speedMult * (0.78 + 0.44 * Math.sin(now / 2200));
        s.botX += s.botDir * speed * dt;
        if (s.botX > BOT_MAX_X) { s.botX = BOT_MAX_X; s.botDir = -1; }
        if (s.botX < BOT_MIN_X) { s.botX = BOT_MIN_X; s.botDir = 1; }

        // Random direction changes: interval shrinks with each attempt
        // attempt 0: ~2.5s, attempt 1: ~1.95s, attempt 2: ~1.4s, attempt 3: ~0.85s
        s.dirChangeTimer -= dt;
        if (s.dirChangeTimer <= 0) {
          const baseInterval = Math.max(0.45, 2.5 - diff * 0.55);
          s.dirChangeTimer = baseInterval * (0.5 + Math.random() * 1.0);
          if (Math.random() < 0.65) s.botDir *= -1;
        }
      }

      // Advance projectile
      if (s.projectile.active) {
        s.projectile.frame += 1;
        const frame = s.projectile.frame;
        const path = s.projectile.path;

        if (frame < path.length) {
          const p = path[frame];

          // Collision check: projectile near ground level + near bot
          if (p.y >= GROUND_Y - 40) {
            const dx = Math.abs(p.x - s.botX);
            if (dx < BOT_RADIUS && !s.botStunned) {
              // ─── HIT ───
              s.projectile.active = false;
              s.botStunned = true;
              s.impactAnim = { x: p.x, progress: 0 };
              const hitText = HIT_SPEECHES[Math.floor(Math.random() * HIT_SPEECHES.length)];
              s.speech = { text: hitText, timer: 3.0 };
              s.hits += 1;

              const newHits = s.hits;
              setHits(newHits);

              if (newHits >= HITS_TO_WIN) {
                s.phase = "success";
                setPhase("success");
                setTimeout(() => onCompleteRef.current(), 2200);
              } else {
                s.phase = "idle";
                setPhase("idle");
                setCanFire(true);

                // Recovery sequence
                setTimeout(() => {
                  s.speech = { text: "kalibriere...", timer: 1.5 };
                  setTimeout(() => {
                    s.botStunned = false;
                    s.speech = null;
                  }, 1600);
                }, 1600);
              }
            }
          }
        }

        // Projectile reached end of path → miss
        if (frame >= path.length) {
          s.projectile.active = false;
          s.phase = "idle";
          setPhase("idle");
          setCanFire(true);
        }
      }

      drawScene(ctx, s);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(speechId);
    };
  }, [drawScene]);

  const handleFire = () => {
    if (!canFire || phase !== "idle") return;
    setCanFire(false);
    stateRef.current.attemptCount += 1;
    const path = calcTrajectory(stateRef.current.params);
    stateRef.current.projectile = { active: true, path, frame: 0 };
    stateRef.current.phase = "flying";
    setPhase("flying");
  };

  // ── WASD param control (W/S = Winkel, A/D = Drehzahl) ──────────────────────
  useEffect(() => {
    const wasd = { w: false, s: false, a: false, d: false };
    let rafId: number;
    let lastT = 0;
    const ANGLE_RATE = 14;  // °/s
    const SPEED_RATE = 1.6; // units/s

    function paramTick(now: number) {
      const dt = lastT > 0 ? Math.min((now - lastT) / 1000, 0.05) : 0;
      lastT = now;
      if (wasd.w || wasd.s || wasd.a || wasd.d) {
        setParams(p => ({
          ...p,
          winkel:   Math.max(35, Math.min(80, p.winkel   + (wasd.w ? ANGLE_RATE  : wasd.s ?  -ANGLE_RATE  : 0) * dt)),
          drehzahl: Math.max(1,  Math.min(10, p.drehzahl + (wasd.d ? SPEED_RATE : wasd.a ? -SPEED_RATE : 0) * dt)),
        }));
      }
      rafId = requestAnimationFrame(paramTick);
    }

    const onDown = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W") wasd.w = true;
      if (e.key === "s" || e.key === "S") wasd.s = true;
      if (e.key === "a" || e.key === "A") wasd.a = true;
      if (e.key === "d" || e.key === "D") wasd.d = true;
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W") wasd.w = false;
      if (e.key === "s" || e.key === "S") wasd.s = false;
      if (e.key === "a" || e.key === "A") wasd.a = false;
      if (e.key === "d" || e.key === "D") wasd.d = false;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    rafId = requestAnimationFrame(paramTick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup",   onUp);
    };
  }, []);

  const previewTraj = useMemo(() => calcTrajectory(params), [params]);
  const landingX = previewTraj[previewTraj.length - 1]?.x ?? 0;
  const landingInRange = landingX >= BOT_MIN_X && landingX <= BOT_MAX_X;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Arena canvas ── */}
      <div style={{
        position: "relative",
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
        border: "1px solid rgba(0,180,255,0.22)",
        borderBottom: "none",
      }}>
        <canvas
          ref={canvasRef}
          width={ARENA_W}
          height={ARENA_H}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        {/* Hit counter overlay */}
        <div style={{
          position: "absolute",
          top: 10,
          right: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}>
          {Array.from({ length: HITS_TO_WIN }, (_, i) => (
            <div key={i} style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: i < hits ? C.green : "rgba(0,180,255,0.15)",
              border: `1px solid ${i < hits ? "rgba(80,255,140,0.6)" : "rgba(0,180,255,0.35)"}`,
              boxShadow: i < hits ? "0 0 8px rgba(80,255,140,0.5)" : "none",
              transition: "all 0.3s ease",
            }} />
          ))}
          <span style={{
            fontFamily: C.mono,
            fontSize: "0.65rem",
            color: C.accentDim,
            marginLeft: 2,
          }}>
            TREFFER {hits}/{HITS_TO_WIN}
          </span>
        </div>
      </div>

      {/* ── Controls panel ── */}
      <div style={{
        background: "rgba(4,10,24,0.97)",
        border: "1px solid rgba(0,180,255,0.22)",
        borderRadius: "0 0 8px 8px",
        padding: "14px 18px 12px",
      }}>
        {/* Sliders 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 24px" }}>
          <SliderRow
            label="DREHZAHL"
            unit=""
            value={params.drehzahl}
            min={1} max={10} step={0.1}
            display={params.drehzahl.toFixed(1)}
            onChange={(v) => setParams((p) => ({ ...p, drehzahl: v }))}
            description="→ Geschwindigkeit  A ◀ ▶ D"
          />
          <SliderRow
            label="LOSLASSPUNKT"
            unit="°"
            value={params.loslasspunkt}
            min={10} max={90} step={1}
            display={params.loslasspunkt.toFixed(0)}
            onChange={(v) => setParams((p) => ({ ...p, loslasspunkt: v }))}
            description="→ Effizienz (45°=max)"
          />
          <SliderRow
            label="WURFMASSE"
            unit="kg"
            value={params.wurfmasse}
            min={0.5} max={5.0} step={0.1}
            display={params.wurfmasse.toFixed(1)}
            onChange={(v) => setParams((p) => ({ ...p, wurfmasse: v }))}
            description="→ Luftwiderstand ↓"
          />
          <SliderRow
            label="WINKEL"
            unit="°"
            value={params.winkel}
            min={35} max={80} step={1}
            display={params.winkel.toFixed(0)}
            onChange={(v) => setParams((p) => ({ ...p, winkel: v }))}
            description="→ Abflugrichtung  S ▼ ▲ W"
          />
        </div>

        {/* Telemetry + Fire button */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
          {/* Telemetry */}
          <div style={{
            flex: 1,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(0,180,255,0.12)",
            borderRadius: 6,
            padding: "6px 10px",
            fontFamily: C.mono,
            fontSize: "0.6rem",
            color: C.textMuted,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}>
            <span>
              v₀ <span style={{ color: C.accent }}>{telemetry.v0} px/s</span>
            </span>
            <span>
              Flugzeit <span style={{ color: C.accent }}>{telemetry.flightTime} s</span>
            </span>
            <span>
              Aufprall-X{" "}
              <span style={{ color: landingInRange ? C.orange : C.textMuted }}>
                {telemetry.landingX}px
              </span>
              {landingInRange && (
                <span style={{ color: C.green, marginLeft: 4 }}>●</span>
              )}
            </span>
          </div>

          {/* Fire button */}
          <button
            onClick={handleFire}
            disabled={!canFire || phase !== "idle"}
            style={{
              flexShrink: 0,
              padding: "9px 20px",
              background: canFire && phase === "idle"
                ? "rgba(255,180,40,0.15)"
                : "rgba(40,60,100,0.2)",
              border: `1px solid ${canFire && phase === "idle" ? "rgba(255,180,40,0.6)" : "rgba(0,100,180,0.3)"}`,
              borderRadius: 8,
              color: canFire && phase === "idle" ? C.orange : "rgba(100,130,180,0.5)",
              fontFamily: C.mono,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: canFire && phase === "idle" ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              boxShadow: canFire && phase === "idle"
                ? "0 0 14px rgba(255,180,40,0.2)"
                : "none",
            }}
          >
            {phase === "flying" ? "..." : "▶ ABWURF"}
          </button>
        </div>
      </div>
    </div>
  );
}
