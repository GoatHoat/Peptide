# Add the recommendation screen to onboarding

`reco_reference.html` is a working, browser-verified implementation of this
screen. **Port it. Do not redesign it, and do not rebuild it from this
description** — this file only covers where it slots in and how it wires up.

Read the comment block at the top of `reco_reference.html` first. It documents
five things that break silently if you change them.

---

## 1. Where it goes

It is **one screen**, inserted directly after Goals, using the same suffix
pattern as the existing `ob5b`:

```
ob6   Goals
ob6b  Recommendations   ← new
ob7   Progress photo
...
```

Do not renumber the existing screens. Add `'ob6b'` to the `Screen` union, to
`ONBOARDING_ORDER` right after `'ob6'`, and to the dev toolbar list.

**If a previous pass created extra recommender screens (`rec1`–`rec5` or
similar), delete them,** and restore any onboarding screens that were rewritten
to accommodate them. This replaces all of that.

## 2. Where the content comes from

- **Number of cards** = the count chosen on the Goals stepper. Three fit on
  screen; the rest are reached by swiping the rail. If the user picked 1, render
  one card and one dot.
- **Which items** = the recommendations for the goal selected on ob6. Pull them
  from `src/data/mock.ts`; do not hardcode them in the component.
- The reference file's `ITEMS` array shows the exact shape each card needs:
  name, dose line, capsule frame index, and the `why` prose as HTML.

## 3. Selection

Tapping a card toggles it. That selection is the point of the screen, so it has
to persist and be used:

- store the selected ids in the app store, alongside the other onboarding answers
- default the **first card selected** so the CTA is never dead on arrival
- the bottom CTA shows the count — "Create schedule · 2" — and dims to 45% when
  nothing is selected
- tapping **Shop** must not select the card; it stops propagation and does
  nothing else (dead link for the demo)

## 4. What the CTA does

"Create schedule" advances to the next onboarding screen. The **selected items
become the schedule** — so ob10's schedule reveal and everything downstream
(Today, Stack, the audit) must reflect what was chosen here, not a fixed list.

If the user deselects everything the button is disabled, not hidden.

## 5. The parts that break silently

All five are documented in the reference file's header with the reasoning.
Re-read it before changing any of them:

- **Glass** — see `docs/GLASS_RULES.md`. An ancestor `transform` from an
  entrance animation is the most likely thing to flatten every card. A
  transform on the card itself is fine; a transform on a wrapper around it is
  not.
- **Horizontal scroll** — `.rail` is the only horizontally scrollable element.
  Every ancestor must have `scrollWidth === clientWidth`, or the whole page
  pans sideways.
- **Rail right padding** is asymmetric on purpose (`0 64px 0 24px`) so the last
  card can reach its snap position.
- **Particle wave** — phase comes from position, never `Math.random()`. Random
  phase is noise, not a wave.
- **Circle sizing** — `0.565 × imageBox` must stay under
  `(circleDiameter / 2) − 10`, or `overflow: hidden` slices the capsule and you
  get a flat white cut across its outline.

## 6. The capsule

Expects `capsule/frame_0001.png` … `frame_0120.png` at about 360px. Build a
**sprite sheet** and animate with `background-position` + `steps(120)`. Do not
swap `img.src` on a timer — that decodes an image every frame and will be
visibly choppy.

Each card starts on a different frame so the capsules are not in sync.

---

## When you're done

Load `ob6b` cold from the dev toolbar and confirm: the correct number of cards,
the glass genuinely showing particles through it, only the rail scrolling
sideways, the dots tracking, tapping a card toggling it, and the CTA count
updating. Tell me which of those you actually checked versus assumed.
