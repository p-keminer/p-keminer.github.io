/** Restore the fifth certificate's baked DATA/CAMP shadow, without rebaking the room.
 * node scripts/update_room_certificate_shadow.mjs [--blender path] [--python path]
 * Optional --source-glb, --atlas and --reuse-bake paths accept the checked input
 * snapshots and an existing matching local bake when evaluating atlas placement.
 * Writes an isolated candidate; never writes public assets or the source blend.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), 'Missing value for ' + flag);
  return args[index + 1];
};
const out = path.join(root, 'output/room-refined/datacamp-shadow-v3');
assert.ok(!fs.existsSync(out), 'Use a fresh candidate directory.');
const blend = path.join(root, 'output/room-refined/plant-facets/repair-v1/room-refined.blend');
const atlas = path.resolve(option('--atlas', path.join(root, 'public/models/room-refined-lightmap.webp')));
const sourcePath = path.resolve(option('--source-glb', path.join(root, 'public/models/room-refined.glb')));
const previousPath = path.join(root, 'output/room-refined/plant-facets/repair-v1/room-refined.glb');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = Object.fromEntries([blend, atlas, sourcePath, previousPath].map(p => [p, sha(fs.readFileSync(p))]));
assert.equal(hashes[sourcePath], '0c3aa5bc313f56fb52b64f7bb0644e83ddb72d18e7aa73ab42f9e6a9c9995ede');
assert.equal(hashes[blend], '985c93056edb22613e10944106046c0fa6beca494d9861fe61b7829173f4d8d1');
assert.equal(hashes[atlas], 'e41560a7bae9d60ca7d73ddd486004873adeb50f0a07aad488a5fbbb431a83ac');
assert.equal(hashes[previousPath], '04d44261f6d7bc8b793cc641cd8b77fed7d77069525ba0d4f49797e80a34c110');
function read(bytes) {
  const jsonLength = bytes.readUInt32LE(12);
  return { bytes, json: JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength)), binOffset: 28 + jsonLength };
}
const source = read(fs.readFileSync(sourcePath)), previous = read(fs.readFileSync(previousPath));
const decoderDir = path.join(root, 'public/draco'), decoderModule = { exports: {} };
new Function('require', '__dirname', 'module', 'exports', fs.readFileSync(path.join(decoderDir, 'draco_wasm_wrapper.js'), 'utf8'))(
  createRequire(import.meta.url), decoderDir, decoderModule, decoderModule.exports);
const draco = await decoderModule.exports({ wasmBinary: fs.readFileSync(path.join(decoderDir, 'draco_decoder.wasm')) });
const part = (data, name) => data.json.meshes[data.json.nodes.find(n => n.name === name).mesh].primitives[0];
function accessor(data, index) {
  const a = data.json.accessors[index], v = data.json.bufferViews[a.bufferView];
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const componentBytes = { 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
  const values = [];
  for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) {
    const offset = data.binOffset + (v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || size * componentBytes) + k * componentBytes;
    values.push(a.componentType === 5126 ? data.bytes.readFloatLE(offset) : a.componentType === 5123 ? data.bytes.readUInt16LE(offset) : data.bytes.readUInt32LE(offset));
  }
  return { size, values };
}
function decode(data, primitive) {
  const ext = primitive.extensions?.KHR_draco_mesh_compression;
  if (!ext) return { attrs: Object.fromEntries(Object.entries(primitive.attributes).map(([name, id]) => [name, accessor(data, id)])), indices: accessor(data, primitive.indices).values };
  const decoder = new draco.Decoder(), buffer = new draco.DecoderBuffer(), mesh = new draco.Mesh();
  const v = data.json.bufferViews[ext.bufferView], compressed = data.bytes.subarray(data.binOffset + (v.byteOffset || 0), data.binOffset + (v.byteOffset || 0) + v.byteLength);
  buffer.Init(new Int8Array(compressed), compressed.length);
  assert.ok(decoder.DecodeBufferToMesh(buffer, mesh).ok());
  const attrs = {}, indices = [], face = new draco.DracoInt32Array();
  for (const [name, id] of Object.entries(ext.attributes)) {
    const attr = decoder.GetAttributeByUniqueId(mesh, id), a = new draco.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(mesh, attr, a);
    attrs[name] = { size: attr.num_components(), values: Array.from({ length: a.size() }, (_, i) => a.GetValue(i)) };
    draco.destroy(a);
  }
  for (let i = 0; i < mesh.num_faces(); i++) { decoder.GetFaceFromMesh(mesh, i, face); indices.push(face.GetValue(0), face.GetValue(1), face.GetValue(2)); }
  for (const object of [face, mesh, buffer, decoder]) draco.destroy(object);
  return { attrs, indices };
}
const oldPaper = decode(previous, part(previous, 'Certificate_05_Paper'));
const paperPart = part(source, 'Certificate_05_Paper'), paper = decode(source, paperPart);
assert.deepEqual(paper.attrs.POSITION, oldPaper.attrs.POSITION);
assert.deepEqual(paper.attrs.NORMAL, oldPaper.attrs.NORMAL);
assert.deepEqual(paper.indices, oldPaper.indices);
const maxZ = Math.max(...paper.attrs.POSITION.values.filter((_, i) => i % 3 === 2));
const front = Array.from({ length: paper.attrs.POSITION.values.length / 3 }, (_, i) => i)
  .filter(i => Math.abs(paper.attrs.POSITION.values[i * 3 + 2] - maxZ) < 1e-5 && paper.attrs.NORMAL.values[i * 3 + 2] > .999);
assert.equal(front.length, 4);
const rectangle = [1718, 1434, 1759, 1468], sourceRectangle = [1885, 1924, 1926, 1958], delta = [-167, -490];
// Reserve 32 additional pixels outside the five-pixel baked front margin.
// This conservatively isolates the visible mip footprint from nearby islands;
// the AABB check includes every baked triangle, including degenerate UVs.
let receivers = 0;
for (const node of source.json.nodes) if (node.extras?.room_lightmapped && node.mesh !== undefined) {
  receivers++;
  for (const primitive of source.json.meshes[node.mesh].primitives) {
    const { attrs, indices } = decode(source, primitive);
    for (let i = 0; i < indices.length; i += 3) {
      const uv = indices.slice(i, i + 3).map(id => attrs.TEXCOORD_1.values.slice(id * 2, id * 2 + 2).map(v => v * 2048));
      const min = [0, 1].map(k => Math.min(...uv.map(p => p[k])) - 32.5), max = [0, 1].map(k => Math.max(...uv.map(p => p[k])) + 32.5);
      assert.ok(max[0] <= rectangle[0] || min[0] >= rectangle[2] || max[1] <= rectangle[1] || min[1] >= rectangle[3], 'Reserved atlas field overlaps ' + node.name);
    }
  }
}
assert.equal(receivers, 210);
const labels = decode(source, part(source, 'Certificate_Topic_Labels'));
const positions = Array.from({ length: labels.attrs.POSITION.values.length / 3 }, (_, i) => labels.attrs.POSITION.values.slice(i * 3, i * 3 + 3));
const faces = Array.from({ length: labels.indices.length / 3 }, (_, i) => labels.indices.slice(i * 3, i * 3 + 3));
assert.equal(faces.length, 340);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'bake-input.json'), JSON.stringify({ blend, positions, faces, rectangle, sourceRectangle, delta }));
const reuse = option('--reuse-bake', null);
if (reuse) {
  const input = JSON.parse(fs.readFileSync(path.join(reuse, 'bake-input.json'), 'utf8'));
  assert.equal(input.blend, blend); assert.deepEqual(input.positions, positions); assert.deepEqual(input.faces, faces);
  assert.deepEqual(input.sourceRectangle, sourceRectangle);
  for (const file of ['paper05-denoised.npy', 'bake-report.json']) fs.copyFileSync(path.join(reuse, file), path.join(out, file));
} else {
  execFileSync(option('--blender', 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'),
    ['--background', '--factory-startup', '--python', path.join(root, 'scripts/bake_datacamp_certificate_shadow.py'), '--', out], { stdio: 'inherit' });
}
// The current GLB is already uncompressed for this one UV accessor. Patch only
// its eight floats in place: JSON, every other BufferView and glyphs stay exact.
const candidate = Buffer.from(source.bytes), uv = source.json.accessors[paperPart.attributes.TEXCOORD_1], view = source.json.bufferViews[uv.bufferView];
assert.equal(uv.componentType, 5126); assert.equal(uv.type, 'VEC2'); assert.ok(!view.byteStride);
const changedBytes = new Set();
for (const id of front) for (let axis = 0; axis < 2; axis++) {
  const offset = source.binOffset + (view.byteOffset || 0) + (uv.byteOffset || 0) + (id * 2 + axis) * 4;
  const value = oldPaper.attrs.TEXCOORD_1.values[id * 2 + axis] + delta[axis] / 2048;
  candidate.writeFloatLE(value, offset);
  for (let k = 0; k < 4; k++) changedBytes.add(offset + k);
}
for (let i = 0; i < candidate.length; i++) if (!changedBytes.has(i)) assert.equal(candidate[i], source.bytes[i]);
fs.writeFileSync(path.join(out, 'room-refined.glb'), candidate);
const python = String.raw`
import json, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
out, source = Path(sys.argv[1]), Path(sys.argv[2])
spec=json.loads((out/'bake-input.json').read_text())
rgba=np.asarray(Image.open(source).convert('RGBA')).copy()
before=rgba.copy()
rgb=np.load(out/'paper05-denoised.npy')[::-1]
x0,y0,x1,y1=spec['sourceRectangle']; tx,ty,ex,ey=spec['rectangle']
patch=np.maximum(rgb[y0:y1,x0:x1],0)
assert np.isfinite(patch).all() and patch.max()<128
assert patch.shape==(ey-ty,ex-tx,3)
a=np.clip(np.ceil(np.sqrt(patch.max(axis=2)/128)*255),1,255).astype(np.uint8)
linear=patch/((a.astype(np.float32)/255)**2*128)[:,:,None]
encoded=np.where(linear<=.0031308,linear*12.92,1.055*np.power(linear,1/2.4)-.055)
rgba[ty:ey,tx:ex,:3]=np.rint(np.clip(encoded,0,1)*255).astype(np.uint8)
rgba[ty:ey,tx:ex,3]=a
mask=np.zeros((2048,2048),bool);mask[ty:ey,tx:ex]=True
assert np.array_equal(before[~mask],rgba[~mask])
image=Image.fromarray(rgba)
image.save(out/'room-redesign-lightmap.png')
image.save(out/'room-refined-lightmap.webp',lossless=True,quality=100,method=6,exact=True)
assert np.array_equal(np.asarray(Image.open(out/'room-refined-lightmap.webp').convert('RGBA')),rgba)
preview=1.055*np.power(np.clip(patch,0,1),1/2.4)-.055
Image.fromarray(np.rint(np.clip(preview,0,1)*255).astype(np.uint8)).resize((410,340)).save(out/'paper05-shadow-preview.png')
(out/'atlas-report.json').write_text(json.dumps({'atlasSize':2048,'scale':128,'multiplierPower':2,'encoding':'RGBM-sqrt/sRGB8-alpha-linear','rectangle':spec['rectangle'],'sourceRectangle':spec['sourceRectangle'],'changedPixels':int(np.any(before!=rgba,axis=2).sum()),'outsidePixelsUnchanged':True,'linearPatchMinMax':[float(patch.min()),float(patch.max())],'webpSha256':hashlib.sha256((out/'room-refined-lightmap.webp').read_bytes()).hexdigest()},indent=2))
`;
execFileSync(option('--python', 'python'), ['-c', python, out, atlas], { stdio: 'inherit' });
for (const [file, hash] of Object.entries(hashes)) assert.equal(sha(fs.readFileSync(file)), hash, 'Source changed: ' + file);
const report = { sourceSha256: hashes[sourcePath], outputSha256: sha(candidate), sourceBytes: source.bytes.length, outputBytes: candidate.length,
  onlyChangedAccessor: paperPart.attributes.TEXCOORD_1, onlyChangedBufferView: uv.bufferView, changedUvVertices: front, changedTriangles: 2,
  sameGeometryAndLabelTriangles: true, sameMaterialsAndTransforms: true, sameDrawCalls: true, sourceFilesUnchanged: true,
  texelDensityUnchanged: true, atlasFrontShiftPixels: delta, atlasRectangle: rectangle, additionalEmptyAtlasMarginPixels: 32,
  atlas: JSON.parse(fs.readFileSync(path.join(out, 'atlas-report.json'), 'utf8')) };
fs.writeFileSync(path.join(out, 'shadow-update-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
