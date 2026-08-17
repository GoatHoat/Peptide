# The three that are left

`BLOCKED.md` lists exactly three things outstanding: the longer onboarding, the
two full app runs, and the Apple audit. Everything else is done. This finishes
them.

## How you work

**Do not stop to ask me anything.** I am not available. Where a decision is
needed, take the most conservative option that keeps the app shippable, do it,
and add one line to `DECISIONS.md`.

Blocked is not a reason to stop. Try twice, `git reset --hard` that section, write
it up in `BLOCKED.md`, move to the next part immediately. No mid-run summaries,
no pausing for acknowledgement between parts. Commit after each part with a real
message.

The hard rules hold and do not bend because nobody is watching: **never apply a
migration to the remote database**, never `git push`, never touch `purchase()` or
`SKIP_PAYWALL`, never invent a legal fact, never write a secret, never delete
something you do not understand.

Do Part 3 last — it audits what Parts 1 and 2 change.

---

# Part 1 — onboarding to 24–28 steps

`FLOW` is 20. The point is not length for its own sake: a longer flow converts
because the person has invested in it, and investment comes from *answering*, not
from reading. **Every step you add must either collect something that visibly
changes the result, or show them something built from what they already gave.**
A screen that only tells them something is padding, and padding is where people
quit.

### Split what is currently crammed together

- **`day` becomes two**: wake and sleep on one screen, meal times on the next.
  Four time pickers on one screen is the densest moment in the flow.
- **`profile` becomes two**: age, then sex. Age on its own with the ruler is a
  satisfying first interaction; pairing it with a sensitive question makes both
  feel heavier.

### Add steps that do work

- **`stack-count` before `current-stack`** — "how many things are you taking at
  the moment?" A number is easy; a list is work. Asking the easy one first makes
  the hard one feel like a continuation rather than a wall. Use the answer to
  size the input that follows.
- **`stack-insight` after `current-stack`** — the first moment the app proves it
  knows something the user does not. If their entries contain an interaction, name
  it: *"Your multivitamin has 15 mg of zinc in it. That wants two hours from your
  iron — we'll handle it."* If nothing conflicts, say what it did find:
  *"Nothing in what you take fights anything else. We'll keep it that way."*
  Never a blank screen, never a generic reassurance.
- **`goal-priority` after `goals`** — if they chose more than one, which matters
  most. Feeds the ordering in `recommend.ts`. Skip the screen entirely when only
  one goal was picked; do not show a question with one answer.
- **`commitment`** — "how many days a week do you want to hit?" People follow
  through on numbers they chose themselves. Store it; it is the target the
  adherence view measures against.
- **`plan-preview` before the paywall** — one screen that reflects their own
  answers back before any money is mentioned: their goals, their block count,
  the number of products found. Built entirely from what they gave you.

That is six additions and two splits, taking 20 to 28. If any one of them cannot
be made to earn its place, cut it and say why rather than shipping filler.

### Rules that do not change

- The paywall stays **after** `recommendations`. They see the real list, with
  reasons, before anything is asked of them.
- `free-pick` stays exactly as built.
- Every new step is in `SKIPPABLE` where an answer is genuinely optional, and
  skipping must produce the same result as a neutral answer — never a crash,
  never an empty list.
- Progress indication must stay honest. If the bar implies twelve steps and there
  are twenty-eight, that is worse than no bar.

Instrument the flow so per-step drop-off is recordable later, even if it only
writes locally for now.

---

# Part 2 — two complete runs

Not the test suite. Two people, walked end to end, every screen touched.

**Run A — maximal.** Fresh signup. Every question answered. All seven goals.
Eight current products including a multivitamin and an iron supplement. Three
reactions reported. Chooses Pro. Then: schedule, Today, tick doses, both Discover
tabs, search an ingredient that only appears inside a blend, open a product, add
to stack, four assistant questions including one about peptides and one about
pregnancy, report an answer, edit the schedule, trigger the catch-up screen,
export data, every row in You, delete the account.

**Run B — minimal.** Fresh signup. Every optional question skipped. One goal.
Takes nothing currently. Chooses Free. Hits the one-product limit, tries to add a
second, gets the paywall. Sends four assistant messages to hit the three-message
cap. Goes offline and opens Today. Comes back online. Signs out and back in.

Fix everything either run turns up. Where a fix is too large, log it in
`BLOCKED.md` with what you saw.

Report both as a list of screens visited in order, with anything that errored,
rendered empty, shifted layout, or contradicted an answer given earlier.

---

# Part 3 — the complete Apple audit

Fetch `https://developer.apple.com/app-store/review/guidelines/` and work through
**every numbered guideline in all five sections** — Safety, Performance,
Business, Design, Legal — including the ones that obviously do not apply. Going
through those is how you find the guideline nobody expected to be relevant. Read
the actual text rather than judging from the heading.

Write `APPLE_AUDIT.md`, one row per guideline:

| Guideline | Applies | Status | Evidence or fix |
|---|---|---|---|

- **Applies** — yes / no / partly, with six words of why.
- **Status** — pass / fail / at risk / cannot verify.
- **Evidence** — a file and line, or a named screen. **"Looks fine" is not
  evidence and will be treated as not done.**

Never mark green without evidence on: **1.2** (assistant output, reporting),
**1.4.1** and **1.4.2** (health claims, dosage), **2.1** (demo account, backend
live, no control that does not do what it says), **2.3** (metadata accuracy, and
that the free-tier claims match what the code enforces), **3.1.1**, **3.1.2**,
**4.2** (minimum functionality), **5.1.1** (data collection, permission strings,
in-app deletion) and **5.1.2**.

Fix what you can. For anything you cannot, give the exact reason and what I would
have to do.

---

# Done means all of this

- `FLOW` at 24–28 steps, each addition justified in one line
- Both runs walked, their failures fixed or logged
- `APPLE_AUDIT.md` covering every guideline in all five sections
- `npm run build && npm test` green
- Each part committed separately
- `FINISH_REPORT.md`, `DECISIONS.md` and `BLOCKED.md` updated

If any one is outstanding you are not done.

# When you come back

Exact, not rounded. Which parts are complete, partial, blocked. Every migration I
still need to apply. Every function under `supabase/functions/` I need to deploy.
Every decision you took for me. Every guideline you could not verify and why.

"Twenty-six steps, both runs walked, audit covers sections 1–4, section 5
outstanding" is worth more to me than a claim of completion I have to spend a day
checking. Your reports have been accurate throughout and that is the only reason
this keeps running unattended.
