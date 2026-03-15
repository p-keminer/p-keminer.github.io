"""Blender export script for raum.blend → public/models/room.glb

Usage
-----
Option A — Run from Blender's Text Editor while raum.blend is open:
    1. Open raum.blend in Blender.
    2. Open this file in Blender's Text Editor (Scripting workspace).
    3. Click "Run Script" (or press Alt+R).
    The file is written to  3d-web-chess/public/models/room.glb
    relative to this script.

Option B — Command-line (headless):
    blender docs/assets/blender/raum.blend --background --python scripts/export_room.py

    Override the output path via the ROOM_GLB_OUTPUT environment variable:
    ROOM_GLB_OUTPUT=/absolute/path/room.glb blender ... --python scripts/export_room.py

What this script does
---------------------
- Exports the ENTIRE visible scene (all mesh objects, materials, textures).
- Applies all object transforms and modifiers before export so that the GLB
  matches exactly what you see in the Blender viewport.
- Uses Y-up orientation required by the GLTF/Three.js coordinate system.
- Embeds textures directly in the GLB (single self-contained file).
- Does NOT export Blender cameras or lights — Three.js handles scene lighting
  via createSceneLights() in src/render/lights.ts.

After export
------------
Verify the room aligns with the chess board in Three.js by checking the
calibration constants at the top of src/render/scene.ts:

    ROOM_SCALE  = 1 / <blender_chess_square_step_in_meters>
    ROOM_OFFSET = -<blender_board_center_xyz> * ROOM_SCALE

The default values assume:
    - Chess square step = 0.512 m  →  ROOM_SCALE ≈ 1.953
    - Board center at Blender origin (world 0,0,0) before the offset is applied.

If the room appears misaligned after re-export, adjust ROOM_SCALE and
ROOM_OFFSET in scene.ts without touching any other code.
"""

import os
import sys

import bpy

# ── Resolve output path ────────────────────────────────────────────────────────
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__ if '__file__' in dir() else bpy.data.filepath))
# When run from Blender's Text Editor __file__ is not set; fall back to using
# the Blender file location to find the repo root.
try:
    _SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    _SCRIPT_DIR = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'scripts')

_REPO_ROOT = os.path.dirname(_SCRIPT_DIR)
_DEFAULT_OUTPUT = os.path.join(_REPO_ROOT, 'public', 'models', 'room.glb')

OUTPUT_PATH = os.environ.get('ROOM_GLB_OUTPUT', _DEFAULT_OUTPUT)

# ── Export ─────────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(os.path.abspath(OUTPUT_PATH)), exist_ok=True)

print(f'[export_room] Exporting to: {OUTPUT_PATH}')

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format='GLB',       # Binary GLB (single file with embedded textures)
    use_selection=False,       # Export every visible object in the scene
    export_apply=True,         # Apply all object transforms + modifiers
    export_yup=True,           # GLTF/Three.js standard: Y-up world
)

print(f'[export_room] Done → {OUTPUT_PATH}')
