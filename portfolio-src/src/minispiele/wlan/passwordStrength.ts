/**
 * Password strength estimator for the WLAN Security Lab minispiel.
 *
 * Model:
 *   - Charset size based on character classes actually used
 *   - Entropy = length × log₂(charsetSize)
 *   - Attack speed: 1 000 000 guesses/s (WPA2/WPA3 PBKDF2, offline multi-GPU)
 *   - years = 2 ^ (entropy - log₂(guessesPerYear))
 *   - Weak-pattern penalty: drops effective years to near zero regardless of length
 */

export interface StrengthResult {
  years: number;        // estimated brute-force years (may be Infinity)
  yearsLog2: number;    // log₂ of years, useful for progress bar scaling
  label: "Sehr schwach" | "Schwach" | "Mittel" | "Stark" | "Sehr stark";
  color: string;
  progress: number;     // 0–100 for progress bar (log scale)
  isWeakPattern: boolean;
  feedback: string[];
}

// Common weak words/patterns that instantly disqualify a password
const WEAK_PATTERNS = [
  "password", "passwort", "admin", "qwerty", "azerty",
  "12345678", "87654321", "11111111", "00000000", "abc123",
  "letmein", "welcome", "monkey", "dragon", "master", "login",
  "user", "test", "guest", "root",
  "router", "wlan", "wifi", "internet", "network",
  "default", "passw0rd", "p@ssword", "iloveyou", "sunshine",
];

const GUESSES_PER_SECOND = 1_000_000;          // 10⁶/s
const SECONDS_PER_YEAR  = 365.25 * 24 * 3600;  // 31 557 600
const GUESSES_PER_YEAR  = GUESSES_PER_SECOND * SECONDS_PER_YEAR; // ≈ 3.156 × 10¹³

// log₂ of guesses per year
const LOG2_GPY = Math.log2(GUESSES_PER_YEAR); // ≈ 44.84

// Progress bar maps yearsLog₂ from this range to 0–100
const BAR_MIN = -5;  // ≈ 0.03 years  ≈ 11 days
const BAR_MAX = 40;  // ≈ 10¹² years

export function evaluatePassword(pw: string): StrengthResult {
  const feedback: string[] = [];

  // --- Weak-pattern check ---
  const lower = pw.toLowerCase();
  const isWeakPattern = WEAK_PATTERNS.some((p) => lower.includes(p));
  if (isWeakPattern) {
    feedback.push("Enthält bekanntes Wort oder Muster");
  }

  // --- Character classes ---
  const hasLower   = /[a-z]/.test(pw);
  const hasUpper   = /[A-Z]/.test(pw);
  const hasDigit   = /[0-9]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);

  let charset = 0;
  if (hasLower)   charset += 26;
  if (hasUpper)   charset += 26;
  if (hasDigit)   charset += 10;
  if (hasSpecial) charset += 32;
  if (charset === 0) charset = 1;

  // --- Feedback hints ---
  if (!hasUpper)   feedback.push("Großbuchstaben fehlen");
  if (!hasDigit)   feedback.push("Ziffern fehlen");
  if (!hasSpecial) feedback.push("Sonderzeichen fehlen");
  if (pw.length < 12) feedback.push(`Zu kurz (${pw.length} / 12 Zeichen)`);

  // --- Entropy & years ---
  const entropy = pw.length * Math.log2(charset);
  // Weak-pattern: cap years at ~hours so the display reflects the exploit
  const yearsLog2 = isWeakPattern ? -8 : entropy - LOG2_GPY;

  let years: number;
  if (yearsLog2 < -40)   years = 0;
  else if (yearsLog2 > 200) years = Infinity;
  else                   years = Math.pow(2, yearsLog2);

  // --- Progress bar (log scale, clamped 0–100) ---
  const progress = Math.max(
    0,
    Math.min(100, ((yearsLog2 - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100),
  );

  // --- Label & colour ---
  let label: StrengthResult["label"];
  let color: string;

  if (yearsLog2 < 0) {
    label = "Sehr schwach"; color = "#ef4444";
  } else if (yearsLog2 < 10) {
    label = "Schwach";      color = "#f97316";
  } else if (yearsLog2 < 20) {
    label = "Mittel";       color = "#eab308";
  } else if (yearsLog2 < 30) {
    label = "Stark";        color = "#22c55e";
  } else {
    label = "Sehr stark";   color = "#00ccff";
  }

  return { years, yearsLog2, label, color, progress, isWeakPattern, feedback };
}

export function formatCrackTime(years: number): string {
  if (years === 0 || years < 1 / (365.25 * 24 * 60))  return "Sofort";
  if (years < 1 / (365.25 * 24))  return "Minuten";
  if (years < 1 / 365.25)         return "Stunden";
  if (years < 1)                   return "< 1 Jahr";
  if (years < 1_000)               return `${Math.round(years).toLocaleString("de-DE")} Jahre`;
  if (years < 1_000_000)           return `${(years / 1_000).toFixed(0)} K Jahre`;
  if (years < 1e9)                 return `${(years / 1e6).toFixed(1)} Mio. Jahre`;
  if (years < 1e12)                return `${(years / 1e9).toFixed(1)} Mrd. Jahre`;
  return "Praktisch unknackbar";
}
