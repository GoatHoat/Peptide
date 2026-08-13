# BUILD PROMPT — every screen

Paste this to Claude alongside `DESIGN.md` and `PRODUCT.md`.

---

You are designing and building every screen of an iOS supplement and stack
tracker. `DESIGN.md` is the visual system and `PRODUCT.md` is the product spec.
**Read both fully before writing a line of code.** Every colour, size, radius,
spacing value and animation curve must come from DESIGN.md. Do not invent tokens.
If something you need isn't in there, use the nearest existing token rather than
adding a new one, and note it at the end.

Build in SwiftUI, dark-only, iPhone. No third-party packages. Use SF Pro
throughout with `.monospacedDigit()` on every numeral. Ship this as a working
prototype with realistic seeded data — a stack of 9 items including a
multivitamin, a ZMA, a standalone zinc, vitamin D3, omega-3, magnesium
glycinate, creatine, ashwagandha and a B-complex, deliberately rigged so total
zinc lands at 45mg against a 40mg ceiling.

---

## THE THREE THINGS THAT MAKE THIS APP LOOK LIKE ITSELF

Get these right and everything else follows.

**1 · The particle field.** Pure black canvas with a slow drift of copper
particles across the bottom third of every screen. Full spec in DESIGN.md §3:
70 particles, 2.0–4.5pt, density falling off with a squared curve going up,
each on its own slow sine path *plus* one shared 24-second wave applied to all
of them so it reads as a single breathing body of dust rather than 70
independent dots. `TimelineView(.animation)` + `Canvas`, one draw call. This is
the app's signature and it must be genuinely beautiful — spend real effort here.
Sparse and slow. If it looks busy or fast, halve the count and double the
periods.

**2 · Two kinds of glass.** Blur needs something behind it. Cards sitting over
the particle field use real `.ultraThinMaterial` and refract the dots — that's
the payoff. Cards in the upper two thirds have nothing to blur, so the glass is
constructed from a white-alpha fill, a 1px top-edge highlight gradient, and a
copper radial sheen. Both specs in DESIGN.md §4. The top-edge highlight is what
sells glass more than the blur does — never skip it.

**3 · Copper is the only accent, and warnings invert.** Copper occupies the warm
end where warnings normally live, so an over-limit state does not turn red. The
whole tile flips to warm off-white with black text. Nothing else in the app ever
inverts, which is what makes it land.

---

## HOW THE PARTS OF THE APP SHOULD DIFFER

Each area needs its own posture. Someone should know where they are from a
glance at a blurred screenshot.

| Area | Posture |
|---|---|
| **Onboarding** | Cinematic. Full-bleed, edge-to-edge visuals, huge type, one idea per screen, CTA pinned to the bottom. Closest reference: RISE and Ultrahuman. |
| **Check-in gate** | Emptiest screen in the app. One question, centred, nothing else. No nav, no tabs. |
| **Today** | Structured and calm. Section labels, generous 40pt gaps, max four tiles above the fold. Bevel's grid at half the density. |
| **Stack** | List-forward. Rows, not cards. Quiet, scannable, no decoration. |
| **Analysis** | The only place density is allowed. Charts, bars, ratios. Still on the same grid, but tighter — this is where someone goes to study. |
| **Profile** | Quietest. Grouped rows, minimal colour, almost no copper except the streak dots. |
| **Year in review** | Full takeover, no chrome, the most emotional screen in the app. |

---

## SCREENS TO BUILD

Build every one. Where a screen has states, build all the states.

### ONBOARDING

**1 · Cold open.** No input. Headline: *"Most people don't know what's actually
in their stack."* `display` size, left-aligned, at 55% height. Particle field
full-bleed and denser than usual here. Primary button pinned bottom. Progress
segments at the very top begin here.

**2 · About you.** Age dial (Ultrahuman's ruler/dial control — big numeral above
a tick arc) plus a three-way segmented control for biological sex including
"prefer not to say". **Live demonstration:** below the inputs, a copper bar
showing the zinc RDA and UL for the current selection, redrawing as they change
either input. Copy: *"Upper limits change with age and sex. We need this to do
the math."*

**3 · Build your stack.** Three states.
- *Empty:* three entry options as large chunky cards — Scan a barcode (primary,
  biggest), Photograph the label, Search by name. Tertiary text action below:
  "I'm not taking anything yet."
- *Scanning:* live camera with a copper corner-bracket reticle, a detection
  toast sliding in from the right when a product is found (mirror Bevel's
  "Lettuce 100g" toast pattern).
- *Populated:* running count in `display`, items animating into a stacked list
  at the bottom, each row showing name and dose. Done button becomes primary
  once one item exists.

**4 · Injectables.** Copper line-art vial and syringe as the hero visual — the
only place this imagery appears in the whole app. The statement from PRODUCT.md
§1.4 verbatim. Add flow plus a one-tap skip.

**5 · THE AUDIT.** The hero screen of the entire product. Full-bleed. `hero`
numeral at 72pt Light: **45mg**. Beneath it in `label`: "zinc, daily, across 3
products". Beneath that in `caption`: "upper limit is 40". A `copperGlow` radial
bleeds off the top edge behind the numeral. Below, the other over-limit
nutrients as small inverted tiles. Bottom line in `caption`: *"Limits from the
NIH Office of Dietary Supplements."* Build the no-overlaps variant too — never
show an empty state, show their closest call instead.

**6 · Goals — Apple Action Button pager.** Full spec in DESIGN.md §8. Full-screen
horizontal pager, 120pt copper line glyph at 35% height, title in `display`, one
explaining sentence in `body`/`textSecondary` below. Horizontal rail of
neighbouring glyphs at 78% height, centre at 1.0 scale and lit, flanks at 0.6 and
`textTertiary`. `.selection` haptic on every detent. Tap centre glyph to toggle:
selected gets a 2.5pt copper ring and its title turns copper. Button reads
**CONTINUE (3 SELECTED)**. Eight goals, each with its own glyph and sentence.

