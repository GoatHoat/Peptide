# Three questions, a real catalogue, and a pass over the onboarding

Five pieces of work in this repo, in this order. Each one is checkable on its
own — do not start the next until the previous builds and runs.

1. Three new onboarding questions
2. Make the recommendations actually use them
3. Load 176 branded products and five real papers for each
4. Fix the Today arc — it is clipped at both ends
5. Run the onboarding twenty times from different answers and fix what you find

The flow lives in `src/onboarding/`. `flow.ts` is the single description of the
order, `store.ts` holds the answers, `screens/Survey.tsx` has the existing
question components, `screens/Results.tsx` produces the recommendations.
Read all four before you write anything.

---

# 1. Three new questions

## 1.1 Diet

The highest-yield question in the set — one answer moves five different
products. Multi-select, **not** a radio: these combine.

**Title:** "Anything you don't eat?"
**Sub:** "This changes what we suggest more than anything else you'll tell us."

Options, all toggleable, plus a mutually-exclusive clear option:

```
No red meat
No meat at all
No fish or seafood
No dairy
No eggs
I eat everything        ← selecting this clears the others, and vice versa
```

Store as `diet: string[]` on the onboarding state, ids
`no-red-meat | no-meat | no-fish | no-dairy | no-eggs | omnivore`.

Selecting "No meat at all" should visually imply "No red meat" — either
auto-select it or hide it. Do not let someone end up in a state that says they
eat red meat but no meat.

## 1.2 What hasn't agreed with you

This is the question that makes a branded catalogue worth more than an
ingredient list. Without it the app has three collagens and four magnesiums and
no basis to choose between them.

**Title:** "Has anything you've taken not agreed with you?"
**Sub:** "We'll pick a different form rather than skipping it."

That sub-line matters — it tells the user the answer gets them something rather
than taking something away, which is what gets people to answer honestly.

Multi-select chips. **Structured, not free text** — free text cannot drive a
rule in code:

```
Iron upset my stomach
Magnesium gave me loose stools
Fish oil repeats on me
Niacin made me flush
Capsules are too big to swallow
Zinc on an empty stomach made me nauseous
None of these
```

Store as `reactions: string[]`, ids `iron-gi | mag-gi | fishoil-burp |
niacin-flush | large-caps | zinc-nausea | none`.

Add a "Something else" affordance that opens a plain text field, but store it
separately as `reactionsNote: string` and **do not attempt to parse it**. It is
context for the Ask AI assistant later, nothing more. Never let free text reach
a rule.

## 1.3 Form preference

**Title:** "How do you prefer to take things?"
**Sub:** "We'll rank these first where there's a choice."

Multi-select, and every option maps onto a real `product_form` value already
present on the glossary rows:

```
Capsules
Tablets
Softgels
Powders
Liquids
Gummies
No preference
```

Store as `forms: string[]`.

**Do not add an injection option.** Not "pin", not "injectable", not
"subcutaneous". The Peptides tab carries the line "Reference only — Pepstack
does not recommend doses for these", and asking a user which route they prefer
to inject by is the app tailoring its output to injection use. That contradicts
the disclaimer on the same screen and it is the single most quotable thing on
the App Store guideline 1.4.2 risk. Topical is also out for now — there are no
topical products in the catalogue, so the option would return nothing.

## 1.4 Where they go in the flow

`FLOW` in `flow.ts` is currently twenty steps with the paywall at index 14,
**before** `recommendations` at index 16. Insert:

- `diet` immediately after `profile` (it is profile information, and it wants to
  sit next to age and sex)
- `reactions` immediately after `current-stack` (it reads as a follow-up to
  "what are you already taking", which is the natural place to be asked)
- `forms` immediately after `reactions`

Add all three to `SKIPPABLE`. Every one of them must be answerable with nothing
selected, and a skip must produce the same result as "no preference" — never a
crash, never an empty recommendation list.

That takes the flow to 23. **Bring it back down.** Part 5 covers this.

## 1.5 Persistence

These currently live only in `localStorage` via `store.ts`, which means they are
lost on a new device and unavailable to the Edge Function. Add to
`public.profiles`:

```sql
alter table public.profiles
  add column if not exists diet            text[] not null default '{}',
  add column if not exists reactions       text[] not null default '{}',
  add column if not exists reactions_note  text,
  add column if not exists form_prefs      text[] not null default '{}';
```

Write them at the same point the flow already writes age and sex. Read them back
on app open so a returning user is not asked again.

---

# 2. Make the recommendations follow the answers

