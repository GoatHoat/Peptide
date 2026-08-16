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
- [x] **0.2 — The three onboarding questions.** Section 1 of
  `PROMPT_PERSONALISATION.md`: diet, reactions, form preference. Screens, store
  fields, `FLOW` placement, `SKIPPABLE`, and the `profiles` columns. No
  injection option in the form question, for the reason given in the spec.
  _Done: one `MultiSelectScreen` drives all three from `MULTI_QUESTIONS` in
  `Survey.tsx`; `diet` after `profile`, `reactions` and `forms` after
  `current-stack`, all three skippable; store gains `diet`, `reactions`,
  `reactionsNote`, `forms`; migration `0018` adds the four columns (not
  applied); answers are written by a second `updateProfile` and read back on
  open. Flow is now 23 screens — 0.12 brings it down._
- [x] **0.3 — The rules engine.** Section 2. New `src/lib/recommend.ts`, pure and
  synchronous, with the diet table, the reaction table and the soft form
  re-rank. Wire it into `Results.tsx` in place of the bare `listGlossary()` call.
  Every card carries the reason the rule fired, or nothing at all.
  _Done: `src/lib/recommend.ts` holds all six diet rules, all seven reaction
  rules and the soft form re-rank as one transparent weight table; `Results.tsx`
  now only slices the list and formats an amount. Swaps route to another form of
  the same nutrient rather than dropping it, and what was swapped appears under
  "what was left out". 26 unit tests in `tests/unit/recommend.spec.ts` cover one
  rule each, run by `npm test` as a new `rules` project. Iron's 1.8× vegetarian
  figure is applied; 2.5 (menstruation) is untouched — that is 0.4._
- [x] **0.4 — The iron defect.** Section 2.5. Stop deriving menstrual status from
  `age >= 51`. Render both figures for women under 51, add the optional control
  on the iron sheet, `profiles.menstruates boolean null`, and default null to the
  range. Do not add a question about it to onboarding.
  _Done: new `src/lib/intake.ts` owns which figure applies (`pickReference`
  moved there out of `api.ts`); iron with no answer renders "18 or 8 mg a day"
  and the sentence the spec asks for, on the Discover card and on the
  onboarding recommendation. The three-option control sits on the iron card
  with the reason next to it, writing `profiles.menstruates` — migration `0019`
  adds the column (not applied). An answer beats the age proxy at any age;
  "prefer not to say" and null both render the range; 13-18 is left alone.
  19 unit tests in `tests/unit/intake.spec.ts`, plus a Discover smoke test.
  Also fixed, because it hid half of this: the recommendations screen
  snapshotted its cards before the reference intakes arrived, so every card
  read "you set the amount"._
- [x] **0.5 — Product-shaped slugs.** Section 3.1, the migration half. Move the
  existing 74 entries from ingredient-shaped slugs to `<brand>-<product>`, and
  update every foreign reference — `stack_items`, `schedule_items`,
  `glossary_research`, `nutrient_reference`, and anything in `src/lib` that
  hardcodes one. Grep before assuming there are none. Do this on its own, with
  nothing else in the commit, so it can be reverted cleanly.
  _Done: migration `0020` renames all 74 (not applied), with the derivation rule
  written into its header for 0.6 to follow. No foreign reference needed
  updating — every one of those tables keys on `glossary.id`, a uuid, and this
  updates a column on the row it keeps; `match_goal` never read the slug either.
  The only slug reader in `src/` is `recommend.ts`'s nutrient haystack, and the
  rename is provably neutral there: every DSLD name is brand-prefixed, so the
  new slug is exactly `slugify(name)` and no product changes rule group.
  `conflicts.ts`'s 'zinc'/'omega-3'/'glycine' look like slugs and are not —
  they match the item name. Nothing else in the commit._
- [x] **0.6 — Load the 176 products.** Section 3.1. `CATALOG_BRANDED_176.md` is
  at the repo root. Verify every DSLD label ID resolves before inserting; drop
  any that do not and list them. Do not substitute a different product silently.
  _Done: migration `0021` inserts all 176 (not applied). Every label id was
  fetched from the DSLD API first — all 176 returned a record, all carry
  `offMarket: 0`, all ids are distinct, so nothing was dropped or substituted.
  Slugs follow 0020's convention and collide with neither each other nor the 74.
  Mechanism summaries were written against each label's declared ingredient
  panel, which caught three products whose names say the opposite of their
  contents. 42 rows have a shorter brand or name in the file than in the filing;
  all 42 are the same filing and are listed in the migration header. Flagged and
  not fixed: `listGlossary(200)` hides 86 of the resulting 286 entries._
