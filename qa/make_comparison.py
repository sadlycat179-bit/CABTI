from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
REFERENCE = Path(
    r"C:\Users\Qxi\AppData\Local\Temp\codex-clipboard-03e3087f-3e51-40cb-9f25-206c44f19b80.png"
)
IMPLEMENTATION = ROOT / "dazuo-gift-waiting-v2.jpg"
OUTPUT = ROOT / "dazuo-gift-annotation-comparison.png"
FOCUSED_OUTPUT = ROOT / "dazuo-gift-focused-comparison.png"


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    ratio = min(width / image.width, height / image.height)
    size = (round(image.width * ratio), round(image.height * ratio))
    return image.resize(size, Image.Resampling.LANCZOS)


reference = Image.open(REFERENCE).convert("RGB")
implementation = Image.open(IMPLEMENTATION).convert("RGB")

panel_width = 864
panel_height = 733
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

focused_reference = reference.crop((35, 125, 700, 733))
focused_implementation = implementation.crop((20, 300, 520, 825))
focused_panel_width = 700
focused_panel_height = 650
focused_canvas = Image.new(
    "RGB",
    (focused_panel_width * 2, focused_panel_height + label_height),
    "#f4efe7",
)
focused_draw = ImageDraw.Draw(focused_canvas)

for index, (label, image) in enumerate(
    (("Annotated issue", focused_reference), ("Updated gift box", focused_implementation))
):
    fitted = fit(image, focused_panel_width, focused_panel_height)
    x = index * focused_panel_width + (focused_panel_width - fitted.width) // 2
    y = label_height + (focused_panel_height - fitted.height) // 2
    focused_canvas.paste(fitted, (x, y))
    focused_draw.text(
        (index * focused_panel_width + 20, 12),
        label,
        fill="#49352d",
        font=font,
    )

focused_draw.line(
    (focused_panel_width, 0, focused_panel_width, focused_canvas.height),
    fill="#d8cec1",
    width=2,
)
focused_canvas.save(FOCUSED_OUTPUT, quality=94)