Right now `Results.tsx` calls `listGlossary()` and filters by goal. That is a
list, not a recommendation. Build a real scorer in a new file
`src/lib/recommend.ts`, pure and synchronous, taking the answers plus the
candidate entries and returning an ordered list with a reason string per item.

Keep it a **transparent rule table**, not a model call and not a magic weight
vector. Every rule below has a stated reason, and that reason is what gets shown
on the card.

## 2.1 Diet rules

| Answer | Effect |
|---|---|
| `no-meat` | B12 moves from optional to **required** — there is no reliable plant food source. Push it to the top of the list regardless of goal. |
| `no-meat` | Iron priority up. The NIH ODS recommended intake for vegetarians is **1.8× the standard RDA**, because non-haem iron absorbs far less well. Show the adjusted figure, and show *why* on the card. |
| `no-meat` | Zinc priority up. Phytate in grains and legumes binds zinc; ODS notes vegetarians may require up to 50% more. |
| `no-fish` | Any omega-3 recommendation must be **algal**, not fish oil. Swap the recommended product, do not just add a warning. |
| `no-dairy` | Calcium and vitamin D move up. |
| `no-eggs` | Choline priority up. |
| `omnivore` / empty | No adjustment. |

Two of these interact — vegan is `no-meat` + `no-fish` + `no-dairy` + `no-eggs`,
and should produce all of the above at once without duplicating a product.
De-duplicate by glossary id after scoring, never before.

## 2.2 Reaction rules

These pick between two products of the same nutrient. Every one of these
products is already in the catalogue after Part 3:

| Answer | Effect |
|---|---|
| `iron-gi` | Prefer **iron bisglycinate** over sulfate or fumarate. Thorne Iron Bisglycinate (DSLD 321969) is already in the library. |
| `mag-gi` | Prefer **glycinate/bisglycinate** over citrate or oxide. Citrate and oxide draw water into the bowel; glycinate does not. |
| `fishoil-burp` | Prefer an **algal or enteric-coated** omega-3, and set the timing note to with-food. |
| `niacin-flush` | Prefer **niacinamide** over nicotinic acid. Thorne Niacinamide (DSLD 337868) is in the library. Flushing is specific to the nicotinic acid form. |
| `large-caps` | Rank powders and liquids above capsules and tablets, across the board. |
| `zinc-nausea` | Set the timing chip to with-food for zinc rather than empty stomach, and say why. |
| `none` | No adjustment. |

**Never let a reaction remove a nutrient from the list.** It changes which
product, not whether. If there is no alternative form in the catalogue, keep the
original and say plainly: "This is the only form we have — take it with food."

## 2.3 Form preference

A **soft re-rank, never a filter.** If someone picks Powders only and you filter
hard, most goals return almost nothing, and an empty results screen after twelve
questions is the worst possible outcome. Score matching forms up; never drop a
non-matching product that has no alternative.

`large-caps` from 2.2 overrides a stated preference for capsules. Someone who
told you capsules are hard to swallow and also ticked "Capsules" contradicted
themselves; trust the problem over the preference.

## 2.4 Show your working

Every recommendation card gets a one-line reason drawn from the rule that fired:

> "You said no meat — this is the one thing with no reliable plant source."
> "Bisglycinate rather than sulfate, since iron has upset your stomach before."
> "Algal rather than fish oil, because you don't eat fish."

If no rule fired, show the goal match reason that already exists in
`matchReason.ts`. **If nothing fired at all, show nothing** — do not invent a
sentence. A card with no explanation is better than a card with a made-up one.

## 2.5 Iron, specifically — fix a real defect

`age >= 51` is currently used as a proxy for post-menopause to pick between the
18 mg and 8 mg iron RDA. That is wrong for anyone 45–50, anyone with early
menopause, and anyone on continuous hormonal contraception, and it is wrong in
the direction that matters.

**Do not add a question about menstruation to onboarding.** Instead:

- For female users under 51, render **both figures** on the iron entry rather
  than picking one:
  `Daily target — 18 mg if you menstruate · 8 mg if you don't. Upper limit 45 mg.`
- Put a single optional control on the iron detail sheet itself — "Which applies
  to you? I menstruate / I don't / Prefer not to say" — where the reason for
  asking is visible next to it. Persist to `profiles.menstruates boolean null`.
- `null` and "prefer not to say" both render the range. Never default to 18.

This is the same pattern the sheet already uses for biotin's "No established
upper limit". The app is allowed to say it depends.

---

# 3. Load the catalogue

