"""Rebake three undersampled plant crowns into unused parts of the same atlas.

Run with Blender: blender -b --python scripts/repair_room_foliage_lighting.py
Outputs are isolated; source assets and public/models are never overwritten.
Requires the already used system Python/Pillow for lossless WebP byte access.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
import time
import zlib

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from bake_room_lighting import _configure_device, _encode_srgb8, _excluded_material_reason
from refine_room_geometry import export_glb, geometry_stats, materials_fingerprint

SIZE, PATCH, BORDER, SCALE = 2048, 128, 8, 128.0
SOURCE_BLEND_SHA256 = '9c709a241b4dd1a844940ec47cd483846cb0c75894ecdde12e97db85540a397a'
SOURCE_RGBA_SHA256 = '7e67c4d76326652f3c45b2cb599705029989960ed47f6401c335885cd86ed260'
RECTANGLES = {
    'Embedded_Floating_Shelf_Plant_Foliage': (1673, 772),
    'Embedded_Shelf_Plant_Foliage': (1685, 909),
    'Left_Decor_Plant_Foliage': (1685, 1046),
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def array_hash(collection, attribute: str, components: int, dtype=np.float32) -> str:
    values = np.empty(len(collection) * components, dtype=dtype)
    collection.foreach_get(attribute, values)
    return hashlib.sha256(values.tobytes()).hexdigest()


def invariants() -> dict:
    """Only the named crowns' LightmapUV coordinates are allowed to change."""
    objects = {}
    for obj in bpy.context.scene.objects:
        entry = {'parent': obj.parent.name if obj.parent else None,
                 'world': [list(row) for row in obj.matrix_world],
                 'basis': [list(row) for row in obj.matrix_basis],
                 'hidden': obj.hide_render,
                 'materials': [slot.material.name if slot.material else None for slot in obj.material_slots]}
        if obj.type == 'MESH':
            mesh = obj.data
            entry['geometry'] = [
                array_hash(mesh.vertices, 'co', 3),
                array_hash(mesh.loops, 'vertex_index', 1, np.int32),
                array_hash(mesh.polygons, 'loop_start', 1, np.int32),
                array_hash(mesh.polygons, 'loop_total', 1, np.int32),
                array_hash(mesh.polygons, 'material_index', 1, np.int32),
                array_hash(mesh.polygons, 'use_smooth', 1, np.bool_),
                array_hash(mesh.corner_normals, 'vector', 3),
            ]
            entry['uv'] = {uv.name: array_hash(uv.data, 'uv', 2) for uv in mesh.uv_layers
                           if not (obj.name in RECTANGLES and uv.name == 'LightmapUV')}
        objects[obj.name] = entry
    return {'objects': objects, 'materials': materials_fingerprint(), 'stats': geometry_stats()}


def original_uv_triangles() -> list:
    triangles = []
    receivers = 0
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or not obj.get('room_lightmapped'):
            continue
        receivers += 1
        mesh = obj.data
        uv = mesh.uv_layers.get('LightmapUV')
        if uv is None:
            raise RuntimeError('Baked mesh lacks LightmapUV: ' + obj.name)
        mesh.calc_loop_triangles()
        triangles.extend([[list(uv.data[i].uv) for i in tri.loops] for tri in mesh.loop_triangles])
    if receivers != 210:
        raise RuntimeError(f'Expected the approved 210 baked meshes, got {receivers}')
    return triangles


def image_process(python: str, mode: str, out: Path, source: Path) -> None:
    # Pillow runs outside Blender; this avoids color management/premultiplication
    # when accessing the RGBM alpha channel and uses no new image dependency.
    code = r'''
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
mode, directory, source = sys.argv[1:]
out = Path(directory)
spec = json.loads((out/'repair-layout.json').read_text())
if mode == 'read':
    image = Image.open(source).convert('RGBA')
    assert image.size == (2048,2048), 'Unexpected source atlas size'
    assert image.getextrema()[3][0] > 0, 'Invalid RGBM multiplier'
    (out/'source-rgba.bin').write_bytes(image.tobytes())
    mask = Image.new('L', image.size)
    draw = ImageDraw.Draw(mask)
    for tri in spec['triangles']:
        draw.polygon([(u*2048,(1-v)*2048) for u,v in tri], fill=255)
    mask = mask.filter(ImageFilter.MaxFilter(19))
    for x,y in spec['rectangles'].values():
        assert mask.crop((x,y,x+128,y+128)).getbbox() is None, 'Reserved rectangle is occupied'
else:
    image = Image.open(out/'room-redesign-lightmap.png').convert('RGBA')
    webp = out/'room-refined-lightmap.webp'
    image.save(webp, format='WEBP', lossless=True, quality=100, method=6, exact=True)
    assert Image.open(webp).convert('RGBA').tobytes() == image.tobytes(), 'RGBM WebP changed bytes'
'''
    subprocess.run([python, '-c', code, mode, str(out), str(source)], check=True)


