import * as THREE from 'three';

export interface LightingPlan {
  ambientIntensity: number;
  castShadows: boolean;
  keyLightIntensity: number;
}

export interface SceneLights {
  ambient: THREE.AmbientLight;
  group: THREE.Group;
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  neonA: THREE.PointLight;
  neonB: THREE.PointLight;
  rim: THREE.DirectionalLight;
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

  // Neutral-white ambient at low intensity — just enough to prevent
  // unlit surfaces from going completely black.  The blue-cyber mood
  // comes from the materials and the neon point lights, not fill light.
  const ambient = new THREE.AmbientLight('#ffffff', plan.ambientIntensity);

  // Hemisphere: subtle cool-blue sky above, dark floor below.
  const hemi = new THREE.HemisphereLight('#1a1a40', '#080808', 0.50);

  // Cool-white overhead directional key — positioned at room-centre overhead.
  // Room spans X −29..+11, Z −13..+31 in Three.js, centre ≈ (−9, 6, 9).
  // Large shadow camera covers the entire room footprint.
  const key = new THREE.DirectionalLight('#d0e8ff', plan.keyLightIntensity);
  key.position.set(-9, 22, 5);
  key.target.position.set(-9, 0, 9);   // aim at room centre, not world origin
  key.castShadow = plan.castShadows;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 70;
  key.shadow.camera.left = -35;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 25;
  key.shadow.camera.bottom = -15;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;

  // Red neon point lights — simulate the Blender light_red_strat.* ceiling
  // strips (rgb 1.0, 0.05, 0.02, 80 W each).  Two lights cover the strip
  // length: one over the chess-board side, one over the workstation side.
  // Positions derived from room centre Y ≈ 5.9 (ceiling level in Three.js).
  const neonA = new THREE.PointLight('#ff0d05', 4.0, 22, 1.8);
  neonA.position.set(-4, 5.5, 6);

  const neonB = new THREE.PointLight('#ff0d05', 4.0, 22, 1.8);
  neonB.position.set(-18, 5.5, 14);

  // Red directional rim — soft global fill from the neon direction.
  const rim = new THREE.DirectionalLight('#ff0d05', 0.40);
  rim.position.set(-9, 8, 5);

  group.add(ambient, hemi, key, key.target, neonA, neonB, rim);

  return {
    ambient,
    group,
    hemi,
    key,
    neonA,
    neonB,
    rim
  };
}
