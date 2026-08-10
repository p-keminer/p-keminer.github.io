"""Create the performance-first Blender graybox for the portfolio room redesign.

Run headlessly from the repository root:

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" \
        --background --factory-startup --python scripts/create_room_graybox.py

Generated files are intentionally separate from the live room:

    docs/assets/blender/room-redesign-graybox.blend
    output/room-redesign/room-graybox.glb
    output/room-redesign/room-graybox-preview.png
    output/room-redesign/room-graybox-lightmap.png
    output/room-redesign/room-graybox-keyboard-mouse-preview.png
    output/room-redesign/room-graybox-monitor-cables-preview.png
    output/room-redesign/room-graybox-right-shelf-preview.png
    output/room-redesign/room-graybox-floating-shelf-front-preview.png
    output/room-redesign/room-graybox-right-workspace-preview.png
    output/room-redesign/room-graybox-bench-instruments-preview.png
    output/room-redesign/room-graybox-tool-wall-preview.png
    output/room-redesign/room-graybox-3d-printer-preview.png
    output/room-redesign/room-graybox-right-desk-arm-preview.png
    output/room-redesign/room-graybox-book-titles-preview.png
    output/room-redesign/room-graybox-laptop-preview.png
    output/room-redesign/room-graybox-left-decor-lamp-preview.png
    output/room-redesign/room-graybox-left-poster-preview.png
    output/room-redesign/room-graybox-esp32-poster-preview.png
    output/room-redesign/room-graybox-stats.json

The .blend source and output/ directory are ignored by Git. The script itself is
the reproducible source of truth until the visual direction is approved.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Iterable

import bpy
from mathutils import Vector


SCRIPT_PATH = Path(__file__).resolve()
REPO_ROOT = SCRIPT_PATH.parent.parent
BLEND_PATH = REPO_ROOT / "docs" / "assets" / "blender" / "room-redesign-graybox.blend"
OUTPUT_DIR = REPO_ROOT / "output" / "room-redesign"
GLB_PATH = OUTPUT_DIR / "room-graybox.glb"
PREVIEW_PATH = OUTPUT_DIR / "room-graybox-preview.png"
LIGHTMAP_PATH = OUTPUT_DIR / "room-graybox-lightmap.png"
PROTOTYPE_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-prototype-preview.png"
KEYBOARD_MOUSE_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-keyboard-mouse-preview.png"
MONITOR_CABLE_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-monitor-cables-preview.png"
RIGHT_SHELF_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-right-shelf-preview.png"
FLOATING_SHELF_FRONT_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-floating-shelf-front-preview.png"
RIGHT_WORKSPACE_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-right-workspace-preview.png"
BENCH_INSTRUMENTS_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-bench-instruments-preview.png"
TOOL_WALL_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-tool-wall-preview.png"
PRINTER_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-3d-printer-preview.png"
RIGHT_DESK_ARM_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-right-desk-arm-preview.png"
BOOK_TITLES_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-book-titles-preview.png"
LAPTOP_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-laptop-preview.png"
LEFT_DECOR_LAMP_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-left-decor-lamp-preview.png"
LEFT_POSTER_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-left-poster-preview.png"
ESP32_POSTER_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-esp32-poster-preview.png"
LEFT_WINDOW_PREVIEW_PATH = OUTPUT_DIR / "room-graybox-left-window-preview.png"
STATS_PATH = OUTPUT_DIR / "room-graybox-stats.json"

CERTIFICATE_TOPICS_RIGHT_TO_LEFT = (
    ("cs50", "CS50", "CS50", 0.112),
    ("cisco", "Cisco", "CISCO", 0.112),
    ("tryhackme", "TryHackMe", "THM", 0.112),
    ("jetbrains", "JetBrains", "JET\nBRAINS", 0.112),
    (None, "", "", 0.0),
    (None, "", "", 0.0),
    (None, "", "", 0.0),
    (None, "", "", 0.0),
)

MONITOR_NAVIGATION_LABELS = {
    1: "LEISTUNGS\nNACHWEISE",
    2: "PORTFOLIO",
    3: "ÜBER MICH",
}

MONITOR_NAVIGATION_LABEL_SIZES = {
    1: 0.112,
    2: 0.130,
    3: 0.125,
}

WINDOWS_FONTS_DIR = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
UI_SEMIBOLD_FONT_PATH = WINDOWS_FONTS_DIR / "seguisb.ttf"
UI_BOLD_FONT_PATH = WINDOWS_FONTS_DIR / "segoeuib.ttf"

ROOM_WIDTH = 7.2
ROOM_DEPTH = 5.7
ROOM_HEIGHT = 2.9
ROOM_BACK_Y = 3.0
ROOM_FRONT_Y = ROOM_BACK_Y - ROOM_DEPTH
ROOM_CENTER_Y = (ROOM_BACK_Y + ROOM_FRONT_Y) / 2
WALL_FLOOR_BURY = 0.02


def clean_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def collection(name: str) -> bpy.types.Collection:
    result = bpy.data.collections.get(name)
    if result is None:
        result = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(result)
    return result


def move_to_collection(obj: bpy.types.Object, target: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)


def material(
    name: str,
    base_color: tuple[float, float, float, float],
    *,
    roughness: float = 0.62,
    metallic: float = 0.0,
    emission_color: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
    transmission_weight: float = 0.0,
    ior: float = 1.5,
    thin_walled: bool = False,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError(f"Principled BSDF missing for {name}")
    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    alpha_input = bsdf.inputs.get("Alpha")
    if alpha_input is not None:
        alpha_input.default_value = alpha
    transmission_input = bsdf.inputs.get("Transmission Weight")
    if transmission_input is not None:
        transmission_input.default_value = transmission_weight
    ior_input = bsdf.inputs.get("IOR")
    if ior_input is not None:
        ior_input.default_value = ior
    thin_wall_input = bsdf.inputs.get("Thin Wall")
    if thin_wall_input is not None:
        thin_wall_input.default_value = thin_walled
    if alpha < 1.0:
        mat.surface_render_method = "BLENDED"
    if emission_color is not None and emission_strength > 0:
        color_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        strength_input = bsdf.inputs.get("Emission Strength")
        if color_input is not None:
            color_input.default_value = emission_color
        if strength_input is not None:
            strength_input.default_value = emission_strength
    return mat


def assign_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    bevel: float = 0.025,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new(name="Small edge bevel", type="BEVEL")
        modifier.width = min(bevel, min(dimensions) * 0.22)
        modifier.segments = 2
    assign_material(obj, mat)
    obj.parent = parent
    move_to_collection(obj, target_collection)
    return obj


def add_box_group(
    name: str,
    boxes: Iterable[
        tuple[tuple[float, float, float], tuple[float, float, float]]
    ],
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    bevel: float = 0.0,
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    """Combine several axis-aligned cuboids into one low-draw-call mesh."""
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for box_location, dimensions in boxes:
        x, y, z = box_location
        hx, hy, hz = (value / 2 for value in dimensions)
        base = len(vertices)
        vertices.extend(
            (
                (x - hx, y - hy, z - hz),
                (x + hx, y - hy, z - hz),
                (x + hx, y + hy, z - hz),
                (x - hx, y + hy, z - hz),
                (x - hx, y - hy, z + hz),
                (x + hx, y - hy, z + hz),
                (x + hx, y + hy, z + hz),
                (x - hx, y + hy, z + hz),
            )
        )
        faces.extend(
            (
                (base, base + 3, base + 2, base + 1),
                (base + 4, base + 5, base + 6, base + 7),
                (base, base + 1, base + 5, base + 4),
                (base + 1, base + 2, base + 6, base + 5),
                (base + 2, base + 3, base + 7, base + 6),
                (base + 3, base, base + 4, base + 7),
            )
        )

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    assign_material(obj, mat)
    obj.location = location
    obj.rotation_euler = rotation
    if bevel > 0:
        modifier = obj.modifiers.new(name="Grouped edge bevel", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 1
    obj.parent = parent
    target_collection.objects.link(obj)
    return obj


def add_x_wall_with_opening(
    name: str,
    *,
    x_center: float,
    thickness: float,
    y_min: float,
    y_max: float,
    z_min: float,
    z_max: float,
    opening_y_min: float,
    opening_y_max: float,
    opening_z_min: float,
    opening_z_max: float,
    mat: bpy.types.Material,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
) -> bpy.types.Object:
    """Create one watertight x-aligned wall around a rectangular opening."""
    x_values = (x_center - thickness / 2, x_center + thickness / 2)
    y_values = (y_min, opening_y_min, opening_y_max, y_max)
    z_values = (z_min, opening_z_min, opening_z_max, z_max)
    vertices = [
        (x, y, z)
        for x in x_values
        for y in y_values
        for z in z_values
    ]

    def vertex_index(x_index: int, y_index: int, z_index: int) -> int:
        return x_index * 16 + y_index * 4 + z_index

    def x_face(
        x_index: int,
        profile: tuple[tuple[int, int], ...],
    ) -> tuple[int, ...]:
        return tuple(
            vertex_index(x_index, y_index, z_index)
            for y_index, z_index in profile
        )

    # Split both horizontal wall bands at the opening boundaries. The seams
    # stay hidden at the reveals, while every proportional quad receives
    # enough lightmap texels to preserve a clean gradient without color bands.
    profiles = (
        ((0, 0), (1, 0), (1, 1), (0, 1)),
        ((1, 0), (2, 0), (2, 1), (1, 1)),
        ((2, 0), (3, 0), (3, 1), (2, 1)),
        ((0, 2), (1, 2), (1, 3), (0, 3)),
        ((1, 2), (2, 2), (2, 3), (1, 3)),
        ((2, 2), (3, 2), (3, 3), (2, 3)),
        ((0, 1), (1, 1), (1, 2), (0, 2)),
        ((2, 1), (3, 1), (3, 2), (2, 2)),
    )
    faces: list[tuple[int, ...]] = []
    for profile in profiles:
        faces.append(x_face(1, profile))
        faces.append(tuple(reversed(x_face(0, profile))))

    # Close the outer perimeter and the four reveals. There are no internal
    # caps, while collinear boundary vertices keep every edge fully shared.
    faces.extend(
        (
            tuple(vertex_index(xi, 0, zi) for xi, zi in (
                (0, 0), (1, 0), (1, 1), (1, 2),
                (1, 3), (0, 3), (0, 2), (0, 1),
            )),
            tuple(vertex_index(xi, 3, zi) for xi, zi in (
                (0, 0), (0, 1), (0, 2), (0, 3),
                (1, 3), (1, 2), (1, 1), (1, 0),
            )),
            tuple(vertex_index(xi, yi, 0) for xi, yi in (
                (0, 0), (0, 1), (0, 2), (0, 3),
                (1, 3), (1, 2), (1, 1), (1, 0),
            )),
            tuple(vertex_index(xi, yi, 3) for xi, yi in (
                (0, 0), (1, 0), (1, 1), (1, 2),
                (1, 3), (0, 3), (0, 2), (0, 1),
            )),
            (
                vertex_index(0, 1, 1), vertex_index(0, 1, 2),
                vertex_index(1, 1, 2), vertex_index(1, 1, 1),
            ),
            (
                vertex_index(0, 2, 1), vertex_index(1, 2, 1),
                vertex_index(1, 2, 2), vertex_index(0, 2, 2),
            ),
            (
                vertex_index(0, 1, 1), vertex_index(1, 1, 1),
                vertex_index(1, 2, 1), vertex_index(0, 2, 1),
            ),
            (
                vertex_index(0, 1, 2), vertex_index(0, 2, 2),
                vertex_index(1, 2, 2), vertex_index(1, 1, 2),
            ),
        )
    )

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(clean_customdata=True)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    assign_material(obj, mat)
    obj.parent = parent
    target_collection.objects.link(obj)
    return obj

def add_y_axis_cylinder_group(
    name: str,
    cylinders: Iterable[
        tuple[tuple[float, float, float], float, float]
    ],
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    vertices_per_cylinder: int = 10,
) -> bpy.types.Object:
    """Combine several front-facing low-poly cylinders into one mesh."""
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for center, radius, depth in cylinders:
        x, y, z = center
        base = len(vertices)
        for y_offset in (-depth / 2, depth / 2):
            for index in range(vertices_per_cylinder):
                angle = math.tau * index / vertices_per_cylinder
                vertices.append(
                    (
                        x + math.cos(angle) * radius,
                        y + y_offset,
                        z + math.sin(angle) * radius,
                    )
                )
        faces.append(
            tuple(base + index for index in reversed(range(vertices_per_cylinder)))
        )
        faces.append(
            tuple(base + vertices_per_cylinder + index for index in range(vertices_per_cylinder))
        )
        for index in range(vertices_per_cylinder):
            next_index = (index + 1) % vertices_per_cylinder
            faces.append(
                (
                    base + index,
                    base + next_index,
                    base + vertices_per_cylinder + next_index,
                    base + vertices_per_cylinder + index,
                )
            )

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    assign_material(obj, mat)
    obj.parent = parent
    target_collection.objects.link(obj)
    return obj


def add_x_axis_cylinder_group(
    name: str,
    cylinders: Iterable[
        tuple[tuple[float, float, float], float, float]
    ],
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    vertices_per_cylinder: int = 10,
) -> bpy.types.Object:
    """Combine several wall-facing low-poly cylinders into one mesh."""
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for center, radius, depth in cylinders:
        x, y, z = center
        base = len(vertices)
        for x_offset in (-depth / 2, depth / 2):
            for index in range(vertices_per_cylinder):
                angle = math.tau * index / vertices_per_cylinder
                vertices.append(
                    (
                        x + x_offset,
                        y + math.cos(angle) * radius,
                        z + math.sin(angle) * radius,
                    )
                )
        faces.append(
            tuple(base + index for index in reversed(range(vertices_per_cylinder)))
        )
        faces.append(
            tuple(base + vertices_per_cylinder + index for index in range(vertices_per_cylinder))
        )
        for index in range(vertices_per_cylinder):
            next_index = (index + 1) % vertices_per_cylinder
            faces.append(
                (
                    base + index,
                    base + next_index,
                    base + vertices_per_cylinder + next_index,
                    base + vertices_per_cylinder + index,
                )
            )

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    assign_material(obj, mat)
    obj.parent = parent
    target_collection.objects.link(obj)
    return obj


def add_z_axis_cylinder_group(
    name: str,
    cylinders: Iterable[
        tuple[tuple[float, float, float], float, float]
    ],
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    vertices_per_cylinder: int = 10,
) -> bpy.types.Object:
    """Combine several upright low-poly cylinders into one mesh."""
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for center, radius, depth in cylinders:
        x, y, z = center
        base = len(vertices)
        for z_offset in (-depth / 2, depth / 2):
            for index in range(vertices_per_cylinder):
                angle = math.tau * index / vertices_per_cylinder
                vertices.append(
                    (
                        x + math.cos(angle) * radius,
                        y + math.sin(angle) * radius,
                        z + z_offset,
                    )
                )
        faces.append(
            tuple(base + index for index in reversed(range(vertices_per_cylinder)))
        )
        faces.append(
            tuple(base + vertices_per_cylinder + index for index in range(vertices_per_cylinder))
        )
        for index in range(vertices_per_cylinder):
            next_index = (index + 1) % vertices_per_cylinder
            faces.append(
                (
                    base + index,
                    base + next_index,
                    base + vertices_per_cylinder + next_index,
                    base + vertices_per_cylinder + index,
                )
            )

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    assign_material(obj, mat)
    obj.parent = parent
    target_collection.objects.link(obj)
    return obj


def add_ico_sphere(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
) -> bpy.types.Object:
    """Add a deliberately low-poly rounded form for foliage or a lamp globe."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, mat)
    obj.parent = parent
    move_to_collection(obj, target_collection)
    return obj


def add_cable_bundle(
    name: str,
    paths: Iterable[Iterable[tuple[float, float, float]]],
    radius: float,
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
) -> bpy.types.Object:
    """Create several coarse prototype cables as one converted mesh object."""
    curve = bpy.data.curves.new(f"{name}_Curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 0
    curve.use_fill_caps = True

    for path in paths:
        points = tuple(path)
        spline = curve.splines.new(type="POLY")
        spline.points.add(len(points) - 1)
        for point, coordinates in zip(spline.points, points):
            point.co = (*coordinates, 1.0)

    obj = bpy.data.objects.new(name, curve)
    assign_material(obj, mat)
    obj.parent = parent
    target_collection.objects.link(obj)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    converted = bpy.context.object
    converted.name = name
    return converted


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    vertices: int = 16,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, mat)
    obj.parent = parent
    move_to_collection(obj, target_collection)
    bevel = obj.modifiers.new(name="Cylinder edge bevel", type="BEVEL")
    bevel.width = min(0.015, radius * 0.2)
    bevel.segments = 2
    return obj


