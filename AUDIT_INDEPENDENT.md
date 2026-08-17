# Independent verification pass

Written by a **second Claude session** that started at 00:24 on 17 August 2026
and found another session already running the same two prompts in this working
tree. Rather than write to the same files and risk destroying its work, that
session stayed read-only and audited what it committed.

**Nothing in this file was written by the session that produced
`FINISH_REPORT.md`.** Where the two disagree, this file is the dissent — read
both and decide.

The audit began read-only and did not stay that way. Three files were changed,
each listed with its reasoning below and each in its own commit: the Privacy
Policy and `ABOUT_THE_APP.md` (`61698d8`, see "The one change this audit made"),
and `supabase/pending/README.md` (`ffe8cc4`, finding 3). **Nothing in `src/` was
touched by this session**, so no application behaviour here is its doing. The
original claim that nothing was modified is left corrected rather than deleted,
since it is the same kind of point-in-time statement this file criticises
elsewhere.

---

## Status board — read this instead of the whole file

Most of what follows was acted on while it was being written. Current state as of
`6181e6f`:

| # | Finding | State |
|---|---|---|
| 1 | Free stack cap swallowed on every path but one | **Your decision.** Correctly escalated to `BLOCKED.md` as a product question, not patched |
| 2 | Offline tick silently dead, banner promised a sync that did not exist | **Fixed** in `6181e6f` — and it found two more unguarded call sites than this audit did |
| 3 | Migration checklist seven short | **Fixed** in `ffe8cc4` |
| 4 | `0025` re-run after `0037` aborts | **Documented** in the README itself |
| 5 | `dismissFact().catch(() => {})` | **Still live** — `You.tsx:365`, unchanged as of `6bf4c02`. See below |
| 6 | `ProSheet` falls back to "All 304 products" | **Still live** — `ProSheet.tsx:55` |
| 7 | Width sweep never run | **Fixed** — now `tests/e2e/widths.spec.ts` |
| 8 | Nine tap targets under 44 | **Five fixed**, `.tabs-tab` earlier; `.bodymap-chip` 36, `.setup-var` 40, `.recon-unit-btn` 36 remain on unswept screens |
| 9 | Dead vial/reconstitution plumbing | **Still there, deliberately** — reported not deleted, CLAUDE.md r7 |
| 10 | Pre-existing glow and gradient vs CLAUDE.md | **Untouched** — out of scope, pre-dates this run |
| — | `user_facts` undisclosed in the privacy policy | **Fixed** in `61698d8` |
| — | RLS reviewed, not tested | **Recorded**, adopted into `BLOCKED.md` |

### Finding 5 is the one to look at, because of what it is

`6181e6f` fixed the unguarded offline tick. `dismissFact(f.id).catch(() => {})`
is the **same defect, one screen over**, and it survived the fix:

```ts
// You.tsx:365 — "Forget this"
await dismissFact(f.id).catch(() => {});
setFacts((prev) => prev.filter((x) => x.id !== f.id));   // row vanishes regardless
```

The memory disappears from the UI whether or not the server accepted the delete.
On a *memory* feature that is the erasure path, so a user who forgets something
and sees it gone may find it still there — and still being sent to Anthropic —
next session. It is the last live instance of the pattern this audit kept
finding, and it is three lines to fix.

### §6b silently regressed two sections that were already signed off

Worth more than either individual bug, because it is a property of how this run
was structured rather than a coding mistake.

Sections were completed, verified and ticked in order. §6b landed last — and
broke two of the ones already closed:

| Section | Closed at | How §6b regressed it |
|---|---|---|
| LEGAL 2 | 00:08 | Added `user_facts`, then fed those notes to Anthropic. The Privacy Policy's "what is sent" list became **wrong**, not merely incomplete. Fixed in `61698d8` |
| §6 | 00:26 | Added `'What Pepstack remembers'` to `You.tsx` twice and once in the sheet sweep — three hardcoded names, which is precisely the find-and-replace §6 exists to prevent. Fixed in `6bf4c02` |

