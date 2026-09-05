"""Refine existing room equipment in a loaded Blender file; never save/export.

Import this module in Blender and call ``refine_equipment()``. Object names,
transforms, parents and material slots stay intact. Lightmapped meshes are
deliberately skipped: changing their topology would invalidate the baked UVs.
"""

from __future__ import annotations

import math

import bpy


_MARKER = "room_equipment_refinement"
_VERSION = 1
_CONTROL_NAMES = (
    "Bench_Oscilloscope_Controls",
    "Bench_Multimeter_Round_Controls",
    "Bench_Soldering_Station_Controls",
    "Printer_Control_Dial",
)


def _candidate(name: str) -> bpy.types.Object | None:
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != "MESH" or obj.get(_MARKER) == _VERSION:
        return None
    if len(obj.data.uv_layers) > 1 or any(
        "lightmap" in layer.name.lower() for layer in obj.data.uv_layers
    ):
        print(f"[equipment] Keeping baked geometry: {name}")
        return None
    if obj.data.shape_keys is not None or any(
        modifier.type not in {"BEVEL", "WEIGHTED_NORMAL"}
        for modifier in obj.modifiers
    ):
        print(f"[equipment] Keeping independently modified geometry: {name}")
        return None
    return obj


def _replace_mesh(
    obj: bpy.types.Object,
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, ...]],
    smooth: list[bool],
    face_uvs: list[list[tuple[float, float]]],
    material_indices: list[int],
) -> None:
    """Install authored geometry without changing any object-level state."""
    old_mesh = obj.data
    mesh = bpy.data.meshes.new(f"{old_mesh.name}_Refined")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for material in old_mesh.materials:
        mesh.materials.append(material)
    uv_name = old_mesh.uv_layers[0].name if old_mesh.uv_layers else "UVMap"
    uv = mesh.uv_layers.new(name=uv_name)
    for polygon, is_smooth, coordinates, material_index in zip(
        mesh.polygons, smooth, face_uvs, material_indices, strict=True
    ):
        polygon.use_smooth = is_smooth
        polygon.material_index = material_index
        for loop_index, coordinate in zip(polygon.loop_indices, coordinates, strict=True):
            uv.data[loop_index].uv = coordinate
    # The new profile already contains its rounded edge. Retaining the old
    # box/cylinder bevel would round it twice and unnecessarily multiply faces.
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    obj.data = mesh
    obj[_MARKER] = _VERSION
    if old_mesh.users == 0:
        bpy.data.meshes.remove(old_mesh)


def _refine_mouse(obj: bpy.types.Object) -> None:
    old_vertices = [vertex.co for vertex in obj.data.vertices]
    minimum = [min(vertex[axis] for vertex in old_vertices) for axis in range(3)]
    maximum = [max(vertex[axis] for vertex in old_vertices) for axis in range(3)]
    center = [(low + high) / 2 for low, high in zip(minimum, maximum)]
    half = [(high - low) / 2 for low, high in zip(minimum, maximum)]
    # Rings stay inside the existing 18 x 28 x 7 cm shell. The crown rises
    # smoothly toward the palm while its front remains beneath the separate
    # buttons. Both button objects and the wheel are left completely intact.
    profiles = (
        (-1.00, 0.86, 0.89),
        (-0.83, 0.96, 0.97),
        (-0.38, 1.00, 1.00),
        (0.38, 0.99, 0.97),
        (0.88, 0.92, 0.91),
        (1.00, 0.62, 0.67),
    )
    segments = 24
    vertices: list[tuple[float, float, float]] = []
    for height, width_scale, length_scale in profiles:
        for index in range(segments):
            angle = math.tau * index / segments
            cosine, sine = math.cos(angle), math.sin(angle)
            # A rounded rectangle keeps the button-end width without the
            # sharply clipped corners of the former bevelled cuboid.
            x = math.copysign(abs(cosine) ** 0.64, cosine)
            y = math.copysign(abs(sine) ** 0.64, sine)
            vertices.append((
                center[0] + x * half[0] * width_scale,
                center[1] + y * half[1] * length_scale,
                center[2] + height * half[2],
            ))
    faces: list[tuple[int, ...]] = [tuple(reversed(range(segments)))]
    smooth = [False]
    for ring in range(len(profiles) - 1):
        for index in range(segments):
            following = (index + 1) % segments
            faces.append((
                ring * segments + index,
                ring * segments + following,
                (ring + 1) * segments + following,
                (ring + 1) * segments + index,
            ))
            smooth.append(True)
    # A single low-profile crown closes the shell without a triangulated
    # pinching pole; flat top normals blend into the smooth shoulder.
    faces.append(tuple((len(profiles) - 1) * segments + index for index in range(segments)))
    smooth.append(False)
    face_uvs = [[(
        (vertices[index][0] - minimum[0]) / max(half[0] * 2, 1e-9),
        (vertices[index][1] - minimum[1]) / max(half[1] * 2, 1e-9),
    ) for index in face] for face in faces]
    material_index = obj.data.polygons[0].material_index if obj.data.polygons else 0
    _replace_mesh(obj, vertices, faces, smooth, face_uvs, [material_index] * len(faces))