def repack(targets: list) -> dict:
    previous = {}
    for obj in targets:
        mesh = obj.data
        if obj.modifiers or mesh.users != 1 or len(mesh.polygons) != 80:
            raise RuntimeError('Unexpected crown geometry: ' + obj.name)
        if len(mesh.uv_layers) != 2 or mesh.uv_layers[1].name != 'LightmapUV':
            raise RuntimeError('Unexpected UV layout: ' + obj.name)
        previous[obj.name] = [list(loop.uv) for loop in mesh.uv_layers[1].data]
        active_index = mesh.uv_layers.active_index
        active_render = [uv.active_render for uv in mesh.uv_layers]
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        mesh.uv_layers.active_index = 1
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0,
                                area_weight=0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=8 / (PATCH - 2 * BORDER))
        bpy.ops.object.mode_set(mode='OBJECT')
        x, y = RECTANGLES[obj.name]
        for loop in mesh.uv_layers[1].data:
            u, v = loop.uv
            if not (-1e-6 <= u <= 1 + 1e-6 and -1e-6 <= v <= 1 + 1e-6):
                raise RuntimeError('UV pack escaped unit square')
            loop.uv = ((x + BORDER + u * (PATCH - 2 * BORDER)) / SIZE,
                       1 - (y + PATCH - BORDER - v * (PATCH - 2 * BORDER)) / SIZE)
        mesh.uv_layers.active_index = active_index
        for uv, value in zip(mesh.uv_layers, active_render):
            uv.active_render = value
    return previous


