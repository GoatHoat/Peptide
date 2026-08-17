# Independent verification pass

Written by a **second Claude session** that started at 00:24 on 17 August 2026
and found another session already running the same two prompts in this working
tree. Rather than write to the same files and risk destroying its work, that
session stayed read-only and audited what it committed.

**Nothing in this file was written by the session that produced
`FINISH_REPORT.md`.** Where the two disagree, this file is the dissent — read
both and decide. No file in the repo was modified to produce this audit.

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

### 3. The migration checklist you would follow in the morning is six short

`supabase/pending/README.md` says "Run these **in order**" and its table stops at:

> | 14 | 0031_peptides_have_no_dose | ... |

The directory contains files through `21_0038_user_facts.sql`. Missing from the
table: `0032_ingredient_search`, `0033_serving_sizes`, `0034_dose_skips`,
**`0035_onboarded_at`** (the onboarding gate depends on it), `0036_drop_injection_site`,
**`0037_tiers`** (the entire free/pro split depends on it), `0038_user_facts`.

`FINISH_REPORT.md` §2 lists only `0037` and `0038` as new and says "everything up
to and including `0037` was already applied by you" — which contradicts listing
`0037` as new. Verify what is actually applied before running anything.

---

## Also found

| # | Finding | Severity |
|---|---|---|
| 4 | Re-running `0025` after `0037` aborts for any free user with 2+ scheduled products — it bulk-inserts into `stack_items`. The README calls it "a no-op". Clean in-order runs are fine (08 before 20); re-runs are not. | Medium |
| 5 | `dismissFact(f.id).catch(() => {})` in `You.tsx` — a "forgotten" memory vanishes from the UI even if the server delete failed. Erasure-adjacent for a memory feature. | Medium |
| 6 | `user_facts` is a new server-side store of user free text absent from both the privacy policy and `ABOUT_THE_APP.md` §4. The assistant does not read them yet, so the "sent to Anthropic" list is still accurate — but the **collection** disclosure is missing. `ABOUT_THE_APP.md` is the stated factual source, so update it first, then the policy. | Medium — legal |
| 7 | `ProSheet.tsx:55` — `catalogueTotal \|\| 304`. If `my_entitlement()` is absent (0037 not applied) the paywall claims "All 304 products"; `pending/README.md` says the library totals ~250. Paywall copy. | Low |
| 8 | The 375 / 390 / 393 / 430 / 440 sweep required by §3 has no evidence of being run. Tests cover 393, plus one 375 case in `today.spec.ts`. `FINISH_REPORT.md` §4 admits this. | Low |
| 9 | Dead injection-adjacent plumbing in `api.ts`: `vial_total_ml`, `ml_per_dose`, `vial_started_on`, `setVialInfo`, `clearVialInfo`, `VialInfo`, and a comment referencing "the reconstitution calculator". **Zero UI references.** Reported, not deleted (CLAUDE.md rule 7). §7's "injection UI: 0 occurrences" is true of the UI only. | Note |
| 10 | Pre-existing CLAUDE.md design-rule violations, not introduced by this run and not in scope: accent glow at `onboarding.css:593` (`drop-shadow(0 0 22px var(--accent))`) and a gradient at `styles.css:315`. The masks at `onboarding.css:1089-90` are legitimate. | Note |

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
  the 900 ms stub; `SKIP_PAYWALL` still defaults to `'true'`.
- **Test suite** — this session independently ran it to completion: **117
  passed in 20.1 min** at the §2 tree state.

### One §3c instruction that cannot be answered as written

`PROMPT_FINISH.md` §3c asks to confirm "the grid now shows seven cards without
an orphan on the last row". There is no grid: `.ob-goals` is a centred flex
column showing one 264 px tile at a time with dot pagination. There is no last
row, so there is no orphan. `growth.png` exists and is referenced.

---

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
