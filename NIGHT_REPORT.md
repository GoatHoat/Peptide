# Night report

Append one entry per iteration. Blunt is the point: things flagged and not
fixed are more useful in the morning than a list of things that went fine.

---

## 2026-08-15 — queue item 0.1, smoke tests

**Changed.** Added four Playwright smoke tests in `tests/e2e/` — boot,
complete onboarding, render Today, render Discover — wired to `npm test`.
They run against `vite dev` on port 5174 with every Supabase call answered
inside the page by `tests/e2e/support/supabaseStub.ts`, so no project and no
keys are involved. On top of its own assertions each test fails on any
uncaught exception, any `console.error`, and any Supabase call the stub does
not model — a table nobody stubbed shows up as a failure rather than as a
silently empty list. `@playwright/test` is the one new dependency and it is
dev-only; nothing new reaches the bundle.

**Found and did not change.**

- **`ensureTodayDoses` races itself, and there is no constraint to catch it.**
  `src/lib/api.ts:392` reads the day's dose rows and then inserts the missing
  ones with nothing between the two. Two overlapping calls both see zero rows
  and both insert, so Today shows the same item twice. StrictMode's double
  mount triggers it on every dev load; in production it needs two loads close
  together (tab refocus, a second device). `doses` has only a plain index on
  `(schedule_item_id, log_date)` — migration 0010 line 30 — so the database
  will not reject the duplicate either. The fix is a unique index plus an
  upsert with `on_conflict`, which is a migration, and migrations are not mine
  to apply. Both affected assertions use `.first()` and say why; nothing is
  papered over.
- **The dev build skips the paywall.** `SKIP_PAYWALL` in `src/lib/billing.ts`
  defaults to true whenever `import.meta.env.DEV`, so the flow you see while
  developing is one screen shorter than the one that ships. The tests set
  `VITE_SKIP_PAYWALL=false` so they walk the real order — which also means
  they will notice when item 0.10 moves the paywall.
- **One retry is configured.** This runs unattended, and a machine stall
  should not read the same as a broken screen. A real break fails both
  attempts. One onboarding run did fail mid-session on a machine that was
  also 30× slower than usual on page load for that one run; nine subsequent
  runs were clean and I could not reproduce it. Worth a second look if it
  recurs.

**Out of scope but noticeable.**

- The main bundle is 1,013 kB minified (315 kB gzipped) and Vite warns about
  it on every build. `jspdf` and `html2canvas` are most of the non-app weight
  and are only needed by the export path.
- The stub does not implement PostgREST embedded selects, so `getStack()`'s
  `glossary:glossary_id(*)` join returns rows without their glossary. No
  screen under test uses it; MyStack would need it before it could be tested
  the same way.

---

## 2026-08-15 — queue item 0.2, the three onboarding questions

**Changed.** Diet, reactions and form preference are in the flow. One
`MultiSelectScreen` renders all three from `MULTI_QUESTIONS` in `Survey.tsx`,
reusing the existing option/tick/input classes — no new CSS. `diet` sits after
`profile`, `reactions` and `forms` after `current-stack`, and all three are in
`SKIPPABLE`; skipping clears to an empty array, which every downstream rule
has to read as "no preference". "No meat at all" auto-selects "No red meat",
and unticking "No red meat" unticks both rather than leaving a pair of answers
that contradict each other. "Something else" on the reactions screen stores to
`reactionsNote`, separately, and nothing parses it. No injection option, no
topical option. Migration `0018_onboarding_answers.sql` adds `diet`,
`reactions`, `reactions_note` and `form_prefs` — **written, not applied**.
The onboarding smoke test walks the three new screens and asserts the answers
reach `profiles`.

**Found and did not change.**

- **The flow is 23 screens now, and the paywall is still at index 17, before
  the recommendations at 19.** Both are queue items (0.10, 0.12) and both are
  worse than they were this morning, because I just made the flow longer
  without moving the paywall. If only one more thing gets done tonight it
  should be 0.10.
- **A user mid-flow when this ships resumes on a different screen.** The step
  index is persisted as a number and three screens were inserted ahead of it,
  so someone parked on `goals` (12) reopens on `reactions` (13). The bounds
  clamp holds and nothing crashes; every answer survives. I did not bump the
  storage key, because discarding a part-finished flow to avoid one misplaced
  screen is the worse trade.
- **The profile write is two calls now, deliberately.** `finish()` writes age,
  sex and the waking window first, then the four new columns separately. One
  update carrying all of it would fail whole against a database that has not
  run `0018` — which is every database until the migration is applied in the
  morning — and take age and sex down with it. Same reason `0014`'s columns
  are typed optional.
- **Read-back is onboarding-only.** `hydrate()` fills answers from the profile
  row on open and only where the local value is empty, so a device that has
  answered wins over the server. Nothing outside onboarding reads the four
  fields yet; the scorer in 0.3 is what makes them do anything at all. Until
  then a user can answer all three questions and get exactly the same
  recommendations as before.

**Out of scope but noticeable.**

- `Results.tsx` still calls `listGlossary()` and filters by goal, so the
  reactions screen currently promises "we'll pick a different form rather than
  skipping it" and nothing yet does that. That is 0.3, but the copy is live
  before the behaviour is, which is the wrong order if these ship separately.
- The bundle is still 1,017 kB minified; the three screens added ~4 kB.

---

## 2026-08-15 — queue item 0.3, the rules engine

**Changed.** `src/lib/recommend.ts` — pure, synchronous, no imports at runtime
— now decides the order of the recommendations and the sentence on every card.
All six diet rules, all seven reaction rules and the soft form re-rank are one
weight table with the reason text next to the rule that produces it: one goal
tag is worth 10, a diet priority 30, a form swap 25, a stated form preference
6, and B12 under "no meat at all" is worth 1000, which is how it reaches the
top of a list it matched no goal in. `Results.tsx` no longer scores anything;
it slices six, turns a reference intake into a string, and renders. The screen
that promised "we'll pick a different form rather than skipping it" now does
it. 26 tests in `tests/unit/recommend.spec.ts`, one per rule, run under a new
`rules` Playwright project with no browser and no server.

Three decisions inside that are worth disagreeing with in the morning:

- **A swap removes the product, never the nutrient.** With `mag-gi` answered,
  magnesium citrate does not appear at all — the glycinate does, and the
  citrate is named under "what was left out" with the reason. Showing someone
  the citrate after they told you citrate loosens their stools, with or without
  a caveat, is the contradiction the spec's twenty runs exist to find. Where
  the catalogue has nothing to route to, the original stays with the spec's own
  line: "This is the only iron we have — take it with food."
- **Nothing on a card goes unexplained.** The reason line is the highest-
  priority rule that fired, plus the sentence behind the adjusted figure or the
  with-food chip when a louder rule owns the line. Two sentences maximum, and
  it will not repeat itself. This is why iron reads "Bisglycinate rather than
  sulfate… Vegetarian iron targets are 1.8× the standard…" rather than showing
  32 mg with nothing accounting for the 32.
- **No rule, no sentence.** `why` renders only when non-empty. The engine never
  falls back to a generated line. `matchReason.ts`, which section 2.4 points at,
  is search-query specific and does not apply here; the goal-tag sentence that
  was already on these cards is the fallback and it now lives in the engine
  with the rest of the copy.

