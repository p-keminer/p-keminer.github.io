import { setIntroLoadingProgress } from './intro-progress';
import { isMobileDevice } from '../render/device-tier';

interface PortfolioPrivacyApi {
  canLoadExternalContent: () => boolean;
  openSettings: () => void;
}

declare global {
  interface Window {
    portfolioPrivacy: PortfolioPrivacyApi;
  }
}

const privacyGateElement = document.querySelector<HTMLElement>('[data-privacy-gate]');
const closeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-privacy-close]'));
const closeButton = closeButtons[0];
const introOverlayElement = document.querySelector<HTMLElement>('#intro-overlay');
const introTitle = document.querySelector<HTMLElement>('[data-intro-title]');
const introCopy = document.querySelector<HTMLElement>('[data-intro-copy]');
const introPhase = document.querySelector<HTMLElement>('[data-intro-phase]');
const retryButton = document.querySelector<HTMLButtonElement>('[data-intro-retry]');
const mobileMenuButton = document.querySelector<HTMLButtonElement>('#mobile-menu-btn');
const mobileMenuPanel = document.querySelector<HTMLElement>('#mobile-menu-panel');
const mobileMenuRoot = document.querySelector<HTMLElement>('#mobile-menu-root');
const orientationGate = document.querySelector<HTMLElement>('#orientation-gate');
const portraitOrientation = window.matchMedia('(orientation: portrait)');

if (!privacyGateElement || !introOverlayElement) {
  throw new Error('Privacy gate or loading overlay is missing.');
}

const privacyGate = privacyGateElement;
const introOverlay = introOverlayElement;
const privacyBackgroundElements = [
  document.querySelector<HTMLElement>('#site-header'),
  document.querySelector<HTMLElement>('#app'),
  document.querySelector<HTMLElement>('#site-footer'),
  document.querySelector<HTMLElement>('#legal-overlay')
].filter((element): element is HTMLElement => element !== null);

function setPrivacyBackgroundInert(inert: boolean): void {
  for (const element of privacyBackgroundElements) {
    element.inert = inert;
  }
}

let lastFocusedElement: HTMLElement | null = null;
let appBootPromise: Promise<unknown> | null = null;
let orientationGateWasVisible = false;

function syncOrientationGate(): void {
  if (!orientationGate) return;

  const shouldBlock = isMobileDevice && portraitOrientation.matches;
  orientationGate.hidden = !shouldBlock;
  document.body.classList.toggle('orientation-gated', shouldBlock);

  if (shouldBlock && !orientationGateWasVisible) {
    window.requestAnimationFrame(() => orientationGate.focus({ preventScroll: true }));
  }

  orientationGateWasVisible = shouldBlock;
}

function setupOrientationGate(): void {
  portraitOrientation.addEventListener?.('change', syncOrientationGate);
  window.addEventListener('orientationchange', syncOrientationGate);
  window.addEventListener('resize', syncOrientationGate, { passive: true });
  syncOrientationGate();
}

function closeMobileMenu(): void {
  mobileMenuPanel?.setAttribute('hidden', '');
  mobileMenuButton?.setAttribute('aria-expanded', 'false');
}

function setupMobileMenu(): void {
  mobileMenuButton?.addEventListener('click', () => {
    const shouldOpen = mobileMenuPanel?.hasAttribute('hidden') ?? false;
    mobileMenuPanel?.toggleAttribute('hidden', !shouldOpen);
    mobileMenuButton.setAttribute('aria-expanded', String(shouldOpen));
  });

  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Node && !mobileMenuRoot?.contains(event.target)) {
      closeMobileMenu();
    }
  });
}

function getFocusableElements(): HTMLElement[] {
  return Array.from(
    privacyGate.querySelectorAll<HTMLElement>(
      'button:not([hidden]):not([disabled]), details summary, a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(element => !element.hasAttribute('hidden'));
}

function openPrivacySettings(): void {
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  setPrivacyBackgroundInert(true);
  privacyGate.hidden = false;
  document.body.classList.add('privacy-dialog-open');

  window.requestAnimationFrame(() => {
    closeButton?.focus();
  });
}

function closePrivacySettings(): void {
  privacyGate.hidden = true;
  setPrivacyBackgroundInert(false);
  document.body.classList.remove('privacy-dialog-open');
  lastFocusedElement?.focus();
  lastFocusedElement = null;
}

function handlePrivacyKeydown(event: KeyboardEvent): void {
  if (privacyGate.hidden) {
    if (event.key === 'Escape') {
      closeMobileMenu();
    }
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closePrivacySettings();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

async function startApplication(): Promise<void> {
  if (appBootPromise) {
    await appBootPromise;
    return;
  }

  introOverlay.hidden = false;
  introOverlay.dataset.loadPhase = 'boot';
  introOverlay.setAttribute('aria-busy', 'true');
  introTitle && (introTitle.textContent = 'Controller wird gestartet');
  introCopy && (introCopy.textContent = 'Lokale Anwendung wird initialisiert.');
  introPhase && (introPhase.textContent = 'BOOT · 01/04');
  setIntroLoadingProgress(4);
  retryButton?.setAttribute('hidden', '');
  document.body.classList.add('app-loading');

  appBootPromise = import('./main')
    .catch(error => {
      appBootPromise = null;
      introOverlay.dataset.loadPhase = 'error';
      introOverlay.setAttribute('aria-busy', 'false');
      introTitle && (introTitle.textContent = 'Werkstatt konnte nicht geladen werden');
      introCopy && (introCopy.textContent = 'Bitte prüfe die Verbindung und versuche es erneut.');
      introPhase && (introPhase.textContent = 'ERROR · STARTVORGANG ANGEHALTEN');
      retryButton?.removeAttribute('hidden');
      console.error('Application boot failed.', error);
    });

  await appBootPromise;
}

for (const button of closeButtons) {
  button.addEventListener('click', closePrivacySettings);
}
retryButton?.addEventListener('click', () => window.location.reload());

document.addEventListener('click', event => {
  const target = event.target;
  if (target instanceof Element && target.closest('[data-privacy-settings]')) {
    openPrivacySettings();
  }
});

document.addEventListener('keydown', handlePrivacyKeydown);
setupMobileMenu();
setupOrientationGate();

window.portfolioPrivacy = Object.freeze({
  canLoadExternalContent: () => false,
  openSettings: openPrivacySettings
});

// Die Anwendung besteht derzeit ausschließlich aus notwendigen Website-Inhalten.
void startApplication();
