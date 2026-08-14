# Build Halfpast — exact replica of the Figma screens, iOS-native feel

Build a React + Vite PWA that reproduces the three attached screens pixel for
pixel, then make it *feel* like a native iOS app rather than a website in a
phone-shaped box.

**Reference images live in `design/`:** `today.png`, `discover.png`, `you.png`.
They are 1206 × 2622 — exactly **3×** the target viewport of **402 × 874**.
Divide every measurement you take off them by 3.

Figma source: `https://www.figma.com/design/1lSwnadn3fioIZ8xfwD8et`

Read this whole file before writing code. Section 4 is the part that matters
most and it is the part most likely to be done badly.

---

## 0. Stack

- Vite + React + TypeScript
- **No UI library.** No shadcn, no Chakra, no Radix. Hand-written CSS.
- `framer-motion` is permitted and recommended for the tab interaction only
- No Tailwind unless you already have it configured — plain CSS modules or a
  single stylesheet is fine and easier to match to exact values

Ship as a PWA that installs to the home screen. Details in section 5.

---

## 1. Design tokens

Define these once, use them everywhere. No other colours anywhere in the app.

```css
--bg:            #000000;   /* true black, not #0A0A0A */
--card:          #16161A;
--card-hi:       #1E1E22;   /* pressed / elevated */
--purple:        #7B5CFA;
--purple-dim:    rgba(123, 92, 250, 0.35);

--t1: rgba(255,255,255,1.00);  /* headings */
--t2: rgba(255,255,255,0.62);  /* body */
--t3: rgba(255,255,255,0.38);  /* captions, placeholders */
--t4: rgba(255,255,255,0.22);  /* hairlines, inactive marks */
```

**Elevation is opaque steps, never 1px hairlines.** A `1px solid
rgba(255,255,255,0.1)` border is the single biggest "AI-generated app" tell —
do not use it anywhere.

Type scale, all with `letter-spacing` tightening as size grows:

| role | size | weight | tracking |
|---|---|---|---|
| screen title | 33 | 700 | -1.0 |
| big number | 44–52 | 700 | -1.5 |
| section title | 17 | 600 | -0.45 |
| body | 15 | 400/500 | -0.1 |
| secondary | 13 | 400 | 0 |
| caption | 12 | 400 | 0 |
| label (caps) | 10.5 | 600 | +1.1 |

Side margins are **20px**. Corner radius: cards 18–22, tiles 15, tab bar pill
18, tab bar itself 26.

### Font — this matters for the native feel

```css
font-family: -apple-system, "SF Pro Text", "SF Pro Display", Inter, system-ui, sans-serif;
```

The mockups were drawn in Inter, but on an actual iPhone `-apple-system`
resolves to **real SF Pro**, which is what makes it read as native. Inter is
the desktop fallback. Do not load Inter from Google Fonts as the primary — a
web font request on a native-looking app is both slower and less native.

---

## 2. Fix these five things from the mockups

The screens are the source of truth **except** for these, which are known
problems. Fix them; do not reproduce them.

**a. The search bar on Discover is white.** It is the only light element in the
entire app and it breaks the system. Make it `--card` background, placeholder
text at `--t3`, magnifier at `--t3`. Height 46, radius 14, full width inside
the 20px margins.

**b. The week strip on Today has two meanings fighting.** Currently completed
days are filled purple and *today* is filled light grey, so today reads as the
odd one out instead of the important one. Change to:

- **today** = filled `--purple` cell, number in white
- **completed past days** = `--card` cell with a **4px purple dot centred below
  the number**
- **missed past days** = `--card` cell, number at `--t3`, no dot
- **future days** = `--card` cell, number at `--t4`, no dot

One property means one thing.

**c. The middle tab is labelled "Stack" but the screen is "Discover."** It is
Discover everywhere — tab label, route, component name, page title.

**d. The Today tab icon reads as an ⓘ at 17px.** The ring-plus-hand works large
and collapses small. Redraw it: keep the ring at 1.6px stroke but make the hand
**2.2px wide and only 4px long**, starting at the centre. If it still reads as
an info glyph at 17px, drop the ring and use a filled 5px dot at the centre
with a 4px hand.

**e. The large white rectangle on Discover** is a placeholder for a paper
thumbnail. Until real content exists, render it as `--card` with a centred
document glyph at `--t4` — not white.

