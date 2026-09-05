import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three-stdlib';
import { deviceTier } from './device-tier';
import eveningProfile from './room-evening-profile.json';

export interface LightingPlan {
  ambientIntensity: number;
  castShadows: boolean;
  keyLightIntensity: number;
}

export interface SceneLights {
  ambient: THREE.AmbientLight;
  applyBakedRoomProfile: (authoredLighting?: boolean) => void;
  applyRoomRedesignProfile: (roomRoot: THREE.Object3D) => void;
  ceiling: THREE.PointLight;
  corner: THREE.PointLight;
  group: THREE.Group;
  hemi: THREE.HemisphereLight;
  key: THREE.SpotLight;
  monitor: THREE.PointLight;
  neonA: THREE.PointLight;
  neonB: THREE.PointLight;
  rim: THREE.DirectionalLight;
  roomKey: THREE.SpotLight;
  wallWash: THREE.SpotLight;
  workshopFill: THREE.SpotLight;
  workshopShelfFill: THREE.SpotLight;
  workbenchTask: THREE.SpotLight;
  deskTask: THREE.SpotLight;
  rightBaseGlow: THREE.SpotLight;
  cableChannelGlow: THREE.SpotLight;
  printerUnderdeskFill: THREE.SpotLight;
}

export function createLightingPlan(): LightingPlan {
  return {
    ambientIntensity: 0.30,
    keyLightIntensity: 2.2,
    castShadows: true
  };
}

