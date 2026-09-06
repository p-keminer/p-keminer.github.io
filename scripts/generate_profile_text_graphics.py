"""Generate selectable inline SVG segments without changing the source artwork.

Run from any directory with Python 3.10+: python scripts/generate_profile_text_graphics.py
Use --check to verify the checked-in module without writing it. Each original
segment contains the entire drawing and only changes its viewBox. This generator
keeps each complete visible drawing element once, including its original SMIL.
It deliberately rejects unfamiliar geometry or elements crossing a cut boundary
instead of silently dropping or clipping text.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "ueber-mich" / "assets"
OUTPUT = ROOT / "public" / "ueber-mich" / "profile-text-graphics.js"
SVG = "{http://www.w3.org/2000/svg}"
SEGMENTS = ("intro", "project-arm", "project-alarm", "rest")
# The existing GitHub badge path lies in a 16 x 16 box. A different path must be
# reviewed before assuming these bounds; no general SVG path parser is needed.
BADGE_PATH_SHA256 = "b8044aea788097d74859d07d5d5b13993d400d138187779e48c39b2c2ff2d6e3"
ALLOWED_TAGS = {"svg", "title", "metadata", "rect", "g", "text", "line", "path", "animate"}
ET.register_namespace("", SVG[1:-1])


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def signature(element: ET.Element) -> tuple:
    """Compare authored content/attributes, ignoring serialization whitespace."""
    return (
        element.tag,
        tuple(sorted(element.attrib.items())),
        (element.text or "").strip(),
        tuple(signature(child) for child in element),
    )


def validate_markup(root: ET.Element) -> None:
    for element in root.iter():
        require(element.tag.startswith(SVG), "Unexpected non-SVG element")
        require(element.tag[len(SVG):] in ALLOWED_TAGS, "Unexpected SVG element")
        for key, value in element.attrib.items():
            require(not key.lower().startswith("on"), "Event handler is not permitted")
            require(key not in {"style", "href", "src"} and "href" not in key,
                    "Inline styles and resource references are not permitted")
            require("url(" not in value.lower(), "Referenced SVG resources need an explicit review")
        if element.tag == SVG + "animate":
            require(element.get("attributeName") == "opacity", "Unexpected animation target")
            require(re.fullmatch(r"\d+(?:\.\d+)?s", element.get("begin", "")) is not None,
                    "ID-dependent animation timing needs an explicit review")


def vertical_bounds(element: ET.Element) -> tuple[float, float]:
    """Conservative cut checks for the small, known source artwork vocabulary.

    Text uses a font-size ascent plus half a font-size descent envelope. This is
    a source-layout guard, not a measurement of platform-specific glyph outlines.
    Coordinates, fonts, glyph scaling and clipping are never altered on output.
    """
    tag = element.tag[len(SVG):]
    if tag == "text":
        require("transform" not in element.attrib, "Transformed text needs a bounds review")
        y, size = float(element.attrib["y"]), float(element.attrib["font-size"])
        return y - size, y + size * 0.5
    if tag == "rect":
        require("transform" not in element.attrib, "Transformed rectangle needs a bounds review")
        y = float(element.get("y", "0"))
        return y, y + float(element.attrib["height"])
    if tag == "line":
        require("transform" not in element.attrib, "Transformed line needs a bounds review")
        half_stroke = float(element.get("stroke-width", "1")) / 2
        y1, y2 = float(element.attrib["y1"]), float(element.attrib["y2"])
        return min(y1, y2) - half_stroke, max(y1, y2) + half_stroke
    if tag == "path":
        require(hashlib.sha256(element.attrib["d"].encode()).hexdigest() == BADGE_PATH_SHA256,
                "Unknown badge path needs a bounds review")
        translate = re.fullmatch(r"translate\(([-\d.]+)\s+([-\d.]+)\)", element.get("transform", ""))
        require(translate is not None, "Unknown badge transform")
        y = float(translate.group(2))
        return y, y + 16
    if tag == "g":
        require("transform" not in element.attrib, "Transformed group needs a bounds review")
        bounds = [vertical_bounds(child) for child in element if child.tag != SVG + "animate"]
        require(bool(bounds), "Empty drawing group")
        return min(x[0] for x in bounds), max(x[1] for x in bounds)
    raise ValueError(f"Cannot classify drawing element {tag}")


def generate_language(language: str) -> tuple[list[str], dict]:
    paths = [ASSETS / f"profile-{language}-{segment}.svg" for segment in SEGMENTS]
    roots = [ET.parse(path).getroot() for path in paths]
    for root in roots:
        validate_markup(root)
        require([child.tag for child in root] == [SVG + x for x in ("title", "metadata", "rect", "g")],
                "Unexpected root drawing structure")
    groups = [root.find(SVG + "g") for root in roots]
    require(all(signature(group) == signature(groups[0]) for group in groups),
            f"{language}: source segments no longer contain the same original artwork")
    require(all(signature(root.find(SVG + "rect")) == signature(roots[0].find(SVG + "rect"))
                for root in roots), f"{language}: inconsistent background rectangles")
    boxes = [tuple(map(float, root.attrib["viewBox"].split())) for root in roots]
    require(all(x == 0 and width == 1200 for x, _, width, _ in boxes), "Unexpected horizontal viewBox")
    require(boxes[0][1] == 0 and all(boxes[i][1] + boxes[i][3] == boxes[i + 1][1]
                                   for i in range(len(boxes) - 1)), "ViewBox gap or overlap")
    require(boxes[-1][1] + boxes[-1][3] == float(roots[0].find(SVG + "rect").attrib["height"]),
            "ViewBoxes do not cover the full drawing")

    original_children = list(groups[0])
    selected: list[list[int]] = [[] for _ in SEGMENTS]
    for index, child in enumerate(original_children):
        low, high = vertical_bounds(child)
        owners = [i for i, (_, top, _, height) in enumerate(boxes)
                  if low >= top and high <= top + height]
        require(len(owners) == 1,
                f"{language}: element {index} crosses a cut or lies outside all segments ({low}, {high})")
        selected[owners[0]].append(index)
    require([index for indices in selected for index in indices] == list(range(len(original_children))),
            "Drawing order changed while partitioning")

    strings, counts, output_children = [], [], []
    for index, root in enumerate(roots):
        result = deepcopy(root)
        result.remove(result.find(SVG + "title"))
        result.attrib.pop("role", None)
        result.attrib.pop("aria-labelledby", None)
        result.set("class", "profile-readme__segment")
        result.set("aria-hidden", "true")
        result.set("focusable", "false")
        group = result.find(SVG + "g")
        for child in list(group):
            group.remove(child)
        for child_index in selected[index]:
            group.append(deepcopy(list(groups[index])[child_index]))
        # The only source IDs label the removed title and the unreferenced group.
        for element in result.iter():
            require(element.get("id") in (None, "title", "word-reveal"), "Unexpected source ID")
            element.attrib.pop("id", None)
        output_children.extend(list(group))
        strings.append(ET.tostring(result, encoding="unicode"))
        counts.append({
            "segment": SEGMENTS[index],
            "viewBox": result.attrib["viewBox"],
            "textNodes": len(list(result.iter(SVG + "text"))),
            "animations": len(list(result.iter(SVG + "animate"))),
        })
    # These full subtrees include every shape, text/font attribute, fill/stroke,
    # and every animation timing. Partitioning must not change any of them.
    require([signature(child) for child in output_children] == [signature(child) for child in original_children],
            "Authored drawing or animation changed")
    require(sum(count["textNodes"] for count in counts) == len(list(groups[0].iter(SVG + "text"))),
            "Text lost or duplicated")
    return strings, {"segments": counts, "sourceBytes": sum(path.stat().st_size for path in paths),
                     "drawingAndAnimationsIdentical": True, "eachDrawingElementExactlyOnce": True,
                     "cutBoundaryChecksPassed": True}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check the generated module without writing")
    args = parser.parse_args()
    graphics, report = {}, {}
    for language in ("de", "en"):
        graphics[language], report[language] = generate_language(language)
    module = (
        "// Generated by scripts/generate_profile_text_graphics.py; do not edit by hand.\n"
        "// Same source coordinates, fonts and SMIL; one copy of each visible text element.\n"
        "export const profileTextGraphics = " + json.dumps(graphics, ensure_ascii=False, indent=2) + ";\n"
    )
    if args.check:
        require(OUTPUT.exists() and OUTPUT.read_text(encoding="utf-8") == module,
                "Generated module is out of date; run this script without --check")
    else:
        OUTPUT.write_text(module, encoding="utf-8", newline="\n")
    report["moduleBytes"] = len(module.encode("utf-8"))
    report["moduleSha256"] = hashlib.sha256(module.encode("utf-8")).hexdigest()
    report["mode"] = "check" if args.check else "generate"
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
