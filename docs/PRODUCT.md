# PRODUCT.md

App structure: onboarding, information architecture, and monetisation.
Companion to DESIGN.md, which covers the visual system only.

---

## THE ONE PRINCIPLE

The aha moment is **"you're taking 45mg of zinc a day and the ceiling is 40."**
Everything in onboarding exists to reach that screen fast.

This inverts the normal order. Ultrahuman and Bevel ask about you first and get
to value later. We ask for the stack first, because the stack is what produces
the shock. Goals, photos, schedule and recommendations all come *after* the user
has been hit with something they didn't know about themselves.

Target: the audit screen appears within 90 seconds of first launch.

---

## PART 1 — ONBOARDING

12 screens. Every one carries a headline, a visual, and either an input or a
payoff. No screen exists to hold a single toggle.

### 1 · Cold open
No input. One line: *"Most people don't know what's actually in their stack."*
Full-bleed particle field, one primary button. Deliberately sparse — this is the
poster, not a form.

### 2 · About you
Age and biological sex on one screen. Ultrahuman's dial for age; a three-way
segmented control for sex with "prefer not to say."

Visual: as the dial turns, a live copper bar underneath shows the zinc RDA and
UL redrawing in real time. The screen demonstrates why it's asking while it asks.

Copy: *"Upper limits change with age and sex. We need this to do the math."*

"Prefer not to say" falls back to the more conservative limit and says so.

### 3 · Build your stack
No separate "do you take anything?" screen — that was a wasted step. This screen
opens directly into the builder with **"I'm not taking anything yet"** as a
tertiary action underneath, which branches straight to screen 6.

Three entry paths, barcode first: **Scan a barcode** (primary), **Photograph the
label** (OCR fallback), **Search by name**.

Loop with a live running count and each added item animating into a stack at the
bottom of the screen. This screen should feel productive — it's the longest one
and the one doing the real work.

**Barcode scanning is free forever.** MyFitnessPal paywalled its scanner in 2022
and 755 people in our research named it as their reason for leaving.

### 4 · Anything injectable or prescribed?
Separate from the supplement flow, deliberately.

Copy, verbatim: *"You enter your own compounds and your own doses. This app never
suggests what to take or how much — it does the math and the schedule around
what you already have."*

That sentence protects the app and reads as respect rather than legal cover.
Visual: a copper line-art vial and syringe, the only place that imagery appears.

Skippable in one tap.

### 5 · THE AUDIT ← the payoff
The hero screen. Everything before this was setup.

Full-bleed. One hero numeral, the worst overlap in their stack:

> **45mg**
> zinc, daily, across 3 products
> upper limit is 40

Beneath it, the other nutrients over their ceiling, then a quiet line:
*"Everything else is in range."*

If nothing is over: *"Nothing in your stack crosses a ceiling. Here's your
closest call:"* and show the highest percentage. **Never an empty state here** —
always give them a number about themselves.

Cite the source on this screen: *"Limits from the NIH Office of Dietary
Supplements."* Single most important credibility moment in the app.

### 6 · What are you optimising for?
**Apple Action Button pattern** — full-screen horizontal pager, one goal per
page, large copper glyph, title, one explaining sentence. Swipe between, tap to
select, multi-select. Spec is in DESIGN.md §8.

Goals: Sleep · Recovery · Energy · Focus · Training · General health ·
Skin & hair · Gut

Each carries a sentence, e.g. *Recovery — "We'll prioritise timing around
training and track soreness alongside your stack."*

Drives the recommender, and changes what the app **measures**, not just what it
suggests.

### 7 · Your starting point (optional photo)
Immediately after goals, because a goal makes a baseline meaningful.

Copy: *"Want a before photo? It stays on your phone, never leaves the device,
and nobody sees it but you."*

Primary: **Take a photo.** Tertiary: **Skip — I'll do this later.**

Framing is about consistency over time, never about appearance. No body-type
language, no "goal weight," no comparison to anyone else. Copy talks about
*change* and *showing up*, not about how they look now.

Requirements: on-device only, excluded from the system photo library, optional
Face ID lock on the collection, `.privacySensitive()` so thumbnails blur in the
app switcher. Ship the app 17+.

### 8 · Your day, part one — sleep
Wake time and bed time. Two dual-handle range sliders in RISE's style, so a
range rather than an exact minute.

Visual: the day drawn as a vertical copper curve down the side of the screen,
updating as they drag.

### 9 · Your day, part two — meals
Breakfast, lunch and dinner windows, plus a fasting-window toggle that collapses
breakfast when enabled.

