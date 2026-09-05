"""Apply the approved warmer light direction; leave objects/materials intact."""
from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector

PROFILE_PATH = Path(__file__).resolve().parents[1] / 'src/render/room-evening-profile.json'


def apply_room_evening() -> dict:
    profile = json.loads(PROFILE_PATH.read_text(encoding='utf-8'))
    for light in profile['lights']:
        obj = bpy.data.objects.get(light['name'])
        if obj is None or obj.type != 'LIGHT':
            raise ValueError('Missing authored light: ' + light['name'])
        if 'position' in light:
            obj.location = light['position']
        if 'target' in light:
            obj.rotation_euler = (Vector(light['target']) - obj.location).to_track_quat('-Z', 'Y').to_euler()
        obj.data.color = light['color']
        obj.data.energy = light['power']
        if 'width' in light:
            obj.data.size = light['width']
            obj.data.size_y = light['height']
    bpy.context.scene['room_evening_profile_version'] = profile['version']
    bpy.context.view_layer.update()
    return profile
