// ─── Assembly Sequence — visual overlay (two layers) ─────────────────────────
//
// AssemblyRearLayer  → renders behind RobotScene (UFO when far/small)
// AssemblyFrontLayer → renders in front of RobotScene  (arms, parts, weld, UFO)
//
// Both use the identical SVG viewBox "0 0 1600 900" / xMidYMid slice as
// RobotScene, so all coordinates map 1-to-1.
//
// Rendering is driven by AssemblyTick from the cycle state machine.
// Each of the 9 cycle steps produces distinct arm poses and part positions.

import React, { useMemo } from "react";
import "./assembly.css";
import type { AssemblyTick, CycleStep, CycleContext, ScrapPartDef } from "./types";
import { CYCLE_PLAN, STEP_ORDER } from "./types";

// ─── Scene constants ────────────────────────────────────────────────────────
const PX = 1088;                // scrap pile center X
const PY = 650;                 // scrap pile center Y
const WX = 1040;                // work/weld zone X
const WY = 600;                 // work/weld zone Y (above pile)
const LX = 260;                 // Laughter home X
const LY = 442;                 // Laughter home Y
const RX = 894;                 // Red/Shooter home X
const RY = 751;                 // Red/Shooter home Y
const UFO_SPAWN_X = 1083;      // Weld convergence point X (where UFO first appears)
const UFO_SPAWN_Y = 630;       // Weld convergence point Y

const LAUGHTER_REAL_SCALE = 1.14;   // ROBOT_POS.laugher.scale
const RED_REAL_SCALE = 1.18;        // ROBOT_POS.shooter.scale
const LAUGHTER_WORK_SCALE = 0.8;    // Scale while working in zone
const RED_UFO_SCALE = 0.5;          // Scale when boarding UFO

const PERF_REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 900px)").matches;

// ─── Shared SVG style ───────────────────────────────────────────────────────
const SVG_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  overflow: "visible",
};

