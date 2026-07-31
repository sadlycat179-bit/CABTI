from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    ratio = min(width / image.width, height / image.height)
    size = (round(image.width * ratio), round(image.height * ratio))
    return image.resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a side-by-side QA image comparison.")
    parser.add_argument("reference", type=Path)
    parser.add_argument("implementation", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--reference-label", default="Reference")
    parser.add_argument("--implementation-label", default="Implementation")
    args = parser.parse_args()

    panel_width = 864
    panel_height = 733
    label_height = 44
    canvas = Image.new("RGB", (panel_width * 2, panel_height + label_height), "#f4efe7")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default(size=18)

    with Image.open(args.reference) as reference_source:
        reference = reference_source.convert("RGB")
    with Image.open(args.implementation) as implementation_source:
        implementation = implementation_source.convert("RGB")

    pairs = (
        (args.reference_label, reference),
        (args.implementation_label, implementation),
    )
    for index, (label, image) in enumerate(pairs):
        fitted = fit(image, panel_width, panel_height)
        x = index * panel_width + (panel_width - fitted.width) // 2
        y = label_height + (panel_height - fitted.height) // 2
        canvas.paste(fitted, (x, y))
        draw.text((index * panel_width + 20, 12), label, fill="#49352d", font=font)

    draw.line((panel_width, 0, panel_width, canvas.height), fill="#d8cec1", width=2)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output, quality=94)


if __name__ == "__main__":
    main()
