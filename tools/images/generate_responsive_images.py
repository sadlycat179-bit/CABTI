from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[2]
IMAGE_ROOT = ROOT / "assets" / "images"
OUTPUT_ROOT = IMAGE_ROOT / "generated"
MANIFEST_PATH = ROOT / "src" / "core" / "image-manifest.js"
SOURCE_FILES = [
    ROOT / "index.html",
    ROOT / "src/app.js",
    ROOT / "src/data/config.js",
    *sorted((ROOT / "src").rglob("*.js")),
]
TARGET_WIDTHS = (320, 720, 1200)
SUPPORTED_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def referenced_images() -> list[Path]:
    source_text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in SOURCE_FILES
        if path.exists() and path != MANIFEST_PATH
    )
    referenced: list[Path] = []
    for path in sorted(IMAGE_ROOT.rglob("*")):
        if not path.is_file() or OUTPUT_ROOT in path.parents:
            continue
        if path.suffix.lower() not in SUPPORTED_SUFFIXES:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative in source_text:
            referenced.append(path)
    return referenced


def variant_widths(source_width: int) -> list[int]:
    widths = {min(source_width, width) for width in TARGET_WIDTHS}
    return sorted(width for width in widths if width > 0)


def output_path(source: Path, width: int) -> Path:
    relative = source.relative_to(IMAGE_ROOT)
    suffix = source.suffix.lower().lstrip(".")
    return OUTPUT_ROOT / relative.parent / f"{source.stem}-{suffix}-{width}.webp"


def save_variant(image: Image.Image, destination: Path, width: int) -> tuple[int, int]:
    height = max(1, round(image.height * width / image.width))
    resized = image if width == image.width else image.resize(
        (width, height),
        Image.Resampling.LANCZOS,
    )
    has_alpha = "A" in resized.getbands()
    prepared = resized.convert("RGBA" if has_alpha else "RGB")
    destination.parent.mkdir(parents=True, exist_ok=True)
    prepared.save(
        destination,
        "WEBP",
        quality=80,
        method=6,
        exact=has_alpha,
    )
    if resized is not image:
        resized.close()
    prepared.close()
    return width, height


def build_manifest() -> dict[str, dict[str, object]]:
    manifest: dict[str, dict[str, object]] = {}
    for source in referenced_images():
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            variants: list[dict[str, object]] = []
            for width in variant_widths(image.width):
                destination = output_path(source, width)
                actual_width, actual_height = save_variant(image, destination, width)
                variants.append(
                    {
                        "src": destination.relative_to(ROOT).as_posix(),
                        "width": actual_width,
                        "height": actual_height,
                        "bytes": destination.stat().st_size,
                    }
                )
            if image is not opened:
                image.close()

        original = source.relative_to(ROOT).as_posix()
        largest = variants[-1]
        manifest[original] = {
            "src": largest["src"],
            "srcset": ", ".join(
                f'{variant["src"]} {variant["width"]}w'
                for variant in variants
            ),
            "width": largest["width"],
            "height": largest["height"],
            "sourceBytes": source.stat().st_size,
            "optimizedBytes": sum(int(variant["bytes"]) for variant in variants),
        }
    return manifest


def write_manifest(manifest: dict[str, dict[str, object]]) -> None:
    payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    content = (
        "(function () {\n"
        '  "use strict";\n\n'
        f"  window.CATBTI_IMAGE_MANIFEST = Object.freeze({payload});\n"
        "}());\n"
    )
    MANIFEST_PATH.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    manifest = build_manifest()
    write_manifest(manifest)
    source_bytes = sum(int(item["sourceBytes"]) for item in manifest.values())
    optimized_bytes = sum(int(item["optimizedBytes"]) for item in manifest.values())
    print(
        f"Generated {len(manifest)} responsive image entries: "
        f"{source_bytes / 1048576:.2f} MB original -> "
        f"{optimized_bytes / 1048576:.2f} MB across all variants."
    )


if __name__ == "__main__":
    main()