### Labelled gaps

Some frames contain intentionally empty boxes with a text label inside naming
what belongs there. **Build the container, honour the label, and leave the
contents as a clearly-marked placeholder** — do not invent a feature to fill
it. If a gap has no label, ask me rather than guessing.

The one on You is the second square widget: build a `171 × 171` card matching
the calendar widget beside it, with the label text centred at `--t3`.

---

## 3. Screens

Three tabs: **Today · Discover · You**. No other tabs, no drawer, no nested
navigation except sheets.

### Today

Top to bottom: status time, `Today` title, the date at `--t2`, the 7-day week
strip, **the arc**, a `Schedule` divider, the timeline, the warning line.

**The arc** is the signature element. It is a **stroked path with round caps**,
not a ring segment and not a border-radius trick:

- flat, not a semicircle — roughly a 94° sweep on a 220 radius, so it spans
  about 322 wide and only ~70 tall
- stroke 8–9px, `stroke-linecap: round`
- four separate segments with gaps where the doses fall
- segments before "now" in `--purple`, after in `#252528`
- `7:30 AM` and `10:00 PM` at each end in `--t3`, 11px
- the count (`2`) and `left today` centred underneath
- build it as inline SVG with `<path>` and an `A` arc command — SVG supports
  arcs natively, unlike Figma vector paths

**The timeline** is a vertical rail at `--t4`, 2px wide, with dose rows beside
it. Each row: time at `--t3` on the left in a fixed 58px column, then name at
15/600 and dose at 12/`--t3` stacked, then a 24px circle on the right — filled
`--purple` when taken, 1.5px `--t4` ring when not. Taken rows drop their name
to `--t2`.

**The warning line** is plain text in `--purple`, 12px, not a card. Tapping it
opens the item sheet.

### Discover

Title, `Recommendations · Research` subtitle at `--t2`, the search field, then
a result card, then a list of related items each with a `See More` disclosure.

The result card holds: title in `--purple` 15/600, the thumbnail placeholder,
then two buttons side by side — **Add To Stack** filled `--purple` with black
text, and **Ask Question** outlined 1.5px `--purple` with purple text. Both
44px tall minimum.

### You

Title with the user's name, a streak line under it, then **two 171 × 171
widgets side by side with a 20px gap**, then the settings rows.

Left widget: the big number and a month grid — 7 columns, weekday initials
across the top at `--t3` 11px, week-start dates down the left at `--t3`, cells
as 14px rounded squares, `--purple` when complete and `#0E0E11` when not.

Right widget: the labelled placeholder.

Settings rows are `--card`, radius 16, 15/500 label on the left and a 13px
`--t3` value on the right.

---

## 4. The tab bar — this is the important part

This single component decides whether the app reads as native or as a website.
Budget real time here.

### Structure

A floating pill bar: `--card` background, radius 26, 8px padding, sitting
`calc(12px + env(safe-area-inset-bottom))` from the bottom, inset 20px each
side.

Three tab slots inside it. **The active indicator is ONE element that moves** —
not three backgrounds that toggle. This is the single most important
implementation decision in this file. Three toggling backgrounds always look
like a website. One travelling element looks like iOS.

```
<div class="bar">
  <div class="pill" />          <- one node, absolutely positioned, animated
  <button class="tab">…</button>
  <button class="tab">…</button>
  <button class="tab">…</button>
</div>
```

### The pill

It animates **both `x` and `width`**, because the active tab is wider (icon +
label) than the inactive ones (icon only).

Use a spring, not a duration ease. iOS never uses linear or ease-in-out for
this:

```js
transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 1 }}
```

That lands with a barely-perceptible overshoot, which is the thing that reads
as physical.

**The lift.** On `pointerdown` on any tab, the pill scales to `1.04` and its
shadow deepens from `0 2px 8px rgba(0,0,0,.4)` to `0 8px 20px rgba(0,0,0,.55)`
over 120ms. On `pointerup` it travels to the new slot and settles back to
`scale(1)`. The lift happens on press, the travel happens on release — that
separation is what makes it feel like you picked something up and put it down.

### The labels

Never let a label pop. The sequence:

- **outgoing label**: `opacity 1 → 0` over **110ms**, `x: 0 → -4`, starts
  immediately on press
