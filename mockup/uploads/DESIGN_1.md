# DESIGN.md

Design system for the supplement & stack tracker. iOS, SwiftUI, dark-only.

Read this before writing any view code. Every value here is a token — do not
invent colours, sizes, radii or durations that are not in this document.

---

## 1. THE IDEA IN ONE PARAGRAPH

Pure black canvas. White type. Copper as the only accent. Cards are frosted
glass with a faint copper sheen. A slow field of copper particles drifts across
the bottom third of every screen and is the only thing that ever moves on its
own. Onboarding is full-bleed and cinematic; the home screen is a calm, spacious
card grid. The app should feel like precision instrumentation, not a wellness
poster.

Reference points, for tone only — do not copy layouts wholesale:
- Onboarding rhythm and full-bleed drama: RISE, Ultrahuman
- Home screen structure and card grid: Bevel, Zero
- Density: **halve** what Bevel puts above the fold, **double** the padding

---

## 2. COLOUR

### Base

| Token | Value | Use |
|---|---|---|
| `bg` | `#000000` | App background. Pure black, everywhere, no exceptions. |
| `surface` | `rgba(255,255,255,0.055)` | Glass card fill |
| `surfaceSolid` | `#121212` | Card fill when Reduce Transparency is on |
| `hairline` | `rgba(255,255,255,0.10)` | 1px card borders, dividers |
| `edgeHighlight` | `rgba(255,255,255,0.22)` | Top 1px of a card only — the glass lip |

### Copper — the only accent

| Token | Value | Use |
|---|---|---|
| `copper` | `#C87941` | Primary accent. Fills, active states, key numerals. |
| `copperLight` | `#E8A87C` | Highlights, gradient top end, hover/press |
| `copperDeep` | `#8A4E24` | Gradient bottom end, pressed states |
| `copperSheen` | `rgba(200,121,65,0.10)` | Radial sheen on glass |
| `copperGlow` | `rgba(200,121,65,0.14)` | Ambient glow behind hero numerals |
| `copperDim` | `rgba(200,121,65,0.35)` | Inactive rings, tick marks, axis lines |

`copperGradient` = linear, `copperLight` → `copper` → `copperDeep`,
top-leading to bottom-trailing. Use on arcs, progress fills, and the primary
button. Never on text.

### Text

| Token | Value | Use |
|---|---|---|
| `textPrimary` | `#FFFFFF` | Headings, hero numerals |
| `textSecondary` | `rgba(255,255,255,0.62)` | Labels, units, supporting copy |
| `textTertiary` | `rgba(255,255,255,0.38)` | Axis labels, timestamps, disabled |

### Status — read this carefully

Copper occupies the warm end of the spectrum, which is normally where warnings
live. So **warnings do not signal by hue.** They signal by inversion.

| State | Treatment |
|---|---|
| Normal | Glass card, copper accent, white numerals |
| Approaching limit (80–99% of UL) | Copper ring fills into a hatched zone; numeral stays white; a `copperLight` 1px ring appears around the card |
| **Over limit** | **Full tile inversion.** Card fill becomes `#F2E9E1` (warm off-white), all text becomes `#0A0A0A`, the accent inside becomes `#8A4E24`. |
| Critical / hard stop | Inverted tile plus a `#FF453A` 3px left edge bar |

The inversion is the single loudest moment in the entire app. Nothing else
inverts, ever. Because everything else is restrained, one white tile in a black
screen hits harder than any red would.

`#FF453A` is the only non-copper accent permitted anywhere in the app and it
appears only in the critical state.

---

## 3. THE PARTICLE FIELD

This is the signature element. It lives behind everything, on every screen.

**Geometry**
- Occupies the bottom third of the screen (`y > 0.66 * height`), fading to zero above
- Density falls off with height: `density(y) = pow(clamp((y - 0.62h) / (0.38h), 0, 1), 2.2)`
- 70 particles total on iPhone. Not more. Sparse is the point.
- Particle diameter 2.0–4.5pt, randomly assigned, larger particles biased toward the bottom
- Colour `copper` at opacity 0.18–0.55, randomly assigned; larger = more opaque
- The largest ~15% get a 1.5pt blur for depth

**Motion**
- Each particle drifts along a slow sine path:
  `x = x₀ + amplitude * sin(t / period + phase)`
- `amplitude` 12–28pt, `period` 9–16s, `phase` random per particle
- Vertical drift is much slower: 2–5pt over a full cycle
- The whole field also has one shared, very slow wave — a second sine at ~24s
  period applied to all particles — so it reads as a single wavy body of dust
  rather than 70 independent dots
- Nothing ever collides, spawns or dies. It just breathes.

**Implementation**
`TimelineView(.animation)` + `Canvas`, one draw call, particle state in a
struct array seeded once. Do NOT use 70 separate SwiftUI views.

**Required behaviour**
- Pause the timeline when the view is not visible
- `Reduce Motion` on → render one static frame, no animation
- `Low Power Mode` → drop to 12fps
- The field never appears above a modal sheet

---

## 4. GLASS

Two treatments, because blur needs something behind it.