- [x] **0.7 — Papers, part one: the first three goal sections.** Section 3.2.
  Skin & hair, Sleep, Energy. Real PubMed records only, searched on the active
  ingredient not the brand name, every URL confirmed to resolve. Store fewer than
  five rather than padding.
  _Done: migration `0022` inserts 440 rows — five papers for each of the 88
  products — from 278 distinct PubMed records (not applied). Every title,
  journal, year and PMID comes verbatim from `esummary` via the new
  `scripts/fetch_papers.py`; `--verify` re-fetches all 278 and confirms each
  still exists, still has the stored title, and carries no retraction type, with
  two invented PMIDs as a control that the check can fail. Searched on 56 active
  ingredients rather than 88 brand names, so no NCBI key was needed. Relevance,
  not volume, was the work: same-prefix compounds (gabapentin, `Glycine max`,
  S-adenosylmethionine) and wrong-route studies (topical rosemary, injected
  hyaluronic acid) all ranked top-5 and are rejected by name in the script's
  block list. `casein-decapeptide` stores 4, not 5, and is the only shortfall.
  Caveat in `NIGHT_REPORT.md`: pubmed.ncbi.nlm.nih.gov serves this network a
  cookie-challenge 203 for every URL alike, so the resolve check went through
  the API — worth one plain link-check from a normal network before applying._
- [x] **0.8 — Papers, part two: the last three goal sections.** Focus, Training,
  Immunity & gut. Same rules.
  _Done: migration `0023` inserts 440 rows — five papers for each of the 88
  products in the last three sections — from 370 distinct PubMed records (not
  applied). Both scripts now take `--part 2`; 65 new ingredient searches plus 11
  ingredients reused from part one unchanged, so lion's mane cites the same
  papers under Focus as under Sleep. `--part 2 --verify` re-fetches all 370 and
  confirms each still exists, still carries the stored title, and has no
  retraction type, with two invented PMIDs as a control. Relevance was the work
  again: the searches led with gerbils for uridine, fish-feed trials for rice
  protein, mice for fisetin and magnesium L-threonate, and pregnancy trials for
  iodine, lactoferrin and multivitamins. Two new filters — animal names matched
  as whole words, and the pregnancy/preterm literature — plus 34 more block-list
  entries, each with its reason. `uridine` was dropped as a group: every human
  paper is orotic aciduria or cancer metabolism, so Cognitex Elite cites the
  phosphatidylserine and blueberry also on its label. Four ingredients ran out
  before five and each fills from a second ingredient on the same label, so no
  product is short. 0022's header rewrapped by five comment lines, because the
  generator is now shared; no citation in it changed._
- [x] **0.9 — Fix the Today arc.** Section 4. The end caps are clipped because
  the endpoints already sit at the viewBox bounds and `strokeLinecap="round"`
  adds another 4.5px past each one. Derive `R` from the width as shown. Also fix
  the stale `GAP_DEG` comment and decide what to do about doses clamped outside
  the waking window.
  _Done: `R` now solves from the box (≈301.06), so the caps land on 0 and 368
  instead of 4.55px outside them, and `H` 70 → 69. The arithmetic was only half
  of it — the `<svg>` was a fixed 368px wide and left-aligned, so on a 375 or
  390 device the right-hand end and half the bedtime label were off the screen
  entirely; it scales to the container now (`width: 100%`, `max-width: 440px`)
  and `.arc-ends` moved into flow. Doses outside the waking day widen the
  window rather than clamping onto its ends, and the label moves with them.
  Same function fixes a worse case the spec does not mention: a bedtime past
  midnight made the span negative and drew every dose of the day as one
  segment — the arc now ends at midnight, agreeing with the list under it,
  which sorts by the clock. `GAP_DEG` comment corrected. Screenshotted at 375,
  390 and 430 with 1, 2, 3 and 6 doses; 12 unit tests plus one e2e at 375._
- [x] **0.10 — Move the paywall.** Section 5. It sits at `FLOW` index 14, before
  `recommendations` at 16, so the user is asked to pay before seeing a single
  recommendation. Move it to immediately after. One line, highest value change
  in the file.
  _Done: `paywall` now sits between `recommendations` and `building-schedule`.
  Two lines rather than one, because `Onboarding.tsx` held a hardcoded
  `goTo(... 'paywall')` out of `notifications` that would have skipped
  `building-recs` and `recommendations` entirely in a production build; it is a
  plain `next()` now and the dev skip moved into `isSkipped` in `flow.ts`
  alongside the q3 branch, so no screen knows the paywall's position and back
  walks over it on the same rule forward does. The onboarding e2e walks the new
  order screen by screen and passes; 63 tests green._
