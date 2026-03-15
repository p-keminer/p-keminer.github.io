import type { ChessPieceType } from '../chess/state';

export type CombatMotionCurve = 'easeInOut' | 'easeOut' | 'glide' | 'heavy' | 'leap' | 'linear' | 'snap';

export interface CombatMotionPhasePoseProfile {
  curve: CombatMotionCurve;
  pitch: number;
  roll: number;
  tempo: number;
}

export interface CombatMotionProfile {
  attack: CombatMotionPhasePoseProfile & {
    lift: number;
    overshootDistance: number;
    scaleTo: number;
    sideArc: number;
    strikeDistance: number;
  };
  id: ChessPieceType;
  impact: CombatMotionPhasePoseProfile & {
    recoilDistance: number;
    recoilLift: number;
    victimKickDistance: number;
    victimKickHeight: number;
    victimScaleTo: number;
  };
  intro: CombatMotionPhasePoseProfile & {
    lift: number;
    scaleTo: number;
    windupDistance: number;
  };
  label: string;
  motionStyle: string;
  resolve: CombatMotionPhasePoseProfile & {
    attackerLift: number;
    victimDriftDistance: number;
    victimDriftHeight: number;
    victimScaleTo: number;
  };
  return: CombatMotionPhasePoseProfile & {
    lift: number;
  };
}

