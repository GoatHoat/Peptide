# DESIGN v2 — removing the generated-app signature

This supersedes the relevant sections of DESIGN.md. Where the two disagree,
this document wins.

Five things in DESIGN.md v1 are on the published list of AI-generated design
tells. I wrote four of them. They are corrected below with exact values.

---

## THE SIX CHANGES

### 1. Delete every 1px white hairline border — this is the single biggest tell

DESIGN.md v1 specifies `hairline: rgba(255,255,255,0.10)` for card borders.

That value is **character-for-character the shadcn/ui dark-mode `--border`
token** (`oklch(1 0 0 / 10%)`). It is the most recognisable dark-mode signature
of a generated interface. Every AI coding tool emits it by default.

It gets worse in combination: a crisp 1px edge plus a soft wide shadow on the
same element is physically incoherent — a sharp edge implies a flat sticker, a
diffuse shadow implies a floating slab. Real systems pick one.

**Replace with opaque elevation.** Apple's own dark inset-grouped list is an
opaque grey card on a pure black canvas, no border:

| Level | Value | Use |
|---|---|---|
| Canvas | `#000000` | page background |
| Surface 1 | `#131316` | standard card |
| Surface 2 | `#1E1E22` | a card sitting on a card, sheets |
| Separator | `#38383A` | only inside a list, inset to the text edge |

Rise ships exactly this pattern — canvas `#010101`, one elevation step
`#161618`, one accent, **no borders and no shadows anywhere.**

Rule: **no element gets a border unless it is interactive or contains
unpredictable content.** Separation comes from background value first,
whitespace second, and a border only if both fail.

### 2. Replace the streak dot grid with a dated ring calendar

The 7-row dot grid is the GitHub-contribution silhouette. Searching the
category for it returns generic habit trackers and build-your-own tutorials
exclusively — no Oura, Whoop, Strava, Streaks, or Apple product uses it. The
silhouette is the tell, and ours is identical even though our states are
better.

Three properties separate a premium history view from a heatmap:

- **It is dated.** Real weekday headers and date numerals. You can point at a
  cell and say "that was the 14th." A dot grid is an undated blob.
- **Each cell carries a graded value.** Apple Fitness encodes three continuous
  ratios per day. A dot encodes one binary.
- **A perfect run is rewarded by removing marks, not adding them.** Duolingo
  collapses seven day icons into one continuous bar on a perfect week — the
  exact inverse of a heatmap, which always draws N cells regardless of story.

**Build the Apple Fitness model instead:** a month-aligned 7-column grid with
weekday headers and date numerals, and in each cell a **ring**, not a dot,
whose arc equals the percentage of that day's scheduled doses that were taken.
Full ring = perfect day. Partial arc = partial day. Empty track = missed.
Today gets a filled dot centre.

That converts a binary mark into a graded one and gets you real dates for free.

### 3. Give Today a hero with real geometry

The most counter-intuitive measurement in the research: **dominance comes from
area, not type size.**

Zero's fasting ring, measured on a 375pt screen:

| Property | Value |
|---|---|
| Ring outer diameter | **278.7pt — 74.3% of screen width** |
| Ring stroke | **35.3pt** |
| Numeral inside it | **only ~40pt** |
| Numeral : label ratio | 2.4× |

A 40pt numeral inside a 280pt ring reads as far more dominant than a 72pt
numeral floating in a card. Today's hero is currently a text tile — a
next-dose time set in a rounded rectangle. It has no geometry, so it has no
presence.

**Make the dose arc the hero at ~70% of screen width with a ~32pt stroke.**
The arc you already specified — the one that fills as doses are taken — is the
right instinct; it is simply far too small. Keep the numeral modest at 40–44pt.
Let the ring claim the area.

The unfilled track should be nearly invisible: Zero's empty track is only about
6% off its card colour. Save all the energy for the fill.

### 4. Cut the all-caps tracked labels down to one role

