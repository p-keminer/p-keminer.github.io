import * as THREE from 'three';
import {
  createModelResourceDisposer,
  loadRoomAsset,
  ROOM_REFINED_MODEL_FILE,
  type AssetLoadProgressReporter
} from './loaders';
import { loadRoomRedesignLightMap } from './room-quality';

interface RoomAssetLoadOptions {
  skipRefined?: boolean;
  isCancelled?: () => boolean;
  onModelProgress?: AssetLoadProgressReporter;
  onLightMapProgress?: AssetLoadProgressReporter;
}

interface RoomPresentationAssets {
  room: THREE.Group;
  lightMap: THREE.Texture | null;
  displayLut: THREE.Texture | null;
  disposeModel: () => void;
}

/** Load independent room files together; transfer ownership only as a matched set. */
export async function loadRoomPresentationAssets(
  options: RoomAssetLoadOptions = {}
): Promise<RoomPresentationAssets | null> {
  const isCancelled = options.isCancelled ?? (() => false);
  if (isCancelled()) return null;

  const ownedTextures = new Set<THREE.Texture>();
  const lightMaps = new Map<boolean, Promise<THREE.Texture | null>>();
  let displayLutPromise: Promise<THREE.Texture | null> | undefined;
  let disposeModel: (() => void) | undefined;
  let abandoned = false;

  // A request may settle after a fallback or teardown. Its texture still needs
  // releasing, even if nobody awaits that particular speculative request again.
  const trackTexture = (promise: Promise<THREE.Texture | null>): Promise<THREE.Texture | null> =>
    promise.then(texture => {
      if (abandoned || isCancelled()) {
        texture?.dispose();
        return null;
      }
      if (texture) ownedTextures.add(texture);
      return texture;
    });

  const getLightMap = (refined: boolean): Promise<THREE.Texture | null> => {
    let promise = lightMaps.get(refined);
    if (!promise) {
      promise = trackTexture(loadRoomRedesignLightMap(progress => {
        if (!abandoned && !isCancelled()) options.onLightMapProgress?.(progress);
      }, refined).catch(() => null));
      lightMaps.set(refined, promise);
    }
    return promise;
  };

  const getDisplayLut = (): Promise<THREE.Texture | null> => {
    displayLutPromise ??= trackTexture(
      new THREE.TextureLoader().loadAsync('/models/room-agx-look.png?v=1')
        // The LUT remains optional; handle rejection immediately, including
        // when the GLB/atlas are still loading or we fall back to an older room.
        .catch(() => null)
    );
    return displayLutPromise;
  };

  try {
    // Start the expected atlas and look alongside the model/Draco download.
    // The resolved model metadata, not this prediction, selects the final atlas.
    void getLightMap(!options.skipRefined);
    if (!options.skipRefined) void getDisplayLut();

    let skipRefined = options.skipRefined ?? false;
    while (!isCancelled()) {
      const room = await loadRoomAsset(options.onModelProgress, { skipRefined, isCancelled });
      if (!room) return null;
      disposeModel = createModelResourceDisposer(room);
      if (isCancelled()) return null;

      const scale = Number(room.userData.room_lightmap_scale);
      const usesRefinedAtlas = Number.isFinite(scale) && scale > 0;
      const lightMap = await getLightMap(usesRefinedAtlas);
      if (isCancelled()) return null;

      if (!lightMap && !skipRefined && room.userData.roomAssetFile === ROOM_REFINED_MODEL_FILE) {
        // Repacked UV1s require the matching refined atlas. Fall back as a pair.
        disposeModel();
        disposeModel = undefined;
        skipRefined = true;
        continue;
      }

      const displayLut = usesRefinedAtlas && lightMap ? await getDisplayLut() : null;
      if (isCancelled()) return null;

      if (lightMap) ownedTextures.delete(lightMap);
      if (displayLut) ownedTextures.delete(displayLut);
      const result = { room, lightMap, displayLut, disposeModel };
      disposeModel = undefined;
      return result;
    }
    return null;
  } finally {
    abandoned = true;
    disposeModel?.();
    for (const texture of ownedTextures) texture.dispose();
    ownedTextures.clear();
  }
}
