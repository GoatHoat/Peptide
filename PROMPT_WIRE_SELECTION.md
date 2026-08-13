# Wire the selection through, and fix the progress indicator

Four items, in this order. The second is the one that shows on camera, so if
you only get through two, get through the first two.

---

## 1. Restore the app's progress indicator on ob6b

The 2px bar at 62% was a placeholder in my standalone HTML mockup — it existed
because the file had no app around it. It was never meant to replace the real
indicator.

Right now ob6b is the only screen in a twelve-screen linear flow with a
different progress affordance, and someone walking straight through will feel
it even if they can't name it.

- drop the reference's `.prog` bar from ob6b
- restore the app's 12-segment strip, same as every other onboarding screen
- push the `h1` down to clear the segments at `top: 70`

Consistency wins here. The bar isn't better — it's just what I happened to draw.

---

## 2. The selection becomes the schedule

This is the important one. Right now someone can tap two cards, hit "Create
schedule", and land on a nine-item schedule of things they never picked. That
breaks the whole sequence at exactly its payoff.

**Make the ob6b selection the single source of truth for what the user takes.**

Replace the fixed nine-item arrays everywhere they appear:

- **ob10 Schedule reveal** — blocks and times built from the selected items only
- **Today** — the timeline, the dose count, the arc's gaps
- **Stack** — the item list and the doses-per-hour chart
- **Analysis** — nutrient totals computed from the selected items
- **Item detail** — reachable for each selected item
- **Year in Review** — the counts follow

One selected item should produce a one-item schedule with one block, not a
broken layout. Two should produce two. Check both.

### The three items and their real times

From `PROMPT_STACK3.md`, which has the verified doses and evidence language:

| Item | Dose | Time | Block |
|---|---|---|---|
| Santa Cruz Copper + Zinc | 15 mg zinc · 1 mg copper | 9:00 PM | Evening, with food |
| Nordic Naturals Omega-3 | 1,000 mg EPA + DHA | 1:00 PM | With lunch |
| Vital Proteins Collagen | 10 g peptides | 8:00 AM | Morning |

All three selected gives three blocks at 8:00, 13:00 and 21:00 — which is
exactly three gaps in the Today arc, evenly spread across a 7:00–22:45 waking
day. That is not a coincidence; the arc was designed around it.

### The audit

With three conservative items nothing we recommend is near a limit — that is
the point. The over-limit finding comes from a product the user already takes,
entered during ob3: a **Hair, Skin & Nails gummy** with 10,000 mcg biotin,
200 mcg selenium, 30 mg zinc, 1,500 mcg vitamin A.

Their gummy's 30 mg zinc plus our 15 mg is 45 mg against a 40 mg ceiling —
113%. That's the inverted tile on Today. `PROMPT_STACK3.md` has the exact copy
for all three findings, including the biotin lab-interference wording, which
must not describe biotin as toxic.

---

## 3. Build the stepper on ob6

`recCount` is only settable in the store right now. Add the UI:

Below the goal selection: **"How many should we recommend?"** — a 1–5 stepper
defaulting to 3, with the number at 34pt between the minus and plus. Beneath
it, 13pt at 62%: *"Most people do better with fewer. You can always add more
later."*

Then confirm ob6b renders that many cards and that many dots.

---

## 4. Add the false-negative trap to GLASS_RULES.md

You hit it and diagnosed it, so document it — it will happen again.

Under the verification section, add: when running the lime test, tint **the
element the card actually samples**, not an ancestor. Tinting the phone frame
fails because `Device` paints `bg-black` over it, so the card is correctly
sampling black and the test reports a false failure. A broken card and a
correctly-working-but-badly-tested card look identical.

---

## When you're done

Walk ob6 → ob6b → ob10 → Today with one item selected, then again with all
three, and tell me what each produced. And say which checks you ran versus
assumed.
