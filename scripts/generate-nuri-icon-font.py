#!/usr/bin/env python3
"""Compile editable NURI paths to the native icon font; not an app dependency.

Build tools: fonttools==4.60.1, skia-pathops==0.9.0.
The checked-in font is used at runtime; regeneration is only needed after path edits.
"""
import hashlib
import json
from pathlib import Path

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/icons/nuri-icons.source.json"
CATALOG = ROOT / "src/assets/icons/nuri-icons.catalog.json"
LAYERS = ("fill", "outline", "detail", "highlight", "accent", "secondary", "detailAccent")


def shape(element, outline=False):
    result = pathops.Path()
    parse_path(element["d"], result.getPen())
    width = element.get("outlineStroke", 1.4) if outline else element.get("stroke")
    if width:
        result.stroke(width, pathops.LineCap.ROUND_CAP,
                      pathops.LineJoin.ROUND_JOIN, 4)
    result.convertConicsToQuads(0.01)
    return result


def main():
    source = json.loads(SOURCE.read_text())
    catalog_source = json.loads(CATALOG.read_text())
    icons = {name: {**icon, **catalog_source["overrides"][name]}
             for name, icon in source["icons"].items()}
    icons.update(catalog_source["icons"])
    glyphs = {".notdef": TTGlyphPen(None).glyph()}
    cmap, catalog, palettes = {}, {}, {}
    code = 0xE900
    for name, icon in icons.items():
        catalog[name] = {}
        palettes[name] = {**catalog_source["tones"][icon["tone"]], **icon.get("colors", {})}
        palettes[name]["layers"] = [layer for layer in LAYERS
                                    if layer in ("fill", "outline") or icon.get(layer)]
        for layer in LAYERS:
            elements = icon["body"] if layer in ("fill", "outline") else icon.get(layer, [])
            pen = TTGlyphPen(None)
            transform = TransformPen(Cu2QuPen(pen, 0.25, reverse_direction=True),
                                     (1000 / 24, 0, 0, -1000 / 24, 0, 1000))
            for element in elements:
                shape(element, layer == "outline").draw(transform)
            glyph = pen.glyph()
            glyph_name = f"{name}.{layer}"
            glyphs[glyph_name] = glyph
            cmap[code] = glyph_name
            catalog[name][layer] = code
            code += 1
    builder = FontBuilder(1000, isTTF=True)
    builder.setupGlyphOrder(list(glyphs))
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics({name: (1000, getattr(glyph, "xMin", 0))
                                    for name, glyph in glyphs.items()})
    builder.setupHorizontalHeader(ascent=1000, descent=0)
    builder.setupNameTable({"familyName": source["family"], "styleName": "Regular",
                           "uniqueFontIdentifier": "NURI Icons 1.2",
                           "fullName": source["family"], "psName": source["family"],
                           "version": "Version 1.2"})
    builder.setupOS2(sTypoAscender=1000, sTypoDescender=0,
                    usWinAscent=1000, usWinDescent=0)
    builder.setupPost()
    builder.setupMaxp()
    # Stable metadata allows exact regeneration/hash comparison.
    builder.font["head"].created = builder.font["head"].modified = 3800000000
    builder.font.recalcTimestamp = False
    outputs = (ROOT / "src/assets/fonts/NuriIcons.ttf",
               ROOT / "android/app/src/main/assets/fonts/NuriIcons.ttf")
    for output in outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        builder.save(str(output))
    (ROOT / "src/assets/icons/nuri-icons.glyphs.json").write_text(
        json.dumps(catalog, indent=2) + "\n")
    (ROOT / "src/assets/icons/nuri-icons.palette.json").write_text(
        json.dumps(palettes, indent=2) + "\n")
    print(json.dumps({"icons": len(catalog), "glyphs": len(cmap),
                      "bytes": outputs[0].stat().st_size,
                      "sha256": hashlib.sha256(outputs[0].read_bytes()).hexdigest()}))


if __name__ == "__main__":
    main()