**Glass over the particle field (bottom third).** Real material — the blurred
copper dots behind the card are the whole effect.
```
.background(.ultraThinMaterial)
.background(surface)          // tint on top of the material
.overlay(topEdgeHighlight)
.overlay(copperSheenOverlay)
.clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
.overlay(RoundedRectangle(...).strokeBorder(hairline, lineWidth: 1))
```

**Glass over pure black (upper two thirds).** There is nothing to refract, so
the material is skipped and the glass is constructed:
```
.background(surface)          // rgba(255,255,255,0.055)
.overlay(topEdgeHighlight)
.overlay(copperSheenOverlay)
+ same radius and border
```

**`topEdgeHighlight`** — a 1px linear gradient across the top edge only,
`edgeHighlight` at the centre falling to transparent at both corners. This is
what sells glass more than the blur does. Do not skip it.

**`copperSheenOverlay`** — a radial gradient, `copperSheen` at centre to clear,
centred just outside the top-trailing corner, radius ≈ 1.4 × card width, in
`.plusLighter` blend mode. Subtle. If you can clearly see it as an orange
smudge, it is too strong — halve it.

Cards never cast shadows. Separation is by space and edge, never by drop shadow.

---

## 5. TYPE

**SF Pro.** Native, free, correct for iOS. All numerals use
`.monospacedDigit()` so values do not jitter when they animate.

| Role | Size / Weight | Tracking |
|---|---|---|
| `hero` | 72pt, Light | −2.0 |
| `heroUnit` | 24pt, Regular, `textSecondary` | 0 |
| `display` | 34pt, Semibold | −0.6 |
| `title` | 24pt, Semibold | −0.3 |
| `metric` | 32pt, Medium, monospaced digits | −0.8 |
| `body` | 17pt, Regular | 0 |
| `label` | 15pt, Medium, `textSecondary` | 0 |
| `sectionLabel` | 13pt, Semibold, uppercase, `textSecondary` | +1.2 |
| `caption` | 12pt, Regular, `textTertiary` | +0.2 |
| `button` | 16pt, Semibold, uppercase | +1.4 |

Hero numerals are Light weight at large size. Thin type at scale reads
expensive; bold type at scale reads like a warning.

Uppercase with positive tracking is used for exactly three things: section
labels, button labels, and nav bar titles. Nowhere else.

---

## 6. SPACING, RADII, MOTION

**Spacing** — 4pt base: `4, 8, 12, 16, 20, 24, 32, 40, 56, 72`
- Screen horizontal margin: **20**
- Card internal padding: **20** (24 on hero cards)
- Gap between cards in a grid: **12**
- Gap between sections: **40** — this is what buys the spaciousness
- Section label to first card: **16**

**Radii** — cards `22`, small chips `14`, pills/buttons `999`, sheets `28`

**Motion**
| Use | Curve |
|---|---|
| Standard transition | `spring(response: 0.42, dampingFraction: 0.86)` |
| Sheet present/dismiss | `timingCurve(0.32, 0.72, 0, 1, duration: 0.5)` |
| Numeral roll-up | 0.6s ease-out, counting animation |
| Card stagger on appear | 40ms between rows, fade + 12pt rise |
| Tile inversion (over limit) | 0.35s, no bounce — this one must feel serious |

The particle field is the only thing that animates without user input. Nothing
else loops, pulses, or shimmers.

**One deliberate moment:** logging a dose. The item's ring fills with
`copperGradient` over 0.5s, the numeral rolls up, one light haptic
(`.impactOccurred(intensity: 0.6)`). That is the app's signature interaction and
it is the only place a haptic fires on a non-destructive action.

---

## 7. COMPONENTS

**Primary button** — full-width pill, height 56, `copperGradient` fill, black
text, uppercase, tracking +1.4. Pressed: scale 0.98, gradient shifts to
`copperDeep`.

**Secondary button** — full-width pill, height 56, transparent fill, 1.5px
`copper` border, `copper` text. (RISE uses this pattern well — see their
"THAT LOOKS RIGHT".)

**Tertiary action** — plain `copper` text, no container, 16pt Medium.

**Chip / segmented option** — height 44, radius 14, `surface` fill, 1px
`hairline`. Selected: 1.5px `copper` border, `copperSheen` fill, white text.

**Stack row** — height 68. Left: 10pt copper dot at 0.5 opacity, filled to 1.0
when taken today. Then item name (`body`) with dose beneath (`caption`).
Right: time (`label`) and chevron in `textTertiary`. No dividers between rows —
8pt of space instead.

**Metric tile** — the Bevel grid, spaced out. 2-up, aspect ratio ~1.15.
`sectionLabel` at top, `metric` numeral, unit in `label`, optional sparkline in
`copperDim` at the bottom. **Maximum four tiles above the fold.**

**Hero card** — full width, contains one `hero` numeral, its unit, and at most
one supporting line. A `copperGlow` radial sits behind the numeral, bleeding off
the top edge at ~14% opacity.

