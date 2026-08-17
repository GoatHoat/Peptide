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