// ─── SVG defs ───────────────────────────────────────────────────────────────
function AsmDefs() {
  return (
    <defs>
      <filter id="asm-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="9" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }

// ─── Articulated Robot Arm ──────────────────────────────────────────────────
interface ArmConfig {
  baseX: number; baseY: number;
  side: 1 | -1;                   // 1 = left arm, -1 = right arm
  seg1Len: number; seg2Len: number;
}

const ARM_CONFIGS: ArmConfig[] = [
  { baseX: PX - 140, baseY: PY + 20, side: 1,  seg1Len: 70, seg2Len: 55 },  // left arm
  { baseX: PX + 130, baseY: PY + 14, side: -1, seg1Len: 70, seg2Len: 55 },  // right arm
];

interface ArmPose {
  baseAngle: number;   // degrees, rotation at shoulder
  seg1Angle: number;   // degrees, rotation at elbow relative to seg1
  seg2Angle: number;   // degrees, rotation at wrist relative to seg2
  gripOpen: number;    // 0 = closed, 1 = fully open
  buildT: number;      // 0..1 build progress (1 = fully built)
}

const GRIP_LEN = 16;
const BASE_H = 16;

// ─── Forward kinematics: compute gripper tip world position ─────────────────
function getGripperTipWorld(config: ArmConfig, pose: ArmPose): { x: number; y: number } {
  const { baseX, baseY, seg1Len, seg2Len } = config;
  const toRad = Math.PI / 180;
  const jx = baseX;
  const jy = baseY - BASE_H;

  const a0 = pose.baseAngle * toRad;
  const s1x = jx + Math.sin(a0) * seg1Len;
  const s1y = jy - Math.cos(a0) * seg1Len;

  const a1 = (pose.baseAngle + pose.seg1Angle) * toRad;
  const s2x = s1x + Math.sin(a1) * seg2Len;
  const s2y = s1y - Math.cos(a1) * seg2Len;

  const a2 = (pose.baseAngle + pose.seg1Angle + pose.seg2Angle) * toRad;
  const tx = s2x + Math.sin(a2) * GRIP_LEN;
  const ty = s2y - Math.cos(a2) * GRIP_LEN;

  return { x: tx, y: ty };
}

// ─── 2-link IK solver ───────────────────────────────────────────────────────
// Solves for arm angles that place the gripper tip at (targetX, targetY).
// Treats the arm as two links: seg1 and (seg2 + gripLen).
function solveArmIK(
  config: ArmConfig,
  targetX: number,
  targetY: number,
  elbowSign: number = 1,  // +1 = elbow bends one way, -1 = other
): ArmPose {
  const { baseX, baseY, seg1Len, seg2Len } = config;
  const jx = baseX;
  const jy = baseY - BASE_H;

  const l1 = seg1Len;
  const l2 = seg2Len + GRIP_LEN;

  const dx = targetX - jx;
  const dy = -(targetY - jy);  // flip y for math (up = positive)

  const dist = Math.sqrt(dx * dx + dy * dy);

  // If target is beyond reach, stretch toward it
  if (dist >= l1 + l2 - 1) {
    const angle = Math.atan2(dx, dy) * (180 / Math.PI);
    return { baseAngle: angle, seg1Angle: 0, seg2Angle: 0, gripOpen: 1, buildT: 1 };
  }

  // Standard 2-link IK
  const cosQ2 = (dist * dist - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const clampedCos = Math.max(-1, Math.min(1, cosQ2));
  const q2 = Math.acos(clampedCos) * elbowSign;

  const alpha = Math.atan2(dx, dy);
  const beta = Math.atan2(l2 * Math.sin(q2), l1 + l2 * Math.cos(q2));
  const q1 = alpha - beta;

  return {
    baseAngle: q1 * (180 / Math.PI),
    seg1Angle: q2 * (180 / Math.PI),
    seg2Angle: 0,
    gripOpen: 1,
    buildT: 1,
  };
}

// ─── Canonical arm poses ────────────────────────────────────────────────────
function getArmRestPose(side: 1 | -1): ArmPose {
  return {
    baseAngle: side === 1 ? -45 : 45,
    seg1Angle: -50 * side,
    seg2Angle: -35 * side,
    gripOpen: 0.3,
    buildT: 1,
  };
}

function lerpPose(a: ArmPose, b: ArmPose, t: number): ArmPose {
  const et = easeInOut(clamp01(t));
  return {
    baseAngle: lerp(a.baseAngle, b.baseAngle, et),
    seg1Angle: lerp(a.seg1Angle, b.seg1Angle, et),
    seg2Angle: lerp(a.seg2Angle, b.seg2Angle, et),
    gripOpen:  lerp(a.gripOpen,  b.gripOpen,  et),
    buildT:    lerp(a.buildT,    b.buildT,    et),
  };
}

// ─── Step-aware arm pose computation ────────────────────────────────────────
function computeArmPoseForStep(
  step: CycleStep,
  phaseT: number,
  config: ArmConfig,
  ctx: CycleContext,
): ArmPose {
  const side = config.side;
  const isLeft = side === 1;
  const rest = getArmRestPose(side);

  // Target position for this arm
  const target = isLeft ? ctx.leftTarget : ctx.rightTarget;
  // Elbow bends outward from pile center
  const elbowSign = isLeft ? 1 : -1;
  const reachPose = { ...solveArmIK(config, target.x, target.y, elbowSign), gripOpen: 1 };

  // Lift pose: same angles but shifted upward by reducing baseAngle toward vertical
  const liftTarget = { x: lerp(target.x, WX, 0.15), y: target.y - 50 };
  const liftPose = { ...solveArmIK(config, liftTarget.x, liftTarget.y, elbowSign), gripOpen: 0 };

  // Converge pose: IK-target both grippers to weld zone so they actually meet.
  // The weld point must be reachable by both arms (max reach ~140px each).
  const WELD_X = 1083, WELD_Y = 630;
  const convergeOffset = isLeft ? -6 : 6;
  const convergePose = { ...solveArmIK(config, WELD_X + convergeOffset, WELD_Y, elbowSign), gripOpen: 0 };

  // Is this the carry arm?
  const isCarryArm = (ctx.carryArm === "left" && isLeft) || (ctx.carryArm === "right" && !isLeft);

  // Deposit target for carry arm
  const depositPose = isCarryArm
    ? { ...solveArmIK(config, ctx.depositPos.x, ctx.depositPos.y, elbowSign), gripOpen: 0 }
    : rest;

  switch (step) {
    case "reach_parts":
      return lerpPose(rest, reachPose, phaseT);

    case "pick_parts":
      // Close gripper on the piece
      return lerpPose(reachPose, { ...reachPose, gripOpen: 0 }, phaseT);

    case "lift_parts":
      // Lift straight up
      return lerpPose({ ...reachPose, gripOpen: 0 }, liftPose, phaseT);

    case "converge_parts":
      // Move inward to weld position — arms bring parts together at weld zone
      return lerpPose(liftPose, convergePose, phaseT);

    case "weld_parts":
      // Hold still during welding
      return convergePose;

    case "transfer_to_single":
      if (isCarryArm) {
        return convergePose;  // keep holding
      }
      // Release arm: open gripper and pull back
      return lerpPose(convergePose, { ...rest, gripOpen: 1 }, phaseT);

    case "carry_out":
      if (isCarryArm) {
        return lerpPose(convergePose, depositPose, phaseT);
      }
      return rest;

    case "deposit_part":
      if (isCarryArm) {
        // Open gripper to release
        return lerpPose(depositPose, { ...depositPose, gripOpen: 1 }, phaseT);
      }
      return rest;

    case "return_arms":
      if (isCarryArm) {
        return lerpPose({ ...depositPose, gripOpen: 1 }, rest, phaseT);
      }
      return rest;

    default:
      return rest;
  }
}

// ─── Robot Arm SVG ──────────────────────────────────────────────────────────
function RobotArm({ config, pose }: { config: ArmConfig; pose: ArmPose }) {
  const { baseX, baseY, seg1Len, seg2Len } = config;
  const { baseAngle, seg1Angle, seg2Angle, gripOpen, buildT } = pose;

  const baseW = 30, segW = 10;
  const gripW = 6;
  const gripGap = lerp(2, 10, gripOpen);

  const seg1Visible = buildT > 0.15;
  const seg2Visible = buildT > 0.5;
  const gripVisible = buildT > 0.8;
  const seg1Scale = clamp01((buildT - 0.15) / 0.35);
  const seg2Scale = clamp01((buildT - 0.5) / 0.3);
  const gripScale = clamp01((buildT - 0.8) / 0.2);

  return (
    <g transform={`translate(${baseX},${baseY})`}>
      {/* Base block */}
      <rect x={-baseW / 2} y={-BASE_H} width={baseW} height={BASE_H}
        fill="#3a4050" rx="3" style={{ opacity: clamp01(buildT * 4) }} />
      <rect x={-baseW / 2} y={-BASE_H} width={baseW} height={4}
        fill="rgba(255,255,255,0.08)" rx="2" style={{ opacity: clamp01(buildT * 4) }} />
      <circle cx={-10} cy={-BASE_H / 2} r="2" fill="#555" style={{ opacity: clamp01(buildT * 4) }} />
      <circle cx={10}  cy={-BASE_H / 2} r="2" fill="#555" style={{ opacity: clamp01(buildT * 4) }} />
      <rect x={-baseW / 2 + 2} y={-4} width={baseW - 4} height={3}
        fill="#cc8820" rx="1" style={{ opacity: clamp01(buildT * 4) * 0.6 }} />

      {/* Shoulder joint → seg1 → elbow → seg2 → wrist → gripper */}
      <g transform={`translate(0,${-BASE_H}) rotate(${baseAngle})`}>
        <circle r="7" fill="#4a5060" style={{ opacity: clamp01(buildT * 3) }} />
        <circle r="4" fill="#555" style={{ opacity: clamp01(buildT * 3) }} />

        {seg1Visible && (
          <g style={{ transformOrigin: "0 0", transform: `scaleY(${seg1Scale})` }}>
            <rect x={-segW / 2} y={-seg1Len} width={segW} height={seg1Len} fill="#3a4050" rx="2" />
            <rect x={-segW / 2} y={-seg1Len} width={3} height={seg1Len} fill="rgba(255,255,255,0.07)" rx="1" />
            <line x1={segW / 2 - 2} y1={0} x2={segW / 2 - 2} y2={-seg1Len + 4}
              stroke="rgba(100,120,140,0.5)" strokeWidth="1.5" />

            <g transform={`translate(0,${-seg1Len}) rotate(${seg1Angle})`}>
              <circle r="5" fill="#4a5060" />
              <circle r="2.5" fill="#555" />

              {seg2Visible && (
                <g style={{ transformOrigin: "0 0", transform: `scaleY(${seg2Scale})` }}>
                  <rect x={-segW / 2 + 1} y={-seg2Len} width={segW - 2} height={seg2Len} fill="#4a5568" rx="2" />
                  <rect x={-segW / 2 + 1} y={-seg2Len} width={2.5} height={seg2Len} fill="rgba(255,255,255,0.06)" rx="1" />

                  <g transform={`translate(0,${-seg2Len}) rotate(${seg2Angle})`}>
                    <circle r="4" fill="#4a5060" />

                    {gripVisible && (
                      <g style={{ opacity: gripScale }}>
                        <rect x={-4} y={-8} width={8} height={8} fill="#505868" rx="2" />
                        <rect x={-gripGap - gripW / 2} y={-GRIP_LEN - 4} width={gripW} height={GRIP_LEN} fill="#5a6472" rx="1" />
                        <rect x={gripGap - gripW / 2} y={-GRIP_LEN - 4} width={gripW} height={GRIP_LEN} fill="#5a6472" rx="1" />
                        <rect x={-gripGap - gripW / 2} y={-GRIP_LEN - 4} width={gripW} height={3} fill="#ff8c20" rx="1" opacity="0.7" />
                        <rect x={gripGap - gripW / 2} y={-GRIP_LEN - 4} width={gripW} height={3} fill="#ff8c20" rx="1" opacity="0.7" />
                      </g>
                    )}
                  </g>
                </g>
              )}
            </g>
          </g>
        )}
      </g>

      {/* Status LED */}
      <circle cx={baseW / 2 - 4} cy={-BASE_H + 4} r="2.5"
        fill={gripOpen < 0.3 ? "#44cc44" : "#ff8c20"}
        style={{ opacity: clamp01(buildT * 4) }} />
    </g>
  );
}

// ─── Find source cycle for a target position (Stage 2 picks up deposits) ────
function findSourceCycle(target: { x: number; y: number }): CycleContext | null {
  for (const ctx of CYCLE_PLAN) {
    if (ctx.depositPos.x === target.x && ctx.depositPos.y === target.y) {
      return ctx;
    }
  }
  return null;
}

// ─── Recursively collect all leaf ScrapPartDefs that went into a cycle ───────
function collectAllParts(ctx: CycleContext): ScrapPartDef[] {
  const leftSource = findSourceCycle(ctx.leftTarget);
  const rightSource = findSourceCycle(ctx.rightTarget);
  const leftParts = leftSource ? collectAllParts(leftSource) : [ctx.leftPartDef];
  const rightParts = rightSource ? collectAllParts(rightSource) : [ctx.rightPartDef];
  return [...leftParts, ...rightParts];
}

// ─── Render a multi-color welded part at a given position ────────────────────
function WeldedPartShape({ x, y, parts, opacity = 0.9 }: {
  x: number; y: number;
  parts: ScrapPartDef[];
  opacity?: number;
}) {
  if (parts.length === 0) return null;
  const n = parts.length;
  const maxW = Math.max(...parts.map(p => p.w));
  const maxH = Math.max(...parts.map(p => p.h));
  const totalW = maxW * 0.35 * n;
  const totalH = maxH * 1.6;
  const segW = totalW / n;

  return (
    <g>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <rect
            x={x - totalW / 2 + i * segW}
            y={y - totalH / 2}
            width={segW + 1}
            height={totalH}
            fill={part.color}
            rx={3}
            opacity={opacity - i * 0.01}
          />
          {i > 0 && (
            <line
              x1={x - totalW / 2 + i * segW}
              y1={y - totalH / 2}
              x2={x - totalW / 2 + i * segW}
              y2={y + totalH / 2}
              stroke="rgba(255,160,40,0.6)"
              strokeWidth="1.5"
            />
          )}
        </React.Fragment>
      ))}
    </g>
  );
}

