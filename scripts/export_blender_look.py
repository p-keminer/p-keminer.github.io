"""Export Blender's actual AgX display transform as a compact HDR-to-sRGB LUT.

Run with Blender's Python. The LUT already includes the authored -0.2 EV
exposure, Medium High Contrast look and sRGB output conversion. Its runtime
texture is numerical data (NoColorSpace), not a color texture to decode.
"""

from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

import bpy
import numpy as np


MIN_EV = -12.47393
MAX_EV = 6.026069  # Two stops above AgX's base range for luminous surfaces/bloom.

SHADER = """// Texture: flipY=false; NoColorSpace; LinearFilter; generateMipmaps=false.
// Uniforms: uLookSize=64, uLookMinEV=-12.47393, uLookMaxEV=6.026069.
uniform sampler2D tBlenderLook;
uniform float uLookSize;
uniform float uLookMinEV;
uniform float uLookMaxEV;

vec3 applyBlenderLook(vec3 sceneLinear) {
  sceneLinear = max(sceneLinear, vec3(0.0));
  if (max(sceneLinear.r, max(sceneLinear.g, sceneLinear.b)) <= 0.0) {
    return vec3(0.0);
  }
  vec3 coordinates = clamp(
    (log2(max(sceneLinear, vec3(exp2(uLookMinEV)))) - uLookMinEV)
      / (uLookMaxEV - uLookMinEV), 0.0, 1.0
  ) * (uLookSize - 1.0);
  float lowerBlue = floor(coordinates.b);
  float upperBlue = min(lowerBlue + 1.0, uLookSize - 1.0);
  vec2 dimensions = vec2(uLookSize * uLookSize, uLookSize);
  vec2 lowerUV = vec2(lowerBlue * uLookSize + coordinates.r + 0.5,
                       coordinates.g + 0.5) / dimensions;
  vec2 upperUV = vec2(upperBlue * uLookSize + coordinates.r + 0.5,
                       coordinates.g + 0.5) / dimensions;
  return mix(texture2D(tBlenderLook, lowerUV).rgb,
             texture2D(tBlenderLook, upperUV).rgb, fract(coordinates.b));
}
// Final output: gl_FragColor = vec4(applyBlenderLook(hdr + bloom), 1.0);
// No additional exposure, tone mapping, contrast or sRGB conversion afterward.
"""


