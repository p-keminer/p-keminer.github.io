import math
import os

import bpy


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
        "piece_body": create_material("PieceBody", (0.82, 0.76, 0.68, 1.0), 0.08, 0.54),
        "piece_trim": create_material("PieceTrim", (0.72, 0.58, 0.32, 1.0), 0.18, 0.38),
        "piece_accent": create_material("PieceAccent", (0.94, 0.87, 0.52, 1.0), 0.24, 0.3),
        "board_frame": create_material("BoardFrame", (0.19, 0.12, 0.08, 1.0), 0.12, 0.72),
        "board_plinth": create_material("BoardPlinth", (0.11, 0.09, 0.08, 1.0), 0.05, 0.84),
        "board_light": create_material("BoardLight", (0.85, 0.74, 0.58, 1.0), 0.04, 0.58),
        "board_dark": create_material("BoardDark", (0.34, 0.23, 0.15, 1.0), 0.06, 0.66),
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
    vertices: int = 48,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    finalize_mesh(obj)
    return obj


def add_cone(
    name: str,
    radius1: float,
    depth: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 36,
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
    add_bevel(obj, min(size) * 0.08)
    finalize_mesh(obj)
    return obj


def add_sphere(
    name: str,
    radius: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    segments: int = 32,
    rings: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
    finalize_mesh(obj)
    return obj


def add_torus(
    name: str,
    major_radius: float,
    minor_radius: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        major_segments=32,
        minor_segments=18,
    )
    obj = bpy.context.active_object
    obj.name = name
    assign_material(obj, material)
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


def export_selected(root: bpy.types.Object, file_name: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)

    for child in root.children_recursive:
        child.select_set(True)

    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUTPUT_DIR, file_name),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


def build_board(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("board")

    frame = add_cube(
        "board_frame",
        (9.2, 9.2, 0.42),
        (0.0, 0.0, -0.21),
        materials["board_frame"],
    )
    plinth = add_cylinder(
        "board_plinth",
        7.15,
        0.32,
        (0.0, 0.0, -0.64),
        materials["board_plinth"],
        vertices=64,
    )
    add_bevel(frame, 0.06, 3)
    add_bevel(plinth, 0.04, 2)

    squares: list[bpy.types.Object] = []

    for rank in range(8):
        for file_index in range(8):
            is_light_square = (file_index + rank) % 2 == 0
            square = add_cube(
                f"square_{chr(97 + file_index)}{rank + 1}",
                (0.96, 0.96, 0.08),
                (-3.5 + file_index, 3.5 - rank, 0.04),
                materials["board_light"] if is_light_square else materials["board_dark"],
            )
            squares.append(square)

    parent_to_root(root, [frame, plinth, *squares])
    export_selected(root, "board.glb")


def build_pawn(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("pawn")
    parts = [
        add_cylinder("base", 0.24, 0.08, (0.0, 0.0, 0.04), materials["piece_body"]),
        add_torus("collar", 0.16, 0.028, (0.0, 0.0, 0.14), materials["piece_trim"]),
        add_cylinder("stem", 0.11, 0.28, (0.0, 0.0, 0.32), materials["piece_body"], vertices=32),
        add_sphere("head", 0.12, (0.0, 0.0, 0.56), materials["piece_accent"], segments=24, rings=14),
    ]
    parent_to_root(root, parts)
    export_selected(root, "pawn.glb")


def build_rook(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("rook")
    parts = [
        add_cylinder("base", 0.25, 0.09, (0.0, 0.0, 0.045), materials["piece_body"]),
        add_torus("collar", 0.17, 0.03, (0.0, 0.0, 0.14), materials["piece_trim"]),
        add_cylinder("tower", 0.15, 0.42, (0.0, 0.0, 0.42), materials["piece_body"]),
        add_cube("cap", (0.38, 0.38, 0.09), (0.0, 0.0, 0.7), materials["piece_trim"]),
    ]

    for offset_x in (-0.11, 0.11):
        for offset_y in (-0.11, 0.11):
            parts.append(
                add_cube(
                    f"crenel_{offset_x}_{offset_y}",
                    (0.08, 0.08, 0.09),
                    (offset_x, offset_y, 0.8),
                    materials["piece_body"],
                )
            )

    parent_to_root(root, parts)
    export_selected(root, "rook.glb")


def build_knight(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("knight")
    parts = [
        add_cylinder("base", 0.25, 0.09, (0.0, 0.0, 0.045), materials["piece_body"]),
        add_torus("collar", 0.17, 0.03, (0.0, 0.0, 0.14), materials["piece_trim"]),
        add_cylinder("lower_body", 0.12, 0.22, (0.0, 0.0, 0.29), materials["piece_body"], vertices=28),
        add_cube(
            "neck",
            (0.2, 0.12, 0.42),
            (0.04, 0.02, 0.56),
            materials["piece_body"],
            rotation=(0.0, math.radians(12), math.radians(-12)),
        ),
        add_cone(
            "snout",
            0.11,
            0.25,
            (0.11, 0.05, 0.8),
            materials["piece_trim"],
            rotation=(0.0, math.radians(80), math.radians(-18)),
        ),
        add_cube(
            "ear",
            (0.08, 0.04, 0.16),
            (0.03, -0.06, 0.86),
            materials["piece_accent"],
            rotation=(0.0, 0.0, math.radians(12)),
        ),
    ]
    parent_to_root(root, parts)
    export_selected(root, "knight.glb")


def build_bishop(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("bishop")
    parts = [
        add_cylinder("base", 0.25, 0.09, (0.0, 0.0, 0.045), materials["piece_body"]),
        add_torus("collar", 0.17, 0.03, (0.0, 0.0, 0.14), materials["piece_trim"]),
        add_cylinder("body", 0.11, 0.44, (0.0, 0.0, 0.42), materials["piece_body"], vertices=28),
        add_cone("hood", 0.16, 0.24, (0.0, 0.0, 0.76), materials["piece_trim"], vertices=28),
        add_sphere("gem", 0.055, (0.0, 0.0, 0.92), materials["piece_accent"], segments=20, rings=12),
    ]

    slit = add_cube(
        "slit",
        (0.05, 0.18, 0.18),
        (0.0, 0.0, 0.72),
        materials["piece_trim"],
        rotation=(0.0, 0.0, math.radians(28)),
    )
    parts.append(slit)

    parent_to_root(root, parts)
    export_selected(root, "bishop.glb")


def build_queen(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("queen")
    parts = [
        add_cylinder("base", 0.25, 0.09, (0.0, 0.0, 0.045), materials["piece_body"]),
        add_torus("collar", 0.17, 0.03, (0.0, 0.0, 0.14), materials["piece_trim"]),
        add_cylinder("body", 0.12, 0.52, (0.0, 0.0, 0.46), materials["piece_body"], vertices=32),
        add_cone("crown", 0.19, 0.24, (0.0, 0.0, 0.84), materials["piece_trim"], vertices=32),
        add_torus("crown_ring", 0.14, 0.025, (0.0, 0.0, 0.92), materials["piece_trim"]),
    ]

    for index in range(5):
        angle = (math.tau / 5.0) * index
        parts.append(
            add_sphere(
                f"point_{index}",
                0.04,
                (math.cos(angle) * 0.13, math.sin(angle) * 0.13, 0.98),
                materials["piece_accent"],
                segments=16,
                rings=10,
            )
        )

    parent_to_root(root, parts)
    export_selected(root, "queen.glb")


def build_king(materials: dict[str, bpy.types.Material]) -> None:
    reset_scene()
    root = create_root("king")
    parts = [
        add_cylinder("base", 0.25, 0.09, (0.0, 0.0, 0.045), materials["piece_body"]),
        add_torus("collar", 0.17, 0.03, (0.0, 0.0, 0.14), materials["piece_trim"]),
        add_cylinder("body", 0.12, 0.56, (0.0, 0.0, 0.48), materials["piece_body"], vertices=32),
        add_cube("crown_block", (0.12, 0.12, 0.18), (0.0, 0.0, 0.86), materials["piece_trim"]),
        add_cube("cross_vertical", (0.05, 0.05, 0.24), (0.0, 0.0, 1.02), materials["piece_accent"]),
        add_cube("cross_horizontal", (0.18, 0.05, 0.05), (0.0, 0.0, 1.02), materials["piece_accent"]),
    ]
    parent_to_root(root, parts)
    export_selected(root, "king.glb")


os.makedirs(OUTPUT_DIR, exist_ok=True)
materials = ensure_materials()

build_board(materials)
build_pawn(materials)
build_rook(materials)
build_knight(materials)
build_bishop(materials)
build_queen(materials)
build_king(materials)