// ─── Part attached to gripper (renders as sub-assembly if from a deposit) ────
function AttachedPart({ config, pose, part, sourceCycle }: {
  config: ArmConfig; pose: ArmPose; part: ScrapPartDef; sourceCycle?: CycleContext | null;
}) {
  const tip = getGripperTipWorld(config, pose);
  if (sourceCycle) {
    const parts = collectAllParts(sourceCycle);
    return <WeldedPartShape x={tip.x} y={tip.y} parts={parts} />;
  }
  return (
    <rect x={tip.x - part.w / 2} y={tip.y - part.h / 2}
      width={part.w} height={part.h}
      fill={part.color} rx="3"
      stroke={part.stroke} strokeWidth="0.8" opacity="0.9" />
  );
}

// ─── Combined welded part (after transfer_to_single) ────────────────────────
function CombinedPart({ config, pose, ctx }: {
  config: ArmConfig; pose: ArmPose; ctx: CycleContext;
}) {
  const tip = getGripperTipWorld(config, pose);
  const parts = collectAllParts(ctx);
  return <WeldedPartShape x={tip.x} y={tip.y} parts={parts} />;
}

// ─── Deposited sub-assemblies ───────────────────────────────────────────────
interface DepositedAssembly {
  pos: { x: number; y: number };
  parts: ScrapPartDef[];
}

