// ─── Assembly Sequence — animation timer hook ────────────────────────────────
//
// Drives the cycle-based state machine for the assembly sequence.
// Uses requestAnimationFrame for timing; React state is throttled to ~30 fps.
//
// High-level walk:
//   arms_build → holding (gated) → laughter_fly_in
//     → 5 cycles (each 9 steps) → laughter_fly_out
//     → finalize_ufo → red_fly_in → flying (∞)

import { useEffect, useRef, useState } from "react";
import type { AssemblyTick, AssemblyPhase } from "./types";
import {
  PHASE_DURATIONS,
  CYCLE_PLAN,
  STEP_ORDER,
  STEP_DURATIONS,
} from "./types";

/** Duration of one UFO flight loop (seconds). */
export const FLY_LOOP = 20;

// ─── Idle state ──────────────────────────────────────────────────────────────
const IDLE_TICK: AssemblyTick = {
  phase: "idle",
  elapsed: 0,
  phaseT: 0,
  cycleStep: null,
  cycleCtx: null,
  cycleIndex: -1,
  pairsGrabbed: 0,
  cyclesComplete: 0,
};

// ─── Helper to make a tick object ────────────────────────────────────────────
function makeTick(
  phase: AssemblyPhase,
  elapsed: number,
  phaseT: number,
  cycleIndex: number,
  pairsGrabbed: number,
  cyclesComplete: number,
  stepIdx?: number,
): AssemblyTick {
  return {
    phase,
    elapsed,
    phaseT,
    cycleStep: phase === "cycle" && stepIdx != null ? STEP_ORDER[stepIdx] : null,
    cycleCtx: phase === "cycle" && cycleIndex >= 0 ? CYCLE_PLAN[cycleIndex] : null,
    cycleIndex,
    pairsGrabbed,
    cyclesComplete,
  };
}

// ─── Core tick computation ───────────────────────────────────────────────────
function computeTick(elapsed: number, gateOpen: boolean): AssemblyTick {
  let remaining = elapsed;
  let pairsGrabbed = 0;
  let cyclesComplete = 0;

  // ── Phase: arms_build ──
  const armsDur = PHASE_DURATIONS.arms_build!;
  if (remaining < armsDur) {
    return makeTick("arms_build", elapsed, remaining / armsDur, -1, 0, 0);
  }
  remaining -= armsDur;

  // ── Phase: holding (gated) ──
  if (!gateOpen) {
    return makeTick("holding", elapsed, 1, -1, 0, 0);
  }
  // gate open → skip through (0s duration)

  // ── Phase: laughter_fly_in ──
  const flyInDur = PHASE_DURATIONS.laughter_fly_in!;
  if (remaining < flyInDur) {
    return makeTick("laughter_fly_in", elapsed, remaining / flyInDur, -1, 0, 0);
  }
  remaining -= flyInDur;

  // ── Cycles (5 total: 3 stage1 + 2 stage2) ──
  for (let ci = 0; ci < CYCLE_PLAN.length; ci++) {
    const ctx = CYCLE_PLAN[ci];

    // Walk through the 9 steps
    for (let si = 0; si < STEP_ORDER.length; si++) {
      const stepDur = STEP_DURATIONS[STEP_ORDER[si]];
      if (remaining < stepDur) {
        // For stage1 cycles, only increment pairsGrabbed once we're past pick_parts
        // (si > 1, since pick_parts is index 1), so parts stay in the scrap pile
        // until the gripper has actually closed on them.
        let grabCount = pairsGrabbed;
        if (ctx.stage === "stage1" && si > 1) {
          grabCount = ctx.cycleIndex + 1;
        }
        return makeTick("cycle", elapsed, remaining / stepDur, ci, grabCount, cyclesComplete, si);
      }
      remaining -= stepDur;
    }

    // Cycle complete — this pair is definitely grabbed
    if (ctx.stage === "stage1") {
      pairsGrabbed = ctx.cycleIndex + 1;
    }
    cyclesComplete++;
  }

  // All cycles done
  pairsGrabbed = 3;

  // ── Phase: laughter_fly_out ──
  const flyOutDur = PHASE_DURATIONS.laughter_fly_out!;
  if (remaining < flyOutDur) {
    return makeTick("laughter_fly_out", elapsed, remaining / flyOutDur, -1, pairsGrabbed, cyclesComplete);
  }
  remaining -= flyOutDur;

  // ── Phase: finalize_ufo ──
  const finalizeDur = PHASE_DURATIONS.finalize_ufo!;
  if (remaining < finalizeDur) {
    return makeTick("finalize_ufo", elapsed, remaining / finalizeDur, -1, pairsGrabbed, cyclesComplete);
  }
  remaining -= finalizeDur;

  // ── Phase: red_fly_in ──
  const redDur = PHASE_DURATIONS.red_fly_in!;
  if (remaining < redDur) {
    return makeTick("red_fly_in", elapsed, remaining / redDur, -1, pairsGrabbed, cyclesComplete);
  }
  remaining -= redDur;

  // ── Phase: flying (infinite loop) ──
  return makeTick("flying", elapsed, (remaining % FLY_LOOP) / FLY_LOOP, -1, pairsGrabbed, cyclesComplete);
}

// ─── The hook ────────────────────────────────────────────────────────────────
/**
 * Starts tracking time as soon as `active` becomes true.
 * Pauses at "holding" until `weldGateOpen` becomes true.
 * Resets to idle when `active` becomes false.
 */
export function useAssemblyTimer(active: boolean, weldGateOpen: boolean): AssemblyTick {
  const [tick, setTick]       = useState<AssemblyTick>(IDLE_TICK);
  const startRef              = useRef<number | null>(null);
  const rafRef                = useRef(0);
  const lastUpdateMs          = useRef(0);
  // Track how long we spent in the holding phase so we can subtract it
  const holdStartRef          = useRef<number | null>(null);
  const totalHeldMs           = useRef(0);
  const gateWasOpen           = useRef(false);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      startRef.current = null;
      lastUpdateMs.current = 0;
      holdStartRef.current = null;
      totalHeldMs.current = 0;
      gateWasOpen.current = false;
      return;
    }

    let cancelled = false;

    function loop(now: number) {
      if (cancelled) return;
      if (startRef.current === null) startRef.current = now;

      // Throttle React updates to ~30 fps
      if (now - lastUpdateMs.current >= 33) {
        lastUpdateMs.current = now;
        const rawElapsed = (now - startRef.current) / 1000;

        // Compute the effective elapsed time, subtracting time spent on hold
        const currentHeldSec = totalHeldMs.current / 1000;
        const elapsed = rawElapsed - currentHeldSec;

        const newTick = computeTick(elapsed, weldGateOpen);

        // Track holding: if we're in holding phase, accumulate hold time
        if (newTick.phase === "holding" && !weldGateOpen) {
          if (holdStartRef.current === null) {
            holdStartRef.current = now;
          }
        } else {
          // If we just left holding, finalize the held duration
          if (holdStartRef.current !== null) {
            totalHeldMs.current += now - holdStartRef.current;
            holdStartRef.current = null;
          }
        }

        // Once gate opens, record it
        if (weldGateOpen && !gateWasOpen.current) {
          gateWasOpen.current = true;
          if (holdStartRef.current !== null) {
            totalHeldMs.current += now - holdStartRef.current;
            holdStartRef.current = null;
          }
        }

        setTick(newTick);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, weldGateOpen]);

  return active ? tick : IDLE_TICK;
}