def bake(targets: list, samples: int, out: Path) -> tuple[np.ndarray, str]:
    scene = bpy.context.scene
    image = bpy.data.images.new('Foliage_Repair_Temporary', width=SIZE, height=SIZE,
                                alpha=False, float_buffer=True)
    image.colorspace_settings.name = 'Non-Color'
    node_restore, metallic_restore = [], []
    settings = [(scene.render, 'engine'), (scene.cycles, 'samples'), (scene.cycles, 'use_denoising'),
                (scene.cycles, 'max_bounces'), (scene.cycles, 'diffuse_bounces'),
                (scene.cycles, 'glossy_bounces'), (scene.cycles, 'device'),
                (scene.render.bake, 'use_selected_to_active'), (scene.render.bake, 'margin_type')]
    settings = [(owner, key, getattr(owner, key)) for owner, key in settings]
    preferences = None
    try:
        for material in {slot.material for obj in targets for slot in obj.material_slots}:
            if _excluded_material_reason(material):
                raise RuntimeError('Unexpected receiving material')
            nodes = material.node_tree.nodes
            node_restore.append((material, nodes.active, [(node, node.select) for node in nodes]))
            node = nodes.new('ShaderNodeTexImage')
            node.image = image
            nodes.active = node
        eligible = set()
        for obj in scene.objects:
            if obj.type == 'MESH' and not obj.hide_render and obj.data.polygons and obj.material_slots:
                if not any(_excluded_material_reason(slot.material) for slot in obj.material_slots):
                    eligible.update(slot.material for slot in obj.material_slots)
        # Match the full bake's temporary unit-diffuse treatment of metals, while
        # keeping the entire room present for indirect light and occlusion.
        for material in eligible:
            for node in material.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED' and (metallic := node.inputs.get('Metallic')):
                    links = [(link.from_socket, link.to_socket) for link in metallic.links]
                    metallic_restore.append((material, metallic, metallic.default_value, links))
                    for link in list(metallic.links):
                        material.node_tree.links.remove(link)
                    metallic.default_value = 0
        bpy.ops.object.select_all(action='DESELECT')
        for obj in targets:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = targets[0]
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = samples
        scene.cycles.use_denoising = False
        scene.cycles.max_bounces = 4
        scene.cycles.diffuse_bounces = 3
        scene.cycles.glossy_bounces = 1
        scene.render.bake.use_selected_to_active = False
        scene.render.bake.margin_type = 'EXTEND'
        device, preferences, previous_type, devices = _configure_device(scene, True)
        print('FOLIAGE_REPAIR_BAKE', device, samples, flush=True)
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'},
                            use_clear=True, margin=8, uv_layer='LightmapUV', use_selected_to_active=False)
        pixels = np.empty(SIZE * SIZE * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        rgb = pixels.reshape(SIZE, SIZE, 4)[:, :, :3].copy()
        np.save(out / 'foliage-linear.npy', rgb)
        return rgb, device
    finally:
        for material, socket, value, links in metallic_restore:
            socket.default_value = value
            for source, destination in links:
                material.node_tree.links.new(source, destination)
        for material, active, selected in node_restore:
            original = {node for node, _ in selected}
            for node in list(material.node_tree.nodes):
                if node not in original:
                    material.node_tree.nodes.remove(node)
            for node, value in selected:
                node.select = value
            material.node_tree.nodes.active = active
        if preferences:
            for device, used in devices:
                device.use = used
            preferences.compute_device_type = previous_type
        for owner, key, value in settings:
            setattr(owner, key, value)
        bpy.data.images.remove(image)


def write_png(path: Path, rgba: np.ndarray) -> None:
    def chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    rows = b''.join(b'\0' + row.tobytes() for row in rgba)
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0))
                     + chunk(b'sRGB', b'\0') + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT/'output/room-refined/window-v5/room-refined.blend')
    parser.add_argument('--atlas', type=Path, default=ROOT/'output/room-refined/window-v5/room-refined-lightmap.png')
    parser.add_argument('--output-dir', type=Path, default=ROOT/'output/room-refined/plant-facets/repair-v1')
    parser.add_argument('--image-python', default='python')
    parser.add_argument('--samples', type=int, choices=[64, 128], default=128)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    source, atlas, out = args.source.resolve(), args.atlas.resolve(), args.output_dir.resolve()
    if not out.is_relative_to(ROOT/'output') or out.exists():
        raise RuntimeError('Use a new isolated directory beneath repository output/')
    hashes = {str(path): sha(path) for path in (source, atlas)}
    if hashes[str(source)] != SOURCE_BLEND_SHA256:
        raise RuntimeError('This targeted repair requires the approved window-v5 source blend')
    out.mkdir(parents=True)
    started = time.monotonic()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    for owner in (scene, bpy.data.objects['Room_Redesign_Root']):
        if (owner.get('room_lightmap_scale') != SCALE or owner.get('room_lightmap_multiplier_power') != 2
                or owner.get('room_lightmap_encoding') != 'RGBM-sqrt/sRGB8-alpha-linear'):
            raise RuntimeError('Source metadata does not match the approved RGBM-sqrt atlas')
    targets = [bpy.data.objects[name] for name in RECTANGLES]
    before = invariants()
    layout = {'rectangles': RECTANGLES, 'triangles': original_uv_triangles()}
    (out/'repair-layout.json').write_text(json.dumps(layout), encoding='utf-8')
    image_process(args.image_python, 'read', out, atlas)
    if sha(out/'source-rgba.bin') != SOURCE_RGBA_SHA256:
        raise RuntimeError('Atlas texels do not match the approved source blend; refusing a mismatched pair')
    previous_uv = repack(targets)
    rgb, device = bake(targets, args.samples, out)
    if invariants() != before:
        raise RuntimeError('Repair changed geometry, normals, transforms, materials or unrelated UVs')
    if not np.isfinite(rgb).all() or rgb.max() > SCALE or rgb.max() <= 0:
        raise RuntimeError('Invalid or out-of-range baked radiance')
    rgb = np.maximum(rgb[::-1], 0)
    multiplier = np.clip(np.ceil(np.sqrt(rgb.max(axis=2) / SCALE) * 255), 1, 255).astype(np.uint8)
    encoded = np.empty((SIZE, SIZE, 4), dtype=np.uint8)
    encoded[:, :, :3] = _encode_srgb8(rgb / ((multiplier.astype(np.float32)/255)**2*SCALE)[:, :, None])
    encoded[:, :, 3] = multiplier
    original = np.frombuffer((out/'source-rgba.bin').read_bytes(), dtype=np.uint8).reshape(SIZE, SIZE, 4)
    patched = original.copy()
    mask = np.zeros((SIZE, SIZE), dtype=bool)
    for x, y in RECTANGLES.values():
        patched[y:y+PATCH, x:x+PATCH] = encoded[y:y+PATCH, x:x+PATCH]
        mask[y:y+PATCH, x:x+PATCH] = True
    if not np.array_equal(patched[~mask], original[~mask]):
        raise RuntimeError('Atlas data outside reserved rectangles changed')
    write_png(out/'room-redesign-lightmap.png', patched)
    image_process(args.image_python, 'write', out, atlas)
    metadata = {'encoding': 'RGBM-sqrt/sRGB8-alpha-linear', 'room_lightmap_scale': SCALE,
                'room_lightmap_multiplier_power': 2, 'resolution': SIZE, 'samples': args.samples,
                'denoised': False, 'rectangles_top_left': RECTANGLES, 'patch_size': PATCH,
                'outside_rgba_exact': True, 'lossless_webp_roundtrip_exact': True}
    (out/'room-redesign-lightmap.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    uv_report = {obj.name: {'old': previous_uv[obj.name],
                           'new': [list(loop.uv) for loop in obj.data.uv_layers['LightmapUV'].data]}
                 for obj in targets}
    (out/'foliage-uv.json').write_text(json.dumps(uv_report), encoding='utf-8')
    export_glb(out/'room-refined.glb')
    if invariants() != before:
        raise RuntimeError('Exporter changed source invariants')
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'room-refined.blend'))
    if any(sha(Path(path)) != digest for path, digest in hashes.items()):
        raise RuntimeError('Source assets changed during repair')
    report = {'source_sha256': hashes, 'seconds': time.monotonic()-started, 'device': device,
              'invariants_exact': True, 'stats': before['stats'], 'atlas': metadata,
              'modified_pixels': int(np.count_nonzero(np.any(patched != original, axis=2))),
              'outputs': {name: sha(out/name) for name in ('room-refined.glb', 'room-refined.blend',
                           'room-redesign-lightmap.png', 'room-refined-lightmap.webp')}}
    (out/'repair-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('FOLIAGE_REPAIR_COMPLETE', json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
