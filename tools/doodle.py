"""
Generate public/doodle-pattern.svg.

Six objects, drawn rather than outlined, on a field that is dense at the edges
and empty through the middle. Run: python tools/doodle.py

THE RULES THIS FILE ENCODES, from CLAUDE.md and PROMPT_FINAL_TWO:

  * stroke rgba(255,255,255,0.09) and nothing brighter, anywhere;
  * no accent colour — #7B5CFA is for things you can press, and spending it on
    wallpaper is spending it;
  * stroke only, one width across every object. A detail that needs to be
    quieter gets lower opacity, never a thinner line;
  * no gradient, glow, shadow or particle. The radial gradient below is used as
    a *mask* — it is opacity, not colour, and never renders as either.

The previous version broke the first two: every object was stroked in
#7B5CFA at width 7.
"""

import math
import random

W, H = 1179, 2556
STROKE = "rgba(255,255,255,0.09)"
# One width, everywhere. 5.0 rather than a hairline because `background-size:
# cover` scales this 1179-wide canvas to about a third on a phone — a 3.2 stroke
# lands sub-pixel there and washes out to nothing at 0.09 alpha. 5.0 renders at
# roughly 1.6px, which is what a hairline is meant to look like.
SW = 5.0
QUIET = 0.55                  # inner detail: lower opacity, same width

random.seed(7)                # deterministic, so a re-run is reviewable


# ── the six objects ─────────────────────────────────────────────────────
# Each returns SVG drawn around its own origin, sized by `s`.

def capsule(s):
    """Two halves of unequal width, with the join between them."""
    w, h = 62 * s, 27 * s
    split = -w * 0.12         # off-centre, so it reads as a capsule
    return (
        f'<rect x="{-w:.1f}" y="{-h:.1f}" width="{2*w:.1f}" height="{2*h:.1f}" rx="{h:.1f}"/>'
        f'<line x1="{split:.1f}" y1="{-h:.1f}" x2="{split:.1f}" y2="{h:.1f}"/>'
        # the near half's rim, so the join reads as an overlap not a seam
        f'<path opacity="{QUIET}" d="M{split-6*s:.1f} {-h:.1f} '
        f'A {6*s:.1f} {h:.1f} 0 0 0 {split-6*s:.1f} {h:.1f}"/>'
    )


def tablet(s):
    """Round, scored across the face, with a bevel arc inside the rim."""
    r = 34 * s
    return (
        f'<circle cx="0" cy="0" r="{r:.1f}"/>'
        f'<circle opacity="{QUIET}" cx="0" cy="0" r="{r*0.78:.1f}"/>'
        f'<line x1="{-r*0.62:.1f}" y1="0" x2="{r*0.62:.1f}" y2="0"/>'
    )


def softgel(s):
    """An oval with its seam, and one short stroke that reads as curvature."""
    rx, ry = 46 * s, 31 * s
    return (
        f'<ellipse cx="0" cy="0" rx="{rx:.1f}" ry="{ry:.1f}"/>'
        f'<line opacity="{QUIET}" x1="{-rx*0.72:.1f}" y1="0" x2="{rx*0.72:.1f}" y2="0"/>'
        # a curve, not a glow: an arc following the shoulder
        f'<path opacity="{QUIET}" d="M{-rx*0.5:.1f} {-ry*0.52:.1f} '
        f'Q 0 {-ry*0.86:.1f} {rx*0.42:.1f} {-ry*0.46:.1f}"/>'
    )


def blister(s):
    """The object that carries the most detail: foil, domes, perforations."""
    cols, rows = 3, 2
    dx, dy = 40 * s, 40 * s
    w, h = (cols * dx) / 2 + 14 * s, (rows * dy) / 2 + 14 * s
    out = [f'<rect x="{-w:.1f}" y="{-h:.1f}" width="{2*w:.1f}" height="{2*h:.1f}" rx="{9*s:.1f}"/>']
    for c in range(cols):
        for r in range(rows):
            cx = (c - (cols - 1) / 2) * dx
            cy = (r - (rows - 1) / 2) * dy
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{13*s:.1f}"/>')
    # perforation dashes between the columns
    for c in range(1, cols):
        x = (c - cols / 2) * dx
        out.append(
            f'<line opacity="{QUIET}" x1="{x:.1f}" y1="{-h:.1f}" x2="{x:.1f}" y2="{h:.1f}" '
            f'stroke-dasharray="{5*s:.1f} {6*s:.1f}"/>'
        )
    return "".join(out)


