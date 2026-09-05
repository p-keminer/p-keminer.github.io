"""Place the visible night backdrop outside the window; reuse the room bake.

These three emissive meshes are not lightmap receivers. Apply after baking so
the approved room lighting stays unchanged while their visible depth is fixed.
"""
from __future__ import annotations

import bpy
from mathutils import Vector


VERSION = 1
VIEWPOINT = Vector((1.0, -7.8, 2.25))
MOON_X = -4.0
SKY_X = -4.4
STARS_X = -4.37


def refine_window_background() -> list[str]:
    root = bpy.data.objects.get('Room_Redesign_Root')
    if root is None:
        raise RuntimeError('Missing room root')
    bpy.context.view_layer.update()
    changed = []
    for name in ('Left_Window_Moon', 'Left_Window_Stars', 'Left_Window_Night_Sky'):
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != 'MESH' or obj.parent != root:
            raise RuntimeError('Missing window backdrop: ' + name)
        if obj.get('room_window_depth_version') == VERSION:
            continue
        if obj.get('room_lightmapped') or obj.modifiers or obj.data.users != 1:
            raise RuntimeError('Window backdrop must be an unbaked independent mesh: ' + name)
        local_to_room = root.matrix_world.inverted() @ obj.matrix_world
        room_to_local = local_to_room.inverted()
        points = [local_to_room @ vertex.co for vertex in obj.data.vertices]
        center = Vector(tuple((min(point[i] for point in points) + max(point[i] for point in points)) / 2 for i in range(3)))
        destination_x = MOON_X if name.endswith('Moon') else STARS_X if name.endswith('Stars') else SKY_X
        factor = (destination_x - VIEWPOINT.x) / (center.x - VIEWPOINT.x)
        if name.endswith('Night_Sky'):
            # Cover the opening from the supported overview/exploration angles.
            # A larger existing box costs no extra triangles or draw calls.
            destination = VIEWPOINT + factor * (center - VIEWPOINT)
            old_spans = [max(point[i] for point in points) - min(point[i] for point in points) for i in range(3)]
            spans = (0.02, 8.0, 6.0)
            updated = [destination + Vector(tuple((point[i] - center[i]) * spans[i] / old_spans[i] for i in range(3))) for point in points]
        else:
            # A homothety around the overview viewpoint preserves every
            # projected vertex, including apparent moon position and size.
            updated = [VIEWPOINT + factor * (point - VIEWPOINT) for point in points]
        for vertex, point in zip(obj.data.vertices, updated):
            vertex.co = room_to_local @ point
        obj.data.update()
        obj['room_window_depth_version'] = VERSION
        changed.append(name)
    bpy.context.view_layer.update()
    return changed
