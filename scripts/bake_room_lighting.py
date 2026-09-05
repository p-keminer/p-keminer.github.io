"""Bake the authored static lighting without baking Blender's display transform.

The RGBA PNG stores RGBM-sqrt: sRGB-encoded RGB and the square root of the
per-pixel multiplier in a linear alpha channel. Three.js must load it
unpremultiplied as SRGBColorSpace, multiply sampled RGB by alpha squared,
and set lightMapIntensity to
``room_lightmap_scale * math.pi``. The scale recovers HDR values; pi converts
Blender's unit-albedo Lambert response to Three.js light-map irradiance.
Only the final browser composite should apply the display view / AgX look.
"""

from __future__ import annotations

import json
import math
import struct
import time
import zlib
from pathlib import Path

import bpy
import numpy as np


def _excluded_material_reason(material: bpy.types.Material | None) -> str | None:
    if material is None or not material.use_nodes or material.node_tree is None:
        return "no_node_material"
    for node in material.node_tree.nodes:
        if node.type in {"BSDF_TRANSPARENT", "BSDF_GLASS", "EMISSION"}:
            return "transparent_or_emissive"
        if node.type != "BSDF_PRINCIPLED":
            continue
        alpha = node.inputs.get("Alpha")
        transmission = node.inputs.get("Transmission Weight")
        if alpha and (alpha.is_linked or alpha.default_value < 0.999):
            return "alpha"
        if transmission and (transmission.is_linked or transmission.default_value > 0.001):
            return "transmission"
        emission = node.inputs.get("Emission Color")
        strength = node.inputs.get("Emission Strength")
        if emission and strength and (
            emission.is_linked
            or strength.is_linked
            or (strength.default_value > 0 and max(emission.default_value[:3]) > 0)
        ):
            return "emissive"
    return None


def _configure_device(scene: bpy.types.Scene, prefer_gpu: bool) -> tuple[str, object | None, str | None, list]:
    """Use CUDA when available, retaining enough state to restore preferences."""
    addon = bpy.context.preferences.addons.get("cycles")
    preferences = addon.preferences if addon else None
    previous_type = preferences.compute_device_type if preferences else None
    previous_devices = [(device, device.use) for device in preferences.devices] if preferences else []
    scene.cycles.device = "CPU"
    if prefer_gpu and preferences:
        try:
            preferences.compute_device_type = "CUDA"
            preferences.get_devices()
            # Newly enumerated device settings also need restoring after this call.
            known_ids = {device.id for device, _ in previous_devices}
            previous_devices.extend(
                (device, device.use) for device in preferences.devices if device.id not in known_ids
            )
            cuda_devices = [device for device in preferences.devices if device.type == "CUDA"]
            if cuda_devices:
                for device in preferences.devices:
                    device.use = device.type == "CUDA"
                scene.cycles.device = "GPU"
                return "CUDA: " + ", ".join(device.name for device in cuda_devices), preferences, previous_type, previous_devices
        except (RuntimeError, TypeError):
            pass
    return "CPU", preferences, previous_type, previous_devices


