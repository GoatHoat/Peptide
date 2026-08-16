# Overnight queue

Work top to bottom. **One item per run.** Tick it off with a one-line note on
what actually changed, then stop — the loop will start you again on the next one.

The standing rules are in `CLAUDE.md` and they override anything here. The two
that matter most: **no new features**, and **every run ends with the build
green**.

Section 0 is a real feature build and is the exception to "no new features" —
it is specified in full in `PROMPT_PERSONALISATION.md`. Everything from
section A onward is finishing and smoothing only.

---

## 0. Personalisation build — spec is in `PROMPT_PERSONALISATION.md`

Read that file first. Each item below is one part of it, split so each fits in a
single run. Do them in order; several depend on the one before.

- [x] **0.1 — Smoke tests first.** Before anything else: four Playwright tests
  that boot the app, complete onboarding, render Today, and render Discover.
  Wire them to `npm test`. Everything after this depends on the green gate being
  worth something — right now it only proves the code compiles, which will not
  catch a screen that renders blank.
  _Done: four specs in `tests/e2e/`, wired to `npm test`, run against the dev
  server with Supabase stubbed inside the page (no project, no keys). Each also
  fails on any uncaught error, any `console.error`, or any Supabase call the
  stub does not model._
- [ ] **0.2 — The three onboarding questions.** Section 1 of
  `PROMPT_PERSONALISATION.md`: diet, reactions, form preference. Screens, store
  fields, `FLOW` placement, `SKIPPABLE`, and the `profiles` columns. No
  injection option in the form question, for the reason given in the spec.
- [ ] **0.3 — The rules engine.** Section 2. New `src/lib/recommend.ts`, pure and
  synchronous, with the diet table, the reaction table and the soft form
  re-rank. Wire it into `Results.tsx` in place of the bare `listGlossary()` call.
  Every card carries the reason the rule fired, or nothing at all.
- [ ] **0.4 — The iron defect.** Section 2.5. Stop deriving menstrual status from
  `age >= 51`. Render both figures for women under 51, add the optional control
  on the iron sheet, `profiles.menstruates boolean null`, and default null to the
  range. Do not add a question about it to onboarding.
- [ ] **0.5 — Product-shaped slugs.** Section 3.1, the migration half. Move the
  existing 74 entries from ingredient-shaped slugs to `<brand>-<product>`, and
  update every foreign reference — `stack_items`, `schedule_items`,
  `glossary_research`, `nutrient_reference`, and anything in `src/lib` that
  hardcodes one. Grep before assuming there are none. Do this on its own, with
  nothing else in the commit, so it can be reverted cleanly.
- [ ] **0.6 — Load the 176 products.** Section 3.1. `CATALOG_BRANDED_176.md` is
  at the repo root. Verify every DSLD label ID resolves before inserting; drop
  any that do not and list them. Do not substitute a different product silently.
- [ ] **0.7 — Papers, part one: the first three goal sections.** Section 3.2.
  Skin & hair, Sleep, Energy. Real PubMed records only, searched on the active
  ingredient not the brand name, every URL confirmed to resolve. Store fewer than
  five rather than padding.
- [ ] **0.8 — Papers, part two: the last three goal sections.** Focus, Training,
  Immunity & gut. Same rules.
- [ ] **0.9 — Fix the Today arc.** Section 4. The end caps are clipped because
  the endpoints already sit at the viewBox bounds and `strokeLinecap="round"`
  adds another 4.5px past each one. Derive `R` from the width as shown. Also fix
  the stale `GAP_DEG` comment and decide what to do about doses clamped outside
  the waking window.
- [ ] **0.10 — Move the paywall.** Section 5. It sits at `FLOW` index 14, before
  `recommendations` at 16, so the user is asked to pay before seeing a single
  recommendation. Move it to immediately after. One line, highest value change
  in the file.
- [ ] **0.11 — Twenty onboarding runs.** Section 5. All twenty personas, end to
  end, recording every screen shown, timing, final recommendations, and anything
  that errored, rendered empty, or overflowed. Fix what is small; list what is
  not.
- [ ] **0.12 — Trim the flow back under 20 screens.** Section 5. Cut candidates
  in order: the progress-photo screen, then the two consecutive info screens.
  Do not cut the three new questions to make room.

---

## A. Finish what is half-built

These are the "plug in a key and it works" items. Build them completely, against
a stub, behind a flag. Never write a real key anywhere.

