import type { CombatCueTuning } from '../app/combat-flavor';

export type SoundEventKey =
  | 'capture'
  | 'check'
  | 'combat_attack'
  | 'combat_impact'
  | 'combat_intro'
  | 'combat_resolve'
  | 'combat_return'
  | 'move';

export interface SoundStateSnapshot {
  lastEvent: SoundEventKey | null;
}

export interface SoundController {
  getSnapshot: () => SoundStateSnapshot;
  playCapture: () => void;
  playCheck: () => void;
  playCombatAttack: (tuning?: CombatCueTuning) => void;
  playCombatImpact: (tuning?: CombatCueTuning) => void;
  playCombatIntro: (tuning?: CombatCueTuning) => void;
  playCombatResolve: (tuning?: CombatCueTuning) => void;
  playCombatReturn: (tuning?: CombatCueTuning) => void;
  playMove: () => void;
  stopAll: () => void;
}

export function createSoundController(): SoundController {
  let audioContext: AudioContext | null = null;
  const activeOscillators = new Set<OscillatorNode>();
  const activeGainNodes = new Set<GainNode>();
  let lastEvent: SoundEventKey | null = null;

  return {
    getSnapshot: () => ({ lastEvent }),
    playCapture: () => {
      lastEvent = 'capture';
      playSequence([
        { duration: 0.06, frequency: 220, type: 'triangle', volume: 0.035 },
        { delay: 0.05, duration: 0.08, frequency: 164, type: 'square', volume: 0.03 }
      ]);
    },
    playCheck: () => {
      lastEvent = 'check';
      playSequence([
        { duration: 0.05, frequency: 740, type: 'triangle', volume: 0.024 },
        { delay: 0.04, duration: 0.08, frequency: 988, type: 'triangle', volume: 0.018 }
      ]);
    },
    playCombatAttack: (tuning) => {
      lastEvent = 'combat_attack';
      playSequence(applyCueTuning([
        { duration: 0.09, frequency: 182, frequencyEnd: 254, type: 'sawtooth', volume: 0.018 },
        { delay: 0.03, duration: 0.06, frequency: 286, frequencyEnd: 232, type: 'triangle', volume: 0.012 }
      ], tuning));
    },
    playCombatImpact: (tuning) => {
      lastEvent = 'combat_impact';
      playSequence(applyCueTuning([
        { duration: 0.05, frequency: 228, frequencyEnd: 172, type: 'square', volume: 0.024 },
        { delay: 0.012, duration: 0.045, frequency: 1240, frequencyEnd: 860, type: 'triangle', volume: 0.014 }
      ], tuning));
    },
    playCombatIntro: (tuning) => {
      lastEvent = 'combat_intro';
      playSequence(applyCueTuning([
        { duration: 0.05, frequency: 612, frequencyEnd: 804, type: 'triangle', volume: 0.014 },
        { delay: 0.052, duration: 0.035, frequency: 954, frequencyEnd: 892, type: 'sine', volume: 0.01 }
      ], tuning));
    },
    playCombatResolve: (tuning) => {
      lastEvent = 'combat_resolve';
      playSequence(applyCueTuning([
        { duration: 0.12, frequency: 264, frequencyEnd: 96, type: 'sawtooth', volume: 0.016 },
        { delay: 0.024, duration: 0.085, frequency: 142, frequencyEnd: 84, type: 'triangle', volume: 0.01 }
      ], tuning));
    },
    playCombatReturn: (tuning) => {
      lastEvent = 'combat_return';
      playSequence(
        applyCueTuning([{ duration: 0.045, frequency: 324, frequencyEnd: 242, type: 'triangle', volume: 0.012 }], tuning)
      );
    },
    playMove: () => {
      lastEvent = 'move';
      playSequence([{ duration: 0.07, frequency: 392, type: 'triangle', volume: 0.025 }]);
    },
    stopAll: () => {
      if (!audioContext) {
        activeOscillators.clear();
        activeGainNodes.clear();
        return;
      }

      const stopTime = audioContext.currentTime + 0.01;

      for (const gainNode of activeGainNodes) {
        try {
          gainNode.gain.cancelScheduledValues(stopTime);
          gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), stopTime);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.02);
        } catch {
          // Ignore best-effort stop errors from browsers with stricter scheduling rules.
        }
      }

      for (const oscillator of activeOscillators) {
        try {
          oscillator.stop(stopTime + 0.03);
        } catch {
          // Oscillators may already be stopped.
        }
      }
    }
  };

  function ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
      return null;
    }

    try {
      if (!audioContext) {
        audioContext = new window.AudioContext();
      }

      if (audioContext.state === 'suspended') {
        void audioContext.resume().catch(() => undefined);
      }

      return audioContext;
    } catch {
      return null;
    }
  }

  function playSequence(
    steps: SoundSequenceStep[]
  ): void {
    const context = ensureAudioContext();

    if (!context) {
      return;
    }

    const baseTime = context.currentTime + 0.01;

    for (const step of steps) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startTime = baseTime + (step.delay ?? 0);
      const endTime = startTime + step.duration;

      oscillator.type = step.type;
      oscillator.frequency.setValueAtTime(step.frequency, startTime);

      if (typeof step.frequencyEnd === 'number') {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(step.frequencyEnd, 0.001), endTime);
      }

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(step.volume, startTime + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      activeOscillators.add(oscillator);
      activeGainNodes.add(gainNode);
      oscillator.addEventListener(
        'ended',
        () => {
          activeOscillators.delete(oscillator);
          activeGainNodes.delete(gainNode);
          oscillator.disconnect();
          gainNode.disconnect();
        },
        { once: true }
      );

      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
    }
  }

  function applyCueTuning(
    steps: SoundSequenceStep[],
    tuning: CombatCueTuning | undefined
  ): SoundSequenceStep[] {
    if (!tuning) {
      return steps;
    }

    return steps.map((step, index) => ({
      ...step,
      delay: typeof step.delay === 'number' ? step.delay * tuning.delayScale : step.delay,
      duration: step.duration * tuning.durationScale,
      frequency: step.frequency * (index === 0 ? tuning.primaryFrequencyScale : tuning.secondaryFrequencyScale),
      frequencyEnd:
        typeof step.frequencyEnd === 'number'
          ? step.frequencyEnd * (index === 0 ? tuning.primaryFrequencyScale : tuning.secondaryFrequencyScale)
          : step.frequencyEnd,
      volume: step.volume * tuning.volumeScale
    }));
  }
}

interface SoundSequenceStep {
  delay?: number;
  duration: number;
  frequency: number;
  frequencyEnd?: number;
  type: OscillatorType;
  volume: number;
}
