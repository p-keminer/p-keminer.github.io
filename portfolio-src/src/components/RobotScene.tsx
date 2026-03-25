import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Computed once at load — used to strip expensive GPU effects on small screens
const PERF_REDUCED = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;

/**
 * RobotScene – Habbo-Hotel-style isometric workshop
 *
 * Coordinate system
 *   OX = 800, OY = 200   (isometric origin – centre of SVG)
 *   TW = 72  (tile half-width  → full tile = 144px wide)
 *   TH = 36  (tile half-height → full tile =  72px tall)
 *   ix(c,r)       = OX + (c - r) * TW
 *   iy(c,r, hpx)  = OY + (c + r) * TH - hpx
 *
 * Depth sort: render in ascending (c + r) order so back tiles go first.
 */

const OX = 800;
const OY = 200;
const TW = 72;
const TH = 36;

const ROBOT_POS = {
  welder: { c: -0.8, r: -0.8, scale: 0.82 },
  crane: { c: 6.0, r: 9.0, scale: 1.16 },
  inspector: { c: 0.6, r: 10, scale: 1.16 },
  coder: { c: 9, r: 1, scale: 1.18 },
  victim: { c: 2.0, r: 9, scale: 1.16 },
  shooter: { c: 8.3, r: 7.0, scale: 1.18 },
  grinder: { c: 11.4, r: 3.5, scale: 1.16 },
  laugher: { c: 0, r: 7.5, scale: 1.14 },
} as const;

function ix(c: number, r: number) {
  return OX + (c - r) * TW;
}
function iy(c: number, r: number, hpx = 0) {
  return OY + (c + r) * TH - hpx;
}

// ─── IsoBox ──────────────────────────────────────────────────────────────────
interface IsoBoxProps {
  c: number; r: number;
  cw?: number; cd?: number;
  ch?: number;
  top?: string; left?: string; right?: string;
  opacity?: number;
}
function IsoBox({ c, r, cw = 1, cd = 1, ch = 40, top = "#b0b8c8", left = "#6b7585", right = "#888fa0", opacity = 1 }: IsoBoxProps) {
  const tx0 = ix(c, r);           const ty0 = iy(c, r, ch);
  const tx1 = ix(c + cw, r);      const ty1 = iy(c + cw, r, ch);
  const tx2 = ix(c + cw, r + cd); const ty2 = iy(c + cw, r + cd, ch);
  const tx3 = ix(c, r + cd);      const ty3 = iy(c, r + cd, ch);

  const lx0 = tx3; const ly0 = ty3;
  const lx1 = tx2; const ly1 = ty2;
  const lx2 = ix(c + cw, r + cd); const ly2 = iy(c + cw, r + cd);
  const lx3 = ix(c, r + cd);      const ly3 = iy(c, r + cd);

  const rx0 = tx1; const ry0 = ty1;
  const rx1 = tx2; const ry1 = ty2;
  const rx2 = ix(c + cw, r + cd); const ry2 = iy(c + cw, r + cd);
  const rx3 = ix(c + cw, r);      const ry3 = iy(c + cw, r);

  const topPts   = `${tx0},${ty0} ${tx1},${ty1} ${tx2},${ty2} ${tx3},${ty3}`;
  const leftPts  = `${lx0},${ly0} ${lx1},${ly1} ${lx2},${ly2} ${lx3},${ly3}`;
  const rightPts = `${rx0},${ry0} ${rx1},${ry1} ${rx2},${ry2} ${rx3},${ry3}`;

  return (
    <g opacity={opacity}>
      <polygon points={leftPts}  fill={left} />
      <polygon points={rightPts} fill={right} />
      <polygon points={topPts}   fill={top} />
    </g>
  );
}

// ─── IsoFloor tile ───────────────────────────────────────────────────────────
function IsoTile({ c, r, fill = "rgba(40,60,90,0.55)", stroke = "rgba(80,140,200,0.18)" }: { c: number; r: number; fill?: string; stroke?: string }) {
  const pts = [
    `${ix(c, r)},${iy(c, r)}`,
    `${ix(c + 1, r)},${iy(c + 1, r)}`,
    `${ix(c + 1, r + 1)},${iy(c + 1, r + 1)}`,
    `${ix(c, r + 1)},${iy(c, r + 1)}`,
  ].join(" ");
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="0.8" />;
}

// ─── IsoWall segments ────────────────────────────────────────────────────────
function IsoWallLeft({ c, r, h = 120 }: { c: number; r: number; h?: number }) {
  const x0 = ix(c, r);     const y0 = iy(c, r);
  const x1 = ix(c, r + 1); const y1 = iy(c, r + 1);
  const pts = `${x0},${y0} ${x1},${y1} ${x1},${y1 - h} ${x0},${y0 - h}`;
  return <polygon points={pts} fill="rgba(22,34,60,0.82)" stroke="rgba(80,140,200,0.22)" strokeWidth="0.8" />;
}
function IsoWallRight({ c, r, h = 120 }: { c: number; r: number; h?: number }) {
  const x0 = ix(c, r);     const y0 = iy(c, r);
  const x1 = ix(c + 1, r); const y1 = iy(c + 1, r);
  const pts = `${x0},${y0} ${x1},${y1} ${x1},${y1 - h} ${x0},${y0 - h}`;
  return <polygon points={pts} fill="rgba(18,28,52,0.82)" stroke="rgba(80,140,200,0.22)" strokeWidth="0.8" />;
}

// ─── Scene hover label ────────────────────────────────────────────────────────
function SceneLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 8 + 24;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={x - w / 2} y={y - 17} width={w} height={21} rx={6}
        fill="rgba(4,12,26,0.90)" stroke="rgba(0,170,255,0.30)" strokeWidth={1} />
      <text x={x} y={y - 2}
        textAnchor="middle"
        fontSize={10}
        fill="rgba(0,210,255,0.88)"
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.10em"
      >
        {text}
      </text>
    </g>
  );
}

