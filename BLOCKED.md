# Blocked

Nothing is hard-blocked. Both items that stood here are finished; what remains
is work I am not allowed to do and one product decision that is not mine.

## Done since this file was written

- **The lazy interpretation step for `user_facts`** (PROMPT_FINISH §6b). Built
  in `supabase/functions/ask/memory.ts` and called from the first assistant turn
  after a note is written. It needs `supabase functions deploy ask` to exist in
  production.

- **The three-fresh-accounts walkthrough** (PROMPT_FINISH §7). Now
  `tests/e2e/accounts.spec.ts`. It needed three changes to the fixtures: the
  stub can swap identity, its signup creates the profile row the real trigger
  creates, and sign-in is written once rather than through `addInitScript`,
  which re-runs on every navigation and put the session straight back after a
  sign-out.

## What I cannot do, by instruction

- **Apply `0037_tiers` and `0038_user_facts`.** Written, listed, left. Git can
  revert a file; it cannot revert a dropped column.
- **Deploy the Edge Function.** `supabase/functions/ask/` has changed twice this
  run and neither change is live.
- **Answer the fourteen legal placeholders.** Country, entity, minimum age,
  retention period and contact address are facts about you, not about the code.

## What is not mine to decide

**Does a free account get a one-product schedule, or an unbounded one?** The
`0037` trigger caps `stack_items` at one for free accounts. Onboarding builds a
schedule of several products and calls `addToStack` for each through a
`.catch(() => {})`, so on a free account the trigger raises for every item after
the first and the error is discarded. The result is N schedule items and one
stack row, with no paywall and no error shown.

Do not close it by deleting the catch. The outer loop in `Onboarding.tsx`
swallows the error too, so the visible effect would be a schedule silently
truncated to one item with no explanation — worse than today. It is a conflict
between the server-enforced cap and onboarding's multi-product build, and the
two answers ship very differently. Untouched deliberately.

## One claim to downgrade

**Treat row-level security as reviewed, not tested.** Every user table carries
`auth.uid() = user_id` and `0038`'s policy on `user_facts` correctly has both
`using` and `with check` — but that is read from the migration files. Nothing
executes a policy: `accounts.spec.ts` runs against a stub with no database in
the loop, so it proves the *client* keeps accounts apart and cannot prove that
account B is unable to read account A's rows. Closing that needs either a
Postgres-backed run against a local `supabase start`, or one manual pass with
three real accounts before launch.

---

# Not done, as of the 17 August run

Written against `PROMPT_LAST.md`. Nothing here is blocked by a rule — it is
work I did not reach. Listed exactly rather than rounded up.

## §1 — a longer onboarding: DONE (superseded, see below)

Original entry kept for the record:

### §1 — a longer onboarding: NOT DONE

FLOW is **20 steps**, not the 24–28 asked for. The only step added is
`free-pick`, and it was added for §2 rather than for §1. None of the named
splits exist: wake/sleep/meals are still one `day` screen, there is no
count-before-list step, no "here is what we found" beat after current-stack, no
goal-priority step, no commitment step, and the building/reveal pair does not
echo the user's own inputs back.

This is the largest remaining item and the most invasive — every added step
moves the progress arithmetic, the clamp test, and the skip rules, all of which
have already bitten twice this run.

## §3.1 — the two full runs: NOT DONE

Neither Run A (maximal) nor Run B (minimal) was walked end to end. The automated
suite covers a lot of the same ground — 22 personas, the three-accounts walk,
the free-tier reveal, the states and widths audits — but that is not the same
thing and must not be reported as if it were.

## §3.2 — the Apple audit: NOT DONE

`APPLE_AUDIT.md` does not exist. `APPLE_COMPLIANCE.md` is an older, partial pass
over the sections somebody thought applied, which is precisely the shape the
prompt says not to accept. Nothing was fetched from
developer.apple.com/app-store/review/guidelines this run.

## What was done this run

- `PROMPT_COST.md` — all six sections. Migration `0039`, measured cost per call,
  a dollar ceiling, the catalogue filter (61–83% smaller prompts, measured), the
  240-character composer.
- `PROMPT_NOTIFICATIONS.md` — all five sections; `NOTIFICATIONS.md` says which
  of its ten checks were verified and which were reasoned about.
- §2 of `PROMPT_LAST.md` — the free-tier reveal, with tests.
- The sign-in bug: an existing account no longer re-runs onboarding.
- The images: they were never copied into `ios/App/App/public`, which is what
  the device serves. `npx cap copy ios`.


---

# After the final-three run, 17 August

## Part 1 — onboarding: DONE

FLOW is **27 steps**, inside the 24–28 band. Six additions and two splits, each
justified in `FINISH_REPORT.md` and in the commit. 22 personas pass against it.

## Part 3 — the Apple audit: DONE

`APPLE_AUDIT.md` covers every numbered guideline in all five sections. Five
things block upload and four of them are yours: `SKIP_PAYWALL`, `purchase()`,
the ten legal placeholders, a support contact, and metadata.

## Part 2 — the two full runs: NOT DONE

Neither Run A nor Run B was walked as a person. This is the one item of the
three still outstanding and it should not be reported any other way.

What exists instead, and what it does and does not cover:

- **Onboarding** is covered thoroughly — 22 personas walk it end to end,
  including every optional question skipped, no goals, fifteen products, and a
  kill-and-relaunch mid-flow.
- **The free tier** is covered — `tests/e2e/freetier.spec.ts` walks paywall →
  Continue with Free → free-pick → schedule.
- **Accounts** are covered — `tests/e2e/accounts.spec.ts` walks three accounts
  in one browser, sign-out, and sign-in to an already-onboarded account.
- **Not covered by anything**: the post-onboarding journey as one continuous
  session. Ticking doses, then editing the schedule, then asking four assistant
  questions, then exporting, then deleting the account — each is tested in
  isolation and none is tested in sequence. Order-dependent bugs are exactly
  what a full run finds and exactly what the suite cannot.

The specific things Run A and Run B would have exercised that nothing currently
touches at all: searching an ingredient that only appears inside a blend,
reporting an assistant answer, triggering catch-up from a real overdue dose,
going offline and back online in one session, and walking every row of You in
one pass.