function getDeposits(tick: AssemblyTick): DepositedAssembly[] {
  const deposits: DepositedAssembly[] = [];
  const { phase, cycleIndex, cycleStep, phaseT } = tick;

  // Build list of completed cycle deposits that aren't yet consumed by later cycles
  for (let ci = 0; ci < CYCLE_PLAN.length; ci++) {
    const ctx = CYCLE_PLAN[ci];

    // Skip last cycle — it becomes the UFO, no deposit
    if (ci === CYCLE_PLAN.length - 1) continue;

    // Is this cycle fully complete (deposit done)?
    let cycleComplete = false;
    if (phase === "cycle") {
      if (ci < cycleIndex) cycleComplete = true;
      if (ci === cycleIndex && cycleStep === "return_arms") cycleComplete = true;
      // Also show deposit once gripper opens during deposit_part
      if (ci === cycleIndex && cycleStep === "deposit_part" && phaseT > 0.5) cycleComplete = true;
    } else if (phase !== "idle" && phase !== "arms_build" && phase !== "holding" && phase !== "laughter_fly_in") {
      // After all cycles
      cycleComplete = true;
    }

    if (!cycleComplete) continue;

    // Is this deposit consumed by a later cycle picking it up?
    // Only mark consumed once the later cycle has visually picked the part
    // (i.e. past the pick_parts step, when the gripper has closed on it).
    let consumed = false;
    for (let later = ci + 1; later < CYCLE_PLAN.length; later++) {
      const laterCtx = CYCLE_PLAN[later];
      // Check if this deposit position matches a later cycle's left or right target
      const isLeftSource = laterCtx.leftTarget.x === ctx.depositPos.x && laterCtx.leftTarget.y === ctx.depositPos.y;
      const isRightSource = laterCtx.rightTarget.x === ctx.depositPos.x && laterCtx.rightTarget.y === ctx.depositPos.y;
      if (isLeftSource || isRightSource) {
        if (phase === "cycle" && cycleIndex > later) {
          // Later cycle is fully past — consumed
          consumed = true;
        } else if (phase === "cycle" && cycleIndex === later) {
          // We're in the consuming cycle — only consumed once gripper has picked it
          const stepIdx = STEP_ORDER.indexOf(cycleStep!);
          const pickIdx = STEP_ORDER.indexOf("pick_parts");
          if (stepIdx > pickIdx || (stepIdx === pickIdx && phaseT > 0.3)) {
            consumed = true;
          }
        } else if (phase !== "cycle" && phase !== "idle" && phase !== "arms_build" && phase !== "holding" && phase !== "laughter_fly_in") {
          consumed = true;
        }
      }
    }

    if (!consumed) {
      deposits.push({
        pos: ctx.depositPos,
        parts: collectAllParts(ctx),
      });
    }
  }
  return deposits;
}

function DepositedParts({ deposits }: { deposits: DepositedAssembly[] }) {
  if (deposits.length === 0) return null;
  return (
    <g>
      {deposits.map((d, i) => (
        <WeldedPartShape key={i} x={d.pos.x} y={d.pos.y}
          parts={d.parts} opacity={0.9} />
      ))}
    </g>
  );
}

// ─── Welding effect ─────────────────────────────────────────────────────────
const SPARKS: Array<{ anim: string; dur: string; delay: string; color: string }> = [
  { anim: "asm-sp1", dur: "0.72s", delay: "0s",    color: "#ffe070" },
  { anim: "asm-sp2", dur: "0.88s", delay: "0.18s", color: "#ff9020" },
  { anim: "asm-sp3", dur: "0.65s", delay: "0.34s", color: "#ffe070" },
  { anim: "asm-sp4", dur: "0.80s", delay: "0.52s", color: "#ff9020" },
  { anim: "asm-sp5", dur: "0.70s", delay: "0.08s", color: "#fffaaa" },
  { anim: "asm-sp6", dur: "0.92s", delay: "0.44s", color: "#ff9020" },
];

