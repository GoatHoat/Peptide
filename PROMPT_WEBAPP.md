# Build brief — turn this folder into a running web app

You are building a **front-end-only React web app** that reproduces the iOS app
already designed in this folder. No backend, no auth, no database. Every number,
name and date is hard-coded mock data.

---

## 1. Read these first, in this order

| File | What it is | How to treat it |
|---|---|---|
| `mockup/Stack Tracker.dc.html` | **The finished design.** A single-file React app exported from Claude Design. It already contains every screen, every layout, every colour value and every piece of copy. | **This is the source of truth.** Open it and read the actual JSX and style objects. Port from it. Do not redesign anything. |
| `docs/DESIGN.md` | The visual system — colour tokens, spacing, glass rules, type scale | Authoritative for anything the mockup leaves ambiguous |
| `docs/PRODUCT.md` | Screen-by-screen product spec, onboarding order, monetisation | Authoritative for behaviour and copy |
| `docs/BUILD_PROMPT.md` | Screen-by-screen build brief | Background context |

If the mockup and the docs disagree on a visual detail, **the mockup wins**. If
they disagree on behaviour or copy, **PRODUCT.md wins**.

Read the mockup file properly before writing any code. It is ~165 KB and contains
the real values — exact hex codes, exact padding, exact strings, the mock data
arrays for supplements, the audit nutrients, the ratio cards, the pricing tiers
and the year-in-review stats. Copying those out is most of the job. Reproducing
them from memory or inventing new ones is the main way this task goes wrong.

---

## 2. Stack

- Vite + React + TypeScript
- Tailwind CSS
- No component library. The design is custom; a library will fight it.
- No router library — a single `useState` screen switcher is enough
- `localStorage` is fine and encouraged for persisting mock state between reloads

Set it up so `npm install && npm run dev` is all I need.

---

## 3. What to build

### Shell
Render the app inside an **iPhone frame centred on a dark page**, the same way the
mockup does — the design is a phone app and must not stretch to desktop width.
Keep the mockup's dev toolbar concept: a screen picker so I can jump straight to
any screen without walking through onboarding.

### Onboarding — 12 screens, in this order
`ob1` Cold open · `ob2` About you · `ob3` Build your stack · `ob4` Injectables ·
`ob5` The audit *(the payoff screen)* · `ob6` Goals · `ob7` Progress photo ·
`ob8` Sleep · `ob9` Meals · `ob10` Schedule reveal · `ob11` Notifications ·
`ob12` Paywall

### Main app
- `gate` — the check-in gate, with the "Yes, taken" → "Logged" transition
- `today` — the schedule. This is the home screen and the core of the product.
- `stack` — the full list of items, including the Running low section
- `item` — item detail
- `analysis` — audit tiles, ratio cards, interactions
- `profile` — settings list, streak stats
- `yir` — year in review

### Tab bar
Today · Stack · **[+]** · Analysis · Profile — with the `+` opening the six-option
add sheet (scan barcode, photograph label, search, enter manually, add a protocol,
add a progress photo).

---

## 4. Do NOT build these

Leave them out entirely and leave a clearly-marked empty container where each one
goes, with a `// TODO` comment:

- **The rotating capsule animation.** The rendered frames are in `capsule/` but I
  will tell you where they go later. Do not place them anywhere.
- **The 7-day streak particle reward.** `ParticleReward.swift` at the root is the
  iOS reference for this; it is not being ported yet.

Everything else should be built.

---

## 5. Visual rules that are easy to get wrong

- Background is **pure `#000000`**, not near-black, not a dark grey.
- Copper is `#C87941`, with `#E8A87C` light and `#8A4E24` deep.
- Surfaces are `rgba(255,255,255,0.055)` — very low contrast. Resist the urge to
  brighten them so they "show up better". The restraint is the design.
- The over-limit state is a **full tile inversion** to background `#F2E9E1` with
  `#0A0A0A` text. It is not a red border and not a warning icon.
- All numerals use tabular / monospaced digits so they do not jitter when they
  change. In CSS that is `font-variant-numeric: tabular-nums`.
- SF Pro does not exist on the web. Use
  `-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif` and pull Inter
  from Google Fonts as the fallback so it looks right on Windows.
- Generous vertical rhythm — roughly 40px between sections. Do not compress it.
- Blur/glass effects use `backdrop-filter`. Include the `-webkit-` prefix.

---

## 6. Mock data

Take the mock data **directly out of the mockup file** rather than inventing your
own — the audit numbers in particular are load-bearing for the demo (zinc at 45 mg
against an upper limit of 40, selenium at 340 mcg, the 50:1 zinc-to-copper ratio).
Put it all in a single `src/data/mock.ts` so it is easy to swap for a real API
later.

Make the app feel alive: the check-in gate should actually accept a tap and change
state, doses should be tickable, the tab bar should navigate, sheets should open
and close. State can live in memory and reset on reload — it just must not be a
dead screenshot.

---

## 7. When you are done

Give me a short list of: which screens are complete, anything in the mockup you
could not reproduce and why, and any place you had to make a judgement call.
Do not tell me it is finished if a screen is a stub — say which ones are stubs.