def _denoise_linear(image: bpy.types.Image, output_path: Path, size: int) -> np.ndarray:
    """Run OIDN in an empty temporary scene and archive scene-linear half EXR."""
    scene = bpy.data.scenes.new("RoomLighting_Denoise_Temporary")
    group = bpy.data.node_groups.new("RoomLighting_Denoise_Temporary", "CompositorNodeTree")
    camera_data = bpy.data.cameras.new("RoomLighting_Denoise_Temporary")
    camera = bpy.data.objects.new("RoomLighting_Denoise_Temporary", camera_data)
    loaded = None
    try:
        scene.collection.objects.link(camera)
        scene.camera = camera
        scene.render.engine = "BLENDER_EEVEE"
        scene.render.resolution_x = size
        scene.render.resolution_y = size
        scene.render.resolution_percentage = 100
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "None"
        scene.view_settings.exposure = 0
        scene.view_settings.gamma = 1
        scene.render.image_settings.file_format = "OPEN_EXR"
        scene.render.image_settings.color_mode = "RGB"
        scene.render.image_settings.color_depth = "16"
        scene.render.image_settings.exr_codec = "ZIP"
        scene.render.filepath = str(output_path)
        scene.compositing_node_group = group
        source = group.nodes.new("CompositorNodeImage")
        source.image = image
        denoise = group.nodes.new("CompositorNodeDenoise")
        denoise.inputs["HDR"].default_value = True
        denoise.inputs["Prefilter"].default_value = "None"
        denoise.inputs["Quality"].default_value = "High"
        group.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        output = group.nodes.new("NodeGroupOutput")
        group.links.new(source.outputs["Image"], denoise.inputs["Image"])
        group.links.new(denoise.outputs["Image"], output.inputs["Image"])
        bpy.ops.render.render(scene=scene.name, write_still=True)
        loaded = bpy.data.images.load(str(output_path), check_existing=False)
        pixels = np.empty(size * size * 4, dtype=np.float32)
        loaded.pixels.foreach_get(pixels)
        return pixels.reshape(size, size, 4)[:, :, :3].copy()
    finally:
        if loaded:
            bpy.data.images.remove(loaded)
        bpy.data.scenes.remove(scene)
        bpy.data.objects.remove(camera, do_unlink=True)
        bpy.data.cameras.remove(camera_data)
        bpy.data.node_groups.remove(group)


def _decode_srgb(encoded: np.ndarray) -> np.ndarray:
    return np.where(encoded <= 0.04045, encoded / 12.92, np.power((encoded + 0.055) / 1.055, 2.4))


def _encode_srgb8(linear: np.ndarray) -> np.ndarray:
    encoded = np.where(linear <= 0.0031308, linear * 12.92, 1.055 * np.power(linear, 1 / 2.4) - 0.055)
    return np.rint(np.clip(encoded, 0, 1) * 255).astype(np.uint8)


def _write_rgbm_srgb_png(rgb: np.ndarray, output_path: Path) -> dict:
    if not np.isfinite(rgb).all():
        raise RuntimeError("Lightmap contains NaN or infinite values; refusing to publish it")
    negative_values = int(np.count_nonzero(rgb < 0))
    # Denoising can produce tiny negative radiance; physical radiance is nonnegative.
    np.maximum(rgb, 0, out=rgb)
    peak = float(rgb.max())
    if peak <= 0:
        raise RuntimeError("Lightmap is entirely black; check scene lights and bake targets")
    scale = float(2 ** math.ceil(math.log2(max(1.0, peak))))
    # The square-root multiplier has finer steps in dark areas. Linear RGBM
    # changes alpha from 1 to 2 on these walls; filtering RGB and alpha before
    # decoding then adds a visible ~12.5% bright contour to a smooth gradient.
    pixel_peak = rgb.max(axis=2)
    multiplier_byte = np.clip(np.ceil(np.sqrt(pixel_peak / scale) * 255), 1, 255).astype(np.uint8)
    multiplier = multiplier_byte.astype(np.float32) / 255
    local_range = np.square(multiplier) * scale
    encoded = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
    encoded[:, :, :3] = _encode_srgb8(rgb / local_range[:, :, None])
    encoded[:, :, 3] = multiplier_byte

    # Measure round-trip errors on the source pixels, before writing, including
    # a direct comparison with the previous global-scale encoding in shadows.
    decoded = _decode_srgb(encoded[:, :, :3].astype(np.float32) / 255) * local_range[:, :, None]
    error = np.abs(decoded - rgb)
    shadow_mask = (pixel_peak > 0) & (pixel_peak <= 0.10)
    shadow_error = error[shadow_mask]
    shadow_rgb = rgb[shadow_mask]
    previous_shadow = _decode_srgb(_encode_srgb8(shadow_rgb / scale).astype(np.float32) / 255) * scale
    precision = {
        "linear_max_absolute_error": float(error.max()),
        "linear_mean_absolute_error": float(error.mean()),
        "shadow_pixel_count": int(shadow_mask.sum()),
        "shadow_range_max": 0.10,
        "shadow_max_absolute_error": float(shadow_error.max()) if shadow_error.size else None,
        "shadow_mean_absolute_error": float(shadow_error.mean()) if shadow_error.size else None,
        "previous_global_shadow_max_absolute_error": float(np.abs(previous_shadow - shadow_rgb).max()) if shadow_rgb.size else None,
        "previous_global_shadow_mean_absolute_error": float(np.abs(previous_shadow - shadow_rgb).mean()) if shadow_rgb.size else None,
    }
    # Blender image pixels start at the lower left; PNG scanlines start at the top.
    encoded = np.ascontiguousarray(encoded[::-1])
    height, width, _ = encoded.shape
    scanlines = np.zeros((height, width * 4 + 1), dtype=np.uint8)
    scanlines[:, 1:] = encoded.reshape(height, width * 4)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"sRGB", b"\x00")
    png += chunk(b"IDAT", zlib.compress(scanlines.tobytes(), level=6))
    png += chunk(b"IEND", b"")
    output_path.write_bytes(png)
    return {
        "room_lightmap_scale": scale,
        "encoding": "RGBM-sqrt/sRGB8-alpha-linear",
        "room_lightmap_multiplier_power": 2,
        "png_color_type": 6,
        "alpha_semantics": "square root of radiance multiplier in linear UNORM, never opacity or premultiplied alpha",
        "decode": "sRGBDecode(RGB) * alpha * alpha * room_lightmap_scale",
        "linear_peak": peak,
        "negative_values_clamped": negative_values,
        "precision": precision,
    }


