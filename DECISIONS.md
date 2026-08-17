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
