"""Refine the authored workshop without moving/recoloring its contents.

Blender CLI, from repository root (writes separate assets, never the source):
  blender --background --python scripts/refine_room_geometry.py -- --bake

The .blend already contains the authored preview lights and source UVs. The
optional bake transfers those lights to a shared atlas for the browser.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

import bpy
import bmesh

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))


def materials_fingerprint() -> str:
    values = []
    for material in sorted(bpy.data.materials, key=lambda item: item.name):
        nodes = []
        if material.node_tree:
            for node in material.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    for socket in node.inputs:
                        if hasattr(socket, 'default_value'):
                            value = socket.default_value
                            if not isinstance(value, (str, int, float, bool)):
                                try:
                                    value = list(value)
                                except TypeError:
                                    continue
                            nodes.append((socket.name, value))
        values.append((material.name, nodes))
    return hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()


def geometry_stats() -> dict:
    graph = bpy.context.evaluated_depsgraph_get()
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    triangles = 0
    for obj in meshes:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return {'meshes': len(meshes), 'triangles': triangles,
            'materials': len({m for obj in meshes for m in obj.data.materials if m})}


def refine_lamps() -> list[str]:
    changed = []
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or 'Lamp' not in obj.name:
            continue
        if obj.get('room_lamp_refinement'):
            continue
        if obj.data.uv_layers.get('LightmapUV'):
            continue
        if obj.name == 'Left_Decor_Lamp_Globe':
            # One geodesic subdivision corrects the silhouette; normals alone
            # cannot remove the visibly polygonal outer contour of this globe.
            old = obj.data
            dims = [max(v.co[i] for v in old.vertices) - min(v.co[i] for v in old.vertices) for i in range(3)]
            centers = [(max(v.co[i] for v in old.vertices) + min(v.co[i] for v in old.vertices)) / 2 for i in range(3)]
            bm = bmesh.new()
            bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1)
            bm.verts.ensure_lookup_table()
            spans = [max(v.co[i] for v in bm.verts)-min(v.co[i] for v in bm.verts) for i in range(3)]
            for vertex in bm.verts:
                for axis in range(3):
                    vertex.co[axis] = vertex.co[axis] * dims[axis] / spans[axis] + centers[axis]
            mesh = bpy.data.meshes.new(old.name + '_Refined')
            bm.to_mesh(mesh)
            bm.free()
            for material in old.materials:
                mesh.materials.append(material)
            uv = mesh.uv_layers.new(name='UVMap')
            for face in mesh.polygons:
                for loop in face.loop_indices:
                    v = mesh.vertices[mesh.loops[loop].vertex_index].co
                    direction = v.copy()
                    for axis in range(3):
                        direction[axis] = (v[axis] - centers[axis]) / max(dims[axis], 1e-8)
                    direction.normalize()
                    uv.data[loop].uv = (0.5 + math.atan2(direction.y, direction.x)/(2*math.pi), 0.5 - math.asin(direction.z)/math.pi)
            obj.data = mesh
            if old.users == 0:
                bpy.data.meshes.remove(old)

        round_surface = any(token in obj.name for token in ('Bulb', 'Globe', 'Stem', 'Base', 'Shade'))
        if not round_surface:
            continue
        obj.data.update()
        # Preserve genuinely flat end caps. Cone/globe side normals blend
        # smoothly; tiny bevels still catch the authored practical lighting.
        for face in obj.data.polygons:
            face.use_smooth = len(face.vertices) <= 4
        for modifier in obj.modifiers:
            if modifier.type == 'BEVEL':
                modifier.harden_normals = True
                if obj.name.endswith('Base'):
                    modifier.segments = max(modifier.segments, 3)
        if obj.modifiers and any(m.type == 'BEVEL' for m in obj.modifiers):
            normal = obj.modifiers.new('Refined lamp weighted normals', 'WEIGHTED_NORMAL')
            normal.keep_sharp = True
            normal.weight = 50
        obj['room_lamp_refinement'] = 1
        changed.append(obj.name)
    return changed


def export_glb(path: Path) -> None:
    bpy.ops.object.select_all(action='DESELECT')
    objects = [o for o in bpy.context.scene.objects if o.type in {'MESH','EMPTY'}]
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB',
        use_selection=True, export_apply=True, export_yup=True,
        export_cameras=False, export_lights=False, export_extras=True,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--source', type=Path, default=ROOT/'docs/assets/blender/room-redesign-graybox.blend')
    args.add_argument('--output-dir', type=Path, default=ROOT/'output/room-refined')
    args.add_argument('--bake', action='store_true')
    args.add_argument('--samples', type=int, default=64)
    args.add_argument('--size', type=int, default=2048)
    args.add_argument('--preview', action='store_true')
    args.add_argument('--publish', action='store_true', help='Generate the display LUT and copy validated runtime assets locally')
    args.add_argument('--asset-python', default='python', help='System Python executable with Pillow for lossless WebP')
    opts = args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if opts.publish and not opts.bake:
        args.error('--publish requires --bake: geometry and lightmap must be produced together')
    out = opts.output_dir.resolve()
    source = opts.source.resolve()
    target_blend = out/'room-refined.blend'
    if source == target_blend:
        raise ValueError('Source and output blend must differ')
    bpy.ops.wm.open_mainfile(filepath=str(source))
    # The approved second pass changes only lights, before the invariant snapshot.
    from apply_room_evening import apply_room_evening
    evening_profile = apply_room_evening()
    out.mkdir(parents=True, exist_ok=True)
    transforms = {obj.name: list(value for row in obj.matrix_world for value in row) for obj in bpy.context.scene.objects}
    material_hash = materials_fingerprint()
    before = geometry_stats()

    from refine_room_seating import refine_seating
    from refine_room_equipment import refine_equipment
    changes = refine_lamps() + refine_seating() + refine_equipment()
    # Continue the shell behind the overview camera before UV1 and lighting
    # are generated, so there is no baked front-edge seam in the interior.
    from extend_room_shell import extend_room_shell
    changes += extend_room_shell()
    bpy.context.view_layer.update()
    after = geometry_stats()
    if before['meshes'] != after['meshes'] or before['materials'] != after['materials']:
        raise RuntimeError('Refinement must not add draw objects or materials')
    if after['triangles'] > before['triangles'] * 1.15:
        raise RuntimeError('Refinement exceeds the 15 percent geometry budget')
    if material_hash != materials_fingerprint():
        raise RuntimeError('Authored material values changed')
    for name, matrix in transforms.items():
        current = [value for row in bpy.data.objects[name].matrix_world for value in row]
        if any(abs(a-b) > 1e-6 for a,b in zip(matrix,current)):
            raise RuntimeError('Object moved: '+name)

    lighting = None
    if opts.bake:
        from bake_room_lighting import bake_room_lighting
        lighting = bake_room_lighting(out, size=opts.size, samples=opts.samples)
        if material_hash != materials_fingerprint():
            raise RuntimeError('Bake failed to restore authored materials')
        if geometry_stats() != after:
            raise RuntimeError('Bake preparation changed evaluated geometry counts')
    from refine_room_window import refine_window_background
    changes += refine_window_background()
    if geometry_stats() != after:
        raise RuntimeError('Window depth correction changed geometry counts')
    bpy.context.scene['room_refinement_version'] = 1
    root = bpy.data.objects.get('Room_Redesign_Root')
    if root:
        root['room_refinement_version'] = 1
        if lighting:
            root['room_lightmap_scale'] = bpy.context.scene['room_lightmap_scale']
            root['room_lightmap_encoding'] = bpy.context.scene['room_lightmap_encoding']
            root['room_lightmap_multiplier_power'] = bpy.context.scene['room_lightmap_multiplier_power']
            root['room_lightmap_version'] = 1
    bpy.ops.wm.save_as_mainfile(filepath=str(target_blend))
    glb = out/'room-refined.glb'
    export_glb(glb)
    report = {'source':str(source), 'before':before, 'after':after,
        'evening_profile_version': evening_profile['version'],
        'changed_objects':changes, 'material_values_unchanged':True,
        'transforms_unchanged':True, 'glb_bytes':glb.stat().st_size, 'lighting':lighting}
    (out/'refinement-stats.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report),flush=True)
    if opts.publish:
        from export_blender_look import export_blender_look
        export_blender_look(out/'look')
        subprocess.run([opts.asset_python, str(SCRIPT_DIR/'publish_room_refinement.py'),
            '--input-dir', str(out)], check=True)
    if opts.preview:
        bpy.context.scene.render.filepath = str(out/'room-refined-preview.png')
        bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    main()