"All-caps section labels" appears twice in the sixteen catalogued markers.
Right now we use tracked uppercase for section headers, buttons, nav titles,
metric labels and eyebrows — five roles. That is the tell.

Modern native section headers are **sentence case, ~17pt semibold, left-aligned
to the card edge.** Bevel does this ("Stress & Energy", "Nutrition").

**Keep tracked uppercase for buttons only.** Every section header becomes
sentence case at 17pt semibold. Every metric label becomes sentence case at
13pt regular. Whoop does use all-caps headlines at +10% tracking — but pairs
them with a licensed typeface, which we do not have.

### 5. Turn the particle field off almost everywhere

Zero premium precedent. Not one of Oura, Whoop, Strava, Zero, Bevel, Rise,
Streaks, Flighty or Things 3 uses particles or decorative glow. Rise's only
luminous element is the data curve itself — the atmosphere comes from the data,
not from decoration.

**Keep it on exactly two screens: the check-in gate and the streak reward.**
Everywhere else, off. A signature element used on every screen is wallpaper;
used on two, it's a signature.

Same logic for the radial copper haze behind the onboarding screens. Keep it on
ob1 alone.

### 6. Fix the margin and the type ramp

**Horizontal margin is 20pt, not 16.** `layoutMargins.left` is 16pt on
pre-notch iPhones and 20pt on iPhone 12 and later. Bevel's cards measure
exactly 20.0pt from the edge. A web-built app hardcodes 16px and is visibly
wrong on every modern device — one of the fastest ways to spot a non-native
build.

**Type steps need at least a 1.25× ratio.** A flat ramp is a catalogued tell.
Fewer steps, more contrast between them:

| Role | Size | Weight | Tracking | Case |
|---|---|---|---|---|
| Hero numeral | 72 | Light | −2.0 | — |
| Screen title | 34 | Bold | −1.05 | Sentence |
| Card hero | 40 | Regular | −1.2 | — |
| Section header | 17 | Semibold | −0.43 | **Sentence** |
| Body | 17 | Regular | −0.43 | Sentence |
| Label | 13 | Regular | +0.03 | **Sentence** |
| Button | 16 | Semibold | +1.4 | **UPPER** |

Tracking follows Apple's own curve of roughly −0.031pt per pt above 15pt, and
turns positive below 15pt. Large type gets proportionally *more* leading, not
less — 1.40× on headlines against 1.19× on body.

---

## WHAT NOT TO CHANGE

Four decisions are already correct and the research backs them:

- **Pure `#000000` canvas.** Apple's dark `systemGroupedBackground` is exactly
  this. Near-black `#0A0A0A` is the giveaway, because it is the shadcn default
  and the choice of nobody. True black is a decision.
- **`textSecondary` at 62% white** — within two points of Apple's
  `secondaryLabel`.
- **Hero at 72pt with −2.0 tracking** — Apple's own curve extrapolates to
  −2.2pt at that size. Within 0.2pt of the system.
- **One hero number per screen, everything else three steps smaller** — matches
  the measured 2.4× ratio in shipping apps.

---

## THE HIGHEST-LEVERAGE NON-VISUAL FIX

Researchers studying this converge on the same point: the strongest signal is
not the aesthetic at all. It is that generated apps **only implement the happy
path.** Empty states, loading states, error states, offline behaviour and form
validation are omitted or perfunctory.

A generated app has no empty state. A designed app always does.

We need, at minimum: a first-run stack with nothing in it, a day with no doses
scheduled, a barcode scan that finds nothing, an analysis screen with too
little history to compute a trend, and a photo view with no photos. Some of
these exist as dev-toolbar toggles; they need to be real screens with real
copy.

---

## THE THUMBNAIL TEST

Shrink any screen to thumbnail size. The hierarchy must survive the blur —
one thing should still dominate. If everything greys into an even field of
similar rectangles, the screen has no focal point.

Run it on Today, Stack, Analysis and Profile. Today should pass once the arc
is the hero. The other three currently will not.