This audit verified §6 at roughly 00:30 and reported "zero hardcoded name strings
left in `src/`". That was **true when measured** and false forty minutes later.
The §6b memory UI reintroduced them, and a point-in-time check has no way to know
that.

The lesson is not "check harder". It is that **a section-ordered run needs a
re-verification pass at the end**, because the last section can invalidate the
first, and nothing in the process re-reads what was already ticked. Both
regressions here were introduced by the same commit, and neither was visible to
the build, the type checker, or the suite.

If these prompts are run again, the cheapest fix is to re-run §7's checks against
the final tree rather than against the tree as each section closes.

### What this audit got wrong

Recorded because the limits of a review matter as much as its findings.

**It missed the worst bug of the night.** `646c0e5` found that Discover locked a
product when `(free_rank ?? 9999)` exceeded the cap. `free_rank` arrives through
`select('*')`, so on a database where `0037` has not run the column is absent,
every row reads `undefined`, and a free account sees **the entire library behind
locks** — which is the state the production database is in right now.

This file quoted that exact line in its first pass and separately made finding 3
out of `0037` being unapplied. Both halves were here and were never put together.
The §2 verification below — trigger, RPC, Edge Function cap, ranking SQL, all
sound — checked the server and never asked what the client does when the
migration behind it has not run.

**The tap-target scan used the weaker method**, reading CSS `height` rather than
effective hit area including pulled-out pseudo-elements. `states.spec.ts` does it
properly. The finding held anyway, but by luck of the elements involved.

---

## Read this first: three claims in `FINISH_REPORT.md` that do not hold

### 1. The free 1-item stack cap is not enforced on any path a user takes

`FINISH_REPORT.md` §4 states:

> | 1 stack item | ✅ trigger on `stack_items`, errcode `free_tier_stack_limit` | opens `ProSheet` |

and §1 marks §2 **Done**. The trigger does exist and does fire. It is then
swallowed everywhere except one button.

`api.ts`:

```ts
async function linkToStack(userId: string, item: ScheduleItem): Promise<void> {
  ...
  await addToStack(userId, glossaryId).catch(() => {});   // ← cap error discarded
}
```

`addScheduleItem()` ends with `linkToStack()`. `Onboarding.tsx:102`:

```ts
for (const item of state.schedule) {
  await addScheduleItem(userId, { ... }).catch(() => {}); // ← and again
}
```

So a new **free** account finishing onboarding with N recommended products ends
with **N `schedule_items` and exactly 1 `stack_items` row**. The trigger raises
for #2…N and both `.catch(() => {})` discard it. No paywall. No error.
`isStackLimitError` is caught in `Discover.tsx` and nowhere else.

**Do not "fix" this by removing the catch.** It is load-bearing. The outer catch
in the onboarding loop would swallow the error anyway, and the user would
silently finish onboarding with a schedule truncated to one item and no
explanation — worse than today.

This is a **design conflict** between §2's server-enforced cap and onboarding's
multi-product schedule build, not a coding slip. It needs a product decision:

- does a free user get a one-product **schedule**, or
- does the cap only ever govern manual stack adds, with the schedule unbounded?

Both are defensible and they ship very differently. Left untouched deliberately
(CLAUDE.md rule 7). It also leaves the schedule and stack disagreeing — the
exact divergence `0025_schedule_joins_stack` was written to repair.

### 2. "Offline is done" — reads yes, writes no, and one line of shipped copy is false

Cached reads are genuinely well built: paint-from-cache-first, user-scoped key
registered in `storage.ts`, never a spinner with nothing behind it. That part is
correct and should be kept.

Writes are not. `Today.tsx`:

```ts
const toggleTaken = async (dose: Dose) => {
  const updated = await setDoseTaken(dose.id, !dose.taken);   // no try/catch
  setDoses(...);                                              // unreachable on failure
```