export function createSceneLights(): SceneLights {
  const plan = createLightingPlan();
  const group = new THREE.Group();
  let redesignRoot: THREE.Object3D | null = null;
  const reflectionLights: THREE.RectAreaLight[] = [];

  // Legacy defaults remain active until the loaded GLB identifies itself as the
  // redesign room. This keeps the old room as a working fallback.
  const ambient = new THREE.AmbientLight('#ffffff', plan.ambientIntensity);
  const hemi = new THREE.HemisphereLight('#1a1a40', '#080808', 0.50);

  // The narrow gameplay spotlight remains independent of the room mood and is
  // the only light that casts a shadow.
  const keyIntensity = deviceTier === 'high' ? plan.keyLightIntensity : plan.keyLightIntensity * 0.65;
  const key = new THREE.SpotLight('#d0e8ff', keyIntensity);
  key.position.set(-9, 22, 5);
  key.target.position.set(0, 0, 0);
  key.angle = Math.PI / 6;
  key.penumbra = 0.6;
  key.decay = 1.2;
  key.distance = 40;
  key.castShadow = plan.castShadows;
  const shadowSize = deviceTier === 'high' ? 1024 : 512;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.bias = -0.002;
  key.shadow.normalBias = 0.05;

  // These two lights are retained for the legacy room and repurposed as the
  // strongest warm practical lights in the redesign.
  const neonA = new THREE.PointLight('#ff0d05', 4.0, 22, 1.8);
  neonA.position.set(-4, 5.5, 6);

  const neonB = new THREE.PointLight('#ff0d05', 4.0, 22, 1.8);
  neonB.position.set(-18, 5.5, 14);

  const rim = new THREE.DirectionalLight('#ff0d05', 0.40);
  rim.position.set(-9, 8, 5);

  // Blender's PREVIEW_ONLY area lights are intentionally not part of the GLB.
  // These non-shadow-casting lights recreate their cool night wash cheaply.
  const roomKey = new THREE.SpotLight('#7898cf', 0);
  roomKey.angle = Math.PI / 3;
  roomKey.penumbra = 0.88;
  roomKey.decay = 1.15;
  roomKey.distance = 48;

  const wallWash = new THREE.SpotLight('#315caa', 0);
  wallWash.angle = Math.PI / 2.45;
  wallWash.penumbra = 0.92;
  wallWash.decay = 1.10;
  wallWash.distance = 42;

  const ceiling = new THREE.PointLight('#ff8a3d', 0, 15, 1.65);

  // A broad, non-shadow-casting fill points from the room towards the dark
  // right workshop wall. It reveals black shelves and tools without lifting
  // the exposure of the rest of the room.
  const workshopFill = new THREE.SpotLight('#f2c7a0', 0);
  workshopFill.angle = Math.PI / 3;
  workshopFill.penumbra = 0.92;
  workshopFill.decay = 1.05;
  workshopFill.distance = 28;
  const workshopShelfFill = new THREE.SpotLight('#b7caff', 0);
  workshopShelfFill.angle = Math.PI / 3.2;
  workshopShelfFill.penumbra = 0.92;
  workshopShelfFill.decay = 1.15;
  workshopShelfFill.distance = 14;

  // A focused task light follows the exported wall lamp and points straight
  // onto the heat mat so the dark instruments remain readable.
  const workbenchTask = new THREE.SpotLight('#ffd2aa', 0);
  workbenchTask.angle = Math.PI / 4;
  workbenchTask.penumbra = 0.78;
  workbenchTask.decay = 1.15;
  workbenchTask.distance = 6;

  // The small lamp between the monitors now behaves like a real desk lamp:
  // its beam covers the keyboard, mouse and input mat instead of only glowing.
  const deskTask = new THREE.SpotLight('#ffd8b4', 0);
  deskTask.angle = Math.PI / 3.6;
  deskTask.penumbra = 0.82;
  deskTask.decay = 1.10;
  deskTask.distance = 5;

  // One uninterrupted visible rail runs only along the full wall/floor seam.
  // Its live counterpart reveals non-lightmapped objects in that broad wash.
  const rightBaseGlow = new THREE.SpotLight('#ff9a52', 0);
  rightBaseGlow.angle = Math.PI / 2.5;
  rightBaseGlow.penumbra = 0.95;
  rightBaseGlow.decay = 1.25;
  rightBaseGlow.distance = 3.6;
  rightBaseGlow.castShadow = false;

  // A concealed light behind the matte cable channel casts only a restrained,
  // shadowless pool in WebGL; the channel itself must never appear emissive.
  const cableChannelGlow = new THREE.SpotLight('#ff9a52', 0);
  cableChannelGlow.angle = Math.PI / 2.5;
  cableChannelGlow.penumbra = 0.96;
  cableChannelGlow.decay = 1.25;
  cableChannelGlow.distance = 2.6;
  cableChannelGlow.castShadow = false;

  // A source-free, room-side fill reaches the camera-facing surfaces of the
  // open-frame printer. It adds no visible strip or fixture to the model.
  const printerUnderdeskFill = new THREE.SpotLight('#ffd2aa', 0);
  printerUnderdeskFill.angle = Math.PI / 3;
  printerUnderdeskFill.penumbra = 0.95;
  printerUnderdeskFill.decay = 1.35;
  printerUnderdeskFill.distance = 2.2;
  printerUnderdeskFill.castShadow = false;

  const corner = new THREE.PointLight('#ff641f', 0, 14, 1.6);
  const monitor = new THREE.PointLight('#ff7330', 0, 10, 1.7);

  group.add(
    ambient,
    hemi,
    key,
    key.target,
    neonA,
    neonB,
    rim,
    roomKey,
    roomKey.target,
    wallWash,
    wallWash.target,
    workshopFill,
    workshopFill.target,
    workshopShelfFill,
    workshopShelfFill.target,
    workbenchTask,
    workbenchTask.target,
    deskTask,
    deskTask.target,
    rightBaseGlow,
    rightBaseGlow.target,
    cableChannelGlow,
    cableChannelGlow.target,
    printerUnderdeskFill,
    printerUnderdeskFill.target,
    ceiling,
    corner,
    monitor
  );

  const blenderPointToWorld = (roomRoot: THREE.Object3D, x: number, y: number, z: number): THREE.Vector3 => {
    // glTF exporter converts Blender Z-up (x, y, z) to Y-up (x, z, -y).
    return roomRoot.localToWorld(new THREE.Vector3(x, z, -y));
  };

  const applyRoomRedesignProfile = (roomRoot: THREE.Object3D): void => {
    redesignRoot = roomRoot;
    roomRoot.updateMatrixWorld(true);

    ambient.color.set('#07101f');
    ambient.intensity = 0.075;
    hemi.color.set('#26446f');
    hemi.groundColor.set('#050507');
    hemi.intensity = 0.16;

    // Preserve the chess spotlight and its shadow map for gameplay.
    key.color.set('#d7e7ff');
    key.intensity = keyIntensity;

    roomKey.position.copy(blenderPointToWorld(roomRoot, -2.4, -1.0, 3.0));
    roomKey.target.position.copy(blenderPointToWorld(roomRoot, -0.6, 1.7, 0.9));
    roomKey.intensity = deviceTier === 'high' ? 28 : 20;

    wallWash.position.copy(blenderPointToWorld(roomRoot, 0.0, 2.0, 3.0));
    wallWash.target.position.copy(blenderPointToWorld(roomRoot, 0.0, 2.9, 2.35));
    wallWash.intensity = deviceTier === 'high' ? 18 : 13;

    workshopFill.position.copy(blenderPointToWorld(roomRoot, 1.20, -2.15, 2.55));
    workshopFill.target.position.copy(blenderPointToWorld(roomRoot, 3.18, 0.30, 1.48));
    workshopFill.intensity = deviceTier === 'high' ? 90 : 65;
    workshopShelfFill.position.copy(blenderPointToWorld(roomRoot, 1.95, 1.38, 2.05));
    workshopShelfFill.target.position.copy(blenderPointToWorld(roomRoot, 3.18, 1.38, 1.86));
    workshopShelfFill.intensity = deviceTier === 'high' ? 68 : 50;
    workbenchTask.position.copy(blenderPointToWorld(roomRoot, 2.78, -0.15, 2.18));
    workbenchTask.target.position.copy(blenderPointToWorld(roomRoot, 2.93, -0.15, 0.86));
    workbenchTask.intensity = deviceTier === 'high' ? 260 : 190;
    deskTask.position.copy(blenderPointToWorld(roomRoot, 0.345, 2.68, 1.24));
    deskTask.target.position.copy(blenderPointToWorld(roomRoot, -0.10, 2.00, 0.87));
    deskTask.intensity = deviceTier === 'high' ? 260 : 190;
    rightBaseGlow.position.copy(blenderPointToWorld(roomRoot, 3.470, -0.150, 0.075));
    rightBaseGlow.target.position.copy(blenderPointToWorld(roomRoot, 2.840, -0.150, 0.340));
    rightBaseGlow.intensity = deviceTier === 'high' ? 38 : 28;
    cableChannelGlow.position.copy(blenderPointToWorld(roomRoot, -0.695, 2.680, 0.570));
    cableChannelGlow.target.position.copy(blenderPointToWorld(roomRoot, -0.695, 2.000, 0.120));
    cableChannelGlow.intensity = deviceTier === 'high' ? 20 : 14;
    printerUnderdeskFill.position.copy(blenderPointToWorld(roomRoot, 2.100, -0.950, 0.580));
    printerUnderdeskFill.target.position.copy(blenderPointToWorld(roomRoot, 2.840, -0.150, 0.320));
    printerUnderdeskFill.intensity = deviceTier === 'high' ? 46 : 34;

    neonA.color.set('#ff7130');
    neonA.position.copy(blenderPointToWorld(roomRoot, 2.92, -0.15, 1.96));
    neonA.intensity = deviceTier === 'high' ? 16 : 11;
    neonA.distance = 15;

    neonB.color.set('#ff5c22');
    neonB.position.copy(blenderPointToWorld(roomRoot, -3.18, 1.88, 1.02));
    neonB.intensity = deviceTier === 'high' ? 9 : 6;
    neonB.distance = 12;

    ceiling.position.copy(blenderPointToWorld(roomRoot, 0.0, 0.10, 2.64));
    ceiling.intensity = deviceTier === 'high' ? 7 : 5;
    corner.position.copy(blenderPointToWorld(roomRoot, 2.84, 2.71, 1.285));
    corner.intensity = deviceTier === 'high' ? 4.5 : 3;
    monitor.position.copy(blenderPointToWorld(roomRoot, 0.345, 2.53, 1.215));
    monitor.intensity = deviceTier === 'high' ? 2.5 : 1.6;

    rim.color.set('#244b86');
    rim.intensity = 0.12;
    rim.position.copy(blenderPointToWorld(roomRoot, -2.4, -1.0, 3.0));
  };

  const applyBakedRoomProfile = (authoredLighting = false): void => {
    if (authoredLighting) {
      if (redesignRoot && reflectionLights.length === 0) {
        RectAreaLightUniformsLib.init();
        const scale = redesignRoot.getWorldScale(new THREE.Vector3()).x;
        const orientation = redesignRoot.getWorldQuaternion(new THREE.Quaternion());
        // Two authored Blender AREA lights restore broad glass/metal highlights.
        // Baked materials suppress their diffuse term. These add no shadow pass.
        // Blender's bake reads this same profile: moving the broad fill must
        // also move its reflection instead of leaving a cold highlight behind.
        for (const source of eveningProfile.lights) {
          if (source.reflectionStrength === undefined || !source.position || !source.target || !source.width || !source.height) continue;
          const light = new THREE.RectAreaLight(
            new THREE.Color().setRGB(source.color[0], source.color[1], source.color[2]),
            // LTC and Blender's area-light response differ, especially on
            // transmitting glass. Calibrated against the browser close-ups.
            source.reflectionStrength * source.power / (source.width * source.height * Math.PI),
            source.width * scale, source.height * scale
          );
          light.name = source.name + '_Reflection';
          light.position.copy(blenderPointToWorld(redesignRoot, source.position[0], source.position[1], source.position[2]));
          light.up.set(0, 1, 0).applyQuaternion(orientation);
          light.lookAt(blenderPointToWorld(redesignRoot, source.target[0], source.target[1], source.target[2]));
          reflectionLights.push(light);
          group.add(light);
        }
      }
      // The full static room now carries the authored Blender illumination.
      // Retain the gameplay light, quiet fill and two authored reflection lights.
      for (const child of group.children) {
        if (child instanceof THREE.Light) child.visible = child === key || child === hemi || child instanceof THREE.RectAreaLight;
      }
      hemi.intensity = 0.10;
      return;
    }
    // Static walls, floor and desk now receive Blender's direct/indirect light
    // from the lightmap. A soft live fill keeps dark furniture readable and
    // illuminates dynamic chess pieces without flattening the baked shadows.
    ambient.intensity = 0.105;
    hemi.intensity = 0.21;
    roomKey.intensity = deviceTier === 'high' ? 13 : 10;
    wallWash.intensity = deviceTier === 'high' ? 10.5 : 8;
    neonA.intensity = deviceTier === 'high' ? 45 : 34;
    neonB.intensity = deviceTier === 'high' ? 5 : 4;
    ceiling.intensity = deviceTier === 'high' ? 4.5 : 3.4;
    corner.intensity = deviceTier === 'high' ? 18 : 13;
    monitor.intensity = deviceTier === 'high' ? 32 : 24;
    // The printer is not part of the static lightmap. Keep both practical
    // under-desk lights active after the baked profile is applied so the main
    // bay and the open-frame printer remain readable in the live WebGL view.
    rightBaseGlow.intensity = deviceTier === 'high' ? 30 : 22;
    cableChannelGlow.intensity = deviceTier === 'high' ? 16 : 12;
    printerUnderdeskFill.intensity = deviceTier === 'high' ? 42 : 31;
    rim.intensity = 0.10;
  };

  return {
    ambient,
    applyBakedRoomProfile,
    applyRoomRedesignProfile,
    ceiling,
    corner,
    group,
    hemi,
    key,
    monitor,
    neonA,
    neonB,
    rim,
    roomKey,
    wallWash,
    workshopFill,
    workshopShelfFill,
    workbenchTask,
    deskTask,
    rightBaseGlow,
    cableChannelGlow,
    printerUnderdeskFill
  };
}
