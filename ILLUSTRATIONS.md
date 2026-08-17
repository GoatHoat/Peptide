# Illustration shot list

Everything in one visual system: isometric solids, matte near-black, every edge
traced in a thin hairline, glyphs engraved into the top face as hollow outlines,
transparent background, 512×512.

## The one rule that keeps it coherent

**White hairlines for objects that describe something. Purple hairlines for
objects that want you to act.**

So the seven goal slabs stay white — they are informational. The empty states go
purple, because an empty state is asking for something. Nothing uses both, and
nothing is ever filled with colour.

## The style block — paste at the end of every prompt, unchanged

> Isometric 3D render. Matte near-black surface. Every edge traced with a thin
> crisp {white | #7B5CFA purple} hairline, like a technical wireframe drawn over
> a solid form. True isometric camera from above and slightly to the left,
> identical angle in every image. Soft diffuse light from directly overhead. No
> cast shadow, no gradient, no glow, no reflection, no texture, no fill colour.
> Pure transparent background, object centred with generous margin. 512×512.

Generate at 1024 and downscale. Hairlines are the first thing a generative model
loses, and you want headroom to check they survived.

---

# 1. `growth.png` — do this one first

Your seventh goal is a broken image right now: `goals.tsx` points at
`/goals/growth.png` and `public/goals/` only has six files.

> A rounded-square isometric slab, low height, identical proportions and camera
> to a set of existing matching slabs. A simple upward-pointing arrow engraved
> into the top face as a hollow hairline outline, no fill. White hairlines.

Match the existing six exactly — it sits in a grid with its siblings and any
drift in height, corner radius or camera angle will show immediately.

---

# 2. Empty stack — the pill box

> An empty seven-day pill organiser, isometric, lying flat. A shallow rectangular
> box divided into six equal square compartments in a single row, all of them
> empty. The hinged lid is open, standing up and back at roughly seventy degrees,
> its underside visible. Every edge and every compartment divider traced in thin
> purple hairlines. Nothing inside.

The open lid is doing the work — a closed box reads as storage, an open empty one
reads as waiting to be filled. Purple, per the rule above.

---

# 3. The onboarding questions

One object each, all deliberately different shapes. The failure mode you flagged
before — six panels of the same thing — is what makes a set look generated rather
than designed.

### Profile (age and sex)

> A long isometric bar lying flat, with evenly spaced tick marks engraved across
> its top face like a ruler, and one tick noticeably taller than the rest. White
> hairlines.

It echoes the ruler control already on that screen, so the picture and the
interaction agree.

### Diet (anything you don't eat)

> A square isometric tray divided into four equal compartments. Three
> compartments are present and empty; the fourth is missing entirely, leaving an
> open notch in the corner of the tray. White hairlines.

Something removed from a meal, without drawing food. Nobody has to guess whether
that's a steak.

### Your day (wake, sleep, meals)

> A long isometric bar lying flat, divided into four segments of clearly unequal
> length by grooves engraved across the top face. White hairlines.

A day as an object you can cut up. No clock, no sun, no moon — the moon is
already the sleep goal and you would be repeating yourself.

### What you take now

> A flat isometric plate with three capsule silhouettes engraved into its top
> face as hollow hairline outlines, arranged in a row. The plate is solid; only
> the capsule shapes are cut into it. White hairlines.

An inventory stamp rather than a container — keeps it distinct from the pill box.

### Anything that hasn't agreed with you

> A rounded-square isometric slab with one corner cleanly cut away at an angle,
> the cut face flat and visible. Every edge including the cut traced in thin white
> hairlines. Nothing else on the top face.

Something didn't fit, said without a warning triangle or a frowning anything.
This screen is asking people to admit a problem; the picture should be calm.

### How you prefer to take things

> Four separate isometric solids sitting in a row on an invisible surface, evenly
> spaced, not touching: a capsule (rounded stadium), a tablet (flat disc), a small
> cube, and a short cylinder. White hairlines.

No tray here — a second compartment object would collide with the pill box. Four
loose solids on a surface is a different composition entirely.

---

# 4. Worth making, lower priority

### Welcome

> Your capsule mark as a real isometric solid: a rounded stadium body lying flat,
> with a single groove engraved straight across the top face at the midpoint,
> dividing it in two. Purple hairlines.

Puts the logo in the same world as the rest of the app on screen one.

### Building recommendations (the loading screen)

> Five thin isometric slabs stacked flush, with the third from the top lifted
> slightly out of alignment and offset forward. White hairlines.

Same family as your stacks image on the website, so the two share a language.

### No doses today

> The same long segmented bar as the day screen, but hollow: hairline edges only,
> no solid faces, so the form reads as an outline of a bar rather than a bar.
> Purple hairlines.

---

# What not to illustrate

The paywall, the survey questions with option lists, the results screen, the
schedule reveal, and notifications — the bell glyph already there is a UI icon
and does not need replacing.

Seventeen onboarding screens with art on every one is a slideshow. Art at the
handful of moments where someone is waiting or looking at nothing is what reads
as expensive. Restraint is in your own design rules; this is where it applies
most directly.

---

# Before you drop them in

- Every file 512×512, transparent PNG, under 200 KB.
- Put the seven goal slabs side by side at 96px and confirm the camera angle,
  corner radius and slab height match across all seven. This is the one set where
  inconsistency is visible at a glance.
- Check every hairline survived the downscale. If a line broke up, regenerate
  rather than sharpening it — sharpening produces the crunchy edge that makes
  generated art look generated.