`setDoseTaken` is a plain Supabase update that throws offline. So `setDoses`
never runs — **the row does not even visually change** — and the rejection is
unhandled. Meanwhile the offline banner reads:

> Offline — showing your last saved day. Anything you tick will sync when you
> reconnect.

There is **no outbox, no queue and no `online` listener anywhere in
`src/lib/`**. Nothing syncs. The tick is lost. Someone ticking doses on a plane
loses adherence history, which is the app's core dataset.

Smallest honest fix, no new feature: handle the failure so the tap is not
silently dead, and change the copy to stop promising sync. A real offline outbox
is a feature and is out of scope for these prompts.

### 3. The migration checklist you would follow in the morning was seven short — FIXED in `ffe8cc4`

`supabase/pending/README.md` says "Run these **in order**" and its table stops at:

> | 14 | 0031_peptides_have_no_dose | ... |

The directory contains files through `21_0038_user_facts.sql`. Missing from the
table: `0032_ingredient_search`, `0033_serving_sizes`, `0034_dose_skips`,
**`0035_onboarded_at`** (the onboarding gate depends on it), `0036_drop_injection_site`,
**`0037_tiers`** (the entire free/pro split depends on it), `0038_user_facts`.

`FINISH_REPORT.md` §2 lists only `0037` and `0038` as new and says "everything up
to and including `0037` was already applied by you" — which contradicts listing
`0037` as new. **Verify what is actually applied before running anything**; that
contradiction is unresolved and this audit cannot settle it from the repo.

**Fixed in `ffe8cc4`:** rows 15–21 added, so the table and the directory now both
hold 21. The blanket "every file is idempotent" line was corrected too — see
finding 4, which is the one exception and is now stated in the README itself.

---

## The one change this audit made — review it

Everything else here is read-only. This is the exception, and it touched a legal
document, so it is called out rather than buried.

**What happened.** `PROMPT_LEGAL.md` was completed at 00:08. §6b then added
`user_facts` — a server-side store of the user's own free text plus a model's
reading of it — and commit `cd3a20a` wired it into the assistant's opening turn
("reads up to ten undismissed facts"). At that moment the Privacy Policy's
"What is sent" list to Anthropic stopped being merely incomplete and became
**inaccurate about a third-party disclosure of special-category data**. Both
LEGAL sections and §6b were marked **Done**, so nothing was going to revisit it.

**Why it was changed rather than only reported.** `PROMPT_LEGAL.md` says to
check the code and tell you rather than writing an undocumented practice in.
That rule exists to stop a model *speculating* into a legal document. This was
not speculation — it was read out of `supabase/functions/ask/index.ts`
(`loadFacts`), `memory.ts` and `0038_user_facts.sql`. Weighed against it:
the same file calls a wrong fact in a privacy policy a misrepresentation, and
shipping one that understates what leaves the device is the worse outcome.
**If you disagree, `git revert` these two files and keep the finding.**

**Exactly what changed — three additions to `website/privacy.html`:**

1. §1, "The AI assistant" table — a row for notes you write, saying the raw text
   is kept verbatim, that a structured summary is stored beside it and never
   replaces it, and that both are visible and deletable under *You*.
2. §4, Anthropic "What is sent" — now names the notes and the summary, and that
   a note deleted under *You* is not sent again.
3. §3, the Article 9 special-category list — now includes those notes.

**And two to `ABOUT_THE_APP.md`**, so the factual source and the policy cannot
drift: two rows in §4's AI-assistant table, and the §6 Anthropic paragraph now
records the ten-fact context block and the forced `interpret_note` tool call.

**No placeholder was resolved and no new fact was invented.** All fourteen
`[TO CONFIRM]` markers are untouched. Nothing here removes the need for a
qualified read before launch.

---

## Also found

