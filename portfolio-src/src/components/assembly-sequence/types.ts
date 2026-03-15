// ─── Assembly Sequence — shared types & cycle state machine ──────────────────
//
// The assembly is organised as a cycle-based state machine.
//
// High-level sequence:
//   idle → arms_build → holding (gated) → laughter_fly_in
//     → [CYCLE 0..2] stage1: raw scrap pairs → 3 sub-assemblies
//     → [CYCLE 3..4] stage2: sub-assemblies welded together
//     → laughter_fly_out → finalize_ufo → red_fly_in → flying (∞)
//
// Each cycle walks through 9 mechanical steps:
//   reach_parts → pick_parts → lift_parts → converge_parts
//     → weld_parts → transfer_to_single → carry_out
//     → deposit_part → return_arms
//
// Laughter flies in once before all cycles, stays in work zone,
// and flies out once after all cycles are complete.

// ─── Scrap part visual definition ────────────────────────────────────────────
export interface ScrapPartDef {
  color: string;
  stroke: string;
  w: number;
  h: number;
}

// ─── The 9 atomic mechanical steps within a weld cycle ───────────────────────
export type CycleStep =
  | "reach_parts"         // Arms extend toward actual scrap piece positions
  | "pick_parts"          // Grippers close on pieces
  | "lift_parts"          // Arms lift pieces straight up
  | "converge_parts"      // Arms move inward, parts overlap at weld zone
  | "weld_parts"          // Laughter welds (starts when parts visibly touch)
  | "transfer_to_single"  // One arm takes welded piece, other releases
  | "carry_out"           // Single arm carries piece to deposit zone
  | "deposit_part"        // Piece placed down as visible sub-assembly
  | "return_arms";        // Arms return to rest pose

/** Ordered list of steps within each cycle. */
export const STEP_ORDER: CycleStep[] = [
  "reach_parts",
  "pick_parts",
  "lift_parts",
  "converge_parts",
  "weld_parts",
  "transfer_to_single",
  "carry_out",
  "deposit_part",
  "return_arms",
];

/** Duration in seconds for each cycle step. */
export const STEP_DURATIONS: Record<CycleStep, number> = {
  reach_parts:         2.0,
  pick_parts:          1.0,
  lift_parts:          1.5,
  converge_parts:      2.0,
  weld_parts:          5.0,
  transfer_to_single:  1.5,
  carry_out:           2.0,
  deposit_part:        1.5,
  return_arms:         1.5,
};

/** Total duration of one full cycle (sum of all step durations). */
export const CYCLE_DURATION: number =
  STEP_ORDER.reduce((sum, s) => sum + STEP_DURATIONS[s], 0); // 18.0s

// ─── Assembly stages ─────────────────────────────────────────────────────────
export type AssemblyStage = "stage1" | "stage2";

// ─── Cycle context — what a given cycle operates on ──────────────────────────
export interface CycleContext {
  stage: AssemblyStage;
  cycleIndex: number;                          // 0-based within stage
  leftTarget:  { x: number; y: number };       // World position of left piece
  rightTarget: { x: number; y: number };       // World position of right piece
  leftPartDef:  ScrapPartDef;
  rightPartDef: ScrapPartDef;
  depositPos: { x: number; y: number };        // Where the welded piece lands
  carryArm: "left" | "right";                  // Which arm does carry-out
}

/**
 * All cycles in order.
 *
 * Stage 1: 3 cycles on raw scrap pairs (from ScrapPile layers 1-3).
 * Stage 2: 2 cycles welding sub-assemblies together.
 *
 * Target positions are the exact centers of the real SVG pieces
 * in RobotScene's ScrapPile component (px=1088, py=650).
 */
