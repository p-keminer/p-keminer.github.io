import { useEffect, useRef, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const CW = 620;
const CH = 370;

const HEAT_RATE    = 1 / 6;     // heat/s while iron on pad (max at 6 s)
const COOL_RATE    = 1 / 3;     // heat loss/s while iron away
const SOLDER_RATE  = 1 / 0.9;   // solderedProgress/s while applying solder
const SOLDER_READY = 0.33;      // heat threshold before solder can be applied (~2 s)
const SOLDER_MAX   = 1.05;      // solderedProgress that triggers "too much solder" fail
const SOLDER_MIN   = 0.35;      // minimum solderedProgress to count as done
const WARN_HEAT    = 5 / 6;     // heat > this → show overheat warning (~5 s)
const FAIL_HEAT    = 1.18;      // heat > this → fail (overheat)
const IRON_RADIUS  = 26;        // distance within which iron heats pad
const SOLDER_REACH = 28;        // distance within which solder wire is effective
const SOLDER_SPD   = 2.6;       // solder wire movement speed px/frame at 60fps

const monoFont = "'JetBrains Mono','Fira Mono','Courier New',monospace";

// ─── Pad layout ──────────────────────────────────────────────────────────────
const PAD_DEFS = [
  { x: 155, y: 252, label: "LED+",  compLabel: "LED 1", compColor: "#cc3020", compY: 110 },
  { x: 310, y: 252, label: "R1",    compLabel: "10kΩ",  compColor: "#c8a060", compY: 110 },
  { x: 465, y: 252, label: "LED-",  compLabel: "LED 2", compColor: "#208040", compY: 110 },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface PadState {
  x: number; y: number;
  label: string; compLabel: string; compColor: string; compY: number;
  heat: number;           // 0..1+
  solderedProgress: number;
  soldering: boolean;     // solder was being applied last frame
  done: boolean;
  warned: boolean;
}

interface SState {
  ironX: number; ironY: number;
  solderX: number; solderY: number;
  applyingSolder: boolean;   // space / mobile button held
  mobileSolder: boolean;
  keys: Record<string, boolean>;
  pads: PadState[];
  lastTime: number;
  phase: "playing" | "failed" | "complete";
  failReason: string;
  overheatWarnVisible: boolean;
  warnPad: number | null;
}

function makeState(): SState {
  return {
    ironX: CW / 2, ironY: CH / 2,
    solderX: CW / 2 + 40, solderY: CH / 2,
    applyingSolder: false, mobileSolder: false,
    keys: {},
    pads: PAD_DEFS.map(p => ({
      ...p,
      heat: 0, solderedProgress: 0,
      soldering: false, done: false, warned: false,
    })),
    lastTime: 0,
    phase: "playing",
    failReason: "",
    overheatWarnVisible: false,
    warnPad: null,
  };
}

function getPos(canvas: HTMLCanvasElement, e: PointerEvent | React.PointerEvent) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width)  * CW,
    y: ((e.clientY - r.top)  / r.height) * CH,
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function heatToColor(heat: number): string {
  // 0 = gold, 0.5 = orange, 1+ = red
  const t = Math.min(1, heat);
  if (t < 0.33) {
    // gold → orange-gold
    const u = t / 0.33;
    const r = Math.round(210 + u * 40);
    const g = Math.round(175 - u * 70);
    return `rgb(${r},${g},20)`;
  } else if (t < 0.66) {
    // orange-gold → orange
    const u = (t - 0.33) / 0.33;
    const r = 250;
    const g = Math.round(105 - u * 55);
    return `rgb(${r},${g},5)`;
  } else {
    // orange → red
    const u = (t - 0.66) / 0.34;
    const r = 255;
    const g = Math.round(50 - u * 40);
    return `rgb(${r},${g},0)`;
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, s: SState) {
  ctx.clearRect(0, 0, CW, CH);

  // Background
  const bgG = ctx.createLinearGradient(0, 0, 0, CH);
  bgG.addColorStop(0, "#0a0d0f");
  bgG.addColorStop(1, "#0e1218");
  ctx.fillStyle = bgG;
  ctx.fillRect(0, 0, CW, CH);

  // PCB board
  const pcbX = 16, pcbY = 46, pcbW = CW - 32, pcbH = 270;
  ctx.save();
  ctx.fillStyle = "#1a3820";
  ctx.beginPath();
  ctx.roundRect(pcbX, pcbY, pcbW, pcbH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,80,40,0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // PCB grid lines (circuit trace hints)
  ctx.save();
  ctx.strokeStyle = "rgba(0,100,50,0.3)";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 8]);
  for (let x = pcbX + 20; x < pcbX + pcbW; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, pcbY + 10); ctx.lineTo(x, pcbY + pcbH - 10); ctx.stroke();
  }
  for (let y = pcbY + 20; y < pcbY + pcbH; y += 40) {
    ctx.beginPath(); ctx.moveTo(pcbX + 10, y); ctx.lineTo(pcbX + pcbW - 10, y); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  // PCB label
  ctx.save();
  ctx.font = `bold 10px ${monoFont}`;
  ctx.fillStyle = "rgba(0,140,60,0.45)";
  ctx.textAlign = "right";
  ctx.fillText("PCB REV 1.0", pcbX + pcbW - 8, pcbY + pcbH - 8);
  ctx.restore();

  // Copper traces (connects pads to components)
  ctx.save();
  ctx.strokeStyle = "rgba(200,140,30,0.55)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  for (const p of s.pads) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 14);
    ctx.lineTo(p.x, p.compY + 30);
    ctx.stroke();
  }
  ctx.restore();

  // Components
  for (const p of s.pads) {
    ctx.save();
    // Component body
    ctx.fillStyle = p.compColor;
    ctx.beginPath();
    ctx.roundRect(p.x - 18, p.compY, 36, 30, 4);
    ctx.fill();
    // Component gloss
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(p.x - 16, p.compY + 2, 32, 10, 3);
    ctx.fill();
    // Component label
    ctx.font = `bold 9px ${monoFont}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.fillText(p.compLabel, p.x, p.compY + 20);
    // Legs
    ctx.strokeStyle = "rgba(160,160,130,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - 10, p.compY + 30); ctx.lineTo(p.x - 10, p.compY + 42);
    ctx.moveTo(p.x + 10, p.compY + 30); ctx.lineTo(p.x + 10, p.compY + 42);
    ctx.stroke();
    ctx.restore();
  }

  // Solder pads
  for (let i = 0; i < s.pads.length; i++) {
    const p = s.pads[i];
    ctx.save();
    if (p.done) {
      // Soldered: silver + green glow
      ctx.shadowColor = "rgba(60,220,100,0.7)";
      ctx.shadowBlur = 12;
      const dGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
      dGrad.addColorStop(0, "#e8e8e8");
      dGrad.addColorStop(0.5, "#c0c0c0");
      dGrad.addColorStop(1, "#909090");
      ctx.fillStyle = dGrad;
    } else {
      // Heated color
      const padColor = heatToColor(p.heat);
      const padGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
      padGrad.addColorStop(0, "#e8d080");
      padGrad.addColorStop(0.6, padColor);
      padGrad.addColorStop(1, "rgba(150,100,10,0.6)");
      ctx.fillStyle = padGrad;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fill();
    // Pad ring
    ctx.strokeStyle = p.done ? "rgba(60,220,100,0.6)" : "rgba(200,160,30,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    // Center hole
    ctx.fillStyle = p.done ? "#b0b0b0" : "#0e1e14";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // pad label
    ctx.font = `9px ${monoFont}`;
    ctx.fillStyle = "rgba(200,200,200,0.5)";
    ctx.textAlign = "center";
    ctx.fillText(p.label, p.x, p.y + 26);
    ctx.restore();

    // Solder progress bar under pad
    if (!p.done && p.solderedProgress > 0) {
      const bx = p.x - 22, by = p.y + 30;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(bx, by, 44, 5);
      const pColor = p.solderedProgress > 0.9 ? "#f87171" : "#60d0c8";
      ctx.fillStyle = pColor;
      ctx.fillRect(bx, by, 44 * Math.min(1, p.solderedProgress / 1.0), 5);
      ctx.restore();
    }

    // Heat indicator dot
    if (!p.done && p.heat > 0.05) {
      const t = Math.min(1, p.heat / WARN_HEAT);
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = heatToColor(p.heat);
      ctx.beginPath();
      ctx.arc(p.x + 16, p.y - 16, 4 + t * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Solder wire cursor
  ctx.save();
  ctx.strokeStyle = "rgba(200,220,255,0.75)";
  ctx.lineWidth = 2;
  // Coil representation
  const sw = 12;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(s.solderX + i * (sw / 2) - sw * 0.75, s.solderY, sw / 2, 0, Math.PI, i % 2 === 1);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(s.solderX, s.solderY, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `9px ${monoFont}`;
  ctx.fillStyle = "rgba(180,200,255,0.4)";
  ctx.textAlign = "center";
  ctx.fillText("[WASD]", s.solderX, s.solderY + 20);
  ctx.restore();

  // Soldering iron cursor
  ctx.save();
  // Hot tip glow
  ctx.shadowColor = "rgba(255,160,40,0.6)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ff9820";
  ctx.beginPath();
  ctx.moveTo(s.ironX, s.ironY);
  ctx.lineTo(s.ironX - 5, s.ironY + 12);
  ctx.lineTo(s.ironX + 5, s.ironY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Iron body
  ctx.fillStyle = "#686868";
  ctx.beginPath();
  ctx.roundRect(s.ironX - 5, s.ironY + 12, 10, 28, 3);
  ctx.fill();
  // Handle grip
  ctx.fillStyle = "#303030";
  ctx.beginPath();
  ctx.roundRect(s.ironX - 4, s.ironY + 26, 8, 14, 2);
  ctx.fill();
  ctx.restore();

  // HUD: completed count
  const doneCount = s.pads.filter(p => p.done).length;
  ctx.save();
  ctx.font = `11px ${monoFont}`;
  ctx.fillStyle = "rgba(180,210,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText(`Gelötet: ${doneCount} / ${s.pads.length}`, 24, 34);
  ctx.textAlign = "right";
  ctx.fillText("Lötkolben: Maus  ·  Lötzinn: WASD  ·  Löten: Leertaste", CW - 24, 34);
  ctx.restore();

  // Overheat warning overlay (pulsing)
  if (s.overheatWarnVisible) {
    const pulse = (Math.sin(Date.now() / 220) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = 0.04 + pulse * 0.06;
    ctx.fillStyle = "#ff4500";
    ctx.fillRect(0, 0, CW, CH);
    ctx.globalAlpha = 1;
    ctx.font = `bold 12px ${monoFont}`;
    ctx.fillStyle = `rgba(255,120,60,${0.7 + pulse * 0.3})`;
    ctx.textAlign = "right";
    ctx.fillText("⚠ Achtung: Zerstörung des Bauteils möglich, bei weiterer Erwärmung", CW - 12, 20);
    ctx.restore();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
  onAbort: () => void;
}

export default function SolderingGame({ onComplete, onAbort }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<SState>(makeState());
  const rafRef    = useRef(0);
  const [phase, setPhase]     = useState<SState["phase"]>("playing");
  const [failReason, setFail] = useState("");
  const isMobile = typeof window !== "undefined" && (window.innerWidth < 900 || navigator.maxTouchPoints > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    stateRef.current.lastTime = performance.now();

    // ── Game loop ──────────────────────────────────────────────────────────
    function tick(now: number) {
      const s = stateRef.current; // re-read every frame so restart() works
      const rawDt = (now - s.lastTime) / 1000;
      const dt = Math.min(rawDt, 0.1); // cap at 100ms
      s.lastTime = now;
      if (s.phase !== "playing") {
        drawFrame(ctx!, s);
        rafRef.current = requestAnimationFrame(tick); // keep loop alive for restart
        return;
      }

      // Move solder wire with WASD
      if (s.keys["w"] || s.keys["ArrowUp"])    s.solderY = Math.max(20, s.solderY - SOLDER_SPD * dt * 60);
      if (s.keys["s"] || s.keys["ArrowDown"])  s.solderY = Math.min(CH - 20, s.solderY + SOLDER_SPD * dt * 60);
      if (s.keys["a"] || s.keys["ArrowLeft"])  s.solderX = Math.max(20, s.solderX - SOLDER_SPD * dt * 60);
      if (s.keys["d"] || s.keys["ArrowRight"]) s.solderX = Math.min(CW - 20, s.solderX + SOLDER_SPD * dt * 60);

      const applying = s.applyingSolder || s.mobileSolder;
      s.overheatWarnVisible = false;
      let anyWarn = false;

      for (let i = 0; i < s.pads.length; i++) {
        const p = s.pads[i];
        if (p.done) continue;

        const dxIron = s.ironX - p.x;
        const dyIron = s.ironY - p.y;
        const ironDist = Math.sqrt(dxIron * dxIron + dyIron * dyIron);
        const ironNear = ironDist < IRON_RADIUS;

        // Heat / cool
        if (ironNear) {
          p.heat += HEAT_RATE * dt;
        } else {
          p.heat = Math.max(0, p.heat - COOL_RATE * dt);
          // Reset solder progress if pad cools below solder-ready
          if (p.heat < SOLDER_READY * 0.5) p.solderedProgress = 0;
        }

        // Overheat warning
        if (p.heat > WARN_HEAT) {
          anyWarn = true;
          s.overheatWarnVisible = true;
        }

        // Overheat fail
        if (p.heat > FAIL_HEAT) {
          s.phase = "failed";
          s.failReason = `Bauteil ${p.label} überhitzt! Lötkolben rechtzeitig abheben.`;
          setFail(s.failReason);
          setPhase("failed");
          break; // exit pad loop, fall through to drawFrame + rAF
        }

        // Apply solder
        if (applying && ironNear && p.heat >= SOLDER_READY) {
          const dxSolder   = s.solderX - p.x;
          const dySolder   = s.solderY - p.y;
          const solderDist = Math.sqrt(dxSolder * dxSolder + dySolder * dySolder);
          if (solderDist < SOLDER_REACH) {
            p.solderedProgress += SOLDER_RATE * dt;
            p.soldering = true;
          } else {
            p.soldering = false;
          }
        } else {
          // Check if solder was released
          if (p.soldering) {
            p.soldering = false;
            if (p.solderedProgress >= SOLDER_MIN && p.solderedProgress < SOLDER_MAX) {
              p.done = true;
            }
            // else: not enough or too much; reset and let them try again
            if (!p.done) p.solderedProgress = 0;
          }
        }

        // Too much solder fail
        if (p.solderedProgress >= SOLDER_MAX) {
          s.phase = "failed";
          s.failReason = `Zu viel Lötzinn auf Pad ${p.label}! Präziser dosieren.`;
          setFail(s.failReason);
          setPhase("failed");
          break; // exit pad loop, fall through to drawFrame + rAF
        }
      }

      if (!anyWarn) s.overheatWarnVisible = false;

      // Completion check
      if (s.pads.every(p => p.done)) {
        s.phase = "complete";
        setPhase("complete");
      }

      drawFrame(ctx!, s);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    // ── Keyboard ──────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k)) {
        e.preventDefault(); stateRef.current.keys[k] = true;
      }
      if (k === " ") { e.preventDefault(); stateRef.current.applyingSolder = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key] = false;
      if (e.key === " ") stateRef.current.applyingSolder = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, []);

  // ── Pointer handlers on canvas ────────────────────────────────────────────
  const updateIron = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPos(canvas, e);
    stateRef.current.ironX = x;
    stateRef.current.ironY = y;
  };

  const mk = (key: string, down: boolean) => { stateRef.current.keys[key] = down; };

  const padBtn = (label: string, key: string, size = 48) => (
    <button
      type="button"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); mk(key, true); }}
      onPointerUp={() => mk(key, false)}
      onPointerCancel={() => mk(key, false)}
      onPointerLeave={() => mk(key, false)}
      style={{
        width: size, height: size, borderRadius: 10,
        border: "1px solid rgba(130,180,255,0.25)",
        background: "rgba(30,50,80,0.8)",
        color: "rgba(180,210,255,0.85)",
        fontSize: 18, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        userSelect: "none", WebkitUserSelect: "none", touchAction: "none",
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
        <span style={{ fontFamily: monoFont, fontSize: 11, color: "#4a6080", marginLeft: 6 }}>
          LEVEL 2 · LÖTEN — Lötkolben: Maus · Lötzinn: WASD · Löten: Leertaste
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
          style={{ display: "block", width: "100%", height: "auto", touchAction: "none", cursor: "none" }}
          onPointerMove={updateIron}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); updateIron(e); }}
        />

        {/* Overlay */}
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
                <div style={{ fontSize: 32 }}>🔥</div>
                <div style={{
                  fontFamily: monoFont, fontSize: 13, color: "#f87171",
                  textAlign: "center", lineHeight: 1.6, maxWidth: 380,
                }}>
                  {failReason}
                </div>
                <button type="button" onClick={restart} style={{
                  padding: "10px 24px",
                  background: "rgba(255,80,40,0.15)",
                  border: "1px solid rgba(255,80,40,0.45)",
                  borderRadius: 10, color: "#ff8060",
                  fontFamily: monoFont, fontSize: 12, cursor: "pointer",
                }}>
                  NOCHMAL VERSUCHEN
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36 }}>🎉</div>
                <div style={{
                  fontFamily: monoFont, fontSize: 14, color: "#4ade80",
                  textAlign: "center", lineHeight: 1.5,
                }}>
                  Alle Lötpunkte erfolgreich verbunden!<br/>
                  <span style={{ color: "rgba(180,210,255,0.5)", fontSize: 11 }}>
                    Fertigungsmodul abgeschlossen.
                  </span>
                </div>
                <button type="button" onClick={onComplete} style={{
                  padding: "10px 28px",
                  background: "rgba(40,200,100,0.15)",
                  border: "1px solid rgba(60,220,120,0.50)",
                  borderRadius: 10, color: "rgba(140,240,180,0.95)",
                  fontFamily: monoFont, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.08em",
                }}>
                  ABSCHLIESSEN ▶
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile controls */}
      {isMobile && (
        <div style={{
          background: "rgba(3,6,14,0.98)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 14px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexShrink: 0,
        }}>
          {/* Solder wire D-pad */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontFamily: monoFont, fontSize: 9, color: "rgba(120,160,200,0.4)", letterSpacing: "0.1em", marginBottom: 2 }}>
              LÖTZINN
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 48px)", gap: 3 }}>
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

          {/* Löten button */}
          <button
            type="button"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); stateRef.current.mobileSolder = true; }}
            onPointerUp={() => { stateRef.current.mobileSolder = false; }}
            onPointerCancel={() => { stateRef.current.mobileSolder = false; }}
            onPointerLeave={() => { stateRef.current.mobileSolder = false; }}
            style={{
              flex: 1, height: 80,
              background: "rgba(40,180,120,0.20)",
              border: "2px solid rgba(60,200,140,0.55)",
              borderRadius: 12,
              color: "#60d4a0",
              fontFamily: monoFont, fontSize: 13, fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.06em",
              touchAction: "none", userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            LÖTEN<br/>
            <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 400 }}>
              Kolben auf Pad + Zinn anlegen
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