**Found and did not change.**

- **A vegan is still recommended whey protein and collagen.** The diet table
  moves nutrients up and swaps forms; it never excludes a product for
  containing the thing the user said they do not eat. Whey is dairy and
  collagen is bovine or marine, always. This is the loudest way the feature can
  contradict itself and it is not fixable with a rule — no glossary column says
  what a product is made from, and reading it off the name fails the moment a
  product is called "Ultimate Omega". Written up as the first proposal in
  `NIGHT_QUEUE.md`: it needs a `source` column populated during the 176-product
  migration.
- **"No red meat" on its own does nothing.** The spec's table names `no-meat`
  for the iron and zinc rules, so ticking only "No red meat" produces the same
  list as "I eat everything". Second proposal; I did not invent a weight for it.
- **`no-fish` will suppress an algal omega-3 that does not say so.** The rule
  keeps only products whose name, slug or keywords say algal, algae, vegan or
  schizochytrium. A genuinely algal product named "Ultimate Omega" would be
  dropped rather than recommended. Deliberate: recommending fish to someone who
  does not eat fish is the worse error of the two. It will matter at 176
  products and is another thing a `source` column solves properly.
- **Citicoline and alpha-GPC are not treated as choline.** Neither name
  contains the string, both are catalogued as cognitive products, and folding
  them into a diet rule quietly is the kind of thing this file is for.
- **The onboarding smoke test now asserts a recommendation, not just a
  screen.** The fixture gained a B12 row tagged for goals the test run does not
  pick, so its arrival at the top of the list is only explicable by the no-meat
  rule, and `discover.spec` moved from four supplements to five. The final
  assertion follows that product through to the Today timeline, which is the
  whole chain: answer → profile → scorer → card → schedule row → dose. Vitamin
  D3 was the product it used to follow; B12 displaced it out of the top three,
  which is the rule working rather than a regression.

**Out of scope but noticeable.**

- **Nothing outside onboarding personalises anything.** Discover still shows
  every product's own timing chip, not the one a reaction moved, because
  Discover does not know the answers. A user who is told "with food" during
  onboarding sees "on an empty stomach" on the same product two taps later.
  Worth a look once 0.6 lands and the catalogue has real alternatives in it.
- The bundle is 1,024 kB minified (319 kB gzipped); the engine added ~3 kB.

---

## 2026-08-15 — queue item 0.4, the iron defect

**Changed.** The app no longer reads `age >= 51` as "has been through the
menopause". `src/lib/intake.ts` is a new pure module that owns the whole
question of which reference figure applies to a person, including the one case
where the honest answer is two figures; `pickReference` moved into it out of
`api.ts`, which is a data-access module and drags the Supabase client into
anything that imports it. Iron with no answer on file now renders `18 or 8 mg
a day` on the pill and `Daily target — 18 mg if you menstruate · 8 mg if you
don't. Upper limit 45 mg.` on the open card, with the three-option control and
the reason for asking directly underneath it. Migration `0019` adds
`profiles.menstruates boolean` — **written, not applied**. 19 unit tests in
`tests/unit/intake.spec.ts` and a Discover smoke test that answers the question
and follows the figure down to 8 mg.

Four decisions worth disagreeing with in the morning:

- **The answer beats the age proxy at every age, and the control is shown at
  51+ too.** Someone still menstruating at 52 is exactly the person the proxy
  fails, and a control that hides itself at 51 leaves them no way to say so.
  Unanswered at 51+ still renders the published 8 mg rather than the range —
  the proxy is right for most people there, and turning every older woman's
  iron entry into a question is not an improvement.
- **13-18 year olds are left entirely alone.** No control, no range, still
  15 mg. That band's figures carry adolescent growth as well as menstruation,
  so there is no published "does not menstruate" figure to pair with them and
  the 51+ figure of 8 mg is not it. Inventing one quietly is worse than the
  gap.
- **"Prefer not to say" on sex now gets both figures instead of none.** Iron's
  reference rows are sex-specific, so `sex = 'na'` resolved to no row at all
  and the entry read "no set intake" — the app knew two figures and showed
  neither. Section 5's persona 11 asks for exactly this.
- **The onboarding card shows the pair and the schedule stores nothing.**
  `amount` stays empty for the ambiguous case, so the schedule row carries no
  number and Today reads "you set the amount", the same as every other product
  with no established figure. Writing 32 mg into someone's schedule when it
  might be 14 is the defect with a database row behind it.

**Found and did not change.**

- **A user can answer the question and lose the answer.** `menstruates` does
  not exist until migration `0019` is applied, so the write fails until then
  and the answer only holds for the session — the same window `0018`'s four
  columns are in. The failure is caught and takes nothing else down with it,
  but it is silent, and it will stay silent until the morning's migration run.
- **Which of the three buttons is pressed is session state.** "Prefer not to
  say" stores null and so does never having answered, which is what the spec
  asks for; the consequence is that reopening the app shows nothing pressed.
  That is the honest reading of a null, but someone who deliberately said
  "prefer not to say" will be shown the question again as though they had not.
  Fixing it properly means a third value in the column.
- **Onboarding never reads an answer that already exists.** It passes null
  unconditionally, so a returning user who answered on the iron card and then
  re-ran onboarding would see the range again. Onboarding runs once and before
  Discover exists for them, so this is theoretical today.
- **Iron's 1.8× vegetarian factor multiplies both figures, to 32 and 14.**
  That is how ODS quotes it, and the card says so on one line: "32 mg a day if
  you menstruate · 14 mg if you don't · oral". It is the longest dose line in
  the app and it wraps to two lines at 393 wide. It reads fine; it is the only
  place two rules stack on one figure, and it is worth looking at.

**Out of scope but noticeable.**

- **Fixed anyway, because it hid half of this item:** the recommendations
  screen fetched the catalogue and the reference intakes as two round trips
  and set them into state separately, while `Recommendations` snapshots its
  cards the first render the data is non-null. Against a real server the
  intakes always lost that race, so **every card on that screen has been
  reading "you set the amount" regardless of what the catalogue holds** — and
  every schedule item created by onboarding has been saved with a blank
  amount. One `await`, one state update, both arrive together. Not strictly
  0.4, but the iron figure could not appear on that screen at all until it was
  fixed, so it could not be tested either.
- The fixture gained a sixth supplement, an iron bisglycinate with the real
  sex-specific reference rows, and it is tagged `Skin` as well as `Energy` so
  the onboarding run reaches it — that run picks Skin & hair deliberately, to
  keep B12's arrival attributable to the no-meat rule alone. The real
  catalogue files iron under Energy.
- The bundle is 1,026 kB minified (319.5 kB gzipped); this added ~2 kB.

---

## 2026-08-15 — queue item 0.5, product-shaped slugs

