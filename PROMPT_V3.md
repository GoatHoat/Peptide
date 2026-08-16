# Ingredients as first-class data — search, conflicts, and the week strip

Three pieces of work, and the first one is the foundation for the second. Read
`CLAUDE.md` and `PROMPT_V2.md` first. **This supersedes the "expand every
product to its ingredient panel" line in V2 section 4** — that section assumed
ingredient data existed. It doesn't. This builds it.

1. An ingredient table, and a synonym dictionary
2. Ingredient-aware search, in Discover and in onboarding
3. Ingredient-aware conflicts, replacing the name-matching in `conflicts.ts`
4. The week strip on Today

---

# 1. The problem, precisely

`src/lib/conflicts.ts` matches interaction rules by substring against the
product name:

> Matching is by substring against the lowercased item name, so "Zinc
> picolinate" matches the `zinc` rule.

That works for `Thorne Zinc Picolinate 30 mg`. It is completely blind to
`Thorne Basic Nutrients 2/Day`, which contains zinc, iron **and** calcium and
whose name contains none of those words. The scheduler will place that
multivitamin directly beside a zinc capsule and report no conflict.

It gets worse with the branded catalogue, not better —
`Nobi Nutrition Sambucus Elderberry` and `Protocol For Life Balance High Potency
D3 10,000 IU Cholecalciferol` carry less usable information in the name than the
generic slugs did.

The same missing data breaks search: someone typing "zinc" in Discover sees only
products with zinc in the title.

One table fixes both.

## The table

```sql
create table if not exists public.glossary_ingredient (
  id             uuid primary key default gen_random_uuid(),
  glossary_id    uuid not null references public.glossary (id) on delete cascade,
  ingredient_key text not null,      -- canonical: 'zinc', 'vitamin-d', 'iron'
  raw_name       text not null,      -- as printed: 'Zinc (as zinc picolinate)'
  amount         numeric,
  unit           text,
  is_primary     boolean not null default false,
  position       integer,            -- order on the label panel
  unique (glossary_id, raw_name)
);
create index on public.glossary_ingredient (ingredient_key);
create index on public.glossary_ingredient (glossary_id);
alter table public.glossary_ingredient enable row level security;
create policy "public read" on public.glossary_ingredient for select using (true);
```

Populate from the DSLD ingredient panel for every product —
`https://api.ods.od.nih.gov/dsld/v9/label/<id>` returns the full panel with
amounts and units. Every product in the catalogue has a real label ID, so this
is a fetch and a transform, not a research task.

`is_primary` is true for ingredients the product exists to deliver — the zinc in
a zinc supplement — and false for the excipients and the long tail in a
multivitamin. Heuristic: true if the ingredient appears in the product name, or
if it is one of the first three on the panel and present at a meaningful amount.
Where the heuristic is ambiguous, set false. Report how many you flagged
primary versus total.

## The synonym dictionary

This is the part that makes it work, and it cannot be skipped. A label says
`Cholecalciferol`, a user types `vitamin D`. A label says `Ascorbic Acid`, a
user types `vitamin C`.

```sql
create table if not exists public.ingredient_synonym (
  id             uuid primary key default gen_random_uuid(),
  ingredient_key text not null,
  synonym        text not null,
  unique (synonym)
);
create index on public.ingredient_synonym (synonym);
```

Seed it properly. At minimum every vitamin's chemical forms (cholecalciferol,
ergocalciferol → `vitamin-d`; methylcobalamin, cyanocobalamin, adenosylcobalamin
→ `vitamin-b12`; ascorbic acid, sodium ascorbate, ascorbyl palmitate →
`vitamin-c`; retinol, retinyl palmitate, beta-carotene → `vitamin-a`;
thiamine/riboflavin/niacin/niacinamide/pantothenic acid/pyridoxine/folate/
methylfolate/biotin), every mineral's salt forms (picolinate, bisglycinate,
citrate, oxide, gluconate, sulfate, orotate, malate, threonate), and the common
botanical latin names (Withania somnifera → `ashwagandha`, Curcuma longa →
`curcumin`, Silybum marianum → `milk-thistle`).

Build it from the raw ingredient strings you actually pulled — group them,
assign keys, and **list any raw string you could not confidently map** rather
than guessing. An unmapped ingredient should still be searchable by its raw
name; it just won't participate in conflict rules.

---

# 2. Ingredient-aware search

Applies to Discover's search field and to the goal/ingredient search in
onboarding. Both should go through one function.

Searching an ingredient returns **every product containing it**, whether or not
the name says so. Resolve the query through `ingredient_synonym` to a key, then
join `glossary_ingredient`.

Union this with the existing name and keyword matching — do not replace it.
Ingredient data can be incomplete, and a name match is still a real match.

## Two sections, not one list

You asked for the ingredient to also appear in at least one of the product's
five articles. I'd do that as **ranking rather than a filter**, and here is why:
a 25-ingredient multivitamin has five articles about multivitamins. None of them
is specifically about its 8 mg of zinc. Filtering on article coverage would hide
exactly the multivitamin results that matter most — those are the products whose
hidden ingredients cause the interactions this whole feature exists to catch.

