import * as THREE from 'three';

export interface PieceAnimationSnapshot {
  activeCapturePieceIds: string[];
  activePieceIds: string[];
  captureDurationMs: number | null;
  durationMs: number;
  isAnimating: boolean;
}

export interface PieceAnimationController {
  animateTo: (pieceId: string, group: THREE.Group, targetPosition: THREE.Vector3) => void;
  clear: () => void;
  getSnapshot: () => PieceAnimationSnapshot;
  remove: (pieceId: string) => void;
  snapTo: (pieceId: string, group: THREE.Group, targetPosition: THREE.Vector3) => void;
  step: (deltaMs: number) => void;
}

interface ActivePieceAnimation {
  elapsedMs: number;
  from: THREE.Vector3;
  group: THREE.Group;
  target: THREE.Vector3;
}

const DEFAULT_DURATION_MS = 220;

export function createPieceAnimationController(durationMs = DEFAULT_DURATION_MS): PieceAnimationController {
  const activeAnimations = new Map<string, ActivePieceAnimation>();

  return {
    animateTo: (pieceId, group, targetPosition) => {
      const target = targetPosition.clone();

      if (group.position.distanceToSquared(target) < 0.0001) {
        activeAnimations.delete(pieceId);
        group.position.copy(target);
        return;
      }

      activeAnimations.set(pieceId, {
        elapsedMs: 0,
        from: group.position.clone(),
        group,
        target
      });
    },
    clear: () => {
      activeAnimations.clear();
    },
    getSnapshot: () => ({
      activeCapturePieceIds: [],
      activePieceIds: [...activeAnimations.keys()],
      captureDurationMs: null,
      durationMs,
      isAnimating: activeAnimations.size > 0
    }),
    remove: (pieceId) => {
      activeAnimations.delete(pieceId);
    },
    snapTo: (pieceId, group, targetPosition) => {
      activeAnimations.delete(pieceId);
      group.position.copy(targetPosition);
    },
    step: (deltaMs) => {
      if (activeAnimations.size === 0) {
        return;
      }

      for (const [pieceId, animation] of activeAnimations.entries()) {
        animation.elapsedMs = Math.min(animation.elapsedMs + deltaMs, durationMs);
        const t = animation.elapsedMs / durationMs;
        const eased = easeInOutCubic(t);

        animation.group.position.lerpVectors(animation.from, animation.target, eased);

        if (t >= 1) {
          animation.group.position.copy(animation.target);
          activeAnimations.delete(pieceId);
        }
      }
    }
  };
}

function easeInOutCubic(value: number): number {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - Math.pow(-2 * value + 2, 3) / 2;
}
