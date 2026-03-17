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

  // Neutral-weißes Umgebungslicht mit niedriger Intensität – gerade genug, um
  // unbeleuchteते Oberflächen davor zu bewahren, vollständig schwarz zu werden. Die blau-cyberpunk-Stimmung
  // kommt von den Materialien und den Neon-Punktlichtern, nicht vom Füllicht.
  const ambient = new THREE.AmbientLight('#ffffff', plan.ambientIntensity);

  // Hemisphärenlichter: subtiles kühl-blaues Licht von oben, dunkles Licht von unten.
  const hemi = new THREE.HemisphereLight('#1a1a40', '#080808', 0.50);

  // Kühl-weißes gerichtetes Hauptlicht oben – positioniert im Raumzentrum oben.
  // Der Raum erstreckt sich in Three.js von X −29..+11, Z −13..+31, Mitte ≈ (−9, 6, 9).
  // Die große Shadow-Kamera deckt die gesamte Raum-Grundfläche ab.
  const key = new THREE.DirectionalLight('#d0e8ff', plan.keyLightIntensity);
  key.position.set(-9, 22, 5);
  key.target.position.set(-9, 0, 9);   // ziele auf Raumzentrum, nicht Weltursprung
  key.castShadow = plan.castShadows;
  // Shadow Map 1024×1024 statt 2048 – für Innenraum ausreichend, halbe Auflösung = 4x schneller
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 70;
  key.shadow.camera.left = -35;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 25;
  key.shadow.camera.bottom = -15;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;

  // Rote Neon-Punktlichter – simulieren die Blender light_red_strat.* Deckenstreifen
  // (rgb 1.0, 0.05, 0.02, 80 W je). Zwei Lichter decken die Streifenlänge ab: eins über der Schachbrett-Seite, eins über der Workstation-Seite.
  // Positionen abgeleitet aus Raumzentrum Y ≈ 5.9 (Deckenhöhe in Three.js).
  const neonA = new THREE.PointLight('#ff0d05', 4.0, 22, 1.8);
  neonA.position.set(-4, 5.5, 6);

  const neonB = new THREE.PointLight('#ff0d05', 4.0, 22, 1.8);
  neonB.position.set(-18, 5.5, 14);

  // Rote direktionale Randlicht – weiches globales Füllicht aus der Neon-Richtung.
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
