import '../styles/main.css';
import { mountGame, type MountedGame } from './game';

interface TestableWindow extends Window {
  advanceTime?: (ms: number) => void;
  debug_preview_combat_camera?: MountedGame['debugPreviewCombatCamera'];
  render_game_to_text?: () => string;
}

const rootElement = document.querySelector<HTMLDivElement>('#app');

if (!rootElement) {
  throw new Error('Missing #app root element.');
}

const appRoot = rootElement;
let app: MountedGame | undefined;

// ── Intro loading overlay ─────────────────────────────────────────────────────
// Shown immediately on first page load (black screen with animated dots).
// Removed once the room GLB and first piece set have finished loading.

const NEON_BLUE = '#00d4ff';
const NEON_RED  = '#ff2020';

function createIntroOverlay(): () => void {
  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';
  overlay.innerHTML = `
    <div class="intro-text">
      <p class="intro-loading-line">
        <span class="intro-loading-label">loading</span><span class="intro-dot" id="idot1"> .</span><span class="intro-dot" id="idot2">.</span><span class="intro-dot" id="idot3">.</span>
      </p>
      <p class="intro-tagline">Scotty beamt dich hoch!</p>
    </div>
  `;
  document.body.appendChild(overlay);

  const dot1 = document.getElementById('idot1') as HTMLSpanElement;
  const dot2 = document.getElementById('idot2') as HTMLSpanElement;
  const dot3 = document.getElementById('idot3') as HTMLSpanElement;

  let phase = 0;

  function updateDots(): void {
    if (phase === 0) {
      dot1.style.color = NEON_BLUE;
      dot2.style.color = NEON_RED;
      dot3.style.color = NEON_BLUE;
    } else {
      dot1.style.color = NEON_RED;
      dot2.style.color = NEON_BLUE;
      dot3.style.color = NEON_RED;
    }
    phase = phase === 0 ? 1 : 0;
  }

  updateDots();
  const intervalId = setInterval(updateDots, 1000);

  // Returns a cleanup function that fades out and removes the overlay.
  return function hideOverlay(): void {
    clearInterval(intervalId);
    overlay.classList.add('intro-hidden');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  };
}

// Show the overlay only on the initial page load, not on HMR reloads.
const hideIntroOverlay = typeof document !== 'undefined' ? createIntroOverlay() : () => undefined;

// ── App boot ──────────────────────────────────────────────────────────────────

function boot(): void {
  app?.destroy();
  app = mountGame(appRoot);

  const testWindow = window as TestableWindow;
  testWindow.advanceTime = app.advanceTime;
  testWindow.debug_preview_combat_camera = app.debugPreviewCombatCamera;
  testWindow.render_game_to_text = app.renderGameToText;
}

// Block all middle mouse button events globally (button === 1)
// Prevents browser auto-scroll, page-back navigation, and crashes.
(['mousedown', 'mouseup', 'click', 'auxclick', 'pointerdown', 'pointerup'] as const).forEach(type => {
  window.addEventListener(type, (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });
});

boot();

// Hide the intro overlay once the room model + piece assets have loaded.
app!.assetsReady.then(hideIntroOverlay);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app?.destroy();

    const testWindow = window as TestableWindow;
    delete testWindow.advanceTime;
    delete testWindow.debug_preview_combat_camera;
    delete testWindow.render_game_to_text;
  });
}