def add_y_axis_torus_group(
    name: str,
    centers: tuple[tuple[float, float, float], ...],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    major_segments: int = 12,
    minor_segments: int = 6,
) -> bpy.types.Object:
    """Create several low-poly torus rings around the Y axis as one mesh."""
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    ring_vertex_count = major_segments * minor_segments

    for ring_index, (center_x, center_y, center_z) in enumerate(centers):
        ring_offset = ring_index * ring_vertex_count
        for major_index in range(major_segments):
            theta = math.tau * major_index / major_segments
            cos_theta = math.cos(theta)
            sin_theta = math.sin(theta)
            for minor_index in range(minor_segments):
                phi = math.tau * minor_index / minor_segments
                radial_distance = major_radius + minor_radius * math.cos(phi)
                vertices.append(
                    (
                        center_x + radial_distance * cos_theta,
                        center_y + minor_radius * math.sin(phi),
                        center_z + radial_distance * sin_theta,
                    )
                )

        for major_index in range(major_segments):
            next_major = (major_index + 1) % major_segments
            for minor_index in range(minor_segments):
                next_minor = (minor_index + 1) % minor_segments
                current = ring_offset + major_index * minor_segments + minor_index
                current_next_minor = ring_offset + major_index * minor_segments + next_minor
                next_both = ring_offset + next_major * minor_segments + next_minor
                next_major_current_minor = ring_offset + next_major * minor_segments + minor_index
                faces.append(
                    (current, current_next_minor, next_both, next_major_current_minor)
                )

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    assign_material(obj, mat)
    obj.parent = parent
    target_collection.objects.link(obj)
    return obj


def add_cone(
    name: str,
    location: tuple[float, float, float],
    radius_bottom: float,
    radius_top: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    vertices: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, mat)
    obj.parent = parent
    move_to_collection(obj, target_collection)
    return obj


def add_empty(
    name: str,
    location: tuple[float, float, float],
    role: str,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
) -> bpy.types.Object:
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "SPHERE"
    empty.empty_display_size = 0.12
    empty.location = location
    empty["hotspot"] = True
    empty["role"] = role
    empty.parent = parent
    target_collection.objects.link(empty)
    return empty


def add_text_mesh_group(
    name: str,
    entries: Iterable[
        tuple[str, tuple[float, float, float], float]
    ],
    mat: bpy.types.Material,
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    rotation: tuple[float, float, float] = (0.0, -math.pi / 2, 0.0),
    align_x: str = "CENTER",
    align_y: str = "CENTER",
    font_path: Path | None = None,
    character_spacing: float = 0.92,
    word_spacing: float = 0.78,
    line_spacing: float = 1.0,
    outline_offset: float = 0.0006,
) -> bpy.types.Object:
    """Create flat readable labels and join them into one exportable mesh."""
    text_meshes: list[bpy.types.Object] = []
    vector_font = None
    if font_path is not None and font_path.exists():
        vector_font = bpy.data.fonts.load(str(font_path), check_existing=True)
    for index, (body, location, size) in enumerate(entries, start=1):
        text_data = bpy.data.curves.new(f"{name}_{index:02d}_Font", type="FONT")
        text_data.body = body
        text_data.align_x = align_x
        text_data.align_y = align_y
        text_data.size = size
        text_data.resolution_u = 1
        text_data.fill_mode = "FRONT"
        text_data.space_character = character_spacing
        text_data.space_word = word_spacing
        text_data.space_line = line_spacing
        text_data.offset = outline_offset
        if vector_font is not None:
            text_data.font = vector_font

        text_obj = bpy.data.objects.new(f"{name}_{index:02d}", text_data)
        text_obj.location = location
        text_obj.rotation_euler = rotation
        text_obj.parent = parent
        assign_material(text_obj, mat)
        target_collection.objects.link(text_obj)

        bpy.ops.object.select_all(action="DESELECT")
        text_obj.select_set(True)
        bpy.context.view_layer.objects.active = text_obj
        bpy.ops.object.convert(target="MESH")
        text_meshes.append(bpy.context.object)

    bpy.ops.object.select_all(action="DESELECT")
    for text_mesh in text_meshes:
        text_mesh.select_set(True)
    bpy.context.view_layer.objects.active = text_meshes[0]
    bpy.ops.object.join()
    combined = bpy.context.object
    combined.name = name
    combined.data.name = f"{name}_Mesh"
    return combined


def add_colored_text_mesh(
    name: str,
    body: str,
    color_indices: tuple[int, ...],
    location: tuple[float, float, float],
    size: float,
    materials: tuple[bpy.types.Material, ...],
    *,
    parent: bpy.types.Object,
    target_collection: bpy.types.Collection,
    rotation: tuple[float, float, float] = (math.pi / 2, 0.0, 0.0),
    align_x: str = "CENTER",
    align_y: str = "CENTER",
    line_spacing: float = 1.0,
    font_path: Path | None = None,
) -> bpy.types.Object:
    """Create a flat multicolor text object and convert it to an exportable mesh."""
    if len(body) != len(color_indices):
        raise ValueError(f"{name}: one material index is required per character")

    text_data = bpy.data.curves.new(f"{name}_Font", type="FONT")
    text_data.body = body
    text_data.align_x = align_x
    text_data.align_y = align_y
    text_data.size = size
    text_data.resolution_u = 1
    text_data.fill_mode = "FRONT"
    text_data.space_character = 0.96
    text_data.space_word = 0.88
    text_data.space_line = line_spacing
    text_data.offset = 0.0005
    if font_path is not None and font_path.exists():
        text_data.font = bpy.data.fonts.load(str(font_path), check_existing=True)
    for mat in materials:
        text_data.materials.append(mat)
    for character_format, material_index in zip(
        text_data.body_format,
        color_indices,
        strict=True,
    ):
        character_format.material_index = material_index

    text_obj = bpy.data.objects.new(name, text_data)
    text_obj.location = location
    text_obj.rotation_euler = rotation
    text_obj.parent = parent
    target_collection.objects.link(text_obj)

    bpy.ops.object.select_all(action="DESELECT")
    text_obj.select_set(True)
    bpy.context.view_layer.objects.active = text_obj
    bpy.ops.object.convert(target="MESH")
    converted = bpy.context.object
    converted.name = name
    converted.data.name = f"{name}_Mesh"
    return converted


