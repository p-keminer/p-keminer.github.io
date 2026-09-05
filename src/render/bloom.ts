/**
 * bloom.ts — einfache HDR Bloom Post-Process für WebGLRenderer (Three.js r183).
 *
 * Pipeline:
 *   1. Szene rendern → HDR Render-Target (Tone-Mapping AUS)
 *   2. Schwellen-Pass  → helle Pixel extrahieren
 *   3. Horizontale Unschärfe → verkleinertes Unschärfe-Target
 *   4. Vertikale Unschärfe   → halb-auflösendes Unschärfe-Target
 *   5. Zusammensetzen       → Bildschirm (Blender-nahes AgX + Bloom)
 *
 * Keine externen Abhängigkeiten — verwendet nur primitive THREE-Kern.
 */

import * as THREE from 'three';
import { deviceTier } from './device-tier';

// ─── Gemeinsamer Vertex-Shader ────────────────────────────────────────────────────
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// ─── Schwelle: Nur Pixel heller als Schwelle behalten ─────────────────────
const THRESHOLD_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float lum = max(c.r, max(c.g, c.b));
  float weight = max(0.0, lum - uThreshold) / max(lum, 0.0001);
  gl_FragColor = vec4(c * weight, 1.0);
}`;

// ─── Separable Gaußsche Unschärfe (7-Tap) ─────────────────────────────────────────
const BLUR_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 color = vec3(0.0);
  color += texture2D(tDiffuse, vUv - uDir * 3.0).rgb * 0.064;
  color += texture2D(tDiffuse, vUv - uDir * 2.0).rgb * 0.122;
  color += texture2D(tDiffuse, vUv - uDir * 1.0).rgb * 0.194;
  color += texture2D(tDiffuse, vUv             ).rgb * 0.240;
  color += texture2D(tDiffuse, vUv + uDir * 1.0).rgb * 0.194;
  color += texture2D(tDiffuse, vUv + uDir * 2.0).rgb * 0.122;
  color += texture2D(tDiffuse, vUv + uDir * 3.0).rgb * 0.064;
  gl_FragColor = vec4(color, 1.0);
}`;

// ─── Zusammensetzen: AgX Tone-Map auf Szene anwenden, dann Bloom hinzufügen ────────────
// AgX-Näherung aus Three.js/Filament, abgestimmt auf Blenders AgX-Look.
const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uStrength;
uniform float uExposure;
uniform vec3 uDisplayGain;
uniform bool uUseBlenderLook;
uniform sampler2D tBlenderLook;
varying vec2 vUv;

// 64-cubed LUT exported through Blender's actual AgX / Medium High Contrast
// display transform (-0.2 EV). It returns display sRGB, not scene-linear RGB.
vec3 applyBlenderLook(vec3 sceneLinear) {
  sceneLinear = max(sceneLinear, vec3(0.0));
  if (max(sceneLinear.r, max(sceneLinear.g, sceneLinear.b)) <= 0.0) return vec3(0.0);
  const float minEV = -12.47393;
  const float maxEV = 6.026069;
  vec3 coordinates = clamp((log2(max(sceneLinear, vec3(exp2(minEV)))) - minEV)
    / (maxEV - minEV), 0.0, 1.0) * 63.0;
  float lowerBlue = floor(coordinates.b);
  float upperBlue = min(lowerBlue + 1.0, 63.0);
  vec2 lowerUV = vec2(lowerBlue * 64.0 + coordinates.r + 0.5, coordinates.g + 0.5) / vec2(4096.0, 64.0);
  vec2 upperUV = vec2(upperBlue * 64.0 + coordinates.r + 0.5, coordinates.g + 0.5) / vec2(4096.0, 64.0);
  return mix(texture2D(tBlenderLook, lowerUV).rgb, texture2D(tBlenderLook, upperUV).rgb, fract(coordinates.b));
}

const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
  vec3(1.6605, -0.1246, -0.0182),
  vec3(-0.5876, 1.1329, -0.1006),
  vec3(-0.0728, -0.0083, 1.1187)
);

const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
  vec3(0.6274, 0.0691, 0.0164),
  vec3(0.3293, 0.9195, 0.0880),
  vec3(0.0433, 0.0113, 0.8956)
);

vec3 agxDefaultContrastApprox(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return 15.5 * x4 * x2
    - 40.14 * x4 * x
    + 31.96 * x4
    - 6.868 * x2 * x
    + 0.4298 * x2
    + 0.1191 * x
    - 0.00232;
}

vec3 agxToneMapping(vec3 color) {
  const mat3 inset = mat3(
    vec3(0.8566271533, 0.1373189729, 0.1118982130),
    vec3(0.0951212405, 0.7612419906, 0.0767994186),
    vec3(0.0482516061, 0.1014390365, 0.8113023684)
  );
  const mat3 outset = mat3(
    vec3(1.1271005818, -0.1413297635, -0.1413297635),
    vec3(-0.1106066431, 1.1578237022, -0.1106066431),
    vec3(-0.0164939387, -0.0164939387, 1.2519364066)
  );
  const float minEv = -12.47393;
  const float maxEv = 4.026069;

  color *= uExposure;
  color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
  color = inset * color;
  color = max(color, vec3(1e-10));
  color = clamp((log2(color) - minEv) / (maxEv - minEv), 0.0, 1.0);
  color = agxDefaultContrastApprox(color);
  color = outset * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  return clamp(LINEAR_REC2020_TO_LINEAR_SRGB * color, 0.0, 1.0);
}

