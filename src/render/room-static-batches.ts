import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const CELL_SIZE = 2.5; // Authored room metres; keep distant props independently culled.
const RESERVED_NAME = /^(?:Anchor_|Certificate_|mon_cctv_|Monitor_\d+_Screen$|merged_cert_mat_back$|[wb]_(?:bishop|rook|knight|queen|king|pawn))/i;
const STATIC_ATTRIBUTES = new Set(['position', 'normal', 'tangent', 'uv', 'uv1', 'color']);

export interface RoomBatchStats {
  sourceMeshes: number;
  batches: number;
  drawCallsSavedPerPass: number;
  triangles: number;
  geometryBytes: number;
}

/** Merge only fixed, baked, opaque room surfaces after all material overrides.
 * Original nodes remain available for named anchors/bounds and own their assets.
 * Their transforms/visibility must not be animated while this controller lives.
 */
export function createRoomStaticBatches(root: THREE.Object3D): {
  stats: RoomBatchStats;
  dispose: () => void;
} {
  const stats: RoomBatchStats = { sourceMeshes: 0, batches: 0, drawCallsSavedPerPass: 0, triangles: 0, geometryBytes: 0 };
  const buckets = new Map<string, { mesh: THREE.Mesh; transform: THREE.Matrix4 }[]>();
  const originals: THREE.Mesh[] = [];
  const created: THREE.Mesh[] = [];
  const batchGroup = new THREE.Group();
  batchGroup.name = 'Room_Static_Batches';
  let disposed = false;

  root.updateWorldMatrix(true, true);
  const rootInverse = root.matrixWorld.clone().invert();
  const bounds = new THREE.Box3();
  const center = new THREE.Vector3();

  function eligibleAncestors(node: THREE.Object3D): boolean {
    for (let parent: THREE.Object3D | null = node; parent; parent = parent.parent) {
      if (!parent.visible || RESERVED_NAME.test(parent.name) || parent.userData.hotspot ||
          parent.animations.length || parent.renderOrder !== 0) return false;
      if (parent === root) return true;
    }
    return false;
  }

  root.traverse(node => {
    // InstancedMesh also reports type='Mesh'; only plain meshes are safe here.
    if (!(node instanceof THREE.Mesh) || node.constructor !== THREE.Mesh || node.children.length ||
        !node.userData.room_lightmapped || !eligibleAncestors(node) ||
        node.customDepthMaterial || node.customDistanceMaterial ||
        node.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender ||
        node.onAfterRender !== THREE.Object3D.prototype.onAfterRender ||
        node.onBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow ||
        node.onAfterShadow !== THREE.Object3D.prototype.onAfterShadow) return;

    const material = node.material;
    if (!(material instanceof THREE.MeshStandardMaterial) || !material.lightMap ||
        !material.visible || material.transparent || material.opacity !== 1 ||
        !material.depthWrite || material.alphaTest > 0 || material.alphaHash ||
        (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0)) return;

    const geometry = node.geometry;
    const position = geometry.getAttribute('position');
    if (!position || !position.count || geometry.groups.length ||
        Object.keys(geometry.morphAttributes).length ||
        geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) return;
    const attributes = Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b));
    if (attributes.some(([name, attribute]) => !STATIC_ATTRIBUTES.has(name) ||
        !(attribute instanceof THREE.BufferAttribute) || attribute.count !== position.count ||
        (['position', 'normal', 'tangent'].includes(name) &&
          (!(attribute.array instanceof Float32Array) || attribute.normalized)))) return;

    const transform = new THREE.Matrix4().multiplyMatrices(rootInverse, node.matrixWorld);
    // Reflected winding needs an explicit index/tangent correction, so leave it alone.
    if (!transform.elements.every(Number.isFinite) || transform.determinant() <= 1e-10) return;
    geometry.computeBoundingBox();
    bounds.copy(geometry.boundingBox!).applyMatrix4(transform).getCenter(center);
    const layout = attributes.map(([name, attribute]) => {
      const value = attribute as THREE.BufferAttribute;
      return `${name}:${value.itemSize}:${value.array.constructor.name}:${value.normalized}:${value.gpuType}`;
    }).join('|');
    const key = [material.uuid, node.castShadow, node.receiveShadow, node.layers.mask, node.frustumCulled,
      !!geometry.index, layout, Math.floor(center.x / CELL_SIZE), Math.floor(center.z / CELL_SIZE)].join(';');
    const bucket = buckets.get(key) ?? [];
    bucket.push({ mesh: node, transform });
    buckets.set(key, bucket);
  });

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    batchGroup.removeFromParent();
    for (const node of originals) node.visible = true;
    for (const mesh of created) mesh.geometry.dispose();
    batchGroup.clear();
  }

  try {
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      const copies: THREE.BufferGeometry[] = [];
      let merged: THREE.BufferGeometry | null = null;
      try {
        for (const { mesh, transform } of bucket) {
          const copy = mesh.geometry.clone();
          copies.push(copy);
          copy.applyMatrix4(transform);
        }
        merged = mergeGeometries(copies, false);
      } finally {
        for (const copy of copies) copy.dispose();
      }
      if (!merged) continue;
      const source = bucket[0].mesh;
      const mesh = new THREE.Mesh(merged, source.material);
      created.push(mesh); // Own the geometry before any further setup can fail.
      mesh.name = `Room_Static_Batch_${created.length}`;
      mesh.castShadow = source.castShadow;
      mesh.receiveShadow = source.receiveShadow;
      mesh.layers.mask = source.layers.mask;
      mesh.frustumCulled = source.frustumCulled;
      mesh.matrixAutoUpdate = false;
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      batchGroup.add(mesh);
      for (const { mesh: original } of bucket) {
        originals.push(original);
        original.visible = false;
      }
      stats.sourceMeshes += bucket.length;
      stats.batches += 1;
      stats.drawCallsSavedPerPass += bucket.length - 1;
      stats.triangles += (merged.index?.count ?? merged.getAttribute('position').count) / 3;
      stats.geometryBytes += (merged.index?.array.byteLength ?? 0) +
        Object.values(merged.attributes).reduce((total, attribute) => total + attribute.array.byteLength, 0);
    }
    if (created.length) root.add(batchGroup);
  } catch (error) {
    dispose();
    throw error;
  }

  return { stats, dispose };
}
