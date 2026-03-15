import * as THREE from 'three';
import type { ChessPieceColor } from '../chess/state';

export const PIECE_MATERIAL_LANGUAGE_ID = 'cyber-mech-zoned-v1';

export interface PieceMaterialSlot {
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness: number;
  roughness: number;
  toneMapped?: boolean;
}

export interface PieceMaterialZonePalette {
  armor: PieceMaterialSlot;
  command: PieceMaterialSlot;
  core: PieceMaterialSlot;
  frame: PieceMaterialSlot;
  sensor: PieceMaterialSlot;
  support: PieceMaterialSlot;
}

export function getPieceMaterialLanguageId(): string {
  return PIECE_MATERIAL_LANGUAGE_ID;
}

export function getCyberMechZonePalette(color: ChessPieceColor): PieceMaterialZonePalette {
  if (color === 'white') {
    return {
      armor: {
        color: '#edf5ff',
        metalness: 0.14,
        roughness: 0.38,
        toneMapped: true
      },
      command: {
        color: '#d99f2f',
        emissive: '#ffba45',
        emissiveIntensity: 0.18,
        metalness: 0.26,
        roughness: 0.24,
        toneMapped: true
      },
      core: {
        color: '#ff607f',
        emissive: '#ff607f',
        emissiveIntensity: 1.05,
        metalness: 0.14,
        roughness: 0.22,
        toneMapped: false
      },
      frame: {
        color: '#43608d',
        metalness: 0.3,
        roughness: 0.3,
        toneMapped: true
      },
      sensor: {
        color: '#53ecff',
        emissive: '#53ecff',
        emissiveIntensity: 1.25,
        metalness: 0.16,
        roughness: 0.2,
        toneMapped: false
      },
      support: {
        color: '#8d9db1',
        metalness: 0.24,
        roughness: 0.42,
        toneMapped: true
      }
    };
  }

  return {
    armor: {
      color: '#181f28',
      metalness: 0.18,
      roughness: 0.34,
      toneMapped: true
    },
    command: {
      color: '#cb922d',
      emissive: '#ffb347',
      emissiveIntensity: 0.18,
      metalness: 0.32,
      roughness: 0.24,
      toneMapped: true
    },
    core: {
      color: '#ff526a',
      emissive: '#ff526a',
      emissiveIntensity: 1.08,
      metalness: 0.16,
      roughness: 0.2,
      toneMapped: false
    },
    frame: {
      color: '#a78535',
      metalness: 0.42,
      roughness: 0.28,
      toneMapped: true
    },
    sensor: {
      color: '#ff3232',
      emissive: '#ff3232',
      emissiveIntensity: 1.25,
      metalness: 0.16,
      roughness: 0.2,
      toneMapped: false
    },
    support: {
      color: '#505d6d',
      metalness: 0.3,
      roughness: 0.4,
      toneMapped: true
    }
  };
}

export function getStarterPieceSlotPalette(color: ChessPieceColor): {
  accent: PieceMaterialSlot;
  body: PieceMaterialSlot;
  trim: PieceMaterialSlot;
} {
  const palette = getCyberMechZonePalette(color);

  return {
    accent: palette.command,
    body: palette.armor,
    trim: palette.frame
  };
}

export function createPlaceholderPieceMaterials(color: ChessPieceColor): {
  accent: THREE.MeshStandardMaterial;
  body: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
} {
  const palette = getStarterPieceSlotPalette(color);

  return {
    accent: createMaterialFromSlot(palette.accent),
    body: createMaterialFromSlot(palette.body),
    trim: createMaterialFromSlot(palette.trim)
  };
}

export function createMaterialFromSlot(slot: PieceMaterialSlot): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ transparent: true });
  applyPieceMaterialSlot(material, slot);
  return material;
}

export function applyPieceMaterialSlot(material: THREE.MeshStandardMaterial, slot: PieceMaterialSlot): void {
  material.color = new THREE.Color(slot.color);
  material.metalness = slot.metalness;
  material.roughness = slot.roughness;
  material.emissive.copy(slot.emissive ? new THREE.Color(slot.emissive) : new THREE.Color(0x000000));
  material.emissiveIntensity = slot.emissiveIntensity ?? 0;
  material.toneMapped = slot.toneMapped ?? true;
  material.transparent = true;
}