function WeldEffect({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="38" fill="rgba(255,220,80,0.0)" filter="url(#asm-glow)"
        style={{ animation: "asm-weld-glow 0.40s ease-in-out infinite" }} />
      <circle cx={x} cy={y} r="24" fill="rgba(255,200,50,0.52)"
        style={{ animation: "asm-weld-glow 0.40s ease-in-out infinite 0.20s" }} />
      <circle cx={x} cy={y} r="11" fill="rgba(255,255,255,0.90)"
        style={{ animation: "asm-weld-glow 0.28s ease-in-out infinite" }} />
      {SPARKS.map((s, i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={s.color}
          style={{ animation: `${s.anim} ${s.dur} ease-out ${s.delay} infinite` }} />
      ))}
    </g>
  );
}

// ─── Laughter robot proxy ───────────────────────────────────────────────────
function LaughterProxy({ x, y, scale = 0.85 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x={-17} y={-18} width={7} height={22} rx={3} fill="#585858" />
      <rect x={10}  y={-18} width={7} height={22} rx={3} fill="#585858" />
      <rect x={-10} y={-10} width={20} height={4} rx={2} fill="#444" />
      <ellipse cx={-13} cy={8} rx={3} ry={4} fill="#ff6600"
        style={{ animation: "asm-thruster 0.18s ease-in-out infinite" }} />
      <ellipse cx={13}  cy={8} rx={3} ry={4} fill="#ff6600"
        style={{ animation: "asm-thruster 0.18s ease-in-out infinite 0.09s" }} />
      <circle r="10" fill="#ff8c20" />
      <rect x="-7" y="-28" width="14" height="11" fill="#cc6010" rx="3" />
      <rect x="-5" y="-24" width="4" height="2" fill="#ffcc44" rx="1" />
      <rect x=" 1" y="-24" width="4" height="2" fill="#ffcc44" rx="1" />
    </g>
  );
}

// ─── Red (Shooter) robot proxy ──────────────────────────────────────────────
function RedProxy({ x, y, scale = 0.85 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x={-14} y={-14} width={6} height={18} rx={3} fill="#555" />
      <rect x={8}   y={-14} width={6} height={18} rx={3} fill="#555" />
      <ellipse cx={-11} cy={8} rx={3} ry={4} fill="#ff4400"
        style={{ animation: "asm-thruster 0.18s ease-in-out infinite" }} />
      <ellipse cx={11}  cy={8} rx={3} ry={4} fill="#ff4400"
        style={{ animation: "asm-thruster 0.18s ease-in-out infinite 0.09s" }} />
      <circle r="10" fill="#e03020" />
      <rect x="-7" y="-28" width="14" height="11" fill="#a82010" rx="3" />
      <rect x="-5" y="-24" width="4" height="2" fill="#ff6644" rx="1" />
      <rect x=" 1" y="-24" width="4" height="2" fill="#ff6644" rx="1" />
      <rect x={-20} y={-4} width={8} height={16} rx={3} fill="#a82010" />
      <rect x={-26} y={8} width={16} height={5} rx={2} fill="#555" />
      <rect x={-28} y={9} width={4} height={3} rx={1} fill="#888" />
    </g>
  );
}

// ─── Compute Laughter position ──────────────────────────────────────────────
interface LaughterPosResult {
  x: number; y: number; scale: number; visible: boolean;
}

function getLaughterPos(tick: AssemblyTick): LaughterPosResult {
  const { phase, phaseT, elapsed, cycleStep } = tick;

  // Hover above the actual arm convergence / weld point — matches WELD_X/Y in getArmPoseForStep
  const WELD_HX = UFO_SPAWN_X - 20;   // 1063 — slight offset from weld center
  const WELD_HY = UFO_SPAWN_Y - 50;   // 580 — hover above

  if (phase === "laughter_fly_in") {
    const et = easeInOut(phaseT);
    return {
      x: lerp(LX, WELD_HX, et),
      y: lerp(LY, WELD_HY, et),
      scale: lerp(LAUGHTER_REAL_SCALE, LAUGHTER_WORK_SCALE, et),
      visible: true,
    };
  }

  if (phase === "cycle") {
    // During weld_parts: wide elliptical orbit so the robot visibly circles the weld point.
    // During other steps: tight hover in place.
    // Both use the same elapsed-based angle → no position jump at step boundary.
    const isWelding = cycleStep === "weld_parts";
    const angle = elapsed * 2.2;        // ~1 full orbit every ~2.9 s
    const rx = isWelding ? 32 : 8;     // orbit radius X
    const ry = isWelding ? 20 : 5;     // orbit radius Y
    return {
      x: WELD_HX + Math.cos(angle) * rx,
      y: WELD_HY + Math.sin(angle) * ry,
      scale: LAUGHTER_WORK_SCALE,
      visible: true,
    };
  }

  if (phase === "laughter_fly_out") {
    const et = easeInOut(phaseT);
    return {
      x: lerp(WELD_HX, LX, et),
      y: lerp(WELD_HY, LY, et),
      scale: lerp(LAUGHTER_WORK_SCALE, LAUGHTER_REAL_SCALE, et),
      visible: true,
    };
  }

  return { x: LX, y: LY, scale: LAUGHTER_REAL_SCALE, visible: false };
}