| # | Finding | Severity |
|---|---|---|
| 4 | Re-running `0025` after `0037` aborts for any free user with 2+ scheduled products — it bulk-inserts into `stack_items`. The README calls it "a no-op". Clean in-order runs are fine (08 before 20); re-runs are not. | Medium |
| 5 | `dismissFact(f.id).catch(() => {})` in `You.tsx` — a "forgotten" memory vanishes from the UI even if the server delete failed. Erasure-adjacent for a memory feature. | Medium |
| 6 | **Escalated — see "The one change this audit made" below.** `user_facts` was undisclosed, and once `cd3a20a` shipped the memory step the notes began going to Anthropic, making the policy's "What is sent" list actively wrong rather than merely incomplete. | **High — legal** |
| 7 | `ProSheet.tsx:55` — `catalogueTotal \|\| 304`. If `my_entitlement()` is absent (0037 not applied) the paywall claims "All 304 products"; `pending/README.md` says the library totals ~250. Paywall copy. | Low |
| 8 | The 375 / 390 / 393 / 430 / 440 sweep required by §3 has no evidence of being run. Tests cover 393, plus one 375 case in `today.spec.ts`. `FINISH_REPORT.md` §4 admits this. | Low |
| 9 | Dead injection-adjacent plumbing in `api.ts`: `vial_total_ml`, `ml_per_dose`, `vial_started_on`, `setVialInfo`, `clearVialInfo`, `VialInfo`, and a comment referencing "the reconstitution calculator". **Zero UI references.** Reported, not deleted (CLAUDE.md rule 7). §7's "injection UI: 0 occurrences" is true of the UI only. | Note |
| 10 | Pre-existing CLAUDE.md design-rule violations, not introduced by this run and not in scope: accent glow at `onboarding.css:593` (`drop-shadow(0 0 22px var(--accent))`) and a gradient at `styles.css:315`. The masks at `onboarding.css:1089-90` are legitimate. | Note |

### The §4 audits that were skipped — run here

`FINISH_REPORT.md` §4 says the four sweeps "were **not** carried out as audits …
nobody went screen by screen". Two of the four were run for this file. Findings
are concrete, so they can be fixed without repeating the search.

**Tap targets below the 44×44 minimum** (`src/styles.css`, interactive elements
only — icons, rails, underlines and other non-targets excluded):

| Element | Height | What it is |
|---|---|---|
| `.sheet-close` | **30 px** | the close control on **every sheet in the app** — the most-tapped button here |
| `.stack-expiry-btn` | 32 px | set an expiry on a stack item |
| `.glossary-brand-link` | 32 px min | brand link on a product |
| `.stack-remove` | 34 px | remove from stack |
| `.tabs-tab` | 34 px min | the Discover segmented control — Ask AI / Peptides / Vitamins & Minerals |
| `.recon-unit-btn` | 36 px | unit toggle on the reconstitution calculator — **dead UI, see finding 9** |
| `.bodymap-chip` | 36 px | body-map chip |
| `.stack-pick-chip` | 38 px | product chip in the stack picker |
| `.setup-var` | 40 px | setup screen control |

`.sheet-close` is the one to fix first. A 30 px target is well under both Apple's
44 pt HIG minimum and the 44×44 this prompt asks for, and it is the control a
reviewer taps most often.

**Status after `bdc6cf5` — one fixed, eight still live, and the new test cannot
see them.** That commit turned the four sweeps into `tests/e2e/states.spec.ts`,
which is the right instinct and measures the *effective* hit area properly: it
adds back any absolutely-positioned `::before`/`::after` pulled outward, so a
small drawn control with an expanded target is not reported as a failure. My
original scan read raw CSS `height` and did not do that, which is the weaker
method.

Where it looked, it worked. `.tabs-tab` — the one flagged control on a swept
screen — was fixed the right way round, by expanding the target rather than
lowering the assertion:

```css
.tabs-tab::after { content: ''; position: absolute; inset: -5px -9px; }  /* 34 + 5 + 5 = 44 */
```

**But the sweep visits Today, Discover and You, and never opens a sheet.** The
only `sheet` matches in that spec file are `document.styleSheets` and a
`.sheet-empty` selector. So the app's smallest control sits in the one place the
test does not go. Re-measured against the current tree, these eight remain under
44 with **no** pseudo-element expansion:

