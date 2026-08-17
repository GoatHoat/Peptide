# Ship it

Everything left between this repo and a build that can be uploaded to App Store
Connect. Read `CLAUDE.md` first — its rules hold throughout, especially rule 8:
**write migrations, never apply them to the remote database.** Yash applies them.

This is more than one session of work. Do it in the order below, commit after
every numbered section, and when you stop, say exactly where you stopped. **A
truthful "sections 1–4 done, 5 half done" is worth more than a claim of
completion I have to go and verify.** Do not mark something done because it
compiles.

Before you start, run `supabase migration list` and read the schema. Migrations
`0001`–`0035` exist and most are applied; `PROMPT_V2.md` and `PROMPT_V3.md` were
written before several of them landed, so check what is already there rather
than rebuilding it.

---

# 1. The free/pro split

`PROMPT_TIERS.md`, in full. It is the largest piece here and nothing in it
exists yet — no `isPro`, no limits, no gates.

The parts that matter most, in case you have to cut scope:

- `profiles.subscription_tier` is the single source of truth. One
  `useEntitlement()` hook. No component decides for itself.
- **Server-side enforcement for the two limits that cost money**: a trigger on
  `stack_items` for the 1-item cap, and a lifetime count in the Edge Function
  for the 3-message cap. A client-side flag is a suggestion.
- The catalogue blur is presentation only. No server check — the data is public
  reference material and a check there would be theatre.
- `free_rank` computed in SQL so the visible 60 are stable between sessions.
- The `ProSheet`, opened from every gate, reusing whatever `Commit.tsx` already
  has rather than becoming a second paywall that drifts.

**Leave `purchase()` as the stub and `SKIP_PAYWALL` defaulting to `'true'`.**
You were right about this: a paywall that grants the tier with no payment sheet
is Guideline 3.1.1 and 2.1. Build the sheet, wire it to the existing stub, and
flip both in the same commit as RevenueCat — which cannot happen until there is
an Apple Developer account with products created.

---

# 2. The schedule, and Today

From `PROMPT_V2.md` §4–5 and `PROMPT_V3.md` §3–4. Check what is already applied
before rebuilding.

- **The solver runs on ingredients, not names.** `glossary_ingredient` and
  `ingredient_synonym` are populated. `conflicts.ts` still matches by substring
  against the product name, so `Thorne Basic Nutrients 2/Day` — zinc, iron and
  calcium in one capsule — currently raises nothing against an iron supplement.
  Write that as a failing test first.
- **Amount thresholds.** A multivitamin with 2 mg of iron must not block against
  zinc. Where you have no defensible threshold, leave it null and say which.
- **Minimise blocks, four maximum**, each anchored to wake, a meal or bedtime.
  Never a free-floating 15:20. A schedule nobody follows is worse than an
  imperfect one they do.
- **Every placement carries a reason**, naming both products and the ingredient:
  "Your Basic Nutrients has 15 mg of zinc in it, which wants 2 hours from your
  iron." Without that sentence the app is moving things around for no visible
  reason.
- **"You are here"** on Today, between rows, live, per `PROMPT_V2.md` §5.
- **The week strip**: purple completed, grey missed, light grey today, glass
  future. No `backdrop-filter` — pure black behind means nothing to blur; use a
  translucent fill and a hairline. Remove `.week-dot`. A day with nothing
  scheduled must not render purple.

---

# 3. The compliance surface

These are the things a reviewer sees. None is large; all of them bounce you.

- **A medical disclaimer wherever an amount appears.** Right now the only one in
  the app is a line under the Ask AI input. Since V2 every supplement sheet
  shows a target, an upper limit and a serving size with nothing near them. Add
  a persistent, quiet line to the supplement detail sheet and the schedule.
- **Remove the injection remnants.** `injection_site` still renders as a
  ` · site` suffix in `DayDoses.tsx` and `DoseHistory.tsx`. `AddSchedule` always
  writes null, so it is dead in practice and contradicts the positioning line in
  `CLAUDE.md`.
