# The last one — do not come back until all of it is done

This is the final queued instruction. **Everything queued before it still stands
and must be finished too.** Do not treat this as a replacement for the rest.

Outstanding at the time of writing, and all of it is yours:

```
PROMPT_FINISH.md   PROMPT_TIERS.md    PROMPT_LEGAL.md    PROMPT_COST.md
PROMPT_NOTIFICATIONS.md   PROMPT_MEMORY.md   PROMPT_ACCOUNT_SCOPING.md
```

Read `FINISH_REPORT.md`, `DECISIONS.md` and `BLOCKED.md` first — they are your own
notes from the last run. Do not redo what is already done, and reopen everything
listed as blocked.

## How you work through this

`PROMPT_DONT_STOP.md` governs the whole run. In short: never stop to ask, make the
conservative call and log it in `DECISIONS.md`, try twice then reset and move on,
no mid-run summaries, and the six hard rules (no remote migrations, no push, no
touching `purchase()` or `SKIP_PAYWALL`, no invented legal facts, no secrets, no
deleting what you do not understand) do not bend because nobody is watching.

Order: finish the queue first, then §1 below, then §2, then §3. §3 is last because
it audits everything the others change.

---

# 1. A longer onboarding that earns the paywall

`FLOW` is currently 17 steps. Make it longer — but **length only converts when
every step gives or gathers something.** A step that just tells the user
something is padding, and padding is where people quit. Every screen you add must
either collect an answer that visibly changes the result, or show them something
built from what they have already given.

### Add steps that do work

Split what is currently crammed together, and add what is missing:

- **Wake and sleep** and **meal times** as separate screens, not one `day` step.
- **How many things do you take now** before **which ones** — an easy number
  before a harder list.
- **A short "here is what we found" beat after `current-stack`** — for example,
  naming an interaction already present in what they typed. This is the first
  moment the app proves it knows something they do not.
- **Goal priority** after `goals` — if they picked three, which matters most.
- **A commitment step** — "how many days a week do you want to hit?" People
  follow through on numbers they chose themselves.
- **A short building/reveal pair** before the recommendations, as already exists,
  but with the user's own inputs echoed back in the copy.

Target **24–28 steps**. Do not pad past that; the extra steps must be defensible
individually and you should list what each one earns in your report.

### Keep the paywall after the value

The paywall stays **after** `recommendations`, never before. The user must see
their actual list, with reasons, before they are asked for anything.

---

# 2. The free-tier reveal

The pattern: show everything the app can do, then be honest at the moment of
choice about what free includes.

### The flow

1. `recommendations` — the full personalised list, say six to eight products,
   each with its reason and its evidence chip. They select the ones they want.
2. `paywall` — both plans, prices clear, and a visible **Continue with Free**
   option. Not hidden, not greyed, not tiny.
3. If they choose Free → a new step, `free-pick`:

   > **Free covers one product**
   > You picked six. Choose the one to track — you can change it any time, and
   > Pro removes the limit.

   Their earlier selections are all listed. They pick one. The others stay
   visible, marked as available on Pro. Nothing they chose is silently discarded.
4. From there into `building-schedule` as normal, with a one-product schedule.

### The line this must not cross

The user must be able to see the whole recommendation list **before and after**
this screen, and the app must never imply free gets more than it does.

- The paywall names the free limits **before** they choose, not only after.
- No countdown, no fake scarcity, no "offer expires".
- The five other products stay readable in Discover. Locking the *stack* is the
  limit; hiding what the app already told them would read as a bait and switch,
  and Apple's 2.3.1 covers misrepresenting what a purchase gets you.

Done honestly this converts better anyway. Somebody who has seen six things they
want and been told plainly that one is free has a real reason to upgrade.
Somebody who feels tricked leaves a one-star review saying so.

### Expect drop-off, and measure it

A 26-step onboarding with a one-item free tier will lose people. That is the
trade being made deliberately. Instrument the flow so the step-by-step drop-off is
visible later, even if it only logs locally for now.

---

# 3. Two full passes, then the Apple audit

### 3.1 Two complete app-wide runs

Two different people, start to finish, nothing skipped:

**Run A — the maximal user.** Signs up fresh, answers every question, picks all
seven goals, lists eight current products including a multivitamin, reports three
reactions, chooses Pro. Then: schedule, Today, tick doses, Discover both tabs,
search an ingredient, open a product, add to stack, ask the assistant four
questions including one about peptides, report an answer, edit the schedule,
trigger the catch-up screen, export data, check every You row, delete the account.

**Run B — the minimal user.** Signs up, skips every optional question, picks one
goal, takes nothing currently, chooses Free, hits the one-product limit, tries to
add a second, hits the paywall, sends four AI messages to hit the three-message
cap, goes offline and opens Today, comes back online.

Fix everything either run turns up. Report what broke.

### 3.2 The full Apple review guidelines pass

Not only the sections you think apply. **All of it, section by section.**

Fetch `https://developer.apple.com/app-store/review/guidelines/` and work through
**every numbered guideline in all five sections** — 1 Safety, 2 Performance,
3 Business, 4 Design, 5 Legal — including the subsections that obviously do not
apply.

For each, one row:

| Guideline | Applies? | Status | Evidence / what to fix |
|---|---|---|---|

- **Applies** — yes, no, or partially. Say why in six words.
- **Status** — pass, fail, at risk, or cannot verify.
- **Evidence** — the file and line, or the screen, that makes it pass. "Looks
  fine" is not evidence.

Write it to `APPLE_AUDIT.md`.

Going through the non-applicable ones matters: that is how you find the guideline
nobody expected to be relevant. Do not skip a section because the heading sounds
unrelated — read the actual text.

Pay particular attention to, and never mark green without evidence: **1.4.1** and
**1.4.2** (health and dosage), **1.2** (the assistant's output), **2.1** (a demo
account exists, backend live, no stubbed controls), **2.3** (metadata accuracy and
that free-tier claims match reality), **3.1.1** and **3.1.2**, **4.2** (minimum
functionality), **5.1.1** (data, permission strings, in-app deletion) and
**5.1.2**.

Fix everything you can. List what you cannot with the exact reason.

---

# Done means all of this

- Every outstanding prompt file above, complete
- Everything in `BLOCKED.md` reopened and either fixed or re-blocked with a reason
- `FLOW` at 24–28 steps, each one justified in the report
- The free-pick step working, honest, and reachable both ways
- Both full runs completed and their failures fixed
- `APPLE_AUDIT.md` covering every guideline in all five sections
- `npm run build && npm test` green
- Every section committed separately
- `FINISH_REPORT.md`, `DECISIONS.md`, `BLOCKED.md` updated

If any one of those is outstanding, you are not done.

## When you do come back

Be exact. Which sections are complete, which are partial, which are blocked and
why. Every migration I still need to apply. Every function under
`supabase/functions/` I need to deploy. Every decision you made for me. Every
guideline you could not verify.

Do not round up. "Twenty-two of twenty-six steps, free-pick working, Apple audit
covers sections 1–4, section 5 outstanding" is worth more to me than a claim of
completion I have to spend a day checking. Your reports have been accurate all
along — that is the reason this keeps running unattended. Keep it that way.
