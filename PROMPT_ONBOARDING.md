# Build the Pepstack onboarding flow

Build the complete first-run onboarding for Pepstack, from cold launch to the
user landing on the Today screen with a real schedule.

Work in this repo. The app is a React + Vite PWA. The three main screens
(Today, Discover, You) already exist — this is everything that happens *before*
them.

---

## 1. Read these first

`design/references/` holds the **complete original onboarding**, twelve screens,
plus a contact sheet of all of them at `onb_00_ALL_SCREENS.png`. Open that first
to see the whole flow at once, then the individual screens:

| File | Screen | Reuse? |
|---|---|---|
| `onb_01_cold_open.png` | Cold open, one line, FIND OUT | **yes** → `welcome` |
| `onb_02_about_you.png` | Age wheel, gender pills, range bar | **yes** → `profile` |
| `onb_03_build_stack.png` | Scan barcode / photo label / search | **partly** → `current-stack`, search only |
| `onb_04_injectables.png` | "Anything injectable or prescribed?" | **no — cut** |
| `onb_05_audit.png` | The over-limit audit, 45mg, percentages | **no — cut** |
| `onb_05b_audit_clear.png` | Audit, no overlaps, 85% | **no — cut** |
| `onb_06_goals.png` | Goal picker, big icon, page dots | **yes** → `goals`, the key screen |
| `onb_07_progress_photo.png` | "Your starting point", take a photo | **no — cut** |
| `onb_08_sleep.png` | "Your day, part one", arc dial, in bed / wake up | **yes** → `sleep` |
| `onb_09_meals.png` | "Your day, part two", meal cards with sliders | **yes** → `meals` |
| `onb_10_schedule_reveal.png` | "Your schedule", nine items three blocks | **yes** → `schedule` |
| `onb_11_notifications.png` | "One nudge per block", turn on reminders | **yes** → `notifications` |
| `onb_12_paywall.png` | Annual / Monthly / Lifetime | **yes** → `paywall`, minus Lifetime |

Also in that folder for wider context: `orig_today.png`, `orig_goals.png`,
`orig_audit.png`, `orig_checkin.png`, `DESIGN_original.md`.

### What to take from them

The layout rhythm, the segmented progress bar across the top, the type scale,
the big-icon-and-caption composition, the full-width pill CTA pinned to the
bottom, the ghost skip link underneath it.

Screen by screen, specifically:

- **`onb_02`** — the horizontal age ruler with the number above it and the
  minus/plus buttons. Keep that, drop the zinc range bar under it.
- **`onb_06`** — **the most important reference in the folder.** One large
  outlined circular icon, goal name in accent under it, two lines of body copy,
  page dots, horizontal swipe between goals, CTA counting the selection. Rebuild
  that interaction exactly.
- **`onb_08`** — the circular arc dial showing hours in bed, with the two time
  fields beneath it. Keep the dial.
- **`onb_09`** — meal cards with a time range on each. Keep the card layout, add
  the delete icon per card, drop the fasting-window toggle and the per-card
  sliders.
- **`onb_11`** — almost usable as-is.
- **`onb_12`** — the plan rows with the MOST VALUE badge and the what-you-get
  table underneath. Keep the structure, **drop the Lifetime tier**, and note the
  original already used $29.99 annual / $4.99 monthly, which is the pricing to
  keep.

### What to throw away

1. **The four cut screens above.** Injectables, both audit screens, and the
   progress photo are out of scope. The app is OTC supplements only, the
   over-limit audit is a minor side feature and not an onboarding step, and
   there is no progress photo feature. Do not build them.
2. **The particles.** Every one of those screens has a drifting particle field
   behind the content. It is gone. Do not reimplement it in canvas, CSS, SVG or
   anything else. Backgrounds are flat.
3. **The orange.** The whole amber/copper palette (`#C79372`, `#E3B08D`,
   `#A56A46` and anything near them) is replaced by violet. If you find an
   orange hex anywhere in the codebase while working, change it.
4. **Barcode scanning and label photography** from `onb_03`. Search by name
   only.

## 2. Design system

```
Background        #000000     every screen, flat, no gradient, no particles
Surface           #16161A     cards, inputs, sheets
Surface raised    #1E1E22     pressed and hover states
Hairline          rgba(255,255,255,0.09)
Accent            #7B5CFA
Accent light      #9C7BFF     icons, active marks
Accent dim        rgba(123,92,250,0.16)   selected card fills
Text primary      #FFFFFF
Text secondary    rgba(255,255,255,0.62)
Text tertiary     rgba(255,255,255,0.38)
Destructive       #FF5A5A     only the meal delete icon and invalid-drop state
```