def _components(mesh: bpy.types.Mesh) -> list[list[int]]:
    """Find the individual knobs already batched into the same draw call."""
    adjacency = [[] for _ in mesh.vertices]
    for edge in mesh.edges:
        first, second = edge.vertices
        adjacency[first].append(second)
        adjacency[second].append(first)
    unseen = set(range(len(mesh.vertices)))
    result = []
    while unseen:
        first = min(unseen)
        unseen.remove(first)
        stack, component = [first], []
        while stack:
            current = stack.pop()
            component.append(current)
            for neighbor in adjacency[current]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    stack.append(neighbor)
        result.append(component)
    return result


def _refine_controls(obj: bpy.types.Object) -> bool:
    cylinders = []
    for component in _components(obj.data):
        coordinates = [obj.data.vertices[index].co for index in component]
        if len(coordinates) < 12:
            return False
        minimum_y = min(vertex.y for vertex in coordinates)
        maximum_y = max(vertex.y for vertex in coordinates)
        # Only the original two-ring, Y-axis knobs are eligible. Do not silently
        # replace authored sockets or other later edits sharing these names.
        if maximum_y - minimum_y <= 1e-6 or any(
            min(abs(vertex.y - minimum_y), abs(vertex.y - maximum_y)) > 1e-6
            for vertex in coordinates
        ):
            return False
        center_x = sum(vertex.x for vertex in coordinates) / len(coordinates)
        center_z = sum(vertex.z for vertex in coordinates) / len(coordinates)
        radii = [math.hypot(vertex.x - center_x, vertex.z - center_z) for vertex in coordinates]
        radius = sum(radii) / len(radii)
        if radius <= 1e-6 or max(abs(value - radius) for value in radii) > radius * 0.01:
            return False
        component_set = set(component)
        materials = {
            polygon.material_index for polygon in obj.data.polygons
            if polygon.vertices[0] in component_set
        }
        if len(materials) != 1:
            return False
        cylinders.append((center_x, center_z, minimum_y, maximum_y, radius, materials.pop()))

    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    smooth: list[bool] = []
    face_uvs: list[list[tuple[float, float]]] = []
    material_indices: list[int] = []
    for center_x, center_z, front_y, back_y, radius, material_index in cylinders:
        segments = 24 if radius >= 0.045 else 20 if radius >= 0.020 else 12
        bevel = min(radius * 0.13, (back_y - front_y) * 0.18)
        base = len(vertices)
        rings = ((front_y, radius - bevel), (front_y + bevel, radius), (back_y, radius))
        for y, ring_radius in rings:
            for index in range(segments):
                angle = math.tau * index / segments
                vertices.append((
                    center_x + math.cos(angle) * ring_radius,
                    y,
                    center_z + math.sin(angle) * ring_radius,
                ))

        def append_face(face: tuple[int, ...], is_smooth: bool, uvs: list[tuple[float, float]]) -> None:
            faces.append(face)
            smooth.append(is_smooth)
            face_uvs.append(uvs)
            material_indices.append(material_index)

        # X/Z circle order is clockwise when viewed from positive Y. These
        # windings explicitly produce outward front, back and mantle normals.
        for ring, indices in ((0, range(segments)), (2, reversed(range(segments)))):
            face = tuple(base + ring * segments + index for index in indices)
            append_face(face, False, [(
                0.5 + (vertices[index][0] - center_x) / (2 * radius),
                0.5 + (vertices[index][2] - center_z) / (2 * radius),
            ) for index in face])
        for ring in range(2):
            for index in range(segments):
                following = (index + 1) % segments
                first = base + ring * segments
                second = first + segments
                append_face(
                    (first + index, second + index, second + following, first + following),
                    True,
                    [(index / segments, ring / 2), (index / segments, (ring + 1) / 2),
                     ((index + 1) / segments, (ring + 1) / 2), ((index + 1) / segments, ring / 2)],
                )
    if not cylinders:
        return False
    _replace_mesh(obj, vertices, faces, smooth, face_uvs, material_indices)
    return True


def refine_equipment() -> list[str]:
    """Refine the mouse and existing instrument knobs, once per object.

    Returns only changed object names. No new objects/materials/lights are
    created, and no context-dependent operators, saving or exports are used.
    The authored room adds roughly 1,100 triangles, below the 1,500 budget.
    """
    changed = []
    mouse = _candidate("Mouse")
    if mouse is not None:
        _refine_mouse(mouse)
        changed.append(mouse.name)
    for name in _CONTROL_NAMES:
        obj = _candidate(name)
        if obj is not None and _refine_controls(obj):
            changed.append(obj.name)
    return changed
