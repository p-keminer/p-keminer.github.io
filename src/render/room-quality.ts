import * as THREE from 'three';
import type { AssetLoadProgressReporter } from './loaders';

const ROOM_LIGHTMAP_URL = '/models/room-redesign-lightmap.png?v=27';
const DETAIL_TEXTURE_SIZE = 128;

interface DetailTextureSet {
  normal: THREE.DataTexture;
  roughness: THREE.DataTexture;
}

export interface RoomQualityController {
  apply: (roomRoot: THREE.Object3D, lightMap: THREE.Texture) => number;
  dispose: () => void;
}

export async function loadRoomRedesignLightMap(
  onProgress?: AssetLoadProgressReporter
): Promise<THREE.Texture | null> {
  onProgress?.(0);
  let objectUrl: string | null = null;

  try {
    const fileLoader = new THREE.FileLoader();
    fileLoader.setResponseType('blob');
    const lightMapBlob = await fileLoader.loadAsync(ROOM_LIGHTMAP_URL, event => {
      if (event.total > 0) {
        // Reserve the final six percent for image decoding and texture setup.
        onProgress?.(Math.min(0.94, (event.loaded / event.total) * 0.94));
      }
    }) as unknown as Blob;
    objectUrl = URL.createObjectURL(lightMapBlob);
    const lightMap = await new THREE.TextureLoader().loadAsync(objectUrl);
    lightMap.name = 'room-redesign-lightmap';
    lightMap.flipY = false;
    lightMap.colorSpace = THREE.SRGBColorSpace;
    lightMap.channel = 1;
    lightMap.wrapS = THREE.ClampToEdgeWrapping;
    lightMap.wrapT = THREE.ClampToEdgeWrapping;
    lightMap.minFilter = THREE.LinearMipmapLinearFilter;
    lightMap.magFilter = THREE.LinearFilter;
    onProgress?.(1);
    return lightMap;
  } catch {
    onProgress?.(1);
    return null;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

function seededNoise(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function createDetailTextures(
  kind: 'fabric' | 'plaster' | 'wood',
  repeatX: number,
  repeatY: number
): DetailTextureSet {
  const size = DETAIL_TEXTURE_SIZE;
  const height = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const nx = x / size;
      const ny = y / size;
      const fine = seededNoise(x, y, kind === 'wood' ? 5 : kind === 'fabric' ? 11 : 17);

      if (kind === 'wood') {
        const grain = Math.sin((ny * 13 + Math.sin(nx * 4.5) * 0.55) * Math.PI * 2);
        const pores = Math.sin((ny * 43 + fine * 0.8) * Math.PI * 2) * 0.22;
        height[index] = grain * 0.55 + pores + (fine - 0.5) * 0.18;
      } else if (kind === 'fabric') {
        const weaveX = Math.sin(nx * Math.PI * 54);
        const weaveY = Math.sin(ny * Math.PI * 54);
        height[index] = weaveX * weaveY * 0.45 + (fine - 0.5) * 0.32;
      } else {
        const broad = seededNoise(Math.floor(x / 5), Math.floor(y / 5), 23);
        height[index] = (fine - 0.5) * 0.38 + (broad - 0.5) * 0.62;
      }
    }
  }

  const normalPixels = new Uint8Array(size * size * 4);
  const roughnessPixels = new Uint8Array(size * size * 4);
  const sample = (x: number, y: number): number => {
    const wrappedX = (x + size) % size;
    const wrappedY = (y + size) % size;
    return height[wrappedY * size + wrappedX];
  };
  const normalStrength = kind === 'plaster' ? 1.4 : kind === 'wood' ? 0.9 : 1.1;
  const baseRoughness = kind === 'wood' ? 198 : kind === 'fabric' ? 232 : 220;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const pixelIndex = index * 4;
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * normalStrength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * normalStrength;
      const normal = new THREE.Vector3(-dx, -dy, 1).normalize();
      normalPixels[pixelIndex] = Math.round((normal.x * 0.5 + 0.5) * 255);
      normalPixels[pixelIndex + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      normalPixels[pixelIndex + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      normalPixels[pixelIndex + 3] = 255;

      const variation = THREE.MathUtils.clamp(height[index] * 18, -24, 24);
      const roughness = Math.round(THREE.MathUtils.clamp(baseRoughness + variation, 0, 255));
      roughnessPixels[pixelIndex] = roughness;
      roughnessPixels[pixelIndex + 1] = roughness;
      roughnessPixels[pixelIndex + 2] = roughness;
      roughnessPixels[pixelIndex + 3] = 255;
    }
  }

  const normal = new THREE.DataTexture(normalPixels, size, size, THREE.RGBAFormat);
  normal.name = 'room-' + kind + '-normal';
  normal.colorSpace = THREE.NoColorSpace;
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(repeatX, repeatY);
  normal.needsUpdate = true;

  const roughness = new THREE.DataTexture(roughnessPixels, size, size, THREE.RGBAFormat);
  roughness.name = 'room-' + kind + '-roughness';
  roughness.colorSpace = THREE.NoColorSpace;
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(repeatX, repeatY);
  roughness.needsUpdate = true;

  return { normal, roughness };
}

export function createRoomQualityController(renderer: THREE.WebGLRenderer): RoomQualityController {
  const plaster = createDetailTextures('plaster', 7, 5);
  const wood = createDetailTextures('wood', 4, 10);
  const fabric = createDetailTextures('fabric', 9, 9);
  const detailTextures = [
    plaster.normal,
    plaster.roughness,
    wood.normal,
    wood.roughness,
    fabric.normal,
    fabric.roughness
  ];
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  for (const texture of detailTextures) {
    texture.anisotropy = maxAnisotropy;
  }

  const configuredMaterials = new Set<THREE.MeshStandardMaterial>();
  const lightmappedMaterialCache = new Map<THREE.MeshStandardMaterial, THREE.MeshStandardMaterial>();
  const readableWorkSurfaceMaterialCache = new Map<THREE.MeshStandardMaterial, THREE.MeshStandardMaterial>();
  const ownedMaterials = new Set<THREE.MeshStandardMaterial>();
  let activeLightMap: THREE.Texture | null = null;

  const configureSurface = (material: THREE.MeshStandardMaterial): void => {
    if (configuredMaterials.has(material)) {
      return;
    }

    configuredMaterials.add(material);
    const name = material.name.toLowerCase();

    if (name.includes('warm_plaster')) {
      material.normalMap = plaster.normal;
      material.normalScale.set(0.16, 0.16);
      material.roughnessMap = plaster.roughness;
      material.roughness = 0.94;
    } else if (name.includes('walnut') || name.includes('dark_wood_floor')) {
      material.normalMap = wood.normal;
      material.normalScale.set(0.20, 0.12);
      material.roughnessMap = wood.roughness;
      material.roughness = name.includes('walnut') ? 0.76 : 0.84;
    } else if (
      name.includes('rug') ||
      name.includes('chair_fabric') ||
      name.includes('curtain_fabric')
    ) {
      material.normalMap = fabric.normal;
      material.normalScale.set(0.22, 0.22);
      material.roughnessMap = fabric.roughness;
      material.roughness = 0.98;
    }

    if (name.includes('soft_black')) {
      // The Blender material is nearly black. Lift only its base response so
      // workbench devices keep their silhouette under the web task lights.
      material.color.lerp(new THREE.Color('#344554'), 0.58);
      material.roughness = Math.max(material.roughness, 0.50);
    }

    if (name.includes('lamp_bulb')) {
      material.emissive.set('#ff7a38');
      material.emissiveIntensity = name.includes('glass') ? 1.8 : 6.0;
    }

    if (name.includes('shared_warm_led')) {
      material.color.set('#9b4c22');
      material.emissive.set('#ff9a52');
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 2.0);
      material.roughness = 0.26;
    }

    if (name.includes('metal') || name.includes('soft_black') || name.includes('tool_steel')) {
      material.envMapIntensity = 0.72;
    } else {
      material.envMapIntensity = 0.42;
    }

    material.needsUpdate = true;
  };

  const readableWorkSurfaceMaterial = (
    material: THREE.MeshStandardMaterial
  ): THREE.MeshStandardMaterial => {
    const cached = readableWorkSurfaceMaterialCache.get(material);
    if (cached) {
      return cached;
    }

    configureSurface(material);
    const clone = material.clone();
    const name = material.name.toLowerCase();
    clone.name = material.name + '_ReadableWorkSurface';

    if (name.includes('soft_black')) {
      clone.color.setRGB(0.060, 0.080, 0.105);
    } else if (name.includes('metal') || name.includes('tool_steel')) {
      clone.color.lerp(new THREE.Color('#8397aa'), 0.30);
    } else if (name.includes('mcu')) {
      clone.color.lerp(new THREE.Color('#55b980'), 0.25);
    } else {
      clone.color.multiplyScalar(1.18);
    }

    clone.emissive.copy(clone.color).multiplyScalar(name.includes('soft_black') ? 0.09 : 0.035);
    clone.emissiveIntensity = 1.0;
    clone.envMapIntensity = Math.max(clone.envMapIntensity, 1.05);
    clone.needsUpdate = true;
    configuredMaterials.add(clone);
    readableWorkSurfaceMaterialCache.set(material, clone);
    ownedMaterials.add(clone);
    return clone;
  };

  const lightmappedMaterial = (
    material: THREE.MeshStandardMaterial,
    lightMap: THREE.Texture
  ): THREE.MeshStandardMaterial => {
    const cached = lightmappedMaterialCache.get(material);
    if (cached) {
      return cached;
    }

    configureSurface(material);
    const clone = material.clone();
    clone.name = material.name + '_Lightmapped';
    clone.lightMap = lightMap;
    clone.lightMapIntensity = 1.50;
    clone.needsUpdate = true;
    configuredMaterials.add(clone);
    lightmappedMaterialCache.set(material, clone);
    ownedMaterials.add(clone);
    return clone;
  };

  const apply = (roomRoot: THREE.Object3D, lightMap: THREE.Texture): number => {
    activeLightMap = lightMap;
    lightMap.anisotropy = maxAnisotropy;
    let lightmappedMeshes = 0;

    roomRoot.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          configureSurface(material);
        }
      }

      const needsReadableWorkSurface =
        /^(Prototype_|Printer_|Keyboard_|Mouse(?:_|$)|Desk_Input_Mat$)/.test(node.name);
      if (needsReadableWorkSurface) {
        node.material = Array.isArray(node.material)
          ? node.material.map((material) =>
              material instanceof THREE.MeshStandardMaterial &&
              !material.name.toLowerCase().includes('screen')
                ? readableWorkSurfaceMaterial(material)
                : material
            )
          : node.material instanceof THREE.MeshStandardMaterial &&
              !node.material.name.toLowerCase().includes('screen')
            ? readableWorkSurfaceMaterial(node.material)
            : node.material;
      }

      if (!node.geometry.getAttribute('uv1')) {
        return;
      }

      node.material = Array.isArray(node.material)
        ? node.material.map((material) =>
            material instanceof THREE.MeshStandardMaterial
              ? lightmappedMaterial(material, lightMap)
              : material
          )
        : node.material instanceof THREE.MeshStandardMaterial
          ? lightmappedMaterial(node.material, lightMap)
          : node.material;
      lightmappedMeshes += 1;
    });

    return lightmappedMeshes;
  };

  const dispose = (): void => {
    activeLightMap?.dispose();
    for (const texture of detailTextures) {
      texture.dispose();
    }
    for (const material of ownedMaterials) {
      material.dispose();
    }
    configuredMaterials.clear();
    lightmappedMaterialCache.clear();
    readableWorkSurfaceMaterialCache.clear();
    ownedMaterials.clear();
    activeLightMap = null;
  };

  return { apply, dispose };
}
