"""Extend the original room shell before Bevel evaluation and a fresh bake.

Import and call ``extend_room_shell()`` after opening the original source blend.
This module never opens, saves, exports or bakes a file. The existing surface
planes, window opening, object transforms and material slots stay unchanged.
Only the four front boundaries move to Blender room-space Y=-10 (glTF Z=10).
UV0 continues at its authored scale; the caller must regenerate/bake UV1.
"""
from __future__ import annotations

import math

import bpy
from mathutils import Vector


VERSION = 1
FRONT_Y = -10.0
SOURCE_FRONT_Y = -2.7
SHELL_VERTEX_COUNTS = {
    "Room_Ceiling": 8,
    "Room_Right_Wall": 8,
    "Room_Left_Wall": 32,
    "Room_Floor": 8,
}


def _uv_delta(mesh, polygon, loop_index: int, positions, displacement: Vector) -> Vector:
    """Extrapolate an existing face mapping without normalizing its new bounds."""
    layer = mesh.uv_layers[0]
    loops = list(polygon.loop_indices)
    points = [positions[mesh.loops[index].vertex_index] for index in loops]
    uv = [layer.data[index].uv.copy() for index in loops]
    # The visible source faces are affine quads. Choose a well-conditioned
    # basis; an n-gon can start with several collinear perimeter vertices.
    pairs = [(i, j) for i in range(1, len(points)) for j in range(i + 1, len(points))]
    i, j = max(pairs, key=lambda pair: (points[pair[0]] - points[0]).cross(points[pair[1]] - points[0]).length_squared)
    e1, e2 = points[i] - points[0], points[j] - points[0]
    aa, ab, bb = e1.dot(e1), e1.dot(e2), e2.dot(e2)
    determinant = aa * bb - ab * ab
    if determinant < 1e-14:
        raise RuntimeError(f"Degenerate source face: {mesh.name}/{polygon.index}")

    def mapped_delta(delta):
        da, db = delta.dot(e1), delta.dot(e2)
        return (uv[i] - uv[0]) * ((da * bb - db * ab) / determinant) + (uv[j] - uv[0]) * ((db * aa - da * ab) / determinant)

    if all((uv[k] - uv[0] - mapped_delta(point - points[0])).length < 1e-5 for k, point in enumerate(points)):
        return mapped_delta(displacement)

    # The left wall's narrow top/bottom n-gons have a legacy circular UV map,
    # not one affine map. Continue each moved corner's existing longitudinal
    # perimeter segment instead; leave every other UV corner byte-for-byte.
    # These surfaces are outside the room (above ceiling / below floor).
    current = loops.index(loop_index)
    source = points[current]
    candidates = [k for k, point in enumerate(points)
                  if abs(point.x - source.x) < 1e-6
                  and abs(point.z - source.z) < 1e-6
                  and abs(point.y - source.y) > 1e-6]
    if not candidates:
        # The non-affine front cap only translates perpendicular to its plane.
        if abs(polygon.normal.dot(displacement.normalized())) > 0.99999:
            return Vector((0.0, 0.0))
        raise RuntimeError(f"Cannot continue source UV0: {mesh.name}/{polygon.index}")
    adjacent = min(candidates, key=lambda k: abs(points[k].y - source.y))
    return (uv[adjacent] - uv[current]) * (displacement.y / (points[adjacent].y - source.y))


def extend_room_shell() -> list[str]:
    """Move only the authored front vertices; return changed object names."""
    root = bpy.data.objects.get("Room_Redesign_Root")
    if root is None:
        raise RuntimeError("Room_Redesign_Root is missing")
    bpy.context.view_layer.update()
    plans = []
    # Validate all four meshes and calculate UV changes before mutating any.
    for name, expected_vertices in SHELL_VERTEX_COUNTS.items():
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != "MESH" or obj.parent != root:
            raise RuntimeError(f"Missing original shell mesh: {name}")
        if obj.get("room_shell_extension_version") == VERSION:
            if abs(obj.get("room_shell_front_y", 0) - FRONT_Y) > 1e-6:
                raise RuntimeError(f"Unexpected previous extension: {name}")
            continue
        mesh = obj.data
        if len(mesh.vertices) != expected_vertices or not mesh.uv_layers or mesh.users != 1:
            raise RuntimeError(f"{name}: use the original pre-Bevel source blend")
        if any(modifier.type != "BEVEL" for modifier in obj.modifiers):
            raise RuntimeError(f"Unexpected shell modifier: {name}")
        local_to_room = root.matrix_world.inverted() @ obj.matrix_world
        room_to_local = local_to_room.inverted()
        positions = [vertex.co.copy() for vertex in mesh.vertices]
        room_positions = [local_to_room @ point for point in positions]
        if abs(min(point.y for point in room_positions) - SOURCE_FRONT_Y) > 1e-5:
            raise RuntimeError(f"{name}: source front is not at room Y=-2.7")
        moved = {index for index, point in enumerate(room_positions) if abs(point.y - SOURCE_FRONT_Y) < 1e-5}
        expected_moved = 8 if name == "Room_Left_Wall" else 4
        if len(moved) != expected_moved:
            raise RuntimeError(f"Unexpected front vertex count: {name}")
        new_positions = {}
        for index in moved:
            # Transform only the displacement: a full inverse point transform
            # needlessly rounds the unchanged X/Z coordinates of thin walls.
            displacement = room_to_local.to_3x3() @ Vector((0.0, FRONT_Y - room_positions[index].y, 0.0))
            new_positions[index] = positions[index] + displacement
        uv_changes = {}
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                vertex = mesh.loops[loop_index].vertex_index
                if vertex in moved:
                    offset = _uv_delta(mesh, polygon, loop_index, positions, new_positions[vertex] - positions[vertex])
                    value = mesh.uv_layers[0].data[loop_index].uv + offset
                    if not all(math.isfinite(component) for component in value):
                        raise RuntimeError(f"Non-finite extended UV0: {name}")
                    uv_changes[loop_index] = value
        plans.append((obj, new_positions, uv_changes))

    changed = []
    for obj, positions, uv_changes in plans:
        for index, position in positions.items():
            obj.data.vertices[index].co = position
        for index, uv in uv_changes.items():
            obj.data.uv_layers[0].data[index].uv = uv
        obj.data.update()
        obj["room_shell_extension_version"] = VERSION
        obj["room_shell_front_y"] = FRONT_Y
        changed.append(obj.name)
    bpy.context.view_layer.update()
    root["room_shell_extension_version"] = VERSION
    root["room_shell_front_y"] = FRONT_Y
    bpy.context.scene["room_shell_extension_version"] = VERSION
    return changed
