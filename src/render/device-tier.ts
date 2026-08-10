/**
 * device-tier.ts — einmalige Geräteklassifizierung beim Start.
 *
 * Wird von Renderer, Bloom und Lights genutzt um Quality-Settings
 * pro Tier anzupassen. Desktop-Darstellung bleibt unverändert.
 */

export type DeviceTier = 'low' | 'medium' | 'high';

/** Ergebnis wird beim ersten Import berechnet und gecacht. */
/** True wenn das Gerät ein Mobilgerät ist (Touch-fähig, unabhängig von Orientation). */
export const isMobileDevice: boolean = detectMobileDevice();

/** True wenn das Gerät ein Tablet ist (Touch, breiter Viewport). */
export const isTabletDevice: boolean = isMobileDevice && typeof window !== 'undefined' && Math.min(window.screen.width, window.screen.height) >= 600;

/** Ergebnis wird beim ersten Import berechnet und gecacht. */
export const deviceTier: DeviceTier = detectTier();

function detectMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const ipadDesktopUserAgent = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return mobileUserAgent || ipadDesktopUserAgent;
}

function detectTier(): DeviceTier {
  // Server-Side / Worker — sicherheitshalber high
  if (typeof navigator === 'undefined') return 'high';

  const dpr = window.devicePixelRatio || 1;

  if (!isMobileDevice) return 'high';

  // Mobile mit niedrigem DPR → low (ältere / Budget-Geräte)
  if (dpr <= 1.5) return 'low';

  // Mobile mit hohem DPR → medium
  return 'medium';
}
