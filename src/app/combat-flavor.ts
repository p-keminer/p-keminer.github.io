import type { ChessPieceType } from '../chess/state';

export interface CombatCueTuning {
  delayScale: number;
  durationScale: number;
  primaryFrequencyScale: number;
  secondaryFrequencyScale: number;
  volumeScale: number;
}

export interface CombatRenderFlavorProfile {
  corePulseLift: number;
  corePulseOpacity: number;
  corePulseScale: number;
  impactFlashStrength: number;
  impactPulseOpacity: number;
  impactPulseScale: number;
  servoOpacity: number;
  servoScale: number;
  servoSpin: number;
  shutdownFlicker: number;
  shutdownOpacity: number;
  shutdownScale: number;
  shutdownSignalStrength: number;
  sparkCount: number;
  sparkLengthScale: number;
  sparkOpacity: number;
  sparkRotationSpeed: number;
  sparkSpread: number;
}

export interface CombatFlavorProfile {
  id: ChessPieceType;
  label: string;
  render: CombatRenderFlavorProfile;
  sfx: {
    attack: CombatCueTuning;
    impact: CombatCueTuning;
    intro: CombatCueTuning;
    resolve: CombatCueTuning;
    return: CombatCueTuning;
  };
}

const COMBAT_FLAVOR_PROFILES: Readonly<Record<ChessPieceType, CombatFlavorProfile>> = {
  bishop: {
    id: 'bishop',
    label: 'precision energy unit',
    render: {
      corePulseLift: 0.56,
      corePulseOpacity: 0.9,
      corePulseScale: 1.06,
      impactFlashStrength: 0.9,
      impactPulseOpacity: 0.84,
      impactPulseScale: 0.82,
      servoOpacity: 0.74,
      servoScale: 0.84,
      servoSpin: 1.06,
      shutdownFlicker: 0.88,
      shutdownOpacity: 0.74,
      shutdownScale: 0.9,
      shutdownSignalStrength: 0.86,
      sparkCount: 2,
      sparkLengthScale: 0.7,
      sparkOpacity: 0.48,
      sparkRotationSpeed: 0.24,
      sparkSpread: 0.62
    },
    sfx: {
      attack: createCueTuning(1.04, 1.18, 0.9, 0.92, 0.84),
      impact: createCueTuning(1.08, 1.28, 0.9, 0.88, 0.86),
      intro: createCueTuning(1.06, 1.14, 0.88, 0.94, 0.84),
      resolve: createCueTuning(1.02, 1.14, 0.92, 0.9, 0.82),
      return: createCueTuning(1.04, 1.12, 0.9, 0.9, 0.82)
    }
  },
  king: {
    id: 'king',
    label: 'command unit',
    render: {
      corePulseLift: 0.5,
      corePulseOpacity: 0.72,
      corePulseScale: 0.92,
      impactFlashStrength: 0.86,
      impactPulseOpacity: 0.8,
      impactPulseScale: 1,
      servoOpacity: 0.72,
      servoScale: 1.08,
      servoSpin: 0.72,
      shutdownFlicker: 0.78,
      shutdownOpacity: 0.88,
      shutdownScale: 1.08,
      shutdownSignalStrength: 0.92,
      sparkCount: 2,
      sparkLengthScale: 0.9,
      sparkOpacity: 0.56,
      sparkRotationSpeed: 0.18,
      sparkSpread: 0.74
    },
    sfx: {
      attack: createCueTuning(0.88, 0.92, 1.08, 1.12, 0.92),
      impact: createCueTuning(0.82, 0.9, 1.12, 1.04, 0.96),
      intro: createCueTuning(0.84, 0.9, 1.08, 1.06, 0.88),
      resolve: createCueTuning(0.74, 0.82, 1.14, 1.06, 0.92),
      return: createCueTuning(0.88, 0.9, 1.04, 1.02, 0.86)
    }
  },
  knight: {
    id: 'knight',
    label: 'agile strike unit',
    render: {
      corePulseLift: 0.52,
      corePulseOpacity: 0.96,
      corePulseScale: 1.04,
      impactFlashStrength: 0.9,
      impactPulseOpacity: 0.9,
      impactPulseScale: 0.9,
      servoOpacity: 0.98,
      servoScale: 0.92,
      servoSpin: 1.88,
      shutdownFlicker: 1.18,
      shutdownOpacity: 0.84,
      shutdownScale: 0.92,
      shutdownSignalStrength: 0.84,
      sparkCount: 3,
      sparkLengthScale: 0.94,
      sparkOpacity: 0.9,
      sparkRotationSpeed: 0.5,
      sparkSpread: 1.12
    },
    sfx: {
      attack: createCueTuning(1.18, 1.22, 0.84, 0.84, 0.96),
      impact: createCueTuning(1.12, 1.28, 0.82, 0.82, 0.92),
      intro: createCueTuning(1.12, 1.22, 0.86, 0.84, 0.9),
      resolve: createCueTuning(1.08, 1.12, 0.88, 0.86, 0.84),
      return: createCueTuning(1.14, 1.18, 0.82, 0.84, 0.86)
    }
  },
  pawn: {
    id: 'pawn',
    label: 'scout unit',
    render: {
      corePulseLift: 0.52,
      corePulseOpacity: 0.82,
      corePulseScale: 0.84,
      impactFlashStrength: 0.8,
      impactPulseOpacity: 0.8,
      impactPulseScale: 0.84,
      servoOpacity: 0.84,
      servoScale: 0.88,
      servoSpin: 1.36,
      shutdownFlicker: 1.04,
      shutdownOpacity: 0.8,
      shutdownScale: 0.84,
      shutdownSignalStrength: 0.78,
      sparkCount: 2,
      sparkLengthScale: 0.78,
      sparkOpacity: 0.74,
      sparkRotationSpeed: 0.36,
      sparkSpread: 0.86
    },
    sfx: {
      attack: createCueTuning(1.1, 1.12, 0.84, 0.84, 0.82),
      impact: createCueTuning(1.1, 1.16, 0.82, 0.8, 0.82),
      intro: createCueTuning(1.08, 1.12, 0.82, 0.8, 0.8),
      resolve: createCueTuning(1.04, 1.08, 0.86, 0.84, 0.78),
      return: createCueTuning(1.1, 1.08, 0.82, 0.82, 0.78)
    }
  },
  queen: {
    id: 'queen',
    label: 'elite dominant unit',
    render: {
      corePulseLift: 0.54,
      corePulseOpacity: 1,
      corePulseScale: 1.2,
      impactFlashStrength: 1.08,
      impactPulseOpacity: 1.02,
      impactPulseScale: 1.12,
      servoOpacity: 0.92,
      servoScale: 1,
      servoSpin: 1.46,
      shutdownFlicker: 1.02,
      shutdownOpacity: 0.9,
      shutdownScale: 0.98,
      shutdownSignalStrength: 0.9,
      sparkCount: 4,
      sparkLengthScale: 0.96,
      sparkOpacity: 0.86,
      sparkRotationSpeed: 0.4,
      sparkSpread: 0.96
    },
    sfx: {
      attack: createCueTuning(1.08, 1.14, 0.96, 0.96, 1.06),
      impact: createCueTuning(1.06, 1.18, 0.96, 0.92, 1.08),
      intro: createCueTuning(1.08, 1.12, 0.94, 0.96, 1),
      resolve: createCueTuning(1.02, 1.1, 0.98, 0.94, 0.96),
      return: createCueTuning(1.04, 1.1, 0.96, 0.96, 0.94)
    }
  },
  rook: {
    id: 'rook',
    label: 'fortress unit',
    render: {
      corePulseLift: 0.48,
      corePulseOpacity: 0.74,
      corePulseScale: 0.94,
      impactFlashStrength: 1.02,
      impactPulseOpacity: 1,
      impactPulseScale: 1.28,
      servoOpacity: 0.72,
      servoScale: 1.14,
      servoSpin: 0.58,
      shutdownFlicker: 0.74,
      shutdownOpacity: 0.98,
      shutdownScale: 1.12,
      shutdownSignalStrength: 0.98,
      sparkCount: 3,
      sparkLengthScale: 1.22,
      sparkOpacity: 0.78,
      sparkRotationSpeed: 0.16,
      sparkSpread: 0.82
    },
    sfx: {
      attack: createCueTuning(0.82, 0.78, 1.18, 1.14, 1.04),
      impact: createCueTuning(0.78, 0.72, 1.2, 1.12, 1.12),
      intro: createCueTuning(0.86, 0.82, 1.16, 1.1, 0.94),
      resolve: createCueTuning(0.78, 0.74, 1.22, 1.14, 0.98),
      return: createCueTuning(0.86, 0.82, 1.14, 1.1, 0.9)
    }
  }
};

export function getCombatFlavorProfile(pieceType: ChessPieceType): CombatFlavorProfile {
  return COMBAT_FLAVOR_PROFILES[pieceType];
}

function createCueTuning(
  primaryFrequencyScale: number,
  secondaryFrequencyScale: number,
  durationScale: number,
  delayScale: number,
  volumeScale: number
): CombatCueTuning {
  return {
    delayScale,
    durationScale,
    primaryFrequencyScale,
    secondaryFrequencyScale,
    volumeScale
  };
}
