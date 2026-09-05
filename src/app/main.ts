import '../styles/main.css';
import { mountGame, type MountedGame } from './game';
import { setIntroLoadingProgress } from './intro-progress';

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
// Opt-in local diagnostics: native timestamps only, no storage or telemetry.
const measureStartup = new URLSearchParams(window.location.search).has('timing');

function setIntroLoadingPhase(
  phase: 'core' | 'room' | 'ready',
  title: string,
  copy: string,
  status: string
): void {
  const overlay = document.querySelector<HTMLElement>('#intro-overlay');
  if (!overlay) {
    return;
  }

  overlay.dataset.loadPhase = phase;
  const titleElement = overlay.querySelector<HTMLElement>('[data-intro-title]');
  const copyElement = overlay.querySelector<HTMLElement>('[data-intro-copy]');
  const phaseElement = overlay.querySelector<HTMLElement>('[data-intro-phase]');

  titleElement && (titleElement.textContent = title);
  copyElement && (copyElement.textContent = copy);
  phaseElement && (phaseElement.textContent = status);
}

function createIntroOverlay(): () => void {
  const overlay = document.querySelector<HTMLElement>('#intro-overlay');
  if (!overlay) {
    throw new Error('Missing #intro-overlay element.');
  }

  return function hideOverlay(): void {
    let overlayRemoved = false;
    const removeOverlay = (): void => {
      if (overlayRemoved) {
        return;
      }

      overlayRemoved = true;
      overlay.remove();
      if (measureStartup) performance.mark('portfolio:overlay-removed');
    };

    overlay.setAttribute('aria-busy', 'false');
    overlay.classList.add('intro-hidden');
    document.body.classList.remove('app-loading');
    document.body.classList.add('app-ready');
    if (measureStartup) performance.mark('portfolio:app-ready');
    window.dispatchEvent(new CustomEvent('portfolio:app-ready'));

    overlay.addEventListener('transitionend', removeOverlay, { once: true });
    window.setTimeout(removeOverlay, 700);
  };
}

const hideIntroOverlay =
  typeof document !== 'undefined' ? createIntroOverlay() : () => undefined;

function boot(): void {
  if (measureStartup) performance.mark('portfolio:boot-start');
  app?.destroy();
  app = mountGame(appRoot, {
    onLoadProgress: progress => setIntroLoadingProgress(12 + progress * 88)
  });

  const testWindow = window as TestableWindow;
  testWindow.advanceTime = app.advanceTime;
  testWindow.debug_preview_combat_camera = app.debugPreviewCombatCamera;
  testWindow.render_game_to_text = app.renderGameToText;
}

(['mousedown', 'mouseup', 'click', 'auxclick', 'pointerdown', 'pointerup'] as const).forEach(type => {
  window.addEventListener(
    type,
    (event: MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { capture: true }
  );
});

setIntroLoadingPhase(
  'core',
  'Kernsysteme werden geladen',
  'Renderer, Steuerung und Schachlogik werden initialisiert.',
  'CORE · 02/04'
);
setIntroLoadingProgress(12);
boot();
window.setTimeout(() => {
  setIntroLoadingPhase(
    'room',
    'Raum wird aufgebaut',
    '3D-Raum, Licht und Schachfiguren werden lokal vorbereitet.',
    'ROOM · 03/04'
  );
}, 360);
app!.assetsReady.then(() => {
  if (measureStartup) performance.mark('portfolio:assets-ready');
  if (new URLSearchParams(window.location.search).get('entry') === 'room') {
    app?.enterRoom();
  }

  setIntroLoadingProgress(100);
  setIntroLoadingPhase(
    'ready',
    'System bereit',
    'Werkstatt und Schachbrett sind einsatzbereit.',
    'READY · 04/04'
  );
  // Keep READY visible for two actual browser paints instead of delaying it
  // by an arbitrary timeout. The room is already rendered at this point.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(hideIntroOverlay);
  });
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app?.destroy();

    const testWindow = window as TestableWindow;
    delete testWindow.advanceTime;
    delete testWindow.debug_preview_combat_camera;
    delete testWindow.render_game_to_text;
  });
}
