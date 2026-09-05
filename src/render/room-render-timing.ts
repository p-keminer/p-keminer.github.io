/** Opt-in diagnostics. Call only from the DEV + timing entry point. */
export interface RoomRenderFrameInfo {
  moving: boolean;
  continuous: boolean;
  width: number;
  height: number;
  /** Present only for non-overlapping diagnostic pass segments. */
  pass?: string;
  frameId?: number;
}

type GpuStatus = 'pending' | 'available' | 'unsupported' | 'queue-full'
  | 'disjoint' | 'invalid' | 'timeout' | 'error' | 'interrupted' | 'context-lost';

interface FrameSample extends RoomRenderFrameInfo {
  id: number;
  startMs: number;
  cpuMs: number | null;
  gpuMs: number | null;
  intervalMs: number | null;
  gpuStatus: GpuStatus;
}

interface TimerExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

const MAX_SAMPLES = 2000;
const MAX_PENDING = 32;
const DRAIN_DELAY_MS = 50;
const QUERY_TIMEOUT_MS = 5000;

interface PendingQuery {
  query: WebGLQuery;
  sample: FrameSample;
  endedMs: number;
}

declare global {
  interface Window {
    __roomTiming?: ReturnType<typeof createRoomRenderTiming>['controls'];
  }
}