- **Delete `ReconCalculator.tsx` and `BodyMap.tsx`.** Nothing imports them and
  they tree-shake out of the bundle, so this changes no behaviour — but a
  peptide reconstitution calculator sitting in the repo of an OTC supplement app
  is the wrong thing to still own. This is an explicit exception to rule 7: I
  understand them, and I am telling you to remove them. Drop `injection_site`
  from the schema in a new migration too.
- **Account deletion**, already wired to `delete_account`. Verify it also clears
  local state — `PROMPT_ACCOUNT_SCOPING.md` calls for this and it is easy to
  have missed.
- **Audit `PrivacyInfo.xcprivacy`.** It exists. Confirm it declares every
  required-reason API actually in use and every data type collected — email,
  age, sex, diet, health goals, supplements taken, adherence, skip reasons. This
  is a real disclosure now, not boilerplate.

---

# 4. States, offline, and the seams

The premium section of `CLAUDE.md` is the standard here. Restraint, not
decoration.

- **Offline.** `ask.ts` handles it; nothing else does. Today must render from
  cache on a plane and in a lift. Cache today's doses and the schedule locally,
  user-scoped through `src/lib/storage.ts`. Show a quiet offline line, never a
  spinner that never resolves.
- **Every loading state** at final dimensions, so nothing shifts when data
  lands. List where you found gaps.
- **Every empty state** with a line of copy and one action: empty stack, empty
  schedule, no search results, no history, no doses today.
- **Every error state** with a retry. Never a raw error string.
- **Tap targets to 44×44**, pressed state on everything interactive.
- **Safe areas** at 375, 390, 393, 430 and 440 wide, in every screen and sheet.
- **One easing curve, one duration set, one type scale, one spacing scale, one
  radius.** Report how many distinct values existed before and after.

---

# 5. iOS

- **Icons.** The new mark is in `brand/` — `appicon-1024.png` is the App Store
  icon, `appicon.svg` the source. `public/` has the favicon set. Replace the
  contents of `ios/App/App/Assets.xcassets/AppIcon.appiconset/` and update
  `index.html`'s icon links. The old icons are branded Halfpast.
- **Launch screen** on pure black, so there is no white flash into a black app.
- **Notification permission priming.** `notifications.ts` calls
  `requestPermissions()` directly. iOS gives one shot at the system prompt ever —
  ask on a screen that explains why first, and only call the real API after they
  say yes.
- **Verify local notifications actually schedule and fire**, including after the
  app is killed and after a reboot. This is the core of a timing app and it has
  never run on hardware.
- **Cold start, background, foreground.** The catch-up screen depends on
  `last_opened_at` behaving correctly across an overnight kill.

---

# 6. Make the name one constant

Pepstack is taken on the App Store, so the app will be renamed before it ships.
Right now the string is in 14 places plus `capacitor.config.ts`, `index.html`,
`package.json` and the copy.

Put the display name, bundle id and domain in one config module and reference it
everywhere. Do not change the name — I have not chosen it — just make changing
it a one-line edit rather than a find-and-replace across the repo.

Leave `PepStack AI` in the Ask empty state reading from that constant too.

---

# 7. Audit yourself, then report

Run the whole thing end to end as three fresh accounts in one browser and write
what you find. Then tell me:

1. Which sections you finished, which you half-finished, and which you did not
   start. Be exact.
2. Every migration you wrote that I still need to apply.
3. Every limit you enforced on the server, and any you gated only in the UI.
4. What the free-visible 60 came out as per kind.
5. Where the solver had to break a constraint, and how many blocks a typical
   8-item stack produces.
6. Anything you found that is broken and out of scope — the report is more
   useful to me than the fixes.
7. Bundle size before and after.
8. Confirm: no fabricated citations, no dose or timing on any peptide anywhere,
   no injection UI, `purchase()` untouched, `SKIP_PAYWALL` still `'true'`, and
   nothing matching `sk-ant` or `service_role` in `dist/`.

---

# What you cannot do, and I will

Do not attempt these, and do not treat them as blockers on your own work:

- Choosing the name
- Buying the Apple Developer account, and the tax and banking forms
- Creating subscription products in App Store Connect, and wiring RevenueCat
  against them
- Screenshots at 6.7" and 6.5", the description, keywords, support URL, age
  rating
- Applying any migration to the remote database
- Running the app on a physical phone

Build everything so that each of those is the only thing left.
