"""Regenerate the macOS DMG background: python3 -m pip install Pillow; pnpm run dmg-background.

Geometry matches the installer window declared in package.json ("build".dmg).
Change both together: the icon slots below must line up with dmg.contents.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / 'assets/dmg'
WIDTH, HEIGHT = 540, 380
# Palette shared with the application icon and interface.
BG_TOP, BG_BOTTOM = (23, 25, 28), (14, 15, 17)
BLUE = (33, 185, 237)
TEXT = (229, 229, 229)
MUTED = (135, 140, 146)
# Icon slot centers; keep in sync with dmg.contents in package.json.
APP_X, LINK_X, ICON_Y = 150, 390, 196

FONTS = [
    '/System/Library/Fonts/SFNS.ttf',
    '/System/Library/Fonts/Avenir Next.ttc',
    '/System/Library/Fonts/Helvetica.ttc',
]


def font(size):
    for path in FONTS:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def centered(draw, text, cx, y, fnt, fill):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=fnt)
    draw.text((cx - (right - left) / 2 - left, y - top), text, font=fnt, fill=fill)


def tracked(draw, text, cx, y, fnt, fill, spacing):
    """Letter-spaced caps, matching the eyebrow labels in the interface."""
    widths = [draw.textlength(c, font=fnt) for c in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = cx - total / 2
    top = draw.textbbox((0, 0), text, font=fnt)[1]
    for c, w in zip(text, widths):
        draw.text((x, y - top), c, font=fnt, fill=fill)
        x += w + spacing


def equalizer(draw, cx, cy, size, scale):
    """The five-bar mark from assets/icons/logo.svg, at its original proportions.

    `size` is the full logo box; bars span 0.4 of it, stroke is 0.025 wide and
    bar heights run 0.12 to 0.48, exactly as in the SVG.
    """
    for x, h in [(-0.20, 0.12), (-0.10, 0.32), (0.0, 0.48), (0.10, 0.36), (0.20, 0.16)]:
        xx = cx + x * size
        half = h * size / 2
        w = 0.025 * size
        draw.rounded_rectangle(
            (xx - w / 2, cy - half, xx + w / 2, cy + half), radius=w / 2, fill=BLUE
        )


def render(scale):
    w, h = WIDTH * scale, HEIGHT * scale
    im = Image.new('RGB', (w, h), BG_TOP)
    draw = ImageDraw.Draw(im)

    # Vertical gradient ground.
    for y in range(h):
        t = y / max(1, h - 1)
        draw.line(
            [(0, y), (w, y)],
            fill=tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM)),
        )

    # Spectrogram-style bars along the bottom edge, faint enough to stay behind
    # the Finder icon labels.
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    bars = ImageDraw.Draw(overlay)
    columns = 96
    for i in range(columns):
        # Deterministic pseudo-random envelope keeps regeneration reproducible.
        n = (i * 73 % 31) / 31 + (i * 17 % 7) / 14
        height = (0.18 + 0.82 * (n / 1.5) ** 1.6) * 54 * scale
        x = (i + 0.5) * w / columns
        bars.rounded_rectangle(
            (x - 1.4 * scale, h - height, x + 1.4 * scale, h),
            radius=1.4 * scale,
            fill=BLUE + (46,),
        )
    im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(im)

    # Brand lockup.
    equalizer(draw, 0.5 * w, 46 * scale, 115 * scale, scale)
    centered(draw, 'audiskope', 0.5 * w, 84 * scale, font(27 * scale), TEXT)
    tracked(
        draw, 'SPECTROGRAM ANALYZER', 0.5 * w, 119 * scale, font(10 * scale), MUTED,
        1.9 * scale,
    )

    # Drag arrow between the two icon slots.
    mid_y = ICON_Y * scale
    x0, x1 = (APP_X + 76) * scale, (LINK_X - 76) * scale
    draw.line([(x0, mid_y), (x1 - 9 * scale, mid_y)], fill=MUTED, width=max(1, scale))
    draw.polygon(
        [
            (x1, mid_y),
            (x1 - 11 * scale, mid_y - 6 * scale),
            (x1 - 11 * scale, mid_y + 6 * scale),
        ],
        fill=MUTED,
    )

    centered(
        draw, 'Drag audiskope into Applications', 0.5 * w, 296 * scale, font(12 * scale), MUTED
    )
    return im


ROOT.mkdir(parents=True, exist_ok=True)
render(1).save(ROOT / 'background.png')
render(2).save(ROOT / 'background@2x.png')
print(f'Wrote {ROOT}/background.png and background@2x.png')