Type: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui` — this
resolves to real SF Pro on an iPhone. Do not substitute Inter as the primary.

- Screen title: 32px, weight 700, letter-spacing -1px
- Subtitle / body: 16px, weight 400, `--text-secondary`, line-height 1.5
- Card title: 17px, weight 600
- Caption: 13px, `--text-tertiary`

Radii: 999px on buttons and pills, 22px on cards, 14px on inputs, 40px on
sheets. Nothing in between.

Layout: 24px side padding on every screen. Primary CTA is full width minus the
padding, 56px tall, pinned 34px from the bottom, above the home indicator.
Safe-area insets respected everywhere (`env(safe-area-inset-*)`).

**Keep it simple.** Flat black, one accent, generous space. If a screen looks
empty, that is correct — do not fill it with decoration.

---

## 3. Motion

One easing curve for the whole flow: `cubic-bezier(0.2, 0.8, 0.2, 1)`.

- Screen transitions: 320ms horizontal slide, new screen in from the right,
  old one out to the left at 30% distance with a fade to 0.6 opacity.
- Selection state changes: 180ms.
- Button press: scale to 0.97, 120ms.
- Progress bar segment fill: 240ms.

Wrap everything in `@media (prefers-reduced-motion: reduce)` and drop to
crossfades at 120ms.

**Do not build haptics.** iOS Safari does not expose the Haptics API to web
apps. Any `navigator.vibrate` call is dead code on the target platform.

---

## 4. The flow

Define the order as a single array so it can be reordered without touching
screen code:

```js
export const FLOW = [
  'welcome', 'auth-choice', 'auth-form', 'profile',
  'info-library', 'info-recs',
  'q1', 'q2', 'q3',
  'sleep', 'meals', 'current-stack', 'goals',
  'notifications',
  'paywall',
  'building-recs', 'recommendations', 'building-schedule', 'schedule', 'done'
]
```

Every screen reads its position from this array for the progress bar. Moving a
string moves the screen.

### Global chrome

Every screen after Welcome has a header: the Pepstack wordmark with the logo
mark, centred, 17px semibold. Below it, a segmented progress bar — one segment
per step, filled segments in accent, unfilled in hairline. Back chevron top
left from step 2 onwards. Skip top right on the survey screens only.

### 1. `welcome`

Logo mark centred, large. App name under it. One line beneath:

> Know what to take, and when to take it.

Single CTA, "Get started". No back. No header chrome.

Do not write anything promising health outcomes on this screen. It is the first
thing App Review reads.

### 2. `auth-choice`

A small line-art illustration slot at the top (leave a placeholder component,
`<OnboardIllustration name="auth" />`, rendering a 120px accent-stroked
outline shape for now).

Heading: "Create your account". Sub: "So your schedule follows you between
devices."

Three full-width buttons stacked, 12px gap:
- **Continue with Apple** — black fill, white Apple mark, white hairline border
- **Continue with Google** — `#16161A` fill, Google mark
- **Continue with email** — `#16161A` fill, hairline border

Below: "Already have an account? **Sign in**" as a text button.

Terms and Privacy links must be on this screen, 12px tertiary, at the bottom.

**Sign in with Apple is mandatory if Google is offered** (App Store guideline
4.8). Do not ship one without the other.

### 3. `auth-form`

Two modes on the same component, driven by a prop.

- **Sign in**: email, password, "Forgot password?" text link, CTA "Sign in".
- **Sign up**: email, password, confirm password, CTA "Create account".

Inputs are `#16141A`, 14px radius, 56px tall, hairline border that goes accent
on focus. Show inline validation only after blur, never while typing. Password
field gets a show/hide eye toggle.

Wire to Supabase Auth. There is a Supabase project already; put the URL and
anon key in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and read
them from there. Never hardcode. Never reference the service_role key.

### 4. `profile`

Age and gender.

Age: a wheel picker, 13–99, defaulting to 25. Gender: three pill options —
Male, Female, Prefer not to say — laid out in a row, single select.

One line of tertiary text under the title explaining why: "Dose ranges differ by
age and sex. This stays on your device."

### 5–6. `info-library`, `info-recs`

