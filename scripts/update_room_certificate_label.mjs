/** Replace only the fifth frame's flat lettering, preserving every other payload.
 * Run: node scripts/update_room_certificate_label.mjs [blender-executable]
 * Writes a review candidate under output/room-refined/datacamp; never publishes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'output/room-refined/datacamp');
fs.mkdirSync(out, { recursive: true });
const source = fs.readFileSync(path.join(root, 'public/models/room-refined.glb'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(source), '04d44261f6d7bc8b793cc641cd8b77fed7d77069525ba0d4f49797e80a34c110', 'Use the reviewed source room.');
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.toString('utf8', 20, 20 + jsonLength));
const original = structuredClone(gltf);
const bin = source.subarray(28 + jsonLength);
const viewBytes = id => { const view = original.bufferViews[id]; return bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength); };
const node = gltf.nodes.find(item => item.name === 'Certificate_Topic_Labels');
const primitive = gltf.meshes[node.mesh].primitives[0];
assert.equal(gltf.meshes[node.mesh].primitives.length, 1);
const ext = primitive.extensions.KHR_draco_mesh_compression;

// Use the decoder already shipped with the site, without a new npm dependency.
const decoderDir = path.join(root, 'public/draco');
const decoderModule = { exports: {} };
new Function('require', '__dirname', 'module', 'exports', fs.readFileSync(path.join(decoderDir, 'draco_wasm_wrapper.js'), 'utf8'))(
  createRequire(import.meta.url), decoderDir, decoderModule, decoderModule.exports);
const module = await decoderModule.exports({ wasmBinary: fs.readFileSync(path.join(decoderDir, 'draco_decoder.wasm')) });
function decode(primitive) {
  const ext = primitive.extensions.KHR_draco_mesh_compression;
  const decoder = new module.Decoder(), buffer = new module.DecoderBuffer(), mesh = new module.Mesh();
  const compressed = viewBytes(ext.bufferView);
  buffer.Init(new Int8Array(compressed), compressed.length);
  assert.ok(decoder.DecodeBufferToMesh(buffer, mesh).ok());
  const attributes = {};
  for (const [name, id] of Object.entries(ext.attributes)) {
    const attribute = decoder.GetAttributeByUniqueId(mesh, id), array = new module.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(mesh, attribute, array);
    attributes[name] = { size: attribute.num_components(), data: Array.from({ length: array.size() }, (_, i) => array.GetValue(i)) };
    module.destroy(array);
  }
  const faces = [], face = new module.DracoInt32Array();
  for (let i = 0; i < mesh.num_faces(); i++) { decoder.GetFaceFromMesh(mesh, i, face); faces.push([face.GetValue(0), face.GetValue(1), face.GetValue(2)]); }
  for (const object of [face, mesh, buffer, decoder]) module.destroy(object);
  return { attributes, faces };
}
const { attributes, faces } = decode(primitive);
const position = id => attributes.POSITION.data.slice(id * 3, id * 3 + 3);
const replaced = faces.filter(ids => ids.every(id => position(id)[0] < -1.75));
const kept = faces.filter(ids => ids.every(id => position(id)[0] > -1.75));
assert.equal(replaced.length + kept.length, faces.length, 'Label boundary crossed a triangle.');
assert.ok(replaced.length > 40 && kept.length > 40);

const glyphPath = path.join(out, 'datacamp-glyph.json');
const python = `import bpy, json, os
from pathlib import Path
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
font=bpy.data.curves.new('DataCamp_Font', type='FONT')
font.body='DATA\\nCAMP'
font.align_x='CENTER'; font.align_y='CENTER'; font.size=0.112
font.resolution_u=1; font.fill_mode='FRONT'; font.space_character=1.08
font.space_word=1.0; font.space_line=0.84; font.offset=0.0015
font.font=bpy.data.fonts.load(str(Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts'/'segoeuib.ttf'))
obj=bpy.data.objects.new('DataCamp',font); bpy.context.scene.collection.objects.link(obj)
obj.select_set(True); bpy.context.view_layer.objects.active=obj
bpy.ops.object.convert(target='MESH')
mesh=bpy.context.object.data; mesh.calc_loop_triangles()
data={'positions':[[v.co.x-2.1,0,-v.co.y] for v in mesh.vertices], 'faces':[list(t.vertices) for t in mesh.loop_triangles]}
Path(${JSON.stringify(glyphPath)}).write_text(json.dumps(data), encoding='utf-8')
`;
execFileSync(process.argv[2] || 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe',
  ['--background', '--factory-startup', '--python-expr', python], { stdio: 'pipe' });
const glyph = JSON.parse(fs.readFileSync(glyphPath, 'utf8'));
assert.ok(glyph.positions.every(([x, y, z]) => x > -2.3 && x < -1.9 && y === 0 && Math.abs(z) < .1));

// The dark, planar ink retains the old label's baked illumination. Use the
// centroid of its largest UV triangle: safely inside an existing atlas island,
// with no interpolation into empty atlas space or new texture allocation.
const oldUv = id => attributes.TEXCOORD_1.data.slice(id * 2, id * 2 + 2);
const area = ids => { const [a,b,c] = ids.map(oldUv); return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])); };
const sampleFace = replaced.reduce((best, ids) => area(ids) > area(best) ? ids : best);
const lightUv = [0,1].map(axis => sampleFace.reduce((sum,id) => sum + oldUv(id)[axis], 0)/3);
const result = Object.fromEntries(Object.entries(attributes).map(([name, attr]) => [name, { size: attr.size, data: [] }]));
const indices = [], remap = new Map();
for (const triangle of kept) for (const id of triangle) {
  if (!remap.has(id)) {
    remap.set(id, remap.size);
    for (const [name, attr] of Object.entries(attributes)) result[name].data.push(...attr.data.slice(id*attr.size,(id+1)*attr.size));
  }
  indices.push(remap.get(id));
}
const offset = remap.size;
for (const [x,y,z] of glyph.positions) {
  result.POSITION.data.push(x,y,z);
  result.NORMAL.data.push(0,1,0);
  result.TEXCOORD_0.data.push((x+2.1)/.4+.5, .5-z/.2);
  result.TEXCOORD_1.data.push(...lightUv);
}
for (const triangle of glyph.faces) indices.push(...triangle.map(id => id + offset));
const payloads = original.bufferViews.map((_,id) => Buffer.from(viewBytes(id)));
function replacePrimitive(primitive, attributes, indices) {
  const viewId = primitive.extensions.KHR_draco_mesh_compression.bufferView;
  const positionBytes = Buffer.from(new Float32Array(attributes.POSITION.data).buffer);
  payloads[viewId] = positionBytes;
  gltf.bufferViews[viewId] = { buffer: 0, byteLength: positionBytes.length, target: 34962 };
  for (const [name, attr] of Object.entries(attributes)) {
    const view = name === 'POSITION' ? viewId : payloads.length;
    if (name !== 'POSITION') {
      const bytes = Buffer.from(new Float32Array(attr.data).buffer);
      payloads.push(bytes); gltf.bufferViews.push({ buffer: 0, byteLength: bytes.length, target: 34962 });
    }
    const accessor = { bufferView: view, componentType: 5126, count: attr.data.length/attr.size, type: `VEC${attr.size}` };
    if (name === 'POSITION') {
      accessor.min = [0,1,2].map(axis => Math.min(...attr.data.filter((_,i) => i%3===axis)));
      accessor.max = [0,1,2].map(axis => Math.max(...attr.data.filter((_,i) => i%3===axis)));
    }
    gltf.accessors[primitive.attributes[name]] = accessor;
  }
  const indexBytes = Buffer.from(new Uint16Array(indices).buffer);
  // The paper's old index accessor is shared by other identical beveled boxes.
  primitive.indices = gltf.accessors.length;
  gltf.accessors.push({ bufferView: payloads.length, componentType: 5123, count: indices.length, type: 'SCALAR' });
  payloads.push(indexBytes); gltf.bufferViews.push({ buffer: 0, byteLength: indexBytes.length, target: 34963 });
  delete primitive.extensions;
}
replacePrimitive(primitive,result,indices);

// The old ink also cast shadows onto paper05 in the existing atlas. Reuse the
// clean front-face illumination of the identically sized neighboring blank
// paper04. Only the two planar front triangles receive different lightmap UVs;
// position, normals, UV0, bevel/back UV1, materials and atlas pixels are retained.
const paperPrimitive = name => gltf.meshes[gltf.nodes.find(item=>item.name===name).mesh].primitives[0];
const paper = paperPrimitive('Certificate_05_Paper');
const paperView = paper.extensions.KHR_draco_mesh_compression.bufferView;
const paperBefore = decode(paper), paperData = structuredClone(paperBefore);
const blank = decode(paperPrimitive('Certificate_04_Paper'));
function frontTriangles(data) {
  const pos=data.attributes.POSITION.data, normal=data.attributes.NORMAL.data;
  const maxZ=Math.max(...pos.filter((_,i)=>i%3===2));
  return data.faces.filter(ids=>ids.every(id=>Math.abs(pos[id*3+2]-maxZ)<1e-5 && normal[id*3+2]>.999));
}
const oldFront=frontTriangles(paperData), blankFront=frontTriangles(blank);
assert.equal(oldFront.length,2); assert.equal(blankFront.length,2);
const donor=blankFront[0].map(id=>({ p:blank.attributes.POSITION.data.slice(id*3,id*3+2),uv:blank.attributes.TEXCOORD_1.data.slice(id*2,id*2+2) }));
const [a,b,c]=donor;
const det=(b.p[0]-a.p[0])*(c.p[1]-a.p[1])-(b.p[1]-a.p[1])*(c.p[0]-a.p[0]);
assert.ok(Math.abs(det)>.01);
const frontIds=new Set(oldFront.flat());
for(const id of frontIds) {
  const [x,y]=paperData.attributes.POSITION.data.slice(id*3,id*3+2);
  const wb=((x-a.p[0])*(c.p[1]-a.p[1])-(y-a.p[1])*(c.p[0]-a.p[0]))/det;
  const wc=((b.p[0]-a.p[0])*(y-a.p[1])-(b.p[1]-a.p[1])*(x-a.p[0]))/det;
  for(let axis=0;axis<2;axis++) paperData.attributes.TEXCOORD_1.data[id*2+axis]=a.uv[axis]*(1-wb-wc)+b.uv[axis]*wb+c.uv[axis]*wc;
}
for(const name of ['POSITION','NORMAL','TEXCOORD_0']) assert.deepEqual(paperData.attributes[name],paperBefore.attributes[name]);
for(let id=0;id<paperData.attributes.POSITION.data.length/3;id++) if(!frontIds.has(id)) assert.deepEqual(paperData.attributes.TEXCOORD_1.data.slice(id*2,id*2+2),paperBefore.attributes.TEXCOORD_1.data.slice(id*2,id*2+2));
replacePrimitive(paper,paperData.attributes,paperData.faces.flat());
for (const name of ['Anchor_Certificate_05', 'Certificate_05_Paper']) {
  const target = gltf.nodes.find(item => item.name === name);
  assert.equal(target.extras.topic_id, 'jetbrains');
  target.extras.topic_id = 'datacamp'; target.extras.label = 'DataCamp';
}
let byteOffset = 0;
const aligned = payloads.map((bytes,id) => {
  gltf.bufferViews[id].byteOffset = byteOffset;
  const padded = Buffer.alloc(Math.ceil(bytes.length/4)*4); bytes.copy(padded);
  byteOffset += padded.length; return padded;
});
gltf.buffers[0].byteLength = byteOffset;
const json = Buffer.from(JSON.stringify(gltf));
const jsonChunk = Buffer.alloc(Math.ceil(json.length/4)*4, 32); json.copy(jsonChunk);
const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2,4);
header.writeUInt32LE(28+jsonChunk.length+byteOffset,8); header.writeUInt32LE(jsonChunk.length,12); header.write('JSON',16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(byteOffset); binHeader.write('BIN\0',4);
const candidate = Buffer.concat([header,jsonChunk,binHeader,...aligned]);
for (let i=0;i<original.bufferViews.length;i++) if(i!==ext.bufferView && i!==paperView) assert.deepEqual(payloads[i],viewBytes(i));
assert.deepEqual(gltf.materials,original.materials);
assert.deepEqual(gltf.scenes,original.scenes);
assert.equal(gltf.nodes.length,original.nodes.length);
assert.equal(gltf.meshes.length,original.meshes.length);
fs.writeFileSync(path.join(out,'room-refined.glb'),candidate);
const report = { sourceSha256:sha(source), outputSha256:sha(candidate), sourceBytes:source.length, outputBytes:candidate.length,
  replacedTriangles:replaced.length, newTriangles:glyph.faces.length, unchangedLabelTriangles:kept.length,
  unchangedBufferViews:original.bufferViews.length-2, sameMaterials:true, sameNodes:true, sameDrawCalls:true,
  newLabelBounds:[0,1,2].map(axis=>[Math.min(...glyph.positions.map(p=>p[axis])),Math.max(...glyph.positions.map(p=>p[axis]))]),
  lightmapSample:lightUv, atlasUnchanged:true, paper05FrontUvSource:'Certificate_04_Paper', paper05ChangedUvVertices:frontIds.size, paper05ChangedTriangles:oldFront.length };
fs.writeFileSync(path.join(out,'label-update-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