Splitting sleep and meals across two screens is deliberate — the old single
screen had four inputs and felt like a form while everything around it felt like
a product.

### 10 · Your schedule
The generated timetable, animating in block by block, 40ms stagger.

Reasoning shown inline on items that moved:
*"Calcium moved to evening — it blocks zinc absorption."*

Only on the items that changed. Explaining everything is noise; explaining the
surprising thing is what earns trust.

### 11 · Notifications
Asked here and nowhere earlier, because now there's something obvious to be
notified about. Show a real rendered notification on the screen.

### 12 · Paywall
See Part 4. After value, never before.

**Skippable screens: 4, 7, 11.** If onboarding grows past 12 screens, cut
something rather than compress it.

### Education beats

Five, each attached to a screen where it answers a question the user is already
asking. No standalone explainer screens.

1. Why age and sex change the numbers (2)
2. We never prescribe; you enter your own (4)
3. Where the limits come from — NIH ODS (5)
4. Your photos never leave the device (7)
5. Why timing matters, with a real interaction named (10)

---

## PART 2 — THE CHECK-IN GATE

**Every launch after onboarding opens on a single question**, not on Today.

> **Did you take your Zinc + Copper yet?**
> 15 mg · scheduled 8:00 PM
>
> [ YES, TAKEN ]
> Not yet

Full-screen takeover. Spec in DESIGN.md §7.

### Rules

- Fires on cold launch, and on foreground if the app has been backgrounded more
  than 30 minutes
- Shows **only the most recently due dose** whose time has passed and which is
  still unanswered. Never a queue, never more than one card.
- **YES** logs it, fires the copper ring animation and the haptic, then wipes up
  to Today
- **Not yet** dismisses without penalty and leaves the dose pending — it will ask
  again on the next launch
- Once answered either way, that dose never gates again
- If nothing is overdue, the gate does not appear at all. Straight to Today.
- A dose left unanswered by end of day rolls to *missed* at local midnight and
  counts against the streak
- Never gates on first launch of a day before anything is due
- Never gates during onboarding, and never over a notification deep link that
  points somewhere specific

### Why it exists

Adherence data is the app's most valuable asset and the hardest thing to
collect — every tracker in the category has the same problem, which is that
people take the pill and forget to log it. One question at the moment of
strongest attention is worth more than any number of reminders. It also makes
the streak real rather than aspirational.

---

## PART 3 — INFORMATION ARCHITECTURE

Five tabs. Centre is the add button, per DESIGN.md.

### TAB 1 — TODAY

| Card | Contents |
|---|---|
| **Hero** | Next dose: item, time, amount. Or "All done today" with the count. |
| **Alerts** | Only when something is wrong. Over-limit tiles in the inverted treatment. Absent most days — that's what gives it weight. |
| **Timeline** | The day as time blocks anchored to waking, meals and bed. Each block holds its items. Reason lines only on items the engine moved. A `now` marker sits between blocks; passed blocks dim. Tap the circle to log, swipe to skip with a reason. |
| **Today's total** | Taken / scheduled, adherence ring. |

### TAB 2 — STACK

| Section | Contents |
|---|---|
| **Active** | Item, dose, frequency, copper dot state |
| **Running low** | Items projected to run out within 10 days |
| **Paused** | Cycled off or temporarily stopped |
| **Archived** | Historical, kept for the record |

**Inventory mechanism.** Servings-per-container comes from the label data. At
add time the user confirms one number — *"How many left?"* — pre-filled with the
full bottle count. Run-out date is remaining ÷ **actual** consumption rate from
their adherence data, not the theoretical rate. Someone at 78% adherence gets a
date roughly three weeks later than label math, which is the correct answer.

Drift correction: logging a "ran out" skip zeroes the count and asks about
restocking; every 30 days the item detail shows one quiet inline row — *"About 12
left?"* — with confirm or correct. Not a modal. Never a nag.

**Item detail:** full ingredient breakdown from the label, each ingredient as a
percentage of RDA and of UL; what it interacts with; when it's scheduled and why;
inventory and run-out date; history and adherence; notes.

### TAB 3 — [ + ]

A sheet, not a page: Scan barcode · Photograph label · Search · Enter manually ·
Add a protocol · Add a progress photo.

### TAB 4 — ANALYSIS

The differentiator lives here.