`CATALOG_BRANDED_176.md` sits at the repo root. It contains 176 products across
six goal sections, each with brand, product name, physical form and a **DSLD
label ID**. Every one was pulled live from the NIH Dietary Supplement Label
Database — they are real filings, not invented product names.

## 3.1 Products

Write a new migration. For each row:

- `label_url` is `https://dsld.od.nih.gov/label/<id>`
- `kind` is `'supplement'`
- `brand`, `name`, `product_form` come from the file
- `category` and `goal_tags` from the section heading it appears under, mapped
  to the existing tag vocabulary in migration `0003`
- write `mechanism_summary`, `storage_notes` and `research_summary` yourself, in
  the same voice as the existing rows in `0016`/`0017`

**Slugs must become product-shaped.** The existing slugs are ingredient-shaped
(`magnesium-glycinate`), but this list has three collagens, four B-complexes and
five magnesiums in it. Use `<brand-slug>-<product-slug>`, e.g.
`thorne-magnesium-bisglycinate`. Migrate the existing 74 to the same convention
in the same migration, and update every foreign reference —
`stack_items`, `schedule_items`, `glossary_research`, `nutrient_reference` and
anything in `src/lib` that hardcodes a slug. Grep for the old slugs before you
assume there are none.

**Verify each label ID before inserting.** Query
`https://api.ods.od.nih.gov/dsld/v9/label/<id>` — or `search-filter` — and
confirm the record exists and brand and product name match the file. If one does
not resolve, leave it out and list it in your report. Do not substitute a
different product silently.

## 3.2 Five papers per product

Pull real citations from the PubMed E-utilities API — `esearch` for PMIDs,
`esummary` for title, journal and year. Store as `glossary_research` rows with
`url = https://pubmed.ncbi.nlm.nih.gov/<pmid>/`.

Rules, and these are not negotiable:

- **Search on the active ingredient, not the brand name.** "Thorne Magnesium
  Bisglycinate" returns nothing; "magnesium glycinate absorption" returns the
  literature. The paper is about the compound.
- **Never write a citation you did not get back from the API.** No invented
  titles, no invented PMIDs, no plausible-looking DOIs. This is the single
  easiest thing to get wrong and the single most damaging — a fabricated
  citation in an app whose entire pitch is "every suggestion has a paper behind
  it" is worse than having no citations.
- **Confirm every URL resolves** before committing. Migration `0005` exists
  because 22 entries shipped with dead links.
- **If fewer than five good papers exist, store fewer and say so.** Do not pad
  with tangential results to hit the number. Report which products came up short.
- Prefer human studies, systematic reviews and RCTs over in-vitro and rodent
  work where both exist.
- Get an **NCBI API key** first. Unauthenticated you are capped at 3 requests a
  second; with a key it is 10, and this is roughly 900 lookups.

---

# 4. Fix the arc

`src/components/Arc.tsx`. The arc's round end caps are clipped flat at both
ends. Here is the actual arithmetic, so you fix the cause and not the symptom.

The geometry is `R = 308.7`, `SWEEP = 73.2°` so `HALF = 36.6°`, `STROKE = 9`,
`W = 368`, `CX = 184`.

The endpoints sit at `CX ± R·sin(36.6°)` = `184 ± 184.05`, so **x = −0.05 and
x = 368.05** — already at, and marginally past, the viewBox bounds of `0…368`.
Then `strokeLinecap="round"` adds another `STROKE/2 = 4.5px` beyond each
endpoint, putting the real extent at **−4.55 to 372.55** inside a 368-wide
viewBox. Both caps are outside the box, so both get clipped. There is nothing
wrong with the path; the box is too small for the stroke it contains.

Fix by deriving the radius from the box instead of hardcoding it, so the drawn
width stays exactly `W` with the caps inside:

```ts
const W = 368;
const STROKE = 9;
const CAP = STROKE / 2;                 // round-cap overhang past the endpoint
const SWEEP = 73.2;
const HALF = SWEEP / 2;

// the chord plus a cap at each end must fit in W
const R = (W / 2 - CAP) / Math.sin((HALF * Math.PI) / 180);   // ≈ 301.06
const CX = W / 2;
const CY = R + CAP;
const H = Math.ceil(R * (1 - Math.cos((HALF * Math.PI) / 180)) + STROKE);
```

That puts the endpoints at x = 4.5 and 363.5 and the caps at exactly 0 and 368.
Sagitta goes from 60.8 to 59.4 — a pixel and a half shorter, invisible, and the
alternative is padding the viewBox, which shrinks the arc on screen instead
because the `<svg>` has a fixed `width={W}`.

