# Specific doses, a real schedule solver, the assistant, and a catch-up screen

Seven pieces of work. Read `CLAUDE.md`, `PROMPT_PERSONALISATION.md` and
`PROMPT_DISCOVER_AI.md` first — this builds on all three and does not repeat
what they already specify.

Do them in this order. Each is independently shippable and must leave the build
green.

1. Kill the "no specific recommendation" wording, and give every supplement a real number
2. Add Growth as a seventh goal
3. Peptides: no dose, no timing, anywhere, ever
4. A real schedule solver
5. "You are here" on the Today screen
6. The assistant, working end to end without a key
7. The catch-up screen

---

# 1. Every supplement gets a specific amount

Right now most entries render some variant of "no specific recommendation",
which is the single most useless thing the app can say. A user who has just
answered twelve questions and paid does not want to be told we don't know.

**The reason it says that is real, though, and the fix is not to invent
numbers.** Roughly a third of the catalogue are nutrients with published
reference intakes — vitamins and minerals have an RDA or AI and usually a UL
from the NIH Office of Dietary Supplements. The rest — creatine, ashwagandha,
NAC, berberine, curcumin, every botanical — have no RDA, because they are not
nutrients. There is no authority to cite for "you need 500 mg of berberine."

So use three sources, in this order of preference, and always show something:

**a. The label serving size.** Every product in the catalogue is a real DSLD
filing, and DSLD carries the full ingredient panel with the amount per serving
and the servings per container. Pull it. This is a specific, product-accurate,
citable number for **every single product**, including the botanicals. Store it:

```sql
alter table public.glossary
  add column if not exists serving_amount   numeric,
  add column if not exists serving_unit     text,
  add column if not exists serving_form     text,     -- '1 capsule', '1 scoop (5 g)'
  add column if not exists servings_per_day numeric default 1;
```

**b. The reference intake**, where the nutrient has one. Already modelled in
`nutrient_reference`. Show target and upper limit against the user's age and sex.

**c. The commonly studied range**, for non-nutrients only, and only where it can
be tied to a paper already in that product's five citations. Store it with the
citation id it came from:

```sql
alter table public.glossary
  add column if not exists studied_low   numeric,
  add column if not exists studied_high  numeric,
  add column if not exists studied_unit  text,
  add column if not exists studied_source_citation_id uuid references public.glossary_research(id);
```

If there is no paper in the library to hang it on, leave it null and show the
label serving alone. **Never generate a number that has no source.** A confident
wrong dose is worse than no dose, and it is the thing that would get this app
taken down.

### What renders

Replace every "no specific recommendation" string with the highest tier
available:

```
Take            2 capsules            ← always available, from the label
Which is        30 mg zinc            ← from the ingredient panel
Your target     11 mg/day             ← nutrient_reference, if it exists
Upper limit     40 mg/day             ← nutrient_reference, if it exists
```

For a botanical with no RDA:

```
Take            1 capsule
Which is        600 mg NAC
Studied at      600–1800 mg/day in the trials linked below
```

Grep the whole repo for every string that hedges — "no specific", "varies",
"consult", "not established", "depends" — and list each one you found and what
it now says. The only place "no established upper limit" survives is where that
is literally true, biotin being the obvious case.

### Stacking and the upper limit — do not skip this

Once the app gives numbers, it becomes responsible for the total. Three
products in a stack can each be under the UL and sum to over it — zinc appears
in a standalone, a multivitamin and an immune blend.

Sum every ingredient across the user's whole stack, per day, and compare against
the UL. If the total exceeds it, say so on the Today screen and in the stack,
naming both products. Never silently recommend something that pushes an existing
total over. This is the one place the audit feature earns its keep — keep it
small and factual, do not turn it into a feature.

---

# 2. Growth as a seventh goal

Add to `GOALS` in `src/onboarding/goals.tsx`:

