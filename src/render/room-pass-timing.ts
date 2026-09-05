import * as THREE from 'three';
import type { BloomPassName } from './bloom';
import type { createRoomRenderTiming, RoomRenderFrameInfo } from './room-render-timing';

type Target = Parameters<THREE.WebGLRenderer['setRenderTarget']>[0];

/** DEV diagnostics for this project's Three r183 pipeline; never nests GPU queries. */
export function profileRoomPasses(
  renderer: THREE.WebGLRenderer,
  timing: ReturnType<typeof createRoomRenderTiming>,
  info: RoomRenderFrameInfo,
  render: (onPass: (pass: BloomPassName) => void) => void,
): void {
  const originalSetter = renderer.setRenderTarget;
  let activePass: BloomPassName | null = null;
  let sceneTarget: Target = null;
  let sceneTargetSeen = false;
  let transmissionTarget: Target = null;

  const segment = (pass: string) => {
    timing.endFrame();
    timing.beginFrame({ ...info, pass });
  };
  const onPass = (pass: BloomPassName) => {
    activePass = pass;
    sceneTarget = null;
    sceneTargetSeen = false;
    transmissionTarget = null;
    segment(pass);
  };

  const wrappedSetter: typeof renderer.setRenderTarget = function (
    this: THREE.WebGLRenderer,
    ...args: Parameters<typeof renderer.setRenderTarget>
  ) {
    const target = args[0];
    if (activePass === 'scene') {
      // Bloom announces its scene pass before binding the main HDR target.
      if (!sceneTargetSeen) {
        sceneTarget = target;
        sceneTargetSeen = true;
      } else if (transmissionTarget && target === sceneTarget) {
        // r183 resolves MSAA and generates all transmission mipmaps BEFORE this restore.
        transmissionTarget = null;
        segment('scene');
      } else if (!transmissionTarget && sceneTarget && target && target !== sceneTarget &&
        target.samples >= 4 && target.depthTexture === null &&
        !Array.isArray(target.texture) &&
        target.texture.generateMipmaps && target.texture.minFilter === THREE.LinearMipmapLinearFilter) {
        // r183 has no named transmission target. Shadow targets have depth textures;
        // this signature is specific to the installed renderer and our scene.
        transmissionTarget = target;
        segment('transmission');
      }
    }
    return originalSetter.apply(this, args);
  };

  renderer.setRenderTarget = wrappedSetter;
  try {
    render(onPass);
  } finally {
    try {
      timing.endFrame();
    } finally {
      if (renderer.setRenderTarget === wrappedSetter) renderer.setRenderTarget = originalSetter;
    }
  }
}
