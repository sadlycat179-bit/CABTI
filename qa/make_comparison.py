from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
REFERENCE = Path(
    r"C:\Users\Qxi\AppData\Local\Temp\codex-clipboard-e7207b0f-cd5a-474e-ab54-55eee02d5e0c.png"
)
IMPLEMENTATION = ROOT / "result-desktop.png"
OUTPUT = ROOT / "reference-vs-implementation.png"


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    ratio = min(width / image.width, height / image.height)
    size = (round(image.width * ratio), round(image.height * ratio))
    return image.resize(size, Image.Resampling.LANCZOS)


reference = Image.open(REFERENCE).convert("RGB")
implementation = Image.open(IMPLEMENTATION).convert("RGB")

panel_width = 584
panel_height = 587
label_height = 44
canvas = Image.new("RGB", (panel_width * 2, panel_height + label_height), "#f4efe7")
draw = ImageDraw.Draw(canvas)
font = ImageFont.load_default(size=18)

for index, (label, image) in enumerate(
    (("Reference", reference), ("Implementation", implementation))
):
    fitted = fit(image, panel_width, panel_height)
    x = index * panel_width + (panel_width - fitted.width) // 2
    y = label_height + (panel_height - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    draw.text(
        (index * panel_width + 20, 12),
        label,
        fill="#49352d",
        font=font,
    )

draw.line((panel_width, 0, panel_width, canvas.height), fill="#d8cec1", width=2)
canvas.save(OUTPUT, quality=94)
