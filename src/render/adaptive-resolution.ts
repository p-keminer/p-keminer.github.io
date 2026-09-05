import type { DeviceTier } from './device-tier';

export type ResolutionMode = 'adaptive' | 'reference' | 'full' | 'motion' | 'reduced';
export const MOTION_RESOLUTION_SCALE = 0.8;
export const HEAVY_MOTION_RESOLUTION_SCALE = 0.65;
const RESTORE_DELAY_MS = 220;
const SAMPLE_COUNT = 8;
const HEAVY_SAMPLE_COUNT = 12;
const MAX_SAMPLE_GAP_MS = 1000;
const WARMUP_FRAMES = 2;

export function getBaseRenderDpr(
  width: number,
  height: number,
  deviceDpr: number,
  tier: DeviceTier,
  limits: { width: number; height: number }
): number {
  const maxDpr = tier === 'high' ? 1.5 : tier === 'medium' ? 1.25 : 1;
  const maxPixels = tier === 'high' ? 4_000_000 : tier === 'medium' ? 2_500_000 : 1_500_000;
  return Math.min(
    Math.max(deviceDpr, 0.01), maxDpr,
    Math.sqrt(maxPixels / (width * height)),
    limits.width / width, limits.height / height
  );
}

/** Discrete motion resolutions; camera cadence is not a GPU-time measurement. */
export function createAdaptiveResolution(
  mode: ResolutionMode,
  onChange: (scale: number, reason: string) => void
) {
  let scale = mode === 'reduced' ? MOTION_RESOLUTION_SCALE : 1;
  // Remember the required motion resolution, independently of the sharp rest frame.
  let motionScale = 1;
  let lastSampleTime: number | null = null;
  let warmupFrames = WARMUP_FRAMES;
  const samples: number[] = [];
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  function clearSamples(): void {
    lastSampleTime = null;
    warmupFrames = WARMUP_FRAMES;
    samples.length = 0;
  }

  function clearRestore(): void {
    if (restoreTimer !== undefined) clearTimeout(restoreTimer);
    restoreTimer = undefined;
  }

  function changeScale(next: number, reason: string): void {
    if (disposed || next === scale) return;
    scale = next;
    onChange(scale, reason);
  }

  function restoreAfterRest(): void {
    if (scale === 1 || restoreTimer !== undefined) return;
    // One final sharp frame; no animation loop is needed to wait for rest.
    restoreTimer = setTimeout(() => {
      restoreTimer = undefined;
      clearSamples();
      changeScale(1, 'camera-rest');
    }, RESTORE_DELAY_MS);
  }

  return {
    getScale: () => scale,
    observeCameraFrame: (now: number, moving: boolean, continuous: boolean): void => {
      if (disposed || mode === 'full' || mode === 'reduced') return;
      if (continuous) clearRestore();
      if (!moving) {
        clearSamples();
        if (!continuous) restoreAfterRest();
        return;
      }

      // Only authored continuous camera animations can provide representative
      // cadence. Sparse mouse/wheel events must never classify hardware as slow.
      const learningHeavy = mode === 'adaptive' && motionScale === MOTION_RESOLUTION_SCALE
        && scale === MOTION_RESOLUTION_SCALE;
      if ((mode === 'adaptive' || mode === 'reference') && continuous
        && (motionScale === 1 || learningHeavy)) {
        const interval = lastSampleTime === null ? 0 : now - lastSampleTime;
        if (interval <= 0 || interval > MAX_SAMPLE_GAP_MS) clearSamples();
        else if (warmupFrames > 0) warmupFrames -= 1;
        else {
          samples.push(interval);
          const requiredSamples = learningHeavy ? HEAVY_SAMPLE_COUNT : SAMPLE_COUNT;
          if (samples.length > requiredSamples) samples.shift();
          if (samples.length >= 4) {
            const ordered = [...samples].sort((a, b) => a - b);
            const middle = Math.floor(ordered.length / 2);
            const median = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
            // Very slow devices may not produce eight measured frames in a
            // short camera flight. Require sustained time as well as samples.
            const duration = samples.reduce((total, sample) => total + sample, 0);
            const severeSlow = median > 50 && duration >= 400;
            const sustainedSlow = samples.length === requiredSamples
              && median > (learningHeavy ? 32 : 26) && (!learningHeavy || duration >= 350);
            if (severeSlow || sustainedSlow) {
              motionScale = learningHeavy ? HEAVY_MOTION_RESOLUTION_SCALE : MOTION_RESOLUTION_SCALE;
            }
          }
        }
        lastSampleTime = now;
      } else {
        clearSamples();
      }

      if (motionScale < 1 || mode === 'motion') {
        const nextScale = mode === 'motion' ? MOTION_RESOLUTION_SCALE : motionScale;
        if (nextScale !== scale) {
          changeScale(nextScale, mode === 'motion' ? 'motion-comparison'
            : nextScale === HEAVY_MOTION_RESOLUTION_SCALE ? 'heavy-camera-cadence' : 'slow-camera-cadence');
          // Exclude the old resolution and resize cost from the next learning window,
          // including when motion resumes after a full-resolution rest frame.
          clearSamples();
        }
        clearRestore();
        // Authored animations explicitly report completion. A silence timer
        // during them would resize back and forth at very low frame rates.
        if (!continuous) restoreAfterRest();
      }
    },
    reset: (forgetLoad = false): void => {
      clearRestore();
      clearSamples();
      if (forgetLoad) motionScale = 1;
      changeScale(mode === 'reduced' ? MOTION_RESOLUTION_SCALE : 1, 'reset');
    },
    dispose: (): void => {
      disposed = true;
      clearRestore();
      clearSamples();
    }
  };
}