def reencode_lightmap(
    linear_exr: Path,
    output_dir: Path,
    filename: str = "room-refined-lightmap.png",
) -> dict:
    """Encode an existing linear EXR as RGBM without rendering or baking again."""
    linear_exr = Path(linear_exr).resolve(strict=True)
    output_dir = Path(output_dir).resolve()
    if Path(filename).name != filename or Path(filename).suffix.lower() != ".png":
        raise ValueError("filename must be a PNG basename")
    output_dir.mkdir(parents=True, exist_ok=True)
    png_path = output_dir / filename
    stats_path = png_path.with_suffix(".json")
    for path in (png_path, stats_path):
        if path.exists():
            raise FileExistsError(f"Use a new output directory; refusing to overwrite {path}")
    started = time.monotonic()
    image = bpy.data.images.load(str(linear_exr), check_existing=False)
    try:
        width, height = image.size
        pixels = np.empty(width * height * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        rgb = pixels.reshape(height, width, 4)[:, :, :3].copy()
    finally:
        bpy.data.images.remove(image)
    encoding = _write_rgbm_srgb_png(rgb, png_path)
    stats = {
        "file": png_path.name,
        "path": str(png_path),
        "width": width,
        "height": height,
        "linear_archive": str(linear_exr),
        "rebaked": False,
        "display_transform_baked": False,
        "three_lightmap_intensity": encoding["room_lightmap_scale"] * math.pi,
        "total_seconds": round(time.monotonic() - started, 3),
        "bytes": png_path.stat().st_size,
        **encoding,
    }
    stats_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    return stats


def _freeze_evaluated_target_meshes(targets: list[bpy.types.Object]) -> dict:
    """Keep the existing rendered geometry, then unwrap its final surfaces.

    In particular, Solidify must precede UV1 generation: otherwise its back
    faces inherit the front's light-map UVs and overwrite different lighting
    into the same texels. This applies existing modifiers, without adding
    geometry, moving an object, or changing its authored material slots.
    """
    graph = bpy.context.evaluated_depsgraph_get()
    stats = {"frozen_meshes": 0, "applied_modifiers": 0, "copied_shared_meshes": 0,
             "preserved_uv0_meshes": 0, "preserved_corner_normal_meshes": 0,
             "maximum_corner_normal_delta": 0.0}
    for obj in targets:
        # A viewport/render mismatch needs an explicit author decision instead
        # of silently freezing a different topology from the visible model.
        if any(modifier.show_viewport != modifier.show_render for modifier in obj.modifiers):
            raise RuntimeError(f"{obj.name}: modifier viewport/render visibility differs")
        graph.update()
        evaluated = obj.evaluated_get(graph)
        reference = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=graph)
        frozen = None
        try:
            frozen = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=graph)
            frozen.name = obj.data.name + "_LightmapFinal"
            if (len(frozen.vertices), len(frozen.loops), len(frozen.polygons)) != (len(reference.vertices), len(reference.loops), len(reference.polygons)):
                raise RuntimeError(f"{obj.name}: evaluated mesh topology changed while copying")

            def mesh_values(collection, attribute: str, width: int = 1) -> np.ndarray:
                values = np.empty(len(collection) * width, dtype=np.float32)
                collection.foreach_get(attribute, values)
                return values

            if not np.array_equal(mesh_values(reference.vertices, "co", 3), mesh_values(frozen.vertices, "co", 3)):
                raise RuntimeError(f"{obj.name}: evaluated vertex positions changed while copying")
            if reference.uv_layers:
                if not frozen.uv_layers or reference.uv_layers[0].name != frozen.uv_layers[0].name or len(reference.uv_layers[0].data) != len(frozen.uv_layers[0].data):
                    raise RuntimeError(f"{obj.name}: original UV0 was not preserved")
                # Separate evaluations of Bevel can differ by a final float
                # bit in interpolated UVs. Retain the reference values exactly.
                original_uv0 = mesh_values(reference.uv_layers[0].data, "uv", 2)
                frozen.uv_layers[0].data.foreach_set("uv", original_uv0)
                stats["preserved_uv0_meshes"] += 1

            normals = mesh_values(reference.corner_normals, "vector", 3)
            copied_normals = mesh_values(frozen.corner_normals, "vector", 3)
            if len(normals) != len(copied_normals):
                raise RuntimeError(f"{obj.name}: corner-normal topology changed")
            delta = float(np.abs(normals - copied_normals).max()) if normals.size else 0.0
            if delta > 1e-6:
                frozen.normals_split_custom_set(normals.reshape(-1, 3).tolist())
                copied_normals = mesh_values(frozen.corner_normals, "vector", 3)
                delta = float(np.abs(normals - copied_normals).max())
            if delta > 1e-4:
                raise RuntimeError(f"{obj.name}: evaluated shading normals were not preserved ({delta})")
            stats["maximum_corner_normal_delta"] = max(stats["maximum_corner_normal_delta"], delta)
            stats["preserved_corner_normal_meshes"] += 1

            slots = [(slot.link, slot.material) for slot in obj.material_slots]
            if len(frozen.materials) != len(slots):
                raise RuntimeError(f"{obj.name}: material-slot count changed while copying")
            original_mesh = obj.data
            for key in original_mesh.keys():
                frozen[key] = original_mesh[key]
            stats["copied_shared_meshes"] += int(original_mesh.users > 1)
            stats["applied_modifiers"] += len(obj.modifiers)
            obj.data = frozen
            obj.modifiers.clear()
            for slot, (link, material) in zip(obj.material_slots, slots):
                slot.link = link
                slot.material = material
            # Verify the final attached mesh, after Weighted Normal and all
            # other modifiers have been removed from the object stack.
            attached_normals = mesh_values(obj.data.corner_normals, "vector", 3)
            if normals.size and float(np.abs(normals - attached_normals).max()) > 1e-4:
                raise RuntimeError(f"{obj.name}: shading normals changed after applying modifiers")
            stats["frozen_meshes"] += 1
            if original_mesh.users == 0:
                bpy.data.meshes.remove(original_mesh)
        except Exception:
            if frozen is not None and frozen.users == 0:
                bpy.data.meshes.remove(frozen)
            raise
        finally:
            evaluated.to_mesh_clear()
    return stats