Two read-only screens. Big illustration slot, heading, two sentences, CTA
"Continue".

- **info-library** — the research library behind the recommendations, and that
  the user can read the sources themselves in Discover.
- **info-recs** — how a recommendation is built from goal, age and sex, and that
  dose ranges come from published upper limits rather than being invented.

Keep both to two sentences. These are the screens people bail on.

### 7–9. `q1`, `q2`, `q3`

Three survey questions, one per screen, single select, four options each,
**Skip in the top right of every one**.

Every question must have an answer that changes something downstream. Do not
add questions that exist only to make the user feel bad about themselves —
those produce refunds and one-star reviews a week later. Use these:

**q1** — "How many separate things are you taking right now?"
`None yet / 1–2 / 3–5 / 6 or more`
→ 6+ turns on the double-up check prominently in the results.

**q2** — "Have you started a routine and stopped before?"
`Never tried / Once or twice / Several times / I always stop`
→ drives reminder frequency and how the streak is framed.

**q3** — "What usually goes wrong?"
`I forget / Too many to keep track of / Not sure it's working / Nothing, I'm consistent`
→ "I forget" weights toward fewer time blocks; "not sure it's working" surfaces
the evidence links harder.

Store the answers. If skipped, store `null` and use the neutral default.

### 10. `sleep`

Two time wheels: "When do you usually wake up?" and "When do you go to sleep?"
Defaults 07:00 and 23:00. Show them on one screen, stacked, each in a
`#16161A` card.

### 11. `meals`

A list of meal cards. Each card: meal name, time, and a small delete icon on
the right that removes it. An "Add meal" ghost button below the list.

Defaults: Breakfast 08:00, Lunch 13:00, Dinner 19:00.

Deleting animates the card out at 200ms and closes the gap. Allow deleting all
three — if the list is empty, show a tertiary line saying timing will be spread
evenly instead, and keep the CTA enabled.

### 12. `current-stack`

"What are you already taking?" A search field over the supplement list, with
selected items appearing as removable chips below. A "Nothing yet" button that
skips straight past.

This screen is what makes the double-up warning possible. Without it that
feature cannot work.

### 13. `goals`

**The iOS Action Button picker, exactly as in `orig_goals.png`.**

Six goals: Skin & hair, Sleep, Energy, Focus, Training, Immunity.

- One goal fills the screen at a time. Large circular outlined icon, ~200px,
  accent stroke, centred.
- Goal name under it, 34px, accent when selected, white at 62% when not.
- Two lines of body text explaining what the app will do for that goal.
- Page dots under the icon showing position in the six.
- Horizontal swipe or drag moves between goals, with the icon scaling from
  0.86 to 1 as it centres. Tap toggles selection.
- Selected goals get a filled ring and the CTA counts them:
  "Continue (2 selected)".
- CTA disabled until at least one is chosen.

Multi-select. This is the best screen in the flow — give it the most care.

### 14. `notifications`

**This screen matters more than any other and it is easy to skip.**

It is a reminder app. iOS gives you exactly one chance at the system permission
prompt — if the user taps Don't Allow, it is Settings-only forever. So show your
own screen first:

Illustration, heading "Reminders at the right times", body explaining that the
app will send one notification per time block, roughly three a day, and nothing
else. Two buttons: "Turn on reminders" (accent) and "Not now" (ghost).

Only call `Notification.requestPermission()` when they tap the accent button.
Never call it on mount.

### 15. `paywall`

Two plans:

- **Monthly** — $4.99/month
- **Annual** — $29.99/year, badged "Save 50%", selected by default

`3/month vs 30/year` is only a 17% saving and people do that arithmetic. 4.99
against 29.99 reads as half price and moves far more people to annual, which is
the plan you want them on.

Above the plans: three short value lines with accent tick marks. Below: the CTA,
then a row of three text links — **Restore Purchases**, Terms, Privacy.

Restore Purchases is not optional. A missing restore button is the single most
common rejection reason for subscription apps.

**Payment integration:** build the UI only. Put the purchase call behind a
`purchase(planId)` function in `src/lib/billing.ts` that currently resolves
`true` after a delay, with a `// TODO` explaining it must be wired to StoreKit
via RevenueCat when the app is wrapped for iOS. **Do not integrate Stripe.**
Apple requires StoreKit for digital subscriptions (guideline 3.1.1) and a Stripe
paywall is an automatic rejection.

Add a `SKIP_PAYWALL` flag in `.env` defaulting true in dev so the rest of the
flow is testable.

