/**
 * device-tier.ts — einmalige Geräteklassifizierung beim Start.
 *
 * Wird von Renderer, Bloom und Lights genutzt um Quality-Settings
 * pro Tier anzupassen. Desktop-Darstellung bleibt unverändert.
 */

export type DeviceTier = 'low' | 'medium' | 'high';

/** Ergebnis wird beim ersten Import berechnet und gecacht. */
export const deviceTier: DeviceTier = detectTier();

function detectTier(): DeviceTier {
  // Server-Side / Worker — sicherheitshalber high
  if (typeof navigator === 'undefined') return 'high';

  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const dpr = window.devicePixelRatio || 1;

  if (!isMobile) return 'high';

  // Mobile mit niedrigem DPR → low (ältere / Budget-Geräte)
  if (dpr <= 1.5) return 'low';

  // Mobile mit hohem DPR → medium
  return 'medium';
}