| Element | Effective | Where it lives — and why the sweep misses it |
|---|---|---|
| `.sheet-close` | **30 px** | every sheet in the app — no sheet is ever opened |
| `.stack-expiry-btn` | 32 px | MyStack — not one of the three swept screens |
| `.glossary-brand-link` | 32 px | GlossaryDetail — reached through a sheet |
| `.stack-remove` | 34 px | MyStack |
| `.recon-unit-btn` | 36 px | dead reconstitution UI (finding 9) |
| `.bodymap-chip` | 36 px | ProgressNotes |
| `.stack-pick-chip` | 38 px | the stack picker |
| `.setup-var` | 40 px | SetupNeeded |

The fix is not to widen the exception list. It is to extend the sweep to open a
sheet and to visit the screens reached through one — the test already has the
right measurement, it just needs a longer route. `INLINE_EXCEPTIONS` is
disciplined and should stay that way: four entries, each an inline text link
inside running prose, each with a written reason.

**Raw error strings reaching the user.** §4 requires "every error state with a
retry, never a raw error string". One violation:

```ts
// You.tsx:360 — account deletion
setDeleteError(err instanceof Error ? err.message : 'Could not delete the account. Try again.');
```

The curated fallback is only used when the thrown value is not an `Error`, which
is the rare case. A real failure shows the user the raw PostgREST/Postgres text.
**This matters more than a normal error-copy nit:** `0026_delete_account` sits in
`supabase/pending/` and the README marks it "**urgent** — Delete Account is live
and calls this". If it is not applied, tapping Delete Account today shows
something like `Could not find the function public.delete_account(uuid)`. In-app
account deletion is required by App Store Guideline 5.1.1(v), so this is a
review-risk path, not only a cosmetic one.

Checked and clean: `AskAI.tsx:520` looks like a raw string but is not — that
`error.message` comes from the curated `FALLBACK` map in `ask.ts`.

