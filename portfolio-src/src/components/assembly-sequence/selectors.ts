import type { AssemblyTick } from "./types";
import { CYCLE_PLAN, STEP_ORDER } from "./types";

export function isLaughterAway(tick: AssemblyTick): boolean {
  return tick.phase === "laughter_fly_in"
    || tick.phase === "cycle"
    || tick.phase === "laughter_fly_out";
}

export function isRedAway(tick: AssemblyTick): boolean {
  return tick.phase === "red_fly_in" || tick.phase === "flying";
}

export function isUfoActive(tick: AssemblyTick): boolean {
  if (
    tick.phase === "laughter_fly_out" ||
    tick.phase === "finalize_ufo" ||
    tick.phase === "red_fly_in" ||
    tick.phase === "flying"
  ) {
    return true;
  }

  return (
    tick.phase === "cycle" &&
    tick.cycleIndex === CYCLE_PLAN.length - 1 &&
    tick.cycleStep != null &&
    STEP_ORDER.indexOf(tick.cycleStep) > STEP_ORDER.indexOf("weld_parts")
  );
}