**7 · Progress photo.** Optional. Copy: *"Want a before photo? It stays on your
phone, never leaves the device, and nobody sees it but you."* Primary: Take a
photo. Tertiary: Skip. Copy is about consistency over time, never about
appearance — no body-type language anywhere. Camera state and confirm state.

**8 · Sleep.** Wake and bed as dual-handle range sliders in RISE's style (see
their "In bed / Wake up" screen — a labelled tick rail with a copper-filled
selected span). Hero visual: the day as a vertical copper curve down the side,
redrawing live as they drag.

**9 · Meals.** Breakfast, lunch, dinner windows, same rail control. A fasting
toggle that collapses the breakfast row when enabled, animated.

**10 · Schedule reveal.** The generated timetable animating in block by block at
40ms stagger. Reason lines in `caption` under items the engine moved only:
*"Calcium moved to evening — it blocks zinc absorption."* Nothing under items
that didn't move.

**11 · Notifications.** A real rendered iOS notification mocked on the screen
(mirror Bevel's "Time to wind down" onboarding screen). Then the system prompt.

**12 · Paywall.** Three tiers per PRODUCT.md §5. Annual pre-selected with the
trial framed as the default. Lifetime given real visual weight, not buried.
Feature list in two columns: free versus Full Panel. One dismissable X, top
left, not disguised.

### THE GATE

**13 · Check-in gate.** Spec in DESIGN.md §7. Full-screen takeover. Particle
field, `copperGlow` spotlight behind a content block at 50% height. Item name in
`display`, dose in `label`, scheduled time in `caption`. Full-width **YES,
TAKEN**. Beneath it, **Not yet** as tertiary text at 60% visual weight. No nav
bar, no tab bar, no corner skip. Build the dismissal: 0.4s upward wipe revealing
Today, with the copper ring fill and haptic firing on YES first.

### MAIN APP

**14 · Today.** Header "TODAY ⌄" centred in `sectionLabel` style, avatar top
right. Then: hero card (next dose), alerts card (build both present and absent
states — absent is the normal case), timeline card, today's total strip. 40pt
between sections. The timeline is the important one: time blocks anchored to
waking/meals/bed, each holding its items, a `now` marker between blocks, passed
blocks dimmed, reason lines only on moved items, tap-circle-to-log with the
copper ring animation, swipe-to-skip revealing reason options.

**15 · Stack.** Sections: Active, Running low, Paused, Archived. Rows not cards —
68pt tall, 10pt copper dot at left (0.5 opacity, filling to 1.0 when taken
today), name and dose, time and chevron right. No dividers, 8pt of space
instead.

**16 · Item detail.** Full ingredient breakdown, each ingredient as a bar against
RDA and UL. What it interacts with. When it's scheduled and why. Inventory with
run-out date and the quiet 30-day "About 12 left?" reconciliation row. History
and adherence. Notes.

**17 · Add sheet.** Scan barcode · Photograph label · Search · Enter manually ·
Add a protocol · Add a progress photo. Sheet with 28pt corner radius per
DESIGN.md.

**18 · Analysis.** Six cards: nutrient totals (bars against RDA and UL, sorted by
proximity to the ceiling), ratios (zinc:copper, calcium:magnesium,
omega-6:omega-3), interactions (with a "fix this" action), progress (collapsed
three-thumbnail strip expanding to a chronological grid), adherence (30/90 day
trend), cost (monthly spend, cost per serving). This is the one screen where
density is allowed.

**19 · Profile.** Streak card first — 7-row dot grid, no grid lines, filled
copper for complete days, 35% copper for partial, hollow `copperDim` ring for
missed, 2pt `copperLight` outer ring on today. Rolling 12 weeks, horizontally
scrollable. Current and longest streak as two numerals above. Then quiet grouped
rows: You, Your day, Notifications, Units, Data, Sources & method, Subscription.

**20 · Year in review.** Full takeover, no chrome. First photo and most recent
side by side. Numbers above: days logged, longest streak, doses taken, limits
caught. Copy about consistency, never appearance — *"You showed up 284 days this
year."* One action: Save this. Photos excluded from the share card unless
explicitly added with a second tap.

### STATES TO BUILD EVERYWHERE

Over-limit inverted tile · empty stack · first day with no history · scanning
failure and manual fallback · Reduce Motion (static particle frame) · Reduce
Transparency (solid `#121212` cards) · Dynamic Type at accessibility size 3.

---

## RULES YOU WILL BE JUDGED ON

1. Pure black background. Never dark grey, never a gradient, never a photo.
2. Copper is the only accent. `#FF453A` appears only in the critical state.
3. Colour carries information. Nothing is coloured for decoration.
4. One hero number per screen, everything else at least three steps smaller.
5. Separation by space and edge. No drop shadows. No dividers between list rows.
6. Maximum four metric tiles above the fold.
7. Only the particle field animates without user input.
8. Inversion is reserved for over-limit. Nothing else ever inverts.
9. Every onboarding screen carries a headline, a visual, and either an input or
   a payoff. No screen exists to hold one lonely toggle.
10. If a screen feels crowded, remove something. Never shrink it.
11. Copper is banned on text at 17pt and below on black — contrast is ~5.9:1.
    Small copper text exists only on the inverted tile.
12. Minimum 44×44 hit targets, including the 10pt stack-row dots.

Do not stop partway to ask which screens to build. Build all of them, then
report what you'd change.
