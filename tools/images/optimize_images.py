"""Optimize raster assets referenced by the CATBTI frontend without cropping."""

from __future__ import annotations

import argparse
import re
import tempfile
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[2]
SOURCE_FILES = (
    "index.html",
    "src/data/config.js",
    "src/app.js",
    "src/core/image-manifest.js",
)
IMAGE_PATTERN = re.compile(
    r"assets/images/[A-Za-z0-9_./?=-]+\.(?:jpe?g|png|webp)",
    re.I,
)
SKIP_NAMES = {
    "public-account-qr.jpg",
    "social-douyin.jpg",
    "social-xiaohongshu.jpg",
}


def resize_to_long_edge(image: Image.Image, limit: int) -> Image.Image:
    width, height = image.size
    longest = max(width, height)
    if longest <= limit:
        return image
    scale = limit / longest
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def save_optimized(image: Image.Image, target: Path, *, long_edge: int) -> None:
    image = ImageOps.exif_transpose(image)
    image = resize_to_long_edge(image, long_edge)
    suffix = target.suffix.lower()
    target.parent.mkdir(parents=True, exist_ok=True)

    if suffix in {".jpg", ".jpeg"}:
        if image.mode not in {"RGB", "L"}:
            background = Image.new("RGB", image.size, "white")
            if "A" in image.getbands():
                background.paste(image, mask=image.getchannel("A"))
            else:
                background.paste(image)
            image = background
        image.save(target, "JPEG", quality=86, optimize=True, progressive=True)
    elif suffix == ".webp":
        image.save(target, "WEBP", quality=86, method=6)
    elif suffix == ".png":
        image.save(target, "PNG", optimize=True, compress_level=9)
    else:
        raise ValueError(f"Unsupported output format: {target}")


def import_image(source: Path, target: Path, long_edge: int) -> None:
    with Image.open(source) as image:
        save_optimized(image, target, long_edge=long_edge)
    print(f"Imported {source.name} -> {target.relative_to(ROOT)}")


def referenced_images() -> list[Path]:
    references: set[Path] = set()
    for source_name in SOURCE_FILES:
        source = ROOT / source_name
        text = source.read_text(encoding="utf-8")
        for match in IMAGE_PATTERN.findall(text):
            relative = match.split("?", 1)[0]
            references.add(ROOT / relative)
    return sorted(path for path in references if path.exists())


def optimize_in_place(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    if before < 700 * 1024 or path.name in SKIP_NAMES:
        return before, before

    suffix = path.suffix.lower()
    long_edge = 1800 if suffix == ".png" else 1920
    with Image.open(path) as image:
        with tempfile.NamedTemporaryFile(
            dir=path.parent, suffix=suffix, delete=False
        ) as temporary:
            temporary_path = Path(temporary.name)
        try:
            save_optimized(image, temporary_path, long_edge=long_edge)
            after = temporary_path.stat().st_size
            if after < before:
                temporary_path.replace(path)
                return before, after
            temporary_path.unlink()
            return before, before
        except Exception:
            temporary_path.unlink(missing_ok=True)
            raise


def optimize_referenced() -> None:
    before_total = 0
    after_total = 0
    changed = 0
    for path in referenced_images():
        before, after = optimize_in_place(path)
        before_total += before
        after_total += after
        if after < before:
            changed += 1
            print(
                f"Optimized {path.relative_to(ROOT)}: "
                f"{before / 1024 / 1024:.2f} MB -> {after / 1024 / 1024:.2f} MB"
            )
    print(
        f"Referenced images: {before_total / 1024 / 1024:.2f} MB -> "
        f"{after_total / 1024 / 1024:.2f} MB ({changed} files changed)"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--import-image", nargs=2, metavar=("SOURCE", "TARGET"))
    parser.add_argument("--long-edge", type=int, default=1920)
    parser.add_argument("--optimize-referenced", action="store_true")
    args = parser.parse_args()

    if args.import_image:
        source = Path(args.import_image[0]).resolve()
        target = (ROOT / args.import_image[1]).resolve()
        if ROOT not in target.parents:
            raise ValueError("Target must stay inside the CATBTI workspace")
        import_image(source, target, args.long_edge)
    if args.optimize_referenced:
        optimize_referenced()
    if not args.import_image and not args.optimize_referenced:
        parser.error("Choose --import-image or --optimize-referenced")


if __name__ == "__main__":
    main()