So render two sections:

**Products for zinc** — `is_primary = true`, and the ingredient (or its
synonyms) appears in the title or abstract of at least one of that product's
five citations. This is your quality bar, applied where it makes sense. Sort by
amount descending.

**Also contains zinc** — everything else, each row showing the amount:
`Thorne Basic Nutrients 2/Day — 15 mg zinc`. Collapsed under a "12 more products
contain zinc" row that expands. Sorted by amount descending.

If a section is empty, don't render its header.

To evaluate article coverage you need the citation text searchable. Store
`title` (already stored) and add an `abstract` column populated from the PubMed
`esummary`/`efetch` you are already calling. Match the ingredient key and its
synonyms against both.

## Show the amount everywhere

Once ingredient data exists, every product row in a search result for an
ingredient shows how much of it is in there. That single number is the most
useful thing on the screen and you currently can't display it.

---

# 3. Ingredient-aware conflicts

Rewrite `conflicts.ts` to operate on ingredient keys instead of name substrings.

**Keep every existing rule** — zinc↔iron, calcium↔zinc, omega-3 needs a meal,
magnesium and glycine in the evening — and keep their messages. Change only what
they match against. Then add the pairs listed in V2 section 4, each with a
`source` field carrying a citation id from the library. Any rule you cannot
attach a source to, leave out and report.

Rules now resolve like this:

1. Expand each scheduled product to its ingredient keys via
   `glossary_ingredient`.
2. Apply gap and anchor rules across the union of those keys.
3. Keep the existing name-substring match as a **fallback** for products with no
   ingredient rows yet, so nothing silently stops being checked during the
   backfill.

**Amount thresholds matter.** The zinc/iron interaction is documented at
supplemental iron doses — roughly 25 mg elemental and above. A multivitamin with
2 mg of iron should not trigger a blocking conflict against zinc. Add
`minAmountA` / `minAmountB` to `GapRule`, in the ingredient's own unit, and skip
the rule below threshold. Where you don't have a defensible threshold, leave it
null and let the rule always fire — but say which rules those are.

Every violation message must name **both products and the ingredient**, because
the user cannot see inside a multivitamin:

> "Your Basic Nutrients has 15 mg of zinc in it, which wants 2 hours from your
> iron."

That sentence is the entire value of this work. Without it the user just sees the
app moving things around for no visible reason.

## Test it on the case that is broken today

A stack of `Thorne Basic Nutrients 2/Day` + `Thorne Iron Bisglycinate` must
produce a conflict. It currently produces none. Write that as a test before you
change anything, watch it fail, then make it pass.

---

# 4. The week strip on Today

`Today.tsx` renders seven `.week-cell`s with states from
`dayState()`: `completed | missed | today | future`. The states are already
right; the visual treatment is not.

| State | Treatment |
|---|---|
| `completed` | Accent `#7B5CFA` fill, white numeral |
| `missed` | As now — grey, unchanged |
| `today` | Light grey fill, clearly lighter than `missed`, white numeral |
| `future` | "Glass": `rgba(255,255,255,0.04)` fill with a `rgba(255,255,255,0.09)` hairline, numeral at `rgba(255,255,255,0.35)` |

**On "glass":** do not use `backdrop-filter`. The background is pure `#000` with
nothing behind these cells, so there is nothing to blur and it renders as
nothing. Translucent fill plus a hairline border is what reads as glass in a
dark UI, and it is what the rest of the app already does. No gradient, no glow —
`CLAUDE.md` rules apply here.

Two consequences to handle:

**Remove `.week-dot`.** The comment in `Today.tsx` says "One property means one
thing: fill = today, dot = completed." That principle is being replaced by
colour, so the dot on completed days now says the same thing twice. Delete it and
the CSS rule.

**A day with nothing scheduled must not render as completed.** Check what
`dayState` does when `total === 0` — vacuously "all taken" is not a streak the
user earned, and a purple cell for a day they did nothing is the kind of small
lie that makes people stop trusting the numbers. Give it the `missed` treatment
or a fourth neutral state, and say which you chose.

Check contrast: the `today` light grey and the `missed` grey have to be
distinguishable at a glance on an OLED screen at low brightness, which is where
this screen is actually read. Report both hex values and the ratio between them.

---

# Before you say it is done

1. `Thorne Basic Nutrients 2/Day` + `Thorne Iron Bisglycinate` in one block
   raises a conflict naming both products and the zinc amount.
2. Searching "zinc" in Discover returns every product containing zinc, in two
   sections, each row showing the amount.
3. Searching "vitamin D" returns products whose label says "Cholecalciferol".
4. A multivitamin with 2 mg iron does not raise a blocking conflict against zinc.
5. The week strip: purple completed, grey missed, light grey today, glass future,
   no dots, and an empty day is not purple.
6. Every product with a DSLD label has ingredient rows, or is on your list of
   ones that don't.

Then tell me: how many products had no usable DSLD ingredient panel, how many
raw ingredient strings you could not map to a canonical key, which conflict rules
you could not attach a citation or a threshold to, and how many products the
average ingredient search returns in each of the two sections.
