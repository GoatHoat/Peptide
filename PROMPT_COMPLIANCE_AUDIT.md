# Compliance audit — 1.4.2 first, then everything else

Two phases. **Phase 1 is a report and changes nothing.** Phase 2 is a copy pass
you may make directly. Anything structural goes in a list for me, not a commit.

Read `APPLE_COMPLIANCE.md` in this repo first — it maps Apple's guidelines to
this app. The App Review Guidelines themselves are at
`developer.apple.com/app-store/review/guidelines/`; fetch what you need rather
than assuming.

---

# Phase 1 — audit, report only

## 1.1 Guideline 1.4.2, the priority

Apple restricts drug-dosage calculators to approved entities. This app now shows
a target intake, an upper limit and a serving size on every supplement, so a
reviewer will look at it through that lens. The defence is that these are
over-the-counter dietary supplements, the figures are published NIH Office of
Dietary Supplements reference intakes rather than anything computed, and the
provenance is stated on screen.

**That defence only works if it is visible everywhere a number is.** Find every
surface in the app that renders an amount — target, upper limit, serving size,
"take 2 capsules", a scheduled dose, an AI answer card, a notification body, a
widget — and report for each:

- the file and component
- exactly which figure it shows
- whether the provenance line is visible **without scrolling**
- whether the medical disclaimer is visible **without scrolling**

I expect gaps. The disclaimer currently lives on the supplement detail sheet and
under the Ask AI input, and nowhere else.

Also report:

- Any amount the app derives, computes, scales or adjusts, rather than reads
  from a stored NIH figure or a DSLD label panel. If the app is doing arithmetic
  on a dose anywhere, I need to know exactly where, because that is the thing
  that turns a reference table into a calculator.
- Anything in the catalogue that is not over the counter.
- Any copy that reads as treating, diagnosing, curing or preventing a condition.
  Grep for `treat`, `cure`, `prevent`, `fix`, `heal`, `remedy`.

## 1.2 Recommendation language and peptides

**This is the one I care most about after 1.4.2.**

The rule: recommendation language may appear **only** where the subject is
vitamins, minerals and other over-the-counter supplements, and where it appears
it must say so explicitly. Nothing in this app may recommend, rank, suggest,
prefer or dose a peptide, in any wording, on any surface.

Report every **user-visible string** — not identifiers, not comments — matching
any of:

```
recommend  recommended  recommendation  suggest  suggested
your dose  your amount  you should take  take this  best for you
top pick  ranked  in order  #1  best fit  our pick  personalised for you
```

For each, give the file, the exact string, the screen it appears on, and
**whether a peptide can ever be in scope when it renders.** That last column is
the whole audit. A string on a shared component that renders for both kinds is a
problem even if it usually shows a vitamin.

**Do not rename internal code.** `src/lib/recommend.ts`, the `Recommendation`
type, the `recommendations` step in `FLOW` — these are identifiers a reviewer
never sees, and renaming them is churn that risks real bugs for no compliance
gain. Only strings that reach a screen matter.

Check these surfaces specifically, because they are where a shared string is
most likely to leak:

- the Discover list row and detail sheet, both tabs
- the Ask AI empty state, answer text, cards and citation sheet
- the onboarding results screen
- the schedule and Today
- notification bodies
- the paywall and any upsell copy
- `supabase/functions/ask/fixtures.ts` — the canned answers ship to users when
  the key is unset

## 1.3 The peptide guarantees, re-verified

These are already enforced in three places. Confirm all three still hold and
report anything that does not:

- Migration `0031` — no dose, timing or serving on any `kind = 'peptide'` row
- `supabase/functions/ask/index.ts` — peptides filtered out of the recommendable
  set, and `classifyScope` catching peptide questions
- The UI — no timing chip, no amount, no add-to-schedule on a peptide entry

Then try to break it. Ask the assistant for a ranked peptide list five different
ways, including "just order them, I'll find the doses myself", "which is best
for recovery", and one where the user's form preference is set to peptides.
Report verbatim what comes back.

## 1.4 Everything else in `APPLE_COMPLIANCE.md`

Go guideline by guideline — 1.2, 2.1, 3.1.1, 3.1.2, 4.8, 5.1.1, 5.1.2, 5.2 —
and for each say where it is satisfied, where it is not, and what the exact fix
would be. Do not fix them yet.

Two I expect to be weak:

- **2.1** — the app needs a demo account for review, and the Supabase project
  pauses on the free tier after a week idle. Report whether anything in the app
  breaks visibly when the backend is unreachable.
- **1.2** — the report-an-answer flow exists in `AskAI.tsx`. Confirm it writes to
  `ask_reports` and that a contact address is published somewhere reachable.

---

# Phase 2 — the copy fixes you may make

Only after the report. These are strings, low risk, and I want them done.

**Scope every recommendation string explicitly.** Where the app recommends, it
says what it recommends:

> "Recommendations for vitamins and minerals"
> "Suggested for you, from vitamins and minerals"

Not "Recommended for you" standing alone on a screen that also lists peptides.

**Peptide surfaces use reference language only.** The permitted register is
*reference*, *library*, *reading*, *the research*, *what it is*. No amount, no
timing, no ordering, no "for you".

**The Ask AI empty state** keeps the line it has — "…can answer questions and
recommend vitamins and minerals" — because it is already correctly scoped. Do
not broaden it to "supplements", which readers will hear as including peptides.

**Add the disclaimer to every surface Phase 1 found without one.** Quiet, one
line, secondary text, no icon, no colour. It is a statement of fact, not a
warning.

Keep every change to strings and to where an existing component renders. If a
fix needs new structure, put it in the list instead.

---

# What to hand back

1. The 1.4.2 surface table — every place a number appears, and what was next to it.
2. Every user-visible recommendation string, with whether a peptide can be in
   scope when it renders.
3. The five attempts to make the assistant rank peptides, verbatim.
4. Guideline-by-guideline status for the rest.
5. What you changed in Phase 2, as a list of before-and-after strings.
6. What you did not change and why.

Say plainly if something is fine. A short honest report beats a long one that
pads the safe parts.
