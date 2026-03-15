import type { BoardSquare, ChessGameSnapshot, ChessMove, ChessPieceState } from '../chess/state';

export type PresentationMode = 'board' | 'combat';
export type CombatPresentationPhase = 'intro' | 'attack' | 'impact' | 'resolve' | 'return';

export interface CombatParticipant {
  color: ChessPieceState['color'];
  id: string;
  square: BoardSquare;
  type: ChessPieceState['type'];
}

export interface CombatEvent {
  attacker: CombatParticipant;
  capturedSquare: BoardSquare;
  from: BoardSquare;
  move: ChessMove;
  to: BoardSquare;
  victim: CombatParticipant;
}

export interface PresentationStateSnapshot {
  combatElapsedMs: number;
  combatDurationMs: number | null;
  combatEvent: CombatEvent | null;
  combatPhase: CombatPresentationPhase | null;
  combatPhaseProgress: number;
  combatRemainingMs: number;
  interactionLocked: boolean;
  mode: PresentationMode;
}

export interface PresentationStateMachine {
  advance: (ms: number) => boolean;
  beginCombat: (event: CombatEvent) => boolean;
  clear: () => boolean;
  getSnapshot: () => PresentationStateSnapshot;
  isInteractionLocked: () => boolean;
}

interface CreatePresentationStateMachineOptions {
  combatPhaseDurationsMs?: Partial<Record<CombatPresentationPhase, number>>;
}

const DEFAULT_COMBAT_PHASE_DURATIONS_MS: Readonly<Record<CombatPresentationPhase, number>> = {
  attack: 224,
  impact: 168,
  intro: 168,
  resolve: 196,
  return: 168
};

export function createPresentationStateMachine({
  combatPhaseDurationsMs = {}
}: CreatePresentationStateMachineOptions = {}): PresentationStateMachine {
  const phaseDurations = {
    ...DEFAULT_COMBAT_PHASE_DURATIONS_MS,
    ...combatPhaseDurationsMs
  };
  const combatDurationMs = getTotalCombatDurationMs(phaseDurations);
  let activeEvent: CombatEvent | null = null;
  let elapsedMs = 0;
  let mode: PresentationMode = 'board';
  let remainingMs = 0;

  return {
    advance: (ms) => {
      if (mode !== 'combat') {
        return false;
      }

      const nextRemainingMs = Math.max(remainingMs - Math.max(ms, 0), 0);
      const nextElapsedMs = Math.min(elapsedMs + Math.max(ms, 0), combatDurationMs);

      if (nextRemainingMs === remainingMs && nextElapsedMs === elapsedMs) {
        return false;
      }

      elapsedMs = nextElapsedMs;
      remainingMs = nextRemainingMs;

      if (remainingMs > 0) {
        return true;
      }

      activeEvent = null;
      elapsedMs = 0;
      mode = 'board';
      return true;
    },
    beginCombat: (event) => {
      activeEvent = cloneCombatEvent(event);
      elapsedMs = 0;
      mode = 'combat';
      remainingMs = combatDurationMs;
      return true;
    },
    clear: () => {
      const hadActivePresentation = mode !== 'board' || activeEvent !== null || elapsedMs !== 0 || remainingMs !== 0;

      activeEvent = null;
      elapsedMs = 0;
      mode = 'board';
      remainingMs = 0;

      return hadActivePresentation;
    },
    getSnapshot: () => ({
      combatElapsedMs: mode === 'combat' ? elapsedMs : 0,
      combatDurationMs: mode === 'combat' ? combatDurationMs : null,
      combatEvent: activeEvent ? cloneCombatEvent(activeEvent) : null,
      combatPhase: mode === 'combat' ? getCombatPhaseAtElapsedMs(elapsedMs, phaseDurations) : null,
      combatPhaseProgress: mode === 'combat' ? getCombatPhaseProgress(elapsedMs, phaseDurations) : 0,
      combatRemainingMs: remainingMs,
      interactionLocked: mode === 'combat',
      mode
    }),
    isInteractionLocked: () => mode === 'combat'
  };
}

function getCombatPhaseAtElapsedMs(
  elapsedMs: number,
  phaseDurations: Readonly<Record<CombatPresentationPhase, number>>
): CombatPresentationPhase {
  let startMs = 0;

  for (const phase of getCombatPhaseOrder()) {
    const durationMs = phaseDurations[phase];
    const endMs = startMs + durationMs;

    if (elapsedMs < endMs) {
      return phase;
    }

    startMs = endMs;
  }

  return 'return';
}

function getCombatPhaseProgress(
  elapsedMs: number,
  phaseDurations: Readonly<Record<CombatPresentationPhase, number>>
): number {
  let startMs = 0;

  for (const phase of getCombatPhaseOrder()) {
    const durationMs = phaseDurations[phase];
    const endMs = startMs + durationMs;

    if (elapsedMs < endMs) {
      return durationMs <= 0 ? 1 : (elapsedMs - startMs) / durationMs;
    }

    startMs = endMs;
  }

  return 1;
}

function getCombatPhaseOrder(): CombatPresentationPhase[] {
  return ['intro', 'attack', 'impact', 'resolve', 'return'];
}

function getTotalCombatDurationMs(phaseDurations: Readonly<Record<CombatPresentationPhase, number>>): number {
  return getCombatPhaseOrder().reduce((total, phase) => total + phaseDurations[phase], 0);
}

export function buildCombatEvent(
  previousSnapshot: ChessGameSnapshot,
  nextSnapshot: ChessGameSnapshot
): CombatEvent | null {
  const move = nextSnapshot.lastMove;

  if (!move?.captured || !move.capturedSquare) {
    return null;
  }

  const attackerPiece = nextSnapshot.pieces.find((piece) => piece.square === move.to);
  const victimPiece = previousSnapshot.pieces.find((piece) => piece.square === move.capturedSquare);

  if (!attackerPiece || !victimPiece) {
    return null;
  }

  return {
    attacker: mapCombatParticipant(attackerPiece),
    capturedSquare: move.capturedSquare,
    from: move.from,
    move: { ...move },
    to: move.to,
    victim: mapCombatParticipant(victimPiece)
  };
}

function cloneCombatEvent(event: CombatEvent): CombatEvent {
  return {
    attacker: { ...event.attacker },
    capturedSquare: event.capturedSquare,
    from: event.from,
    move: { ...event.move },
    to: event.to,
    victim: { ...event.victim }
  };
}

function mapCombatParticipant(piece: ChessPieceState): CombatParticipant {
  return {
    color: piece.color,
    id: piece.id,
    square: piece.square,
    type: piece.type
  };
}
