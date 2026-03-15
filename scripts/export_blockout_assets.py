import math
import os

import bpy
from mathutils import Matrix, Vector


OUTPUT_DIR = os.environ.get("CHESS_ASSET_OUTPUT")

if not OUTPUT_DIR:
    raise RuntimeError("CHESS_ASSET_OUTPUT environment variable is required.")


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    for datablocks in (
        bpy.data.meshes,
        bpy.data.images,
        bpy.data.curves,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def create_material(name: str, base_color: tuple[float, float, float, float], metallic: float, roughness: float):
    material = bpy.data.materials.new(name=name)
    material.use_nodes = True
    principled = material.node_tree.nodes["Principled BSDF"]
    principled.inputs["Base Color"].default_value = base_color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    return material


def ensure_materials() -> dict[str, bpy.types.Material]:
    return {
        "body": create_material("BlockoutBody", (0.92, 0.96, 1.0, 1.0), 0.08, 0.28),
        "trim": create_material("BlockoutTrim", (0.11, 0.24, 0.5, 1.0), 0.14, 0.34),
        "accent": create_material("BlockoutAccent", (0.28, 0.92, 0.96, 1.0), 0.04, 0.18),
    }


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def finalize_mesh(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()
    obj.select_set(False)


def add_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    modifier = obj.modifiers.new(name="Bevel", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def add_cylinder(
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 36,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    add_bevel(obj, min(radius, depth) * 0.22)
    finalize_mesh(obj)
    return obj


def add_cube(
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2.0, size[1] / 2.0, size[2] / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    add_bevel(obj, min(size) * 0.12)
    finalize_mesh(obj)
    return obj


def add_ellipsoid(
    name: str,
    radius: float,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    segments: int = 24,
    ring_count: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=ring_count, radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    add_bevel(obj, radius * 0.12)
    finalize_mesh(obj)
    return obj


def add_link_box(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    thickness: tuple[float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    start_vec = Vector(start)
    end_vec = Vector(end)
    direction = end_vec - start_vec
    length = direction.length
    if length <= 1e-6:
        raise ValueError(f"Link {name} has zero length")

    bpy.ops.mesh.primitive_cube_add(location=(start_vec + end_vec) * 0.5)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())
    obj.scale = (thickness[0] / 2.0, thickness[1] / 2.0, length / 2.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    add_bevel(obj, min(thickness[0], thickness[1]) * 0.28)
    finalize_mesh(obj)
    return obj


def add_link_frustum(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius_start: float,
    radius_end: float,
    material: bpy.types.Material,
    vertices: int = 6,
) -> bpy.types.Object:
    start_vec = Vector(start)
    end_vec = Vector(end)
    direction = end_vec - start_vec
    length = direction.length
    if length <= 1e-6:
        raise ValueError(f"Frustum {name} has zero length")

    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=length,
        location=(start_vec + end_vec) * 0.5,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())
    assign_material(obj, material)
    add_bevel(obj, min(radius_start, radius_end, length) * 0.26)
    finalize_mesh(obj)
    return obj


def add_spindle_link(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius_start: float,
    radius_mid: float,
    radius_end: float,
    material: bpy.types.Material,
    vertices: int = 6,
) -> list[bpy.types.Object]:
    start_vec = Vector(start)
    end_vec = Vector(end)
    mid_vec = start_vec.lerp(end_vec, 0.5)
    return [
        add_link_frustum(
            f"{name}_a",
            tuple(start_vec),
            tuple(mid_vec),
            radius_start,
            radius_mid,
            material,
            vertices=vertices,
        ),
        add_link_frustum(
            f"{name}_b",
            tuple(mid_vec),
            tuple(end_vec),
            radius_mid,
            radius_end,
            material,
            vertices=vertices,
        ),
    ]


def add_leg_shield(
    name: str,
    knee: tuple[float, float, float],
    tip: tuple[float, float, float],
    side_sign: float,
    material: bpy.types.Material,
) -> bpy.types.Object:
    knee_vec = Vector(knee)
    tip_vec = Vector(tip)
    direction = tip_vec - knee_vec
    length = direction.length
    if length <= 1e-6:
        raise ValueError(f"Shield {name} has zero length")

    overlap_start = knee_vec - direction.normalized() * 0.03
    shield_direction = tip_vec - overlap_start
    shield_center = overlap_start.lerp(tip_vec, 0.5) + Vector((0.024 * side_sign, 0.0, 0.0))

    bpy.ops.mesh.primitive_cone_add(
        vertices=28,
        radius1=0.038,
        radius2=0.006,
        depth=shield_direction.length,
        location=shield_center,
    )
    obj = bpy.context.active_object
    obj.name = name
    vertical_axis = shield_direction.normalized()
    side_axis = Vector((side_sign, 0.0, 0.0))
    thickness_axis = vertical_axis.cross(side_axis)
    if thickness_axis.length <= 1e-6:
        thickness_axis = Vector((0.0, 1.0, 0.0))
    thickness_axis.normalize()
    side_axis = thickness_axis.cross(vertical_axis).normalized()
    rotation = Matrix((side_axis, thickness_axis, vertical_axis)).transposed().to_4x4()
    roll_angle = -math.pi / 2 if tip_vec.y < knee_vec.y else math.pi / 2
    roll = Matrix.Rotation(roll_angle, 4, "Z")
    scale = Matrix.Diagonal((1.18, 0.34, 1.0, 1.0))
    obj.matrix_world = Matrix.Translation(shield_center) @ rotation @ roll @ scale
    assign_material(obj, material)
    add_bevel(obj, 0.006)
    finalize_mesh(obj)
    return obj


def add_cone(
    name: str,
    radius1: float,
    depth: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 4,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    add_bevel(obj, min(radius1, depth) * 0.14)
    finalize_mesh(obj)
    return obj


def parent_to_root(root: bpy.types.Object, objects: list[bpy.types.Object]) -> None:
    for obj in objects:
        obj.parent = root


def create_root(name: str) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    return root


def export_selected(root: bpy.types.Object, relative_file_name: str) -> None:
    output_path = os.path.join(OUTPUT_DIR, relative_file_name)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)

    for child in root.children_recursive:
        child.select_set(True)

    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


def build_pawn_blockout(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("pawn_blockout")

    # Front-facing elements project toward Blender -Y so the imported GLB reads as +Z front in runtime space.
    parts = [
        add_cube("pawn_shell_top", (0.42, 0.24, 0.12), (0.0, -0.005, 0.47), materials["body"]),
        add_cube("pawn_shell_mid_band", (0.54, 0.28, 0.11), (0.0, 0.005, 0.38), materials["trim"]),
        add_cube("pawn_shell_lower", (0.48, 0.24, 0.10), (0.0, 0.04, 0.29), materials["body"]),
        add_cube("pawn_shell_chin", (0.34, 0.17, 0.045), (0.0, 0.08, 0.225), materials["body"]),
        add_cube("pawn_side_shell_left", (0.08, 0.11, 0.09), (-0.23, 0.0, 0.335), materials["body"]),
        add_cube("pawn_side_shell_right", (0.08, 0.11, 0.09), (0.23, 0.0, 0.335), materials["body"]),
        add_cube("pawn_sensor_slot_left", (0.09, 0.028, 0.034), (-0.15, -0.145, 0.395), materials["trim"]),
        add_cube("pawn_sensor_slot_right", (0.09, 0.028, 0.034), (0.15, -0.145, 0.395), materials["trim"]),
        add_cylinder(
            "pawn_sensor_ring",
            0.12,
            0.07,
            (0.0, -0.145, 0.39),
            materials["trim"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=32,
        ),
        add_cylinder(
            "pawn_sensor_core",
            0.086,
            0.028,
            (0.0, -0.19, 0.39),
            materials["accent"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=32,
        ),
        add_cylinder(
            "pawn_status_light_left",
            0.018,
            0.022,
            (-0.205, -0.105, 0.335),
            materials["accent"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=18,
        ),
        add_cylinder(
            "pawn_status_light_right",
            0.018,
            0.022,
            (0.205, -0.105, 0.335),
            materials["accent"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=18,
        ),
        add_cube("pawn_top_antenna_left", (0.012, 0.012, 0.12), (-0.075, 0.01, 0.595), materials["body"]),
        add_cube("pawn_top_antenna_right", (0.012, 0.012, 0.17), (0.075, -0.005, 0.615), materials["trim"]),
        add_cube("pawn_undercarriage", (0.30, 0.13, 0.035), (0.0, 0.075, 0.205), materials["trim"]),
        add_cube("pawn_joint_rail_left", (0.14, 0.25, 0.045), (-0.15, 0.075, 0.22), materials["trim"]),
        add_cube("pawn_joint_rail_right", (0.14, 0.25, 0.045), (0.15, 0.075, 0.22), materials["trim"]),
    ]

    leg_specs = [
        ("front_left", "outer", -1.0, (-0.22, -0.03, 0.223), (-0.22, -0.03, 0.165), (-0.315, -0.095, 0.168), (-0.31, -0.205, 0.028)),
        ("center_left", "center", -1.0, (-0.22, 0.075, 0.223), (-0.22, 0.075, 0.155), (-0.355, 0.075, 0.14), (-0.33, 0.075, 0.018)),
        ("rear_left", "outer", -1.0, (-0.22, 0.18, 0.223), (-0.22, 0.18, 0.165), (-0.315, 0.245, 0.168), (-0.31, 0.355, 0.028)),
        ("front_right", "outer", 1.0, (0.22, -0.03, 0.223), (0.22, -0.03, 0.165), (0.315, -0.095, 0.168), (0.31, -0.205, 0.028)),
        ("center_right", "center", 1.0, (0.22, 0.075, 0.223), (0.22, 0.075, 0.155), (0.355, 0.075, 0.14), (0.33, 0.075, 0.018)),
        ("rear_right", "outer", 1.0, (0.22, 0.18, 0.223), (0.22, 0.18, 0.165), (0.315, 0.245, 0.168), (0.31, 0.355, 0.028)),
    ]

    for name, leg_kind, side_sign, joint, hip, knee, foot in leg_specs:
        parts.append(
            add_cylinder(
                f"pawn_joint_{name}",
                0.026 if leg_kind == "outer" else 0.028,
                0.04,
                joint,
                materials["trim"],
                rotation=(0.0, math.radians(90), 0.0),
                vertices=24,
            )
        )
        parts.extend(
            add_spindle_link(
                f"pawn_leg_{name}_drop",
                joint,
                hip,
                0.013 if leg_kind == "outer" else 0.015,
                0.020 if leg_kind == "outer" else 0.024,
                0.015 if leg_kind == "outer" else 0.018,
                materials["trim"],
                vertices=6,
            )
        )
        parts.append(
            add_cylinder(
                f"pawn_leg_{name}_hip",
                0.022 if leg_kind == "outer" else 0.026,
                0.034,
                hip,
                materials["trim"],
                rotation=(0.0, math.radians(90), 0.0),
                vertices=22,
            )
        )
        parts.extend(
            add_spindle_link(
                f"pawn_leg_{name}_upper",
                hip,
                knee,
                0.015 if leg_kind == "outer" else 0.018,
                0.024 if leg_kind == "outer" else 0.030,
                0.017 if leg_kind == "outer" else 0.020,
                materials["trim"],
                vertices=6,
            )
        )
        parts.append(
            add_cylinder(
                f"pawn_leg_{name}_knee",
                0.022 if leg_kind == "outer" else 0.026,
                0.034,
                knee,
                materials["trim"],
                rotation=(0.0, math.radians(90), 0.0),
                vertices=22,
            )
        )
        if leg_kind == "outer":
            parts.append(
                add_ellipsoid(
                    f"pawn_leg_{name}_shield_cap",
                    0.04,
                    (knee[0] + 0.028 * side_sign, knee[1], knee[2] - 0.012),
                    (0.95, 0.95, 0.72),
                    materials["body"],
                )
            )
            parts.append(add_leg_shield(f"pawn_leg_{name}_shield", knee, foot, side_sign, materials["body"]))
        else:
            parts.extend(
                add_spindle_link(
                    f"pawn_leg_{name}_lower",
                    knee,
                    foot,
                    0.017,
                    0.024,
                    0.012,
                    materials["body"],
                    vertices=6,
                )
            )
            parts.append(add_cube(f"pawn_leg_{name}_foot", (0.045, 0.055, 0.018), foot, materials["trim"]))

    parent_to_root(root, parts)
    export_selected(root, os.path.join("blockout", "pawn.glb"))


os.makedirs(OUTPUT_DIR, exist_ok=True)
materials = ensure_materials()

build_pawn_blockout(materials)