def bottle(s):
    """Cap as its own shape, a shoulder, and a label left blank."""
    bw, bh = 38 * s, 52 * s
    cw, ch = 21 * s, 14 * s
    return (
        f'<path d="M{-bw:.1f} {bh:.1f} L{-bw:.1f} {-bh*0.35:.1f} '
        f'Q {-bw:.1f} {-bh*0.72:.1f} {-cw:.1f} {-bh*0.78:.1f} '
        f'L{cw:.1f} {-bh*0.78:.1f} Q {bw:.1f} {-bh*0.72:.1f} {bw:.1f} {-bh*0.35:.1f} '
        f'L{bw:.1f} {bh:.1f} Z"/>'
        f'<rect x="{-cw:.1f}" y="{-bh*0.78-ch:.1f}" width="{2*cw:.1f}" height="{ch:.1f}" rx="{3*s:.1f}"/>'
        f'<rect opacity="{QUIET}" x="{-bw*0.68:.1f}" y="{-bh*0.05:.1f}" '
        f'width="{bw*1.36:.1f}" height="{bh*0.62:.1f}" rx="{3*s:.1f}"/>'
    )


def scoop(s):
    """Bowl, the handle where it joins it, and the fill line inside."""
    r = 30 * s
    return (
        f'<path d="M{-r:.1f} 0 A {r:.1f} {r:.1f} 0 0 0 {r:.1f} 0 Z"/>'
        f'<line x1="{-r:.1f}" y1="0" x2="{r:.1f}" y2="0"/>'
        f'<path d="M{r*0.62:.1f} {-2*s:.1f} L{r*1.85:.1f} {-r*0.92:.1f}"/>'
        f'<line opacity="{QUIET}" x1="{-r*0.66:.1f}" y1="{r*0.44:.1f}" '
        f'x2="{r*0.66:.1f}" y2="{r*0.44:.1f}"/>'
    )


SHAPES = [capsule, tablet, softgel, blister, bottle, scoop]

# Three sizes, deliberately. Uniform scale is what makes a field read as
# generated rather than drawn.
SIZES = [0.62, 0.85, 1.15]


def build():
    cell = 232                          # grid pitch before jitter
    cols = math.ceil(W / cell)
    rows = math.ceil(H / cell)
    body = []

    for r in range(rows):
        for c in range(cols):
            shape = SHAPES[(r * cols + c + r) % len(SHAPES)]
            s = random.choice(SIZES)
            rot = random.randrange(0, 360)
            x = c * cell + cell / 2 + random.uniform(-46, 46)
            y = r * cell + cell / 2 + random.uniform(-46, 46)
            art = shape(s)

            # Seamless: anything within a cell of an edge is drawn again on the
            # opposite side, so an object crossing the right edge continues at
            # the left. Checked by tiling the file twice and looking at the join.
            for ox in (0, -W, W):
                for oy in (0, -H, H):
                    px, py = x + ox, y + oy
                    if -cell < px < W + cell and -cell < py < H + cell:
                        body.append(
                            f'<g transform="translate({px:.1f},{py:.1f}) rotate({rot})">{art}</g>'
                        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}">'
        "<defs>"
        # Black hides, white shows in a luminance mask — so this clears the
        # centre and keeps the edges. r and the mid stop are tuned so the
        # middle ~45% of a phone frame is genuinely empty.
        '<radialGradient id="rv" cx="50%" cy="50%" r="78%">'
        '<stop offset="0%" stop-color="#000"/>'
        '<stop offset="42%" stop-color="#000"/>'
        '<stop offset="100%" stop-color="#fff"/>'
        "</radialGradient>"
        '<mask id="rvmask" maskUnits="userSpaceOnUse" '
        f'x="0" y="0" width="{W}" height="{H}">'
        f'<rect width="{W}" height="{H}" fill="url(#rv)"/></mask>'
        "</defs>"
        f'<g mask="url(#rvmask)" stroke="{STROKE}" stroke-width="{SW}" '
        'stroke-linecap="round" stroke-linejoin="round" fill="none">'
        + "".join(body)
        + "</g></svg>"
    )


if __name__ == "__main__":
    svg = build()
    with open("public/doodle-pattern.svg", "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"wrote public/doodle-pattern.svg  {len(svg) / 1024:.0f} KB")
