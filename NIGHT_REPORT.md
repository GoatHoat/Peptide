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
