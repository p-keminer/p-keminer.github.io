import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

const canvas = document.getElementById('robot-canvas') as HTMLCanvasElement;
const wrap   = document.getElementById('scene-wrap')   as HTMLDivElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

function resize(): void {
  const s = wrap.clientWidth || 260;
  renderer.setSize(s, s);
}
resize();
new ResizeObserver(resize).observe(wrap);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
camera.position.set(0, 0.5, 9.5);
camera.lookAt(new THREE.Vector3(0, -2.0, 0));

// ── Lights ──────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const key = new THREE.PointLight(0x4fc3f7, 3, 25);
key.position.set(3, 2, 6);
scene.add(key);

const fill = new THREE.PointLight(0xffffff, 0.8, 25);
fill.position.set(-4, -1, 5);
scene.add(fill);

const rim = new THREE.PointLight(0x1565c0, 1.5, 20);
rim.position.set(0, -5, -5);
scene.add(rim);

// Sirenen-Licht: rotes PointLight kreist um die Antennenspitze
const sirenLight = new THREE.PointLight(0xff2200, 5, 14);
scene.add(sirenLight);
const SIREN_SPEED  = (2 * Math.PI) / 3.5; // 3.5 s/Umdrehung — sync mit CSS
const SIREN_R      = 0.7;                  // Kreisradius um die Antenne
const ANTENNA_WORLD_Y = 1.46;             // AntennaBall Y-Pos in Weltkoord. (1.76 − 0.3 Model-Offset)

// ── Load GLB ─────────────────────────────────────────────────────────────
let headGroup:   THREE.Object3D | null = null;
let antennaBall: THREE.Mesh | null     = null;
let leftEye:     THREE.Mesh | null     = null;
let rightEye:    THREE.Mesh | null     = null;
const _antennaWorld = new THREE.Vector3(); // reusable für getWorldPosition
const _projected    = new THREE.Vector3(); // für CSS-Projektion

let mixer:        THREE.AnimationMixer | null = null;
let scratchAction: THREE.AnimationAction | null = null;
let scratchTimer  = 2 + Math.random() * 3; // first scratch after 2-5 s

const loader = new GLTFLoader();
loader.load('/robot-404.glb', (gltf) => {
  const model = gltf.scene;
  model.position.set(0, -0.3, 0);
  scene.add(model);

  headGroup = model.getObjectByName('HeadGroup') ?? model;

  model.traverse((node) => {
    if (node.name === 'AntennaBall' && node instanceof THREE.Mesh) {
      antennaBall = node;
      // Eigenes Material clonen — sonst werden die Augen auch rot (shared material)
      const sirenMat = (node.material as THREE.MeshStandardMaterial).clone();
      sirenMat.color.set(0xffffff);
      sirenMat.emissive.set(0xffffff);
      node.material = sirenMat;
    }
    if ((node.name === 'EyeL' || node.name === 'EyeR') && node instanceof THREE.Mesh) {
      const eyeMat = (node.material as THREE.MeshStandardMaterial).clone();
      eyeMat.color.set(0xffffff);
      eyeMat.emissive.set(0xffffff);
      eyeMat.emissiveIntensity = 2;
      node.material = eyeMat;
      if (node.name === 'EyeL') leftEye  = node;
      else                      rightEye = node;
    }
    // Brust-LEDs neon-weiß (wie die Augen)
    if ((node.name === 'ChestLEDL' || node.name === 'ChestLEDR') && node instanceof THREE.Mesh) {
      const ledMat = (node.material as THREE.MeshStandardMaterial).clone();
      ledMat.color.set(0xffffff);
      ledMat.emissive.set(0xffffff);
      ledMat.emissiveIntensity = 2;
      node.material = ledMat;
    }
  });

  // ── Scratch animation from baked Blender armature ────────────────────
  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    // Use the first (and only) clip — the baked arm scratch
    scratchAction = mixer.clipAction(gltf.animations[0]);
    scratchAction.setLoop(THREE.LoopOnce, 1);
    scratchAction.clampWhenFinished = true;

    // When animation finishes, reset so it can be re-triggered
    mixer.addEventListener('finished', () => {
      scratchAction?.stop();
    });
  }
});

// ── Typewriter-Sequenz ────────────────────────────────────────────────────
const bubble  = document.getElementById('bubble')   as HTMLElement;
const backBtn = document.querySelector('.back-btn') as HTMLElement;

const MESSAGES = [
  'Orientierung verloren?',
  'Passiert mir auch manchmal...',
];
const CHAR_MS  = 95;
const HOLD_MS  = 1200;
const FADE_MS  = 500;
const PAUSE_MS = 400;

let msgIdx        = 0;
let btnRevealed   = false;