def add_monitor(
    index: int,
    x: float,
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    y = 2.40
    z = 1.39
    monitor_root = bpy.data.objects.new(f"Monitor_{index:02d}_Root", None)
    monitor_root.location = (x, y, 0.0)
    monitor_root.rotation_euler[2] = math.radians({1: 9, 2: 0, 3: -9}[index])
    monitor_root.parent = parent
    furniture.objects.link(monitor_root)

    add_box(
        f"Monitor_{index:02d}_Bezel",
        (0.0, 0.0, z),
        (1.14, 0.075, 0.68),
        mats["black"],
        parent=monitor_root,
        target_collection=furniture,
        bevel=0.035,
    )
    screen = add_box(
        {1: "mon_cctv_left", 2: "Monitor_02_Screen", 3: "mon_cctv_right"}[index],
        (0.0, -0.043, z),
        (1.02, 0.018, 0.56),
        mats[f"screen_{index}"],
        parent=monitor_root,
        target_collection=furniture,
        bevel=0.012,
    )
    role = {1: "performance-records", 2: "portfolio", 3: "about"}[index]
    screen["interaction_role"] = role
    add_text_mesh_group(
        f"Monitor_{index:02d}_Navigation_Label",
        (
            (
                MONITOR_NAVIGATION_LABELS[index],
                (0.0, -0.055, z),
                MONITOR_NAVIGATION_LABEL_SIZES[index],
            ),
        ),
        mats["navigation_text"],
        parent=monitor_root,
        target_collection=furniture,
        rotation=(math.pi / 2, 0.0, 0.0),
        font_path=UI_SEMIBOLD_FONT_PATH,
        character_spacing=1.12,
        word_spacing=1.0,
        line_spacing=1.12,
        outline_offset=0.0010,
    )
    add_box(
        f"Monitor_{index:02d}_Stem",
        (0.0, 0.01, 0.985),
        (0.08, 0.08, 0.24),
        mats["metal"],
        parent=monitor_root,
        target_collection=furniture,
        bevel=0.015,
    )
    add_box(
        f"Monitor_{index:02d}_Base",
        (0.0, -0.02, 0.855),
        (0.42, 0.30, 0.045),
        mats["metal"],
        parent=monitor_root,
        target_collection=furniture,
        bevel=0.025,
    )
    add_empty(
        f"Anchor_Monitor_{index:02d}",
        (0.0, -0.13, z),
        role,
        parent=monitor_root,
        target_collection=anchors,
    )


def add_monitor_cable_management(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    """Route three monitor leads into one managed bundle behind the desk."""
    add_cable_bundle(
        "Monitor_Top_Cables",
        (
            (
                (-1.6075, 2.4474, 1.280),
                (-1.6400, 2.4900, 1.120),
                (-1.7400, 2.5800, 0.930),
                (-1.7900, 2.6400, 0.860),
            ),
            (
                (-0.3000, 2.4480, 1.280),
                (-0.3400, 2.4900, 1.120),
                (-0.4400, 2.5800, 0.930),
                (-0.4900, 2.6400, 0.860),
            ),
            (
                (1.0075, 2.4474, 1.280),
                (0.9700, 2.4900, 1.120),
                (0.8700, 2.5800, 0.930),
                (0.8200, 2.6400, 0.860),
            ),
        ),
        0.009,
        mats["cable"],
        parent=parent,
        target_collection=furniture,
    )
    # Closed cable channel directly beneath the rear desk edge. It runs from
    # the right monitor toward the router/server stack, hides every long lead
    # and remains a matte anthracite housing above the concealed warm fill.
    add_box(
        "Desk_Monitor_Cable_Channel",
        (-0.695, 2.640, 0.665),
        (3.390, 0.140, 0.130),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.018,
    )
    # No emissive geometry is attached here: the channel receives only a
    # concealed indirect light source so no strip can read as a desk-edge LED.
    add_cable_bundle(
        "Monitor_Underdesk_Cables",
        (
            (
                (-1.790, 2.640, 0.728),
                (-1.790, 2.640, 0.665),
                (-2.340, 2.640, 0.665),
            ),
            (
                (-0.490, 2.640, 0.728),
                (-0.490, 2.640, 0.665),
                (-2.340, 2.640, 0.665),
            ),
            (
                (0.820, 2.640, 0.728),
                (0.820, 2.640, 0.665),
                (-2.340, 2.640, 0.665),
            ),
        ),
        0.009,
        mats["cable"],
        parent=parent,
        target_collection=furniture,
    )
    add_cable_bundle(
        "Monitor_Cable_Bundle_To_Network",
        (
            (
                (-2.340, 2.640, 0.665),
                (-2.340, 2.640, 0.580),
                (-2.260, 2.615, 0.550),
                (-2.080, 2.615, 0.540),
            ),
        ),
        0.016,
        mats["cable"],
        parent=parent,
        target_collection=furniture,
    )


def add_certificate_row(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    count = 8
    spacing = 0.70
    start_x = -0.25 - spacing * (count - 1) / 2
    topic_labels: list[tuple[str, tuple[float, float, float], float]] = []
    for index in range(count):
        x = start_x + index * spacing
        navigation_order = count - 1 - index
        topic_id, topic_label, display_label, label_size = (
            CERTIFICATE_TOPICS_RIGHT_TO_LEFT[navigation_order]
        )
        add_box(
            f"Certificate_{index + 1:02d}_Frame",
            (x, 2.89, 2.23),
            (0.62, 0.075, 0.48),
            mats["frame"],
            parent=parent,
            target_collection=furniture,
            bevel=0.025,
        )
        paper = add_box(
            f"Certificate_{index + 1:02d}_Paper",
            (x, 2.845, 2.23),
            (0.51, 0.018, 0.37),
            mats["paper"],
            parent=parent,
            target_collection=furniture,
            bevel=0.008,
        )
        if topic_id:
            paper["interaction_role"] = "certificate-topic"
            paper["topic_id"] = topic_id
            paper["label"] = topic_label
        anchor = add_empty(
            f"Anchor_Certificate_{index + 1:02d}",
            (x, 2.72, 2.23),
            f"certificate-{index + 1}",
            parent=parent,
            target_collection=anchors,
        )
        if topic_id:
            anchor["topic_id"] = topic_id
            anchor["label"] = topic_label
            anchor["navigation_order"] = navigation_order
            topic_labels.append((display_label, (x, 2.830, 2.23), label_size))

    add_text_mesh_group(
        "Certificate_Topic_Labels",
        topic_labels,
        mats["certificate_text"],
        parent=parent,
        target_collection=furniture,
        rotation=(math.pi / 2, 0.0, 0.0),
        font_path=UI_BOLD_FONT_PATH,
        character_spacing=1.08,
        word_spacing=1.0,
        line_spacing=0.84,
        outline_offset=0.0015,
    )


def add_microcontroller(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    center = (3.48, 1.48, 1.02)
    add_box(
        "Microcontroller_Enclosure",
        center,
        (0.64, 0.34, 0.34),
        mats["mcu"],
        parent=parent,
        target_collection=furniture,
        bevel=0.055,
    )
    add_box(
        "Microcontroller_Display",
        (center[0], center[1] - 0.181, center[2] + 0.025),
        (0.42, 0.018, 0.20),
        mats["screen_2"],
        parent=parent,
        target_collection=furniture,
        bevel=0.015,
    )
    add_cylinder(
        "Microcontroller_Antenna",
        (center[0] + 0.24, center[1] + 0.05, 1.48),
        0.025,
        0.62,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Microcontroller_Antenna_Base",
        (center[0] + 0.24, center[1] + 0.05, 1.18),
        0.055,
        0.10,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_empty(
        "Anchor_Microcontroller",
        (center[0], center[1] - 0.32, center[2]),
        "microcontroller",
        parent=parent,
        target_collection=anchors,
    )


def add_right_wall_workshop(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    # Detailed pegboard on the inner face of the right wall. All shapes remain
    # deliberately low-poly and are grouped by material wherever practical.
    add_box(
        "Embedded_Pegboard",
        (3.47, -0.15, 1.72),
        (0.08, 1.30, 0.82),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.025,
    )
    add_box_group(
        "Embedded_Pegboard_Holes",
        tuple(
            ((3.425, y, z), (0.008, 0.012, 0.012))
            for z in (1.38, 1.52, 1.66, 1.80, 1.94, 2.08)
            for y in (-0.70, -0.52, -0.34, -0.16, 0.02, 0.20, 0.38)
        ),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )

    screwdriver_specs = (
        (-0.24, 1.9500, 0.105, 1.8150, 0.165),
        (-0.39, 1.9675, 0.115, 1.8150, 0.190),
        (-0.54, 1.9400, 0.100, 1.8025, 0.175),
        (-0.69, 1.9675, 0.120, 1.8075, 0.200),
    )
    add_z_axis_cylinder_group(
        "Toolwall_Screwdriver_Handles_Accent",
        (
            ((3.395, screwdriver_specs[0][0], screwdriver_specs[0][1]), 0.023, screwdriver_specs[0][2]),
            ((3.395, screwdriver_specs[2][0], screwdriver_specs[2][1]), 0.022, screwdriver_specs[2][2]),
        ),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=10,
    )
    add_z_axis_cylinder_group(
        "Toolwall_Screwdriver_Handles_Blue",
        (
            ((3.395, screwdriver_specs[1][0], screwdriver_specs[1][1]), 0.025, screwdriver_specs[1][2]),
            ((3.395, screwdriver_specs[3][0], screwdriver_specs[3][1]), 0.026, screwdriver_specs[3][2]),
        ),
        mats["storage"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=10,
    )
    add_z_axis_cylinder_group(
        "Toolwall_Screwdriver_Shafts",
        tuple(
            ((3.405, y, shaft_z), 0.0065, shaft_length)
            for y, _handle_z, _handle_length, shaft_z, shaft_length in screwdriver_specs
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=8,
    )

    # Four differently sized spanners hang ring-side-up on individual wall hooks.
    wrench_paths = []
    wrench_ring_height = 1.575
    wrench_bottoms = (1.435, 1.405, 1.370, 1.335)
    wrench_ring_radii = (0.018, 0.021, 0.024, 0.027)
    wrench_fork_offsets = (0.022, 0.026, 0.030, 0.034)
    for (y, *_), bottom, ring_radius, fork_offset in zip(
        screwdriver_specs,
        wrench_bottoms,
        wrench_ring_radii,
        wrench_fork_offsets,
    ):
        wrench_paths.append(
            (
                (3.402, y, wrench_ring_height - ring_radius - 0.005),
                (3.402, y, bottom + 0.035),
            )
        )
        wrench_paths.append(
            ((3.402, y, bottom + 0.040), (3.402, y - fork_offset, bottom))
        )
        wrench_paths.append(
            ((3.402, y, bottom + 0.040), (3.402, y + fork_offset, bottom))
        )
        ring = tuple(
            (
                3.402,
                y + math.cos(math.tau * index / 8) * ring_radius,
                wrench_ring_height + math.sin(math.tau * index / 8) * ring_radius,
            )
            for index in range(8)
        )
        wrench_paths.append((*ring, ring[0]))
    add_cable_bundle(
        "Toolwall_Wrenches",
        wrench_paths,
        0.008,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
    )
    add_x_axis_cylinder_group(
        "Toolwall_Wrench_Hooks",
        tuple(
            cylinder
            for y, *_ in screwdriver_specs
            for cylinder in (
                ((3.3975, y, wrench_ring_height), 0.006, 0.075),
                ((3.3570, y, wrench_ring_height), 0.009, 0.014),
            )
        ),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=8,
    )

    # A large and a smaller side cutter form a tidy upper tool row.
    add_cable_bundle(
        "Toolwall_Side_Cutter_Handles",
        (
            ((3.400, 0.17, 1.88), (3.400, 0.1175, 1.7975), (3.400, 0.1025, 1.70)),
            ((3.400, 0.17, 1.88), (3.400, 0.2225, 1.7975), (3.400, 0.2375, 1.70)),
        ),
        0.011,
        mats["accent"],
        parent=parent,
        target_collection=furniture,
    )
    add_cable_bundle(
        "Toolwall_Small_Side_Cutter_Handles",
        (
            ((3.400, -0.05, 1.90), (3.400, -0.0868, 1.8423), (3.400, -0.0973, 1.774)),
            ((3.400, -0.05, 1.90), (3.400, -0.0132, 1.8423), (3.400, -0.0027, 1.774)),
        ),
        0.008,
        mats["accent"],
        parent=parent,
        target_collection=furniture,
    )
    add_cable_bundle(
        "Toolwall_Side_Cutter_Jaws",
        (
            ((3.400, 0.17, 1.88), (3.400, 0.1362, 1.966)),
            ((3.400, 0.17, 1.88), (3.400, 0.2038, 1.966)),
        ),
        0.008,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
    )
    add_cable_bundle(
        "Toolwall_Small_Side_Cutter_Jaws",
        (
            ((3.400, -0.05, 1.90), (3.400, -0.0737, 1.9602)),
            ((3.400, -0.05, 1.90), (3.400, -0.0263, 1.9602)),
        ),
        0.006,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
    )
    add_x_axis_cylinder_group(
        "Toolwall_Side_Cutter_Pivots",
        (
            ((3.391, 0.17, 1.88), 0.019, 0.038),
            ((3.395, -0.05, 1.90), 0.014, 0.030),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=8,
    )

    # Two ordered cable coils fill the lower-left row without loose ends.
    cable_coil_paths = []
    for center_y, center_z, radii in (
        (0.31, 1.48, (0.115, 0.092)),
        (-0.03, 1.47, (0.100, 0.078)),
    ):
        for radius in radii:
            loop = tuple(
                (
                    3.398,
                    center_y + math.cos(math.tau * index / 16) * radius,
                    center_z + math.sin(math.tau * index / 16) * radius,
                )
                for index in range(16)
            )
            cable_coil_paths.append((*loop, loop[0]))
    add_cable_bundle(
        "Toolwall_Coiled_Cable",
        cable_coil_paths,
        0.009,
        mats["storage"],
        parent=parent,
        target_collection=furniture,
    )
    add_cable_bundle(
        "Toolwall_Cable_Hanger_Lead",
        (
            ((3.398, 0.31, 1.71), (3.398, 0.31, 1.595)),
            ((3.398, -0.03, 1.66), (3.398, -0.03, 1.565)),
        ),
        0.009,
        mats["black"],
        parent=parent,
        target_collection=furniture,
    )
    add_x_axis_cylinder_group(
        "Toolwall_Cable_Hooks",
        (
            ((3.385, 0.31, 1.71), 0.018, 0.065),
            ((3.388, -0.03, 1.66), 0.016, 0.060),
        ),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=10,
    )

    # A simplified pipe wrench occupies the outer right edge of the board.
    add_box(
        "Toolwall_Pipe_Wrench_Handle",
        (3.405, 0.400, 1.764),
        (0.026, 0.045, 0.250),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        bevel=0.008,
        rotation=(math.radians(-6), 0.0, 0.0),
    )
    add_box(
        "Toolwall_Pipe_Wrench_Head",
        (3.402, 0.3845, 1.894),
        (0.032, 0.087, 0.062),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_box(
        "Toolwall_Pipe_Wrench_Jaw",
        (3.400, 0.4155, 1.932),
        (0.032, 0.047, 0.068),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        bevel=0.005,
    )
    add_cylinder(
        "Toolwall_Pipe_Wrench_Adjuster",
        (3.390, 0.397, 1.848),
        0.015,
        0.034,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=8,
        rotation=(0.0, math.radians(90), 0.0),
    )

    tool_clip_boxes = []
    screwdriver_clip_heights = (1.8955, 1.9080, 1.8880, 1.9055)
    for (y, _handle_z, _handle_length, _shaft_z, _shaft_length), clip_z in zip(
        screwdriver_specs,
        screwdriver_clip_heights,
    ):
        tool_clip_boxes.extend(
            (
                ((3.410, y - 0.025, clip_z), (0.038, 0.014, 0.017)),
                ((3.410, y + 0.025, clip_z), (0.038, 0.014, 0.017)),
            )
        )
    tool_clip_boxes.extend(
        (
            ((3.410, 0.110, 1.730), (0.040, 0.034, 0.018)),
            ((3.410, 0.230, 1.730), (0.040, 0.034, 0.018)),
            ((3.410, -0.090, 1.800), (0.034, 0.026, 0.014)),
            ((3.410, -0.010, 1.800), (0.034, 0.026, 0.014)),
            ((3.410, 0.400, 1.690), (0.040, 0.060, 0.016)),
            ((3.410, 0.400, 1.808), (0.040, 0.060, 0.016)),
        )
    )
    add_box_group(
        "Toolwall_Mounting_Clips",
        tool_clip_boxes,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.003,
    )

    # Two rows of large, readable parts bins below the pegboard.
    add_box(
        "Embedded_Parts_Bin_Back",
        (3.405, -0.15, 1.10),
        (0.21, 1.30, 0.38),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.018,
    )
    bin_boxes = []
    for z in (1.02, 1.19):
        for y in (-0.62, -0.33, -0.04, 0.25):
            bin_boxes.append(((3.30, y, z), (0.10, 0.24, 0.14)))
    add_box_group(
        "Embedded_Parts_Bins",
        bin_boxes,
        mats["storage"],
        parent=parent,
        target_collection=furniture,
    )
    add_box_group(
        "Embedded_Parts_Bin_Handles",
        tuple(
            ((3.237, y, z), (0.028, 0.110, 0.022))
            for z in (1.02, 1.19)
            for y in (-0.62, -0.33, -0.04, 0.25)
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        bevel=0.004,
    )

    # Simple warm task lamp: exported as meshes only, without a runtime light.
    add_box(
        "Embedded_Lamp_Wall_Base",
        (3.455, -0.15, 2.38),
        (0.08, 0.18, 0.22),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.018,
    )
    add_cylinder(
        "Embedded_Lamp_Arm",
        (3.20, -0.15, 2.42),
        0.025,
        0.50,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
        rotation=(0.0, math.radians(90), 0.0),
    )
    add_cylinder(
        "Embedded_Lamp_Drop",
        (2.96, -0.15, 2.29),
        0.025,
        0.26,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cone(
        "Embedded_Lamp_Shade",
        (2.96, -0.15, 2.12),
        0.15,
        0.07,
        0.18,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=16,
    )
    add_cylinder(
        "Embedded_Lamp_Glow",
        (2.96, -0.15, 2.015),
        0.065,
        0.035,
        mats["lamp_bulb_glass"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    # Keep the visible lamp assembly compact: the warm core and glow provide
    # the intended light without an additional outer glass shell.
    add_ico_sphere(
        "Embedded_Lamp_Bulb_Core",
        (2.96, -0.15, 2.155),
        (0.032, 0.032, 0.032),
        mats["lamp_bulb"],
        parent=parent,
        target_collection=furniture,
    )

    # Compact supported shelf toward the room front, visually to the right of
    # the pegboard in the fixed portfolio camera.
    add_box(
        "Embedded_Floating_Shelf",
        (3.32, -1.65, 1.90),
        (0.38, 1.10, 0.06),
        mats["wood"],
        parent=parent,
        target_collection=furniture,
        bevel=0.018,
    )
    add_box_group(
        "Embedded_Floating_Shelf_Brackets",
        (
            ((3.34, -1.98, 1.855), (0.28, 0.035, 0.035)),
            ((3.48, -1.98, 1.72), (0.035, 0.035, 0.30)),
            ((3.34, -1.32, 1.855), (0.28, 0.035, 0.035)),
            ((3.48, -1.32, 1.72), (0.035, 0.035, 0.30)),
        ),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )
    add_cone(
        "Embedded_Floating_Shelf_Plant_Pot",
        (3.34, -1.42, 2.005),
        0.065,
        0.085,
        0.150,
        mats["paper"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Embedded_Floating_Shelf_Plant_Stem",
        (3.34, -1.42, 2.135),
        0.014,
        0.160,
        mats["plant_stem"],
        parent=parent,
        target_collection=furniture,
        vertices=8,
    )
    add_ico_sphere(
        "Embedded_Floating_Shelf_Plant_Foliage",
        (3.34, -1.42, 2.255),
        (0.20, 0.18, 0.26),
        mats["plant"],
        parent=parent,
        target_collection=furniture,
    )
    add_box(
        "Embedded_Floating_Shelf_Box",
        (3.34, -1.88, 2.005),
        (0.22, 0.22, 0.15),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.025,
    )
    add_box(
        "Embedded_Floating_Shelf_Box_Lid",
        (3.34, -1.88, 2.090),
        (0.20, 0.20, 0.03),
        mats["storage"],
        parent=parent,
        target_collection=furniture,
        bevel=0.010,
    )

    # A second wall shelf beside the pegboard, oriented along the right wall.
    add_box_group(
        "Embedded_Shelf_Frame",
        (
            ((3.25, 0.65, 1.82), (0.52, 0.07, 1.72)),
            ((3.25, 2.23, 1.82), (0.52, 0.07, 1.72)),
        ),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )
    add_box_group(
        "Embedded_Shelf_Levels",
        tuple(
            ((3.25, 1.44, z), (0.52, 1.65, 0.07))
            for z in (0.98, 1.48, 1.98, 2.66)
        ),
        mats["wood"],
        parent=parent,
        target_collection=furniture,
    )
    # Side-by-side books replace the old placeholder storage blocks. Grouping
    # by material keeps every book readable without turning each spine into a
    # separate draw call.
    add_box_group(
        "Embedded_Shelf_Books_Dark",
        (
            ((3.14, 0.820, 1.685), (0.26, 0.080, 0.340)),
            ((3.14, 1.124, 1.675), (0.26, 0.100, 0.320)),
            ((3.14, 1.436, 1.690), (0.26, 0.075, 0.350)),
            ((3.14, 2.025, 2.205), (0.26, 0.090, 0.380)),
            ((3.14, 1.700, 2.195), (0.26, 0.080, 0.360)),
        ),
        mats["placeholder"],
        parent=parent,
        target_collection=furniture,
    )
    add_box_group(
        "Embedded_Shelf_Books_Blue",
        (
            ((3.14, 0.923, 1.660), (0.26, 0.090, 0.290)),
            ((3.14, 1.232, 1.695), (0.26, 0.080, 0.360)),
            ((3.14, 1.918, 2.180), (0.26, 0.075, 0.330)),
            ((3.14, 1.598, 2.210), (0.26, 0.085, 0.390)),
        ),
        mats["storage"],
        parent=parent,
        target_collection=furniture,
    )
    add_box_group(
        "Embedded_Shelf_Books_Charcoal",
        (
            ((3.14, 1.021, 1.700), (0.26, 0.070, 0.370)),
            ((3.14, 1.335, 1.665), (0.26, 0.090, 0.300)),
            ((3.14, 1.810, 2.225), (0.26, 0.100, 0.420)),
        ),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )
    # Slightly inset warm-white page blocks leave a narrow cover lip visible
    # around every book and make the silhouettes read as bound volumes.
    add_box_group(
        "Embedded_Shelf_Book_Page_Tops",
        (
            ((3.14, 0.820, 1.857), (0.220, 0.064, 0.008)),
            ((3.14, 0.923, 1.807), (0.220, 0.074, 0.008)),
            ((3.14, 1.021, 1.887), (0.220, 0.054, 0.008)),
            ((3.14, 1.124, 1.837), (0.220, 0.084, 0.008)),
            ((3.14, 1.232, 1.877), (0.220, 0.064, 0.008)),
            ((3.14, 1.335, 1.817), (0.220, 0.074, 0.008)),
            ((3.14, 1.436, 1.867), (0.220, 0.059, 0.008)),
            ((3.14, 1.598, 2.407), (0.220, 0.069, 0.008)),
            ((3.14, 1.700, 2.377), (0.220, 0.064, 0.008)),
            ((3.14, 1.810, 2.437), (0.220, 0.084, 0.008)),
            ((3.14, 1.918, 2.347), (0.220, 0.059, 0.008)),
            ((3.14, 2.025, 2.397), (0.220, 0.074, 0.008)),
        ),
        mats["paper"],
        parent=parent,
        target_collection=furniture,
    )

    # Raise the matching cover around each page block. The four slim strips form
    # a shallow rim whose top sits above the paper, so the pages read as being
    # recessed inside a bound cover instead of resting on top of a cuboid.
    def book_cover_rim_boxes(
        books: Iterable[tuple[float, float, float]],
    ) -> tuple[tuple[tuple[float, float, float], tuple[float, float, float]], ...]:
        boxes = []
        cover_depth = 0.260
        x_edge = 0.020
        y_edge = 0.010
        rim_height = 0.012
        for center_y, book_width, book_top in books:
            rim_z = book_top + rim_height / 2
            x_offset = (cover_depth - x_edge) / 2
            y_offset = (book_width - y_edge) / 2
            boxes.extend(
                (
                    ((3.14 - x_offset, center_y, rim_z), (x_edge, book_width, rim_height)),
                    ((3.14 + x_offset, center_y, rim_z), (x_edge, book_width, rim_height)),
                    ((3.14, center_y - y_offset, rim_z), (cover_depth - 2 * x_edge, y_edge, rim_height)),
                    ((3.14, center_y + y_offset, rim_z), (cover_depth - 2 * x_edge, y_edge, rim_height)),
                )
            )
        return tuple(boxes)

    add_box_group(
        "Embedded_Shelf_Book_Cover_Rims_Dark",
        book_cover_rim_boxes(
            (
                (0.820, 0.080, 1.855),
                (1.124, 0.100, 1.835),
                (1.436, 0.075, 1.865),
                (1.700, 0.080, 2.375),
                (2.025, 0.090, 2.395),
            )
        ),
        mats["placeholder"],
        parent=parent,
        target_collection=furniture,
    )
    add_box_group(
        "Embedded_Shelf_Book_Cover_Rims_Blue",
        book_cover_rim_boxes(
            (
                (0.923, 0.090, 1.805),
                (1.232, 0.080, 1.875),
                (1.598, 0.085, 2.405),
                (1.918, 0.075, 2.345),
            )
        ),
        mats["storage"],
        parent=parent,
        target_collection=furniture,
    )
    add_box_group(
        "Embedded_Shelf_Book_Cover_Rims_Charcoal",
        book_cover_rim_boxes(
            (
                (1.021, 0.070, 1.885),
                (1.335, 0.090, 1.815),
                (1.810, 0.100, 2.435),
            )
        ),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )
    add_text_mesh_group(
        "Embedded_Shelf_Book_Titles",
        (
            ("CRYPTOGRAPHY", (3.006, 0.820, 1.685), 0.032),
            ("NETWORKS", (3.006, 0.923, 1.660), 0.032),
            ("ARM CORTEX", (3.006, 1.021, 1.700), 0.032),
            ("EMBEDDED C", (3.006, 1.124, 1.675), 0.032),
            ("RASPBERRY PI", (3.006, 1.232, 1.695), 0.032),
            ("RTOS DESIGN", (3.006, 1.335, 1.665), 0.032),
            ("IOT SECURITY", (3.006, 1.436, 1.690), 0.032),
            ("EMBEDDED LINUX", (3.006, 1.598, 2.210), 0.032),
            ("SECURE BOOT", (3.006, 1.700, 2.195), 0.032),
            ("REVERSE ENGINEERING", (3.006, 1.810, 2.225), 0.032),
            ("FIRMWARE ANALYSIS", (3.006, 1.918, 2.180), 0.030),
            ("HARDWARE HACKING", (3.006, 2.025, 2.205), 0.032),
        ),
        mats["paper"],
        parent=parent,
        target_collection=furniture,
        character_spacing=1.08,
        word_spacing=1.00,
    )
    # Pull the top-shelf plant left in the room view (+Y) and five centimetres
    # deeper into the compartment (+X), clear of the visible shelf side.
    add_cone(
        "Embedded_Shelf_Plant_Pot",
        (3.19, 1.27, 2.105),
        0.085,
        0.110,
        0.18,
        mats["paper"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Embedded_Shelf_Plant_Stem",
        (3.19, 1.27, 2.23),
        0.018,
        0.14,
        mats["plant_stem"],
        parent=parent,
        target_collection=furniture,
        vertices=8,
    )
    add_ico_sphere(
        "Embedded_Shelf_Plant_Foliage",
        (3.19, 1.27, 2.41),
        (0.28, 0.24, 0.31),
        mats["plant"],
        parent=parent,
        target_collection=furniture,
    )
    add_box(
        "Embedded_Shelf_Safe",
        (3.17, 1.87, 1.665),
        (0.30, 0.36, 0.30),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.025,
    )
    add_box(
        "Embedded_Shelf_Safe_Door",
        (3.008, 1.87, 1.665),
        (0.018, 0.30, 0.24),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.012,
    )
    add_cylinder(
        "Embedded_Shelf_Safe_Dial",
        (2.990, 1.82, 1.685),
        0.035,
        0.026,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
        rotation=(0.0, math.radians(90), 0.0),
    )
    add_box(
        "Embedded_Shelf_Safe_Handle",
        (2.986, 1.955, 1.650),
        (0.030, 0.025, 0.105),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )

    # Heat-resistant work surface and a few intentionally broad device forms.
    add_box(
        "Embedded_Heat_Mat",
        (2.93, -0.15, 0.858),
        (1.02, 1.30, 0.025),
        mats["heatmat"],
        parent=parent,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Embedded_Controller",
        (3.16, 1.00, 1.095),
        (0.34, 0.42, 0.16),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Embedded_Controller_Display",
        (3.16, 0.97, 1.184),
        (0.24, 0.22, 0.018),
        mats["screen_2"],
        parent=parent,
        target_collection=furniture,
        bevel=0.012,
    )
    add_box(
        "Embedded_Test_Unit",
        (3.16, 1.56, 1.115),
        (0.28, 0.34, 0.20),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Embedded_Test_Display",
        (3.16, 1.51, 1.224),
        (0.17, 0.13, 0.018),
        mats["screen_1"],
        parent=parent,
        target_collection=furniture,
        bevel=0.010,
    )


def add_bench_instruments(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    """Build detailed low-cost instruments on the free right desk section."""
    # Oscilloscope: a deep bench enclosure, inset display, visible grid and an
    # actual low-poly waveform rather than a flat placeholder rectangle.
    add_box(
        "Bench_Oscilloscope_Body",
        (1.94, 2.28, 1.055),
        (0.58, 0.36, 0.41),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Bench_Oscilloscope_Front",
        (1.94, 2.092, 1.055),
        (0.54, 0.018, 0.35),
        mats["paper"],
        parent=parent,
        target_collection=furniture,
        bevel=0.015,
    )
    add_box(
        "Bench_Oscilloscope_Screen_Bezel",
        (1.84, 2.079, 1.080),
        (0.31, 0.014, 0.23),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.012,
    )
    add_box(
        "Bench_Oscilloscope_Screen",
        (1.84, 2.069, 1.080),
        (0.27, 0.008, 0.19),
        mats["screen_1"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_y_axis_cylinder_group(
        "Bench_Oscilloscope_Controls",
        (
            ((2.045, 2.068, 0.990), 0.024, 0.026),
            ((2.135, 2.068, 0.990), 0.024, 0.026),
            ((2.045, 2.068, 1.075), 0.024, 0.026),
            ((2.135, 2.068, 1.075), 0.024, 0.026),
            ((2.045, 2.068, 1.160), 0.024, 0.026),
            ((2.135, 2.068, 1.160), 0.024, 0.026),
            ((1.720, 2.068, 0.905), 0.017, 0.025),
            ((1.830, 2.068, 0.905), 0.017, 0.025),
            ((1.940, 2.068, 0.905), 0.017, 0.025),
            ((2.050, 2.068, 0.905), 0.017, 0.025),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=10,
    )
    add_box_group(
        "Bench_Oscilloscope_Buttons",
        (
            ((2.105, 2.060, 0.915), (0.035, 0.016, 0.022)),
            ((2.155, 2.060, 0.915), (0.035, 0.016, 0.022)),
            ((2.105, 2.060, 1.215), (0.090, 0.016, 0.018)),
        ),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        bevel=0.003,
    )

    # Handheld multimeter on its kickstand, tilted slightly back toward the
    # wall. All child coordinates are local to keep its face coherent.
    meter_root = bpy.data.objects.new("Bench_Multimeter_Root", None)
    meter_root.location = (2.39, 2.18, 0.85)
    meter_root.rotation_euler[0] = math.radians(-8)
    meter_root.parent = parent
    furniture.objects.link(meter_root)
    add_box(
        "Bench_Multimeter_Body",
        (0.0, 0.0, 0.19),
        (0.22, 0.10, 0.38),
        mats["board_light"],
        parent=meter_root,
        target_collection=furniture,
        bevel=0.045,
    )
    add_box(
        "Bench_Multimeter_Face",
        (0.0, -0.058, 0.19),
        (0.18, 0.018, 0.32),
        mats["black"],
        parent=meter_root,
        target_collection=furniture,
        bevel=0.018,
    )
    add_box(
        "Bench_Multimeter_Display",
        (0.0, -0.070, 0.285),
        (0.13, 0.010, 0.075),
        mats["screen_2"],
        parent=meter_root,
        target_collection=furniture,
        bevel=0.008,
    )
    add_y_axis_cylinder_group(
        "Bench_Multimeter_Round_Controls",
        (
            ((0.0, -0.074, 0.145), 0.052, 0.025),
            ((-0.052, -0.074, 0.052), 0.014, 0.023),
            ((0.0, -0.074, 0.052), 0.014, 0.023),
            ((0.052, -0.074, 0.052), 0.014, 0.023),
        ),
        mats["tool"],
        parent=meter_root,
        target_collection=furniture,
        vertices_per_cylinder=12,
    )
    add_box_group(
        "Bench_Multimeter_Buttons_And_Pointer",
        (
            ((-0.040, -0.077, 0.225), (0.050, 0.014, 0.022)),
            ((0.040, -0.077, 0.225), (0.050, 0.014, 0.022)),
            ((0.0, -0.079, 0.145), (0.014, 0.012, 0.070)),
        ),
        mats["accent"],
        parent=meter_root,
        target_collection=furniture,
        bevel=0.003,
    )
    add_box(
        "Bench_Multimeter_Stand",
        (0.0, 0.055, 0.035),
        (0.15, 0.11, 0.030),
        mats["metal"],
        parent=meter_root,
        target_collection=furniture,
        bevel=0.012,
    )

    # Compact soldering station with its own holder, brass-wool placeholder,
    # angled iron and a single coarse cable back to the control unit.
    add_box(
        "Bench_Soldering_Station_Body",
        (2.68, 2.49, 0.96),
        (0.26, 0.28, 0.22),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Bench_Soldering_Station_Front",
        (2.68, 2.342, 0.96),
        (0.22, 0.018, 0.18),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.014,
    )
    add_box(
        "Bench_Soldering_Station_Display",
        (2.635, 2.330, 1.010),
        (0.095, 0.010, 0.055),
        mats["screen_1"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_y_axis_cylinder_group(
        "Bench_Soldering_Station_Controls",
        (
            ((2.740, 2.328, 0.970), 0.035, 0.024),
            ((2.620, 2.328, 0.905), 0.015, 0.022),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=12,
    )
    add_box_group(
        "Bench_Soldering_Station_Buttons",
        (
            ((2.675, 2.326, 0.905), (0.030, 0.014, 0.022)),
            ((2.720, 2.326, 0.905), (0.030, 0.014, 0.022)),
        ),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        bevel=0.003,
    )
    add_box_group(
        "Bench_Soldering_Iron_Holder",
        (
            ((2.845, 2.205, 0.865), (0.17, 0.20, 0.035)),
            ((2.890, 2.240, 1.020), (0.025, 0.025, 0.280)),
            ((2.845, 2.240, 1.145), (0.115, 0.025, 0.025)),
            ((2.890, 2.170, 1.020), (0.025, 0.025, 0.280)),
            ((2.845, 2.170, 1.145), (0.115, 0.025, 0.025)),
        ),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.005,
    )
    add_box(
        "Bench_Soldering_Sponge",
        (2.805, 2.160, 0.895),
        (0.090, 0.085, 0.040),
        mats["board_light"],
        parent=parent,
        target_collection=furniture,
        bevel=0.008,
    )
    iron_angle = math.radians(55)
    add_cylinder(
        "Bench_Soldering_Iron_Handle",
        (2.845, 2.205, 1.100),
        0.025,
        0.28,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
        rotation=(0.0, iron_angle, 0.0),
    )
    add_cylinder(
        "Bench_Soldering_Iron_Tip",
        (2.675, 2.205, 0.980),
        0.010,
        0.16,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices=10,
        rotation=(0.0, iron_angle, 0.0),
    )
    add_cable_bundle(
        "Bench_Soldering_Iron_Cable",
        (
            (
                (2.730, 2.330, 0.900),
                (2.790, 2.170, 0.875),
                (2.900, 2.100, 0.930),
                (2.925, 2.180, 1.015),
                (2.960, 2.205, 1.180),
            ),
        ),
        0.006,
        mats["black"],
        parent=parent,
        target_collection=furniture,
    )

    # Compact corner lamp behind the soldering station. It fills the previously
    # dark gap beside the tall shelf without taking usable bench space.
    add_cylinder(
        "Bench_Corner_Lamp_Base",
        (2.84, 2.76, 0.875),
        0.085,
        0.070,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Bench_Corner_Lamp_Stem",
        (2.84, 2.76, 1.115),
        0.016,
        0.410,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=10,
    )
    add_cone(
        "Bench_Corner_Lamp_Shade",
        (2.84, 2.76, 1.385),
        0.105,
        0.045,
        0.140,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Bench_Corner_Lamp_Glow",
        (2.84, 2.76, 1.307),
        0.048,
        0.018,
        mats["lamp_bulb_glass"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_ico_sphere(
        "Bench_Corner_Lamp_Bulb",
        (2.84, 2.76, 1.365),
        (0.055, 0.055, 0.055),
        mats["lamp_bulb_glass"],
        parent=parent,
        target_collection=furniture,
    )
    add_ico_sphere(
        "Bench_Corner_Lamp_Bulb_Core",
        (2.84, 2.76, 1.365),
        (0.024, 0.024, 0.024),
        mats["lamp_bulb"],
        parent=parent,
        target_collection=furniture,
    )


def add_mat_prototype(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    # Raspberry-Pi-inspired single-board computer: one readable green board,
    # broad connection blocks and only the components needed for its silhouette.
    add_box(
        "Prototype_Pi_Board",
        (2.76, 0.12, 0.889),
        (0.32, 0.42, 0.037),
        mats["mcu"],
        parent=parent,
        target_collection=furniture,
        bevel=0.012,
    )
    add_box_group(
        "Prototype_Pi_Black_Modules",
        (
            ((2.76, 0.11, 0.926), (0.11, 0.11, 0.030)),
            ((2.66, 0.06, 0.926), (0.035, 0.32, 0.070)),
            ((2.83, 0.24, 0.923), (0.07, 0.08, 0.025)),
            ((2.775, -0.055, 0.926), (0.26, 0.09, 0.070)),
            ((2.94, 0.12, 0.913), (0.18, 0.30, 0.075)),
        ),
        mats["black"],
        parent=parent,
        target_collection=furniture,
    )
    add_box_group(
        "Prototype_Pi_Ports",
        (
            ((2.79, 0.00, 0.925), (0.07, 0.10, 0.055)),
            ((2.79, 0.23, 0.925), (0.07, 0.10, 0.055)),
            ((2.845, 0.12, 0.910), (0.08, 0.065, 0.035)),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
    )
    add_cylinder(
        "Prototype_AWUS_Antenna_Base_01",
        (2.94, 0.23, 1.00),
        0.035,
        0.10,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Prototype_AWUS_Antenna_01",
        (2.94, 0.23, 1.195),
        0.018,
        0.29,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=10,
    )
    add_cylinder(
        "Prototype_AWUS_Antenna_Base_02",
        (2.94, 0.01, 1.00),
        0.035,
        0.10,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Prototype_AWUS_Antenna_02",
        (2.94, 0.01, 1.195),
        0.018,
        0.29,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=10,
    )

    # The small display stands slightly in front of the board and leans back.
    display_root = bpy.data.objects.new("Prototype_Display_Root", None)
    display_root.location = (2.88, -0.48, 1.00)
    display_root.rotation_euler[0] = math.radians(-12)
    display_root.rotation_euler[2] = math.radians(-65)
    display_root.parent = parent
    furniture.objects.link(display_root)
    add_box(
        "Prototype_Display_Frame",
        (0.0, 0.0, 0.0),
        (0.42, 0.06, 0.25),
        mats["black"],
        parent=display_root,
        target_collection=furniture,
        bevel=0.020,
    )
    add_box(
        "Prototype_Display_Screen",
        (0.0, -0.036, 0.0),
        (0.34, 0.012, 0.17),
        mats["screen_1"],
        parent=display_root,
        target_collection=furniture,
        bevel=0.008,
    )
    add_box(
        "Prototype_Display_Foot",
        (2.88, -0.43, 0.883),
        (0.22, 0.18, 0.025),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.015,
        rotation=(0.0, 0.0, math.radians(-65)),
    )
    add_cable_bundle(
        "Prototype_Display_Cables",
        (
            ((2.70, -0.105, 0.920), (2.73, -0.23, 0.888), (2.865, -0.376, 0.910)),
            ((2.78, -0.105, 0.920), (2.82, -0.27, 0.888), (2.907, -0.467, 0.910)),
            ((2.86, -0.105, 0.920), (2.91, -0.32, 0.888), (2.949, -0.558, 0.910)),
        ),
        0.007,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
    )
    add_empty(
        "Anchor_Mat_Prototype",
        (2.86, -0.15, 1.04),
        "single-board-prototype",
        parent=parent,
        target_collection=anchors,
    )


def add_esp32_poster(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    """Build a lightweight portrait ESP32 pinout poster beside the monitors."""
    center_x = 2.33
    center_z = 1.48
    add_box(
        "ESP32_Poster_Frame",
        (center_x, 2.89, center_z),
        (0.62, 0.075, 0.82),
        mats["poster_black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.022,
    )
    add_box(
        "ESP32_Poster_Mat",
        (center_x, 2.843, center_z),
        (0.56, 0.018, 0.76),
        mats["poster_matte"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_box(
        "ESP32_Poster_Print",
        (center_x, 2.826, center_z),
        (0.52, 0.012, 0.72),
        mats["poster_black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.003,
    )

    # Central module silhouette and its high-contrast board outline.
    add_box(
        "ESP32_Poster_Module",
        (center_x, 2.812, 1.49),
        (0.20, 0.006, 0.36),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_box_group(
        "ESP32_Poster_Module_Outline",
        (
            ((center_x, 2.805, 1.669), (0.202, 0.004, 0.006)),
            ((center_x, 2.805, 1.311), (0.202, 0.004, 0.006)),
            ((2.231, 2.805, 1.49), (0.006, 0.004, 0.36)),
            ((2.429, 2.805, 1.49), (0.006, 0.004, 0.36)),
        ),
        mats["poster_teal"],
        parent=parent,
        target_collection=furniture,
    )
    pin_boxes = tuple(
        (location, (0.026, 0.004, 0.012))
        for pin_z in (1.335 + index * 0.033 for index in range(10))
        for location in ((2.218, 2.801, pin_z), (2.442, 2.801, pin_z))
    )
    add_box_group(
        "ESP32_Poster_Pin_Pads",
        pin_boxes,
        mats["poster_red"],
        parent=parent,
        target_collection=furniture,
        bevel=0.0015,
    )
    add_box(
        "ESP32_Poster_Chip_Frame",
        (center_x, 2.799, 1.48),
        (0.105, 0.004, 0.105),
        mats["poster_text"],
        parent=parent,
        target_collection=furniture,
        bevel=0.005,
    )
    add_box(
        "ESP32_Poster_Chip_Core",
        (center_x, 2.795, 1.48),
        (0.078, 0.003, 0.078),
        mats["poster_black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.003,
    )
    add_box_group(
        "ESP32_Poster_Internal_Components",
        (
            ((2.275, 2.797, 1.555), (0.020, 0.003, 0.012)),
            ((2.305, 2.797, 1.555), (0.020, 0.003, 0.012)),
            ((2.355, 2.797, 1.555), (0.020, 0.003, 0.012)),
            ((2.385, 2.797, 1.555), (0.020, 0.003, 0.012)),
            ((2.285, 2.797, 1.405), (0.018, 0.003, 0.010)),
            ((2.315, 2.797, 1.405), (0.018, 0.003, 0.010)),
            ((2.345, 2.797, 1.405), (0.018, 0.003, 0.010)),
            ((2.375, 2.797, 1.405), (0.018, 0.003, 0.010)),
        ),
        mats["poster_teal"],
        parent=parent,
        target_collection=furniture,
    )
    add_box(
        "ESP32_Poster_USB_Port",
        (center_x, 2.797, 1.329),
        (0.068, 0.004, 0.025),
        mats["poster_text"],
        parent=parent,
        target_collection=furniture,
        bevel=0.003,
    )

    add_cable_bundle(
        "ESP32_Poster_Antenna_Trace",
        (
            (
                (2.274, 2.798, 1.642),
                (2.386, 2.798, 1.642),
                (2.386, 2.798, 1.627),
                (2.286, 2.798, 1.627),
                (2.286, 2.798, 1.612),
                (2.374, 2.798, 1.612),
                (2.374, 2.798, 1.597),
                (2.298, 2.798, 1.597),
            ),
        ),
        0.0018,
        mats["poster_teal"],
        parent=parent,
        target_collection=furniture,
    )

    label_z_values = (1.595, 1.558, 1.521, 1.484, 1.447, 1.410)
    callout_paths: list[tuple[tuple[float, float, float], ...]] = []
    for label_z in label_z_values:
        callout_paths.extend(
            (
                (
                    (2.218, 2.797, label_z),
                    (2.188, 2.797, label_z),
                    (2.158, 2.797, label_z),
                ),
                (
                    (2.442, 2.797, label_z),
                    (2.472, 2.797, label_z),
                    (2.502, 2.797, label_z),
                ),
            )
        )
    add_cable_bundle(
        "ESP32_Poster_Callout_Lines",
        callout_paths,
        0.0014,
        mats["poster_text"],
        parent=parent,
        target_collection=furniture,
    )
    add_y_axis_cylinder_group(
        "ESP32_Poster_Callout_Nodes",
        tuple(
            (location, 0.0045, 0.005)
            for label_z in label_z_values
            for location in (
                (2.218, 2.794, label_z),
                (2.442, 2.794, label_z),
            )
        ),
        mats["poster_red"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=8,
    )

    poster_font_path = (
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "consola.ttf"
    )
    label_entries: list[tuple[str, tuple[float, float, float], float]] = [
        ("ESP32", (2.145, 2.817, 1.795), 0.055),
        ("MCU", (center_x, 2.791, 1.480), 0.016),
        ("PINOUT / BLOCK DIAGRAM", (center_x, 2.817, 1.168), 0.014),
    ]
    for label, label_z in zip(
        ("3V3", "EN", "GPIO", "ADC", "I2C", "GND"),
        label_z_values,
        strict=True,
    ):
        label_entries.append((label, (2.118, 2.817, label_z), 0.016))
    for label, label_z in zip(
        ("VIN", "GPIO", "UART", "SPI", "FLASH", "GND"),
        label_z_values,
        strict=True,
    ):
        label_entries.append((label, (2.542, 2.817, label_z), 0.016))
    add_text_mesh_group(
        "ESP32_Poster_Labels",
        label_entries,
        mats["poster_text"],
        parent=parent,
        target_collection=furniture,
        rotation=(math.pi / 2, 0.0, 0.0),
        font_path=poster_font_path,
    )
    add_text_mesh_group(
        "ESP32_Poster_Teal_Labels",
        (
            ("WIRELESS MCU", (2.178, 2.817, 1.748), 0.014),
            ("RF / BLE", (center_x, 2.817, 1.252), 0.012),
        ),
        mats["poster_teal"],
        parent=parent,
        target_collection=furniture,
        rotation=(math.pi / 2, 0.0, 0.0),
        font_path=poster_font_path,
    )
    add_empty(
        "Anchor_ESP32_Poster",
        (center_x, 2.70, center_z),
        "esp32-reference-poster",
        parent=parent,
        target_collection=anchors,
    )


def add_left_corner_decor(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    # The plant shelf touches the left inner wall while the picture sits beside
    # it, leaving the first monitor a clearly readable amount of breathing room.
    add_box_group(
        "Left_Decor_Frame_And_Shelf_Support",
        (
            ((-2.75, 2.89, 1.43), (0.62, 0.07, 0.76)),
            ((-3.30, 2.87, 1.13), (0.28, 0.08, 0.18)),
        ),
        mats["poster_black"],
        parent=parent,
        target_collection=furniture,
    )
    add_box(
        "Left_Decor_Picture_Mat",
        (-2.75, 2.846, 1.43),
        (0.52, 0.018, 0.66),
        mats["poster_matte"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_box(
        "Left_Decor_Picture_Print",
        (-2.75, 2.829, 1.43),
        (0.46, 0.012, 0.60),
        mats["poster_black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.003,
    )

    poster_lines = (
        ("<think>", {0: 1, 6: 1}),
        (">hack>", {5: 1}),
        (">secure>", {7: 1}),
        ("</repeat>", {0: 1, 1: 2, 8: 2}),
    )
    poster_body_parts: list[str] = []
    poster_color_indices: list[int] = []
    for line_index, (line, overrides) in enumerate(poster_lines):
        if line_index > 0:
            poster_body_parts.append("\n")
            poster_color_indices.append(0)
        poster_body_parts.append(line)
        poster_color_indices.extend(
            overrides.get(character_index, 0)
            for character_index in range(len(line))
        )
    poster_body = "".join(poster_body_parts)
    poster_font_path = (
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "consola.ttf"
    )
    add_colored_text_mesh(
        "Left_Decor_Poster_Main_Text",
        poster_body,
        tuple(poster_color_indices),
        (-2.945, 2.817, 1.512),
        0.090,
        (mats["poster_text"], mats["poster_teal"], mats["poster_red"]),
        parent=parent,
        target_collection=furniture,
        align_x="LEFT",
        align_y="CENTER",
        line_spacing=0.86,
        font_path=poster_font_path,
    )
    poster_tagline = "building a safer\ndigital future"
    add_colored_text_mesh(
        "Left_Decor_Poster_Tagline",
        poster_tagline,
        (0,) * len(poster_tagline),
        (-2.75, 2.816, 1.235),
        0.042,
        (mats["poster_text"],),
        parent=parent,
        target_collection=furniture,
        align_x="CENTER",
        align_y="CENTER",
        line_spacing=0.90,
        font_path=poster_font_path,
    )
    add_box(
        "Left_Decor_Plant_Shelf",
        (-3.30, 2.70, 1.24),
        (0.44, 0.44, 0.06),
        mats["wood"],
        parent=parent,
        target_collection=furniture,
        bevel=0.018,
    )
    add_cone(
        "Left_Decor_Plant_Pot",
        (-3.30, 2.64, 1.37),
        0.09,
        0.12,
        0.20,
        mats["paper"],
        parent=parent,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Left_Decor_Plant_Stem",
        (-3.30, 2.64, 1.50),
        0.018,
        0.16,
        mats["plant_stem"],
        parent=parent,
        target_collection=furniture,
        vertices=8,
    )
    add_ico_sphere(
        "Left_Decor_Plant_Foliage",
        (-3.30, 2.64, 1.72),
        (0.30, 0.24, 0.38),
        mats["plant"],
        parent=parent,
        target_collection=furniture,
    )
    add_cylinder(
        "Left_Decor_Lamp_Base",
        (-3.18, 2.04, 0.865),
        0.13,
        0.05,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=16,
    )
    decor_lamp_globe = add_ico_sphere(
        "Left_Decor_Lamp_Globe",
        (-3.18, 2.04, 1.015),
        (0.25, 0.25, 0.25),
        mats["lamp_glass"],
        parent=parent,
        target_collection=furniture,
    )
    # Keep the visible glass unchanged, but prevent its low-poly transmission
    # facets from projecting colored shadow rays into the Cycles lightmap.
    decor_lamp_globe.visible_shadow = False
    add_cylinder(
        "Left_Decor_Lamp_Inner_Stem",
        (-3.18, 2.04, 0.955),
        0.007,
        0.130,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices=8,
    )
    add_ico_sphere(
        "Left_Decor_Lamp_Bulb",
        (-3.18, 2.04, 1.035),
        (0.080, 0.080, 0.080),
        mats["lamp_bulb"],
        parent=parent,
        target_collection=furniture,
    )
    add_empty(
        "Anchor_Left_Decor_Image",
        (-2.75, 2.72, 1.43),
        "decor-image-placeholder",
        parent=parent,
        target_collection=anchors,
    )


def add_compact_laptop(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    """Add a low-cost open laptop between the left decor and first monitor."""
    laptop_root = bpy.data.objects.new("Laptop_Root", None)
    laptop_root.location = (-2.53, 2.12, 0.84)
    laptop_root.rotation_euler[2] = math.radians(8)
    laptop_root.parent = parent
    furniture.objects.link(laptop_root)

    add_box(
        "Laptop_Base",
        (0.0, 0.0, 0.0275),
        (0.66, 0.40, 0.055),
        mats["black"],
        parent=laptop_root,
        target_collection=furniture,
        bevel=0.020,
    )
    add_box(
        "Laptop_Deck",
        (0.0, -0.010, 0.059),
        (0.61, 0.35, 0.012),
        mats["metal"],
        parent=laptop_root,
        target_collection=furniture,
        bevel=0.010,
    )
    add_box(
        "Laptop_Keyboard_Bed",
        (0.0, 0.065, 0.068),
        (0.53, 0.19, 0.010),
        mats["black"],
        parent=laptop_root,
        target_collection=furniture,
        bevel=0.010,
    )

    laptop_keys: list[
        tuple[tuple[float, float, float], tuple[float, float, float]]
    ] = []
    laptop_key_rows = (
        (0.132, (1.0,) * 14),
        (0.098, (1.35,) + (1.0,) * 12),
        (0.064, (1.55,) + (1.0,) * 11 + (1.35,)),
        (0.030, (2.0,) + (1.0,) * 10 + (2.0,)),
        (-0.004, (1.25, 1.25, 1.25, 5.2, 1.25, 1.25, 1.25)),
    )
    key_gap = 0.006
    keyboard_width = 0.49
    for key_y, key_weights in laptop_key_rows:
        available_width = keyboard_width - key_gap * (len(key_weights) - 1)
        unit_width = available_width / sum(key_weights)
        cursor = -keyboard_width / 2
        for key_weight in key_weights:
            key_width = unit_width * key_weight
            laptop_keys.append(
                (
                    (cursor + key_width / 2, key_y, 0.078),
                    (key_width, 0.027, 0.014),
                )
            )
            cursor += key_width + key_gap
    add_box_group(
        "Laptop_Keyboard_Keys",
        laptop_keys,
        mats["tool"],
        parent=laptop_root,
        target_collection=furniture,
        bevel=0.003,
    )
    add_box(
        "Laptop_Trackpad",
        (0.0, -0.118, 0.068),
        (0.25, 0.085, 0.008),
        mats["black"],
        parent=laptop_root,
        target_collection=furniture,
        bevel=0.008,
    )
    add_x_axis_cylinder_group(
        "Laptop_Hinges",
        (
            ((-0.235, 0.184, 0.067), 0.018, 0.12),
            ((0.235, 0.184, 0.067), 0.018, 0.12),
        ),
        mats["black"],
        parent=laptop_root,
        target_collection=furniture,
        vertices_per_cylinder=10,
    )

    screen_tilt = math.radians(-10)
    screen_height = 0.37
    half_height = screen_height / 2
    hinge_y = 0.184
    hinge_z = 0.067
    screen_center = (
        0.0,
        hinge_y - math.sin(screen_tilt) * half_height,
        hinge_z + math.cos(screen_tilt) * half_height,
    )
    face_offset = 0.019
    screen_face_center = (
        0.0,
        screen_center[1] - math.cos(screen_tilt) * face_offset,
        screen_center[2] - math.sin(screen_tilt) * face_offset,
    )

    screen_frame = add_box(
        "Laptop_Screen_Bezel",
        screen_center,
        (0.63, 0.030, screen_height),
        mats["black"],
        parent=laptop_root,
        target_collection=furniture,
        bevel=0.018,
    )
    screen_frame.rotation_euler[0] = screen_tilt
    screen_panel = add_box(
        "Laptop_Screen",
        screen_face_center,
        (0.56, 0.010, 0.30),
        mats["screen_1"],
        parent=laptop_root,
        target_collection=furniture,
        bevel=0.010,
    )
    screen_panel.rotation_euler[0] = screen_tilt
def add_underdesk_utilities(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    # A compact server/router stack fills the bay immediately to the right of
    # the PC without reaching the underside of the desk.
    add_box(
        "Network_Mini_Server",
        (-2.08, 2.46, 0.22),
        (0.46, 0.48, 0.40),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Network_Mini_Server_Front",
        (-2.08, 2.211, 0.22),
        (0.38, 0.018, 0.30),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.015,
    )
    add_box(
        "Network_Mini_Server_Status",
        (-2.08, 2.197, 0.27),
        (0.22, 0.010, 0.035),
        mats["screen_2"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_box(
        "Network_Router",
        (-2.08, 2.46, 0.49),
        (0.42, 0.30, 0.10),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.025,
    )
    add_box(
        "Network_Router_Status",
        (-2.08, 2.303, 0.49),
        (0.20, 0.012, 0.020),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        bevel=0.005,
    )
    for index, x in enumerate((-2.22, -1.94), start=1):
        add_cylinder(
            f"Network_Router_Antenna_{index:02d}",
            (x, 2.55, 0.625),
            0.018,
            0.19,
            mats["black"],
            parent=parent,
            target_collection=furniture,
            vertices=10,
        )

    # The wastebasket occupies the otherwise unused right half of the main
    # desk bay and stays clear of both the chair and return-desk cabinet.
    add_cone(
        "Desk_Wastebasket",
        (1.45, 2.48, 0.29),
        0.17,
        0.22,
        0.56,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=14,
    )
    add_cylinder(
        "Desk_Wastebasket_Opening",
        (1.45, 2.48, 0.574),
        0.17,
        0.012,
        mats["black"],
        parent=parent,
        target_collection=furniture,
        vertices=14,
    )


def add_right_wall_base_led(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    """Add one uninterrupted baseboard LED along the full right wall."""
    add_box(
        "Room_Right_Base_LED_Housing",
        (3.511, ROOM_CENTER_Y, 0.028),
        (0.014, ROOM_DEPTH, 0.034),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.004,
    )
    add_box(
        "Room_Right_Base_LED_Diffuser",
        (3.502, ROOM_CENTER_Y, 0.028),
        (0.006, ROOM_DEPTH, 0.024),
        mats["shared_led"],
        parent=parent,
        target_collection=furniture,
        bevel=0.002,
    )


def add_chair(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    chair_root = bpy.data.objects.new("Chair_Root", None)
    chair_root.location = (0.10, 0.48, 0.0)
    chair_root.rotation_euler[2] = math.radians(-28)
    chair_root.parent = parent
    furniture.objects.link(chair_root)

    add_box(
        "Chair_Seat",
        (0.0, 0.0, 0.53),
        (0.62, 0.62, 0.12),
        mats["chair"],
        parent=chair_root,
        target_collection=furniture,
        bevel=0.08,
    )
    add_box(
        "Chair_Back",
        (0.0, -0.28, 1.00),
        (0.62, 0.10, 0.78),
        mats["chair"],
        parent=chair_root,
        target_collection=furniture,
        bevel=0.08,
        rotation=(math.radians(7), 0.0, 0.0),
    )
    add_cylinder(
        "Chair_Pedestal",
        (0.0, 0.0, 0.27),
        0.07,
        0.45,
        mats["metal"],
        parent=chair_root,
        target_collection=furniture,
        vertices=12,
    )
    for index, angle in enumerate((45, 135, 225, 315), start=1):
        radians = math.radians(angle)
        x = math.cos(radians) * 0.26
        y = math.sin(radians) * 0.26
        add_box(
            f"Chair_Leg_{index:02d}",
            (x, y, 0.08),
            (0.38, 0.065, 0.06),
            mats["metal"],
            parent=chair_root,
            target_collection=furniture,
            bevel=0.02,
            rotation=(0.0, 0.0, radians),
        )


def add_chess_on_desk(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    center_x, center_y = 2.945, -2.02
    add_box(
        "Chess_Board_Base",
        (center_x, center_y, 0.87),
        (0.98, 0.98, 0.05),
        mats["board"],
        parent=parent,
        target_collection=furniture,
        bevel=0.018,
    )

    square_step = 0.112
    board_size = square_step * 8
    for parity, material_key in ((0, "board_light"), (1, "board_dark")):
        vertices: list[tuple[float, float, float]] = []
        faces: list[tuple[int, int, int, int]] = []
        for rank in range(8):
            for file in range(8):
                if (rank + file) % 2 != parity:
                    continue
                x0 = center_x - board_size / 2 + file * square_step
                y0 = center_y - board_size / 2 + rank * square_step
                base = len(vertices)
                vertices.extend(
                    (
                        (x0, y0, 0.897),
                        (x0 + square_step, y0, 0.897),
                        (x0 + square_step, y0 + square_step, 0.897),
                        (x0, y0 + square_step, 0.897),
                    )
                )
                faces.append((base, base + 1, base + 2, base + 3))

        mesh = bpy.data.meshes.new(f"Chess_Board_{material_key}_Mesh")
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(f"Chess_Board_{material_key}", mesh)
        assign_material(obj, mats[material_key])
        obj.parent = parent
        furniture.objects.link(obj)

    anchor = add_empty(
        "Anchor_Chess",
        (center_x, center_y, 0.91),
        "chess",
        parent=parent,
        target_collection=anchors,
    )
    anchor["board_surface_z"] = 0.897
    anchor["square_step"] = square_step


def add_open_frame_3d_printer(
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    """Add a compact, enclosure-free FDM printer below the heat mat."""
    add_box_group(
        "Printer_Base_Frame",
        (
            ((2.84, -0.465, 0.055), (0.76, 0.050, 0.070)),
            ((2.84, 0.165, 0.055), (0.76, 0.050, 0.070)),
            ((2.485, -0.15, 0.055), (0.050, 0.58, 0.070)),
            ((3.195, -0.15, 0.055), (0.050, 0.58, 0.070)),
        ),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.008,
    )
    add_box_group(
        "Printer_Feet",
        tuple(
            ((x, y, 0.020), (0.080, 0.080, 0.040))
            for x in (2.485, 3.195)
            for y in (-0.465, 0.165)
        ),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )

    # Dual uprights, top bridge, and moving X gantry establish the open-frame
    # printer silhouette without adding any enclosure panels or glass.
    add_box_group(
        "Printer_Gantry_Frame",
        (
            ((2.530, 0.080, 0.355), (0.045, 0.055, 0.530)),
            ((3.150, 0.080, 0.355), (0.045, 0.055, 0.530)),
            ((2.840, 0.080, 0.635), (0.670, 0.055, 0.055)),
            ((2.840, 0.050, 0.425), (0.630, 0.045, 0.045)),
        ),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_z_axis_cylinder_group(
        "Printer_Z_Lead_Screws",
        (
            ((2.565, 0.045, 0.355), 0.008, 0.480),
            ((3.115, 0.045, 0.355), 0.008, 0.480),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=8,
    )
    add_box_group(
        "Printer_Z_Motors",
        (
            ((2.530, 0.080, 0.125), (0.090, 0.100, 0.080)),
            ((3.150, 0.080, 0.125), (0.090, 0.100, 0.080)),
        ),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.008,
    )

    add_box_group(
        "Printer_Bed_Guides",
        (
            ((2.700, -0.180, 0.118), (0.025, 0.560, 0.030)),
            ((2.980, -0.180, 0.118), (0.025, 0.560, 0.030)),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        bevel=0.004,
    )
    add_box(
        "Printer_Build_Plate",
        (2.840, -0.180, 0.155),
        (0.520, 0.480, 0.035),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        bevel=0.015,
    )
    add_box(
        "Printer_Build_Surface",
        (2.840, -0.180, 0.179),
        (0.480, 0.440, 0.012),
        mats["heatmat"],
        parent=parent,
        target_collection=furniture,
        bevel=0.010,
    )

    add_box(
        "Printer_Print_Head",
        (2.920, -0.015, 0.370),
        (0.120, 0.100, 0.130),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.015,
    )
    add_box(
        "Printer_Print_Head_Accent",
        (2.920, -0.071, 0.385),
        (0.065, 0.012, 0.050),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        bevel=0.006,
    )
    add_cone(
        "Printer_Nozzle",
        (2.920, -0.015, 0.275),
        0.006,
        0.012,
        0.060,
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices=8,
    )
    add_box(
        "Printer_Active_Print",
        (2.920, -0.015, 0.215),
        (0.100, 0.100, 0.060),
        mats["accent"],
        parent=parent,
        target_collection=furniture,
        bevel=0.008,
    )

    # Side-mounted spool and one broad filament line add context at very low
    # geometric cost while preserving the fully open construction.
    add_y_axis_cylinder_group(
        "Printer_Filament_Spool",
        (
            ((2.550, 0.075, 0.540), 0.075, 0.018),
            ((2.550, 0.135, 0.540), 0.075, 0.018),
            ((2.550, 0.105, 0.540), 0.035, 0.060),
        ),
        mats["storage"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=10,
    )
    add_y_axis_cylinder_group(
        "Printer_Spool_Hub",
        (
            ((2.550, 0.105, 0.540), 0.014, 0.085),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=8,
    )
    add_cable_bundle(
        "Printer_Filament_Path",
        (
            ((2.550, 0.065, 0.615), (2.640, 0.055, 0.635), (2.920, 0.020, 0.455)),
        ),
        0.004,
        mats["storage"],
        parent=parent,
        target_collection=furniture,
    )

    add_box(
        "Printer_Control_Module",
        (3.100, -0.440, 0.140),
        (0.200, 0.100, 0.110),
        mats["black"],
        parent=parent,
        target_collection=furniture,
        bevel=0.012,
    )
    add_box(
        "Printer_Control_Display",
        (3.065, -0.496, 0.145),
        (0.090, 0.012, 0.050),
        mats["screen_1"],
        parent=parent,
        target_collection=furniture,
        bevel=0.005,
    )
    add_y_axis_cylinder_group(
        "Printer_Control_Dial",
        (
            ((3.165, -0.498, 0.145), 0.014, 0.020),
        ),
        mats["tool"],
        parent=parent,
        target_collection=furniture,
        vertices_per_cylinder=8,
    )

    anchor = add_empty(
        "Anchor_3D_Printer",
        (2.840, -0.150, 0.340),
        "3d-printer",
        parent=parent,
        target_collection=anchors,
    )
    anchor["open_frame"] = True
    anchor["footprint"] = [0.76, 0.68]


def add_window_curtain_panel(
    name: str,
    outer_y: float,
    inner_y_profile: tuple[float, ...],
    *,
    parent: bpy.types.Object,
    furniture: bpy.types.Collection,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    """Create one gathered curtain as a low-poly, softly folded cloth surface."""
    z_levels = (1.02, 1.36, 1.66, 2.10, 2.68)
    if len(inner_y_profile) != len(z_levels):
        raise ValueError("Curtain inner profile must match the vertical control rows")

    horizontal_segments = 10
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for row, (z, inner_y) in enumerate(zip(z_levels, inner_y_profile)):
        for column in range(horizontal_segments + 1):
            t = column / horizontal_segments
            y = outer_y + (inner_y - outer_y) * t
            fold = math.sin(t * math.tau * 2.0) * 0.040
            bottom_wave = math.sin(t * math.tau * 1.5) * 0.015 if row == 0 else 0.0
            vertices.append((-3.315 + fold, y, z + bottom_wave))

    row_width = horizontal_segments + 1
    for row in range(len(z_levels) - 1):
        for column in range(horizontal_segments):
            lower = row * row_width + column
            upper = (row + 1) * row_width + column
            faces.append((lower, lower + 1, upper + 1, upper))

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    assign_material(obj, mat)
    solidify = obj.modifiers.new(name="Curtain cloth thickness", type="SOLIDIFY")
    solidify.thickness = 0.016
    solidify.offset = 0.0
    bevel = obj.modifiers.new(name="Soft curtain edges", type="BEVEL")
    bevel.width = 0.006
    bevel.segments = 1
    obj.parent = parent
    furniture.objects.link(obj)
    return obj


def add_left_wall_window(
    *,
    parent: bpy.types.Object,
    architecture: bpy.types.Collection,
    furniture: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    """Build a real left-wall opening with night sky, moon, and open curtains."""
    # Move the complete assembly toward the room front, clearly away from the
    # rear wall and the plant/decor cluster in the back-left corner.
    window_y_shift = -0.90
    opening_y_min = 0.55 + window_y_shift
    opening_y_max = 2.15 + window_y_shift
    opening_z_min = 1.02
    opening_z_max = 2.56
    opening_y = (opening_y_min + opening_y_max) / 2
    opening_z = (opening_z_min + opening_z_max) / 2

    add_x_wall_with_opening(
        "Room_Left_Wall",
        x_center=-ROOM_WIDTH / 2,
        thickness=0.16,
        y_min=ROOM_FRONT_Y,
        y_max=ROOM_BACK_Y,
        z_min=-WALL_FLOOR_BURY,
        z_max=ROOM_HEIGHT,
        opening_y_min=opening_y_min,
        opening_y_max=opening_y_max,
        opening_z_min=opening_z_min,
        opening_z_max=opening_z_max,
        mat=mats["wall"],
        parent=parent,
        target_collection=architecture,
    )
    # The sky and moon sit outside the wall, while the pane and frame remain
    # slightly inset from the room so the opening keeps convincing depth.
    add_box(
        "Left_Window_Night_Sky",
        (-3.705, opening_y, opening_z),
        (0.020, 1.47, 1.40),
        mats["night_sky"],
        parent=parent,
        target_collection=architecture,
        bevel=0.0,
    )
    add_box_group(
        "Left_Window_Stars",
        (
            ((-3.684, 0.78 + window_y_shift, 2.28), (0.012, 0.018, 0.018)),
            ((-3.684, 0.96 + window_y_shift, 1.96), (0.012, 0.012, 0.012)),
            ((-3.684, 1.12 + window_y_shift, 2.39), (0.012, 0.015, 0.015)),
            ((-3.684, 1.48 + window_y_shift, 2.43), (0.012, 0.012, 0.012)),
            ((-3.684, 1.78 + window_y_shift, 1.86), (0.012, 0.015, 0.015)),
            ((-3.684, 1.95 + window_y_shift, 2.36), (0.012, 0.020, 0.020)),
        ),
        mats["stars"],
        parent=parent,
        target_collection=architecture,
    )
    add_ico_sphere(
        "Left_Window_Moon",
        (-3.680, 1.83 + window_y_shift, 2.20),
        (0.32, 0.32, 0.32),
        mats["moon"],
        parent=parent,
        target_collection=architecture,
    )
    add_box(
        "Left_Window_Glass",
        (-3.495, opening_y, opening_z),
        (0.014, 1.48, 1.42),
        mats["window_glass"],
        parent=parent,
        target_collection=architecture,
        bevel=0.0,
    )
    add_box_group(
        "Left_Window_Frame",
        (
            ((-3.445, opening_y_min, opening_z), (0.115, 0.105, 1.70)),
            ((-3.445, opening_y_max, opening_z), (0.115, 0.105, 1.70)),
            ((-3.445, opening_y, opening_z_min), (0.115, 1.70, 0.105)),
            ((-3.445, opening_y, opening_z_max), (0.115, 1.70, 0.105)),
            ((-3.435, opening_y, opening_z), (0.095, 0.055, 1.50)),
            ((-3.435, opening_y, opening_z), (0.095, 1.50, 0.055)),
        ),
        mats["frame"],
        parent=parent,
        target_collection=architecture,
        bevel=0.010,
    )
    add_box(
        "Left_Window_Sill",
        (-3.365, opening_y, 0.985),
        (0.300, 1.82, 0.105),
        mats["wood"],
        parent=parent,
        target_collection=architecture,
        bevel=0.025,
    )

    add_cylinder(
        "Left_Window_Curtain_Rod",
        (-3.285, opening_y, 2.705),
        0.025,
        2.16,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
        vertices=14,
        rotation=(math.radians(90), 0.0, 0.0),
    )
    add_ico_sphere(
        "Left_Window_Curtain_Rod_Finial_Front",
        (-3.285, 0.25 + window_y_shift, 2.705),
        (0.075, 0.075, 0.075),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )
    add_ico_sphere(
        "Left_Window_Curtain_Rod_Finial_Rear",
        (-3.285, 2.45 + window_y_shift, 2.705),
        (0.075, 0.075, 0.075),
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )
    add_window_curtain_panel(
        "Left_Window_Curtain_Front",
        0.43 + window_y_shift,
        tuple(value + window_y_shift for value in (0.80, 0.74, 0.68, 0.80, 0.91)),
        parent=parent,
        furniture=furniture,
        mat=mats["curtain"],
    )
    add_window_curtain_panel(
        "Left_Window_Curtain_Rear",
        2.27 + window_y_shift,
        tuple(value + window_y_shift for value in (2.02, 2.08, 2.12, 2.06, 2.02)),
        parent=parent,
        furniture=furniture,
        mat=mats["curtain"],
    )
    curtain_ring_y_positions = (
        0.43 + window_y_shift,
        0.55 + window_y_shift,
        0.67 + window_y_shift,
        0.79 + window_y_shift,
        0.91 + window_y_shift,
        2.02 + window_y_shift,
        2.0825 + window_y_shift,
        2.145 + window_y_shift,
        2.2075 + window_y_shift,
        2.27 + window_y_shift,
    )
    add_y_axis_torus_group(
        "Left_Window_Curtain_Rings",
        tuple((-3.285, y, 2.705) for y in curtain_ring_y_positions),
        0.035,
        0.006,
        mats["metal"],
        parent=parent,
        target_collection=furniture,
    )


def add_room_geometry(
    *,
    root: bpy.types.Object,
    architecture: bpy.types.Collection,
    furniture: bpy.types.Collection,
    anchors: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> None:
    # Room shell stays open at the front; the left wall contains a real window.
    add_box(
        "Room_Floor",
        (0.0, ROOM_CENTER_Y, -0.08),
        (ROOM_WIDTH, ROOM_DEPTH, 0.16),
        mats["floor"],
        parent=root,
        target_collection=architecture,
        bevel=0.0,
    )
    add_box(
        "Room_Back_Wall",
        (0.0, ROOM_BACK_Y, (ROOM_HEIGHT - WALL_FLOOR_BURY) / 2),
        (ROOM_WIDTH, 0.16, ROOM_HEIGHT + WALL_FLOOR_BURY),
        mats["wall"],
        parent=root,
        target_collection=architecture,
        bevel=0.015,
    )
    add_left_wall_window(
        parent=root,
        architecture=architecture,
        furniture=furniture,
        mats=mats,
    )
    add_box(
        "Room_Right_Wall",
        (ROOM_WIDTH / 2, ROOM_CENTER_Y, (ROOM_HEIGHT - WALL_FLOOR_BURY) / 2),
        (0.16, ROOM_DEPTH, ROOM_HEIGHT + WALL_FLOOR_BURY),
        mats["wall"],
        parent=root,
        target_collection=architecture,
        bevel=0.015,
    )
    add_box(
        "Room_Ceiling",
        (0.0, ROOM_CENTER_Y, ROOM_HEIGHT - 0.06),
        (ROOM_WIDTH, ROOM_DEPTH, 0.12),
        mats["wall"],
        parent=root,
        target_collection=architecture,
        bevel=0.015,
    )

    # Low-profile ceiling fixture. The emissive diffuser is exported as geometry;
    # the inexpensive runtime light is recreated in src/render/lights.ts.
    add_box(
        "Ceiling_Lamp_Base",
        (0.0, 0.10, ROOM_HEIGHT - 0.155),
        (1.36, 0.48, 0.07),
        mats["black"],
        parent=root,
        target_collection=architecture,
        bevel=0.035,
    )
    add_box(
        "Ceiling_Lamp_Diffuser",
        (0.0, 0.10, ROOM_HEIGHT - 0.225),
        (1.12, 0.30, 0.075),
        mats["lamp_bulb"],
        parent=root,
        target_collection=architecture,
        bevel=0.035,
    )
    add_box(
        "Room_Rug",
        (-0.25, -0.10, 0.015),
        (4.35, 3.15, 0.03),
        mats["rug"],
        parent=root,
        target_collection=architecture,
        bevel=0.06,
    )

    # Main L-shaped desk. Both runs meet the inner wall faces without gaps.
    add_box(
        "Desk_Main_Top",
        (-0.2875, 2.345, 0.79),
        (6.465, 1.15, 0.10),
        mats["wood"],
        parent=root,
        target_collection=furniture,
        bevel=0.045,
    )
    add_box(
        "Desk_Return_Top",
        (2.945, 0.185, 0.79),
        (1.15, 5.47, 0.10),
        mats["wood"],
        parent=root,
        target_collection=furniture,
        bevel=0.045,
    )
    add_box(
        "Desk_Left_Cabinet",
        (-3.20, 2.42, 0.39),
        (0.56, 0.66, 0.76),
        mats["metal"],
        parent=root,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Embedded_Drawer_Cabinet",
        (2.945, 1.72, 0.39),
        (0.84, 0.86, 0.76),
        mats["black"],
        parent=root,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box_group(
        "Embedded_Drawer_Faces",
        tuple(
            ((2.512, 1.72, z), (0.022, 0.68, 0.17))
            for z in (0.18, 0.39, 0.60)
        ),
        mats["metal"],
        parent=root,
        target_collection=furniture,
    )
    add_box_group(
        "Embedded_Drawer_Handles",
        tuple(
            ((2.497, 1.72, z), (0.018, 0.24, 0.025))
            for z in (0.18, 0.39, 0.60)
        ),
        mats["tool"],
        parent=root,
        target_collection=furniture,
    )
    add_box(
        "Desk_Rear_Corner_Cabinet",
        (2.945, 2.58, 0.39),
        (0.84, 0.54, 0.76),
        mats["metal"],
        parent=root,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Desk_Main_Underbeam",
        (-0.32, 2.78, 0.69),
        (5.78, 0.10, 0.12),
        mats["metal"],
        parent=root,
        target_collection=furniture,
        bevel=0.018,
    )
    add_box(
        "Desk_Return_Underbeam",
        (3.36, 0.17, 0.69),
        (0.10, 4.89, 0.12),
        mats["metal"],
        parent=root,
        target_collection=furniture,
        bevel=0.018,
    )
    add_box(
        "Desk_Return_End_Panel",
        (2.945, -2.48, 0.39),
        (1.00, 0.10, 0.76),
        mats["metal"],
        parent=root,
        target_collection=furniture,
        bevel=0.022,
    )
    add_box(
        "PC_Tower",
        (-2.58, 2.42, 0.40),
        (0.42, 0.62, 0.72),
        mats["black"],
        parent=root,
        target_collection=furniture,
        bevel=0.055,
    )
    add_box(
        "PC_Status_Strip",
        (-2.58, 2.091, 0.40),
        (0.08, 0.018, 0.48),
        mats["accent"],
        parent=root,
        target_collection=furniture,
        bevel=0.01,
    )
    add_underdesk_utilities(parent=root, furniture=furniture, mats=mats)

    for index, x in enumerate((-1.60, -0.30, 1.00), start=1):
        add_monitor(
            index,
            x,
            parent=root,
            furniture=furniture,
            anchors=anchors,
            mats=mats,
        )
    add_monitor_cable_management(parent=root, furniture=furniture, mats=mats)
    add_right_wall_base_led(parent=root, furniture=furniture, mats=mats)

    # A scaled version of the rear corner lamp fits precisely between monitor
    # two and the third monitor from the left without touching either bezel.
    add_cylinder(
        "Monitor_Gap_Lamp_Base",
        (0.345, 2.68, 0.870),
        0.070,
        0.060,
        mats["black"],
        parent=root,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Monitor_Gap_Lamp_Stem",
        (0.345, 2.68, 1.065),
        0.014,
        0.350,
        mats["metal"],
        parent=root,
        target_collection=furniture,
        vertices=10,
    )
    add_cone(
        "Monitor_Gap_Lamp_Shade",
        (0.345, 2.68, 1.305),
        0.090,
        0.040,
        0.130,
        mats["black"],
        parent=root,
        target_collection=furniture,
        vertices=12,
    )
    add_cylinder(
        "Monitor_Gap_Lamp_Glow",
        (0.345, 2.68, 1.232),
        0.041,
        0.017,
        mats["lamp_bulb_glass"],
        parent=root,
        target_collection=furniture,
        vertices=12,
    )
    add_ico_sphere(
        "Monitor_Gap_Lamp_Bulb",
        (0.345, 2.68, 1.285),
        (0.050, 0.050, 0.050),
        mats["lamp_bulb_glass"],
        parent=root,
        target_collection=furniture,
    )
    add_ico_sphere(
        "Monitor_Gap_Lamp_Bulb_Core",
        (0.345, 2.68, 1.285),
        (0.022, 0.022, 0.022),
        mats["lamp_bulb"],
        parent=root,
        target_collection=furniture,
    )

    add_esp32_poster(
        parent=root,
        furniture=furniture,
        anchors=anchors,
        mats=mats,
    )

    add_box(
        "Desk_Input_Mat",
        (-0.10, 2.00, 0.844),
        (1.72, 0.42, 0.008),
        mats["black"],
        parent=root,
        target_collection=furniture,
        bevel=0.035,
    )
    add_box(
        "Keyboard_Base",
        (-0.30, 1.99, 0.8755),
        (0.98, 0.34, 0.055),
        mats["black"],
        parent=root,
        target_collection=furniture,
        bevel=0.035,
        rotation=(0.0, 0.0, math.radians(-2)),
    )
    add_box(
        "Keyboard_Keybed",
        (-0.30, 1.975, 0.9085),
        (0.86, 0.25, 0.012),
        mats["black"],
        parent=root,
        target_collection=furniture,
        bevel=0.010,
        rotation=(0.0, 0.0, math.radians(-2)),
    )

    keyboard_key_boxes: list[
        tuple[tuple[float, float, float], tuple[float, float, float]]
    ] = []
    keyboard_rows = (
        (0.088, (0.052,) * 14),
        (0.044, (0.074,) + (0.052,) * 12),
        (0.000, (0.086,) + (0.052,) * 11 + (0.074,)),
        (-0.044, (0.112,) + (0.052,) * 10 + (0.112,)),
        (-0.088, (0.068, 0.068, 0.068, 0.300, 0.068, 0.068, 0.068)),
    )
    key_gap = 0.008
    for key_y, widths in keyboard_rows:
        row_width = sum(widths) + key_gap * (len(widths) - 1)
        cursor = -row_width / 2
        for key_width in widths:
            keyboard_key_boxes.append(
                (
                    (cursor + key_width / 2, key_y, 0.925),
                    (key_width, 0.034, 0.018),
                )
            )
            cursor += key_width + key_gap
    add_box_group(
        "Keyboard_Keys",
        keyboard_key_boxes,
        mats["tool"],
        parent=root,
        target_collection=furniture,
        bevel=0.003,
        location=(-0.30, 1.99, 0.0),
        rotation=(0.0, 0.0, math.radians(-2)),
    )
    add_box(
        "Mouse",
        (0.47, 1.99, 0.883),
        (0.18, 0.28, 0.07),
        mats["black"],
        parent=root,
        target_collection=furniture,
        bevel=0.06,
    )
    add_box_group(
        "Mouse_Buttons",
        (
            ((0.426, 2.045, 0.922), (0.074, 0.125, 0.010)),
            ((0.514, 2.045, 0.922), (0.074, 0.125, 0.010)),
        ),
        mats["metal"],
        parent=root,
        target_collection=furniture,
        bevel=0.003,
    )
    add_cylinder(
        "Mouse_Scroll_Wheel",
        (0.47, 2.015, 0.938),
        0.014,
        0.030,
        mats["tool"],
        parent=root,
        target_collection=furniture,
        vertices=12,
        rotation=(0.0, math.radians(90), 0.0),
    )

    add_certificate_row(
        parent=root,
        furniture=furniture,
        anchors=anchors,
        mats=mats,
    )
    add_right_wall_workshop(parent=root, furniture=furniture, mats=mats)
    add_bench_instruments(parent=root, furniture=furniture, mats=mats)
    add_mat_prototype(
        parent=root,
        furniture=furniture,
        anchors=anchors,
        mats=mats,
    )
    add_open_frame_3d_printer(
        parent=root,
        furniture=furniture,
        anchors=anchors,
        mats=mats,
    )
    add_left_corner_decor(
        parent=root,
        furniture=furniture,
        anchors=anchors,
        mats=mats,
    )
    add_compact_laptop(parent=root, furniture=furniture, mats=mats)
    add_chair(parent=root, furniture=furniture, mats=mats)
    add_chess_on_desk(
        parent=root,
        furniture=furniture,
        anchors=anchors,
        mats=mats,
    )

def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_preview_setup(preview: bpy.types.Collection) -> bpy.types.Object:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(PREVIEW_PATH)

    # Near-black midnight-blue ambience forms the low-cost base of the 03:00
    # look. Local warm lamps and emissive displays carry the readable areas.
    scene.world.color = (0.003, 0.006, 0.014)
    if scene.world.use_nodes is False:
        scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.004, 0.009, 0.024, 1.0)
        background.inputs["Strength"].default_value = 0.080

    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.20

    camera_data = bpy.data.cameras.new("Preview_Camera")
    camera = bpy.data.objects.new("Preview_Camera", camera_data)
    camera.location = (1.00, -7.80, 2.25)
    camera_data.lens = 38
    camera_data.sensor_width = 36
    look_at(camera, (0.75, 1.08, 1.16))
    preview.objects.link(camera)
    scene.camera = camera

    def area_light(
        name: str,
        location: tuple[float, float, float],
        target: tuple[float, float, float],
        energy: float,
        color: tuple[float, float, float],
        size: float,
        size_y: float | None = None,
        casts_shadow: bool = True,
    ) -> None:
        data = bpy.data.lights.new(name, type="AREA")
        data.energy = energy
        data.color = color
        data.shape = "RECTANGLE"
        data.size = size
        data.size_y = size_y if size_y is not None else size * 0.55
        data.use_shadow = casts_shadow
        obj = bpy.data.objects.new(name, data)
        obj.location = location
        look_at(obj, target)
        preview.objects.link(obj)

    def point_light(
        name: str,
        location: tuple[float, float, float],
        energy: float,
        color: tuple[float, float, float],
        radius: float,
    ) -> None:
        data = bpy.data.lights.new(name, type="POINT")
        data.energy = energy
        data.color = color
        data.shadow_soft_size = radius
        obj = bpy.data.objects.new(name, data)
        obj.location = location
        preview.objects.link(obj)

    area_light(
        "Preview_Key",
        (-2.4, -1.0, 3.0),
        (-0.6, 1.7, 0.9),
        360,
        (0.28, 0.42, 0.72),
        3.4,
    )
    area_light(
        "Preview_Left_Window_Moonlight",
        (-3.30, 0.45, 2.18),
        (-1.15, -0.20, 0.62),
        55,
        (0.38, 0.52, 0.92),
        1.15,
        0.72,
        False,
    )
    area_light(
        "Preview_Wall_Wash",
        (0.0, 2.0, 3.0),
        (0.0, 2.9, 2.35),
        130,
        (0.10, 0.20, 0.44),
        3.8,
    )
    area_light(
        "Preview_Work_Lamp",
        (2.92, -0.15, 1.96),
        (2.90, -0.72, 0.88),
        88,
        (1.0, 0.42, 0.16),
        0.44,
    )
    area_light(
        "Preview_Right_Wall_Base_LED",
        (3.470, -0.150, 0.075),
        (2.840, -0.150, 0.340),
        55,
        (1.0, 0.57, 0.32),
        0.14,
        5.50,
    )
    area_light(
        "Preview_Printer_Underdesk_Fill",
        (2.100, -0.950, 0.580),
        (2.840, -0.150, 0.320),
        50,
        (1.0, 0.72, 0.52),
        0.80,
    )
    area_light(
        "Preview_Cable_Channel_Glow",
        (-0.695, 2.680, 0.570),
        (-0.695, 2.000, 0.120),
        22,
        (1.0, 0.57, 0.32),
        3.05,
        0.10,
        False,
    )
    area_light(
        "Preview_Decor_Lamp",
        (-3.18, 1.88, 1.02),
        (-2.88, 2.16, 0.80),
        48,
        (1.0, 0.34, 0.12),
        0.28,
        casts_shadow=False,
    )
    point_light(
        "Preview_Corner_Lamp",
        (2.84, 2.71, 1.285),
        22,
        (1.0, 0.30, 0.08),
        0.14,
    )
    point_light(
        "Preview_Monitor_Gap_Lamp",
        (0.345, 2.53, 1.215),
        12,
        (1.0, 0.28, 0.07),
        0.11,
    )
    return camera


def render_left_window_closeup(camera: bpy.types.Object) -> None:
    """Render the left-wall window nearly straight-on for material checks."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (-0.55, -1.25, 1.82)
    camera.data.lens = 55
    look_at(camera, (-3.48, 0.45, 1.82))
    scene.render.filepath = str(LEFT_WINDOW_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_prototype_closeup(camera: bpy.types.Object) -> None:
    """Render a second, room-side view focused on the work-mat prototype."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (1.45, -1.05, 1.55)
    camera.data.lens = 52
    look_at(camera, (2.92, -0.12, 1.03))
    scene.render.filepath = str(PROTOTYPE_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_keyboard_mouse_closeup(camera: bpy.types.Object) -> None:
    """Render a tight room-side view of the keyboard, mouse, and desk mat."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (1.25, 0.25, 1.65)
    camera.data.lens = 52
    look_at(camera, (-0.08, 1.99, 0.89))
    scene.render.filepath = str(KEYBOARD_MOUSE_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_monitor_cables_closeup(camera: bpy.types.Object) -> None:
    """Render all monitor leads, their convergence, and the PC connection."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (-2.60, -1.80, 1.25)
    camera.data.lens = 38
    look_at(camera, (-0.50, 2.55, 0.82))
    scene.render.filepath = str(MONITOR_CABLE_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_right_shelf_closeup(camera: bpy.types.Object) -> None:
    """Render the tall right-wall shelf with some workshop context."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (0.10, -0.15, 1.85)
    camera.data.lens = 34
    look_at(camera, (3.20, 0.85, 1.80))
    scene.render.filepath = str(RIGHT_SHELF_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_floating_shelf_front(camera: bpy.types.Object) -> None:
    """Render the short supported wall shelf straight-on from the room."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_type = camera.data.type
    original_ortho_scale = camera.data.ortho_scale
    original_resolution_x = scene.render.resolution_x
    original_resolution_y = scene.render.resolution_y
    original_filepath = scene.render.filepath

    camera.location = (1.80, -1.65, 1.93)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 1.65
    look_at(camera, (3.32, -1.65, 1.93))
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.filepath = str(FLOATING_SHELF_FRONT_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.type = original_type
    camera.data.ortho_scale = original_ortho_scale
    scene.render.resolution_x = original_resolution_x
    scene.render.resolution_y = original_resolution_y
    scene.render.filepath = original_filepath


def render_right_workspace_wide(camera: bpy.types.Object) -> None:
    """Render the workspace spanning the right monitor and tall shelf."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (0.55, -4.60, 1.85)
    camera.data.lens = 58
    look_at(camera, (2.15, 1.00, 1.65))
    scene.render.filepath = str(RIGHT_WORKSPACE_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_bench_instruments_closeup(camera: bpy.types.Object) -> None:
    """Render the oscilloscope, multimeter, and soldering station together."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (2.25, 0.45, 1.45)
    camera.data.lens = 42
    look_at(camera, (2.29, 2.27, 1.04))
    scene.render.filepath = str(BENCH_INSTRUMENTS_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_tool_wall_closeup(camera: bpy.types.Object) -> None:
    """Render the detailed pegboard and the upper parts-bin row."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (1.20, -1.15, 1.72)
    camera.data.lens = 45
    look_at(camera, (3.40, -0.15, 1.68))
    scene.render.filepath = str(TOOL_WALL_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_3d_printer_closeup(camera: bpy.types.Object) -> None:
    """Render the open-frame printer through the side of the return desk."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (1.45, -1.65, 0.70)
    camera.data.lens = 50
    look_at(camera, (2.84, -0.15, 0.33))
    scene.render.filepath = str(PRINTER_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_right_desk_arm_wide(camera: bpy.types.Object) -> None:
    """Render the complete right return desk from chessboard to workbench."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (0.45, -4.30, 1.65)
    camera.data.lens = 48
    look_at(camera, (2.95, -0.30, 1.05))
    scene.render.filepath = str(RIGHT_DESK_ARM_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_book_titles_closeup(camera: bpy.types.Object) -> None:
    """Render both labeled book rows straight-on for legibility checks."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (1.00, 1.42, 1.975)
    camera.data.lens = 45
    look_at(camera, (3.10, 1.42, 1.975))
    scene.render.filepath = str(BOOK_TITLES_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_laptop_closeup(camera: bpy.types.Object) -> None:
    """Render the open laptop with decor and first-monitor context."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (-1.82, 0.48, 1.40)
    camera.data.lens = 56
    look_at(camera, (-2.53, 2.18, 1.02))
    scene.render.filepath = str(LAPTOP_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_left_decor_lamp_closeup(camera: bpy.types.Object) -> None:
    """Render the glass globe lamp with its internal warm bulb."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    original_filepath = scene.render.filepath

    camera.location = (-2.42, 0.76, 1.31)
    camera.data.lens = 68
    look_at(camera, (-3.18, 2.04, 1.015))
    scene.render.filepath = str(LEFT_DECOR_LAMP_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens
    scene.render.filepath = original_filepath


def render_left_poster_closeup(camera: bpy.types.Object) -> None:
    """Render the left poster straight-on without laptop occlusion."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_type = camera.data.type
    original_ortho_scale = camera.data.ortho_scale
    original_resolution_x = scene.render.resolution_x
    original_resolution_y = scene.render.resolution_y
    original_filepath = scene.render.filepath

    camera.location = (-2.75, 2.50, 1.43)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 0.86
    look_at(camera, (-2.75, 2.846, 1.43))
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.filepath = str(LEFT_POSTER_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.type = original_type
    camera.data.ortho_scale = original_ortho_scale
    scene.render.resolution_x = original_resolution_x
    scene.render.resolution_y = original_resolution_y
    scene.render.filepath = original_filepath


def render_esp32_poster_closeup(camera: bpy.types.Object) -> None:
    """Render the ESP32 pinout poster straight-on in portrait format."""
    scene = bpy.context.scene
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_type = camera.data.type
    original_ortho_scale = camera.data.ortho_scale
    original_resolution_x = scene.render.resolution_x
    original_resolution_y = scene.render.resolution_y
    original_filepath = scene.render.filepath

    camera.location = (2.33, 2.50, 1.48)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 0.94
    look_at(camera, (2.33, 2.846, 1.48))
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.filepath = str(ESP32_POSTER_PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)

    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.type = original_type
    camera.data.ortho_scale = original_ortho_scale
    scene.render.resolution_x = original_resolution_x
    scene.render.resolution_y = original_resolution_y
    scene.render.filepath = original_filepath


def evaluated_triangle_count(objects: Iterable[bpy.types.Object]) -> int:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return total


def world_bounds(objects: Iterable[bpy.types.Object]) -> dict[str, list[float]]:
    points: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        return {"min": [0, 0, 0], "max": [0, 0, 0]}
    minimum = [min(point[index] for point in points) for index in range(3)]
    maximum = [max(point[index] for point in points) for index in range(3)]
    return {
        "min": [round(value, 4) for value in minimum],
        "max": [round(value, 4) for value in maximum],
    }


LIGHTMAP_OBJECT_NAMES = {
    "Room_Floor",
    "Room_Back_Wall",
    "Room_Left_Wall",
    "Room_Right_Wall",
    "Room_Ceiling",
    "Room_Rug",
    "Desk_Main_Top",
    "Desk_Return_Top",
    "Desk_Left_Cabinet",
    "Embedded_Drawer_Cabinet",
    "Desk_Rear_Corner_Cabinet",
    "Desk_Return_End_Panel",
}


def bake_room_lightmap() -> dict[str, int]:
    """Bake Blender's static room mood into a shared, denoised web lightmap."""
    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.name in LIGHTMAP_OBJECT_NAMES
    ]
    if not meshes:
        raise RuntimeError("No room surfaces selected for lightmap baking")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
        if len(obj.data.uv_layers) == 0:
            obj.data.uv_layers.new(name="UVMap")
        light_uv = obj.data.uv_layers.get("LightmapUV")
        if light_uv is None:
            light_uv = obj.data.uv_layers.new(name="LightmapUV")
        obj.data.uv_layers.active = light_uv

    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.lightmap_pack(
        PREF_CONTEXT="ALL_FACES",
        PREF_PACK_IN_ONE=True,
        PREF_NEW_UVLAYER=False,
        PREF_BOX_DIV=12,
        PREF_MARGIN_DIV=0.50,
    )
    bpy.ops.object.mode_set(mode="OBJECT")

    # Keep the original surface UV as TEXCOORD_0; LightmapUV is exported as
    # TEXCOORD_1 and selected explicitly in Three.js.
    for obj in meshes:
        obj.data.uv_layers.active_index = 0
        obj.data.uv_layers[0].active_render = True

    lightmap_size = 2048
    image = bpy.data.images.new(
        "Room_Redesign_Lightmap",
        width=lightmap_size,
        height=lightmap_size,
        alpha=False,
        float_buffer=False,
    )
    image.generated_color = (0.0, 0.0, 0.0, 1.0)
    image.colorspace_settings.name = "Non-Color"

    target_nodes: list[tuple[bpy.types.Material, bpy.types.Node]] = []
    used_materials = {
        slot.material
        for obj in meshes
        for slot in obj.material_slots
        if slot.material is not None and slot.material.use_nodes
    }
    for mat in used_materials:
        if mat.node_tree is None:
            continue
        for node in mat.node_tree.nodes:
            node.select = False
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.name = "Room_Lightmap_Bake_Target"
        node.label = "Temporary room lightmap bake target"
        node.image = image
        node.select = True
        mat.node_tree.nodes.active = node
        target_nodes.append((mat, node))

    scene = bpy.context.scene
    previous_engine = scene.render.engine
    previous_resolution = (
        scene.render.resolution_x,
        scene.render.resolution_y,
        scene.render.resolution_percentage,
    )
    previous_filepath = scene.render.filepath
    previous_group = scene.compositing_node_group

    import cycles  # noqa: F401 - registers the Cycles render engine

    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 3
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 1
    scene.render.bake.use_pass_color = False
    scene.render.bake.use_pass_direct = True
    scene.render.bake.use_pass_indirect = True

    bpy.ops.object.bake(
        type="DIFFUSE",
        pass_filter={"DIRECT", "INDIRECT"},
        use_clear=True,
        margin=8,
        uv_layer="LightmapUV",
    )

    # The compositor's OpenImageDenoise pass refines the cleaner 32-sample
    # bake into stable, soft gradients suitable for a static WebGL lightmap.
    group = bpy.data.node_groups.new("Room_Lightmap_Denoise", "CompositorNodeTree")
    scene.compositing_node_group = group
    image_node = group.nodes.new("CompositorNodeImage")
    image_node.image = image
    denoise = group.nodes.new("CompositorNodeDenoise")
    denoise.inputs["HDR"].default_value = True
    denoise.inputs["Prefilter"].default_value = "None"
    denoise.inputs["Quality"].default_value = "High"
    group.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    output = group.nodes.new("NodeGroupOutput")
    group.links.new(image_node.outputs["Image"], denoise.inputs["Image"])
    group.links.new(denoise.outputs["Image"], output.inputs["Image"])

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = lightmap_size
    scene.render.resolution_y = lightmap_size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(LIGHTMAP_PATH)
    bpy.ops.render.render(write_still=True)

    scene.compositing_node_group = previous_group
    bpy.data.node_groups.remove(group)
    scene.render.engine = previous_engine
    scene.render.resolution_x = previous_resolution[0]
    scene.render.resolution_y = previous_resolution[1]
    scene.render.resolution_percentage = previous_resolution[2]
    scene.render.filepath = previous_filepath

    for mat, node in target_nodes:
        if mat.node_tree is not None:
            mat.node_tree.nodes.remove(node)
    bpy.data.images.remove(image)

    return {
        "objects": len(meshes),
        "size": lightmap_size,
        "bytes": LIGHTMAP_PATH.stat().st_size,
    }

def export_glb(export_objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = export_objects[0]

    requested = {
        "filepath": str(GLB_PATH),
        "export_format": "GLB",
        "use_selection": True,
        "export_apply": True,
        "export_yup": True,
        "export_cameras": False,
        "export_lights": False,
        "export_extras": True,
        "export_draco_mesh_compression_enable": True,
        "export_draco_mesh_compression_level": 6,
    }
    supported = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    kwargs = {key: value for key, value in requested.items() if key in supported}
    bpy.ops.export_scene.gltf(**kwargs)


def main() -> None:
    clean_scene()
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    architecture = collection("ARCHITECTURE")
    furniture = collection("FURNITURE")
    anchors = collection("INTERACTION_ANCHORS")
    preview = collection("PREVIEW_ONLY")

    root = bpy.data.objects.new("Room_Redesign_Root", None)
    root["design"] = "warm-modern-engineering-studio"
    root["stage"] = "graybox-v77"
    root["performance_goal"] = "webgl-low-cost"
    architecture.objects.link(root)

    blank_screen = material(
        "MAT_Screen_Blank",
        (0.0015, 0.0020, 0.0030, 1),
        roughness=0.18,
        metallic=0.06,
    )

    mats = {
        "wall": material("MAT_Warm_Plaster", (0.20, 0.155, 0.115, 1), roughness=0.88),
        "floor": material("MAT_Dark_Wood_Floor", (0.095, 0.060, 0.035, 1), roughness=0.72),
        "wood": material("MAT_Walnut", (0.015, 0.0045, 0.0012, 1), roughness=0.62),
        "metal": material("MAT_Charcoal_Metal", (0.028, 0.034, 0.041, 1), roughness=0.38, metallic=0.62),
        "black": material("MAT_Soft_Black", (0.012, 0.016, 0.021, 1), roughness=0.46, metallic=0.20),
        "cable": material("MAT_Cable_Rubber", (0.060, 0.075, 0.095, 1), roughness=0.72),
        "frame": material("MAT_Frame_Black", (0.020, 0.021, 0.023, 1), roughness=0.40, metallic=0.35),
        "paper": material("MAT_Certificate_Paper", (0.78, 0.72, 0.62, 1), roughness=0.88),
        "certificate_text": material(
            "MAT_Certificate_Text",
            (0.065, 0.075, 0.072, 1),
            roughness=0.72,
        ),
        "shared_led": material(
            "MAT_Shared_Warm_LED",
            (0.38, 0.13, 0.035, 1),
            roughness=0.26,
            emission_color=(1.0, 0.57, 0.32, 1),
            emission_strength=1.6,
        ),
        "navigation_text": material(
            "MAT_Navigation_Text",
            (1.0, 1.0, 1.0, 1),
            roughness=0.44,
            emission_color=(1.0, 1.0, 1.0, 1),
            emission_strength=0.50,
        ),
        "rug": material("MAT_Rug", (0.055, 0.060, 0.070, 1), roughness=0.96),
        "chair": material("MAT_Chair_Fabric", (0.030, 0.035, 0.042, 1), roughness=0.92),
        "curtain": material(
            "MAT_Curtain_Fabric_Warm_Beige",
            (0.50, 0.38, 0.255, 1),
            roughness=0.94,
        ),
        "window_glass": material(
            "MAT_Window_Glass_Night",
            (0.025, 0.055, 0.10, 0.18),
            roughness=0.16,
            metallic=0.05,
            alpha=0.18,
            transmission_weight=0.12,
            ior=1.45,
            thin_walled=True,
        ),
        "night_sky": material(
            "MAT_Window_Night_Sky",
            (0.0015, 0.0035, 0.010, 1),
            roughness=1.0,
            emission_color=(0.003, 0.008, 0.025, 1),
            emission_strength=0.45,
        ),
        "moon": material(
            "MAT_Window_Moon_Glow",
            (0.55, 0.65, 0.80, 1),
            roughness=0.70,
            emission_color=(0.70, 0.82, 1.0, 1),
            emission_strength=2.8,
        ),
        "stars": material(
            "MAT_Window_Stars",
            (0.48, 0.62, 0.82, 1),
            roughness=0.72,
            emission_color=(0.55, 0.72, 1.0, 1),
            emission_strength=1.6,
        ),
        "plant": material("MAT_Plant_Green", (0.025, 0.105, 0.045, 1), roughness=0.90),
        "plant_stem": material("MAT_Plant_Stem", (0.105, 0.038, 0.012, 1), roughness=0.84),
        "mcu": material("MAT_Microcontroller_Case", (0.035, 0.115, 0.075, 1), roughness=0.48),
        "tool": material("MAT_Tool_Steel", (0.12, 0.13, 0.14, 1), roughness=0.32, metallic=0.75),
        "storage": material("MAT_Storage_Blue", (0.055, 0.09, 0.13, 1), roughness=0.60),
        "heatmat": material("MAT_Heat_Mat", (0.012, 0.075, 0.095, 1), roughness=0.82),
        "placeholder": material("MAT_Placeholder_Image", (0.07, 0.045, 0.028, 1), roughness=0.74),
        "poster_black": material(
            "MAT_Poster_Black",
            (0.0004, 0.0003, 0.0002, 1),
            roughness=0.92,
        ),
        "poster_matte": material(
            "MAT_Poster_Matte",
            (0.075, 0.055, 0.040, 1),
            roughness=0.90,
        ),
        "poster_text": material(
            "MAT_Poster_Text",
            (0.32, 0.27, 0.22, 1),
            roughness=0.72,
            emission_color=(0.32, 0.27, 0.22, 1),
            emission_strength=0.08,
        ),
        "poster_teal": material(
            "MAT_Poster_Teal",
            (0.035, 0.16, 0.18, 1),
            roughness=0.64,
            emission_color=(0.035, 0.16, 0.18, 1),
            emission_strength=0.08,
        ),
        "poster_red": material(
            "MAT_Poster_Red",
            (0.30, 0.025, 0.018, 1),
            roughness=0.64,
            emission_color=(0.30, 0.025, 0.018, 1),
            emission_strength=0.08,
        ),
        "board": material("MAT_Chess_Placeholder", (0.25, 0.16, 0.075, 1), roughness=0.50),
        "board_light": material("MAT_Chess_Light", (0.52, 0.34, 0.17, 1), roughness=0.58),
        "board_dark": material("MAT_Chess_Dark", (0.055, 0.025, 0.012, 1), roughness=0.62),
        "accent": material(
            "MAT_Warm_Accent",
            (0.34, 0.07, 0.018, 1),
            roughness=0.42,
            emission_color=(0.52, 0.055, 0.010, 1),
            emission_strength=0.35,
        ),
        "lamp_glass": material(
            "MAT_Lamp_Glass_Warm",
            (0.22, 0.055, 0.012, 0.32),
            roughness=0.10,
            alpha=0.32,
            transmission_weight=0.62,
            ior=1.45,
            thin_walled=True,
        ),
        "lamp_bulb_glass": material(
            "MAT_Lamp_Bulb_Glass_Warm",
            (0.38, 0.060, 0.008, 0.48),
            roughness=0.11,
            emission_color=(0.72, 0.075, 0.006, 1),
            emission_strength=0.40,
            alpha=0.48,
            transmission_weight=0.48,
            ior=1.45,
            thin_walled=True,
        ),
        "lamp_bulb": material(
            "MAT_Lamp_Bulb_Warm",
            (0.60, 0.12, 0.018, 1),
            roughness=0.20,
            emission_color=(1.00, 0.16, 0.015, 1),
            emission_strength=1.80,
        ),
        "screen_1": blank_screen,
        "screen_2": blank_screen,
        "screen_3": blank_screen,
    }

    add_room_geometry(
        root=root,
        architecture=architecture,
        furniture=furniture,
        anchors=anchors,
        mats=mats,
    )
    add_preview_setup(preview)

    bpy.context.scene["room_redesign_version"] = "graybox-v77"
    bpy.context.scene["room_width_m"] = ROOM_WIDTH
    bpy.context.scene["room_depth_m"] = ROOM_DEPTH
    bpy.context.scene["room_height_m"] = ROOM_HEIGHT
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.length_unit = "METERS"

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.context.scene.render.filepath = str(PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)
    render_left_window_closeup(bpy.context.scene.camera)
    render_prototype_closeup(bpy.context.scene.camera)
    render_keyboard_mouse_closeup(bpy.context.scene.camera)
    render_monitor_cables_closeup(bpy.context.scene.camera)
    render_right_shelf_closeup(bpy.context.scene.camera)
    render_floating_shelf_front(bpy.context.scene.camera)
    render_right_workspace_wide(bpy.context.scene.camera)
    render_bench_instruments_closeup(bpy.context.scene.camera)
    render_tool_wall_closeup(bpy.context.scene.camera)
    render_3d_printer_closeup(bpy.context.scene.camera)
    render_right_desk_arm_wide(bpy.context.scene.camera)
    render_book_titles_closeup(bpy.context.scene.camera)
    render_laptop_closeup(bpy.context.scene.camera)
    render_left_decor_lamp_closeup(bpy.context.scene.camera)
    render_left_poster_closeup(bpy.context.scene.camera)
    render_esp32_poster_closeup(bpy.context.scene.camera)

    lightmap_stats = bake_room_lightmap()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    export_objects = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type in {"MESH", "EMPTY"} and obj.name not in {"Preview_Camera"}
    ]
    export_glb(export_objects)

    material_names = sorted(
        {
            slot.material.name
            for obj in export_objects
            if obj.type == "MESH"
            for slot in obj.material_slots
            if slot.material is not None
        }
    )
    stats = {
        "stage": "graybox-v77",
        "blend": str(BLEND_PATH),
        "glb": str(GLB_PATH),
        "preview": str(PREVIEW_PATH),
        "lightmap": str(LIGHTMAP_PATH),
        "lightmap_bytes": lightmap_stats["bytes"],
        "lightmap_objects": lightmap_stats["objects"],
        "lightmap_size": lightmap_stats["size"],
        "prototype_preview": str(PROTOTYPE_PREVIEW_PATH),
        "keyboard_mouse_preview": str(KEYBOARD_MOUSE_PREVIEW_PATH),
        "monitor_cable_preview": str(MONITOR_CABLE_PREVIEW_PATH),
        "right_shelf_preview": str(RIGHT_SHELF_PREVIEW_PATH),
        "floating_shelf_front_preview": str(FLOATING_SHELF_FRONT_PREVIEW_PATH),
        "right_workspace_preview": str(RIGHT_WORKSPACE_PREVIEW_PATH),
        "bench_instruments_preview": str(BENCH_INSTRUMENTS_PREVIEW_PATH),
        "tool_wall_preview": str(TOOL_WALL_PREVIEW_PATH),
        "printer_preview": str(PRINTER_PREVIEW_PATH),
        "right_desk_arm_preview": str(RIGHT_DESK_ARM_PREVIEW_PATH),
        "book_titles_preview": str(BOOK_TITLES_PREVIEW_PATH),
        "laptop_preview": str(LAPTOP_PREVIEW_PATH),
        "left_decor_lamp_preview": str(LEFT_DECOR_LAMP_PREVIEW_PATH),
        "left_poster_preview": str(LEFT_POSTER_PREVIEW_PATH),
        "esp32_poster_preview": str(ESP32_POSTER_PREVIEW_PATH),
        "left_window_preview": str(LEFT_WINDOW_PREVIEW_PATH),
        "objects": len(export_objects),
        "mesh_objects": sum(obj.type == "MESH" for obj in export_objects),
        "anchors": sum(
            1 for obj in export_objects if obj.type == "EMPTY" and bool(obj.get("hotspot"))
        ),
        "triangles_with_modifiers": evaluated_triangle_count(export_objects),
        "materials": len(material_names),
        "material_names": material_names,
        "bounds_m": world_bounds(export_objects),
        "glb_bytes": GLB_PATH.stat().st_size,
        "blend_bytes": BLEND_PATH.stat().st_size,
    }
    STATS_PATH.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