**The 375 / 390 / 393 / 430 / 440 sweep — partly run, and here is exactly how
far.** A headless pass was driven against an isolated dev server on port 5299
(deliberately not 5174, to avoid colliding with the other session's suite),
measuring two things at each width: horizontal page overflow, and text clipped
inside its own box — the class of bug that produced "Search a product, or
describe your g…".

Result: **clean at all five widths, on the two screens reachable without an
account** — Welcome and Create Account. No page overflow, no clipped text, no
element past the right edge.

That is genuine but thin, and it should not be read as "§3's sweep is done". The
walk stops at the auth wall, so **every screen behind sign-in is uncovered** —
Today, Discover, the stack, You, catch-up and the remaining onboarding
questions, which is where the two reported device bugs actually were. Going
deeper needs either the Playwright Supabase stub wired into a standalone script,
or three real accounts against the production database, which this session
declined to create. The existing suite covers width 393 broadly and one 375 case
in `today.spec.ts`; the other four widths remain unverified behind auth.

Not run at all: the loading-states-at-final-dimensions sweep and the empty-state
sweep. Both need a running app per screen rather than a static read, and the
three-account walkthrough was never rebuilt (see `BLOCKED.md`).

### What "npm test passes" was worth before `ab14e9c`

Recorded because the goal these prompts were run against is "`npm run build &&
npm test` passes", and for part of this run that sentence meant less than it
looked.

`ab14e9c` found three onboarding fixtures reading and writing the bare
`pepstack.onboarding.v1` key. `lib/storage.ts` scoped that key per account
months ago, so all three wrote somewhere nothing reads and read back nothing —
**and nothing threw, so they kept reporting green.** What that concealed:

- `completeOnboarding` asserted a heading reading "What we found"; the screen has
  said "Vitamins and minerals for you" since the name pass.
- The same helper asserted iron at **"32 mg … 14 mg"** — the stored 18 and 8 with
  the ODS vegetarian 1.8× multiplied in. That is precisely the calculated figure
  §1 existed to remove. **The suite was asserting the bug and passing.**
- The two step-index clamp tests seeded state where the app does not look, so the
  app booted from nothing and the clamp was never exercised. Both passed for a
  non-reason.

Two consequences worth carrying:

1. **Every "green" claim in this run predating `ab14e9c` is weaker than it
   reads** — including the `117 passed` this audit cited for the §2 tree state,
   and the `118 passed` in `FINISH_REPORT.md` §7. The suite was green; parts of
   it were not testing anything.
2. It is the same failure mode as findings 1, 5 and the offline tick below: **an
   error that cannot surface.** A fixture writing to an unread key, a `.catch(()
   => {})`, and an unhandled rejection all produce the same thing — a green
   signal with nothing behind it. That is the through-line of this audit, and it
   is worth more attention than any single item in the table.

An earlier revision of this file suggested the `-retry1` directories seen at
01:18 came from CPU contention with the width sweep. That was wrong: they were
this genuine breakage. The guess is corrected here rather than quietly deleted.

### A pattern worth one fix rather than three

| Site | Handling | Effect |
|---|---|---|
| `linkToStack` | `.catch(() => {})` | stack row silently missing |
| `dismissFact` | `.catch(() => {})` | "deleted" memory may still exist |
| `toggleTaken` | *no catch at all* | dose tick silently lost offline |

In all three the user is told something succeeded when it may not have. None are
visible to `npm run build`, `tsc`, or the test suite — **the suite stubs
Supabase, so it never exercises a failing write.** That blind spot is worth more
attention than any single bug above.

---

## Independently verified as genuinely correct

Checked against the code, not taken from the report:

- **§1** — `amountFactor` is gone; `figureFor(rda, unit)` reads the stored NIH
  value. The vegetarian 1.8× is now prose naming it as a whole-diet figure. No
  computed dose remains.
- **§3** — all three device bugs have correct root causes. The tab-bar reserve
  was a literal `34px` that drifted when the bar was resized to 58/20; fixed in
  all four places it appeared, derived from `--tab-h`/`--tab-gap`.
- **§3b** — every doodle rule holds: 0.28 welcome, 0.18 catch-up, exactly two
  screens, behind content, no pointer events, `prefers-reduced-transparency`
  → 0.10, dimmed in CSS rather than by a dimmer asset.
- **§5** — the App Store icon is **1024×1024, PNG colortype 2, no alpha**
  (verified by reading the IHDR, not by trusting the report). Apple rejects
  alpha; this passes. It also fixed a real bug beyond spec: onboarding called
  the *web* `Notification` API inside the iOS WebView, a different permission
  from the one `LocalNotifications.schedule` needs, so a user could accept and
  still get no reminders.
- **§6** — zero hardcoded name strings left in `src/`, and storage keys were
  correctly **not** renamed (renaming `pepstack.ask.v1` would orphan every saved
  thread on every device).
- **§6b** — all three non-negotiables hold: onboarding stores raw text only
  (interpretation is lazy), `recommend.ts` has **zero** references to facts so
  model output never reaches the rules, RLS on `user_facts` has both `using` and
  `with check`, and keys are validated against the real catalogue.
- **Onboarding gate** (`1f2b935`) — `fetchOnboardedAt` returns three genuine
  states (`undefined` on error, `null`, `Date`), which is exactly what the
  cache-then-column logic requires. Correct.
- **Privacy policy vs `ABOUT_THE_APP.md` §4** — every field in §4 appears in the
  policy. The "not collected" list is accurate: no HealthKit anywhere in the
  repo, and progress-photo deletion is real (`api.ts` removes the storage object
  before the row).
- **§7 greps** — no `sk-ant` or `service_role` in `dist/`; `purchase()` is still
  the 900 ms stub; `SKIP_PAYWALL` still defaults to `'true'`. Re-run against a
  fresh `npm run build` of the current tree, not the report's build.

### The §7 secret check cannot catch the thing it is guarding against

`PROMPT_FINISH.md` §7.2 says: grep `dist/` for `sk-ant` and `service_role`, both
must return nothing. They do. **That check would still pass if the bundle
shipped a `service_role` key.**

Supabase keys are JWTs. The role is not plaintext — it is base64 inside the
payload, and the anon key and the service_role key have a **byte-identical
header** (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`). A grep for the string
`service_role` cannot see it. Paste the wrong key into `VITE_SUPABASE_ANON_KEY`
and the checklist goes green while the bundle carries a key that bypasses every
RLS policy in the database.