// ─── Holding indicator ──────────────────────────────────────────────────────
function HoldingIndicator() {
  return (
    <g>
      <circle cx={WX} cy={WY - 60} r="30" fill="none"
        stroke="rgba(255,180,40,0.5)" strokeWidth="2" strokeDasharray="6,4"
        style={{ animation: "asm-hold-pulse 2s ease-in-out infinite" }} />
      <text x={WX} y={WY - 80} textAnchor="middle"
        fill="rgba(255,200,80,0.7)" fontSize="11" fontFamily="monospace"
        style={{ animation: "asm-hold-pulse 2s ease-in-out infinite" }}>
        ⚙ WARTE AUF SCHWEISSAUFGABE
      </text>
    </g>
  );
}

// ─── UFO shape (scrap-built flying saucer — larger, no flames, Red in cockpit)
function UfoShape({ showPilot = false }: { showPilot?: boolean }) {
  return (
    <g>
      {/* Shadow / underside */}
      <ellipse cx="0" cy="7" rx="66" ry="20" fill="#3a3530" />
      {/* Main saucer body — multi-colored panels */}
      <ellipse cx="0" cy="0" rx="70" ry="22" fill="#e07030" />
      <path d="M-70,0 A70,22 0 0,1 -25,-20 L-25,0 Z" fill="#e07030" />
      <path d="M-25,-20 A70,22 0 0,1 15,-22 L15,0 L-25,0 Z" fill="#28bce0" />
      <path d="M15,-22 A70,22 0 0,1 50,-12 L50,0 L15,0 Z" fill="#d4c240" />
      <path d="M50,-12 A70,22 0 0,1 70,0 L50,0 Z" fill="#b060e0" />
      <path d="M-70,0 A70,22 0 0,0 -12,22 L-12,0 Z" fill="#e07030" opacity="0.8" />
      <path d="M-12,22 A70,22 0 0,0 70,0 L-12,0 Z" fill="#d4c240" opacity="0.8" />
      {/* Outline */}
      <ellipse cx="0" cy="0" rx="70" ry="22" fill="none"
        stroke="rgba(255,140,20,0.5)" strokeWidth="1.5" />
      <ellipse cx="0" cy="0" rx="45" ry="15" fill="none"
        stroke="rgba(255,140,20,0.25)" strokeWidth="1" />
      {/* Cockpit dome */}
      <ellipse cx="0" cy="-10" rx="22" ry="16" fill="rgba(80,160,255,0.12)" />
      <ellipse cx="0" cy="-12" rx="16" ry="12" fill="rgba(40,80,120,0.55)" />
      <ellipse cx="0" cy="-14" rx="10" ry="7" fill="rgba(80,160,255,0.20)" />
      {/* Red robot head visible in cockpit — only after boarding */}
      {showPilot && <circle cx="0" cy="-12" r="6" fill="#e03020" />}
      {showPilot && <rect x="-4" y="-20" width="8" height="6" fill="#a82010" rx="2" />}
      {showPilot && <rect x="-3" y="-18" width="2.5" height="1.5" fill="#ff6644" rx="0.5" />}
      {showPilot && <rect x="0.5" y="-18" width="2.5" height="1.5" fill="#ff6644" rx="0.5" />}
    </g>
  );
}

// ─── UFO flight path (seamless upper-screen patrol loop) ────────────────────
// During red_fly_in the UFO departs from the weld zone to the patrol start.
// Once "flying" begins, getUfoPose is called with a looping phaseT (0→1 repeat).
// The patrol starts and ends at x=1300 so every iteration is seamless — no jump.
// Scaling: base 0.85, +35% when near screen center (x ≈ 800).
const PATROL_Y = 140;          // cruising altitude
const PATROL_START_X = 1300;   // patrol starts and ends here
const PATROL_START_Y = PATROL_Y;

function getUfoPose(phaseT: number): {
  x: number; y: number; scale: number; facingLeft: boolean;
} {
  const t = phaseT;

  // ── Patrol leg 1: right → left at constant altitude ──
  if (t < 0.50) {
    const eu = easeInOut(t / 0.50);
    const x = lerp(PATROL_START_X, 200, eu);
    const centerDist = Math.abs(x - 800) / 800;
    const scale = 0.85 * (1 + 0.35 * (1 - centerDist));
    return { x, y: PATROL_Y, scale, facingLeft: false };
  }

  // ── Brief turnaround pause at left edge ──
  if (t < 0.55) {
    const x = 200 + easeInOut((t - 0.50) / 0.05) * 50;
    const scale = 0.85 * (1 + 0.35 * (1 - Math.abs(x - 800) / 800));
    return { x, y: PATROL_Y, scale, facingLeft: false };
  }

  // ── Patrol leg 2: left → right at constant altitude ──
  const eu = easeInOut((t - 0.55) / 0.45);
  const x = lerp(250, PATROL_START_X, eu);
  const centerDist = Math.abs(x - 800) / 800;
  const scale = 0.85 * (1 + 0.35 * (1 - centerDist));
  return { x, y: PATROL_Y, scale, facingLeft: false };
}

// ─── Laser shots ────────────────────────────────────────────────────────────
interface LaserShot {
  endX: number; endY: number;
  startT: number; duration: number;
}

function useLaserShots(phaseT: number, ufoX: number, ufoY: number): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const shots = useMemo(() => {
    const result: LaserShot[] = [];
    // Random shots into the upper third only — no victim targeting
    const times = [0.05, 0.14, 0.24, 0.35, 0.46, 0.55, 0.64, 0.74, 0.84, 0.93];
    for (const st of times) {
      const seed = st * 7919;
      result.push({
        endX: 100 + ((seed * 13) % 1400),
        endY: 30 + ((seed * 31) % 240),
        startT: st,
        duration: 0.025,
      });
    }
    return result;
  }, []);

  return shots
    .filter(s => phaseT >= s.startT && phaseT < s.startT + s.duration)
    .map(s => ({ x1: ufoX, y1: ufoY + 10, x2: s.endX, y2: s.endY }));
}

