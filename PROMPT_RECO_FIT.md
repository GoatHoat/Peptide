# ob6b is rendering zero cards. Fix that, then swap in the fit layout.

`reco_fit_reference.html` is a browser-verified implementation of the new
layout. **Port it. Do not redesign it and do not rebuild it from this
description.** Read the comment block at the top of that file first.

---

## 1. The actual bug: the rail is empty

On the current build, ob6b renders the heading, the sub, the "six we left out"
card and the CTA — and **no recommendation cards at all**. The "left out" card
has slid up into the space where the rail should be, which is why the screen
looks like the rail was never there.

That means `ITEMS` (or whatever you mapped it to) is resolving to an empty
array. The rail element exists and renders zero children, so nothing errors and
nothing appears.

Find out which of these it is before changing any CSS:

- the ob6 goal selection isn't reaching ob6b, so the lookup is filtering on
  `undefined` and matching nothing
- `recCount` is `0` or `undefined`, and you're doing `.slice(0, recCount)`
- the goal key on ob6 doesn't match the key in `src/data/mock.ts` — e.g. ob6
  stores `"skin-hair"` and mock.ts keys on `"skinHair"`
- ob6b is being loaded cold from the dev toolbar with no onboarding state at
  all, so there is no goal to look up

**Then add a fallback so this can never be a blank screen again.** If the lookup
returns nothing, fall back to the three skin-and-hair items rather than
rendering an empty container. A demo screen that silently renders nothing is
worse than one showing defaults.

Tell me which of the four it actually was. Do not just make the cards appear.

## 2. The "six we left out" block is not a card

In the screenshot it reads as a flat opaque grey slab, and it's the one element
on screen that looks unfinished.

It has `backdrop-filter` set, so it is *probably* working correctly — there are
almost no particles behind it at that position, and glass over black looks like
exactly that. But it doesn't matter which it is, because it shouldn't be a card
at all.

**Make it plain text.** No background, no blur, no radius, no padding box. Just
two lines at 12.5px, `rgba(255,255,255,.38)`, with the supplement names in
`rgba(255,255,255,.62)`. It's a footnote, and styling it as a card gave it the
same visual weight as a recommendation, which is wrong. It also buys back about
70px of vertical space, which is what makes item 3 possible.

## 3. Everything fits on screen. Nothing scrolls.

The rail is gone. Three cards stack vertically and all of them are visible
without any scrolling, in any direction.

Measured at 402×874, which is what the reference file is built and verified at:

| element | top | bottom |
|---|---|---|
| h1 (2 lines) | 72 | ~147 |
| sub | 160 | ~182 |
| card 1 | 200 | 342 |
| card 2 | 362 | 504 |
| card 3 | 524 | 666 |
| left-out text | 686 | 723 |
| CTA | 780 | 836 |

Card height 142, gap 20, stack inset 24px each side.

**Card layout is a horizontal row**, not the old vertical poster:

```
[ 110px disc, capsule 124px on top of it ]  [ name / dose / why ]  [ tick ]
```

- `.stack` is `display:flex; flex-direction:column` at a fixed `top:200px`.
  It is **not** a scroll container. If content ever grows, shrink the content —
  do not put `overflow:auto` back.
- the left-out line is positioned in JS directly under the stack, so it still
  sits correctly when the user picked 1 or 2 items instead of 3.

### Counts other than 3

The ob6 stepper goes to 5. Three fit at 142px each. For 4 and 5, shrink the
card height and drop the `why` line — do not reintroduce scrolling and do not
reintroduce the rail:

| count | card height | gap | show `why`? |
|---|---|---|---|
| 1–3 | 142 | 20 | yes |
| 4 | 118 | 14 | no |
| 5 | 96 | 12 | no |

Check 1, 3 and 5 and tell me what each produced.

## 3b. No times on this screen

There is no time chip and no "with food" line on the cards. Scheduling is what
the next screen does — putting a fixed time on a recommendation the user hasn't
accepted yet states an outcome before they've made the choice, and it makes the
schedule reveal redundant when it lands.

Dose stays. Timing does not appear until ob10.

## 4. The capsule

### Asset naming — check this before anything else

The reference file loads `frames/c000.png` … `c119.png` (zero-indexed, that is
just how my scratch folder is laid out). **The app ships
`capsule/frame_0001.png` … `frame_0120.png` (one-indexed).**

They are the same 120 frames. The mapping is:

```
reference  c{NNN}      ->  app  frame_{NNN+1}
reference  c077.png    ->  app  frame_0078.png
```

In the reference, `ITEMS[].f` is already the **one-indexed** number and the
template subtracts 1 when building the filename. So in the app, use `f`
directly: `f: 78` -> `capsule/frame_0078.png`. Do not subtract anything.

If the capsules come out looking slightly wrong-angled, this off-by-one is why.