export function createRoomRenderTiming(gl: WebGL2RenderingContext, pendingQueryLimit = MAX_PENDING) {
  // Pass mode emits up to seven sequential queries for each animation frame.
  const maxPending = Number.isFinite(pendingQueryLimit)
    ? Math.max(1, Math.min(128, Math.floor(pendingQueryLimit))) : MAX_PENDING;
  let errorCount = 0;
  let discardedCount = 0;
  let disjointCount = 0;
  const parameter = (name: number): unknown => {
    try { return gl.getParameter(name); } catch { return null; }
  };
  let extension: TimerExtension | null = null;
  try {
    extension = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  } catch { errorCount += 1; }
  let debug: WEBGL_debug_renderer_info | null = null;
  try { debug = gl.getExtension('WEBGL_debug_renderer_info'); } catch { /* Optional. */ }
  const hardware = {
    vendor: parameter(gl.VENDOR),
    renderer: parameter(gl.RENDERER),
    unmaskedVendor: debug ? parameter(debug.UNMASKED_VENDOR_WEBGL) : null,
    unmaskedRenderer: debug ? parameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    version: parameter(gl.VERSION),
    shadingLanguageVersion: parameter(gl.SHADING_LANGUAGE_VERSION),
    maxTextureSize: parameter(gl.MAX_TEXTURE_SIZE),
    maxRenderbufferSize: parameter(gl.MAX_RENDERBUFFER_SIZE),
    maxSamples: parameter(gl.MAX_SAMPLES),
    contextAttributes: gl.getContextAttributes(),
  };
  let label = 'initial';
  let roundStartMs = performance.now();
  let recording = true;
  let disposed = false;
  let stopReason: 'manual' | 'sample-limit' | 'disposed' | null = null;
  let samples: FrameSample[] = [];
  let marks: { name: string; startMs: number }[] = [];
  let pending: PendingQuery[] = [];
  let drainTimer: ReturnType<typeof setTimeout> | null = null;
  let previousMovingStart: number | null = null;
  let active: { sample: FrameSample; query: WebGLQuery | null; cpuStartMs: number } | null = null;

  const deleteQuery = (query: WebGLQuery) => {
    try { gl.deleteQuery(query); } catch { errorCount += 1; }
  };
  const discard = (sample: FrameSample, status: GpuStatus) => {
    sample.gpuStatus = status;
    sample.gpuMs = null;
    discardedCount += 1;
  };
  const clearTimer = () => {
    if (drainTimer !== null) clearTimeout(drainTimer);
    drainTimer = null;
  };
  const discardPending = (status: GpuStatus) => {
    for (const entry of pending) {
      discard(entry.sample, status);
      deleteQuery(entry.query);
    }
    pending = [];
    clearTimer();
  };
  const interruptActive = () => {
    if (!active) return;
    const interrupted = active;
    active = null;
    interrupted.sample.cpuMs = null;
    discard(interrupted.sample, 'interrupted');
    if (interrupted.query && extension) {
      try { gl.endQuery(extension.TIME_ELAPSED_EXT); }
      catch { errorCount += 1; }
      finally { deleteQuery(interrupted.query); }
    }
  };

  const scheduleDrain = () => {
    if (!disposed && pending.length > 0 && drainTimer === null) {
      drainTimer = setTimeout(drain, DRAIN_DELAY_MS);
    }
  };
  function drain() {
    drainTimer = null;
    if (disposed || !extension || pending.length === 0) return;
    try {
      if (gl.isContextLost()) {
        discardPending('context-lost');
        return;
      }
      if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
        disjointCount += 1;
        discardPending('disjoint');
        return;
      }
      const now = performance.now();
      const remaining: PendingQuery[] = [];
      for (const entry of pending) {
        try {
          if (gl.getQueryParameter(entry.query, gl.QUERY_RESULT_AVAILABLE)) {
            const nanoseconds: unknown = gl.getQueryParameter(entry.query, gl.QUERY_RESULT);
            if (typeof nanoseconds === 'number' && Number.isFinite(nanoseconds) && nanoseconds > 0) {
              entry.sample.gpuMs = nanoseconds / 1e6;
              entry.sample.gpuStatus = 'available';
            } else {
              discard(entry.sample, 'invalid');
            }
            deleteQuery(entry.query);
          } else if (now - entry.endedMs >= QUERY_TIMEOUT_MS) {
            discard(entry.sample, 'timeout');
            deleteQuery(entry.query);
          } else {
            remaining.push(entry);
          }
        } catch {
          errorCount += 1;
          discard(entry.sample, 'error');
          deleteQuery(entry.query);
        }
      }
      pending = remaining;
    } catch {
      errorCount += 1;
      discardPending('error');
    }
    scheduleDrain();
  }

  const beginFrame = (info: RoomRenderFrameInfo) => {
    if (disposed || !recording) return;
    if (active) {
      errorCount += 1;
      interruptActive();
      previousMovingStart = null;
    }
    const startMs = performance.now();
    // Adjacent pass segments are not adjacent animation frames.
    const qualifying = info.pass === undefined && info.moving && info.continuous;
    const sample: FrameSample = {
      ...info,
      id: samples.length,
      startMs,
      cpuMs: null,
      gpuMs: null,
      intervalMs: qualifying && previousMovingStart !== null ? startMs - previousMovingStart : null,
      gpuStatus: extension ? 'pending' : 'unsupported',
    };
    previousMovingStart = qualifying ? startMs : null;
    samples.push(sample);
    let query: WebGLQuery | null = null;
    if (extension) {
      if (pending.length >= maxPending) {
        discard(sample, 'queue-full');
      } else {
        try {
          if (gl.isContextLost()) {
            discard(sample, 'context-lost');
          } else if (gl.getQuery(extension.TIME_ELAPSED_EXT, gl.CURRENT_QUERY) !== null) {
            // Never end another profiler's query or nest elapsed-time queries.
            errorCount += 1;
            discard(sample, 'error');
          } else {
            query = gl.createQuery();
            if (!query) throw new Error('GPU timer query unavailable');
            gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
          }
        } catch {
          errorCount += 1;
          discard(sample, 'error');
          if (query) deleteQuery(query);
          query = null;
        }
      }
    }
    // Query instrumentation is outside CPU submission time.
    active = { sample, query, cpuStartMs: performance.now() };
    if (samples.length >= MAX_SAMPLES) {
      recording = false;
      stopReason = 'sample-limit';
    }
  };

  const endFrame = () => {
    if (!active) return;
    const completed = active;
    active = null;
    const endMs = performance.now();
    completed.sample.cpuMs = Math.max(0, endMs - completed.cpuStartMs);
    if (completed.query && extension) {
      let ended = false;
      try {
        gl.endQuery(extension.TIME_ELAPSED_EXT);
        ended = true;
      } catch {
        errorCount += 1;
        discard(completed.sample, 'error');
      } finally {
        if (ended) pending.push({ query: completed.query, sample: completed.sample, endedMs: endMs });
        else deleteQuery(completed.query);
      }
      scheduleDrain();
    }
  };

  const mark = (name: string) => {
    if (!disposed && marks.length < MAX_SAMPLES) marks.push({ name, startMs: performance.now() });
  };
  const controls = {
    reset(nextLabel = 'measurement') {
      if (disposed) return;
      interruptActive();
      discardPending('interrupted');
      samples = [];
      marks = [];
      errorCount = 0;
      discardedCount = 0;
      disjointCount = 0;
      previousMovingStart = null;
      label = nextLabel;
      roundStartMs = performance.now();
      recording = true;
      stopReason = null;
    },
    snapshot() {
      const gpuStatuses: Record<string, number> = {};
      for (const sample of samples) gpuStatuses[sample.gpuStatus] = (gpuStatuses[sample.gpuStatus] ?? 0) + 1;
      return {
        label, recording, disposed, stopReason,
        timeOrigin: performance.timeOrigin,
        roundStartMs,
        snapshotMs: performance.now(),
        devicePixelRatio: window.devicePixelRatio,
        hardware: { ...hardware, contextAttributes: hardware.contextAttributes ? { ...hardware.contextAttributes } : null },
        extension: { name: 'EXT_disjoint_timer_query_webgl2', supported: extension !== null },
        limits: { samples: MAX_SAMPLES, pendingQueries: maxPending, queryTimeoutMs: QUERY_TIMEOUT_MS },
        counts: {
          samples: samples.length,
          cpu: samples.filter(sample => sample.cpuMs !== null).length,
          gpu: gpuStatuses.available ?? 0,
          intervals: samples.filter(sample => sample.intervalMs !== null).length,
          pending: pending.length + (active?.query ? 1 : 0),
          discarded: discardedCount,
          disjoint: disjointCount,
          errors: errorCount,
          gpuStatuses,
        },
        samples: samples.map(sample => ({ ...sample })),
        marks: marks.map(entry => ({ ...entry })),
      };
    },
    stop() {
      recording = false;
      previousMovingStart = null;
      if (!disposed) stopReason = 'manual';
      // Outstanding results keep draining without waking the render loop.
      scheduleDrain();
    },
  };
  window.__roomTiming = controls;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    recording = false;
    stopReason = 'disposed';
    interruptActive();
    discardPending('interrupted');
    previousMovingStart = null;
    if (window.__roomTiming === controls) delete window.__roomTiming;
  };

  return { beginFrame, endFrame, mark, dispose, controls };
}