// ─── Determine which parts are visibly attached to grippers ─────────────────
function getAttachedPartsInfo(tick: AssemblyTick): {
  showLeft: boolean;
  showRight: boolean;
  showCombined: boolean;    // show as combined piece on carry arm
  carryIsLeft: boolean;
} {
  const { phase, cycleStep, cycleCtx } = tick;
  if (phase !== "cycle" || !cycleStep || !cycleCtx) {
    return { showLeft: false, showRight: false, showCombined: false, carryIsLeft: false };
  }

  const carryIsLeft = cycleCtx.carryArm === "left";

  // Last cycle: after welding, no parts shown — UFO appears instead
  const isLastCycle = tick.cycleIndex === CYCLE_PLAN.length - 1;
  const stepIdx = STEP_ORDER.indexOf(cycleStep);
  const weldIdx = STEP_ORDER.indexOf("weld_parts");
  if (isLastCycle && stepIdx > weldIdx) {
    return { showLeft: false, showRight: false, showCombined: false, carryIsLeft };
  }

  switch (cycleStep) {
    case "reach_parts":
      return { showLeft: false, showRight: false, showCombined: false, carryIsLeft };
    case "pick_parts":
      // Parts appear as gripper closes (phaseT > 0.3)
      return { showLeft: tick.phaseT > 0.3, showRight: tick.phaseT > 0.3, showCombined: false, carryIsLeft };
    case "lift_parts":
    case "converge_parts":
    case "weld_parts":
      return { showLeft: true, showRight: true, showCombined: false, carryIsLeft };
    case "transfer_to_single":
      // Immediately show as combined piece on carry arm — no separation visible
      return { showLeft: false, showRight: false, showCombined: true, carryIsLeft };
    case "carry_out":
      return { showLeft: false, showRight: false, showCombined: true, carryIsLeft };
    case "deposit_part":
      // Combined piece visible until gripper opens (phaseT < 0.5)
      return { showLeft: false, showRight: false, showCombined: tick.phaseT < 0.5, carryIsLeft };
    case "return_arms":
      return { showLeft: false, showRight: false, showCombined: false, carryIsLeft };
    default:
      return { showLeft: false, showRight: false, showCombined: false, carryIsLeft };
  }
}

// ─── REAR LAYER ─────────────────────────────────────────────────────────────
export function AssemblyRearLayer({ tick }: { tick: AssemblyTick }) {
  if (tick.phase !== "flying") return null;
  const pose = getUfoPose(tick.phaseT);
  if (pose.scale > 0.65) return null;
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={SVG_STYLE}>
      <AsmDefs />
      <g transform={`translate(${pose.x},${pose.y}) scale(${pose.scale})`}>
        <UfoShape showPilot={true} />
      </g>
    </svg>
  );
}

