# Final pass. After this I am recording — nothing else changes.

Two fixes, one verification sweep, then stop. Do not refactor anything not
listed here. If you think something else is wrong, tell me, do not fix it.

`reco_fit_reference.html` in the repo root is current and correct. Re-read it.

---

## 1. Disc formula — the subtraction was binding, not the cap

```
disc = clamp(72, cardH - 32, 110)      // was cardH - 36
capsule = round(disc * 1.127)
```

`-36` gave disc 106 / capsule 119 at cardH 142, against the documented 110/124.
Raising the cap to 114 does nothing, because `min(114, 142-36)` is still 106.
The subtraction had to move.

Resulting values, which is what `--cell` must compute to:

| cardH | disc | capsule (`--cell`) |
|---|---|---|
| 142 | 110 | **124** |
| 140 | 108 | 122 |
| 138 | 106 | 119 |
| 127 | 95 | 107 |

## 2. Make the rotation smooth

The animation is correct but the timing was not. Three changes.

**a. All three capsules run at exactly `4s`.** Not 5.0 / 5.8 / 6.4.

120 frames over 4s is 30fps, which means each frame is held for **exactly two
display refreshes** on a 60Hz screen. That is what makes it look smooth. At 5.8s
a frame lands every 48.3ms — 2.9 refreshes — so frames get held for 3 refreshes
then 2 then 3, and that irregularity is visible as judder. Non-integer refresh
multiples are the single biggest cause of "it looks choppy" here, and it is
worse on camera than in person because the recording samples it again.

**b. Stagger by phase, not by speed.** Same 4s duration, different negative
delays, so they start mid-cycle and never line up:

| item | `--spin` | `--delay` | `--rot` |
|---|---|---|---|
| Copper + Zinc | 4s | 0s | -74deg |
| Omega-3 | 4s | -1.333s | +68deg |
| Collagen | 4s | -2.667s | -61deg |

Visually this is indistinguishable from three different speeds, and all three
stay refresh-aligned.

**c. Add these two lines to `.cap`:**

```css
will-change: background-position;
backface-visibility: hidden;
```

`will-change` is safe here specifically because `.cap` sits **inside** the card.
It is not an ancestor of the glass, so it cannot create a backdrop root. Do not
put `will-change` on the card, the stack, or any wrapper.

**d. Preload the sheet** so the first revolution is not a stutter while a 560KB
PNG decodes:

```html
<link rel="preload" as="image" href="/capsule_sheet.png">
```

Use `capsule_sheet.png` (12 cols x 10 rows). Your `capsule-sprite.webp` is
10 x 12 — the transpose — and will silently render scrambled against these
numbers.

If it still reads steppy on the device, the only other lever is `2s` (60fps,
one frame per refresh). Faster, but perfectly smooth. Do not pick anything
between 2s and 4s.

---

## Do not touch

Everything below is measured and working. Changing any of it costs me a
re-record:

- the `.wash` layer — it is what the glass is made of, not decoration
- the card glass: `rgba(255,255,255,.025)` fill, `blur(26px) saturate(300%)
  brightness(1.75)`, and the inset rim shadows
- the derived card-height formula and the `RESERVE` of 96
- the `why` copy — it is short because that is what stopped it clipping at 390
- frames 8 / 59 / 11 and the `rot` values
- `contrast(1.14) brightness(.98)` on the capsule — no saturate, no hue-rotate
- the `recCount` clamp and the three fallback levels
- the stepper capped at 3
- the arc anchored rather than transformed

## Verify, then report once

Run all of it before replying. One message, no partial reports.

1. `--cell` computes to **124** at cardH 142. State the number.
2. All three `.cap` elements report `animation-duration: 4s`.
3. ob6b through ob6, and cold from the toolbar: **3 cards, zero text overflow,
   zero scrollable elements in a mobile context.**
4. Glass still live: mean and standard deviation of an empty region inside each
   card, plus the lime test on `#pf`. No sd near zero.
5. Full walk with all three selected: ob6 -> ob6b -> ob10 -> Today -> Stack ->
   Analysis. Nothing blank, zinc reads 113%.
6. `npm run build` completes clean — `tsc -b` included.

Then say **ready** and nothing else.

---

## After you say ready — my side, not yours

```
cd "C:\Users\deeka\OneDrive\Desktop\pill"
npm run build
vercel --prod
```

Then on the phone: open the URL in Safari, Share -> Add to Home Screen, launch
from the icon, record.

**Check Settings -> Accessibility -> Motion -> Reduce Motion is OFF before
recording.** The `prefers-reduced-motion` branch stops the capsules dead and
rests them on a static frame. If that setting is on, the animation will not
play and nothing in the code is wrong.