// ─── Unlock pulse ring ────────────────────────────────────────────────────────
function PulseRing({ cx, cy, active, color = "#00ccff" }: {
  cx: number; cy: number; active: boolean; color?: string;
}) {
  if (!active) return null;
  return (
    <>
      {[0, 1].map((i) => (
        <circle key={i} cx={cx} cy={cy} r={28}
          fill="none"
          stroke={color}
          strokeWidth={2.5 - i * 0.8}
          opacity={0}
          style={{
            transformBox: "fill-box" as React.CSSProperties["transformBox"],
            transformOrigin: "center",
            animation: "unlock-pulse 1.7s ease-out 3 forwards",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </>
  );
}

// ─── IsoBot ──────────────────────────────────────────────────────────────────
interface IsoBotProps {
  sx: number; sy: number;
  bodyColor?: string;
  headColor?: string;
  eyeColor?: string;
  accentColor?: string;
  animStyle?: React.CSSProperties;
  scale?: number;
  glowColor?: string;
  children?: React.ReactNode;
}
function IsoBot({
  sx, sy,
  bodyColor = "#4a9eff",
  headColor = "#3a7ecc",
  eyeColor = "#00ffcc",
  accentColor = "#ffffff",
  animStyle = {},
  scale = 1,
  glowColor = "rgba(120, 220, 255, 0.22)",
  children,
}: IsoBotProps) {
  return (
    <g transform={`translate(${sx},${sy})`}>
      <g
        transform={`scale(${scale})`}
        style={{
          ...animStyle,
          filter: PERF_REDUCED
            ? "drop-shadow(0 8px 10px rgba(0,0,0,0.34))"
            : `drop-shadow(0 10px 14px rgba(0,0,0,0.34)) drop-shadow(0 0 14px ${glowColor})`,
        }}
      >
        {/* Shadow */}
        <ellipse cx={0} cy={4} rx={18} ry={7} fill="rgba(0,0,0,0.35)" />
        {/* Legs */}
        <rect x={-9} y={20} width={7} height={14} rx={2} fill={bodyColor} opacity={0.9} />
        <rect x={3}  y={20} width={7} height={14} rx={2} fill={bodyColor} opacity={0.9} />
        {/* Feet */}
        <rect x={-11} y={32} width={9} height={5} rx={2} fill={headColor} />
        <rect x={1}   y={32} width={9} height={5} rx={2} fill={headColor} />
        {/* Body */}
        <rect x={-13} y={0} width={26} height={24} rx={4} fill={bodyColor} />
        {/* Chest panel */}
        <rect x={-8} y={4} width={16} height={10} rx={2} fill="rgba(0,0,0,0.35)" />
        <circle cx={-4} cy={9}  r={2.2} fill={eyeColor} opacity={0.95} />
        <circle cx={4}  cy={9}  r={2.2} fill={eyeColor} opacity={0.95} />
        <rect x={-5} y={13} width={10} height={2} rx={1} fill={accentColor} opacity={0.45} />
        {/* Neck */}
        <rect x={-5} y={-4} width={10} height={6} rx={2} fill={headColor} />
        {/* Head */}
        <rect x={-14} y={-22} width={28} height={20} rx={5} fill={headColor} />
        {/* Eye sockets */}
        <rect x={-10} y={-18} width={8} height={6} rx={2} fill="rgba(0,0,0,0.5)" />
        <rect x={2}   y={-18} width={8} height={6} rx={2} fill="rgba(0,0,0,0.5)" />
        {/* Eye glow */}
        <rect x={-9} y={-17} width={6} height={4} rx={1} fill={eyeColor}
          style={{ animation: "eye-glow 2.2s ease-in-out infinite" }} />
        <rect x={3}  y={-17} width={6} height={4} rx={1} fill={eyeColor}
          style={{ animation: "eye-glow 2.2s ease-in-out infinite 0.3s" }} />
        {/* Antenna */}
        <line x1={0} y1={-22} x2={0} y2={-32} stroke={accentColor} strokeWidth={1.5} opacity={0.7} />
        <circle cx={0} cy={-34} r={3} fill={eyeColor}
          style={{ animation: "antenna-blink 3s ease-in-out infinite" }} />
        {[0, 1, 2].map((i) => (
          <ellipse
            key={i}
            cx={0}
            cy={-38 - i * 4}
            rx={9 - i * 2}
            ry={3.2 - i * 0.55}
            fill="none"
            stroke={eyeColor}
            strokeWidth={1.15 - i * 0.18}
            opacity={0.42 - i * 0.1}
            style={{ animation: "antenna-wave 2.4s ease-out infinite", animationDelay: `${i * 0.22}s` }}
          />
        ))}
        {/* Default arms (can be overridden via children) */}
        <rect x={-20} y={2} width={8} height={16} rx={3} fill={bodyColor} opacity={0.95} />
        <rect x={12}  y={2} width={8} height={16} rx={3} fill={bodyColor} opacity={0.95} />
        {children}
      </g>
    </g>
  );
}

// ─── Workbench ────────────────────────────────────────────────────────────────
function WorkTable({ c, r }: { c: number; r: number }) {
  return (
    <>
      <IsoBox c={c} r={r} cw={2} cd={1} ch={8}
        top="#2a3a5c" left="#1a2540" right="#222e4a" />
      <IsoBox c={c} r={r} cw={2} cd={1} ch={28}
        top="#34496e" left="#223058" right="#2c3e60" />
    </>
  );
}

// ─── Computer terminal ────────────────────────────────────────────────────────
function Terminal({
  c,
  r,
  screenColor = "#00ffcc",
  panicSequence = false,
}: {
  c: number;
  r: number;
  screenColor?: string;
  panicSequence?: boolean;
}) {
  const sx = ix(c, r) - 10;
  const sy = iy(c, r, 60);
  return (
    <>
      <IsoBox c={c} r={r} cw={1} cd={1} ch={6}  top="#1a2030" left="#111825" right="#161d2c" />
      <IsoBox c={c} r={r} cw={1} cd={1} ch={30} top="#1e2840" left="#121824" right="#1a2236" />
      <rect
        x={sx}
        y={sy}
        width={38}
        height={26}
        rx={3}
        fill="#060d1a"
        style={panicSequence ? { animation: "coder-terminal-bezel 24s linear infinite" } : undefined}
      />
      <rect
        x={sx + 3}
        y={sy + 3}
        width={32}
        height={20}
        rx={2}
        fill={screenColor}
        opacity={0.18}
        style={panicSequence ? { animation: "coder-terminal-screen 24s linear infinite" } : undefined}
      />
      {[0, 1, 2, 3].map(i => (
        <line
          key={i}
          x1={sx + 5}
          y1={sy + 6 + i * 4}
          x2={sx + 33}
          y2={sy + 6 + i * 4}
          stroke={screenColor}
          strokeWidth={1}
          opacity={0.5}
          style={panicSequence ? { animation: "coder-terminal-line 24s linear infinite" } : undefined}
        />
      ))}
    </>
  );
}

// ─── Robot A — Welder — grid (3,2), depth 5 ──────────────────────────────────
function RobotWelder() {
  const { c, r, scale } = ROBOT_POS.welder;
  const sx = ix(c, r);
  const sy = iy(c, r, 0);
  const sparkX = ix(c - 0, r - 0);
  const sparkY = iy(c - 0, r - 0, 36);
  return (
    <g>
      <IsoBox
        c={c}
        r={r}
        cw={1}
        cd={1}
        ch={20}
        top="#4e5d74"
        left="#273245"
        right="#324058"
        opacity={0.96}
      />
      <WorkTable c={c + 5} r={r + 1} />
      {[0, 1, 2, 3].map(i => (
        <circle key={i}
          cx={sparkX + (i % 2 === 0 ? -4 : 6)}
          cy={sparkY + (i < 2 ? -4 : 0)}
          r={1.1}
          fill={i % 2 === 0 ? "#ffe066" : "#ff9900"}
          style={{ animation: `spark-${i + 1} 0.45s ease-out infinite alternate`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
      <circle cx={sparkX} cy={sparkY - 14}
        r={5} fill="rgba(200,210,230,0.25)"
        style={{ animation: "smoke-rise 1.2s ease-out infinite" }} />
      <IsoBot sx={sx} sy={sy}
        bodyColor="#e8a020" headColor="#b87818" eyeColor="#ffe066" accentColor="#ffe066"
        animStyle={{ animation: "robot-bob 2.8s ease-in-out infinite" }}
        scale={scale}
        glowColor="rgba(255, 214, 102, 0.28)"
      >
        <g style={{ transformOrigin: "16px 4px", animation: "weld-arm 2.4s ease-in-out infinite" }}>
          <rect x={12} y={2} width={8} height={20} rx={3} fill="#b87818" />
          <rect x={16} y={20} width={4} height={10} rx={1} fill="#cccccc" />
          <circle cx={18} cy={32} r={3} fill="#ffe066" opacity={1}
            style={{ animation: "spark-1 0.3s ease-out infinite alternate" }} />
        </g>
      </IsoBot>
    </g>
  );
}

// ─── Robot B — Crane operator — grid (6,0), depth 6 ──────────────────────────
function RobotCrane({
  onClick,
  pulsing = false,
  onHover,
  onHoverEnd,
}: {
  onClick?: () => void;
  pulsing?: boolean;
  onHover?: () => void;
  onHoverEnd?: () => void;
}) {
  const { c, r, scale } = ROBOT_POS.crane;
  const sx = ix(c, r);       // 584
  const sy = iy(c, r, 0);    // 740
  const bx = sx - 55;        // 529 — horizontal position of chain/ball
  const chainTopY = sy - 92; // 648 — where crane arm meets chain
  const clickable = !!onClick;
  return (
    <g
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      style={{ cursor: clickable ? "pointer" : "default" }}
    >
      <IsoBox c={c} r={r + 0.1} cw={1.8} cd={1.8} ch={10} top="#304060" left="#1e2c40" right="#263450" opacity={1} />
      <IsoBox c={c} r={r + 0.1} cw={1.8} cd={1.8} ch={52} top="#20304a" left="#141e30" right="#1c2840" opacity={1} />
      {/* Crane arm */}
      <line x1={sx} y1={sy - 55} x2={bx} y2={chainTopY}
        stroke="#4a6a9a" strokeWidth={4} strokeLinecap="round" />
      {/* Scrap heap / robot pond at ball drop target */}
      <ellipse cx={bx} cy={sy + 15} rx={35} ry={15} fill="#222c16" />
      <rect x={bx - 16} y={sy + 2}  width={13} height={9} rx={2} fill="#3a4826" />
      <rect x={bx + 2}  y={sy + 4}  width={12} height={7} rx={2} fill="#30401e" />
      <rect x={bx - 7}  y={sy}      width={14} height={8} rx={2} fill="#465630" />
      <ellipse cx={bx - 11} cy={sy + 9}  rx={9} ry={4} fill="none" stroke="#4a583a" strokeWidth={2} />
      <ellipse cx={bx + 10} cy={sy + 7}  rx={7} ry={3} fill="none" stroke="#3c4c2c" strokeWidth={1.5} />
      {/* Chain — anchored at crane arm tip, stretches downward */}
      <g transform={`translate(${bx}, ${chainTopY})`}>
        <rect x={-1} y={0} width={2} height={50}
          fill="none" stroke="#4a6a9a" strokeWidth={2} strokeDasharray="4 4"
          strokeLinecap="round"
          style={{ animation: "crane-chain 9s ease-in-out infinite",
                   transformBox: "fill-box", transformOrigin: "center top" }} />
      </g>
      {/* Ball + fish — drop together, chain top stays fixed */}
      <g transform={`translate(${bx}, ${chainTopY + 52})`}>
        <g style={{ animation: "crane-ball 9s ease-in-out infinite" }}>
          <circle cx={0} cy={0} r={5} fill="#88aacc" />
          {/* Fish — hooked at bottom, rises with ball, then thrown into bucket */}
          <g style={{ animation: "crane-fish 9s ease-in-out infinite" }}>
            <ellipse cx={0} cy={-7} rx={9} ry={4.5} fill="#4888b0" />
            <polygon points="-9,-9 -17,-13 -17,-1" fill="#376888" />
            <circle cx={4} cy={-8} r={1.5} fill="rgba(255,255,255,0.85)" />
            <line x1={-9} y1={-9}  x2={-15} y2={-12} stroke="#376888" strokeWidth={1} />
            <line x1={-9} y1={-5}  x2={-15} y2={-2}  stroke="#376888" strokeWidth={1} />
          </g>
        </g>
      </g>
      {/* Bucket — between robot and scrap heap, on the platform */}
      <g transform={`translate(${sx - 18}, ${sy - 50})`}>
        {/* Body */}
        <polygon points="-12,0 12,0 9,22 -9,22" fill="#7a6030" />
        {/* Rim */}
        <ellipse cx={0} cy={0} rx={12} ry={5} fill="#9a7840" />
        {/* Water inside */}
        <ellipse cx={0} cy={18} rx={8} ry={3.5} fill="#2050a0" opacity={0.65} />
        {/* Handle */}
        <path d="M -9,-2 A 9,6 0 0,1 9,-2" fill="none" stroke="#8a7040" strokeWidth={2} strokeLinecap="round" />
        {/* Splash when fish lands */}
        <g style={{ animation: "crane-bucket-splash 9s ease-in-out infinite" }}>
          <ellipse cx={0} cy={11} rx={10} ry={4} fill="none" stroke="rgba(100,180,255,0.85)" strokeWidth={1.5} />
          <line x1={0}  y1={7} x2={0}  y2={2}  stroke="rgba(100,180,255,0.85)" strokeWidth={1.5} />
          <line x1={-4} y1={9} x2={-6} y2={4}  stroke="rgba(100,180,255,0.8)"  strokeWidth={1} />
          <line x1={4}  y1={9} x2={6}  y2={4}  stroke="rgba(100,180,255,0.8)"  strokeWidth={1} />
        </g>
      </g>
      <IsoBot sx={sx} sy={sy - 55}
        bodyColor="#60a0e0" headColor="#3070b8" eyeColor="#a0d8ff" accentColor="#a0d8ff"
        animStyle={{ animation: "robot-bob 4s ease-in-out infinite 1.2s" }}
        scale={scale}
        glowColor="rgba(160, 216, 255, 0.24)"
      />
      {/* Persistent subtle pulse when unlocked */}
      {clickable && (
        <circle cx={sx} cy={sy - 60} r={30}
          fill="none"
          stroke="rgba(96,160,224,0.5)"
          strokeWidth={2}
          style={{ animation: "unlock-pulse 2.2s ease-out infinite" }}
        />
      )}
      {/* 3-burst notification ring on first unlock */}
      <PulseRing cx={sx} cy={sy - 60} active={pulsing} color="#a0d8ff" />
    </g>
  );
}

// ─── Robot C — Inspector — grid (1,6), depth 7 ───────────────────────────────
function RobotInspector({ onClick, pulsing = false, onHover, onHoverEnd, secured = false }: {
  onClick?: () => void; pulsing?: boolean;
  onHover?: () => void; onHoverEnd?: () => void;
  secured?: boolean;
}) {
  const { c, r, scale } = ROBOT_POS.inspector;
  const sx = ix(c, r);
  const sy = iy(c, r, 0);
  const bg  = secured ? "rgba(4,20,14,0.95)"      : "rgba(6,16,38,0.95)";
  const brdr = secured ? "rgba(0,200,130,0.65)"   : "rgba(80,180,255,0.55)";
  const txt  = secured ? "#6de89a"                : "#9ec8f0";
  const dot  = secured ? "rgba(0,200,130,0.92)"   : "rgba(100,180,255,0.92)";
  return (
    <g
      onClick={onClick}
      onMouseEnter={onClick ? onHover : undefined}
      onMouseLeave={onClick ? onHoverEnd : undefined}
      style={{
        cursor: onClick ? "pointer" : "default",
        pointerEvents: onClick ? "auto" : "none",
      }}
    >
      <PulseRing cx={sx} cy={sy - 30} active={pulsing} color="#e080ff" />
      <IsoBox c={c - 0} r={r - 0} cw={2} cd={1.8} ch={20}
        top="#2a2040" left="#1a1428" right="#221832" opacity={1} />
      {/* Orbit walking wrapper */}
      <g style={{ animation: "inspector-walk 18s linear infinite" }}>
        <IsoBot sx={sx} sy={sy}
          bodyColor="#a040e0" headColor="#7028a8" eyeColor="#e080ff" accentColor="#e080ff"
          animStyle={{ animation: "robot-bob 3.6s ease-in-out infinite 0.9s" }}
          scale={scale}
          glowColor="rgba(224, 128, 255, 0.24)"
        >
          {/* Clipboard */}
          <rect x={-28} y={0} width={12} height={16} rx={2} fill="#f0e8d0" />
          <line x1={-26} y1={4}  x2={-18} y2={4}  stroke="#888" strokeWidth={1} />
          <line x1={-26} y1={7}  x2={-18} y2={7}  stroke="#888" strokeWidth={1} />
          <line x1={-26} y1={10} x2={-20} y2={10} stroke="#888" strokeWidth={1} />
          {/* Thought bubble — appears during walk pause */}
          <g style={{ animation: "inspector-thought 18s linear infinite" }}>
            {/* Dotted stem */}
            <circle cx={18} cy={-40} r={2.5} fill={dot} />
            <circle cx={25} cy={-51} r={3.5} fill={dot} />
            {/* Cloud */}
            <ellipse cx={42} cy={-68} rx={22} ry={13} fill={bg} stroke={brdr} strokeWidth="1" />
            <ellipse cx={28} cy={-72} rx={12} ry={8}  fill={bg} />
            <ellipse cx={54} cy={-72} rx={12} ry={8}  fill={bg} />
            <ellipse cx={42} cy={-79} rx={11} ry={7}  fill={bg} />
            <text x={28} y={-63} fontSize={13} fill={txt} fontWeight="bold">...</text>
          </g>
        </IsoBot>
      </g>
    </g>
  );
}

// ─── Robot D — Coder — grid (9,1), depth 10 ──────────────────────────────────
function RobotCoder({ repaired = false, onClick, pulsing = false, onHover, onHoverEnd }: {
  repaired?: boolean; onClick?: () => void; pulsing?: boolean;
  onHover?: () => void; onHoverEnd?: () => void;
}) {
  const { c, r, scale } = ROBOT_POS.coder;
  const sx = ix(c, r);
  const sy = iy(c, r, 0);
  return (
    <g
      onClick={repaired ? onClick : undefined}
      onMouseEnter={repaired && onClick ? onHover : undefined}
      onMouseLeave={repaired && onClick ? onHoverEnd : undefined}
      style={{
        cursor: repaired && onClick ? "pointer" : "default",
        pointerEvents: repaired && onClick ? "auto" : "none",
      }}
    >
      <PulseRing cx={sx} cy={sy - 30} active={pulsing} color="#80ffcc" />
      <Terminal c={c - 0} r={r - 0} screenColor="#00ffcc" panicSequence={!repaired} />
      <IsoBot sx={sx} sy={sy}
        bodyColor="#20c070" headColor="#158048" eyeColor="#80ffcc" accentColor="#80ffcc"
        animStyle={{ animation: "robot-bob 3.2s ease-in-out infinite 0.4s" }}
        scale={scale}
        glowColor="rgba(128, 255, 204, 0.22)"
      >
        <g style={repaired ? undefined : { transformOrigin: "-16px 4px", animation: "coder-panic-left-arm 24s linear infinite" }}>
          <rect x={-20} y={2} width={8} height={16} rx={3} fill="#158048" />
        </g>
        <g style={repaired ? undefined : { transformOrigin: "16px 4px", animation: "coder-panic-right-arm 24s linear infinite" }}>
          <rect x={12} y={2} width={8} height={16} rx={3} fill="#158048" />
        </g>
        {/* Head turns red during panic */}
        <rect
          x={-14}
          y={-22}
          width={28}
          height={20}
          rx={5}
          fill={repaired ? "#158048" : "#ff2200"}
          style={repaired ? undefined : { animation: "coder-head-heat 24s linear infinite" }}
        />
        {/* Smoke rises from overheating head — two staggered particles */}
        {!repaired && (
          <>
            <circle
              cx={-4}
              cy={-25}
              r={3.5}
              fill="rgba(210,210,210,0.8)"
              style={{ animation: "coder-head-smoke 24s linear infinite" }}
            />
            <circle
              cx={4}
              cy={-25}
              r={3}
              fill="rgba(210,210,210,0.7)"
              style={{ animation: "coder-head-smoke 24s linear infinite -1.4s" }}
            />
          </>
        )}
      </IsoBot>
    </g>
  );
}

// ─── Robot E — Victim — grid (4,8), depth 12 ─────────────────────────────────
function RobotVictim({ onClick, onHover, onHoverEnd, secured = false, shootingActive = true }: {
  onClick?: () => void; onHover?: () => void; onHoverEnd?: () => void;
  secured?: boolean;
  shootingActive?: boolean;
}) {
  const { c, r, scale } = ROBOT_POS.victim;
  const sx = ix(c, r);
  const sy = iy(c, r, 0);
  const bg   = secured ? "rgba(4,20,14,0.95)"    : "rgba(6,16,38,0.95)";
  const brdr = secured ? "rgba(0,200,130,0.65)"  : "rgba(80,180,255,0.55)";
  const txt  = secured ? "#6de89a"               : "#9ec8f0";
  return (
    <g
      onClick={onClick}
      onMouseEnter={onClick ? onHover : undefined}
      onMouseLeave={onClick ? onHoverEnd : undefined}
      style={{
        cursor: onClick ? "pointer" : "default",
        pointerEvents: onClick ? "auto" : "none",
      }}
    >
      <IsoBox c={c - 0} r={r+0.5} cw={1.8} cd={1.0} ch={24}
        top="#28380a" left="#182208" right="#20300a" opacity={1} />
      {/* Hit starburst — only when shooter is active */}
      {shootingActive && (
        <g transform={`translate(${sx},${sy - 10})`}>
          <g style={{ animation: "hit-flash 24s linear infinite", transformOrigin: "0 0" }}>
            {[0, 45, 90, 135].map(a => (
              <line key={a}
                x1={0} y1={0}
                x2={Math.cos(a * Math.PI / 180) * 18}
                y2={Math.sin(a * Math.PI / 180) * 18}
                stroke="#ffcc00" strokeWidth={3} strokeLinecap="round" />
            ))}
            <circle cx={0} cy={0} r={6} fill="#ff8800" />
          </g>
        </g>
      )}
      {/* Angry speech bubble — only when shooter is active */}
      {shootingActive && (
        <g transform={`translate(${sx - 40},${sy - 65})`}>
          <g style={{ animation: "speech-bubble-a 24s linear infinite", transformOrigin: "40px 65px" }}>
            <rect x={0} y={0} width={58} height={30} rx={8} fill={bg} stroke={brdr} strokeWidth="1.2" />
            <polygon points="20,30 30,30 23,42" fill={bg} />
            <text x={6} y={21} fontSize={14} fontWeight="bold" fill={txt}> &§%!!!</text>
          </g>
        </g>
      )}
      <IsoBot sx={sx} sy={sy}
        bodyColor="#70c030" headColor="#508020" eyeColor="#aaff44" accentColor="#aaff44"
        animStyle={shootingActive ? { animation: "robot-a-hit 24s linear infinite" } : {}}
        scale={scale}
        glowColor="rgba(170, 255, 68, 0.2)"
      />
    </g>
  );
}

// ─── Robot F — Shooter — grid (10,4), depth 14 ───────────────────────────────
function RobotShooter({
  onClick,
  onHover,
  onHoverEnd,
}: {
  onClick?: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
}) {
  const { c, r, scale } = ROBOT_POS.shooter;
  const sx = ix(c, r);
  const sy = iy(c, r, 0);
  // laser endpoints
  const lx1 = sx - 8;   const ly1 = sy + 12;
  const lx2 = ix(ROBOT_POS.victim.c, ROBOT_POS.victim.r) + 5;
  const ly2 = iy(ROBOT_POS.victim.c, ROBOT_POS.victim.r, 15);
  return (
    <g>
      {/* Platform — not clickable */}
      <g style={{ pointerEvents: "none" }}>
        <IsoBox c={c - 0} r={r - 0} cw={1.8} cd={1.8} ch={30}
          top="#3c1a1a" left="#281010" right="#321414" opacity={1} />
      </g>
      {/* Robot + laser — clickable */}
      <g
        onClick={onClick}
        onMouseEnter={onHover}
        onMouseLeave={onHoverEnd}
        style={{ cursor: onClick ? "pointer" : undefined }}
      >
        {/* Laser charge glow */}
        <circle cx={lx1} cy={ly1} r={3} fill="#16a3c6" opacity={1.0}
          style={{ animation: "laser-charge-glow 24s linear infinite" }} />
        {/* Laser beam */}
        <line x1={lx1} y1={ly1} x2={lx2} y2={ly2}
          stroke="#16a3c6" strokeWidth={3} strokeLinecap="round"
          style={{ animation: "laser-beam 24s linear infinite" }}
          filter={PERF_REDUCED ? undefined : "url(#laserGlow)"} />
        <IsoBot sx={sx} sy={sy}
          bodyColor="#e03020" headColor="#a82010" eyeColor="#ff6644" accentColor="#ff6644"
          animStyle={{ animation: "robot-b-victory 24s linear infinite" }}
          scale={scale}
          glowColor="rgba(255, 102, 68, 0.22)"
        >
          {/* Raised gun arm */}
          <g style={{ transformOrigin: "-16px 4px", animation: "laser-arm-raise 24s linear infinite" }}>
            <rect x={-20} y={2} width={8} height={20} rx={3} fill="#a82010" />
            <rect x={-26} y={18} width={16} height={5} rx={2} fill="#555" />
            <rect x={-28} y={19} width={4} height={3} rx={1} fill="#888" />
          </g>
        </IsoBot>
      </g>
    </g>
  );
}

// ─── Robot G — Grinder — grid (12,3), depth 15 ───────────────────────────────
function RobotGrinder({
  onClick,
  onHover,
  onHoverEnd,
}: {
  onClick?: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
}) {
  const { c, r, scale } = ROBOT_POS.grinder;
  const sx = ix(c, r);
  const sy = iy(c, r, 0);
  const clickable = !!onClick;
  return (
    <g
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      style={{ cursor: clickable ? "pointer" : "default" }}
    >
      <IsoBox c={c - 0} r={r - 0} cw={1.8} cd={1.8} ch={28}
        top="#1a3040" left="#101e28" right="#162634" opacity={1} />
      {/* Pulse ring when clickable */}
      {clickable && (
        <circle cx={sx} cy={sy - 10} r={28}
          fill="none"
          stroke="rgba(48,144,224,0.55)"
          strokeWidth={2}
          style={{ animation: "unlock-pulse 2.2s ease-out infinite" }}
        />
      )}
      <IsoBot sx={sx} sy={sy}
        bodyColor="#3090e0" headColor="#1a60b0" eyeColor="#88ddff" accentColor="#88ddff"
        animStyle={{ animation: "robot-bob 2.6s ease-in-out infinite 0.2s" }}
        scale={scale}
        glowColor="rgba(136, 221, 255, 0.22)"
      >
        {/* Arm — holds still at 0° during throw so disc flies straight up */}
        <g style={{ transformOrigin: "16px 4px", animation: "grinder-arm 14s linear infinite" }}>
          <rect x={12} y={2} width={8} height={18} rx={3} fill="#1a60b0" />
          {/* Disc + sparks — thrown upward during pause phase */}
          <g style={{ animation: "grinder-throw-disc 14s linear infinite" }}>
            <circle cx={20} cy={22} r={7} fill="none" stroke="#cccccc" strokeWidth={2.5}
              strokeDasharray="4 3"
              style={{ animation: "brush-spin var(--brush-spin-dur) linear infinite" }} />
            <circle cx={20} cy={22} r={3} fill="#aaaaaa" />
            {[0, 1].map(i => (
              <circle key={i}
                cx={22 + (i === 0 ? -4 : 6)} cy={18}
                r={1.5} fill="#ffe066"
                style={{ animation: `spark-${i + 1} 0.3s ease-out infinite alternate`, animationDelay: `${i * 0.08}s` }} />
            ))}
          </g>
        </g>
      </IsoBot>
    </g>
  );
}

// ─── Robot H — Laugher — grid (10,7), depth 17 ───────────────────────────────
function RobotLaugher({
  secured = false,
  onClick,
  pulsing = false,
  onHover,
  onHoverEnd,
  shootingActive = true,
}: {
  secured?: boolean;
  onClick?: () => void;
  pulsing?: boolean;
  onHover?: () => void;
  onHoverEnd?: () => void;
  shootingActive?: boolean;
}) {
  const { c, r, scale } = ROBOT_POS.laugher;
  const blockH = 28;
  const sx = ix(c, r);
  const sy = iy(c, r) - blockH;
  const bg   = secured ? "rgba(4,20,14,0.95)"    : "rgba(6,16,38,0.95)";
  const brdr = secured ? "rgba(0,200,130,0.65)"  : "rgba(80,180,255,0.55)";
  const txt  = secured ? "#6de89a"               : "#9ec8f0";
  const clickable = !!onClick;
  return (
    <g
      onClick={onClick}
      onMouseEnter={clickable ? onHover : undefined}
      onMouseLeave={clickable ? onHoverEnd : undefined}
      style={{ cursor: clickable ? "pointer" : "default", pointerEvents: clickable ? "auto" : "none" }}
    >
      {/* Platform block — stays on ground */}
      <IsoBox c={c - 0.6} r={r - 0.4} cw={1.5} cd={1.5} ch={blockH}
        top="#3a2810" left="#231808" right="#2e2010" opacity={1} />
      {/* Flying group — jetpack + robot + bubble move together */}
      <g style={{ animation: "laugher-fly 3.8s ease-in-out infinite" }}>
        {/* Jetpack rendered BEFORE robot so it appears behind */}
        <g transform={`translate(${sx},${sy}) scale(${scale})`}>
          <rect x={-17} y={-18} width={7} height={22} rx={3} fill="#585858" />
          <rect x={10}  y={-18} width={7} height={22} rx={3} fill="#585858" />
          <rect x={-10} y={-10} width={20} height={4} rx={2} fill="#444" />
          {/* Left flame */}
          <ellipse cx={-13} cy={8}  rx={4} ry={5} fill="#ff6600"
            style={{ animation: "jetpack-flame var(--jetpack-flame-dur) ease-in-out infinite" }} />
          <ellipse cx={-13} cy={11} rx={3} ry={4} fill="#ffdd00" opacity={0.85}
            style={{ animation: "jetpack-flame var(--jetpack-flame-dur-rev) ease-in-out infinite reverse" }} />
          {/* Right flame */}
          <ellipse cx={13} cy={8}  rx={4} ry={5} fill="#ff6600"
            style={{ animation: "jetpack-flame var(--jetpack-flame-dur) ease-in-out infinite 0.06s" }} />
          <ellipse cx={13} cy={11} rx={3} ry={4} fill="#ffdd00" opacity={0.85}
            style={{ animation: "jetpack-flame var(--jetpack-flame-dur-rev) ease-in-out infinite reverse 0.06s" }} />
        </g>
        {/* Laugh bubble — only when shooter is active (victim is being shot) */}
        {shootingActive && (
          <g transform={`translate(${sx - 50},${sy - 68})`}>
            <g style={{ animation: "laugh-bubble-b 24s linear infinite", transformOrigin: "50px 68px" }}>
              <rect x={0} y={0} width={62} height={30} rx={8} fill={bg} stroke={brdr} strokeWidth="1.2" />
              <polygon points="28,30 40,30 32,42" fill={bg} />
              <text x={6} y={21} fontSize={13} fontWeight="bold" fill={txt}> HAHAH!</text>
            </g>
          </g>
        )}
        {/* Robot */}
        <IsoBot sx={sx} sy={sy}
          bodyColor="#ff8c20" headColor="#cc6010" eyeColor="#ffcc44" accentColor="#ffcc44"
          animStyle={{}}
          scale={scale}
          glowColor="rgba(255, 204, 68, 0.22)"
        />
      </g>
      {/* Persistent subtle pulse when unlocked */}
      {clickable && (
        <circle cx={sx} cy={sy - 50} r={30}
          fill="none"
          stroke="rgba(255,160,60,0.5)"
          strokeWidth={2}
          style={{ animation: "unlock-pulse 2.2s ease-out infinite" }}
        />
      )}
      {/* 3-burst notification ring on first unlock */}
      <PulseRing cx={sx} cy={sy - 50} active={pulsing} color="#ffcc44" />
    </g>
  );
}
// ─── Roomba vacuum robot — wanders the floor ─────────────────────────────────
function RobotRoomba({ secured = false }: { secured?: boolean }) {
  const [bubble, setBubble] = useState<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const sx = ix(5, 6);
  const sy = iy(5, 6);

  useEffect(() => {
    if (!secured) return;

    const CHARS = "!§$%&?#@*+~<>{}[]^°";

    // R2D2-style: a short melodic sequence of 3-7 rapid varied-pitch tones
    const playR2D2 = () => {
      try {
        if (!audioRef.current) audioRef.current = new AudioContext();
        const ctx = audioRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const numTones = 3 + Math.floor(Math.random() * 5);
        const baseFreq = 700 + Math.random() * 900; // 700–1600 Hz base
        let t = ctx.currentTime;
        for (let i = 0; i < numTones; i++) {
          const freq = Math.max(400, baseFreq * (0.45 + Math.random() * 1.3));
          const dur = 0.04 + Math.random() * 0.09;
          const gap = 0.008 + Math.random() * 0.055;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = i % 3 === 0 ? "sine" : "square";
          osc.frequency.setValueAtTime(freq, t);
          // tiny glide for expressiveness
          osc.frequency.exponentialRampToValueAtTime(freq * (0.85 + Math.random() * 0.4), t + dur);
          gain.gain.setValueAtTime(0.055, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
          osc.start(t);
          osc.stop(t + dur);
          t += dur + gap;
        }
      } catch { /* audio unavailable */ }
    };

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const schedule = () => {
      const delay = 2200 + Math.random() * 4000;
      const t = setTimeout(() => {
        const len = 3 + Math.floor(Math.random() * 4);
        const text = Array.from({ length: len }, () =>
          CHARS[Math.floor(Math.random() * CHARS.length)],
        ).join("");
        setBubble(text);
        playR2D2();
        const hide = setTimeout(() => {
          setBubble(null);
          schedule();
        }, 1300 + Math.random() * 1100);
        timeouts.push(hide);
      }, delay);
      timeouts.push(t);
    };

    schedule();
    return () => { timeouts.forEach(clearTimeout); };
  }, [secured]);

  return (
    <g style={{ animation: "roomba-path 38s linear infinite" }}>
      {/* Speech bubble — rendered first so it appears behind other elements logically */}
      {bubble && (
        <g style={{ animation: "bubble-pop 0.22s ease-out forwards" }}>
          <rect x={sx - 36} y={sy - 64} width={72} height={26} rx={8}
            fill="rgba(8, 20, 10, 0.94)"
            stroke="rgba(34, 197, 94, 0.6)"
            strokeWidth={1.2}
          />
          <polygon
            points={`${sx - 7},${sy - 38} ${sx + 7},${sy - 38} ${sx},${sy - 29}`}
            fill="rgba(8, 20, 10, 0.94)"
          />
          <text x={sx} y={sy - 47}
            textAnchor="middle"
            fontSize={13}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="700"
            fill="#4ade80"
          >
            {bubble}
          </text>
        </g>
      )}
      {/* Shadow */}
      <ellipse cx={sx} cy={sy + 2} rx={30} ry={14} fill="rgba(0,0,0,0.26)" />
      {/* Body disc — isometric ellipse */}
      <ellipse cx={sx} cy={sy - 4} rx={28} ry={13} fill="#3c3c3c" />
      {/* Top surface */}
      <ellipse cx={sx} cy={sy - 6} rx={25} ry={11} fill="#525252" />
      {/* Inner ring (dirt bin boundary) */}
      <ellipse cx={sx} cy={sy - 6} rx={14} ry={6} fill="none" stroke="#2c2c2c" strokeWidth={1.5} />
      {/* Bump sensor arc (front) */}
      <path
        d={`M ${sx - 20},${sy - 2} A 28,13 0 0,1 ${sx + 24},${sy - 5}`}
        fill="none" stroke="#686868" strokeWidth={3} strokeLinecap="round"
      />
      {/* Status LED — turns cyan when secured */}
      <circle cx={sx + 16} cy={sy - 9} r={2.5}
        fill={secured ? "#00ccff" : "#4ade80"}
        style={{ animation: "roomba-led 3.5s ease-in-out infinite" }} />
      {/* Side brush — spinning */}
      <g transform={`translate(${sx - 27},${sy - 4})`}>
        <g style={{ animation: "brush-spin var(--brush-spin-dur-roomba) linear infinite", transformBox: "fill-box", transformOrigin: "center" }}>
          <line x1={-5} y1={0} x2={5} y2={0} stroke="#999" strokeWidth={1.5} />
          <line x1={0} y1={-5} x2={0} y2={5} stroke="#999" strokeWidth={1.5} />
          <line x1={-3.5} y1={-3.5} x2={3.5} y2={3.5} stroke="#999" strokeWidth={1.2} />
          <line x1={3.5} y1={-3.5} x2={-3.5} y2={3.5} stroke="#999" strokeWidth={1.2} />
          <circle cx={0} cy={0} r={2} fill="#888" />
        </g>
      </g>
    </g>
  );
}

// ─── Energy pillar decoration ─────────────────────────────────────────────────
function EnergyPillar({ c, r, onClick, pulsing = false, onHover, onHoverEnd }: {
  c: number; r: number; onClick?: () => void; pulsing?: boolean;
  onHover?: () => void; onHoverEnd?: () => void;
}) {
  const sx = ix(c, r);
  const sy = iy(c, r, 0);
  const interactive = !!onClick;
  return (
    <g
      onClick={onClick}
      onMouseEnter={interactive ? onHover : undefined}
      onMouseLeave={interactive ? onHoverEnd : undefined}
      style={{ cursor: interactive ? "pointer" : "default", pointerEvents: interactive ? "auto" : "none" }}
    >
      <IsoBox c={c} r={r} cw={1} cd={1} ch={80}
        top="#1a3050" left="#0e1e32" right="#12243c" />
      <ellipse cx={sx} cy={sy - 80} rx={14} ry={6}
        fill="none" stroke="#00aaff" strokeWidth={2} opacity={1}
        style={{ animation: "antenna-blink 1.5s ease-in-out infinite" }} />
      {/* Antenna pole */}
      <line x1={sx} y1={sy - 80} x2={sx} y2={sy - 96}
        stroke="#00aaff" strokeWidth={1.5} opacity={0.7} />
      {/* Signal source dot */}
      <circle cx={sx} cy={sy - 97} r={3} fill="#00ccff"
        style={{ animation: "antenna-blink 0.9s ease-in-out infinite" }} />
      {/* WiFi-style arcs — cascade from inner to outer */}
      {[8, 16, 24].map((radius, i) => (
        <path
          key={i}
          d={`M ${sx - radius},${sy - 97} A ${radius},${Math.round(radius * 0.55)} 0 0,0 ${sx + radius},${sy - 97}`}
          fill="none"
          stroke="#00aaff"
          strokeWidth={2.4 - i * 0.5}
          strokeLinecap="round"
          style={{
            animation: "wifi-pulse 1.8s ease-out infinite",
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
      {/* Transparent hit area so clicks register on the full antenna region */}
      {interactive && (
        <ellipse cx={sx} cy={sy - 90} rx={34} ry={28} fill="transparent" />
      )}
      <PulseRing cx={sx} cy={sy - 97} active={pulsing} color="#00ccff" />
    </g>
  );
}

// ─── Security shield overlay (appears after WLAN puzzle solved) ───────────────
// Covers the two back walls — parallelograms that rise from the floor upward.
// Left wall:  IsoWallLeft  c=0..13, r=0,   h=110
// Right wall: IsoWallRight c=0,     r=0..13, h=110
function SecurityShield() {
  // Left wall: IsoWallLeft c=0..13 r=0 h=110
  //   BL=ix(0,1),iy(0,1)  BR=ix(13,1),iy(13,1)  TR=ix(13,0),iy(13,0)-110  TL=ix(0,0),iy(0,0)-110
  const leftPts  = "728,236 1664,704 1736,558 800,90";
  // Right wall: exact mirror of leftPts around x=800  (x' = 1600-x)
  //   BL=ix(1,0),iy(1,0)  BR=ix(1,13),iy(1,13)  TR=ix(0,13),iy(0,13)-110  TL=ix(0,0),iy(0,0)-110
  const rightPts = "872,236 -64,704 -136,558 800,90";

  const rise = (delay: number): React.CSSProperties => ({
    transformBox: "fill-box" as React.CSSProperties["transformBox"],
    transformOrigin: "50% 100%",
    animation: `shield-rise 2.6s cubic-bezier(0.22,1,0.36,1) ${delay}s both, shield-wall-pulse 3.5s ${2.6 + delay}s ease-in-out infinite`,
  });

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* Left wall — main solid fill */}
      <polygon points={leftPts}
        fill="rgba(0,185,255,0.22)"
        stroke="rgba(0,220,255,0.70)"
        strokeWidth="1.8"
        style={rise(0)}
      />
      {/* Left wall — inner tint layer for depth */}
      <polygon points={leftPts}
        fill="rgba(0,160,255,0.08)"
        style={rise(0.12)}
      />

      {/* Right wall — main solid fill */}
      <polygon points={rightPts}
        fill="rgba(0,185,255,0.22)"
        stroke="rgba(0,220,255,0.70)"
        strokeWidth="1.8"
        style={rise(0.3)}
      />
      {/* Right wall — inner tint layer */}
      <polygon points={rightPts}
        fill="rgba(0,160,255,0.08)"
        style={rise(0.42)}
      />

      {/* Glowing top-edge ridge — left */}
      <line x1={800} y1={90} x2={1736} y2={558}
        stroke="rgba(0,235,255,0.80)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="16 8"
        style={{
          transformBox: "fill-box" as React.CSSProperties["transformBox"],
          transformOrigin: "50% 100%",
          animation: "shield-rise 2.4s cubic-bezier(0.22,1,0.36,1) 0.4s both, shield-wall-pulse 4s 3s ease-in-out infinite",
        }}
      />
      {/* Glowing top-edge ridge — right */}
      <line x1={800} y1={90} x2={-136} y2={558}
        stroke="rgba(0,235,255,0.80)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="16 8"
        style={{
          transformBox: "fill-box" as React.CSSProperties["transformBox"],
          transformOrigin: "50% 100%",
          animation: "shield-rise 2.4s cubic-bezier(0.22,1,0.36,1) 0.7s both, shield-wall-pulse 4s 3.3s ease-in-out infinite",
        }}
      />
      {/* Corner beacon where both walls meet at the top-back */}
      <circle cx={800} cy={90} r={4.5}
        fill="#00ccff"
        style={{
          animation: "shield-in 1.6s ease-out 2s forwards, antenna-blink 2s 3.6s ease-in-out infinite",
          opacity: 0,
        }}
      />
    </g>
  );
}

// ─── Scrap Pile — appears after Greifarm minispiel is solved ─────────────────
// Positioned on the right side floor (c=11, r=5) — under the right card area
// pairsGrabbed: 0=all visible, 1=layer1 gone, 2=layer1+2 gone, 3=all gone (empty)
function ScrapPile({ pairsGrabbed = 0 }: { pairsGrabbed?: number }) {
  // ix(11,5) = 800 + (11-5)*72 = 1232 ;  iy(11,5) = 200 + 16*36 = 776
  const px = ix(9, 5);
  const py = iy(7.5, 5);

  // Hide entire pile when all 3 pairs are grabbed
  if (pairsGrabbed >= 3) return null;

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ originX: px, originY: py }}
      transition={{ duration: 0.9, ease: [0.2, 0.8, 0.4, 1] }}
    >
      {/* Persistent pulse rings around the pile */}
      {pairsGrabbed === 0 && <>
        <circle cx={px} cy={py - 28} r={72}
          fill="none"
          stroke="rgba(255,150,50,0.50)"
          strokeWidth={2.5}
          style={{ animation: "unlock-pulse 2.6s ease-out infinite" }}
        />
        <circle cx={px} cy={py - 28} r={72}
          fill="none"
          stroke="rgba(80,200,255,0.38)"
          strokeWidth={1.8}
          style={{ animation: "unlock-pulse 2.6s ease-out infinite", animationDelay: "0.9s" }}
        />
      </>}

      {/* Ground shadow */}
      <ellipse cx={px} cy={py + 18} rx={84} ry={32} fill="rgba(0,0,0,0)" />

      {/* Base platform */}
      <ellipse cx={px} cy={py + 6}  rx={75} ry={29} fill="#1e1e2a" />
      <ellipse cx={px} cy={py + 3}  rx={70} ry={26} fill="#282830" />

      {/* Layer 1 — large pieces (orange plate + yellow rod) — grabbed as pair 1 */}
      {pairsGrabbed < 1 && <>
        <rect x={px - 61} y={py - 6}  width={55} height={19} rx={4} fill="#e07030"
          transform={`rotate(-5, ${px - 33}, ${py + 3})`} />
        <rect x={px - 61} y={py - 6}  width={55} height={19} rx={4} fill="none"
          stroke="#f09050" strokeWidth={1} opacity={0.6}
          transform={`rotate(-5, ${px - 33}, ${py + 3})`} />
        <rect x={px - 17} y={py - 9}  width={67} height={16} rx={4} fill="#d4c240"
          transform={`rotate(4, ${px + 16}, ${py - 2})`} />
        <rect x={px - 17} y={py - 9}  width={67} height={16} rx={4} fill="none"
          stroke="#f0de70" strokeWidth={0.9} opacity={0.55}
          transform={`rotate(4, ${px + 16}, ${py - 2})`} />
      </>}

      {/* Layer 2 — angled pieces (cyan + purple) — grabbed as pair 2 */}
      {pairsGrabbed < 2 && <>
        <rect x={px - 44} y={py - 20} width={38} height={15} rx={3} fill="#28bce0"
          transform={`rotate(-10, ${px - 25}, ${py - 13})`} />
        <rect x={px - 44} y={py - 20} width={38} height={15} rx={3} fill="none"
          stroke="#74e0ff" strokeWidth={0.9} opacity={0.5}
          transform={`rotate(-10, ${px - 25}, ${py - 13})`} />
        <rect x={px - 3}  y={py - 23} width={55} height={13} rx={3} fill="#b060e0"
          transform={`rotate(7, ${px + 25}, ${py - 17})`} />
        <rect x={px - 3}  y={py - 23} width={55} height={13} rx={3} fill="none"
          stroke="#d8a0ff" strokeWidth={0.9} opacity={0.5}
          transform={`rotate(7, ${px + 25}, ${py - 17})`} />
      </>}

      {/* Layer 3 — small top pieces — grabbed as pair 3 */}
      {pairsGrabbed < 3 && <>
        <ellipse cx={px - 26} cy={py - 33} rx={13} ry={7} fill="#28bce0" />
        <ellipse cx={px - 26} cy={py - 33} rx={13} ry={7} fill="none"
          stroke="#74e0ff" strokeWidth={1} opacity={0.6} />
        <ellipse cx={px - 26} cy={py - 33} rx={6}  ry={3} fill="#0870a8" />
        <rect x={px + 6}   y={py - 38} width={26} height={9}  rx={3} fill="#e07030"
          transform={`rotate(12, ${px + 19}, ${py - 34})`} />
        <ellipse cx={px + 32} cy={py - 30} rx={10} ry={6} fill="#b060e0" />
        <ellipse cx={px + 32} cy={py - 30} rx={4.5} ry={2.5} fill="#581898" />
        <rect x={px - 12} y={py - 41} width={17} height={7}  rx={2} fill="#d4c240"
          transform={`rotate(-8, ${px - 3}, ${py - 38})`} />
      </>}

      {/* Highlight glints — only when pile has content */}
      {pairsGrabbed < 2 && <>
        <line x1={px - 15} y1={py - 9}  x2={px + 26} y2={py - 9}
          stroke="#ffe0a0" strokeWidth={1} opacity={0.35} />
        <line x1={px - 41} y1={py - 20} x2={px - 9}  y2={py - 20}
          stroke="#a0e8ff" strokeWidth={0.9} opacity={0.3} />
        <ellipse cx={px + 9} cy={py - 35} rx={7} ry={3}
          fill="rgba(220,240,255,0.15)" />
      </>}
    </motion.g>
  );
}

// ─── Main scene ───────────────────────────────────────────────────────────────
interface RobotSceneProps {
  onVictimClick?: () => void;
  onInspectorClick?: () => void;
  onCoderClick?: () => void;
  onWifiClick?: () => void;
  onGrinderClick?: () => void;
  onCraneClick?: () => void;
  onLaugherClick?: () => void;
  onShooterClick?: () => void;
  coderRepaired?: boolean;
  sha256Solved?: boolean;
  wifiSolved?: boolean;
  flugbahnSolved?: boolean;
  scrapSorted?: boolean;
  laserSolved?: boolean;
  forcedDialogPhase?: number | null;
  hideLaugher?: boolean;
  hideShooter?: boolean;
  ufoActive?: boolean;
  dialogPaused?: boolean;
  scrapPairsGrabbed?: number;
}

export default function RobotScene({
  onVictimClick,
  onInspectorClick,
  onCoderClick,
  onWifiClick,
  onGrinderClick,
  onCraneClick,
  onLaugherClick,
  onShooterClick,
  coderRepaired = false,
  sha256Solved = false,
  wifiSolved = false,
  flugbahnSolved = false,
  scrapSorted = false,
  laserSolved = false,
  forcedDialogPhase,
  hideLaugher = false,
  hideShooter = false,
  ufoActive = false,
  dialogPaused = false,
  scrapPairsGrabbed = 0,
}: RobotSceneProps) {
  // Welcome dialog: 0=hidden, 1=welcome, 2=have fun, 3=world secured
  const [dialogPhase, setDialogPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setDialogPhase(1), 200);
    const t2 = setTimeout(() => setDialogPhase(2), 7200);
    const t3 = setTimeout(() => setDialogPhase(0), 14200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Secured dialog: overrides normal dialog after wifiSolved
  useEffect(() => {
    if (!wifiSolved) return;
    const t1 = setTimeout(() => setDialogPhase(3), 600);
    const t2 = setTimeout(() => setDialogPhase(0), 9000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [wifiSolved]);

  // Pulse ring: lights up coder when it first becomes clickable
  const [pulseCoder, setPulseCoder] = useState(false);
  useEffect(() => {
    if (!coderRepaired) return;
    const t1 = setTimeout(() => setPulseCoder(true), 0);
    const t2 = setTimeout(() => setPulseCoder(false), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [coderRepaired]);

  // Pulse ring: lights up wifi pillar when sha256 is solved
  const [pulseWifi, setPulseWifi] = useState(false);
  useEffect(() => {
    if (!sha256Solved) return;
    const t1 = setTimeout(() => setPulseWifi(true), 0);
    const t2 = setTimeout(() => setPulseWifi(false), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [sha256Solved]);

  // Pulse ring: lights up crane when flugbahn is solved
  const [pulseCrane, setPulseCrane] = useState(false);
  useEffect(() => {
    if (!flugbahnSolved) return;
    const t1 = setTimeout(() => setPulseCrane(true), 0);
    const t2 = setTimeout(() => setPulseCrane(false), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [flugbahnSolved]);

  // Pulse ring: lights up laugher when laser calibration is solved
  const [pulseLaugher, setPulseLaugher] = useState(false);
  useEffect(() => {
    if (!laserSolved) return;
    const t1 = setTimeout(() => setPulseLaugher(true), 0);
    const t2 = setTimeout(() => setPulseLaugher(false), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [laserSolved]);

  // Allow DevPanel to override the dialog phase
  // Pause dialogs when Laughter is away from home position
  const activeDialogPhase = dialogPaused ? 0 : (forcedDialogPhase ?? dialogPhase);

  // Centralised hover label — rendered last in SVG so it's always on top
  const [hoverLabel, setHoverLabel] = useState<{ text: string; x: number; y: number } | null>(null);

  // Stable coordinate lookups (used for callback closures)
  const inspectorSx = ix(ROBOT_POS.inspector.c, ROBOT_POS.inspector.r);
  const inspectorSy = iy(ROBOT_POS.inspector.c, ROBOT_POS.inspector.r, 0);
  const coderSx = ix(ROBOT_POS.coder.c, ROBOT_POS.coder.r);
  const coderSy = iy(ROBOT_POS.coder.c, ROBOT_POS.coder.r, 0);
  const victimSx = ix(ROBOT_POS.victim.c, ROBOT_POS.victim.r);
  const victimSy = iy(ROBOT_POS.victim.c, ROBOT_POS.victim.r, 0);
  const pillarSx = ix(0, 2);
  const pillarSy = iy(0, 2, 0);
  const grinderSx = ix(ROBOT_POS.grinder.c, ROBOT_POS.grinder.r);
  const grinderSy = iy(ROBOT_POS.grinder.c, ROBOT_POS.grinder.r, 0);
  const shooterSx = ix(ROBOT_POS.shooter.c, ROBOT_POS.shooter.r);
  const shooterSy = iy(ROBOT_POS.shooter.c, ROBOT_POS.shooter.r, 0);
  const craneSx = ix(ROBOT_POS.crane.c, ROBOT_POS.crane.r);
  const craneSy = iy(ROBOT_POS.crane.c, ROBOT_POS.crane.r, 0);
  const laugherSx = ix(ROBOT_POS.laugher.c, ROBOT_POS.laugher.r);
  const laugherSy = iy(ROBOT_POS.laugher.c, ROBOT_POS.laugher.r, 0);

  const clearHover = () => setHoverLabel(null);

  // Yellow welder robot screen position for dialog placement
  const welderSx = ix(ROBOT_POS.welder.c, ROBOT_POS.welder.r); // 800
  const welderSy = iy(ROBOT_POS.welder.c, ROBOT_POS.welder.r, 0); // 142

  // Build floor tiles sorted by depth (c+r ascending = back to front)
  const floorTiles: [number, number, string][] = [];
  for (let c = 0; c <= 13; c++) {
    for (let r = 0; r <= 11; r++) {
      const depth = (c + r) / 24;
      const alpha = 0.28 + depth * 0.18;
      const isAccent = (c + r) % 4 === 0;
      floorTiles.push([
        c, r,
        isAccent
          ? `rgba(50,80,130,${alpha})`
          : `rgba(28,42,72,${alpha})`,
      ]);
    }
  }
  floorTiles.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", touchAction: PERF_REDUCED ? "pan-x" : "auto" }}
      aria-hidden="true"
    >
      <defs>
        <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="dialogBubbleShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>

      {/* Back walls */}
      {Array.from({ length: 14 }, (_, c) => (
        <IsoWallLeft key={`wl${c}`} c={c} r={0} h={110} />
      ))}
      {Array.from({ length: 14 }, (_, r) => (
        <IsoWallRight key={`wr${r}`} c={0} r={r} h={110} />
      ))}

      {/* Neon strip along top of back walls */}
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`ns${i}`}
          x1={ix(i, 0)} y1={iy(i, 0) - 110}
          x2={ix(i + 1, 0)} y2={iy(i + 1, 0) - 110}
          stroke="rgba(0,200,255,0.5)" strokeWidth={0} />
      ))}

      {/* Security shield — after back walls, before floor, so it sits ON the walls */}
      {wifiSolved && <SecurityShield />}

      {/* Floor */}
      {floorTiles.map(([c, r, fill]) => (
        <IsoTile key={`t${c}_${r}`} c={c} r={r} fill={fill} />
      ))}

      {/* Roomba — floor level, behind robots */}
      <RobotRoomba secured={wifiSolved} />

      {/* Energy pillars (depth 2 and 13 — render early) */}
      <EnergyPillar c={0} r={2}
        onClick={sha256Solved ? onWifiClick : undefined}
        pulsing={pulseWifi}
        onHover={() => setHoverLabel({ text: "WLAN-SECURITY-LAB", x: pillarSx, y: pillarSy - 120 })}
        onHoverEnd={clearHover}
      />
      <EnergyPillar c={13} r={0} />

      {/*
        Robots rendered back-to-front (ascending c+r):
          RobotWelder     (3,2)  depth  5
          RobotCrane      (6,0)  depth  6
          RobotInspector  (1,6)  depth  7
          RobotCoder      (9,1)  depth 10
          RobotVictim     (4,8)  depth 12
          RobotShooter    (10,4) depth 14
          RobotGrinder    (12,3) depth 15
          RobotLaugher    (10,7) depth 17
      */}
      <RobotWelder />
      <RobotCrane
        onClick={onCraneClick}
        pulsing={pulseCrane}
        onHover={onCraneClick ? () => setHoverLabel({ text: "SORTIERANLAGE", x: craneSx, y: craneSy - 130 }) : undefined}
        onHoverEnd={clearHover}
      />
      <RobotInspector onClick={onInspectorClick}
        pulsing={false}
        secured={wifiSolved}
        onHover={() => setHoverLabel({ text: "SCHALTKREIS-LAB", x: inspectorSx, y: inspectorSy - 75 })}
        onHoverEnd={clearHover}
      />
      <RobotCoder repaired={coderRepaired} onClick={onCoderClick} pulsing={pulseCoder}
        onHover={coderRepaired ? () => setHoverLabel({ text: "SHA-256 LAB", x: coderSx, y: coderSy - 75 }) : undefined}
        onHoverEnd={clearHover}
      />
      <RobotVictim onClick={onVictimClick}
        secured={wifiSolved}
        shootingActive={!ufoActive}
        onHover={() => setHoverLabel({ text: "LASER-KALIBRIERUNG", x: victimSx, y: victimSy - 75 })}
        onHoverEnd={clearHover}
      />
      {!hideShooter && <RobotShooter
        onClick={onShooterClick}
        onHover={() => setHoverLabel({ text: "CHEAT-SUITE", x: shooterSx, y: shooterSy - 75 })}
        onHoverEnd={clearHover}
      />}
      {/* Platform stub when Shooter is hidden (flying to UFO) */}
      {hideShooter && (
        <IsoBox c={ROBOT_POS.shooter.c} r={ROBOT_POS.shooter.r} cw={1.8} cd={1.8} ch={30}
          top="#3c1a1a" left="#281010" right="#321414" opacity={1} />
      )}
      <RobotGrinder
        onClick={onGrinderClick}
        onHover={onGrinderClick ? () => setHoverLabel({ text: "ABWURF-KALIBRIERUNG", x: grinderSx, y: grinderSy - 75 }) : undefined}
        onHoverEnd={clearHover}
      />
      {scrapSorted && <ScrapPile pairsGrabbed={scrapPairsGrabbed} />}
      {!hideLaugher && <RobotLaugher
        secured={wifiSolved}
        onClick={laserSolved ? onLaugherClick : undefined}
        pulsing={pulseLaugher}
        shootingActive={!ufoActive}
        onHover={laserSolved && onLaugherClick ? () => setHoverLabel({ text: "FERTIGUNGSMODUL", x: laugherSx, y: laugherSy - 90 }) : undefined}
        onHoverEnd={clearHover}
      />}
      {/* Platform stub when Laughter is hidden (flying to weld zone) */}
      {hideLaugher && (
        <IsoBox c={ROBOT_POS.laugher.c - 0.6} r={ROBOT_POS.laugher.r - 0.4} cw={1.5} cd={1.5} ch={28}
          top="#3a2810" left="#231808" right="#2e2010" opacity={1} />
      )}

      {/* ── Robot dialogs — dark themed, right side of welder ── */}
      {activeDialogPhase === 1 && (
        <g style={{ animation: "dialog-fade 7s ease forwards" }} filter={PERF_REDUCED ? undefined : "url(#dialogBubbleShadow)"}>
          {/* bg: 186w × 46h, fits 2 lines */}
          <rect x={welderSx + 20} y={welderSy - 14} width={186} height={46} rx={9}
            fill="rgba(6,16,38,0.95)"
            stroke="rgba(80,180,255,0.55)"
            strokeWidth="1.3" />
          <polygon
            points={`${welderSx + 20},${welderSy + 2} ${welderSx + 8},${welderSy + 10} ${welderSx + 20},${welderSy + 18}`}
            fill="rgba(6,16,38,0.95)"
          />
          <text x={welderSx + 32} y={welderSy + 5}
            fontSize={12} fill="#9ec8f0" fontFamily="Inter, sans-serif" fontWeight="700">
            Herzlichen Willkommen
          </text>
          <text x={welderSx + 32} y={welderSy + 22}
            fontSize={12} fill="#9ec8f0" fontFamily="Inter, sans-serif" fontWeight="700">
            in meinem Portfolio!
          </text>
        </g>
      )}
      {activeDialogPhase === 2 && (
        <g style={{ animation: "dialog-fade 7s ease forwards" }} filter={PERF_REDUCED ? undefined : "url(#dialogBubbleShadow)"}>
          {/* bg: 198w × 30h, fits 1 line */}
          <rect x={welderSx + 20} y={welderSy - 14} width={198} height={30} rx={9}
            fill="rgba(6,16,38,0.95)"
            stroke="rgba(80,180,255,0.55)"
            strokeWidth="1.3" />
          <polygon
            points={`${welderSx + 20},${welderSy - 2} ${welderSx + 8},${welderSy + 6} ${welderSx + 20},${welderSy + 14}`}
            fill="rgba(6,16,38,0.95)"
          />
          <text x={welderSx + 32} y={welderSy + 5}
            fontSize={12} fill="#9ec8f0" fontFamily="Inter, sans-serif" fontWeight="700">
            Viel Spaß beim Erkunden!
          </text>
        </g>
      )}
      {/* Hover label — always on top of everything */}
      {hoverLabel && (
        <SceneLabel x={hoverLabel.x} y={hoverLabel.y} text={hoverLabel.text} />
      )}

      {/* Phase 3: world secured — same position as welcome dialog, green accent */}
      {activeDialogPhase === 3 && (
        <g style={{ animation: "dialog-fade 8.4s ease forwards" }} filter={PERF_REDUCED ? undefined : "url(#dialogBubbleShadow)"}>
          {/* bg: 204w × 62h, fits 3 lines */}
          <rect x={welderSx + 20} y={welderSy - 14} width={204} height={62} rx={9}
            fill="rgba(4,20,14,0.95)"
            stroke="rgba(0,200,130,0.60)"
            strokeWidth="1.3" />
          <polygon
            points={`${welderSx + 20},${welderSy + 2} ${welderSx + 8},${welderSy + 10} ${welderSx + 20},${welderSy + 18}`}
            fill="rgba(4,20,14,0.95)"
          />
          <text x={welderSx + 32} y={welderSy + 5}
            fontSize={12} fill="#6de89a" fontFamily="Inter, sans-serif" fontWeight="700">
            Herzlichen Glückwunsch –
          </text>
          <text x={welderSx + 32} y={welderSy + 22}
            fontSize={12} fill="#6de89a" fontFamily="Inter, sans-serif" fontWeight="700">
            unser Netz wurde
          </text>
          <text x={welderSx + 32} y={welderSy + 39}
            fontSize={12} fill="#6de89a" fontFamily="Inter, sans-serif" fontWeight="700">
            erfolgreich abgesichert!
          </text>
        </g>
      )}
    </svg>
  );
}