| Card | Contents |
|---|---|
| **Nutrient totals** | Every nutrient across the whole stack as a bar against RDA and UL, sorted by proximity to the ceiling. The audit, permanently available. |
| **Ratios** | Zinc:copper, calcium:magnesium, omega-6:omega-3. Ratios matter well below the UL — a stack can be legal on every individual limit and still be wrong. This card exists because a user told us so. |
| **Interactions** | What blocks what, and whether the schedule already solves it. Unresolved conflicts get a "fix this" action that reschedules. |
| **Progress** | Collapsed strip of the three most recent photos; expands to the full chronological grid. Prompts for a new photo every 14 days, once, quietly. |
| **Adherence** | Trend over 30 / 90 days, per item. Which ones they actually keep up with. |
| **Cost** | Monthly spend, cost per serving, most expensive item per unit. People love this card and nobody in the category ships it. |

### TAB 5 — PROFILE

| Card | Contents |
|---|---|
| **Streak** | Dot calendar, 7 rows, no grid lines. Filled copper = complete day, 35% copper = partial, hollow ring = missed. Rolling 12 weeks, scrollable back. Current streak and longest streak as two numerals above it. Spec in DESIGN.md §7. |
| **You** | Age, sex, goals — goals editable through the same Action Button pager |
| **Your day** | Wake, bed, meals, fasting window |
| **Notifications** | Per-block toggles and quiet hours |
| **Units** | mg / mcg / IU preference |
| **Data** | Export CSV, provider-ready PDF, delete everything |
| **Sources & method** | Where the numbers come from, with links |
| **Subscription** | Manage, restore |

**The sources page matters.** One screen explaining the data and the maths, with
links. It's what you point at when someone says "is this AI slop" — and per the
research, they will.

---

## PART 4 — THE YEAR IN REVIEW

Fires once, first launch in December.

Full-screen takeover, not a card. Their first photo and their most recent one,
side by side. Above them, the numbers: days logged, longest streak, doses taken,
limits caught.

Copy is about consistency, never about appearance. *"You showed up 284 days this
year."* Not *"look how far you've come."* The photos say that part on their own;
saying it for them turns a personal thing into marketing.

One action: **Save this** — renders a shareable card. Photos are excluded from
the share card by default and require an explicit second tap to include.

---

## PART 5 — MONETISATION

### The tension, stated honestly

Peptide trackers monetise well: $29.99–$44.99/year is normal, and one solo dev
did roughly $50k in seven weeks this year. That audience self-reports $200–350 a
month on compounds, so $30/year is noise.

But the supplement side expects free. SuppCo has 27,379 ratings and charges
nothing for the core. The reflex reaction to any paid tool in these communities
is *"Hmmm so paid?"* and *"$200/year is kinda crazy."*

### Freemium, with the hook free

**Free forever:**
- Unlimited stack items
- Barcode scanning and label OCR
- Full schedule and all reminders
- **The over-limit audit** — every ceiling, every warning
- The check-in gate and the streak
- Widgets and Lock Screen complications
- 30 days of history
- Progress photos, unlimited

The audit is free because the audit is the marketing. The zinc moment is what
gets posted. Paywalling it kills the growth loop to protect revenue that only
exists because of the growth loop.

The streak and photos are free because they are retention, and retention is
worth more than the conversion forcing them would produce.

**Paid — "Full Panel":**
- Ratios and the interaction map
- Unresolved-conflict auto-fix
- Unlimited history and trends
- Cost tracking
- Multiple protocols and cycle planning (on/off phases, tapers)
- Export: CSV and provider PDF
- Multiple people

### Price

- **$29.99/year**, 7-day trial
- **$4.99/month** — deliberately poor value, exists to make annual look right
- **$69.99 lifetime**

The lifetime tier is not optional for this audience. Subscription fatigue was the
loudest complaint in every community researched, and one-time pricing defuses it.

**No weekly pricing.** It converts, and a competitor uses it, but this community
will call it predatory in public and that costs more than it earns.

### Where the paywall appears

- Once at the end of onboarding, trial framed as the default
- On first tap into a locked Analysis card — contextual, real content blurred
  behind it
- Never as an interstitial, never on launch, never on a timer

### Affiliate revenue

Amazon and iHerb links, and **only** on the run-out warning — the one moment
where a buy link solves a problem the user already has. Realistically 1–5%, so
treat it as a rounding error and never let it shape a recommendation. The moment
the app suggests something because it pays better, the credibility the whole
product rests on is gone, and this audience will find out.

**Never mention affiliate links in any Reddit post.** Every community in this
space bans "where to buy" language — it's what got the first post filtered.

---

## WHAT V1 CUTS

Ship without: multiple people, cycle planning, provider export, community
features, Apple Health write-back, Android.

V1 is: build a stack, get audited, get a schedule, get asked one question every
time you open the app, log against it, watch the dots fill. That's the whole
product and it's enough.