vec3 agxMediumHighContrast(vec3 color) {
  color = agxToneMapping(color);
  color = clamp((color - 0.18) * 1.10 + 0.18, 0.0, 1.0);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return clamp(mix(vec3(luma), color, 1.04), 0.0, 1.0);
}

vec3 linearToSRGB(vec3 color) {
  vec3 low = color * 12.92;
  vec3 high = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), color));
}

void main() {
  vec3 hdr = texture2D(tScene, vUv).rgb;
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  // Small browser display adjustment, applied in linear light before AgX.
  // A neutral gain leaves the legacy profile and original LUT unchanged.
  vec3 displayInput = (hdr + bloom * uStrength) * uDisplayGain;
  if (uUseBlenderLook) {
    gl_FragColor = vec4(applyBlenderLook(displayInput), 1.0);
    return;
  }
  vec3 color = agxMediumHighContrast(displayInput);
  gl_FragColor = vec4(linearToSRGB(color), 1.0);
}`;

// ─── Öffentliche Schnittstelle ────────────────────────────────────────────────────

export interface BloomOptions {
  /** HDR-Leuchtdichte-Schwelle für Bloom-Extraktion (Standard 0,85). */
  threshold?: number;
  /** Additive Bloom-Stärke im Composite-Pass (Standard 0,5). */
  strength?: number;
  /** Unschärfe-Schrittskala — größer = breiterer Glanz (Standard 2,0 Pixel bei halber Auflösung). */
  blurScale?: number;
  /** Belichtung vor AgX Tone-Mapping angewendet (Standard 1,2). */
  exposure?: number;
}

export type BloomPassName = 'scene' | 'threshold' | 'blur-horizontal' | 'blur-vertical' | 'composite';

export interface BloomEffect {
  /** Ersetzen Sie renderer.render(scene, camera) damit. */
  render(scene: THREE.Scene, camera: THREE.Camera, onPass?: (pass: BloomPassName) => void): void;
  /** Aufrufen, wenn die Canvas-Größe geändert wird. */
  setSize(width: number, height: number, referenceWidth?: number, referenceHeight?: number): void;
  setExposure(exposure: number): void;
  setDisplayGrade(exposureEV: number, whiteBalance: readonly number[]): void;
  setDisplayLut(texture: THREE.Texture): void;
  dispose(): void;
}

export function createBloomEffect(
  renderer: THREE.WebGLRenderer,
  options: BloomOptions = {}
): BloomEffect {
  const threshold = options.threshold ?? 0.85;
  const strength  = options.strength  ?? 0.5;
  const blurScale = options.blurScale ?? 2.0;
  const exposure  = options.exposure  ?? 1.2;

  // ── Render-Targets ──────────────────────────────────────────────────────
  const rtOpts: THREE.RenderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    depthBuffer: false
  };
  // Vollauflösendes Szenen-Target (mit Tiefe für tatsächliches Rendering)
  const sceneRT  = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: true });
  // Halb-auflösende Targets für Schwelle + Unschärfe
  const brightRT = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const blurHRT  = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const blurVRT  = new THREE.WebGLRenderTarget(1, 1, rtOpts);

  // ── Vollbild-Quad-Helfer ────────────────────────────────────────────
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo     = new THREE.PlaneGeometry(2, 2);
  const quadScene   = new THREE.Scene();
  const quadMesh    = new THREE.Mesh(quadGeo);
  quadScene.add(quadMesh);

  // ── Materialien ───────────────────────────────────────────────────────
  const thresholdMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse:   { value: null },
      uThreshold: { value: threshold }
    },
    vertexShader:   VERT,
    fragmentShader: THRESHOLD_FRAG,
    depthTest: false,
    depthWrite: false
  });

  const blurHMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uDir:     { value: new THREE.Vector2(0, 0) }
    },
    vertexShader:   VERT,
    fragmentShader: BLUR_FRAG,
    depthTest: false,
    depthWrite: false
  });

  const blurVMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uDir:     { value: new THREE.Vector2(0, 0) }
    },
    vertexShader:   VERT,
    fragmentShader: BLUR_FRAG,
    depthTest: false,
    depthWrite: false
  });

  const compositeMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene:    { value: null },
      tBloom:    { value: null },
      uStrength: { value: strength },
      uExposure: { value: exposure },
      uDisplayGain: { value: new THREE.Vector3(1, 1, 1) },
      uUseBlenderLook: { value: false },
      tBlenderLook: { value: null }
    },
    vertexShader:   VERT,
    fragmentShader: COMPOSITE_FRAG,
    depthTest: false,
    depthWrite: false
  });

  // ── Größenverfolgung ───────────────────────────────────────────────────────
  let fullW = 1, fullH = 1, halfW = 1, halfH = 1;
  let blurScaleX = 1, blurScaleY = 1;
  const bloomDiv = deviceTier === 'high' ? 3 : 4;
  const compensatedBlurScale = blurScale * (2 / bloomDiv);

  function setSize(width: number, height: number, referenceWidth = width, referenceHeight = height): void {
    fullW = width;
    fullH = height;
    halfW = Math.max(1, Math.floor(width / bloomDiv));
    halfH = Math.max(1, Math.floor(height / bloomDiv));
    // Keep the glow radius in display pixels when the scene resolution changes.
    blurScaleX = halfW / Math.max(1, Math.floor(referenceWidth / bloomDiv));
    blurScaleY = halfH / Math.max(1, Math.floor(referenceHeight / bloomDiv));

    sceneRT .setSize(fullW, fullH);
    brightRT.setSize(halfW, halfH);
    blurHRT .setSize(halfW, halfH);
    blurVRT .setSize(halfW, halfH);
  }

  // ── Render-Pipeline ─────────────────────────────────────────────────────
  function render(scene: THREE.Scene, camera: THREE.Camera, onPass?: (pass: BloomPassName) => void): void {
    if (import.meta.env.DEV) onPass?.('scene');
    // Renderer-Status speichern
    const prevToneMapping = renderer.toneMapping;
    const prevOutputCS    = renderer.outputColorSpace;

    // 1. Szene rendern → HDR-Target.
    //    NoToneMapping + LinearSRGBColorSpace, damit wir rohe HDR-Werte im RT behalten.
    renderer.toneMapping      = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    // Post-Process-Passes laufen auch in linearem + Nicht-Ton-Raum.

    // 2. Schwellen-Pass → je Achse 1/3 (high), sonst 1/4 der Hauptauflösung.
    if (import.meta.env.DEV) onPass?.('threshold');
    thresholdMat.uniforms.tDiffuse.value = sceneRT.texture;
    quadMesh.material = thresholdMat;
    renderer.setRenderTarget(brightRT);
    renderer.render(quadScene, orthoCamera);

    // 3. Horizontale Unschärfe
    if (import.meta.env.DEV) onPass?.('blur-horizontal');
    blurHMat.uniforms.tDiffuse.value = brightRT.texture;
    blurHMat.uniforms.uDir.value.set(compensatedBlurScale * blurScaleX / halfW, 0);
    quadMesh.material = blurHMat;
    renderer.setRenderTarget(blurHRT);
    renderer.render(quadScene, orthoCamera);

    // 4. Vertikale Unschärfe
    if (import.meta.env.DEV) onPass?.('blur-vertical');
    blurVMat.uniforms.tDiffuse.value = blurHRT.texture;
    blurVMat.uniforms.uDir.value.set(0, compensatedBlurScale * blurScaleY / halfH);
    quadMesh.material = blurVMat;
    renderer.setRenderTarget(blurVRT);
    renderer.render(quadScene, orthoCamera);

    // 5. Zusammensetzen → Bildschirm.
    //    Der Composite-Shader wendet AgX und eine exakte lineare-sRGB-Ausgabe selbst an.
    //    Wir verwenden LinearSRGBColorSpace, damit der Renderer KEINE zweite sRGB-Konvertierung auf unserer bereits Gamma-korrigierten Ausgabe anwendet.
    if (import.meta.env.DEV) onPass?.('composite');
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    compositeMat.uniforms.tScene.value = sceneRT.texture;
    compositeMat.uniforms.tBloom.value = blurVRT.texture;
    quadMesh.material = compositeMat;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, orthoCamera);

    // Ursprünglichen Renderer-Status wiederherstellen
    renderer.toneMapping      = prevToneMapping;
    renderer.outputColorSpace = prevOutputCS;
  }

  function dispose(): void {
    sceneRT.dispose();
    brightRT.dispose();
    blurHRT.dispose();
    blurVRT.dispose();
    quadGeo.dispose();
    thresholdMat.dispose();
    blurHMat.dispose();
    blurVMat.dispose();
    compositeMat.dispose();
    compositeMat.uniforms.tBlenderLook.value?.dispose();
  }

  return { render, setSize, dispose,
    setExposure: value => { compositeMat.uniforms.uExposure.value = value; },
    setDisplayGrade: (exposureEV, whiteBalance) => {
      compositeMat.uniforms.uDisplayGain.value
        .set(whiteBalance[0], whiteBalance[1], whiteBalance[2])
        .multiplyScalar(2 ** exposureEV);
    },
    setDisplayLut: texture => {
      compositeMat.uniforms.tBlenderLook.value?.dispose();
      compositeMat.uniforms.tBlenderLook.value = texture;
      compositeMat.uniforms.uUseBlenderLook.value = true;
    }
  };
}
