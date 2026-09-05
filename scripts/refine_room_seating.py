"""Refine the existing chair cushions without changing the room's arrangement.

Import this module inside Blender, then call ``refine_seating()``. It neither
loads nor saves files, starts a render, nor adds scene objects or materials.
The caller owns the source .blend, export, and Three.js visual verification.

Only Chair_Seat and Chair_Back are changed. Object transforms and material slots
stay intact. Each closed cushion contains 336 triangles before export, compared
with 108 in the current source; the complete current chair becomes 1,244 tris.
Existing UV layers are transferred from the original surface, including their
names and active/render selection. No lightmap unwrap or bake is performed.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform


_VERSION = "soft-cushions-v1"
_MARKER = "room_seating_refinement"
_TARGETS = ("Chair_Seat", "Chair_Back")
_REPLACED_MODIFIERS = {"BEVEL", "WEIGHTED_NORMAL"}


def _rounded_outline(half_width: float, half_height: float) -> list[tuple[float, float]]:
    """24 vertices: five small segments per corner and four straight sides."""
    radius = min(half_width, half_height) * 0.24
    result = []
    for corner in range(4):
        angle = corner * math.pi / 2
        center_x = (half_width - radius) * (1 if corner in (0, 3) else -1)
        center_y = (half_height - radius) * (1 if corner in (0, 1) else -1)
        for step in range(6):
            theta = angle + step * math.pi / 10
            result.append((center_x + radius * math.cos(theta),
                           center_y + radius * math.sin(theta)))
    return result


def _cushion_geometry(
    minimum: tuple[float, float, float],
    maximum: tuple[float, float, float],
    *,
    backrest: bool,
) -> tuple[list[tuple[float, float, float]], list[tuple[int, ...]], set[int]]:
    """A softly rolled perimeter and a shallow, genuinely curved upper face."""
    center = tuple((lo + hi) / 2 for lo, hi in zip(minimum, maximum))
    half_size = tuple((hi - lo) / 2 for lo, hi in zip(minimum, maximum))
    width_axis, height_axis, thickness_axis = (0, 2, 1) if backrest else (0, 1, 2)
    outline = _rounded_outline(half_size[width_axis], half_size[height_axis])
    count = len(outline)
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []

    def vertex(a: float, b: float, thickness: float) -> tuple[float, float, float]:
        coordinates = list(center)
        coordinates[width_axis] += a
        coordinates[height_axis] += b
        coordinates[thickness_axis] += thickness * half_size[thickness_axis]
        return tuple(coordinates)

    # Rounded shoulders with exact original local bounding dimensions. The
    # central two rings retain the footprint; no object scale is changed.
    profile = ((-1.00, 0.86), (-0.82, 0.96), (-0.38, 1.00),
               (0.24, 1.00), (0.78, 0.965), (0.94, 0.87), (1.00, 0.50))
    for thickness, scale in profile:
        for a, b in outline:
            vertices.append(vertex(a * scale, b * scale, thickness))

    for ring in range(len(profile) - 1):
        for index in range(count):
            following = (index + 1) % count
            faces.append((ring * count + index, ring * count + following,
                          (ring + 1) * count + following, (ring + 1) * count + index))

    # The seat's center sits 3.6 mm below its padded shoulders in the source
    # dimensions. The back's center stays full to read as a supportive cushion.
    upper_center = len(vertices)
    vertices.append(vertex(0.0, 0.0, 1.0 if backrest else 0.94))
    upper_ring = (len(profile) - 1) * count
    for index in range(count):
        faces.append((upper_ring + index, upper_ring + (index + 1) % count, upper_center))

    # A flat underside is kept flat in shading as well as geometry. This avoids
    # blanket smooth shading turning the supporting surface into a melted box.
    lower_center = len(vertices)
    vertices.append(vertex(0.0, 0.0, -1.0))
    flat_faces: set[int] = set()
    for index in range(count):
        flat_faces.add(len(faces))
        faces.append(((index + 1) % count, index, lower_center))

    # (x, z, y) reverses handedness relative to the seat's (x, y, z).
    if backrest:
        faces = [tuple(reversed(face)) for face in faces]
    return vertices, faces, flat_faces


def _transfer_surface_data(source: bpy.types.Mesh, target: bpy.types.Mesh) -> None:
    """Project each new face onto one source triangle, preserving UV seams."""
    source.calc_loop_triangles()
    triangles = list(source.loop_triangles)
    positions = [vertex.co.copy() for vertex in source.vertices]
    tree = BVHTree.FromPolygons(positions, [tuple(t.vertices) for t in triangles],
                               all_triangles=True)
    layers = [(layer, target.uv_layers.new(name=layer.name)) for layer in source.uv_layers]

    for polygon in target.polygons:
        centroid = sum((target.vertices[index].co for index in polygon.vertices), Vector())
        centroid /= len(polygon.vertices)
        _position, _normal, triangle_index, _distance = tree.find_nearest(centroid)
        if triangle_index is None:
            raise RuntimeError("Cannot project chair cushion onto its source surface")
        triangle = triangles[triangle_index]
        polygon.material_index = source.polygons[triangle.polygon_index].material_index
        original_points = [positions[index] for index in triangle.vertices]
        for old_layer, new_layer in layers:
            original_uvs = [Vector((*old_layer.data[index].uv, 0.0))
                            for index in triangle.loops]
            for loop_index in polygon.loop_indices:
                point = target.vertices[target.loops[loop_index].vertex_index].co
                uv = barycentric_transform(point, *original_points, *original_uvs)
                new_layer.data[loop_index].uv = (uv.x, uv.y)

    # UVMap is present on the source cushions. If a future source omits it,
    # retain useful planar coordinates rather than introducing an unmapped mesh.
    if not layers:
        layer = target.uv_layers.new(name="UVMap")
        minimum = [min(v.co[axis] for v in target.vertices) for axis in range(3)]
        maximum = [max(v.co[axis] for v in target.vertices) for axis in range(3)]
        axes = sorted(range(3), key=lambda axis: maximum[axis] - minimum[axis], reverse=True)[:2]
        for loop in target.loops:
            co = target.vertices[loop.vertex_index].co
            layer.data[loop.index].uv = tuple((co[a] - minimum[a]) / (maximum[a] - minimum[a])
                                            for a in axes)
    else:
        target.uv_layers.active_index = source.uv_layers.active_index
        for old_layer, new_layer in layers:
            new_layer.active_render = old_layer.active_render


def refine_seating() -> list[str]:
    """Refine the two existing cushions; return changed names, skip repeat calls.

    Missing/non-mesh targets or unexpected deforming modifiers are rejected
    before either object changes. Existing anchors, parents and custom data are
    untouched, except for the version marker on each refined cushion.
    """
    objects = []
    for name in _TARGETS:
        obj = bpy.context.scene.objects.get(name)
        if obj is None or obj.type != "MESH":
            raise RuntimeError(f"Expected an existing mesh named {name}")
        if obj.get(_MARKER) == _VERSION:
            continue
        if obj.data.shape_keys is not None:
            raise RuntimeError(f"Cannot replace {name}: source has shape keys")
        unexpected = [modifier.name for modifier in obj.modifiers
                      if modifier.type not in _REPLACED_MODIFIERS]
        if unexpected:
            raise RuntimeError(f"Cannot replace {name}: unexpected modifiers {unexpected}")
        if not obj.data.vertices:
            raise RuntimeError(f"Cannot replace {name}: source mesh is empty")
        objects.append(obj)

    prepared: list[tuple[bpy.types.Object, bpy.types.Mesh]] = []
    try:
        for obj in objects:
            source = obj.data
            minimum = tuple(min(v.co[axis] for v in source.vertices) for axis in range(3))
            maximum = tuple(max(v.co[axis] for v in source.vertices) for axis in range(3))
            if min(hi - lo for lo, hi in zip(minimum, maximum)) <= 0:
                raise RuntimeError(f"Cannot replace {obj.name}: degenerate source dimensions")
            vertices, faces, flat_faces = _cushion_geometry(
                minimum, maximum, backrest=obj.name == "Chair_Back")
            mesh = bpy.data.meshes.new(f"{obj.name}_RefinedCushion")
            prepared.append((obj, mesh))
            mesh.from_pydata(vertices, [], faces)
            mesh.update()
            for material in source.materials:
                mesh.materials.append(material)
            _transfer_surface_data(source, mesh)
            for polygon in mesh.polygons:
                polygon.use_smooth = polygon.index not in flat_faces
            # Explicitly retain a crisp join to the flat underside. Curved
            # faces interpolate their real geometry's normals without a global
            # Weighted Normal modifier flattening the soft upholstery.
            bottom_ring = set(range(24))
            for edge in mesh.edges:
                if set(edge.vertices).issubset(bottom_ring):
                    edge.use_edge_sharp = True
            mesh.calc_loop_triangles()
            if len(mesh.loop_triangles) > 400:
                raise RuntimeError(f"Cushion triangle budget exceeded: {obj.name}")
    except Exception:
        for _obj, mesh in prepared:
            bpy.data.meshes.remove(mesh)
        raise

    changed = []
    for obj, mesh in prepared:
        # The old data-block is kept available for the caller's comparison or
        # rollback. Only these two objects' topology modifiers are superseded.
        slots = [(slot.link, slot.material) for slot in obj.material_slots]
        active_material_index = obj.active_material_index
        obj.data = mesh
        for slot, (link, material) in zip(obj.material_slots, slots):
            slot.link = link
            slot.material = material
        obj.active_material_index = active_material_index
        for modifier in list(obj.modifiers):
            if modifier.type in _REPLACED_MODIFIERS:
                obj.modifiers.remove(modifier)
        obj[_MARKER] = _VERSION
        changed.append(obj.name)
    bpy.context.view_layer.update()
    return changed
