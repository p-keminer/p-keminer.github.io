import * as THREE from 'three';

interface ActiveCaptureAnimation {
  basePosition: THREE.Vector3;
  baseScale: THREE.Vector3;
  elapsedMs: number;
  group: THREE.Group;
  materials: THREE.Material[];
}

export interface CaptureAnimationController {
  animateOut: (pieceId: string, group: THREE.Group, materials: THREE.Material[]) => void;
  clear: () => void;
  getActivePieceIds: () => string[];
  remove: (pieceId: string) => void;
  step: (deltaMs: number) => string[];
}

const CAPTURE_DURATION_MS = 180;

export function createCaptureAnimationController(): CaptureAnimationController {
  const activeAnimations = new Map<string, ActiveCaptureAnimation>();

  return {
    animateOut: (pieceId, group, materials) => {
      const basePosition = group.position.clone();
      const baseScale = group.scale.clone();

      group.scale.copy(baseScale);
      group.position.copy(basePosition);

      for (const material of materials) {
        if ('transparent' in material) {
          material.transparent = true;
        }

        if ('opacity' in material) {
          material.opacity = 1;
        }
      }

      activeAnimations.set(pieceId, {
        basePosition,
        baseScale,
        elapsedMs: 0,
        group,
        materials
      });
    },
    clear: () => {
      activeAnimations.clear();
    },
    getActivePieceIds: () => [...activeAnimations.keys()],
    remove: (pieceId) => {
      activeAnimations.delete(pieceId);
    },
    step: (deltaMs) => {
      const completed: string[] = [];

      for (const [pieceId, animation] of activeAnimations.entries()) {
        animation.elapsedMs = Math.min(animation.elapsedMs + deltaMs, CAPTURE_DURATION_MS);
        const t = animation.elapsedMs / CAPTURE_DURATION_MS;
        const eased = easeOutCubic(t);
        const scale = THREE.MathUtils.lerp(animation.baseScale.x, animation.baseScale.x * 0.42, eased);

        animation.group.scale.setScalar(scale);
        animation.group.position.copy(animation.basePosition);
        animation.group.position.y = animation.basePosition.y + 0.08 + eased * 0.18;

        for (const material of animation.materials) {
          if ('opacity' in material) {
            material.opacity = 1 - eased;
          }
        }

        if (t >= 1) {
          completed.push(pieceId);
          activeAnimations.delete(pieceId);
        }
      }

      return completed;
    }
  };
}

export function getCaptureAnimationDurationMs(): number {
  return CAPTURE_DURATION_MS;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}