- [x] **0.11 — Twenty onboarding runs.** Section 5. All twenty personas, end to
  end, recording every screen shown, timing, final recommendations, and anything
  that errored, rendered empty, or overflowed. Fix what is small; list what is
  not.
  _Done: `tests/e2e/personas.spec.ts` runs all twenty against a driver in
  `support/persona.ts` that reads `data-step` off the root and loops, so no test
  knows the order of `FLOW`. Each attaches a `run.md` with every screen in
  order, ms per screen, the progress value, the recommendations with their dose
  lines and reasons, and the schedule. All twenty green at 393 wide: nothing
  blank, nothing clipped, 22-24 screens each, 16-22s of driving time. One real
  defect found and fixed — `ProfileProvider` caches the profile at signup and
  onboarding writes past it, so the app opened on the pre-onboarding row: the
  Today arc drew the default 07:00-23:00 window whatever was set, and the intake
  figures used the default age and sex. Persona 13 is what showed it. Also made
  the `app` fixture `auto`, because a test that did not name it got no stub and
  no error checks at all. Flagged, not fixed: the recommendations screen is a
  dead end with nothing to suggest (verified), `DEFAULT_GOAL_IDS` is unreachable
  from the product, the progress bar moves two segments over a retired question,
  and `finish()` swallows every write error. See `NIGHT_REPORT.md`._
- [x] **0.12 — Trim the flow back under 20 screens.** Section 5. Cut candidates
  in order: the progress-photo screen, then the two consecutive info screens.
  Do not cut the three new questions to make room.
  _Done: 23 → 19. There is no progress-photo screen in the flow — `ProgressNotes`
  lives in the app proper and `FLOW` has never held it, so the first cut on the
  list was already made. Four merges instead, none of them a new question:
  `auth-choice`+`auth-form` → `auth` (the chooser's only working control was
  "continue with email"; Apple and Google are disabled until Supabase has them
  and now sit above the form); `info-library`+`info-recs` → `info`, whose second
  paragraph was also factually wrong since 0.2 — it claimed goals, age and sex
  and "nothing else"; `sleep`+`meals` → `day`, two screens whose own titles
  said "part one" and "part two"; and `q1` cut outright — it counted what
  `current-stack` lists four screens later, and its answer was written to the
  store and never read by anything. q2 and q3 keep their ids, because they are
  persisted in localStorage and renumbering would drop the answers of anyone
  mid-flow. All 85 tests green; the twenty persona runs are 18-20 screens each,
  ~15s of driving time against 16-22s. `FLOW.length` is now pinned by the
  clamp test, so putting a screen back has to change that line and say why._

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

- [ ] **Give the catalogue a `source` column, and exclude on it.** The diet
  table in `PROMPT_PERSONALISATION.md` moves nutrients up and swaps forms, but
  it never excludes a product for containing the animal the user just said they
  do not eat. So a vegan who picks Training is still shown Biochem 100% Whey
  Isolate, and a vegan who picks Skin is still shown Vital Proteins Collagen
  Peptides — whey is dairy and collagen is bovine or marine, always. That is the
  most visible way this feature can contradict itself, and it is exactly what
  section 5's twenty runs are meant to catch. I did not fix it because the fix
  is not a rule, it is data: nothing on a glossary row says what a product is
  made from, and deriving it from the name is guesswork the moment a product is
  called "Ultimate Omega" rather than "Fish Oil". Proposal: add
  `source text[] null` to `glossary` (`dairy | egg | fish | shellfish | bovine |
  porcine | none`), populate it in the 176-product migration where the label
  says so, and let the diet answers exclude on it with the same "swapped out,
  and here is why" line the form swaps already use. Roughly one migration
  column, one lookup table and four lines in `recommend.ts`.

- [ ] **Decide what "No red meat" on its own should do.** It is an option on
  the diet screen and it is the only one that currently changes nothing:
  the table in the spec names `no-meat` for the iron and zinc rules, so someone
  who ticks only "No red meat" gets exactly the recommendations of someone who
  eats everything. Red meat is the main source of haem iron, so a smaller iron
  nudge is arguably right — but the spec is deliberate about which answers move
  which products, and inventing a weight for this one is the kind of thing that
  should be your call rather than mine at 3am.
