# Cut the app down. 21 screens to 10, 3 tabs.

This is a deletion task, not a design task. Almost everything here is
"remove this and move that." Do not build anything new except where marked NEW.

Read this whole file before touching anything — several cuts depend on each
other.

---

## The three tabs

```
TODAY          STACK          YOU
```

That is the entire navigation. No fourth tab, no hidden tab, no drawer.

The test for every screen and feature below: **does someone use this in the
first week?** If not, it goes. An app for a supplement schedule has exactly one
daily job and one occasional job, and the tabs should say so.

---

## 1. TODAY — the only screen most people ever open

Contains, in this order top to bottom:

1. **The week strip.** Seven days, today highlighted, each day showing whether
   it was completed. Reuse `RingCalendar` logic but render it as a horizontal
   row, not a ring — a ring for seven items is decoration.
2. **The arc.** Pinned, does not scroll away. Already built, do not touch it.
3. **The timeline.** Text only, collapsible, each dose tappable to check off.
   Already built.
4. **Any over-limit warning**, as a single inline row — not a card, not a tile.
   Tapping it opens the detail sheet.

That is all. Nothing else goes on Today.

## 2. STACK — what you take, and everything about it

- the list of items, each with dose and time
- add an item, remove an item, change a time
- **the audit findings live here as inline rows under the list**, not on their
  own screen. They are facts about the stack, so they belong with the stack.
- tapping any item opens the detail sheet

## 3. YOU — everything that is not the daily loop

- streak / days completed — one number, not a dashboard
- notification settings
- the two accessibility toggles (reduce motion, larger text)
- subscription / restore purchase
- the biotin blood-test row, when the stack qualifies

## The detail sheet (not a tab)

`ItemDetail` stops being a screen and becomes a sheet presented from Today or
Stack. It keeps the dose, the timing note, the evidence line and the
`evidenceCopy` field. This is the one place depth is allowed, because it is the
thing that makes the app trustworthy rather than decorative.

---

## Delete these outright

| File | Why |
|---|---|
| `screens/Analysis.tsx` | A second place to look at stack data. Findings move inline into Stack. |
| `screens/YearInReview.tsx` | A retention feature for an app with no users yet. It is a year away from being relevant. |
| `screens/Accessibility.tsx` | Two toggles do not need a screen. Move them into YOU. |
| `screens/Gate.tsx` | Fold whatever it asks into Today. A separate gate screen is a wall in front of the daily loop. |
| `screens/onboarding/Ob4Injectables.tsx` | The product is OTC supplements. This screen asks about something we do not support and should not. |
| `screens/onboarding/Ob7ProgressPhoto.tsx` | Asking for a body photo before someone has used the app once is the highest-friction screen in the flow and it powers nothing. |
| `screens/onboarding/Ob8Sleep.tsx` | Default the waking day to 7:00-22:45 and let people change it in Stack if they care. Almost nobody will. |
| `screens/onboarding/Ob9Meals.tsx` | Same. Default lunch to 13:00. |
| `screens/onboarding/Ob5Audit.tsx` | The audit result belongs on the schedule reveal and in Stack, not as its own onboarding beat. |

Delete the files, delete their entries from the `Screen` union, from
`ONBOARDING_ORDER`, and from the dev toolbar. Leave no dead imports.

---

## Onboarding: 13 screens to 6

```
1  ob1   Cold open            keep as is
2  ob2   You                  NEW - merged, see below
3  ob3   What you already take  keep as is
4  ob6b  Recommendations      keep as is, do not touch this screen
5  ob10  Schedule reveal      keep, now also shows the over-limit finding
6  ob11  Notifications        keep
7  ob12  Paywall              keep
```

### The one NEW screen: ob2 "You"

Merge `Ob2AboutYou` and `Ob6Goals` into a single screen holding **age, gender,
goal, and the how-many stepper**. Four inputs on one screen instead of four
screens.

Keep the stepper exactly as built, still capped at 3.

Renumber nothing else. `ob6b` keeps its name even though `ob6` is gone — it is
referenced in three other files and renaming it buys nothing.

### The progress indicator

Seven segments now, not thirteen. It is currently the strip that shows how far
through onboarding you are, and it will be wrong the moment screens are deleted.

---

## What this leaves

**10 screens total**, down from 21: three tabs, one sheet, six onboarding
screens, and the cold open.

## What I deliberately did NOT cut, and why

- **The audit / over-limit finding.** It is the only thing in the app that tells
  someone something they did not already know. It moves, it does not go.
- **The recommendation screen.** It is the reason anyone finishes onboarding.
- **The paywall.** Cutting it makes the app free, which is a business decision,
  not a simplification.
- **`ob3` what you already take.** It feels like friction but it is what makes
  the audit real rather than generic. Without it the app can only warn you about
  things it recommended itself, which is worthless.

---

## When you are done

Walk the whole flow twice — once picking one item, once picking three — and
tell me:

1. every screen that still exists, as a list
2. that no deleted screen is still reachable from any route, toolbar or link
3. that the progress indicator reads 7 segments and advances correctly
4. that Today, Stack and You each render with a one-item stack and with three
5. `npm run build` clean

Say which you checked versus assumed.