### Which frames — I gave you the wrong rule. Here is the correction.

**Ignore "use frames 76-86". That instruction was wrong and it is why the
capsules render as a pale blob.**

I picked those frames by mean brightness. Mean brightness is the wrong metric:
a frame is bright precisely when the pale half is facing camera and the dark
half is foreshortened behind it. Measured across all 120 frames, the visible
pixels of frames 76-86 are **84% light / 16% dark** — there is barely any dark
half left to see, so at 96-110px it reads as one pale lozenge.

The right metric is **light/dark balance**: `min(dark_fraction, light_fraction)`
over the non-transparent pixels. Frames **3-13 and 55-65 measure a true 50/50
split** and read unmistakably as a capsule at demo scale.

| frames | dark | light | balance | reads as |
|---|---|---|---|---|
| 76-86 | 0.15 | 0.85 | **0.15** | pale blob |
| 3-13, 55-65 | 0.50 | 0.50 | **0.50** | a capsule |

The reference now uses frames **8, 59 and 11**.

Those source frames are broadside *horizontal*, so each carries an explicit
`rot` that stands it up: **-74, +68, -61**. That is the vertical look you were
asked for, now baked into the data instead of being a deviation — see below.

### Filter

The old `saturate(.72) hue-rotate(-13deg) brightness(.94)` washed the pill out
at this size. The asset already renders copper; the saturate was fighting it.

```css
filter: contrast(1.14) brightness(.98) drop-shadow(0 8px 18px rgba(0,0,0,.9));
```

Contrast alone keeps the two halves separated. Do not add saturate back.

### The capsules ROTATE CONTINUOUSLY. That was my error, not yours.

My earlier reference baked a single static frame per item, and I told you to
port it without redesigning. You did exactly that, and the rotation you had
working got dropped. **The reference now animates**, and that is the intended
behaviour: a continuous 360 degree rotation, always, on every card.

Also correcting myself: **the balance rule only governs which frame it RESTS
on.** In motion the foreshortened frames read as the pill turning edge-on,
which is what is physically happening. Do not try to keep the animation inside
the balanced window — run the full 120.

`capsule_sheet.png` ships with this: **12 columns x 10 rows of square cells,
120 frames, row-major** (cell 0 = frame 1, top-left, reading across).

```css
.cap{
  width:var(--cell); height:var(--cell);
  transform:translate(-50%,-50%) rotate(var(--rot));
  background-image:url(capsule_sheet.png);
  background-repeat:no-repeat;
  background-size:calc(var(--cell)*12) calc(var(--cell)*10);
  animation:spinx calc(var(--spin)/10) steps(12) infinite,
            spiny var(--spin)           steps(10) infinite;
  animation-delay:var(--delay),var(--delay);
}
@keyframes spinx{from{background-position-x:0}
                   to{background-position-x:calc(var(--cell)*-12)}}
@keyframes spiny{from{background-position-y:0}
                   to{background-position-y:calc(var(--cell)*-10)}}
```

**The offsets must be pixels, not percentages.** I tried percentages first and
got three empty discs: percentage `background-position` resolves against
(container - image) size, not as a multiple of cell width, so `-1200%` throws
the sheet off canvas. `--cell` is set from JS on each layout pass, which is
what keeps it responsive.

Per-item speed and negative delay so the three are never in sync:

| item | `--spin` | `--delay` | `--rot` |
|---|---|---|---|
| Copper + Zinc | 5.0s | 0s | -74deg |
| Omega-3 | 5.8s | -1.9s | +68deg |
| Collagen | 6.4s | -3.7s | -61deg |

Negative delays start each mid-cycle, so nothing lines up on load.

Add a `prefers-reduced-motion` branch that stops the animation and rests on a
balanced frame — `background-position: calc(var(--cell)*-7) 0` is frame 8.

**If you reuse the existing `public/capsule-sprite.webp` instead of my sheet,
tell me its grid dimensions first** — the 12 and 10 above are specific to
`capsule_sheet.png` and silently produce garbage against a different layout.

### The rotation conflict — you were right

You kept the vertical tilts over the reference's near-horizontal 0/-22/+17 and
flagged it as a deliberate deviation. That was the correct call, and the
reference file has now been updated to match, so it is no longer a deviation
from anything. `rot` is a per-item field in `ITEMS`.

## 6. Card height derives from available space

Your formula was right and I have adopted it in the reference, with the reserve
at 96. Measured in the browser at four viewport heights:

| viewport | card height | clearance to CTA | text overflow | scrolls |
|---|---|---|---|---|
| 402x874 | 142 | 57px | none (-55/-38/-38 headroom) | no |
| 393x852 | 140 | 41px | none (-36 each) | no |
| 390x844 | 138 | 39px | none (-34 each) | no |
| 375x812 | 127 | 21px | none (-23 each) | no |

