# Decisions made without you

One line each: what was chosen, and why. Every one is the most conservative
option available — easiest to reverse, changes the least, cannot ship something
broken or non-compliant.

## Legal (PROMPT_LEGAL.md)

- **The documents live in `website/`, not `public/`.** Putting them back in
  `public/` would recreate the second copy the prompt asked to delete, because
  Vite publishes that directory into the app bundle. `website/` is inert to the
  build and is a directory you can point the site's deploy at.
- **Kept the `Terms of Use` / `Privacy Policy` link *labels* in the app.** The
  prompt asked that no screen render its own hardcoded legal text or route;
  these are the visible names of the links, not routes or policy text, and the
  URLs behind them all come from `legal.ts`.
- **Removed the `/terms` and `/privacy` rewrites from `vercel.json`.** They
  pointed at the two files that were just deleted, so leaving them would have
  been a rewrite to a 404.

## Tiers (PROMPT_TIERS.md / PROMPT_FINISH.md §2)

- **Entitlement falls back to `free` on any error.** If migration 0037 is not
  applied, or the device is offline, the hook reports free. Showing an upsell to
  somebody who has paid is annoying; the other way round gives away the thing
  they are paying for.
- **The catalogue cap is client-only, deliberately.** The prompt says so and I
  agree: the data is published NIH label filings and PubMed citations, so a
  server check would be theatre rather than a boundary.
- **`ProSheet`'s buy button says "Subscriptions are not switched on yet"
  rather than claiming success.** `purchase()` is still the stub that waits
  900ms and returns true; reporting that as an upgrade would be a lie a user
  could act on.

## PROMPT_FINISH §3b/§3c

- **Kept the catch-up slider at 56px, not the 132px-at-3x (44px) in the newer
  spec.** PROMPT_V2 §7 specified 56 and it is already built and tested at that
  height; 44 is also below the 44×44 minimum once the thumb inset is counted.
  Larger is the safer of the two and the change is one line if you disagree.
- **The catch-up card shows name, time due and amount, but no scheduler reason
  line.** `doses` does not store one — the reason lives in the solver's output
  at schedule-build time and is never persisted. Adding a column for it is a
  schema change I did not think worth making unasked; noted in the report.

## The reconstitution calculator (17 August)

- **Brought back as a unit converter with no substance in it.** You asked for
  it; `legal.md` records that the rejected version served *protocols* — ratios
  and amounts tied to named peptides — and that re-wording that did not help,
  because the function is what is evaluated. So the thing built is the half that
  has a different function: three numbers the user types, converted between
  units, attached to no product, with no defaults, no suggested range and no
  persistence. Those four absences are the compliance argument, not decoration.
- **`CLAUDE.md` amended rather than contradicted.** Its positioning section said
  "no injection-related UI anywhere". A rule the code breaks stops being a rule,
  so the exception is written into it, with the line that defines the exception:
  the app may do arithmetic on numbers it was given, and may never be the source
  of a number.
- **The 1.4.1 test was narrowed, not deleted.** It asserted "no calculator". It
  now asserts the property that actually distinguishes the two versions — every
  field starts empty, nothing on screen names a substance, nothing offers an
  amount — and it still checks the arithmetic is right. The half that has not
  moved, that nothing asks where an injection goes, is now its own test.
- **On Today, labelled "Reconstitution".** You picked the placement. The label
  is one word because the row holds two buttons at 375px and "Reconstitution
  calculator" does not fit on one line in half of that; the sheet title says it
  in full.

## Empty schedule (17 August)

- **Today's empty schedule reuses the pill-box drawing.** It had no illustration
  at all. `ILLUSTRATIONS.md` §4 specifies a distinct render for this state — the
  segmented bar, hollow — which does not exist yet. One coherent object across
  both empty states beats two half-matched ones, and swapping it later is one
  line.
- **The rail is not drawn on an empty day.** It is a 2px line marking the
  passage of the day beside the rows; with no rows it ran 200px down the side of
  an illustration and read as a rendering fault.

## The longer onboarding (17 August)

- **27 steps, not 28.** The prompt's arithmetic was 20 + six additions + two
  splits = 28. Splitting `profile` into age and sex adds one step, not two, and
  splitting `day` into window and meals adds one — so eight changes add eight
  screens to 20 minus one, because `free-pick` was already counted in the 20.
  27 is inside the 24–28 band and no step was padded to reach a number.
- **`day` splits by prop, not by component.** `Day` renders the sleep dial and
  the meal list already; `only="window" | "meals"` picks which. Duplicating the
  time-picker plumbing into a second component would have been the larger change
  for no behavioural difference.
- **`commitment` defaults to five days, not seven.** A default nobody chose
  should be the one most people keep, and a target missed twice in week one is
  a target people stop looking at.
- **`stack-insight` uses `checkPlacement` from `lib/conflicts.ts`** rather than
  its own rules, so the screen cannot promise a separation the schedule solver
  then fails to make.
- **`goal-priority` stores an order, not a weight.** The chosen goal moves to
  the front of the list; nothing is scored. A weight would need `recommend.ts`
  to grow a ranking model, which is a larger change than this screen earns.