- [ ] **Ask AI, end to end, without a key.** Follow `PROMPT_DISCOVER_AI.md`.
  Build the Edge Function at `supabase/functions/ask/index.ts` complete with JWT
  verification, the rate limiter, the catalogue fetch, the tool schema and the
  server-side peptide rejection. When `ANTHROPIC_API_KEY` is unset it returns a
  canned response from a fixture file so the whole UI is exercisable. Setting
  the key is the only thing that should make it live. Write the fixture to cover:
  a normal three-card answer, a peptide question, a pregnancy question, a rate
  limit, and a server error.
- [ ] **The chat UI against that stub.** Bubbles, typing dots, the input growing
  to five lines, the empty state, the three example prompts, the citation sheet,
  persistence across an app kill. All of it should look and behave finished.
- [ ] **Every SQL migration written and idempotent.** Anything not yet applied
  goes in `supabase/migrations/` with a number, guarded so re-running is safe.
  `PENDING.sql` should end up empty or deleted. Write a `supabase/README.md` that
  says, in order, exactly what to run and which secrets to set.
- [ ] **Every `{{PLACEHOLDER}}` in the app and the site.** `{{PRIVACY_URL}}`,
  `{{TERMS_URL}}`, `{{CONTACT_EMAIL}}` and any others. Write the privacy page —
  what is collected (an email address), what it is used for, that it is not
  sold, and how to ask for deletion. The waitlist form is live and collecting
  real addresses right now with no privacy page behind it.
- [ ] **StoreKit paths stubbed to completion.** The purchase flow, the restore
  flow, the "already subscribed" state and the failure states all render and
  navigate correctly against a fake purchase provider. A missing Restore
  Purchases button is the most common App Store rejection there is.

## B. Make the existing things seamless

Not new behaviour. The same behaviour, without the seams.

- [ ] **Every loading state.** Anywhere the app currently shows nothing, a
  flash, or a layout shift while data arrives, give it a skeleton at the exact
  final dimensions. List every place you found.
- [ ] **Every empty state.** Empty stack, empty schedule, no search results, no
  history, no doses today. Each needs a line of copy and one action. Empty
  screens with nothing on them are the strongest "unfinished" signal an app has.
- [ ] **Every error state.** Offline, request failed, session expired. A retry
  affordance, never a raw error string, never a silent nothing.
- [ ] **Transitions.** Sheets, tab switches, screen pushes. One easing curve and
  one duration set used everywhere. Inconsistent motion is the thing people read
  as cheap without being able to name it.
- [ ] **Tap targets to 44×44 minimum**, and a pressed state on every interactive
  element. Audit all of them; list what you changed.
- [ ] **Safe areas** on notch and home-indicator devices, in every screen and
  every sheet. Test at 375, 390, 393, 430 and 440 wide.
- [ ] **Scroll performance** on Discover with 250 entries. It currently renders
  every row at once via `listGlossary(200)`. Section or virtualise it.
- [ ] **Every number and date formatted consistently.** Tabular numerals
  everywhere a figure can change, one date format, one time format.

## C. Visual and copy polish

- [ ] **One type scale, one spacing scale, one radius scale.** Find every
  hardcoded px value in the CSS, replace with tokens, delete the outliers. List
  how many distinct font sizes existed before and after.
- [ ] **Kill every leftover orange.** The accent is `#7B5CFA`. Grep for amber,
  orange, and any hex that isn't in the token set.
- [ ] **Contrast to WCAG AA** on every text-on-background pair. Report the ratios
  you had to change.
- [ ] **Copy pass, screen by screen.** Shorter, plainer, no marketing voice
  inside the product. No exclamation marks. Sentence case throughout. Every
  button says what happens, not "Continue".
- [ ] **Icon set consistency** — one stroke weight, one corner radius, one
  optical size across every icon in `components/Icons.tsx`.

## D. Research, then propose — do not act

Read-only. Write findings to `RESEARCH.md`. **Do not implement anything you find
here**; add it to section E as a proposal and leave it unchecked for me.

- [ ] **Competitor teardown.** Look at how comparable apps handle onboarding
  length, the paywall moment, the daily home screen, and how they present
  evidence. Cronometer, MyFitnessPal, Zoe, Bevel, Gyroscope, Oura's app, Rise,
  Athletic Greens' app. For each: what they do at the paywall, how many screens
  before value, and one thing they do better than us.
- [ ] **Premium-feel teardown.** Separately, list what actually makes an app feel
  expensive — motion, density, typography, restraint, empty space — and score our
  screens against each. Be specific and unkind.
- [ ] **App Store rejection risk pass.** Read the guidelines and go screen by
  screen. Anything touching 1.4.2, 3.1.1, 4.8, or health claims. Report only.

## E. Proposals (do not implement)

Anything you want to change that adds behaviour, removes a screen, or alters the
product goes here as an unchecked line with a one-paragraph case. I will decide
in the morning.

- [ ] _(add proposals here)_