**Changed.** One file: `supabase/migrations/0020_product_shaped_slugs.sql`,
**written, not applied**. It renames all 74 supplement slugs from
ingredient-shaped to `<brand>-<product>` — `magnesium-glycinate` becomes
`vincos-magnesium-glycinate`, `zinc` becomes
`aor-advanced-orthomolecular-research-premium-zinc-copper-balance`. The 74
peptides keep their compound names; they have no brand and never had this
problem. The derivation is written into the migration header rather than left
implicit, because 0.6 has to produce 176 more slugs that agree with these:
`slugify(brand) || '-' || slugify(name minus the brand prefix)`, apostrophes
dropped, `.com` dropped, `&` to "and", everything else non-alphanumeric to one
hyphen, nothing truncated.

It is idempotent by state rather than by guard: for each pair, the new slug
already present means done, the old one present means rename, neither present
means say so. It refuses to run if the mapping is not exactly 74 rows, if any
two rows target the same slug (the temp table's unique constraint), if both
shapes of one product exist at once, or if any ingredient-shaped slug survives
the loop.

**Found and did not change.**

- **There are no foreign references to update, and that is the answer, not an
  omission.** `stack_items`, `schedule_items`, `doses`, `glossary_research` and
  `nutrient_reference` all key on `glossary.id`, a uuid; this migration updates
  a column on the row it keeps, so every one of them still points at the right
  product. `match_goal` (0009) searches name, category, both summaries,
  `goal_tags` and `search_keywords` — never the slug. I grepped before assuming
  it, as the item asks.
- **`src/lib/conflicts.ts` looks like it hardcodes four slugs and does not.**
  `'zinc'`, `'omega-3'`, `'glycine'`, `'calcium'`, `'iron'`, `'magnesium'` are
  matched as substrings of the *item name*, not the slug — the file says so at
  the top. Left alone. It is the one thing in `src/lib` a grep for slugs turns
  up, and it is a false positive.
- **The rename is provably neutral for the rules engine.** `recommend.ts` folds
  the slug into the text it matches nutrient rules against. Every DSLD product
  name is brand-prefixed in all 74 rows, so the new slug is exactly
  `slugify(name)` — the haystack holds no word it did not already hold. I
  checked all 74 products against all 15 regex groups the engine uses (the nine
  nutrients, the four prefer sets, the two avoid sets): zero products change
  group in either direction. The unit fixtures in `recommend.spec.ts` already
  derive their slug from the name, so the engine has in fact been tested against
  the new shape since 0.3.
- **I could not execute the SQL.** No Postgres and no Docker on this machine,
  and rule 8 forbids a remote database — correctly, this is exactly the
  migration you would not want to find out about at 176 rows. So it is verified
  by construction and unrun: the 74 pairs in the file are byte-identical to a
  derivation script's output, no source or target repeats, no target collides
  with any of the 128 slugs across every migration in the tree, and every
  `raise` has as many arguments as placeholders. The PL/pgSQL itself has never
  been through a parser. Read the `do` block before pasting it.
- **Re-running 0016 or 0017 after this will duplicate 74 products.** Both insert
  `on conflict (slug)`, and after 0020 their conflict targets do not exist, so
  they insert rather than update — and nothing in the schema would reject it.
  Written into the migration header. I did not add a unique index on
  `label_url` to catch it, because 0.6 may legitimately file one DSLD label
  under two goal sections and I would be planting a landmine for it.

**Out of scope but noticeable.**

- **`supabase/PENDING.sql` is stale and this makes it worse.** It is a verbatim
  copy of 0017 and nothing else. 0018 (the onboarding answers), 0019
  (`menstruates`) and now 0020 are not in it. If that file is what gets pasted
  in the morning, the three columns the last two nights added still will not
  exist and the slugs will not move. Queue item A owns that file and the item I
  was given says nothing else goes in this commit, so I left it — but this is
  the third night in a row it has drifted further from the truth.
- **Four products are now unfindable by their ingredient name, and were
  already.** `coq10` is "OL Olympian Labs Ubiquinol", `probiotics` is "Allergy
  Research Group Lactobacillus", `iodine` is "Hi-Tech Pharmaceuticals Potassium
  Iodide", `nac` is "NHC Natural Healthy Concepts N-Acetyl Cysteine". Search
  never read the slug, so nothing regressed tonight — but the slug was the last
  place the word "CoQ10" appeared anywhere on those rows, and now it does not
  appear at all. `search_keywords` is the right home for it and 0.6 is the right
  time, when the catalogue that has to carry them is going in anyway.
- **`AOR Advanced Orthomolecular Research Premium` is stored as a brand and is
  not one** — "Premium" belongs to the product line, and the same company is
  filed as `AOR Advanced Orthomolecular Research` on two other rows. It produces
  the second-longest slug in the set at 63 characters. Correcting the `brand`
  column is a data fix, not this item, and it would change the slug it derives,
  so it wants doing before 0.6 rather than after.
- The e2e fixture slugs stay `test-vitamin-d3` and friends. They are a stub
  catalogue, not the real one, and renaming them would prove nothing.
- Bundle unchanged at 1,026 kB minified (319.5 kB gzipped). No client code was
  touched.

---

## Night 6 — 0.6, load the 176 products

**Changed.** One file: `supabase/migrations/0021_catalogue_176.sql`, inserting
the 176 branded products from `CATALOG_BRANDED_176.md`. Not applied.

**Verification, which was the actual job.** Every one of the 176 DSLD label ids
was fetched from `https://api.ods.od.nih.gov/dsld/v9/label/<id>` before a line
of SQL was written. All 176 returned HTTP 200 with a record, all 176 carry
`offMarket: 0`, and the 176 ids are distinct. Nothing was dropped, so there is
no list of casualties, and nothing was substituted.

Then I fetched the ingredient panel for all 176 as well, because writing a
mechanism sentence off a product name is guessing. It caught three that say the
opposite of what they contain:

- **Klean Focus** reads like an omega-3 and contains none — it is
  acetyl-L-carnitine, alpha-GPC, alpha-lipoic acid and a fruit polyphenol blend.
- **Klean Omega** does not say "omega-3", "EPA", "DHA" or "fish" anywhere in its
  name, and is a marine EPA/DHA concentrate. Without keywords it would have sat
  invisible to the no-fish rule — a fish oil recommended to someone who had just
  said they do not eat fish. It now carries them and is correctly swapped out.
- **Pure Encapsulations Amino-NR** declares a full amino acid profile, not
  nicotinamide riboside.

**42 rows where the file and the filing differ.** All 42 are the same filing,
none is a different product. 19 are sub-brand versus parent (`SR Sports
Research`, `Host Defense Mushrooms`, three Swanson sub-lines, `NOW Sports`), 17
are flavour or pack descriptors the file drops, 3 are house prefixes (`Best
L-Tyrosine`), 3 are one-offs including a typo in DSLD's own record (`Vitamon
B12`). The spec says brand, name and form come from the file, so the file's
wording went in; every divergence is written into the migration header so it is
auditable rather than invisible.

**I checked what the rules engine will do with these rows** rather than assume,
by running the `NUTRIENT` matchers from `recommend.ts` over all 176. Landing:
3 B12, 1 iron, 2 zinc, 5 magnesium, 4 omega-3, 2 choline, 1 niacin, 0 calcium,
0 vitamin D. Swaps resolve correctly — the algal omega-3 is preferred and the
three fish ones swap out, the bisglycinate is the preferred magnesium, the
niacinamide is the preferred B3.

**Found and did not change.**

- **`listGlossary(200)` will hide 86 of the 286 entries the moment this is
  applied.** This is the loudest thing in the file. The catalogue becomes 250
  supplements plus 36 peptides; `api.ts:443` orders by name and caps at 200, and
  all three callers — Discover, the onboarding recommendations and Day — pass
  200. Everything alphabetically past roughly "P" stops existing: every Solgar,
  Sports Research, SuperSmart, Swanson, Thorne and Vital Proteins product, which
  is a third of what this migration adds and includes most of the tier-1 brands
  the catalogue file argues for leading with. Nothing is broken today because
  the migration is not applied. Queue item B owns the fix ("Scroll performance
  on Discover with 250 entries") and it is now a correctness item, not a
  performance one. **Do not apply 0021 before that item is done.**
- **A vegan gets four B12 products in six slots.** `no-meat` marks B12
  `required`, worth 1000, and there are now four B12 products in the catalogue
  against six cards on the results screen. The rule is right that B12 is the one
  thing with no plant source; it is wrong that this should be said four times.
  Wants a one-per-nutrient cap in `recommend.ts`, which is a change to the rules
  engine and so not this item.
- **Two products now match the choline rule that `recommend.ts` says should
  not.** The comment at its `NUTRIENT.choline` entry reasons that citicoline and
  alpha-GPC raise choline but "spell neither", so they are left out
  deliberately. Both new citicolines are filed by DSLD as `Citicoline
  (CDP-Choline)` and `Citicoline CDP Choline 250 mg`, so they spell it, and the
  no-eggs rule will now promote them. Defensible pharmacologically — CDP-choline
  is a choline donor — but it is the comment's stated intent being overridden by
  a product name, so someone should decide it rather than discover it. I did not
  add choline keywords to the alpha-GPC or the lecithin, which would have made
  it worse.
- **`Sublingual` and `Lozenge` classify as `other`.** Two new forms
  `classifyForm` has no branch for (the Solgar B12 and the Solgar zinc lozenge).
  They get no form-preference bonus and no penalty, which is harmless but wrong
  in one direction: someone who said capsules are too big to swallow should be
  offered a lozenge above a capsule, and currently is not.
- **The vegan contradiction the E proposal describes is now 16 products, not
  two.** This migration adds 7 dairy-derived (two Klean proteins, the Sports
  Research whey, Jarrow colostrum, two lactoferrins, and the casein decapeptide
  hiding inside Life Extension Enhanced Sleep), 3 bovine collagen and 4
  fish-derived. With the existing whey and collagen that is 16 products a diet
  answer should exclude and cannot. I have not touched the proposal; it just
  costs eight times what it did when it was written.
- **The four unfindable products still have no `search_keywords`.** Last night's
  report nominated this item as the right time to give `coq10`, `probiotics`,
  `iodine` and `nac` the ingredient words their slugs used to carry. I did not,
  because the queue item is "load the 176" and those are four existing rows;
  0021 only inserts, which keeps it revertable in one command. It is four lines
  whenever you want it, and the 176 new rows all carry keywords already.
- **`AOR Advanced Orthomolecular Research Premium` is still stored as a brand.**
  Flagged last night as wanting doing before 0.6. It did not block 0.6 — no new
  product shares that brand — so it is still open and still cheap.
- **`supabase/PENDING.sql` is now four migrations stale.** 0018, 0019, 0020 and
  0021 are all absent from it. Fourth night running.
- **0.7 and 0.8 just got four times bigger.** Five papers each for 176 products
  is roughly 900 PubMed lookups against a 3-per-second unauthenticated cap. The
  spec says get an NCBI API key first; it is worth doing before starting rather
  than halfway through.

Build green, `tsc --noEmit` green, 50 tests green. Bundle unchanged at 1,026 kB
minified (319.5 kB gzipped) — no client code was touched.

## Night 7 — 0.7, papers for Skin & hair, Sleep and Energy

**Changed:** migration `0022_papers_part_one.sql` — 440 `glossary_research`
rows, five papers for each of the 88 products in the first three goal sections,
from 278 distinct PubMed records. Not applied. `scripts/fetch_papers.py`
derives them from the E-utilities API and `scripts/build_papers_migration.py`
turns the result into the SQL, so the file is reproducible rather than trusted.

**On the thing this item is most likely to get wrong.** The spec is blunt that a
fabricated citation is worse than no citation, so nothing here was written from
memory: every title, journal, year and PMID is copied verbatim out of
`esummary`, and `--verify` re-fetches all 278 afterwards to confirm the record
still exists, the title still matches, and none carry a retraction type. All
pass. The check also probes two invented PMIDs and fails if the API returns
records for them — a verification that cannot fail is not one.

**I could not link-check the URLs from here, and that is worth knowing.**
`pubmed.ncbi.nlm.nih.gov` answers every request from this machine with a
JS cookie-challenge page and HTTP 203 — the same 5,565 bytes for a real PMID as
for a made-up one — so the status code distinguishes nothing. `eutils` is not
intercepted, which is why the API round-trip is the check. It compares titles,
so it is strictly stronger than a 200; but a plain link-check from a normal
network is still worth doing once before this is applied, because the failure
0005 records was dead links.

**Volume was easy, relevance was not.** The first pass returned five results for
almost everything and a lot of it was wrong. What it took to fix:

- Queries have to be loose. PubMed ANDs every bare term, so
  `oral ceramides skin hydration phytoceramide` returns literally zero and reads
  as "no literature exists" rather than "bad query". Five groups were silently
  empty or near-empty for this reason.
- The title has to name the ingredient, or a collagen trial files itself under
  silica and a generic vitamin E trial under gamma-tocopherol.
- Same-prefix compounds are the nastiest failure and there is no lexical defence
  except naming them: gabapentin is not GABA, *Glycine max* is a soybean,
  glycine propionyl-L-carnitine is not glycine, S-adenosylmethionine is not
  methionine. Every one of these was ranked top-5 for its group.
- Route matters because every product here is swallowed. Rosemary oil rubbed on
  the scalp, an ascorbate serum, hyaluronic acid injected into a lesion, borage
  oil woven into an undershirt — all real papers about the right ingredient, all
  useless as evidence for a capsule.
- One got through on the journal rather than the title: "Electrolytes: clinical
  applications" reads as human until you notice *Vet Clin North Am Equine
  Pract*. There is now a journal filter as well, which will matter more for 0.8.

The block list in the script carries every hand-rejection with its reason, so
none of the above is invisible.

**Found and did not change:**

- **The NCBI API key the spec asks for was not used.** Unauthenticated is capped
  at 3 requests a second and that was enough: searching on 56 ingredients rather
  than 88 products means roughly 200 calls, not the ~900 the spec estimated,
  because four melatonin products share one melatonin search. Last night's
  report flagged getting a key first — it turned out not to be the constraint.
  It will not be for 0.8 either. A key is a secret and there is nowhere I am
  permitted to put one, so this is the right outcome regardless.
- **`casein-decapeptide` has four papers, not five, and no product shows it.**
  Alpha-casozepine has three human trials plus one ingestion study; everything
  else the search returns is lab characterisation of casein peptides, and one
  trial that gave the peptide to foals. It only appears in Life Extension
  Enhanced Sleep, which is a combination product, so it fills its fifth slot
  from ashwagandha rather than from padding. Left at four deliberately.
- **Some groups are cited for the compound, not for the goal.** Saw palmetto's
  literature is benign prostatic hyperplasia, not hair; grape seed's is blood
  pressure and NAFLD, not skin; fo-ti's is largely hepatotoxicity. These are
  correct under the spec's rule that the paper is about the compound, and I did
  not force them toward the goal, because doing that is exactly how you end up
  padding. But a user reading "Swanson Fo-Ti" and finding five hepatotoxicity
  reviews is a real product moment somebody should look at with fresh eyes.
- **`chaga` has no human trials at all** — five reviews, because *Inonotus
  obliquus* has essentially no clinical literature. Stored as reviews, labelled
  as reviews, not dressed up.
- **`meta` is formatted `Kind (Journal, Year)`** to suit `yearOf` in
  `DiscoverList.tsx`, which regex-matches the first 19xx/20xx it finds. Works
  for all 440, but it is a formatting coupling nobody wrote down, so here it is.
- **Two new files under `scripts/`, no new dependencies.** Both are stdlib
  Python, not part of the bundle or the build. Kept rather than deleted because
  they are the evidence for the migration, and 0.8 is the same job on the other
  three sections.
- **`supabase/PENDING.sql` is now five migrations stale.** 0018 through 0022.
  Fifth night running.

Build green, `tsc --noEmit` green, 50 tests green. Bundle unchanged at 1,026 kB
minified (319.5 kB gzipped) — no client code was touched.

---

## Night 8 — 0.8, papers for Focus, Training and Immunity & gut

**Changed:** migration `0023_papers_part_two.sql` — 440 `glossary_research`
rows, five papers for each of the 88 products in the last three goal sections,
from 370 distinct PubMed records. Not applied. Both scripts from night 7 now
take `--part 2`: `fetch_papers.py` searched 65 new ingredients and reused 11
from part one untouched, `build_papers_migration.py` turns the result into the
SQL. `--part 2 --verify` re-fetched all 370 records and confirms each still
exists, still carries the title stored here, and has no retraction type; the two
invented control PMIDs are still rejected. All pass.

**The whole job was relevance, and the first pass was bad.** Volume was never
the problem — every ingredient returned something. What it returned, top-ranked,
was often not about a person swallowing the thing:

- **uridine returned five gerbil and rat studies**, because the cognition
  evidence for uridine is Wurtman's animal work and the human trials are of
  Souvenaid, which never names uridine in the title. The group is gone. Cognitex
  Elite now cites the phosphatidylserine and the blueberry polyphenols also on
  its label, which is honest; citing gerbils would not have been.
- **rice protein returned four fish-feed trials** — rohu, fishmeal replacement,
  phytase in aquaculture diets. One human trial exists (whey vs rice protein,
  2013) and that is what is stored; the product fills its other four slots from
  the plant protein literature.
- **mice, repeatedly**, for fisetin and magnesium L-threonate — four separate
  papers, all in journals that publish both human and animal work, none saying
  so in the title. Each was caught by reading the abstract.
- **pregnancy and preterm infants led three searches** — iodine, lactoferrin,
  multivitamins. That is real evidence about the nutrient and the wrong question
  for the adult holding the bottle, which is the same call part one made one
  paper at a time ("evening primrose oil to induce labour"). It is a filter now.
  Children are deliberately still in scope: the probiotic evidence is paediatric
  almost end to end, and dropping it would leave those five products with
  nothing.

So: two new filters (animal names matched as whole words rather than substrings,
and the pregnancy/preterm cluster), a journal filter for feed and preprint
venues, and 34 more entries on the block list — each with the reason, each a
paper the API returned and I rejected after reading it. Nothing was replaced by
an invention; every backfill is the next real result.

**Found and did not change:**

- **Four ingredients have fewer than five papers**: rice protein has 1,
  Phellodendron 3, algal oil 4, magnesium L-threonate 4. No product ends up
  short, because each of the four is a product with a second ingredient on its
  label to fill from. That is the mechanism from night 7 working as intended,
  but it does mean "five papers" sometimes means "three about this ingredient
  and two about the other one on the label". The migration header lists them.
- **Phenylethylamine has no supplementation trial at all.** The five stored are
  a review of PEA and affect, two studies of PEA levels in depression, one of
  PEA after MAO-B inhibition, and one on noradrenergic function — all human, all
  about the amine, none of them a trial of taking it. Monoamine oxidase clears
  an oral dose in minutes, which is presumably why nobody has run one. The
  product page will read thin and it should.
- **Turkey tail's evidence is entirely oncology**, and lithium's is largely
  drinking-water epidemiology and psychiatric-dose therapy. Both are correct
  under the spec's rule that the paper is about the compound, but "Host Defense
  Turkey Tail" showing five chemotherapy adjuvant meta-analyses is a product
  moment worth a fresh pair of eyes, the same way fo-ti's hepatotoxicity
  reviews were last night.
- **Yerba maté's top two results were oesophageal cancer meta-analyses.** They
  are about drinking litres of very hot maté, not about a powdered extract, so
  the search was pointed at the physiological literature instead. Flagging it
  because that is a judgement call, not a filter: the cancer epidemiology is
  real and someone may want it on the card.
- **`0022_papers_part_one.sql` moved by five lines.** Comment rewrap only — the
  header generator is now shared between the two parts, and one paragraph
  rewraps. No citation, URL or row changed; `git diff` shows the five lines.
- **`supabase/PENDING.sql` is now six migrations stale.** 0018 through 0023.
  Sixth night running. `0023` alone is 440 rows.
- **Still no NCBI API key, still not the constraint.** 65 ingredient searches at
  three requests a second is about six minutes per run, and the run happened
  four times while the filters were tuned. A key is a secret and there is
  nowhere I am permitted to put one.

Build green, `tsc --noEmit` green, 50 tests green. No client code touched;
bundle unchanged at 1,026 kB minified (319.5 kB gzipped).

---

## Night 9 — 0.9, fix the Today arc

**Changed.** `src/components/Arc.tsx` and the `.arc-*` rules in `styles.css`.
Three things, all of them the same defect wearing different clothes: the arc
was drawn at a fixed size for a screen most people are not holding.

1. **The end caps.** Fixed as the spec derives it: `R` now solves from the box,
   `(W/2 - CAP) / sin(HALF)` ≈ 301.06, so the endpoints sit at x = 4.5 and
   363.5 and the round caps land on 0 and 368 exactly instead of 4.55px outside
   them. Sagitta 60.8 → 59.4. `H` drops 70 → 69 and now keeps the bottom cap
   inside rather than 0.13px short of the edge.
2. **The right-hand end was off the screen entirely, which the arithmetic in
   the spec does not cover.** The `<svg>` was 368px wide at every viewport and
   left-aligned, and `.arc-wrap` was `width: 368px`. On the 402-wide phone it
   was drawn for, 368 = 402 − 40 of margin + the 3px of bleed each side, and it
   fits. On a 375 the panel clips at 355 and the last 30px of arc — the whole
   right-hand end and half the bedtime label — were simply not on the device.
   Screenshot in the commit's diff is not possible, so: at 375 the label read
   "11:00 P". The svg is `width: 100%; height: auto` now, so it scales with the
   screen and the viewBox does the rest; `max-width: 440px` stops it inflating
   on a tablet. `.arc-ends` moved from `position: absolute; top: 77px` into
   normal flow, because the arc's height is no longer a constant to hardcode
   under.
3. **Doses outside the waking window.** New exported `windowFor()`: the arc
   spans the waking day widened to hold the earliest and latest dose, rather
   than clamping them onto the ends. A 06:00 dose for a 07:00 riser used to
   stack onto the left end under a label reading 7:00 AM; now the label reads
   6:00 AM. I picked widening over drawing out-of-window doses distinctly
   because the second needs a visual language the arc does not have and the
   design allows one accent.

`GAP_DEG`'s comment fixed as asked — the value was right, "20°" was not.

**Verified.** Screenshotted Today at 375, 390 and 430 wide with 1, 2, 3 and 6
doses. Both ends round in all twelve, both labels fully on screen, segment
count equals dose count. 12 unit tests in `tests/unit/arc.spec.ts` (the box
invariant and every window case), and one e2e test at 375 that fails if the arc
ever leaves the panel again or the label stops following the dose.

**Found, and one of them fixed because it was the same bug:**

- **A bedtime after midnight broke the arc completely, and it is reachable.**
  The sleep dial is a full 24-hour ring snapping to 5 minutes, and it even
  computes "hours in bed, wrapping past midnight" — so `sleep_time = 00:30` is
  a normal answer. `dayEnd` 0.5 with `dayStart` 7 is a span of minus 6.5 hours;
  every dose in the day clamped to one point and the arc drew as a single
  unbroken segment reading as one dose. Six doses, one segment, no error. Fixed
  in the same function: a `dayEnd` at or before `dayStart` means the day runs
  past midnight, so the arc ends at 24:00 — **not** at 24.5. The list directly
  under the arc orders by `scheduled_time`, so a 00:15 dose is the first row of
  the day there; drawing it at the right-hand end of the arc would have made
  the two halves of one screen disagree. One calendar day, both of them.
- **`ensureTodayDoses` still double-inserts under StrictMode.** Every scratch
  run showed "14 left today" for 7 schedule items. Known from night 1, still
  there, still out of scope — but it is now the thing I trip over every time I
  put doses on the screen, and it will be in the 0.11 persona runs on every
  persona.
- **`DrawingArc` in `Results.tsx` has the same shape and does not have the
  bug.** R 150, W 220, caps land at 1.3 and 218.7 inside a 220 box. Left alone.
  It does use `var(--accent)` where Today's arc uses `var(--purple)`; both
  resolve to the one accent, but two names for one colour is a C-section job.
- **`.arc-centre` is still positioned at a hardcoded `top: 18px`** over an arc
  that now changes height with the screen. It is a big number over a wide arc
  so it reads fine at 375–440, but it is a magic number that no longer tracks
  what it sits on. Not fixed: moving it means deciding where the count belongs
  relative to the sagitta, which is a design call.

Build green, `tsc --noEmit` green, 63 tests green (50 → 63: 12 unit, 1 e2e).
Bundle 1,026.26 kB minified, 319.62 kB gzipped.

---

## Night 10 — 0.10, move the paywall

**Changed.** `paywall` moved in `FLOW` from between `notifications` and
`building-recs` to between `recommendations` and `building-schedule`. Nobody is
asked to pay before they have seen a single suggestion.

It was not one line, because two places knew where the paywall was:

- `Onboarding.tsx` jumped out of `notifications` with
  `goTo(FLOW.indexOf(SKIP_PAYWALL ? 'building-recs' : 'paywall'))`. Left alone,
  that line would have skipped `building-recs` and `recommendations` outright
  in a production build — the paywall's new index is past both. It is now a
  plain `next()`, and the dev skip moved into `isSkipped` in `flow.ts` where the
  q3 branch already lives. That keeps the claim at the top of `flow.ts` true —
  no screen knows what comes before or after it — and it means back walks over
  the paywall on the same rule forward does, rather than one screen holding a
  hardcoded destination.
- The e2e helper walked the paywall between `notifications` and the
  recommendations. Reordered to match, so the run asserts the new order screen
  by screen. `playwright.config.ts` already forces `VITE_SKIP_PAYWALL=false`, so
  the test walks the shipping order rather than the dev one.

**Verified.** Full onboarding e2e passes end to end with the paywall in its new
place — recommendations render, "Create schedule" leads to the purchase screen,
"Start with Pepstack" leads to the schedule builder, and the run still ends on
Today with the schedule rows written. 63 tests green, unchanged count.

**Found and not changed:**

- **The recommendations CTA still reads "Create schedule", and now the next
  thing it shows is a price.** Not wrong — the schedule is what it is buying
  towards — but it is the one place the move introduces a small mismatch between
  a button and what happens. Renaming it is a copy call (section C), and every
  alternative I tried either says "Continue", which the standing rules forbid,
  or pre-announces the paywall, which is a product decision.
- **The paywall's own copy still argues for the app in general**, not for the
  list the user has just been shown. Now that it sits directly after the
  recommendations there is an obvious better version of that screen — it can
  name what was found. That is new copy, so it is a proposal, not a fix.
- **A persisted step index survives the reorder but not its meaning.**
  `store.ts` clamps a stored `step` to the array bounds, which is all it can do;
  someone mid-flow across this change lands on whatever now occupies that index.
  Harmless for a build nobody has installed, worth remembering once one is.
- `ensureTodayDoses` still double-inserts under StrictMode. Night 1, still open,
  still out of scope, and 0.11's persona runs will hit it on every persona.

Build green, `tsc --noEmit` green, 63 tests green. Bundle 1,026.24 kB minified,
319.61 kB gzipped.

---

## Night 11 — 0.11, twenty runs through onboarding

**Changed.** A persona driver and twenty runs, in `tests/e2e/personas.spec.ts`
and `tests/e2e/support/persona.ts`. Plus the one defect they found that was
small enough to fix.

`onboarding.spec.ts` walks the flow as a straight line, which is the right
shape for one happy path and the wrong shape for twenty — half of what is worth
testing is the flow *not* going straight. So the driver is a loop instead: it
reads `data-step` off `.ob-root`, does whatever the persona says for that
screen, waits for the step to change, and repeats. Nothing in it knows the
order of `FLOW`, so moving a screen cannot leave these passing while the
product is broken. One new attribute in the product to make that possible:
`data-step` on the onboarding root, because most screens say "Continue" and
guessing which one you are on from a heading is how a reordered flow passes a
green suite.

Each run records every screen in the order it was shown, the ms spent on each,
the progress-bar value, the final recommendation list with its dose lines and
reasons, the "what was left out" block, the schedule it built, and anything
that rendered blank or was clipped. That record is attached to the test as
`run.md`, so a failure arrives with the whole run rather than one assertion.

The clipping check runs on the finished screen, not the arriving one: Chrome
counts a transformed descendant in its ancestor's scrollable overflow, so a
screen measured mid-slide reads 60px wider than the phone — every screen, every
run, a report of nothing twenty times over. The audit waits on the wrapper's
own animations first, and only its own, because the two loading screens run an
infinite one underneath that never settles.

**All twenty ran green at 393 wide.** No screen rendered blank, none was
clipped horizontally, and nothing overflowed a container that could not scroll
— including the current-stack screen holding fifteen chips, and the meals
screen holding none. 23 screens for most personas; 22 for the one that retired
q3; 24 for the one that went back and re-opened it. 16–22s each of driving
time, of which 6.3s is the three hard-coded holds (2.2 + 1.8 + 1.4) and the
0.9s fake purchase. Whole suite 3.5 minutes, 85 tests.

**The one real defect, fixed.** `ProfileProvider` fetches the profile row once,
when the user id changes, and onboarding writes its answers straight through
`api.ts` rather than through `prefs.save`. The user id does not change at the
end of onboarding — so the app opened on the row as it was at signup. Persona
13 (awake 23:00 to 07:00) is what made it visible: the Today arc spanned
7:00 AM to 11:00 PM, the default window, while the schedule underneath it
correctly held a 23:00 dose. Same defect silently applies to age and sex, which
the supplement sheet uses to pick an intake figure. It corrects itself on the
next cold start, which is the worst kind of wrong. `finish()` now awaits
`refresh()` before handing over.

**Also fixed, because it made the first four runs meaningless.** The `app`
fixture was not `auto`, and Playwright only builds a fixture a test asks for by
name. A test that destructured `{ page }` alone got no Supabase stub, no
console-error check and no unhandled-call check, and its requests left the
browser for real. The symptom was a signup failing on an empty response body,
which reads exactly like a broken screen. It is `auto: true` now — there is no
test that should opt out of it.

**Found and not changed:**

- **The recommendations screen has no empty state, and it is a dead end.**
  Verified, not inferred: put everything your goals match into the current
  stack and the screen renders the heading, the sub-line telling you to "untick
  anything you don't want" with nothing to untick, the "what was left out"
  block, and a disabled "Create schedule". The only exit is the back chevron.
  With 286 products this needs a determined user, but it needs no bug — and the
  empty state belongs to section B, which is a whole item.
- **`DEFAULT_GOAL_IDS` is unreachable from the product.** The goals CTA is
  disabled at zero selections, so nothing a user can do reaches the results
  with an empty goal list; persona 6 had to write the store directly to get
  there. The fallback works — it produced energy and immunity, and the
  sub-line named them. But it is either dead code or the goals screen should
  be skippable, and which of those is a product decision.
- **The progress bar jumps two segments when q3 is retired.** Measured, once
  per run, exactly where expected. The bar is one segment per `FLOW` entry
  filled up to the current index, so the denominator is the flow rather than
  the path this person will actually walk. I read that as the honest version —
  a bar that renumbered itself per answer would claim progress it has not made
  — and 0.12 changes the length anyway. Asserted rather than left to a reader,
  so a future change to either has to say which it meant.
- **`finish()` swallows every write.** `updateProfile` and every
  `addScheduleItem` are `.catch(() => {})`. If the schedule write fails the
  user still lands on Today, on an empty day, with nothing said. Section B.
- **A vegan is still recommended collagen.** Persona 1 confirms the proposal
  already sitting in section E of the queue: nothing on a glossary row says
  what a product is made from, so the diet answers cannot exclude on it.
  Collagen is bovine or marine, always.
- `ensureTodayDoses` still double-inserts under StrictMode — persona 13's
  Today screen shows the 23:00 magnesium twice. Night 1, still open, still out
  of scope.
- `pickReference` falls back to the 19-50 band for an age band it holds no row
  for, so the 14-year-old in persona 9 gets an adult figure with nothing saying
  so. The real catalogue does carry 24 `14-18` rows, so this only bites the
  nutrients that have none; the test fixture has none at all, which is why it
  showed up here. Deliberate behaviour, worth knowing about.

Build green, `tsc --noEmit` green, 85 tests green (63 → 85: 22 new e2e).
Bundle 1,026.53 kB minified, 319.72 kB gzipped.

---

## Night 12 — 0.12, trim the flow back under 20 screens

**23 screens to 19.** Four cuts, none of them one of the three questions this
whole section exists to add.

**The first candidate on the list did not exist.** There is no progress-photo
screen in onboarding. `src/screens/ProgressNotes.tsx` is in the app proper and
`FLOW` has never referenced it, so "move it into the app" was already true. The
audit screen the spec also asks about is not in the flow either.

**`auth-choice` + `auth-form` → `auth`.** The chooser offered Apple, Google and
email. Apple and Google are `disabled` until the providers are switched on in
Supabase, so the screen's only working control was "continue with email" — a
whole screen whose one live button meant "next", and the second screen anyone
ever sees. The providers keep their place at the top for the day they ship, the
form sits under them behind a rule reading "or use email", and the Terms and
Privacy line moved into the footer next to the CTA where it now covers the
submit it is about. The signup and sign-in modes, the confirm-email state and
the mode toggle are unchanged.

**`info-library` + `info-recs` → `info`.** Two consecutive screens that
explained rather than asked. Merging them was on the list; the second one also
needed fixing whatever happened to it, because since 0.2 its copy was false —
it said suggestions come from "the goals you pick, your age and your sex —
nothing else", and diet, reactions and form preference have all been feeding
the scorer since 0.3. It now says goals and the answers you give us. That is
the App Review paragraph as much as the user's, so it mattered that it was
wrong.

**`sleep` + `meals` → `day`.** Titled "Your day, part one" and "Your day, part
two", which is a split naming the seam it is on the wrong side of. One screen:
the ring, the two time cards, then a MEALS label and the list under it. Both
halves became plain fragments — `SleepDial` and `MealList` — and `Day`
composes them into the one `Screen`. It scrolls on a 393×852 phone, which the
sleep screen already did.

**`q1` cut.** "How many peptides or supplements are you taking right now?" was
answered by counting, four screens before `current-stack` asks the same thing
and gets back a list the scorer actually reads for the double-up check. Its
answer went into the store and nothing ever read it — grep, not inference. q2
and q3 keep their ids rather than shuffling up to q1 and q2: `survey` is
persisted in localStorage, and renumbering would silently drop the answers of
anyone part-way through the flow when the build updates under them. `load()`
now names the two fields instead of spreading, so a store written before
tonight does not carry a dead `q1` forward.

Final order, 19: welcome → auth → profile → diet → info → q2 → q3 → day →
current-stack → reactions → forms → goals → notifications → building-recs →
recommendations → paywall → building-schedule → schedule → done.

**Found and not changed:**

- **q3 is now the only screen left whose answer nothing reads.** Its sub-line
  says "This decides how the schedule is laid out" and it decides nothing —
  `survey.q3` is written and never looked at again, exactly like the q1 that
  went tonight. q2 at least gates q3. Either the layout should use it or the
  sub-line is a claim the app does not keep, and which of those is a product
  decision rather than a 3am one. I left it because the spec's twenty runs
  lean on the q2/q3 branch and cutting into it during a trim is how you lose a
  test that is worth more than the screen.
- **The progress bar is one segment per `FLOW` entry, so it just got wider
  per step.** 19 segments rather than 23, and it still moves two over the
  retired q3. Same honest reading as night 11; nothing to fix, worth knowing
  the number changed.
- **`Sub` is now a paragraph rather than a subtitle** on exactly one screen.
  `.ob-sub + .ob-sub` spaces the second one. If a third screen ever wants two
  paragraphs this is fine; if it wants three it wants a different component.
- **The merged auth screen has dead space mid-screen** at 393×852 with the
  keyboard down. It fills the moment a field is focused, and the alternative
  is centring a form that then jumps when the keyboard opens. Left as is.
- Everything flagged in night 11 that I did not touch is still open: the
  recommendations dead end, `DEFAULT_GOAL_IDS` being unreachable, `finish()`
  swallowing every write, the vegan-collagen gap, and `ensureTodayDoses`
  double-inserting under StrictMode.

Build green, `tsc --noEmit` green, 85 tests green. The twenty persona runs are
18-20 screens each and ~15s of driving time, against 22-24 screens and 16-22s
last night. Bundle 1,025.37 kB minified, 319.31 kB gzipped.

---

## Night 13 — A, ask AI end to end without a key

**The spec this item points at does not exist.** `PROMPT_DISCOVER_AI.md` is not
in the repo and never has been — `git log --all -- PROMPT_DISCOVER_AI.md` is
empty, and the only string in the tree that mentions it is the queue line
itself. That line describes the job in enough detail to build against (JWT
verification, the rate limiter, the catalogue fetch, the tool schema, the
server-side peptide rejection, and five named fixtures), so it was the spec. If
the real file exists somewhere off this machine, the two things to check
against it first are the response body shape and where exactly the peptide line
is drawn — everything else is mechanical.

**Changed.** `supabase/functions/ask/`, three files, split on one line: what
needs Deno, and what can be tested without it.

- **`lib.ts`** — request parsing, the scope gate, the rate-limit arithmetic,
  the prompt, the tool schemas, and turning what the model asked for into
  cards. No Deno globals, no imports, no clock: `index.ts` passes in what it
  read. That is what lets 27 unit tests run it in Node.
- **`fixtures.ts`** — the five canned responses.
- **`index.ts`** — the Deno handler. CORS, then the JWT, then the rate limit,
  then scope, then the answer. In that order on every request, including the
  stubbed ones.
- **`supabase/migrations/0024_ask_rate_limit.sql`** — `ask_usage`, one row per
  question. Not applied.
- **`tsconfig.json`** — `lib.ts` and `fixtures.ts` added to `include`, so the
  green gate actually typechecks them. `index.ts` stays out; it needs `Deno.env`
  and npm: specifiers. That needed `allowImportingTsExtensions` on, because Deno
  requires the `.ts` in `import … from './lib.ts'`. It permits, it does not
  require, and nothing in `src/` uses it.

**The rate limiter is real in both modes.** 15 an hour and 50 a day, both
rolling — a fixed hourly bucket lets someone spend a whole allowance twice
across the boundary. The count is taken before the model is called *and* before
the fixtures are read, so the stub hits the same ceiling the live path does and
the UI cannot be built against a limit that only exists in production.

**The stub is not a mock.** The fixtures hold the prose and a list of slugs;
the cards are then resolved through exactly the same `buildCards` the live path
uses, against the real catalogue, with the real papers attached. Only the
sentences are canned. The three products it names come from migrations 0021 and
0022, which are written and not applied, so each fixture also carries a
stand-in row that is used only when the slug is not in the database yet — the
card renders either way, and gets better once those migrations are run.

**Peptides and pregnancy are refused by the server, not by the prompt** — with
or without a key, before the model is called, with fixed wording. A rule in a
system prompt is a request; this is not. Pregnancy is checked first, so "is
BPC-157 safe while pregnant" gets the see-a-clinician answer rather than the
we-don't-advise-on-peptides one.

**Three decisions worth arguing with in the morning:**

- **The peptide gate is mention-based, and that is deliberately blunt.** Any
  question naming a peptide gets the refusal, not just one asking for a dose.
  It matches on the hardcoded list in `lib.ts` plus every `kind = 'peptide'`
  name and slug in the glossary, so the library stays the authority. It also
  refuses anything about injecting, reconstituting or syringes whatever the
  substance — including "should I inject B12 instead", which is a real question
  a real person might ask and will now get a flat no. The false-positive risk
  runs the other way too: a short peptide slug like `vip` would fire on the
  word "VIP". Tests pin the cases that matter most — collagen peptides and
  casein decapeptide are products we sell and must not be refused.
- **Server-side refusal fallbacks are on** (`fallbacks: 'default'`, beta
  `server-side-fallback-2026-07-01`), because a health question can trip a
  safety classifier and the fallback answers it instead of returning a refusal.
  I cannot test that path — no key — so `callModel` catches a 400 that names
  the beta and retries once without it. Six lines of insurance against every
  request 400ing on the first morning somebody sets a key.
- **A refused question still spends a slot.** No model call happens, so it
  could be refunded, but `ask_usage` has no delete policy on purpose — that is
  what stops a client clearing its own count — and adding one to refund
  refusals would open the hole the missing policy exists to close.

**Found and not changed:**

- **The 176 products from 0021 carry no `timing` and no `evidence`.** Only the
  74 older rows have those columns filled in. So a card for anything in the new
  catalogue shows less than a card for anything in the old one, and the
  assistant is told "evidence: not recorded" for most of the library. Nothing is
  broken; it is a data gap that will read as an inconsistency the moment two
  cards sit side by side.
- **`src/screens/AskAI.tsx` is untouched** and still answers with its hardcoded
  "I'm not connected yet" string. Wiring it is the next queue item and starting
  it tonight would have been two items in one run.
- **The live path has never run.** There is no key here and there should not be
  one. Everything from `callModel` outwards — the tool loop, the block parsing,
  the beta parameter — is written from the API docs and typechecked by nothing,
  because `index.ts` is Deno. First run with a real key should be a cheap
  question with the function logs open.
- **`ask_usage` grows forever.** Rows older than a day are read by nothing. A
  scheduled delete wants pg_cron on a live project, which is a decision about
  the project rather than a line in a migration.
- **The app still has injection UI, which contradicts the positioning line.**
  `BodyMap.tsx`, `ReconCalculator.tsx` and `doses.injection_site` are all
  live while `CLAUDE.md` says no injection-related UI or questions anywhere.
  My scope gate now refuses injection questions in the one place the app talks
  back, which makes the mismatch sharper rather than softer. Not mine to
  delete — rule 7 — but it is a real inconsistency and somebody should decide
  which side of it the product is on.
- **One e2e flake, once.** On the first full run `onboarding.spec.ts` failed
  its first attempt waiting 10s for the "What we found" heading and passed on
  retry; the confirming run was clean, 112 for 112. Nothing in `src/` changed
  tonight and the screen it waits on sits behind a timed transition, so this
  reads as machine load — worth knowing that the 10s expect timeout is close
  enough to the mark to lose under load.

Build green, `tsc --noEmit` green, 112 tests green (85 before tonight). Bundle
1,025.37 kB minified, 319.31 kB gzipped — unchanged, because nothing in `src/`
changed.