const COMBAT_MOTION_PROFILES: Readonly<Record<ChessPieceType, CombatMotionProfile>> = {
  bishop: {
    attack: {
      curve: 'glide',
      lift: 0.15,
      overshootDistance: 0.05,
      pitch: -0.06,
      roll: 0.16,
      scaleTo: 1.02,
      sideArc: 0.14,
      strikeDistance: 0.8,
      tempo: 1.08
    },
    id: 'bishop',
    impact: {
      curve: 'glide',
      pitch: -0.2,
      recoilDistance: 0.06,
      recoilLift: 0.05,
      roll: 0.26,
      tempo: 1.02,
      victimKickDistance: 0.13,
      victimKickHeight: 0.09,
      victimScaleTo: 0.86
    },
    intro: {
      curve: 'glide',
      lift: 0.035,
      pitch: -0.06,
      roll: 0.09,
      scaleTo: 0.98,
      tempo: 1.12,
      windupDistance: 0.21
    },
    label: 'bishop glide',
    motionStyle: 'diagonal-glide',
    resolve: {
      attackerLift: 0.04,
      curve: 'glide',
      pitch: -0.02,
      roll: 0.03,
      tempo: 1.06,
      victimDriftDistance: 0.2,
      victimDriftHeight: 0.24,
      victimScaleTo: 0.2
    },
    return: {
      curve: 'glide',
      lift: 0.02,
      pitch: 0,
      roll: 0,
      tempo: 1.08
    }
  },
  king: {
    attack: {
      curve: 'heavy',
      lift: 0.05,
      overshootDistance: 0.03,
      pitch: -0.14,
      roll: 0.08,
      scaleTo: 1.04,
      sideArc: 0.01,
      strikeDistance: 0.68,
      tempo: 1.34
    },
    id: 'king',
    impact: {
      curve: 'heavy',
      pitch: -0.18,
      recoilDistance: 0.05,
      recoilLift: 0.045,
      roll: 0.24,
      tempo: 1.18,
      victimKickDistance: 0.14,
      victimKickHeight: 0.08,
      victimScaleTo: 0.88
    },
    intro: {
      curve: 'heavy',
      lift: 0.028,
      pitch: -0.13,
      roll: 0.06,
      scaleTo: 0.985,
      tempo: 1.38,
      windupDistance: 0.3
    },
    label: 'king shove',
    motionStyle: 'command-shove',
    resolve: {
      attackerLift: 0.03,
      curve: 'heavy',
      pitch: -0.02,
      roll: 0.015,
      tempo: 1.16,
      victimDriftDistance: 0.16,
      victimDriftHeight: 0.2,
      victimScaleTo: 0.23
    },
    return: {
      curve: 'heavy',
      lift: 0.015,
      pitch: 0,
      roll: 0,
      tempo: 1.18
    }
  },
  knight: {
    attack: {
      curve: 'leap',
      lift: 0.36,
      overshootDistance: 0.1,
      pitch: -0.24,
      roll: 0.18,
      scaleTo: 1.08,
      sideArc: 0.18,
      strikeDistance: 0.84,
      tempo: 0.74
    },
    id: 'knight',
    impact: {
      curve: 'snap',
      pitch: -0.3,
      recoilDistance: 0.11,
      recoilLift: 0.12,
      roll: 0.42,
      tempo: 0.8,
      victimKickDistance: 0.18,
      victimKickHeight: 0.16,
      victimScaleTo: 0.82
    },
    intro: {
      curve: 'easeInOut',
      lift: 0.045,
      pitch: -0.16,
      roll: 0.12,
      scaleTo: 0.97,
      tempo: 0.88,
      windupDistance: 0.24
    },
    label: 'knight leap',
    motionStyle: 'jump-dash',
    resolve: {
      attackerLift: 0.075,
      curve: 'easeOut',
      pitch: -0.02,
      roll: 0.04,
      tempo: 0.86,
      victimDriftDistance: 0.22,
      victimDriftHeight: 0.3,
      victimScaleTo: 0.18
    },
    return: {
      curve: 'easeOut',
      lift: 0.03,
      pitch: 0,
      roll: 0,
      tempo: 0.9
    }
  },
  pawn: {
    attack: {
      curve: 'snap',
      lift: 0.05,
      overshootDistance: 0.015,
      pitch: -0.1,
      roll: 0.07,
      scaleTo: 1.015,
      sideArc: 0,
      strikeDistance: 0.63,
      tempo: 0.72
    },
    id: 'pawn',
    impact: {
      curve: 'linear',
      pitch: -0.15,
      recoilDistance: 0.05,
      recoilLift: 0.04,
      roll: 0.22,
      tempo: 0.82,
      victimKickDistance: 0.12,
      victimKickHeight: 0.07,
      victimScaleTo: 0.87
    },
    intro: {
      curve: 'snap',
      lift: 0.025,
      pitch: -0.08,
      roll: 0.06,
      scaleTo: 0.988,
      tempo: 0.8,
      windupDistance: 0.14
    },
    label: 'pawn thrust',
    motionStyle: 'direct-stab',
    resolve: {
      attackerLift: 0.025,
      curve: 'easeOut',
      pitch: 0,
      roll: 0,
      tempo: 0.9,
      victimDriftDistance: 0.16,
      victimDriftHeight: 0.19,
      victimScaleTo: 0.24
    },
    return: {
      curve: 'easeOut',
      lift: 0.012,
      pitch: 0,
      roll: 0,
      tempo: 0.95
    }
  },
  queen: {
    attack: {
      curve: 'snap',
      lift: 0.26,
      overshootDistance: 0.1,
      pitch: -0.2,
      roll: 0.2,
      scaleTo: 1.09,
      sideArc: 0.08,
      strikeDistance: 0.9,
      tempo: 0.7
    },
    id: 'queen',
    impact: {
      curve: 'snap',
      pitch: -0.32,
      recoilDistance: 0.09,
      recoilLift: 0.08,
      roll: 0.4,
      tempo: 0.76,
      victimKickDistance: 0.2,
      victimKickHeight: 0.14,
      victimScaleTo: 0.78
    },
    intro: {
      curve: 'easeOut',
      lift: 0.05,
      pitch: -0.12,
      roll: 0.14,
      scaleTo: 0.97,
      tempo: 0.84,
      windupDistance: 0.3
    },
    label: 'queen lunge',
    motionStyle: 'dominant-lunge',
    resolve: {
      attackerLift: 0.06,
      curve: 'easeOut',
      pitch: -0.02,
      roll: 0.05,
      tempo: 0.84,
      victimDriftDistance: 0.24,
      victimDriftHeight: 0.3,
      victimScaleTo: 0.14
    },
    return: {
      curve: 'easeOut',
      lift: 0.022,
      pitch: 0,
      roll: 0,
      tempo: 0.9
    }
  },
  rook: {
    attack: {
      curve: 'heavy',
      lift: 0.015,
      overshootDistance: 0.08,
      pitch: -0.16,
      roll: 0.04,
      scaleTo: 1.05,
      sideArc: 0,
      strikeDistance: 0.8,
      tempo: 1.42
    },
    id: 'rook',
    impact: {
      curve: 'heavy',
      pitch: -0.1,
      recoilDistance: 0.03,
      recoilLift: 0.015,
      roll: 0.16,
      tempo: 1.26,
      victimKickDistance: 0.09,
      victimKickHeight: 0.035,
      victimScaleTo: 0.92
    },
    intro: {
      curve: 'heavy',
      lift: 0.012,
      pitch: -0.06,
      roll: 0.03,
      scaleTo: 0.98,
      tempo: 1.5,
      windupDistance: 0.36
    },
    label: 'rook drive',
    motionStyle: 'heavy-ram',
    resolve: {
      attackerLift: 0.006,
      curve: 'heavy',
      pitch: -0.02,
      roll: 0,
      tempo: 1.2,
      victimDriftDistance: 0.11,
      victimDriftHeight: 0.16,
      victimScaleTo: 0.3
    },
    return: {
      curve: 'heavy',
      lift: 0.004,
      pitch: 0,
      roll: 0,
      tempo: 1.22
    }
  }
};

export function getCombatMotionProfile(pieceType: ChessPieceType): CombatMotionProfile {
  return COMBAT_MOTION_PROFILES[pieceType];
}

export function sampleCombatPhaseProgress(phaseProfile: CombatMotionPhasePoseProfile, progress: number): number {
  const curved = sampleCombatMotionCurve(phaseProfile.curve, progress);
  return clamp01(Math.pow(curved, phaseProfile.tempo));
}

export function sampleCombatMotionCurve(curve: CombatMotionCurve, progress: number): number {
  const t = clamp01(progress);

  switch (curve) {
    case 'easeOut':
      return 1 - Math.pow(1 - t, 3);
    case 'glide':
      return t * t * (3 - 2 * t);
    case 'heavy':
      return Math.pow(t, 1.8);
    case 'leap':
      return Math.sin((t * Math.PI) / 2);
    case 'snap':
      return t < 0.3 ? (t / 0.3) * 0.16 : 0.16 + Math.pow((t - 0.3) / 0.7, 0.65) * 0.84;
    case 'linear':
      return t;
    default:
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
