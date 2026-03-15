import type { ChessPieceType } from '../chess/state';

export type CyberMechWeightClass = 'command' | 'elite' | 'heavy' | 'light' | 'precision' | 'striker';

export interface CyberMechStyleProfile {
  energyPulse: number;
  id: ChessPieceType;
  impactRecoil: number;
  label: string;
  mechanicalOvershoot: number;
  preloadAmount: number;
  servoSnap: number;
  settleAmount: number;
  stiffness: number;
  worldStyle: 'cyber-mech';
  weightClass: CyberMechWeightClass;
}

const CYBER_MECH_STYLE_PROFILES: Readonly<Record<ChessPieceType, CyberMechStyleProfile>> = {
  bishop: {
    energyPulse: 0.36,
    id: 'bishop',
    impactRecoil: 0.38,
    label: 'precision servo',
    mechanicalOvershoot: 0.22,
    preloadAmount: 0.62,
    servoSnap: 0.72,
    settleAmount: 0.24,
    stiffness: 0.74,
    weightClass: 'precision',
    worldStyle: 'cyber-mech'
  },
  king: {
    energyPulse: 0.18,
    id: 'king',
    impactRecoil: 0.66,
    label: 'command actuator',
    mechanicalOvershoot: 0.14,
    preloadAmount: 0.9,
    servoSnap: 0.58,
    settleAmount: 0.2,
    stiffness: 0.88,
    weightClass: 'command',
    worldStyle: 'cyber-mech'
  },
  knight: {
    energyPulse: 0.42,
    id: 'knight',
    impactRecoil: 0.54,
    label: 'assault servo',
    mechanicalOvershoot: 0.28,
    preloadAmount: 0.74,
    servoSnap: 0.9,
    settleAmount: 0.3,
    stiffness: 0.62,
    weightClass: 'striker',
    worldStyle: 'cyber-mech'
  },
  pawn: {
    energyPulse: 0.2,
    id: 'pawn',
    impactRecoil: 0.42,
    label: 'scout servo',
    mechanicalOvershoot: 0.16,
    preloadAmount: 0.56,
    servoSnap: 0.64,
    settleAmount: 0.26,
    stiffness: 0.68,
    weightClass: 'light',
    worldStyle: 'cyber-mech'
  },
  queen: {
    energyPulse: 0.4,
    id: 'queen',
    impactRecoil: 0.62,
    label: 'elite servo',
    mechanicalOvershoot: 0.3,
    preloadAmount: 0.82,
    servoSnap: 0.86,
    settleAmount: 0.24,
    stiffness: 0.78,
    weightClass: 'elite',
    worldStyle: 'cyber-mech'
  },
  rook: {
    energyPulse: 0.14,
    id: 'rook',
    impactRecoil: 0.72,
    label: 'fortress actuator',
    mechanicalOvershoot: 0.12,
    preloadAmount: 0.94,
    servoSnap: 0.46,
    settleAmount: 0.16,
    stiffness: 0.9,
    weightClass: 'heavy',
    worldStyle: 'cyber-mech'
  }
};

export function getCyberMechStyleProfile(pieceType: ChessPieceType): CyberMechStyleProfile {
  return CYBER_MECH_STYLE_PROFILES[pieceType];
}

export function sampleCyberMechProgress(progress: number, styleProfile: CyberMechStyleProfile): number {
  const clamped = clamp01(progress);
  const stiffnessExponent = 1 + styleProfile.stiffness * 1.15;
  const stiffened =
    clamped < 0.5
      ? 0.5 * Math.pow(clamped * 2, stiffnessExponent)
      : 1 - 0.5 * Math.pow((1 - clamped) * 2, stiffnessExponent);
  const stepCount = Math.max(3, Math.round(3 + styleProfile.servoSnap * 5));
  const stepped = Math.round(stiffened * stepCount) / stepCount;
  const blend = 0.08 + styleProfile.servoSnap * 0.22;

  return clamp01(lerp(stiffened, stepped, blend));
}

export function sampleCyberMechOvershoot(progress: number, styleProfile: CyberMechStyleProfile): number {
  const clamped = clamp01(progress);

  if (clamped <= 0.72) {
    return 0;
  }

  const tail = (clamped - 0.72) / 0.28;
  return Math.sin(tail * Math.PI) * styleProfile.mechanicalOvershoot;
}

export function sampleCyberMechPulse(progress: number, styleProfile: CyberMechStyleProfile): number {
  return Math.sin(clamp01(progress) * Math.PI) * styleProfile.energyPulse;
}

export function sampleCyberMechSettle(progress: number, styleProfile: CyberMechStyleProfile): number {
  const clamped = clamp01(progress);
  return Math.sin(clamped * Math.PI * 2) * (1 - clamped) * styleProfile.settleAmount;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