def bake_room_lighting(
    output_dir: Path,
    size: int = 2048,
    samples: int = 32,
    *,
    denoise: bool = True,
    prefer_gpu: bool = True,
) -> dict:
    """Bake opaque static meshes together; preserve authored scene appearance.

    Keep UV0 intact and leave the new LightmapUV at UV1 for glTF export. No
    object transforms or authored material settings are permanently changed.
    Transparent, emissive and unsupported meshes remain outside the atlas.
    Call in object mode on the scene which the caller will subsequently export.
    """
    if not 8 <= size <= 8192 or samples < 1:
        raise ValueError("size must be 8..8192 and samples must be positive")
    if bpy.context.mode != "OBJECT":
        raise RuntimeError("bake_room_lighting requires Object Mode")
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    png_path = output_dir / "room-redesign-lightmap.png"
    exr_path = output_dir / "room-redesign-lightmap-linear.exr"
    stats_path = output_dir / "room-redesign-lightmap.json"
    for path in (png_path, exr_path, stats_path):
        if path.exists():
            raise FileExistsError(f"Use a new output directory; refusing to overwrite {path}")

    scene = bpy.context.scene
    targets = []
    excluded = {}
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        reason = "hidden_render" if obj.hide_render else None
        if not reason and not obj.data.polygons:
            reason = "empty_geometry"
        if not reason and not obj.material_slots:
            reason = "no_material"
        if not reason:
            reason = next((value for slot in obj.material_slots if (value := _excluded_material_reason(slot.material))), None)
        if reason:
            excluded[obj.name] = reason
        else:
            targets.append(obj)
    if not targets:
        raise RuntimeError("No opaque non-emissive room meshes eligible for baking")

    selected = list(bpy.context.selected_objects)
    active = bpy.context.view_layer.objects.active
    previous_engine = scene.render.engine
    previous_cycles = {name: getattr(scene.cycles, name) for name in ("samples", "use_denoising", "max_bounces", "diffuse_bounces", "glossy_bounces", "device")}
    previous_bake = {name: getattr(scene.render.bake, name) for name in ("use_pass_color", "use_pass_direct", "use_pass_indirect", "margin", "use_clear")}
    image = None
    material_restore = []
    device_state = None
    started = time.monotonic()
    evaluated_mesh_stats = {}
    try:
        bpy.ops.object.select_all(action="DESELECT")
        evaluated_mesh_stats = _freeze_evaluated_target_meshes(targets)
        for obj in targets:
            obj.select_set(True)
            uv_layers = obj.data.uv_layers
            if not uv_layers:
                uv_layers.new(name="UVMap")
            if len(uv_layers) < 2:
                uv_layers.new(name="LightmapUV")
            uv_layers[1].name = "LightmapUV"
            uv_layers.active_index = 1
        bpy.context.view_layer.objects.active = targets[0]
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        # Smart unwrap forms islands from connected surfaces. A shared pack then
        # creates one atlas, avoiding per-polygon lightmap_pack fragmentation.
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0, area_weight=0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.select_all(action="SELECT")
        bpy.ops.uv.pack_islands(rotate=True, margin_method="FRACTION", margin=min(0.01, 4 / size))
        bpy.ops.object.mode_set(mode="OBJECT")
        for obj in targets:
            obj.data.uv_layers.active_index = 0
            obj.data.uv_layers[0].active_render = True

        image = bpy.data.images.new("RoomLighting_Linear_Bake", width=size, height=size, alpha=False, float_buffer=True)
        image.colorspace_settings.name = "Non-Color"
        materials = {slot.material for obj in targets for slot in obj.material_slots}
        for material in materials:
            nodes = material.node_tree.nodes
            previous_active = nodes.active
            previous_selected = [(node, node.select) for node in nodes]
            metallic_restore = []
            for node in nodes:
                node.select = False
                if node.type == "BSDF_PRINCIPLED":
                    metallic = node.inputs.get("Metallic")
                    if metallic:
                        links = [(link.from_socket, link.to_socket) for link in metallic.links]
                        metallic_restore.append((metallic, metallic.default_value, links))
                        for link in list(metallic.links):
                            material.node_tree.links.remove(link)
                        metallic.default_value = 0
            target = nodes.new("ShaderNodeTexImage")
            target.name = "RoomLighting_Temporary_Bake_Target"
            target.image = image
            target.select = True
            nodes.active = target
            material_restore.append((material, target, previous_active, previous_selected, metallic_restore))

        scene.render.engine = "CYCLES"
        scene.cycles.samples = samples
        scene.cycles.use_denoising = False
        scene.cycles.max_bounces = 4
        scene.cycles.diffuse_bounces = 3
        scene.cycles.glossy_bounces = 1
        scene.render.bake.use_pass_color = False
        scene.render.bake.use_pass_direct = True
        scene.render.bake.use_pass_indirect = True
        device_state = _configure_device(scene, prefer_gpu)
        device_name = device_state[0]
        bake_options = dict(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True, margin=max(1, min(8, size // 256)), uv_layer="LightmapUV")
        try:
            bpy.ops.object.bake(**bake_options)
        except RuntimeError:
            if scene.cycles.device != "GPU":
                raise
            scene.cycles.device = "CPU"
            device_name = "CPU (GPU bake failed)"
            bpy.ops.object.bake(**bake_options)
        bake_seconds = time.monotonic() - started
        if denoise:
            rgb = _denoise_linear(image, exr_path, size)
        else:
            pixels = np.empty(size * size * 4, dtype=np.float32)
            image.pixels.foreach_get(pixels)
            rgb = pixels.reshape(size, size, 4)[:, :, :3].copy()
        encoding = _write_rgbm_srgb_png(rgb, png_path)
        stats = {
            "file": png_path.name,
            "path": str(png_path),
            "size": size,
            "samples": samples,
            "objects": len(targets),
            "target_names": [obj.name for obj in targets],
            "excluded": excluded,
            "copied_shared_meshes": evaluated_mesh_stats["copied_shared_meshes"],
            "evaluated_mesh_preparation": evaluated_mesh_stats,
            "three_lightmap_intensity": encoding["room_lightmap_scale"] * math.pi,
            "uv_channel": 1,
            "display_transform_baked": False,
            "denoised": denoise,
            "linear_archive": str(exr_path) if denoise else None,
            "device": device_name,
            "bake_seconds": round(bake_seconds, 3),
            "total_seconds": round(time.monotonic() - started, 3),
            "bytes": png_path.stat().st_size,
            **encoding,
        }
        stats_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")
        for obj in scene.objects:
            if obj.type == "MESH" and "room_lightmapped" in obj:
                del obj["room_lightmapped"]
        for obj in targets:
            obj["room_lightmapped"] = 1
        scene["room_lightmap_scale"] = encoding["room_lightmap_scale"]
        scene["room_lightmap_objects"] = len(targets)
        scene["room_lightmap_encoding"] = stats["encoding"]
        scene["room_lightmap_multiplier_power"] = stats["room_lightmap_multiplier_power"]
        root = scene.objects.get("Room_Redesign_Root")
        if root is not None:
            for key in ("room_lightmap_scale", "room_lightmap_objects", "room_lightmap_encoding", "room_lightmap_multiplier_power"):
                root[key] = scene[key]
        return stats
    finally:
        if bpy.context.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        for material, target, previous_active, previous_selected, metallic_restore in material_restore:
            nodes = material.node_tree.nodes
            nodes.remove(target)
            for metallic, value, links in metallic_restore:
                metallic.default_value = value
                for source, destination in links:
                    material.node_tree.links.new(source, destination)
            for node, was_selected in previous_selected:
                node.select = was_selected
            nodes.active = previous_active
        if image:
            bpy.data.images.remove(image)
        for name, value in previous_cycles.items():
            setattr(scene.cycles, name, value)
        for name, value in previous_bake.items():
            setattr(scene.render.bake, name, value)
        scene.render.engine = previous_engine
        if device_state:
            _, preferences, previous_type, devices = device_state
            if preferences:
                for device, was_used in devices:
                    device.use = was_used
                preferences.compute_device_type = previous_type
        bpy.ops.object.select_all(action="DESELECT")
        for obj in selected:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = active


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Re-encode a linear room-lighting EXR without rebaking")
    parser.add_argument("--reencode", type=Path, required=True, help="Existing scene-linear EXR")
    parser.add_argument("--output-dir", type=Path, required=True, help="New directory for RGBM PNG and metadata")
    parser.add_argument("--filename", default="room-refined-lightmap.png")
    arguments = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])
    print(json.dumps(reencode_lightmap(arguments.reencode, arguments.output_dir, arguments.filename), indent=2))
