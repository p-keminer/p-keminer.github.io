import { getCombatFlavorProfile } from '../app/combat-flavor';
import type { CombatPresentationPhase, PresentationStateSnapshot } from '../app/combat';
import type { SoundController } from './sound';

export type CombatSfxCue = 'attackServo' | 'impactHit' | 'introPrime' | 'resolveShutdown' | 'returnReset';

export interface CombatSfxSnapshot {
  activeCue: CombatSfxCue | null;
  attackerFlavorLabel: string | null;
  lastCue: CombatSfxCue | null;
  phase: CombatPresentationPhase | null;
  victimFlavorLabel: string | null;
}

export interface CombatSfxController {
  clear: (options?: { stopAudio?: boolean }) => CombatSfxSnapshot;
  getSnapshot: () => CombatSfxSnapshot;
  syncState: (snapshot: PresentationStateSnapshot) => boolean;
}

interface CreateCombatSfxControllerOptions {
  soundController: SoundController;
}

export function createCombatSfxController({
  soundController
}: CreateCombatSfxControllerOptions): CombatSfxController {
  let activeCue: CombatSfxCue | null = null;
  let activeEventKey: string | null = null;
  let activePhase: CombatPresentationPhase | null = null;
  let attackerFlavorLabel: string | null = null;
  let lastCue: CombatSfxCue | null = null;
  let victimFlavorLabel: string | null = null;

  return {
    clear: ({ stopAudio = false } = {}) => {
      const snapshot = getSnapshot(activeCue, activePhase, lastCue, attackerFlavorLabel, victimFlavorLabel);

      if (stopAudio) {
        soundController.stopAll();
      }

      activeCue = null;
      activeEventKey = null;
      activePhase = null;
      attackerFlavorLabel = null;
      victimFlavorLabel = null;
      return snapshot;
    },
    getSnapshot: () => getSnapshot(activeCue, activePhase, lastCue, attackerFlavorLabel, victimFlavorLabel),
    syncState: (snapshot) => {
      if (snapshot.mode !== 'combat' || !snapshot.combatEvent || !snapshot.combatPhase) {
        const hadActiveCue = activeCue !== null || activePhase !== null || activeEventKey !== null;
        activeCue = null;
        activeEventKey = null;
        activePhase = null;
        attackerFlavorLabel = null;
        victimFlavorLabel = null;
        return hadActiveCue;
      }

      const nextEventKey = getCombatEventKey(snapshot);
      const phaseDidChange = activeEventKey !== nextEventKey || activePhase !== snapshot.combatPhase;

      activeEventKey = nextEventKey;
      activePhase = snapshot.combatPhase;

      if (!phaseDidChange) {
        return false;
      }

      activeCue = getCueForPhase(snapshot.combatPhase);
      attackerFlavorLabel = getCombatFlavorProfile(snapshot.combatEvent.attacker.type).label;
      victimFlavorLabel = getCombatFlavorProfile(snapshot.combatEvent.victim.type).label;
      lastCue = activeCue;
      playCue(soundController, snapshot, activeCue);
      return true;
    }
  };
}

function getCueForPhase(phase: CombatPresentationPhase): CombatSfxCue {
  if (phase === 'intro') {
    return 'introPrime';
  }

  if (phase === 'attack') {
    return 'attackServo';
  }

  if (phase === 'impact') {
    return 'impactHit';
  }

  if (phase === 'resolve') {
    return 'resolveShutdown';
  }

  return 'returnReset';
}

function playCue(soundController: SoundController, snapshot: PresentationStateSnapshot, cue: CombatSfxCue): void {
  const attackerFlavor = snapshot.combatEvent ? getCombatFlavorProfile(snapshot.combatEvent.attacker.type) : null;
  const victimFlavor = snapshot.combatEvent ? getCombatFlavorProfile(snapshot.combatEvent.victim.type) : null;

  if (cue === 'introPrime') {
    soundController.playCombatIntro(attackerFlavor?.sfx.intro);
    return;
  }

  if (cue === 'attackServo') {
    soundController.playCombatAttack(attackerFlavor?.sfx.attack);
    return;
  }

  if (cue === 'impactHit') {
    soundController.playCombatImpact(victimFlavor?.sfx.impact ?? attackerFlavor?.sfx.impact);
    return;
  }

  if (cue === 'resolveShutdown') {
    soundController.playCombatResolve(victimFlavor?.sfx.resolve);
    return;
  }

  soundController.playCombatReturn(attackerFlavor?.sfx.return);
}

function getCombatEventKey(snapshot: PresentationStateSnapshot): string {
  const event = snapshot.combatEvent;

  if (!event) {
    return 'none';
  }

  return `${event.attacker.id}-${event.attacker.type}-${event.victim.id}-${event.victim.type}-${event.from}-${event.to}-${event.capturedSquare}`;
}

function getSnapshot(
  activeCue: CombatSfxCue | null,
  phase: CombatPresentationPhase | null,
  lastCue: CombatSfxCue | null,
  attackerFlavorLabel: string | null,
  victimFlavorLabel: string | null
): CombatSfxSnapshot {
  return {
    activeCue,
    attackerFlavorLabel,
    lastCue,
    phase,
    victimFlavorLabel
  };
}