export const CYCLE_PLAN: CycleContext[] = [
  // ── Stage 1, Cycle 0: Layer 1 — orange plate + yellow rod ──
  {
    stage: "stage1", cycleIndex: 0,
    leftTarget:  { x: 1055, y: 653 },   // orange plate center
    rightTarget: { x: 1104, y: 648 },   // yellow rod center
    leftPartDef:  { color: "#e07030", stroke: "#f09050", w: 55, h: 19 },
    rightPartDef: { color: "#d4c240", stroke: "#f0de70", w: 67, h: 16 },
    depositPos: { x: 950, y: 640 },
    carryArm: "left",
  },
  // ── Stage 1, Cycle 1: Layer 2 — cyan + purple ──
  {
    stage: "stage1", cycleIndex: 1,
    leftTarget:  { x: 1063, y: 637 },   // cyan piece center
    rightTarget: { x: 1113, y: 633 },   // purple piece center
    leftPartDef:  { color: "#28bce0", stroke: "#74e0ff", w: 38, h: 15 },
    rightPartDef: { color: "#b060e0", stroke: "#d8a0ff", w: 55, h: 13 },
    depositPos: { x: 1090, y: 645 },
    carryArm: "right",
  },
  // ── Stage 1, Cycle 2: Layer 3 — small pieces ──
  {
    stage: "stage1", cycleIndex: 2,
    leftTarget:  { x: 1085, y: 612 },   // yellow bar center
    rightTarget: { x: 1107, y: 616 },   // orange bar center
    leftPartDef:  { color: "#d4c240", stroke: "#f0de70", w: 17, h: 7 },
    rightPartDef: { color: "#e07030", stroke: "#f09050", w: 26, h: 9 },
    depositPos: { x: 1080, y: 642 },
    carryArm: "left",
  },
  // ── Stage 2, Cycle 0: Weld SA0 + SA1 ──
  {
    stage: "stage2", cycleIndex: 0,
    leftTarget:  { x: 950, y: 640 },    // SA0 deposit pos
    rightTarget: { x: 1090, y: 645 },   // SA1 deposit pos
    leftPartDef:  { color: "#e07030", stroke: "#f09050", w: 40, h: 16 },
    rightPartDef: { color: "#28bce0", stroke: "#74e0ff", w: 36, h: 14 },
    depositPos: { x: 1085, y: 640 },
    carryArm: "right",
  },
  // ── Stage 2, Cycle 1: Weld combined + SA2 ──
  {
    stage: "stage2", cycleIndex: 1,
    leftTarget:  { x: 1085, y: 640 },   // SA0+SA1 combined deposit pos
    rightTarget: { x: 1080, y: 642 },   // SA2 deposit pos
    leftPartDef:  { color: "#e07030", stroke: "#f09050", w: 50, h: 18 },
    rightPartDef: { color: "#d4c240", stroke: "#f0de70", w: 20, h: 8 },
    depositPos: { x: 1040, y: 618 },    // final assembly position (unused — becomes UFO)
    carryArm: "left",
  },
];

// ─── Top-level assembly phases ───────────────────────────────────────────────
export type AssemblyPhase =
  | "idle"
  | "arms_build"
  | "holding"            // gated pause, waiting for weldSolderDone
  | "laughter_fly_in"    // Laughter flies from home to work zone (once)
  | "cycle"              // active weld cycle (stage + cycleIndex + step)
  | "laughter_fly_out"   // Laughter returns home (once, after all cycles)
  | "finalize_ufo"       // Sub-assemblies merge into UFO
  | "red_fly_in"         // Red flies to UFO
  | "flying";            // UFO loops forever

/** Durations for non-cycle phases (seconds). 0 = gated, Infinity = loops. */
export const PHASE_DURATIONS: Partial<Record<AssemblyPhase, number>> = {
  arms_build:       6,
  holding:          0,       // gated — pauses until weldSolderDone
  laughter_fly_in:  2.5,
  laughter_fly_out: 2.5,
  finalize_ufo:     6,
  red_fly_in:       4,
  flying:           Infinity,
};

// ─── Assembly tick — the state emitted every frame ───────────────────────────
export interface AssemblyTick {
  phase:     AssemblyPhase;
  elapsed:   number;            // total seconds since start (excl. hold pauses)
  phaseT:    number;            // 0..1 within current phase or step

  // Cycle details (meaningful only when phase === "cycle")
  cycleStep:  CycleStep | null;
  cycleCtx:   CycleContext | null;
  cycleIndex: number;           // global cycle index 0..4

  // Progress tracking
  pairsGrabbed:   number;       // 0..3 — how many ScrapPile layers consumed
  cyclesComplete: number;       // 0..5 — how many full cycles finished
}