- **Four new steps are in `SKIPPABLE`** — sex, stack-count, goal-priority,
  commitment — and each has a neutral default that produces the same result as
  answering: no sex, no count, no ranking, five days.

## The final runs (17 August)

- **Ran the two walkthroughs before the doodle rework**, despite the prompt
  saying "Do Part B first". The labels in that message contradict each other —
  Part A is the runs, Part B is the pattern, and the sentence explaining the
  order ("doing it second is how it got skipped twice") is about the runs. Doing
  the runs last is the exact failure being complained about, so the reason won
  over the label.
- **Deployed to Vercel when asked to.** The standing rule is never to push;
  the instruction to deploy was explicit and overrides it for that action only.
  Deployed a preview first, then production, on the `halfpast` project this repo
  is linked to. `www.pepstack.fit` is a different project serving the marketing
  site and was not touched.

## The doodle pattern (17 August)

- **Generated from `tools/doodle.py` rather than hand-edited.** The seamless
  wrap and the three-size/random-rotation field are arithmetic; doing them by
  hand is how the first version ended up with uniform spacing. Re-runnable and
  seeded, so a regeneration is reviewable as a diff.
- **Stroke width 5.0, not a literal hairline.** `background-size: cover` scales
  the 1179-wide canvas to about a third on a phone, so a 3px stroke lands
  sub-pixel and 0.09 alpha washes it to nothing. 5.0 renders at roughly 1.6px,
  which is what a hairline is meant to *look* like. The colour rule is obeyed
  exactly: `rgba(255,255,255,0.09)` and nothing else in the file.
- **Removed `.doodle-bg.welcome { opacity: 0.28 }`.** With the correct 0.09
  alpha now in the file, multiplying by 0.28 gave 0.025 and the pattern was
  invisible. Welcome is opacity 1; catch-up stays dimmer at 0.6 because cards
  and a drag control sit on it.
- **Deleted `public/doodle-pattern.png` (541 KB).** Nothing referenced it —
  `styles.css:2810` loads the SVG. The prompt asked for a re-export at the size
  the CSS uses; the CSS uses the SVG, so the honest answer was to delete the
  dead export rather than regenerate one nothing loads.

## The catch-up screen (17 August)

- **60-second foreground debounce.** `visibilitychange` fires on browser tab
  focus and can arrive in bursts, and the check costs an RPC that consumes a
  window. A minute is long enough that flicking between tabs is free and short
  enough that a real resume is caught — nobody backgrounds an app and returns
  inside a minute expecting to be told what they missed.
- **A dose is offered once per calendar day.** `getMissedSince` now returns
  everything past due and unmarked, which is the honest window but would show
  the screen on every launch until the last dose is ticked. Once a day is the
  rate limit; the marker is discarded when the date changes, so an untouched
  dose does come back tomorrow.
- **A second `visibilitychange` listener rather than extending the one in
  `Shell`.** That one is about notification scheduling and lives with the user
  id; this one belongs to a gate that only exists while signed in, and they have
  different debounces. Both are one-liners and merging them would put unrelated
  reasoning in one handler.
- **The shown-marker lives in local storage, not a table.** It is a nag limit,
  not a record. Losing it on reinstall costs one extra prompt.
- **`getMissedSince` keeps its `since` parameter** even though the lower bound
  is gone. Removing it would move the day-boundary reasoning away from the
  caller that owns it, and the parameter is where that reasoning is written
  down.

## The paywall and three layout faults (17 August)

- **The sheet's type comes from the app's scale, not from new `.pro-*` sizes.**
  `t-body-m` for the plan name and the price, `t-caption` for the note and the
  period, `t-label` for the badge. Every size I needed already existed, so no
  outlier was added. `.pro-plan-name`/`.pro-plan-amount` etc. carry colour and
  `display: block` only.
- **Selection is a border swap, not an extra border.** `.pro-plan.on` changes
  `border-color` from the hairline to the accent rather than adding a ring, so
  the row cannot change size when it is chosen.
- **The track width is a `useMotionValue`, not state.** `useTransform` takes it
  as a dependency so a resize recomputes the offset immediately, and it does not
  re-render the tree on every observer callback the way state would — this fires
  on rotation and on every window resize.
- **`useLayoutEffect` rather than `useEffect` for both measurements.** The point
  is to have the real width before the first paint; an effect runs after it,
  which is the fault being fixed.
- **`Tabs.tsx`'s width starts at 0, not at a guessed 390.** A guess that is
  wrong for one frame is a wrong offset for one frame; 0 with a guard is
  honest, and the layout effect fills it before anything can drag.
- **Scrollbars and overscroll are one universal rule, not per class.** Two
  classes had already hidden their own bars and everything else still showed
  one; `scrollbar-width` was missing entirely, which is why it was visible in
  some browsers and not others.
- **The empty Today scrolling 65px is not a defect.** Measured: content ends
  819px into an 852px viewport and the floating bar covers the last ~78px, so
  the action row is genuinely underneath it and the 98px reserve is what makes
  it reachable. The test asserts the overrun never *exceeds* the reserve, which
  is the fault that would matter — a screen adding its own spacer on top.
