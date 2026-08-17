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

---

# Part A, the two runs — 17 August, second attempt

**How they were run:** headless Chromium driving the real UI on the Vite dev
server against the Supabase stub. Observed, not reasoned — every screen listed
below was actually rendered and actually clicked. `tests/e2e/runs.spec.ts` is
the harness and is re-runnable.

**Status: PARTIAL. Onboarding was walked end to end in both runs. The app phase
was not completed in either.** Both tests hit their time limit during the
post-onboarding section, before the recorder printed its report, so the
screen-by-screen output does not exist yet. Do not read this as the runs being
done.

## What was observed

**Run A** reached **Today** with all seven goals selected and a schedule built —
confirmed from the failure snapshot, which shows the Today screen with the week
strip rendered. It then ran out of time during the app phase (Discover, the four
assistant questions, You, deletion).

**Run B** also reached **Today**, on a free one-product account.

## The one finding the runs produced

**The goals screen cannot be driven by index.** The first attempt stalled for six
minutes on step 16 of 27 with "Skin & hair, selected" on screen. The reel pages
its neighbours in from off-stage behind a mask, so `.ob-goal-icon` exists in the
DOM for all seven but only the centred one accepts a tap. Clicking `nth(1)`
waits forever on an element that is present, visible to the accessibility tree,
and unclickable.

This is a **harness** finding, not an app defect — a person swipes, and
`persona.ts` already pages by tab before tapping. But it is worth knowing that
the seven goal glyphs are not independently addressable, and it is exactly the
kind of thing only a walk finds.

## What is still not observed

Everything after Today in both runs: ticking doses in two blocks, both Discover
tabs, the ingredient-inside-a-blend search, opening a product, the four
assistant answers, the report control, editing the schedule, catch-up, export,
the You rows, account deletion and re-signin; and for Run B the one-product
limit, the three-message cap, and offline.

**The stack-insight question you care most about is unanswered.** Run A's
`current-stack` step types product names into the search and clicks whatever
matches; against the stub catalogue there is no multivitamin, so the
zinc-inside-a-blend case was never set up and `stack-insight` was never asked
the question that matters. Answering it needs either the real catalogue or a
stub fixture carrying a multivitamin whose panel contains zinc without the word
in its title. That fixture does not exist.

## Why it is not finished

Time in the run, not a blocker. The harness works; the two tests need a longer
budget than the session had left, and one of them was blocked by a dev server
left holding port 5174 from the previous attempt.


---

# Part A, third attempt — 17 August, later

Still **PARTIAL**, and this is the third time. Exactly what happened:

**Run A got into the app.** The failure snapshot shows Today with its week
strip, Discover, "Meet PepStack AI", and "You: Smoke" — all four panels
rendered, so onboarding completed with seven goals, a schedule was built, and
the app phase was under way. It then hit the 900-second limit before the
recorder printed, so **no screen-by-screen list exists**.

**Run B was still executing** when the session ended. No result either way.

**No `SCREENS`/`FINDINGS` block was ever printed by either run.** The recorder
only prints at the end of a passing test, which is the design flaw: a run that
times out throws away everything it observed on the way.

## The two things to change before a fourth attempt

1. **Print incrementally, not at the end.** `visit()` should `console.log` each
   screen as it is reached. Then a timeout still yields the list up to the point
   it stopped, which is the whole value of a walk.
2. **The walk is too slow.** Roughly 15 minutes for Run A, against ~22 seconds
   for `onboarding.spec.ts` over the same flow. The cost is fixed
   `waitForTimeout` calls — 350ms per goal, 450ms per stack entry, 1800ms per
   assistant question, 600-900ms between panels — which add up to minutes of
   pure sleeping. They should be replaced with waits on actual conditions.

Neither is a product defect and neither is large. They are the reason the run
has not produced its report three times.

## Unchanged from the second attempt

The goals-reel finding stands: seven `.ob-goal-icon` buttons exist but only the
centred one accepts a tap.

The zinc-inside-a-multivitamin question is **still unanswered** — the stub
catalogue holds no multivitamin, so `stack-insight` was never asked it.

---

# Part A, fourth attempt — the walk finally reported

Two changes made it produce output: the recorder prints each screen as it is
reached rather than at the end, and the fixed `waitForTimeout` calls came down
from minutes of sleeping to a fraction of that.

## Run A — onboarding, observed, 26 screens in order

welcome · auth · profile (age) · sex · diet · info · q2 · q3 · day (wake/sleep) ·
meals · stack-count · current-stack · stack-insight · reactions · forms · goals ·
goal-priority · commitment · notifications · building-recs · recommendations ·
plan-preview · paywall · building-schedule · schedule · done

Nothing errored, nothing rendered blank, nothing scrolled sideways, and
`stacks.png` loaded on `info`.

### What it found

**1. `plan-preview` contradicted the screen before it. FIXED.** It said
"Products found 3" immediately after the recommendations screen had shown six.
The value was `picks.length` — the ones ticked, not the ones found. Relabelled
to "Products you picked".

**2. `plan-preview` stated a number nobody could stand behind. FIXED.** "Blocks
in your day 1" came from `new Set(picks.map(p => p.withFood ? 'meal' : 'any'))`,
which is not what a block is; the solver decides that and has not run at that
point in the flow. The screen's own subtitle says "Nothing below is a guess", so
the row is gone rather than guessed.

**3. The goal is called "Immunity", not "Immune".** Harness bug — 6 of 7 goals
were selected because the seventh was looked up by the wrong name.

**4. `current-stack` accepted none of the six products typed into it.** Every
one logged "produced no match to click". This is most likely the harness using
the wrong selector for a result row rather than an app defect — but it has not
been confirmed either way, and it is why finding 5 happened.

**5. The zinc-inside-a-multivitamin question is STILL unanswered.** Because of
4, the stack was empty, so `stack-insight` correctly said *"Nothing here fights
anything else — you are starting from nothing"*. That is the right output for an
empty stack and tells us nothing about the case that matters. Answering it needs
the real `current-stack` selector **and** a stub fixture carrying a blend with
zinc in its panel but not in its title. Neither exists.

## Still not observed

Everything after `done` in both runs. The walk stalled between the last
onboarding screen and Today and produced no further output before the session
ended. Run B was not reached at all this time.
