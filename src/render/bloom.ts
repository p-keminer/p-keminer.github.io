/**
 * bloom.ts — simple HDR bloom post-process for WebGLRenderer (Three.js r183).
 *
 * Pipeline:
 *   1. Render scene → HDR render target (tone-mapping OFF)
 *   2. Threshold pass  → extract bright pixels
 *   3. Horizontal blur → half-res blur target
 *   4. Vertical blur   → half-res blur target
 *   5. Composite       → screen (apply ACESFilmic + add bloom)
 *
 * No external dependencies — uses only core THREE primitives.
 */

import * as THREE from 'three';

// ─── Shared vertex shader ────────────────────────────────────────────────────
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// ─── Threshold: keep only pixels brighter than threshold ─────────────────────
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

// ─── Separable Gaussian blur (7-tap) ─────────────────────────────────────────
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

// ─── Composite: apply ACESFilmic tone-map to scene, then add bloom ────────────
// ACESFilmic approximation (Krzysztof Narkowicz, 2015).
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
  // Gamma correct (sRGB output)
  gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}`;

// ─── Public interface ────────────────────────────────────────────────────────

export interface BloomOptions {
  /** HDR luminance threshold for bloom extraction (default 0.85). */
  threshold?: number;
  /** Additive bloom strength in the composite pass (default 0.5). */
  strength?: number;
  /** Blur step scale — larger = wider glow (default 2.0 pixels at half-res). */
  blurScale?: number;
  /** Exposure applied before ACESFilmic tone-mapping (default 1.2). */
  exposure?: number;
}

export interface BloomEffect {
  /** Replace renderer.render(scene, camera) with this. */
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  /** Call whenever the canvas is resized. */
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

  // ── Render targets ──────────────────────────────────────────────────────
  const rtOpts: THREE.RenderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    depthBuffer: false
  };
  // Full-res scene target (with depth for actual rendering)
  const sceneRT  = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: true });
  // Half-res targets for threshold + blur
  const brightRT = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const blurHRT  = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const blurVRT  = new THREE.WebGLRenderTarget(1, 1, rtOpts);

  // ── Full-screen quad helpers ────────────────────────────────────────────
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo     = new THREE.PlaneGeometry(2, 2);
  const quadScene   = new THREE.Scene();
  const quadMesh    = new THREE.Mesh(quadGeo);
  quadScene.add(quadMesh);

  // ── Materials ───────────────────────────────────────────────────────────
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

  // ── Size tracking ───────────────────────────────────────────────────────
  let fullW = 1, fullH = 1, halfW = 1, halfH = 1;

  function setSize(width: number, height: number): void {
    fullW = width;
    fullH = height;
    halfW = Math.max(1, Math.floor(width / 2));
    halfH = Math.max(1, Math.floor(height / 2));

    sceneRT .setSize(fullW, fullH);
    brightRT.setSize(halfW, halfH);
    blurHRT .setSize(halfW, halfH);
    blurVRT .setSize(halfW, halfH);
  }

  // ── Render pipeline ─────────────────────────────────────────────────────
  function render(scene: THREE.Scene, camera: THREE.Camera): void {
    // Save renderer state
    const prevToneMapping = renderer.toneMapping;
    const prevOutputCS    = renderer.outputColorSpace;

    // 1. Render scene → HDR target.
    //    NoToneMapping + LinearSRGBColorSpace so we keep raw HDR values in the RT.
    renderer.toneMapping      = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    // Post-process passes run in linear + no-tone space as well.

    // 2. Threshold pass → half-res brightRT
    thresholdMat.uniforms.tDiffuse.value = sceneRT.texture;
    quadMesh.material = thresholdMat;
    renderer.setRenderTarget(brightRT);
    renderer.render(quadScene, orthoCamera);

    // 3. Horizontal blur
    blurHMat.uniforms.tDiffuse.value = brightRT.texture;
    blurHMat.uniforms.uDir.value.set(blurScale / halfW, 0);
    quadMesh.material = blurHMat;
    renderer.setRenderTarget(blurHRT);
    renderer.render(quadScene, orthoCamera);

    // 4. Vertical blur
    blurVMat.uniforms.tDiffuse.value = blurHRT.texture;
    blurVMat.uniforms.uDir.value.set(0, blurScale / halfH);
    quadMesh.material = blurVMat;
    renderer.setRenderTarget(blurVRT);
    renderer.render(quadScene, orthoCamera);

    // 5. Composite → screen.
    //    The composite shader applies ACESFilmic + pow(1/2.2) gamma itself.
    //    We use LinearSRGBColorSpace so the renderer does NOT apply a second
    //    sRGB conversion on top of our already gamma-corrected output.
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    compositeMat.uniforms.tScene.value = sceneRT.texture;
    compositeMat.uniforms.tBloom.value = blurVRT.texture;
    quadMesh.material = compositeMat;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, orthoCamera);

    // Restore original renderer state
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
