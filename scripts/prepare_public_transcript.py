"""Build an image-only public transcript from reviewed, permanently masked pixels.

This layout and checksum are approved only for the transcript dated 2026-09-26.
The private source must stay outside the repository. Never commit original renders.
Requires Python, Pillow, pdfplumber, pypdf and Poppler's pdftoppm.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile

import pdfplumber
from PIL import Image, ImageChops, ImageDraw
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    DecodedStreamObject, DictionaryObject, NameObject, NumberObject,
)


SOURCE_SHA256 = "db74bacbb6f7e4ed8fa03548530ee4d8bcbf8ff5f8ac04a80f4015731534a5c2"
DPI = 300
# PDF points, top-left origin. Full fixed-width fields, not glyph-shaped masks.
MASKS = [
    ("street-address", (68, 219, 210, 232.5)),
    ("postal-address", (68, 233, 210, 246.5)),
    ("birth-date", (455, 368, 525, 382)),
    ("birth-place", (194, 384.5, 290, 398)),
    ("student-number", (455, 384.5, 525, 398)),
]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def pixel_box(rect, size, page_size):
    sx, sy = size[0] / page_size[0], size[1] / page_size[1]
    return (math.floor(rect[0] * sx), math.floor(rect[1] * sy),
            math.ceil(rect[2] * sx), math.ceil(rect[3] * sy))


def sensitive_tokens(source):
    """Private values exist only in memory for verification, never in reports."""
    with pdfplumber.open(source) as pdf:
        require(len(pdf.pages) == 2, "Unexpected page count; review the source manually.")
        sizes = [(p.width, p.height) for p in pdf.pages]
        page = pdf.pages[0]
        require("Notenspiegel" in page.extract_text(), "Unexpected document layout.")
        words = page.extract_words()
        tokens = []
        for label, rect in MASKS:
            inside = [w for w in words if rect[0] <= w['x0'] and w['x1'] <= rect[2]
                      and rect[1] <= w['top'] and w['bottom'] <= rect[3]]
            require(inside, f"Empty private field: {label}; manual review required.")
            overlapping = [w for w in words if w['x0'] < rect[2] and w['x1'] > rect[0]
                           and w['top'] < rect[3] and w['bottom'] > rect[1]]
            require(len(inside) == len(overlapping), f"Partial word at {label} mask boundary.")
            # Avoid testing single house numbers independently of legitimate grades.
            tokens.extend(w['text'] for w in inside if len(w['text']) >= 4)
        return sizes, tokens


def write_image_pdf(images, page_sizes, target):
    """Never read, clone or append any object from the original PDF."""
    writer = PdfWriter()
    writer.metadata = None
    for image, (width, height) in zip(images, page_sizes):
        page = writer.add_blank_page(width=width, height=height)
        stream = DecodedStreamObject()
        stream.set_data(image.tobytes())
        stream.update({
            NameObject('/Type'): NameObject('/XObject'),
            NameObject('/Subtype'): NameObject('/Image'),
            NameObject('/Width'): NumberObject(image.width),
            NameObject('/Height'): NumberObject(image.height),
            NameObject('/ColorSpace'): NameObject('/DeviceRGB'),
            NameObject('/BitsPerComponent'): NumberObject(8),
        })
        image_ref = writer._add_object(stream.flate_encode())
        page[NameObject('/Resources')] = DictionaryObject({
            NameObject('/XObject'): DictionaryObject({NameObject('/PageImage'): image_ref})
        })
        commands = DecodedStreamObject()
        commands.set_data(f'q\n{width:.8f} 0 0 {height:.8f} 0 0 cm\n/PageImage Do\nQ\n'.encode('ascii'))
        page[NameObject('/Contents')] = writer._add_object(commands)
    with target.open('wb') as output:
        writer.write(output)


def verify(target, images, page_sizes, tokens):
    reader = PdfReader(target, strict=True)
    require(len(reader.pages) == 2, "Output page count changed.")
    require(reader.metadata is None, "Unexpected metadata.")
    root = reader.trailer['/Root']
    require(set(root) == {'/Type', '/Pages'}, "Unexpected document-level objects.")
    require(not reader.xref_objStm, "Unexpected object streams.")
    reachable = {root.indirect_reference.idnum, root['/Pages'].indirect_reference.idnum}
    for i, (page, expected, page_size) in enumerate(zip(reader.pages, images, page_sizes)):
        require(not page.extract_text(), "Unexpected text layer.")
        require(set(page) == {'/Type', '/Parent', '/Resources', '/MediaBox', '/Contents'},
                "Unexpected page objects or annotations.")
        require(set(page['/Resources']) == {'/XObject'}, "Unexpected fonts or resources.")
        xobjects = page['/Resources']['/XObject']
        require(set(xobjects) == {'/PageImage'}, "Unexpected embedded objects.")
        obj = xobjects['/PageImage']
        require(set(obj) == {'/Type', '/Subtype', '/Width', '/Height', '/ColorSpace',
                             '/BitsPerComponent', '/Filter'}, "Unexpected image properties.")
        require(obj['/Subtype'] == '/Image' and obj['/ColorSpace'] == '/DeviceRGB'
                and obj['/BitsPerComponent'] == 8 and obj['/Filter'] == '/FlateDecode',
                "Unexpected image format or mask.")
        pixels = obj.get_data()
        require(pixels == expected.tobytes(), "PDF image differs from sanitized pixels.")
        commands = page['/Contents'].get_data()
        w, h = page_size
        require(commands == f'q\n{w:.8f} 0 0 {h:.8f} 0 0 cm\n/PageImage Do\nQ\n'.encode('ascii'),
                "Unexpected page content; possible hidden layer.")
        reachable.update((page.indirect_reference.idnum, obj.indirect_reference.idnum,
                          page['/Contents'].indirect_reference.idnum))
        for token in tokens:
            for encoding in ('utf-8', 'utf-16-be', 'utf-16-le'):
                needle = token.encode(encoding)
                require(needle not in pixels and needle not in commands,
                        "Private value found in an output stream.")
        if i == 0:
            for label, rect in MASKS:
                crop = expected.crop(pixel_box(rect, expected.size, page_size))
                require(all(extrema == (0, 0) for extrema in crop.getextrema()),
                        f"Non-black pixels remain in {label}.")
    live_ids = {obj_id for generation, entries in reader.xref.items() for obj_id in entries if obj_id != 0}
    require(live_ids == reachable, "Unexpected unreferenced PDF objects.")
    require(target.read_bytes().count(b'%%EOF') == 1, "Unexpected incremental revision.")
    return {'pages': 2, 'text_characters': 0, 'metadata': False, 'annotations': 0,
            'attachments': 0, 'original_objects_copied': 0,
            'only_sanitized_rgb_images': True, 'all_masks_solid_black': True,
            'unreferenced_objects': 0, 'sensitive_value_stream_matches': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    parser.add_argument('--pdftoppm', default='pdftoppm')
    args = parser.parse_args()
    source = args.source.resolve()
    repo = Path(__file__).resolve().parents[1]
    require(not source.is_relative_to(repo), "Keep the private source outside the repository.")
    require(hashlib.sha256(source.read_bytes()).hexdigest() == SOURCE_SHA256,
            "Source differs from the reviewed PDF; review every page and mask first.")
    sizes, tokens = sensitive_tokens(source)
    output_dir = args.output_dir.resolve()
    require(not output_dir.is_relative_to(repo / 'public'), "Review output before copying into public.")
    output_dir.mkdir(parents=True, exist_ok=True)
    images = []
    # All unredacted intermediate images stay in OS temp and are removed on exit.
    with tempfile.TemporaryDirectory(prefix='codex-transcript-private-') as scratch:
        prefix = Path(scratch) / 'page'
        subprocess.run([args.pdftoppm, '-r', str(DPI), '-png', str(source), str(prefix)],
                       check=True, capture_output=True)
        for i, page_size in enumerate(sizes):
            with Image.open(Path(scratch) / f'page-{i+1}.png') as raw:
                rgb = raw.convert('RGB')
                image = Image.frombytes('RGB', rgb.size, rgb.tobytes())
            if i == 0:
                draw = ImageDraw.Draw(image)
                for _, rect in MASKS:
                    x0, y0, x1, y1 = pixel_box(rect, image.size, page_size)
                    draw.rectangle((x0, y0, x1-1, y1-1), fill=(0, 0, 0))
            # Check every pixel outside the intended redaction areas is unchanged.
            difference = ImageChops.difference(image, rgb)
            if i == 0:
                difference_draw = ImageDraw.Draw(difference)
                for _, rect in MASKS:
                    x0, y0, x1, y1 = pixel_box(rect, image.size, page_size)
                    difference_draw.rectangle((x0, y0, x1-1, y1-1), fill=(0, 0, 0))
            require(difference.getbbox() is None, "Unintended visual changes outside masks.")
            images.append(image)
    target = output_dir / 'notenspiegel-aktuell-redacted.pdf'
    write_image_pdf(images, sizes, target)
    result = verify(target, images, sizes, tokens)
    for i, image in enumerate(images):
        preview = output_dir / f'notenspiegel-aktuell-seite-{i+1}.png'
        image.save(preview, format='PNG', optimize=True)
        with Image.open(preview) as reopened:
            require(not reopened.info, "Unexpected PNG metadata.")
            require(reopened.tobytes() == image.tobytes(), "Preview pixels changed.")
    result.update({'dpi': DPI, 'image_sizes': [im.size for im in images],
                   'unchanged_pixels_outside_masks': True,
                   'redacted_fields': [label for label, _ in MASKS],
                   'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    (output_dir / 'verification.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