function typeMessage(): void {
  bubble.innerHTML = '';
  bubble.style.opacity = '1';

  const text = MESSAGES[msgIdx];
  let charIdx = 0;

  function typeNext(): void {
    if (charIdx < text.length) {
      let node = bubble.lastChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) {
        node = document.createTextNode('');
        bubble.appendChild(node);
      }
      (node as Text).data += text[charIdx++];
      setTimeout(typeNext, CHAR_MS);
    } else {
      // Fertig getippt → halten
      setTimeout(() => {
        // Button nach letzter Blase dauerhaft einblenden
        if (msgIdx === MESSAGES.length - 1 && !btnRevealed) {
          btnRevealed = true;
          backBtn.style.opacity = '1';
        }
        // Blase ausblenden → nächste (nach letzter Blase längere Pause)
        bubble.style.opacity = '0';
        const loopDelay = msgIdx === MESSAGES.length - 1
          ? FADE_MS + 3200   // 3,2 s Pause nach dem letzten Loop-Ende
          : FADE_MS + PAUSE_MS;
        setTimeout(() => {
          msgIdx = (msgIdx + 1) % MESSAGES.length;
          typeMessage();
        }, loopDelay);
      }, HOLD_MS);
    }
  }

  typeNext();
}

setTimeout(typeMessage, 1000);

// ── Look-around sequence ──────────────────────────────────────────────────
const poses = [
  { yaw:  0.00, pitch:  0.00, hold: 1.6 },
  { yaw:  0.38, pitch:  0.07, hold: 1.4 },
  { yaw: -0.42, pitch: -0.05, hold: 1.5 },
  { yaw:  0.10, pitch:  0.14, hold: 1.3 },
  { yaw: -0.28, pitch:  0.00, hold: 1.6 },
  { yaw:  0.20, pitch: -0.10, hold: 1.4 },
  { yaw: -0.05, pitch:  0.06, hold: 1.8 },
] as const;
let poseIdx   = 0;
let poseTimer = 0;
let yaw   = 0;
let pitch = 0;

// ── Blink state ───────────────────────────────────────────────────────────
let blinkTimer = 2.8;
let blinking   = false;
let blinkT     = 0;

// ── Animate ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t  = clock.getElapsedTime();

  // ── Head look-around ──────────────────────────────────────────────────
  if (headGroup) {
    poseTimer += dt;
    if (poseTimer >= poses[poseIdx].hold) {
      poseTimer = 0;
      poseIdx   = (poseIdx + 1) % poses.length;
    }
    const pose  = poses[poseIdx];
    const alpha = 1 - Math.pow(0.015, dt);
    yaw   += (pose.yaw   - yaw)   * alpha;
    pitch += (pose.pitch - pitch) * alpha;

    headGroup.rotation.y = yaw;
    headGroup.rotation.x = pitch;
    headGroup.rotation.z = Math.sin(t * 0.65) * 0.04; // confused wobble
  }

  // ── Blink ─────────────────────────────────────────────────────────────
  if (!blinking) {
    blinkTimer -= dt;
    if (blinkTimer <= 0) {
      blinking   = true;
      blinkT     = 0;
      blinkTimer = 2.5 + Math.random() * 2.5;
    }
  } else {
    blinkT += dt * 9;
    const close = Math.max(0, Math.sin(blinkT * Math.PI));
    headGroup?.traverse((node) => {
      if (node.name.startsWith('Eyelid')) node.scale.y = close + 0.001;
    });
    if (blinkT >= 1) blinking = false;
  }

  // ── Scratch loop: play → wait → play → … ─────────────────────────────
  if (mixer) {
    mixer.update(dt);

    if (scratchAction && !scratchAction.isRunning()) {
      scratchTimer -= dt;
      if (scratchTimer <= 0) {
        scratchAction.reset().play();
        scratchTimer = 4 + Math.random() * 6; // pause 4-10 s between scratches
      }
    }
  }

  // ── Sirenenlampe kreist exakt um den AntennaBall ─────────────────────
  const sirenAngle = t * SIREN_SPEED;
  if (antennaBall) {
    // Echte Weltkoordinate des Antennenballs
    antennaBall.getWorldPosition(_antennaWorld);

    // 3D-Licht kreist um die Antenne
    sirenLight.position.set(
      _antennaWorld.x + Math.cos(sirenAngle) * SIREN_R,
      _antennaWorld.y,
      _antennaWorld.z + Math.sin(sirenAngle) * SIREN_R
    );

    // Roboter-X auf Screenkoordinaten projizieren → Spotlight folgt dem Roboter
    _projected.copy(_antennaWorld).project(camera);
    const sx = ((_projected.x + 1) / 2 * 100).toFixed(1);
    document.documentElement.style.setProperty('--siren-x', sx + '%');

    // AntennaBall pulsiert mit dem Spotlight-Rhythmus
    (antennaBall.material as THREE.MeshStandardMaterial).emissiveIntensity =
      2.5 + Math.sin(t * (2 * Math.PI / 2.4)) * 1.5;
  }

  // ── Augen-Glow (Cyan bleibt) ──────────────────────────────────────────
  const eyePulse = 1.1 + Math.sin(t * 1.4) * 0.3;
  if (leftEye)  (leftEye.material  as THREE.MeshStandardMaterial).emissiveIntensity = eyePulse;
  if (rightEye) (rightEye.material as THREE.MeshStandardMaterial).emissiveIntensity = eyePulse;

  renderer.render(scene, camera);
}
animate();
