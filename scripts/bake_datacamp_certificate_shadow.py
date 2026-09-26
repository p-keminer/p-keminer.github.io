"""Bake only paper05 against the approved room and current DATA/CAMP geometry.

Internal companion to update_room_certificate_shadow.mjs. No scene or public
asset is saved; the only receiver is the existing paper at its original UVs.
"""
from pathlib import Path
import json
import sys

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from repair_room_foliage_lighting import bake
from bake_room_lighting import _denoise_linear


def main():
    directory = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
    spec = json.loads((directory / 'bake-input.json').read_text())
    bpy.ops.wm.open_mainfile(filepath=spec['blend'])
    obj = bpy.data.objects['Certificate_Topic_Labels']
    old = obj.data
    material = old.materials[0]
    # Use the actual approved browser lettering, transformed back from glTF's
    # Y-up local basis. All four labels retain their exact geometry/placement.
    mesh = bpy.data.meshes.new('Certificate_Topic_Labels_Bake_Only')
    mesh.from_pydata([(x, -z, y) for x, y, z in spec['positions']], [], spec['faces'])
    mesh.materials.append(material)
    obj.data = mesh
    receiver = bpy.data.objects['Certificate_05_Paper']
    assert receiver.get('room_lightmapped') == 1
    assert receiver.data.uv_layers[1].name == 'LightmapUV'
    # 128 samples avoid visible local noise. The original bake uses the same
    # diffuse-only response, full visible scene, bounce counts and CUDA device.
    rgb, device = bake([receiver], 128, directory)
    (directory / 'foliage-linear.npy').rename(directory / 'paper05-linear.npy')
    image = bpy.data.images.new('Paper05_Denoise_Temporary', width=2048, height=2048,
                                float_buffer=True, alpha=False)
    image.colorspace_settings.name = 'Non-Color'
    pixels = np.ones((2048, 2048, 4), dtype=np.float32)
    pixels[:, :, :3] = rgb
    image.pixels.foreach_set(pixels.ravel())
    denoised = _denoise_linear(image, directory / 'paper05-denoised.exr', 2048)
    np.save(directory / 'paper05-denoised.npy', denoised)
    (directory / 'bake-report.json').write_text(json.dumps({
        'receiver': receiver.name, 'samples': 128, 'device': device,
        'denoiser': 'OIDN High (same as authored atlas)',
        'fullSceneOccludersAndLights': True, 'sourceSaved': False,
        'labelTriangles': len(spec['faces']),
    }, indent=2))
    bpy.data.images.remove(image)


if __name__ == '__main__':
    main()