```ts
{
  id: 'growth',
  name: 'Growth',
  copy: '...',                        // two lines, same voice as the others:
                                      // what the app does, not what the
                                      // supplement does
  tags: ['Growth', 'Muscle'],
  img: '/goals/growth.png',
}
```

`Growth` already exists as a `goal_tags` value on catalogue rows, so the tag
vocabulary does not need extending — but check migration `0003` and add it
properly if it is not in the canonical list. Artwork needs to match the other
six cubes; if `/goals/growth.png` does not exist, leave the file reference and
list it in your report rather than substituting a different image.

Six goals fit a 2×3 grid. Seven does not. Fix the layout so the last card is not
orphaned — either 2 columns with the seventh full-width, or restructure. Do not
leave a hanging card.

---

# 3. Peptides: no dose, no timing, anywhere

Enforce this in code, not in copy. Every one of these must hold:

- No peptide entry renders a target amount, a serving size, an upper limit, a
  studied range, or a timing chip. Not in Discover, not in the detail sheet, not
  in search results, not in the assistant, not in a notification.
- Peptides cannot be added to the schedule. If `schedule_items` can currently
  reference a peptide glossary row, block it at the API layer and in the UI.
- The assistant's `recommend` tool rejects any `glossary_id` resolving to
  `kind = 'peptide'`, server-side, as already specified in
  `PROMPT_DISCOVER_AI.md`.
- Peptide entries show: what it is, what the category is, the reference-only
  line, and the five articles. Nothing else.

Write a test that asserts it. Query every `kind = 'peptide'` row and assert
`serving_amount`, `studied_low`, `studied_high`, `timing` and any
`nutrient_reference` join are all null. That test failing should fail the build.

---

# 4. A real schedule solver

The current onboarding schedule drops things next to meals with no reasoning.
Replace it with an actual constraint solver in `src/lib/schedule.ts`.

### It runs on ingredients, not products

This is the part the current code gets wrong. Two products conflict because of
what is *in* them — a multivitamin containing 18 mg iron conflicts with a zinc
capsule even though neither is called "iron" or "zinc". Expand every product to
its DSLD ingredient panel first, then evaluate constraints against ingredients.

### Constraints

**Anchors — where an item wants to be:**

| Rule | Effect |
|---|---|
| `with_food` | must land within 30 min of a meal |
| `with_fat` | must land on the meal the user marked as largest, or dinner by default — fat-soluble vitamins (A, D, E, K) and omega-3 |
| `empty` | ≥2 h after a meal and ≥30 min before the next |
| `evening` | within 2 h of stated bedtime |
| `morning` | within 2 h of wake |
| `any` | free |

**Separations — pairwise minimum gaps, at ingredient level:**

| Pair | Gap | Why |
|---|---|---|
| iron ↔ zinc | 2 h | compete for absorption; matters at supplemental iron doses |
| iron ↔ calcium | 2 h | calcium blunts iron absorption |
| iron ↔ coffee/tea | 1 h | polyphenols bind non-haem iron |
| zinc ↔ copper | 2 h | chronic high zinc depletes copper |
| calcium ↔ magnesium | 2 h | shared transport at high doses |
| fibre (psyllium, glucomannan) ↔ everything | 2 h | binds and delays |

Read the existing pairs out of `src/lib/conflicts.ts` and keep them — do not
invent new interactions. Every separation must carry a `reason` string and, where
one exists, a citation id from the library. If you cannot source it, do not add
it.

### Objective — and this matters more than perfect spacing

**Minimise the number of distinct blocks, subject to the constraints above.**
Four blocks a day is the practical ceiling. A schedule that is pharmacokinetically
perfect and has seven blocks is worse than one with three that the user actually
follows — a supplement taken at a slightly wrong time is absorbed, one left in
the cupboard is not.

Anchor every block to an event the user already has: wake, each meal, bedtime.
Never produce a free-floating 15:20 block. If an item genuinely cannot be
satisfied without one, put it at the nearest anchor and say what was compromised.