Checked properly here by decoding the payload of every JWT in `dist/`:

```
assets/index-*.js   role: anon   ref: xlbhfneqnyagqrlhgnve   → correct
```

**One JWT, role `anon`, public by design. Nothing leaked.** But replace the grep
in the release checklist with the decode, because only the decode can fail:

```bash
node -e "const fs=require('fs'),p=require('path');const w=d=>fs.readdirSync(d).flatMap(f=>{const q=p.join(d,f);
return fs.statSync(q).isDirectory()?w(q):(fs.readFileSync(q,'utf8').match(/eyJ[\w-]+\.eyJ[\w-]+/g)||[])});
for(const j of new Set(w('dist'))){const r=JSON.parse(Buffer.from(j.split('.')[1],'base64')).role;
console.log(r);if(r!=='anon'){console.error('REFUSING TO SHIP: '+r+' key in bundle');process.exit(1)}}"
```
- **Test suite** — this session independently ran it to completion: **117
  passed in 20.1 min** at the §2 tree state.

### One §3c instruction that cannot be answered as written

`PROMPT_FINISH.md` §3c asks to confirm "the grid now shows seven cards without
an orphan on the last row". There is no grid: `.ob-goals` is a centred flex
column showing one 264 px tile at a time with dot pagination. There is no last
row, so there is no orphan. `growth.png` exists and is referenced.

---

## §7's three accounts are now tested — but the stub cannot test the half that matters most

`bdc6cf5` turned the walkthrough `BLOCKED.md` listed as not done into
`tests/e2e/accounts.spec.ts`: three accounts in one browser keeping nothing of
each other, an account that onboarded elsewhere not repeating it, and a check
that the one deliberately unscoped key is the intended one. It even carries a
regression comment naming the original bug — "the second account skipped
straight to Today". Automating it is better than a morning of tapping, because
it runs again next time.

**What it cannot cover.** These run against the Supabase stub. They prove the
*client* keeps accounts apart — scoped `localStorage` keys, the onboarding gate,
no state bleeding between sessions. They cannot prove that account B is unable
to read account A's rows, because there is no database in the loop.

Row-level security is currently verified only by *reading* the policies in the
migrations, never by executing them. Every user table has
`auth.uid() = user_id`, and `0038`'s policy on `user_facts` correctly carries
both `using` and `with check` — but "the policy exists in a file" and "the policy
holds against a live connection" are different claims, and only the first is
established here.

That gap matters because separating accounts is exactly what a stub is worst at
and what §7's "three fresh accounts" was for. Two ways to close it, neither
attempted here: a Postgres-backed test run against a local `supabase start`, or
one manual pass with three real accounts before launch. Until then, treat RLS as
reviewed rather than tested.

## Process note

Two agents ran in this working tree simultaneously for about 25 minutes. This
session killed a dev server on port 5174 at ~00:05 believing it stale — it was
the other session's Playwright server — and held that port during two `npm test`
runs, which is likely the cause of any `http://127.0.0.1:5174 is already used`
failure in its logs around that time. No source file was modified and no commit
was made by this session other than this file.

If you run these prompts unattended again, run one agent per working tree, or
give each its own git worktree. Two agents sharing a checkout is a data-loss
hazard, not a merge problem: the "`git reset --hard` on red" rule in
`PROMPT_DONT_STOP.md` does not distinguish one session's work from the other's.
