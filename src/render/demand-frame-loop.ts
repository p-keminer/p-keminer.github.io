export interface DemandFrameLoop {
  request: () => void;
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
}

/** A frame runs only for a request or while step reports an active animation. */
export function createDemandFrameLoop(
  step: (deltaMs: number) => boolean,
  onIdle?: () => void
): DemandFrameLoop {
  let frameHandle: number | null = null;
  let lastFrameTime: number | null = null;
  let pending = false;
  let running = false;
  let enabled = true;
  let disposed = false;

  function schedule(): void {
    if (disposed || !enabled || running || !pending || frameHandle !== null) return;
    // Sleeping time is not animation time. Reset the reference on each wakeup
    // rather than jumping a new animation ahead by the preceding idle period.
    lastFrameTime ??= performance.now();
    frameHandle = window.requestAnimationFrame(animate);
  }

  function animate(timestamp: number): void {
    frameHandle = null;
    if (disposed || !enabled) return;
    running = true;
    pending = false;
    const deltaMs = Math.max(0, Math.min(timestamp - (lastFrameTime ?? timestamp), 32));
    lastFrameTime = timestamp;
    try {
      // Keep requests made inside step; coalesce them into one following frame.
      pending = step(deltaMs) || pending;
    } finally {
      running = false;
    }
    if (pending) {
      schedule();
    } else {
      lastFrameTime = null;
      if (!disposed) onIdle?.();
    }
  }

  return {
    request: () => {
      if (disposed) return;
      pending = true;
      schedule();
    },
    setEnabled: nextEnabled => {
      if (disposed || enabled === nextEnabled) return;
      enabled = nextEnabled;
      if (!enabled) {
        if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
        frameHandle = null;
        lastFrameTime = null;
      } else {
        schedule();
      }
    },
    dispose: () => {
      disposed = true;
      if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
      frameHandle = null;
      lastFrameTime = null;
      pending = false;
    }
  };
}