**Tab bar** — 5 items, black with a top hairline, icons in `textTertiary`,
active in `copper`. Centre item is a raised circular add button, 56pt,
`copperGradient`.

**Check-in gate** — a full-screen takeover, not a card and not a modal. Particle
field visible, `copperGlow` spotlight behind the content block. Content sits at
50% screen height: item name in `display`, dose in `label`, scheduled time in
`caption`. Below it a full-width primary button reading **YES, TAKEN**, and
under that a `tertiary` text action reading **Not yet** at 60% the visual weight.
Nothing else on the screen — no nav bar, no tab bar, no skip in the corner.
Dismisses with a 0.4s upward wipe revealing Today beneath.

**Streak dots** — a 7-row dot grid, weeks running left to right, most recent
column on the right. Dot diameter 8pt, 14pt pitch. No grid lines, no labels
except a month letter every four columns in `caption`.
- Complete day: filled `copper`, 100% opacity
- Partial day: filled `copper` at 35% opacity
- Missed day: 1px `copperDim` ring, unfilled
- Future / pre-install: 1px `hairline` ring at 40% opacity
Rolling 12 weeks visible, horizontally scrollable back through history. Tapping
a dot shows that day in a small popover. Today's dot gets a 2pt `copperLight`
outer ring so it's findable.

**Photo strip** — a collapsed card showing the three most recent progress photos
as 56pt rounded thumbnails in a row with their dates beneath in `caption`.
Expands to a full chronological grid. Every thumbnail renders behind a
`.privacySensitive()` modifier so it blurs in the app switcher.

---

## 8. THE TWO SCREEN ARCHETYPES

**Onboarding — RISE / Ultrahuman rhythm, in black and copper**

- Full-bleed background: particle field, plus one large copper line-art or data
  curve where the screen has a hero visual
- A radial spotlight (`copperGlow`, 20% opacity, 400pt radius) behind the
  content block — this is Ultrahuman's trick and it stops black feeling empty
- Progress segments pinned to the very top: 3pt tall, 4pt gaps, filled in
  `copper`, unfilled in `hairline`
- Type block sits at roughly 55–65% screen height, left-aligned, `display` size
- Primary button pinned to the bottom with 20pt margins and 34pt bottom inset
- One question per screen. Never two.

**Every onboarding screen must carry weight.** A screen with a single input and
nothing else reads as unfinished. Each one gets, at minimum: a headline in
`display`, a hero visual (line-art, a live preview, or a data curve), and either
an input or a payoff. If a screen has only one small input, either give it a
visual that earns the space or merge it with its neighbour.

**Goal picker — Apple Action Button pattern.** Full-screen horizontal pager.
Large glyph (120pt, `copper`, line weight 2.5) centred at ~35% height. Title in
`display` beneath it. One explanatory sentence in `body`/`textSecondary` under
that, max two lines, centred, 40pt side margins. A horizontal rail of small
glyphs at ~78% height showing neighbours either side, the centre one scaled 1.0
and lit, the flanking ones at 0.6 scale and `textTertiary`. Paging snaps with a
`.selection` haptic on each detent. Because this is multi-select, tapping the
centre glyph toggles it: selected gets a 2.5pt `copper` ring and its title turns
`copper`. The primary button reads **CONTINUE (3 SELECTED)** and stays enabled at
zero.

**Home — Bevel / Zero structure, in black with glass**

```
Header      "TODAY ⌄"  centred, sectionLabel style · avatar top-right
Hero card   today's headline number
Section     sectionLabel, then 2-up metric tiles (max 4)
Section     sectionLabel, then stack rows
Tab bar
```
- 40pt between every section
- The particle field is visible behind the lower sections and through the glass
  of any card that overlaps it
- Scroll is the answer to density. Never compress to fit.

---

## 9. ACCESSIBILITY — NOT OPTIONAL

- **Reduce Transparency** → all glass becomes `surfaceSolid` `#121212`, sheen and
  edge highlight removed, border stays
- **Reduce Motion** → particle field renders one static frame; card stagger and
  numeral roll-up become instant; the tile inversion becomes a cross-fade
- **Dynamic Type** → all text scales. Hero numerals cap at accessibility size 3
  and the layout must not clip; tiles reflow to 1-up above that.
- Copper on black is roughly 5.9:1 — fine for large text and UI elements, **not**
  for body copy. Never set `body` or smaller in `copper` on `bg`. Small copper
  text is only permitted on the inverted (light) tile.
- Minimum hit target 44 × 44 everywhere, including the 10pt stack-row dots —
  give them a 44pt transparent tappable frame.

---

## 10. RULES

1. Pure black background. Never a dark grey, never a gradient, never a photo.
2. Copper is the only accent. `#FF453A` appears only in the critical state.
3. Colour carries information. Nothing is coloured for decoration.
4. One hero number per screen. Everything else at least three steps smaller.
5. Separation by space and edge. No drop shadows, no dividers between list rows.
6. Maximum four metric tiles above the fold.
7. Only the particle field animates on its own.
8. Inversion is reserved for the over-limit state. Nothing else ever inverts.
9. If a screen feels crowded, remove something. Do not shrink it.