402x874 still lands on exactly 142, so the reference geometry is unchanged.

### The clipping was the copy, not the height

Your height maths was right — the `why` strings were too long. At 390 wide the
text column is about 170px, and a 57-character `why` under a two-line title
needs three lines it does not have. Shortened in the reference to fit two lines
at that width:

| item | why |
|---|---|
| Copper + Zinc | "Most zinc pills leave out copper." |
| Omega-3 | "Real EPA and DHA on the label." |
| Collagen | "Cheap and safe. Evidence is mixed." |

Shorter is better here anyway — this is a card someone reads in two seconds.

The disc and capsule scale with the card: **`disc = clamp(72, cardH-32, 110)`**,
`capsule = round(disc * 1.127)`.

The offset is **32, not 36**. You caught that -36 yields disc 106 / capsule 119
at cardH 142, against the documented 110 / 124. Your diagnosis was right; the
fix you proposed was not — raising the cap to 114 changes nothing, because at
cardH 142 the binding term is `142-36 = 106`, and the 110 cap is never reached.
The subtraction is what had to move. At -32: 142 -> 110/124 exactly, 140 ->
108/122, 138 -> 106/119, 127 -> 95/107. And `why` hides below `cardH < 118`,
which is what makes 4 and 5 items possible without scrolling.

## 7. Items 4 and 5 — your call was right

You were right not to invent them. `PROMPT_STACK3.md` authors exactly three and
says not to add more, so the stepper capping at 3 is correct behaviour, not a
bug. Leave it. If the stepper reading 1-5 while only ever producing 3 bothers
you on camera, cap the stepper at 3 rather than authoring filler.

## 8. The arc

Anchoring it as a fixed 402x874 box rather than transforming it was the right
tradeoff — a transform would have made it a backdrop root and flattened its own
glass, which is exactly the trap in `GLASS_RULES.md`. 12px of clipping behind
the tab bar is a fair price. Leave it.

## 5. Liquid glass — the fill is NOT where the transparency comes from

The cards were reading as opaque grey panels. Two causes, and the second is the
one that actually mattered.

**a. The fill was too heavy.** `rgba(255,255,255,.075)` over a near-black
screen *is* the grey you were seeing — on black, a white fill is indistinguishable
from opacity. It is now `rgba(255,255,255,.025)`, and the read comes from
amplifying what sits behind the card instead:

```css
backdrop-filter: blur(26px) saturate(300%) brightness(1.75) contrast(1.04);
```

**b. There was nothing behind the cards to see.** This is the real one. I
measured the empty right-hand strip of card 2 over the old backdrop: mean
luminance **6.0, standard deviation 0.00**. Perfectly flat. The glass was
working correctly and faithfully showing a sheet of pure black. No CSS value
fixes that.

So there is now a `.wash` layer — five blurred radial gradients spanning the
full width behind the whole stack — placed specifically so that **every card,
across its entire width, has colour to refract.** After it: card 1 mean 26,
card 2 mean 10, card 3 mean 24, all with visible structure.

**If you move, resize or delete `.wash`, the cards go flat again.** It is not
decoration; it is the thing the glass is made of.

**c. Edges.** Real glass catches light on its rim. The card has a top specular
(`inset 0 1px 0 rgba(255,255,255,.20)`), a left catch, a bottom bounce, a
133° gradient hairline on the top-left corner arc via a masked `::before`, and
an outer `0 10px 26px rgba(0,0,0,.42)` so it lifts off the backdrop. Do not
replace any of that with a flat four-sided 1px border — that is the single
biggest AI-design tell and it's in `docs/DESIGN_V2.md`.

### Verify it, don't eyeball it

Screenshot the screen, then measure the mean and standard deviation of an empty
region inside a card — one with no capsule, no text and no tick. Standard
deviation near zero means the card is sitting over nothing and you have a flat
panel, whatever it looks like to you at a glance.

I also ran the lime test — tinting `#pf`, the element the cards actually
sample — and all three cards tint green.

The trap, already in `GLASS_RULES.md`: tint the element the card **samples**,
not an ancestor. Tinting the phone frame fails because `Device` paints
`bg-black` over it, so the card is correctly sampling black and the test reports
a false failure.

If you add an entrance animation to this screen, animate the **cards
themselves**, not a wrapper around them. A `transform` on a wrapper creates a
new backdrop root and every card goes flat grey.

---

## When you're done

Load ob6b cold, and again through ob6 with the goal set. For each, tell me:

1. how many cards rendered
2. what the empty-rail bug actually was
3. whether the glass survived — say which check you ran, not that it "looks
   right"
4. whether anything on the screen scrolls in either direction
5. the count at 1, 3 and 5

Say which of those you actually checked versus assumed.
