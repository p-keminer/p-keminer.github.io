/**
 * bloom.ts — einfache HDR Bloom Post-Process für WebGLRenderer (Three.js r183).
 *
 * Pipeline:
 *   1. Szene rendern → HDR Render-Target (Tone-Mapping AUS)
 *   2. Schwellen-Pass  → helle Pixel extrahieren
 *   3. Horizontale Unschärfe → halb-auflösendes Unschärfe-Target
 *   4. Vertikale Unschärfe   → halb-auflösendes Unschärfe-Target
 *   5. Zusammensetzen       → Bildschirm (ACESFilmic anwenden + Bloom hinzufügen)
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

// ─── Zusammensetzen: ACESFilmic Tone-Map auf Szene anwenden, dann Bloom hinzufügen ────────────
// ACESFilmic Näherung (Krzysztof Narkowicz, 2015).
const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uStrength;
uniform float uExposure;
varying vec2 vUv;

vec3 acesFilmic(vec3 x) {
  return clamp(
    (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14),
    0.0, 1.0
  );
}

void main() {
  vec3 hdr   = texture2D(tScene, vUv).rgb * uExposure;
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  vec3 color = acesFilmic(hdr + bloom * uStrength);
  // Gamma-Korrektur (sRGB-Ausgabe)
  gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}`;

// ─── Öffentliche Schnittstelle ────────────────────────────────────────────────────

export interface BloomOptions {
  /** HDR-Leuchtdichte-Schwelle für Bloom-Extraktion (Standard 0,85). */
  threshold?: number;
  /** Additive Bloom-Stärke im Composite-Pass (Standard 0,5). */
  strength?: number;
  /** Unschärfe-Schrittskala — größer = breiterer Glanz (Standard 2,0 Pixel bei halber Auflösung). */
  blurScale?: number;
  /** Belichtung vor ACESFilmic Tone-Mapping angewendet (Standard 1,2). */
  exposure?: number;
}

export interface BloomEffect {
  /** Ersetzen Sie renderer.render(scene, camera) damit. */
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  /** Aufrufen, wenn die Canvas-Größe geändert wird. */
  setSize(width: number, height: number): void;
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
      uExposure: { value: exposure }
    },
    vertexShader:   VERT,
    fragmentShader: COMPOSITE_FRAG,
    depthTest: false,
    depthWrite: false
  });

  // ── Größenverfolgung ───────────────────────────────────────────────────────
  let fullW = 1, fullH = 1, halfW = 1, halfH = 1;

  function setSize(width: number, height: number): void {
    fullW = width;
    fullH = height;
    const bloomDiv = 2;
    halfW = Math.max(1, Math.floor(width / bloomDiv));
    halfH = Math.max(1, Math.floor(height / bloomDiv));

    sceneRT .setSize(fullW, fullH);
    brightRT.setSize(halfW, halfH);
    blurHRT .setSize(halfW, halfH);
    blurVRT .setSize(halfW, halfH);
  }

  // ── Render-Pipeline ─────────────────────────────────────────────────────
  function render(scene: THREE.Scene, camera: THREE.Camera): void {
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

    // 2. Schwellen-Pass → halb-auflösendes brightRT
    thresholdMat.uniforms.tDiffuse.value = sceneRT.texture;
    quadMesh.material = thresholdMat;
    renderer.setRenderTarget(brightRT);
    renderer.render(quadScene, orthoCamera);

    // 3. Horizontale Unschärfe
    blurHMat.uniforms.tDiffuse.value = brightRT.texture;
    blurHMat.uniforms.uDir.value.set(blurScale / halfW, 0);
    quadMesh.material = blurHMat;
    renderer.setRenderTarget(blurHRT);
    renderer.render(quadScene, orthoCamera);

    // 4. Vertikale Unschärfe
    blurVMat.uniforms.tDiffuse.value = blurHRT.texture;
    blurVMat.uniforms.uDir.value.set(0, blurScale / halfH);
    quadMesh.material = blurVMat;
    renderer.setRenderTarget(blurVRT);
    renderer.render(quadScene, orthoCamera);

    // 5. Zusammensetzen → Bildschirm.
    //    Der Composite-Shader wendet ACESFilmic + pow(1/2.2) Gamma selbst an.
    //    Wir verwenden LinearSRGBColorSpace, damit der Renderer KEINE zweite sRGB-Konvertierung auf unserer bereits Gamma-korrigierten Ausgabe anwendet.
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
  }

  return { render, setSize, dispose };
}