### 16. `building-recs`

Loading screen. Centred, an animated arc drawing itself in accent — reuse the
Today screen's arc component if it is factored out. Text: "Going through the
research for your goals."

Minimum 2.2 seconds so it does not flash. Below the arc, cycle three status
lines at 700ms each. If the real work finishes early, still hold the minimum.

### 17. `recommendations`

The results list. Each row is a `#16161A` card:

- Supplement name, 17px semibold
- Dose, 13px tertiary, tabular numerals
- One line on why it was picked, 14px secondary
- A "Read the research" text link opening the article in Discover
- A selection tick on the right, accent when on

Multi-select, first three pre-selected.

Below the list, a tertiary block: **what was left out and why.** This is the
part that makes the app trustworthy and it is the thing people screenshot. Do
not cut it.

CTA: "Create schedule".

### 18. `building-schedule`

Second loading screen. Text: "Fitting these around your meals and sleep."
Minimum 1.8 seconds. Same arc, different status lines.

### 19. `schedule`

The generated schedule as a vertical day. Each dose is a draggable card showing
time, name and dose.

- Long-press 200ms to pick up, card lifts to scale 1.04 with a shadow.
- Drag moves it between time slots, other cards part to make room.
- Release into a valid slot: settles, 240ms.

**Invalid drop:** the card springs back to where it came from, shakes
horizontally (three oscillations, ±8px, 400ms total), and a message appears
below it in `--destructive` naming the actual rule that was broken. Not a
generic error. Examples:

- "Zinc and iron need about 2 hours between them."
- "Omega-3 needs a meal. Try moving it to within an hour of one."
- "Magnesium works better in your wind-down window."

The shake alone communicates nothing and fails accessibility. **The message is
the feature.** Announce it via `aria-live="assertive"` too.

The conflict rules live in `src/lib/conflicts.ts` as a plain array of
`{ a, b, minGapMinutes, message }` and `{ item, requires: 'meal' | 'evening',
message }`. Seed it with:

- zinc + supplemental iron ≥25mg elemental → 120 minutes apart
- omega-3 (ethyl ester) → must be within 60 minutes of a meal
- magnesium, glycine → prefer within 2 hours of sleep time
- calcium ≥500mg + zinc → 120 minutes apart, soft warning only

Mark clearly in that file that the list is seed data and needs expanding.

CTA: "Start".

### 20. `done`

Brief confirmation, then push to the Today screen. No CTA — auto-advance after
1.4 seconds with a fade.

---

## 5. State

One onboarding store, persisted to `localStorage` on every step so a refresh or
a backgrounded tab resumes where it left off.

```ts
type OnboardingState = {
  step: number
  auth: { userId: string | null; email: string | null }
  profile: { age: number | null; gender: 'm' | 'f' | 'na' | null }
  survey: { q1: string | null; q2: string | null; q3: string | null }
  wake: string; sleep: string            // "07:00"
  meals: { id: string; name: string; time: string }[]
  currentStack: string[]
  goals: string[]
  notificationsGranted: boolean
  subscribed: boolean
  recommendations: { id: string; selected: boolean }[]
  schedule: { id: string; time: string }[]
}
```

Every screen must survive being landed on directly with a partially filled
store. If `goals` is empty when `building-recs` runs, fall back to a default
general-wellness set rather than crashing or showing an empty list.

---

## 6. Do not build

- Particles, in any form
- Any orange or amber colour
- Haptics
- Stripe or any web payment SDK
- Social proof, testimonials, review prompts, user counts, countdown timers
- A skip on anything except the three survey screens
- Progress percentages that lie ("87% complete" on step 4)

## 7. Before you say it is done

1. Run the whole flow start to finish on a 390×844 viewport and a 430×932 one.
   No screen scrolls unless it is a list. No CTA sits under the home indicator.
2. Kill the app mid-flow and reopen it. It must resume on the same step with
   answers intact.
3. Walk the DOM and confirm **no computed colour anywhere is orange** and no
   element is animating a particle field.
4. Force `prefers-reduced-motion` and confirm nothing slides or shakes.
5. Drag a dose into a conflicting slot and confirm the specific message appears,
   not a generic one.
6. Tab through every screen with a keyboard. Focus must be visible and ordered.

Then tell me: which screens you had to invent copy for, any conflict rules you
added beyond the seed list, and anything in this document that turned out to be
underspecified.