// ─── FRONT LAYER ────────────────────────────────────────────────────────────
export function AssemblyFrontLayer({ tick }: { tick: AssemblyTick }) {
  const isIdle = tick.phase === "idle";
  const { phase, phaseT, cycleStep, cycleCtx, cycleIndex } = tick;

  // ── Arms: visible in all non-idle phases (idle already returned above) ──
  const showArms = true;
  const isCycle = phase === "cycle";

  // ── Last cycle post-weld: UFO appears immediately ──
  const isLastCyclePostWeld = isCycle
    && cycleIndex === CYCLE_PLAN.length - 1
    && cycleStep != null
    && STEP_ORDER.indexOf(cycleStep) > STEP_ORDER.indexOf("weld_parts");

  // ── Arm poses ──
  const armPoses: ArmPose[] = ARM_CONFIGS.map((config) => {
    if (phase === "arms_build") {
      const rest = getArmRestPose(config.side);
      const delay = config.side === 1 ? 0 : 0.2;  // right arm slightly delayed
      const localT = clamp01((phaseT - delay) / (1 - delay));
      return { ...rest, buildT: easeInOut(localT) };
    }
    if (phase === "holding") {
      return getArmRestPose(config.side);
    }
    if (isCycle && cycleStep && cycleCtx) {
      return computeArmPoseForStep(cycleStep, phaseT, config, cycleCtx);
    }
    return getArmRestPose(config.side);
  });

  // ── Attached parts ──
  const attachInfo = getAttachedPartsInfo(tick);
  const carryArmIdx = attachInfo.carryIsLeft ? 0 : 1;

  // ── Weld position: midpoint between gripper tips ──
  let weldX = WX, weldY = WY;
  if (isCycle && cycleStep === "weld_parts") {
    const tip0 = getGripperTipWorld(ARM_CONFIGS[0], armPoses[0]);
    const tip1 = getGripperTipWorld(ARM_CONFIGS[1], armPoses[1]);
    weldX = (tip0.x + tip1.x) / 2;
    weldY = (tip0.y + tip1.y) / 2;
  }

  // ── Laughter position ──
  const laughterPos = getLaughterPos(tick);

  // ── UFO & Red ──
  // UFO spawns at weld zone and stays visible through all post-weld phases.
  // During red_fly_in:
  //   phaseT 0→0.70 : Red flies to UFO — UFO stays at spawn
  //   phaseT 0.70→1  : Red has boarded — UFO departs toward patrol start
  // When "flying" begins, UFO is exactly at PATROL_START so the loop is seamless.
  const showUfo = phase === "finalize_ufo" || phase === "red_fly_in" || phase === "flying"
    || phase === "laughter_fly_out" || isLastCyclePostWeld;
  const isFlying = phase === "flying";

  // Pilot (Red's head) visible after boarding
  const showPilot = isFlying || (phase === "red_fly_in" && phaseT >= 0.70);

  let ufoPose = { x: UFO_SPAWN_X, y: UFO_SPAWN_Y, scale: 0.85, facingLeft: false };
  if (phase === "red_fly_in" && phaseT >= 0.70) {
    // UFO departs after Red boards
    const ut = easeInOut((phaseT - 0.70) / 0.30);
    ufoPose = {
      x: lerp(UFO_SPAWN_X, PATROL_START_X, ut),
      y: lerp(UFO_SPAWN_Y, PATROL_START_Y, ut),
      scale: 0.85, facingLeft: false,
    };
  }
  if (isFlying) ufoPose = getUfoPose(phaseT);

  // Red fly-in: Red arrives at UFO in first 70% of the phase, then vanishes (boarded)
  let redPos = { x: RX, y: RY };
  let redScale = RED_REAL_SCALE;
  const redBoarding = phase === "red_fly_in" && phaseT < 0.70;
  if (phase === "red_fly_in") {
    const boardT = clamp01(phaseT / 0.70);
    const et = easeInOut(boardT);
    redPos = { x: lerp(RX, UFO_SPAWN_X, et), y: lerp(RY, UFO_SPAWN_Y, et) };
    redScale = lerp(RED_REAL_SCALE, RED_UFO_SCALE, et);
  }

  // ── Laser shots ──
  const activeShots = useLaserShots(
    isFlying ? phaseT : 0,
    isFlying ? ufoPose.x : 0,
    isFlying ? ufoPose.y : 0,
  );

  if (isIdle) return null;

  // ── Deposits ──
  const deposits = getDeposits(tick);
  const showDeposits = !showUfo && deposits.length > 0;

  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={SVG_STYLE}>
      <AsmDefs />

      {/* ── Robot arms ──────────────────────────────────────── */}
      {showArms && ARM_CONFIGS.map((config, i) => (
        <RobotArm key={i} config={config} pose={armPoses[i]} />
      ))}

      {/* ── Parts attached to grippers (individual or sub-assembly) ── */}
      {isCycle && cycleCtx && attachInfo.showLeft && (
        <AttachedPart config={ARM_CONFIGS[0]} pose={armPoses[0]} part={cycleCtx.leftPartDef}
          sourceCycle={cycleCtx.stage === "stage2" ? findSourceCycle(cycleCtx.leftTarget) : null} />
      )}
      {isCycle && cycleCtx && attachInfo.showRight && (
        <AttachedPart config={ARM_CONFIGS[1]} pose={armPoses[1]} part={cycleCtx.rightPartDef}
          sourceCycle={cycleCtx.stage === "stage2" ? findSourceCycle(cycleCtx.rightTarget) : null} />
      )}

      {/* ── Combined welded part on carry arm ────────────────── */}
      {isCycle && cycleCtx && attachInfo.showCombined && (
        <CombinedPart config={ARM_CONFIGS[carryArmIdx]} pose={armPoses[carryArmIdx]} ctx={cycleCtx} />
      )}

      {/* ── Deposited sub-assemblies ─────────────────────────── */}
      {showDeposits && <DepositedParts deposits={deposits} />}

      {/* ── Holding indicator ────────────────────────────────── */}
      {phase === "holding" && <HoldingIndicator />}

      {/* ── Weld glow + sparks ───────────────────────────────── */}
      {isCycle && cycleStep === "weld_parts" && (
        PERF_REDUCED
          ? <circle cx={weldX} cy={weldY} r="20" fill="rgba(255,220,80,0.50)"
              style={{ animation: "asm-weld-glow 0.50s ease-in-out infinite" }} />
          : <WeldEffect x={weldX} y={weldY} />
      )}

      {/* ── Laughter proxy ──────────────────────────────────── */}
      {laughterPos.visible && (
        <LaughterProxy x={laughterPos.x} y={laughterPos.y} scale={laughterPos.scale} />
      )}

      {/* ── UFO at weld zone (appears after last weld, departs during red_fly_in) ── */}
      {showUfo && !isFlying && (
        <g transform={`translate(${ufoPose.x},${ufoPose.y}) scale(${ufoPose.scale})`}>
          <UfoShape showPilot={showPilot} />
        </g>
      )}

      {/* ── Red flying to UFO (hidden once boarded at phaseT ≥ 0.70) ────────── */}
      {redBoarding && <RedProxy x={redPos.x} y={redPos.y} scale={redScale} />}

      {/* ── Flying UFO (front layer) ─────────────────────────── */}
      {isFlying && ufoPose.scale >= 0.65 && (
        <g transform={`translate(${ufoPose.x},${ufoPose.y}) scale(${ufoPose.scale})`}>
          <UfoShape showPilot={true} />
        </g>
      )}

      {/* ── Laser shots ──────────────────────────────────────── */}
      {isFlying && activeShots.map((shot, i) => (
        <line key={i} x1={shot.x1} y1={shot.y1} x2={shot.x2} y2={shot.y2}
          stroke="#16a3c6" strokeWidth="2" opacity="0.8" strokeLinecap="round" />
      ))}
    </svg>
  );
}