def _png_rgb(path: Path) -> np.ndarray:
    """Read encoded PNG bytes directly, avoiding another color-space conversion."""
    contents = path.read_bytes()
    if contents[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Expected a PNG image")
    offset = 8
    compressed = []
    width = height = channels = 0
    while offset < len(contents):
        length = struct.unpack(">I", contents[offset : offset + 4])[0]
        kind = contents[offset + 4 : offset + 8]
        data = contents[offset + 8 : offset + 8 + length]
        if kind == b"IHDR":
            width, height, depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", data)
            if depth != 8 or color_type not in (2, 6) or interlace:
                raise ValueError("Expected non-interlaced RGB/RGBA8 PNG")
            channels = 3 if color_type == 2 else 4
        elif kind == b"IDAT":
            compressed.append(data)
        offset += length + 12
    raw = zlib.decompress(b"".join(compressed))
    stride = width * channels
    result = np.zeros((height, stride), dtype=np.uint8)
    for row in range(height):
        method = raw[row * (stride + 1)]
        values = raw[row * (stride + 1) + 1 : (row + 1) * (stride + 1)]
        for column, value in enumerate(values):
            left = int(result[row, column - channels]) if column >= channels else 0
            above = int(result[row - 1, column]) if row else 0
            upper_left = int(result[row - 1, column - channels]) if row and column >= channels else 0
            if method == 1:
                value += left
            elif method == 2:
                value += above
            elif method == 3:
                value += (left + above) // 2
            elif method == 4:
                prediction = left + above - upper_left
                distances = (abs(prediction - left), abs(prediction - above), abs(prediction - upper_left))
                value += (left, above, upper_left)[distances.index(min(distances))]
            elif method != 0:
                raise ValueError(f"Unsupported PNG filter {method}")
            result[row, column] = value & 255
    return result.reshape(height, width, channels)[:, :, :3].astype(np.float32) / 255


def _render_display_image(pixels_top_down: np.ndarray, path: Path) -> None:
    """Pass scene-linear pixels through Blender's display output exactly once."""
    path = Path(path).resolve()
    height, width, _ = pixels_top_down.shape
    image = bpy.data.images.new("RoomLook_Linear_Input", width=width, height=height, alpha=False, float_buffer=True)
    scene = bpy.data.scenes.new("RoomLook_Output_Temporary")
    group = bpy.data.node_groups.new("RoomLook_Output_Temporary", "CompositorNodeTree")
    camera_data = bpy.data.cameras.new("RoomLook_Output_Temporary")
    camera = bpy.data.objects.new("RoomLook_Output_Temporary", camera_data)
    try:
        rgba = np.ones((height, width, 4), dtype=np.float32)
        rgba[:, :, :3] = pixels_top_down[::-1]
        image.colorspace_settings.name = "Non-Color"
        image.pixels.foreach_set(rgba.reshape(-1))
        image.update()
        scene.collection.objects.link(camera)
        scene.camera = camera
        scene.render.engine = "BLENDER_EEVEE"
        scene.render.resolution_x = width
        scene.render.resolution_y = height
        scene.render.resolution_percentage = 100
        scene.display_settings.display_device = "sRGB"
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
        scene.view_settings.exposure = -0.20
        scene.view_settings.gamma = 1
        scene.view_settings.use_curve_mapping = False
        if hasattr(scene.view_settings, "use_white_balance"):
            scene.view_settings.use_white_balance = False
        scene.render.dither_intensity = 0
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGB"
        scene.render.image_settings.color_depth = "8"
        scene.render.image_settings.compression = 90
        scene.render.image_settings.color_management = "FOLLOW_SCENE"
        scene.render.filepath = str(path)
        scene.compositing_node_group = group
        source = group.nodes.new("CompositorNodeImage")
        source.image = image
        group.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        output = group.nodes.new("NodeGroupOutput")
        group.links.new(source.outputs["Image"], output.inputs["Image"])
        bpy.ops.render.render(scene=scene.name, write_still=True)
    finally:
        bpy.data.scenes.remove(scene)
        bpy.data.objects.remove(camera, do_unlink=True)
        bpy.data.cameras.remove(camera_data)
        bpy.data.node_groups.remove(group)
        bpy.data.images.remove(image)


def _sample_lut(png: np.ndarray, linear: np.ndarray, size: int) -> np.ndarray:
    coordinates = np.clip((np.log2(np.maximum(linear, 2**MIN_EV)) - MIN_EV) / (MAX_EV - MIN_EV), 0, 1) * (size - 1)
    low = np.floor(coordinates).astype(int)
    high = np.minimum(low + 1, size - 1)
    fraction = coordinates - low
    result = np.zeros(3)
    for r in (0, 1):
        for g in (0, 1):
            for b in (0, 1):
                corner = np.where((r, g, b), high, low)
                weight = float(np.prod(np.where((r, g, b), fraction, 1 - fraction)))
                result += png[corner[1], corner[2] * size + corner[0]] * weight
    return result


def export_blender_look(output_dir: Path, size: int = 64) -> dict:
    """Write the look LUT, exact layout metadata, shader and a neutral QA strip."""
    if size not in (32, 64):
        raise ValueError("Use a 32 or 64 point cube")
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "room-agx-look.png"
    metadata_path = output_dir / "room-agx-look.json"
    shader_path = output_dir / "room-agx-look.glsl"
    test_path = output_dir / "room-agx-neutral-check.png"
    for path in (output_path, metadata_path, shader_path, test_path):
        if path.exists():
            raise FileExistsError(f"Use a new output directory; refusing to overwrite {path}")

    values = np.exp2(np.linspace(MIN_EV, MAX_EV, size, dtype=np.float32))
    cube = np.empty((size, size * size, 3), dtype=np.float32)
    cube[:, :, 0] = np.tile(values, size)[None, :]
    cube[:, :, 1] = values[:, None]
    cube[:, :, 2] = np.repeat(values, size)[None, :]
    _render_display_image(cube, output_path)
    encoded = _png_rgb(output_path)

    neutrals = np.array([0, 0.0002, 0.001, 0.005, 0.01, 0.025, 0.05, 0.18, 0.5, 1, 2, 4, 8, 16, 32, 64], dtype=np.float32)
    strip = np.repeat(np.repeat(neutrals[:, None], 3, axis=1)[None, :, :], 16, axis=0)
    # A small strip is sufficient: the compositor uses image pixels, not geometry.
    _render_display_image(strip, test_path)
    actual = _png_rgb(test_path)[0]
    predicted = np.array([_sample_lut(encoded, np.full(3, value), size) for value in neutrals])
    predicted[0] = 0  # The supplied shader returns exact black at input black.
    errors = np.abs(actual - predicted)
    if float(errors.max()) > 3 / 255:
        raise RuntimeError(f"LUT neutral validation failed: max error {errors.max():.6f}")
    stats = {
        "file": output_path.name,
        "path": str(output_path),
        "size": size,
        "width": size * size,
        "height": size,
        "min_ev": MIN_EV,
        "max_ev": MAX_EV,
        "view_transform": "AgX",
        "look": "AgX - Medium High Contrast",
        "exposure_ev_baked": -0.20,
        "gamma": 1,
        "display_device": "sRGB",
        "input": "scene-linear Rec.709/sRGB primaries, unexposed",
        "output": "display-encoded sRGB; do not decode or apply another output transform",
        "layout": "PNG top-left origin: pixel x=Bindex*N+Rindex, y=Gindex",
        "pixel_centers": "u=(Bindex*N+Rindex+0.5)/(N*N), v=(Gindex+0.5)/N",
        "texture_flip_y": False,
        "texture_color_space": "NoColorSpace",
        "texture_filters": "LinearFilter for min/mag, clamp wrapping, no mipmaps",
        "interpolation": "bilinear R/G per blue slice, linear interpolation between blue slices",
        "out_of_range": "negative inputs clamp to zero; RGB log coordinates clamp to min/max; exact black handled explicitly",
        "blender_version": bpy.app.version_string,
        "bytes": output_path.stat().st_size,
        "neutral_max_error_srgb8_steps": float(errors.max() * 255),
        "neutral_checks": [
            {"linear": float(value), "blender_srgb": exact.tolist(), "lut_srgb": lookup.tolist()}
            for value, exact, lookup in zip(neutrals, actual, predicted)
        ],
    }
    metadata_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    shader_path.write_text(SHADER.replace("uLookSize=64", f"uLookSize={size}"), encoding="utf-8")
    return stats


if __name__ == '__main__':
    import argparse
    import sys
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    arguments = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    print(json.dumps(export_blender_look(arguments.output_dir), indent=2))