Check the vertical too. At the current numbers the bottom of the end cap lands
at 69.87 in a box of height 70 — 0.13px of clearance, which is why it looks
right until any rounding changes. The `H` above keeps a full `CAP` of margin.

Two more things in the same file while you are in there:

- The comment on `GAP_DEG` reads "cut 20° of arc to see about 11px". `GAP_DEG`
  is 3.7. 3.7° at R≈300 is about 19px of arc, minus 9px of cap on either side of
  the gap, giving the ~11px it claims. The number in the comment is wrong; the
  value is right. Fix the comment.
- `buildSegments` clamps every dose into `[dayStart, dayEnd]`. A dose at 06:00
  for someone whose day starts at 07:00 silently stacks onto the left end, and
  anything after bedtime stacks onto the right. Either extend the window to
  cover the earliest and latest dose, or draw out-of-window doses distinctly.
  Silently moving a dose to the wrong time on the one screen the user reads
  every morning is the worst version of this.

Screenshot the Today screen at 375, 390 and 430 wide, with 1, 2, 3 and 6 doses,
and confirm both ends are round.

---

# 5. Twenty runs through onboarding

Drive the flow twenty times with different answers, using Playwright against the
dev server. The point is not coverage for its own sake — it is that the branches
in `isSkipped`, the empty states, and the back-navigation are where this will
break, and none of them are exercised by clicking through happily once.

Run each of these end to end:

1. Vegan — no meat, no fish, no dairy, no eggs. All six goals.
2. Vegetarian and dairy-free. Two goals.
3. Omnivore, every survey question skipped.
4. `q2 = 'never'` — must skip `q3`. Confirm the progress bar doesn't jump.
5. `q2 = 'never'`, then go **back** and change it to `'always'` — `q3` must
   reappear. This is the branch most likely to be broken.
6. No goals selected at all — must fall back to `DEFAULT_GOAL_IDS`.
7. All six goals selected.
8. Exactly one goal.
9. Age 14.
10. Age 90.
11. Gender "Prefer not to say" — confirm iron renders the range, not a number.
12. Female, age 48 — confirm the range, and that `age >= 51` is no longer
    deciding anything.
13. Wake 23:00, sleep 07:00 — an overnight waking window. Watch the arc.
14. All meals deleted.
15. Fifteen items in the current stack.
16. Empty current stack.
17. Every reaction chip ticked at once.
18. "None of these" plus "No preference" on every optional question.
19. Notifications declined.
20. Kill the app at the `goals` screen and reopen — the step index and every
    answer must survive, and `store.ts`'s bounds clamp must hold.

For each run record: every screen shown in order, how long the flow took, the
final recommendation list, and anything that errored, rendered empty, overflowed
its container, or produced a recommendation that contradicts an answer.

## What I already believe is wrong — verify and fix

- **The paywall sits at index 14, before `recommendations` at 16.** The user is
  asked to pay before seeing a single recommendation, which is asking them to
  buy a promise. Move it to immediately after `recommendations`. It is a one-line
  change in `FLOW` and it is the highest-value edit in this document.
- **The flow is too long**, and Part 1 makes it 23. Cut it back to 20 or under.
  Candidates, in the order I would cut them: the progress-photo screen (a large
  ask from someone who has not seen a recommendation yet — move it into the app
  proper), `info-library` and `info-recs` (two consecutive screens that explain
  rather than ask — merge into one or fold into `welcome`), and any audit screen
  still present. Do not cut the three new questions to make room; they are the
  entire point of this work.
- **`Results.tsx` calls `listGlossary()`** — with 250 products that is a wall.
  It needs the scorer from Part 2 and a cap on how many cards it shows.
- **`Discover.tsx` calls `listGlossary(200)`** and renders every row at once. At
  250 entries that is a dead scroll. Section it by category or virtualise it.

Report anything else you find rather than fixing it silently if it is bigger
than a few lines.

---

# When you are done

Tell me:

1. Which of the 176 DSLD label IDs failed to resolve.
2. Which products you could not find five papers for, and how many you found.
3. What the flow length ended up as, and which screens you cut.
4. Every issue the twenty runs found, and which you fixed versus deferred.
5. Anywhere a diet or reaction rule had no alternative product in the catalogue
   to route to — those are gaps in the product list worth knowing about.
6. Confirm: no fabricated citations, no injection option anywhere in the form
   question, and the paywall now sits after the recommendations.
