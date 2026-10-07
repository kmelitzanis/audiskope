"""Regenerate the Audiskope mark and its appearance variants.

python3 -m pip install Pillow; pnpm run logo

Produces assets/icons/variants/*.png and assets/icons/logo.svg. Run
`pnpm run icons` afterwards to propagate the new master into the desktop,
iOS, Android and web icon sets.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/icons'
SIZE = 1024
CORNER = 0.225
# Five bars: width and gap as a fraction of the canvas, heights as a fraction
# of its height. Keep assets/icons/logo.svg and the titlebar mark in
# src/renderer/index.html in step with these numbers.
HEIGHTS = [0.28, 0.56, 0.86, 0.62, 0.34]
BAR_W, GAP = 0.088, 0.048

# Background top, background bottom, bar colour. Sampled from the artwork the
# appearances were originally drawn from.
VARIANTS = {
    'Default':     ((23, 25, 29), (23, 24, 29), (40, 193, 245)),
    'Dark':        ((23, 25, 29), (23, 24, 29), (40, 193, 245)),
    'TintedDark':  ((19, 11, 41), (8, 4, 18), (54, 31, 117)),
    'TintedLight': ((135, 114, 215), (114, 88, 208), (204, 195, 238)),
    'ClearDark':   ((69, 69, 69), (43, 42, 44), (179, 179, 179)),
    'ClearLight':  ((141, 141, 141), (128, 127, 128), (209, 209, 210)),
}


def geometry(s):
    w, g = BAR_W * s, GAP * s
    total = len(HEIGHTS) * w + (len(HEIGHTS) - 1) * g
    x = (s - total) / 2
    for h in HEIGHTS:
        hh = h * s
        yield x, (s - hh) / 2, w, hh
        x += w + g


def bars_mask(size, ss=4):
    s = size * ss
    m = Image.new('L', (s, s), 0)
    d = ImageDraw.Draw(m)
    for x, y, w, h in geometry(s):
        d.rounded_rectangle((x, y, x + w, y + h), radius=w / 2, fill=255)
    return m.resize((size, size), Image.Resampling.LANCZOS)


def squircle(size, ss=4):
    s = size * ss
    m = Image.new('L', (s, s), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, s - 1, s - 1), radius=s * CORNER, fill=255)
    return m.resize((size, size), Image.Resampling.LANCZOS)


def render(size, top, bottom, bar):
    ground = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(ground)
    for y in range(size):
        t = y / max(1, size - 1)
        d.line([(0, y), (size, y)],
               fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    ground.paste(Image.new('RGB', (size, size), bar), (0, 0), bars_mask(size))
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(ground, (0, 0), squircle(size))
    return out


def svg():
    bars = '\n'.join(
        f'  <rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
        f'rx="{w / 2:.1f}" fill="#28c1f5"/>'
        for x, y, w, h in geometry(SIZE)
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}">\n'
        f'  <rect width="{SIZE}" height="{SIZE}" rx="{SIZE * CORNER:.1f}" fill="#17191d"/>\n'
        f'{bars}\n</svg>\n'
    )


out = ROOT / 'variants'
out.mkdir(parents=True, exist_ok=True)
for name, (top, bottom, bar) in VARIANTS.items():
    render(SIZE, top, bottom, bar).save(out / f'{name}.png')
(ROOT / 'logo.svg').write_text(svg())
print(f'Generated {len(VARIANTS)} appearance variants and logo.svg.')
