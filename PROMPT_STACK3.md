# Replace the 9-item stack with 3, and add the recommendation counter

The nine-item stack is wrong for the product. An app that hands a new user nine
bottles reads as "we want you taking a lot," which is the opposite of what this
app is for. Restraint is the position.

Everything below is verified against NIH Office of Dietary Supplements, FDA and
published meta-analyses. Use these exact numbers. Do not round them, do not
add items, and do not upgrade any of the evidence language.

---

## 1. Goals screen (ob6) — add the counter

Below the goal selection, add: **"How many should we recommend?"**

- a stepper, range **1–5**, default **3**
- beneath it, 13pt, 62% white: *"Most people do better with fewer. You can
  always add more later."*
- the number chosen drives how many items the audit and schedule produce

This is a small control that says more about the product than any copy on the
paywall. Keep it understated.

For all mock data, assume the user selected **Skin & hair** and **3**.

---

## 2. The three recommendations

Replace every one of the nine items across the whole app — Today, Stack, Item
detail, Analysis, onboarding, Year in Review, all of it.

### Item 1 — Collagen peptides
| Field | Value |
|---|---|
| Dose | **10 g** |
| Time | **8:00 AM** |
| Block | Morning |
| Form | Hydrolysed powder |
| Timing note | *"Any time of day works. Trials found no difference."* |
| Evidence | **Mixed** |

Evidence copy, verbatim: *"Trials disagree. A 2023 meta-analysis found benefits
for skin hydration and elasticity; a 2025 meta-analysis found the benefit
appeared mainly in industry-funded trials and disappeared in high-quality
independent ones. It's safe and popular, but we're not going to tell you it's
proven."*

Do **not** claim it must be taken with vitamin C. Vitamin C is a real cofactor
for the body's own collagen synthesis, but no trial has tested collagen plus
vitamin C against collagen alone for skin. That pairing is marketing.

### Item 2 — Omega-3 (EPA + DHA)
| Field | Value |
|---|---|
| Dose | **1,000 mg combined EPA + DHA** |
| Time | **1:00 PM** |
| Block | With lunch |
| Timing note | *"Take with a meal containing some fat — improves absorption, and cuts the fishy burps."* |
| Evidence | **Limited** |

Evidence copy: *"Reasonable evidence for inflammatory skin conditions. Little
evidence it changes skin appearance in people who are already healthy."*

**Important label trap to surface in Item detail:** a "1,000 mg fish oil"
softgel usually contains only about 300 mg of actual EPA + DHA. The app tracks
**EPA + DHA**, not total oil. Say so — it is a genuinely useful thing most
people get wrong.

### Item 3 — Zinc
| Field | Value |
|---|---|
| Dose | **15 mg** |
| Time | **9:00 PM** |
| Block | Evening, with food |
| Timing note | *"With food — zinc on an empty stomach commonly causes nausea. Keep 2 hours clear of any iron supplement of 25 mg or more."* |
| Evidence | **Good if deficient** |

Evidence copy: *"People with hair loss tend to have lower zinc levels, but
that's an association. There's no good evidence that topping up someone who
already has enough does anything."*

Do **not** claim zinc must be separated from calcium — that evidence is
inconsistent and the rule should be dropped. The **iron** separation is real
and stays.

Do not claim zinc picolinate is better absorbed. That rests on one 15-person
study from 1987 that has never been replicated. Treat form as a minor note.

### Three items, three blocks

8:00 AM, 1:00 PM, 9:00 PM. That gives the arc exactly three gaps, evenly
distributed across a 7:00–22:45 waking day.

---

## 3. The audit now works differently — and it is much better

With three conservative items, nothing we recommend is anywhere near a limit.
That is the point. **The over-limit finding comes from a product the user
already takes**, entered by them during onboarding.

Add to the user's existing items in ob3: **"Hair, Skin & Nails gummy"**,
containing per serving:

| Nutrient | Amount |
|---|---|
| Biotin | **10,000 mcg** |
| Selenium | **200 mcg** |
| Zinc | **30 mg** |
| Vitamin A (preformed) | **1,500 mcg RAE** |

These are not exaggerated. A 2020 survey of 176 retail skin/hair/nail
supplements found nine products exceeding 10,000 mcg biotin, one at 200 mcg
selenium, and zinc up to 30 mg.

### The three audit findings

**Finding 1 — Zinc, OVER THE CEILING.** 30 mg (their gummy) + 15 mg (ours) =
**45 mg against a 40 mg upper limit — 113%.** This is the inverted tile. Copy:
*"Your gummy already has 30 mg. Ours takes you to 45. The ceiling is 40, and
sustained intake above it blocks copper absorption."* Offer to drop our zinc.

**Finding 2 — Biotin, 10,000 mcg against an adequate intake of 30 mcg. 333×.**
This is **not** a toxicity finding and must not be described as one — there is
no upper limit for biotin because there is no evidence it is toxic. The real
issue is that high-dose biotin interferes with lab tests built on
biotin-streptavidin immunoassays: thyroid panels, vitamin D, BNP, and
**troponin** — the heart attack test. The FDA issued a safety communication in
November 2017, updated it in November 2019, finalised guidance in October 2020,
and restated the troponin concern in June 2022. **A patient died after a
falsely low troponin result.** A single 10,000 mcg dose has interfered with
thyroid tests within 24 hours.

Copy: *"Not dangerous in itself — biotin has no upper limit. But at this dose
it distorts blood tests, including the one used to diagnose heart attacks. Tell
whoever draws your blood."*

**Finding 3 — Selenium, 200 mcg against a 400 mcg ceiling.** In range at 50%,
but flag it: *"Half the ceiling from one gummy. Worth knowing, because the
first sign of too much selenium is hair loss and brittle nails — the thing you
bought it for."*

That third finding is the one people will screenshot. Write it carefully.

---

## 4. New feature — the blood test prompt

Because it falls out of Finding 2 and no competitor does it.

If a user's stack contains biotin at 5,000 mcg or more, Profile gains a row:
**"Blood test coming up?"** Tapping it shows which tests are affected and
suggests a 72-hour pause with a note to tell their clinician.

Grounded in an FDA safety communication and a documented death. It is the most
defensible feature in the app.

---

## 5. Evidence grades — put them everywhere

Each item carries a grade shown on Stack and Item detail: **Strong / Mixed /
Limited / Good if deficient**. Rendered as a small sentence-case label, not a
coloured badge.

Every competitor overclaims. An app that tells you the collagen evidence is
contested is one nobody can call out — and it is a real reason to trust the
numbers it gives you elsewhere.

---

## 6. Add a disclaimer

Persistent, quiet, at the foot of Analysis and Item detail: *"Reference intakes
from the NIH Office of Dietary Supplements. This is arithmetic on labels, not
medical advice."*

---

## 7. What must not appear anywhere

- collagen described as proven, or as requiring vitamin C
- omega-3 described as improving skin appearance in healthy people
- zinc or biotin described as regrowing hair in people who are not deficient
- biotin described as toxic, or as having an upper limit
- zinc described as needing separation from calcium
- biotin having an "RDA" — it has an **Adequate Intake** of 30 mcg, not an RDA

Update every screen, every mock array, and every string. When you are done,
search the codebase for the old item names and confirm zero remain.