### Explain every placement

Each scheduled item carries a one-line reason, shown in the schedule and in the
onboarding reveal:

> "With breakfast — needs fat to absorb."
> "Moved to lunch — keeps 2 hours from your iron."
> "Before bed — the only one that has to be away from food."

If the solver had to break a soft constraint, say so plainly: "Ideally 2 hours
from your calcium; your meal times only allow 90 minutes." Do not hide it.

### Tests

Table-driven, in `src/lib/schedule.test.ts`. At minimum: iron + zinc + calcium
in one stack never share a block; a fat-soluble vitamin always lands on a meal;
an `empty` item never lands within 30 min of one; a 12-item stack produces ≤4
blocks; a user with one meal a day still gets a valid schedule; an overnight
wake window (23:00–07:00) does not crash.

---

# 5. "You are here" on Today

A horizontal rule in the schedule list marking the current moment, sitting
between the item before now and the item after.

- Full-width hairline at `rgba(255,255,255,0.09)`, with the label `You are here`
  in the accent, 12px, on the left, and the current time on the right.
- Sits **between** rows, never on top of one.
- Before the first dose of the day it sits above everything; after the last, below.
- Moves live — it must reposition as time passes without a reload, same live
  clock the header already uses.
- On open, scroll so it is roughly a third from the top, so the user sees a
  little of what they have missed and more of what is ahead. Do not animate this
  on first paint.
- Items above it that are untaken should read as missed, not pending. That is a
  copy and state change, not a colour change — no red.

---

# 6. The assistant, complete except for the key

`PROMPT_DISCOVER_AI.md` specifies the Edge Function, JWT verification, rate
limiting and the tool schema. Build all of it. These are the additions.

### It reads the user's whole app

The function loads server-side, never trusting the client: profile (age, sex,
diet, reactions, form prefs), goals, the full stack with doses and times, the
computed schedule, adherence over the last 30 days, and — new in section 7 — the
reasons the user gave for missed doses. Pass it all in the system prompt. It must
never ask for something it already knows.

### It answers only from the library

The catalogue of every glossary entry and every citation goes in the system
prompt, reduced to `{ id, name, kind, tags, one_line }`. The model may only cite
`citation_id`s from that list. Every returned id is validated against the
database before rendering; anything unknown is dropped and the model asked once
to retry. No invented papers, ever.

If the library genuinely has nothing relevant, the assistant says so — "there's
nothing in the library on that" — rather than answering from general knowledge.
That sentence is a feature. It is the difference between this and a chatbot.

### Ranking by preference

Recommendations respect the user's stated form preferences as a **filter on what
is eligible**, then rank within that. "Topical only" or "powders only" narrows
the candidate set before ranking.

**Peptides are not ranked.** When a conversation lands on peptides, the
assistant returns the relevant library entries **unordered**, with no "best fit
for you", no rationale card, no amounts, no timing — presented as reading, with
the articles. This is a hard stop, enforced server-side in the tool schema, not
a prompt instruction.

The reason: ranking three peptides best-to-worst for a specific person, after
asking about their goals and diet, is a personalised recommendation to use
compounds that are prescription-only or unapproved depending on jurisdiction —
whether or not a dose is attached. That is App Store guideline 1.4.2 territory
and it puts the whole app at risk, not just the feature. Supplements are over
the counter and self-administered, so full ranked recommendations there are
fine, and that is where the value is anyway.

### The citation sheet

Tapping a recommendation card opens a sheet with that product's five articles.
**One is highlighted as the one the recommendation leaned on most.**

Get this from the model honestly: the `recommend` tool takes
`citation_ids: string[]` of exactly five plus `primary_citation_id`, which must
be one of those five. Validate that it is. Render it first, with the accent
hairline and a label — `Most of this came from here` — and the other four below
it, plain. If `primary_citation_id` is missing or invalid, render all five
unhighlighted rather than guessing.