- **pill travels**: the spring above, ~340ms to settle
- **incoming label**: `opacity 0 → 1` over **160ms** with a **90ms delay**, and
  `x: -6 → 0`, so it fades in *as the pill is arriving*, not before

Set `width` on the label wrapper to animate from `0` to `auto` — use
`framer-motion`'s layout animation, or measure and animate an explicit px width
if layout animation causes jitter.

### Icons

Icons never disappear. The active icon goes to `--t1`, inactive sit at
`rgba(255,255,255,0.42)`, cross-fading over 180ms. The active icon also scales
`1 → 1.06` on the same spring as the pill.

### Swipe between tabs

This is what people mean by "it feels native."

- horizontal drag anywhere on the content area moves between tabs
- **the content tracks the finger 1:1** while dragging
- **the pill position is derived from the drag progress**, continuously — not
  set on release. If the user is 40% of the way from Today to Discover, the
  pill is 40% of the way across and both labels are partially faded. This
  continuous coupling is the whole effect; a pill that jumps on release feels
  like a website with a swipe bolted on.
- on release, snap to the nearest tab **accounting for velocity** — a fast
  flick under 50% should still advance. Use the same spring.
- **rubber-band at the ends**: dragging left on Today or right on You moves at
  roughly 0.35× the finger and springs back
- lock the axis: once a drag is clearly horizontal, don't let it scroll the
  page vertically, and vice versa. Decide the axis within the first ~10px of
  movement and commit to it.

### Screen transitions

Content does not fade between tabs — it **translates**, like a native page
controller. The outgoing screen slides out as the incoming slides in, both
moving together at the same rate. No cross-fade, no scale.

### Haptics — read this before you try

**iOS Safari does not expose haptics to web apps.** `navigator.vibrate` is
Android-only and silently does nothing on iOS. Do not spend time on it and do
not ship a broken feature detection path. Add haptics only if this ever becomes
a native wrapper.

---

## 5. Everything else that makes it feel native

### Chrome removal

In `index.html`:

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover,
               maximum-scale=1, user-scalable=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#000000">
<link rel="apple-touch-icon" href="/icon-180.png">
<link rel="manifest" href="/manifest.webmanifest">
```

Manifest: `display: "standalone"`, `background_color` and `theme_color` both
`#000000`, icons at 192 and 512.

### The fake status bar

The mockups show `9:41` at the top. **On a real device in standalone mode, hide
it** — the real status bar is right there and two of them is the most obvious
tell in a screen recording. Keep it visible only in the desktop preview.

### Safe areas

`viewport-fit=cover` puts content under the notch and home indicator. Pad with
`env(safe-area-inset-top)` on the header and
`calc(12px + env(safe-area-inset-bottom))` on the tab bar. Use `100dvh`, never
`100vh` — `vh` doesn't account for Safari's collapsing toolbar and will cut off
the bottom.

### The four tells that scream "website"

```css
* { -webkit-tap-highlight-color: transparent; }
body {
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
}
```

Grey flash on tap, rubber-band past the top of the page, text selection handles
on a long press, and the 300ms double-tap zoom delay. One line each.

### Press states

Every tappable row and card gets an active state: background to `--card-hi` and
`scale(0.985)` over 90ms, springing back on release. Native iOS rows respond
instantly to touch — a row that does nothing until you lift your finger feels
dead.

### Scrolling

`-webkit-overflow-scrolling: touch` on scroll containers. Momentum scrolling is
half of what "native" means and it costs one line.

---

## 6. Verify before reporting

Run all of it, then reply once.

1. Screenshot each of the three screens at 402 × 874 and diff them against
   `design/*.png` scaled to 1×. Tell me where they differ and why.
2. Confirm the pill is **one element** — grep for it, there should be exactly
   one indicator node in the DOM at any time.
3. Drag halfway between two tabs and hold. The pill must be halfway. Screenshot
   it. This is the check that catches a fake implementation.
4. Confirm nothing scrolls horizontally at the page level, and
   `documentElement.scrollHeight <= innerHeight` on each tab.
5. Confirm no `1px solid rgba(255,255,255,0.1)` anywhere in the CSS.
6. `npm run build` clean, `tsc` included.

Then tell me which of those you actually ran versus assumed.
