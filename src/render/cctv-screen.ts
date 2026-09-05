import * as THREE from 'three';

const MESH_LEFT = 'mon_cctv_left';
const MESH_CENTER = 'Monitor_02_Screen';
const MESH_RIGHT = 'mon_cctv_right';
const MAIN_SCREEN_MESH_NAMES = new Set([MESH_LEFT, MESH_CENTER, MESH_RIGHT]);
const SCREEN_MATERIAL_PATTERN = /screen/i;

export interface CCTVScreen {
  attach(roomRoot: THREE.Object3D): void;
  setAboutPreviewMix(mix: number): void;
  setPerformancePreviewMix(mix: number): void;
  setPortfolioPreviewMix(mix: number): void;
  dispose(): void;
}

export function createCCTVScreen(): CCTVScreen {
  const screenOffColor = new THREE.Color(0x000000);
  const monitorPageColor = new THREE.Color(0x0d1117);
  const blankScreenMaterial = new THREE.MeshBasicMaterial({
    color: screenOffColor,
    name: 'MAT_Screen_Runtime_Black',
    toneMapped: false
  });
  const performanceScreenMaterial = new THREE.MeshBasicMaterial({
    color: screenOffColor,
    name: 'MAT_Screen_Runtime_Performance',
    toneMapped: false
  });
  const aboutScreenMaterial = new THREE.MeshBasicMaterial({
    color: screenOffColor,
    name: 'MAT_Screen_Runtime_About',
    toneMapped: false
  });
  const portfolioScreenMaterial = new THREE.MeshBasicMaterial({
    color: screenOffColor,
    name: 'MAT_Screen_Runtime_Portfolio',
    toneMapped: false
  });

  function usesScreenMaterial(material: THREE.Material | THREE.Material[]): boolean {
    const materials = Array.isArray(material) ? material : [material];
    return materials.some((entry) => SCREEN_MATERIAL_PATTERN.test(entry.name));
  }

  function attach(roomRoot: THREE.Object3D): void {
    roomRoot.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      if (node.name === MESH_LEFT) {
        node.material = performanceScreenMaterial;
        return;
      }

      if (node.name === MESH_CENTER) {
        node.material = portfolioScreenMaterial;
        return;
      }

      if (node.name === MESH_RIGHT) {
        node.material = aboutScreenMaterial;
        return;
      }

      if (MAIN_SCREEN_MESH_NAMES.has(node.name) || usesScreenMaterial(node.material)) {
        node.material = blankScreenMaterial;
      }
    });
  }

  function setPreviewMix(material: THREE.MeshBasicMaterial, mix: number): void {
    material.color.lerpColors(
      screenOffColor,
      monitorPageColor,
      THREE.MathUtils.clamp(mix, 0, 1)
    );
  }

  return {
    attach,
    setAboutPreviewMix: mix => setPreviewMix(aboutScreenMaterial, mix),
    setPerformancePreviewMix: mix => setPreviewMix(performanceScreenMaterial, mix),
    setPortfolioPreviewMix: mix => setPreviewMix(portfolioScreenMaterial, mix),
    dispose(): void {
      aboutScreenMaterial.dispose();
      blankScreenMaterial.dispose();
      performanceScreenMaterial.dispose();
      portfolioScreenMaterial.dispose();
    }
  };
}