### Without a key

When `ANTHROPIC_API_KEY` is unset the function serves from a fixture file so the
entire UI is exercisable. Fixtures must cover: a normal three-card supplement
answer with a highlighted citation, a peptide question returning unranked
reading, a pregnancy question that declines amounts, a "nothing in the library"
answer, a rate limit, and a server error. Setting the key is the only change
that makes it live.

---

# 7. The catch-up screen

On app open, if a scheduled dose time has passed since the app was last opened
and that dose is still unmarked, show a full-screen catch-up before the app.

### When it fires

- Last opened 21:00, opening at 11:00, dose at 10:30 → fires.
- Last opened 21:00, opening at 10:00, dose at 10:30 → does not fire.
- Never for a dose already marked taken or skipped.
- Never on very first launch, or before onboarding is complete.
- Multiple missed doses collapse into **one screen with one card per dose**, not
  a queue of screens. Nobody sliders six times.
- Fires at most once per dose. Dismissing without answering leaves the dose
  unmarked and does not re-prompt until the next app open.
- Store `last_opened_at` on the profile, server-side, so it survives reinstalls.

### The screen

Pure black, one card per missed dose: product name, form, the time it was due,
and the reason line from the scheduler.

**Yes is a slider.** Track full width minus 48px, 56px tall, 28px radius,
`#16161A`. The thumb is accent, 48px. Label inside: `Slide if you took it`. On
completion the track fills accent, the label becomes `Taken`, and it locks. It
must be draggable, not tappable — that deliberate friction is the point, because
a tap is what produces false "yes" answers.

**No is a small text button** underneath, `rgba(255,255,255,0.62)`, 15px:
`I didn't take this`. Not a button of equal weight. Not red.

### The reason

Tapping it opens a sheet: "What got in the way?" Structured chips, single select,
plus an optional free-text field:

```
Forgot
Wasn't near them
Ran out
Didn't feel like it
Felt off last time I took it
Was travelling
Something else
```

Store to a new table:

```sql
create table public.dose_skips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  dose_id     uuid not null references public.doses on delete cascade,
  reason      text not null,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.dose_skips enable row level security;
create policy "own rows" on public.dose_skips
  for all to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

RLS is not optional here — this is health-adjacent personal data.

### What it feeds

Pass an aggregate to the assistant's system prompt: reason counts over the last
30 days, and which blocks are worst. So it can say "you've skipped the 3pm block
eleven times, mostly 'wasn't near them' — worth moving it to dinner?" rather than
recommending a fourth thing to take at 3pm.

**Never make the user feel bad.** No streak-break animation, no red, no "you
missed 4 doses this week" as a headline. Copy stays neutral and short. The
feature exists to gather a reason and move the schedule, not to scold — a user
who feels judged marks everything taken and the data becomes worthless.

---

# Before you say it is done

1. Every peptide row: no dose, no timing, not schedulable. Test asserts it.
2. No string anywhere says "no specific recommendation". List what you replaced.
3. A stack containing iron, zinc and calcium never puts two of them in one block.
4. A 12-item stack produces four blocks or fewer.
5. Every scheduled item has a reason line; none is generic.
6. "You are here" is correct at 06:00, at 13:00, at 23:59, with 0 doses, with 1,
   and with 12.
7. Grep `dist/` for `sk-ant` and `ANTHROPIC`. Both return nothing.
8. The assistant answers, refuses, and returns "nothing in the library" correctly
   from fixtures with no key set.
9. Ask it for a ranked peptide list three different ways. No ordering, no
   amounts, in any of them.
10. Catch-up fires on the 21:00 → 11:00 case and does not on 21:00 → 10:00.

Then tell me: which products had no DSLD serving panel, which non-nutrients you
could not source a studied range for, any constraint pair in `conflicts.ts` you
could not attach a citation to, and how many blocks the solver produces for a
typical 8-item stack.
