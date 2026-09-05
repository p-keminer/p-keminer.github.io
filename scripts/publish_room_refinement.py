"""Validate and publish a matching refined-room asset set to local public/models.

Requires system Python with Pillow. This does not deploy the website.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import struct
import tempfile

from PIL import Image


def lighting_metadata(metadata: dict, encoding_key: str) -> tuple[str, float, int]:
    """Resolve the legacy format explicitly; never guess a new atlas's decode."""
    encoding = metadata.get(encoding_key)
    expected_power = {
        'RGBM/sRGB8-alpha-linear': 1,
        'RGBM-sqrt/sRGB8-alpha-linear': 2,
    }.get(encoding)
    if expected_power is None:
        raise ValueError('Unsupported room lightmap encoding')
    power = metadata.get('room_lightmap_multiplier_power', 1 if expected_power == 1 else None)
    if power != expected_power:
        raise ValueError('Lightmap multiplier power does not match declared encoding')
    scale = metadata.get('room_lightmap_scale')
    if not isinstance(scale, (int, float)) or not math.isfinite(scale) or scale <= 0:
        raise ValueError('Invalid room lightmap scale')
    return encoding, scale, expected_power


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input-dir', type=Path, required=True)
    parser.add_argument('--lightmap', type=Path, help='Optional RGBM reencoding from the same baked atlas')
    parser.add_argument('--look', type=Path, help='Optional previously generated Blender LUT')
    args = parser.parse_args()
    source = args.input_dir.resolve()
    glb = source / 'room-refined.glb'
    lightmap = args.lightmap or source / 'room-redesign-lightmap.png'
    look = args.look or source / 'look/room-agx-look.png'
    raw = glb.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', raw)
    json_length, json_type = struct.unpack_from('<I4s', raw, 12)
    if magic != b'glTF' or version != 2 or length != len(raw) or json_type != b'JSON':
        raise ValueError('Invalid GLB')
    metadata = json.loads(raw[20:20+json_length])
    extras = metadata['scenes'][metadata.get('scene', 0)]['extras']
    model_lighting = lighting_metadata(extras, 'room_lightmap_encoding')
    atlas_metadata = json.loads(lightmap.with_suffix('.json').read_text(encoding='utf-8'))
    if lighting_metadata(atlas_metadata, 'encoding') != model_lighting:
        raise ValueError('Lightmap encoding, multiplier power or scale does not match model')
    for node in metadata.get('nodes', []):
        root_extras = node.get('extras', {})
        if node.get('name') == 'Room_Redesign_Root' and 'room_lightmap_encoding' in root_extras:
            if lighting_metadata(root_extras, 'room_lightmap_encoding') != model_lighting:
                raise ValueError('Room root lighting metadata does not match GLB scene')
    with Image.open(lightmap) as image:
        if image.mode != 'RGBA' or image.getextrema()[3][0] == 0:
            raise ValueError('RGBM must have four unpremultiplied channels and nonzero multipliers')
        atlas = image.copy()
    with Image.open(look) as image:
        if image.size != (4096, 64):
            raise ValueError('Runtime requires a 64-cube Blender LUT')
    destination = Path(__file__).resolve().parents[1] / 'public/models'
    destination.mkdir(parents=True, exist_ok=True)
    # Finish encoding and verification before replacing any local runtime file.
    with tempfile.TemporaryDirectory(prefix='room-assets-', dir=destination) as staging:
        staged = Path(staging)
        webp = staged / 'room-refined-lightmap.webp'
        atlas.save(webp, format='WEBP', lossless=True, quality=100, method=6, exact=True)
        with Image.open(webp) as decoded:
            if decoded.convert('RGBA').tobytes() != atlas.tobytes():
                raise RuntimeError('WebP conversion changed RGBM data')
        (staged / glb.name).write_bytes(raw)
        (staged / 'room-agx-look.png').write_bytes(look.read_bytes())
        sizes = {}
        for file in staged.iterdir():
            sizes[file.name] = file.stat().st_size
            file.replace(destination / file.name)
    print(json.dumps({'published_locally': sizes, 'rgbm_roundtrip_exact': True,
                      'room_lightmap_encoding': model_lighting[0],
                      'room_lightmap_multiplier_power': model_lighting[2]}, indent=2))


if __name__ == '__main__':
    main()
