# Finish it

Everything left before this repo can be built and uploaded. I have checked what
already exists — `NowMarker.tsx`, `schedule.ts`, ingredient-aware
`conflicts.ts`, the week strip, the catch-up screen and the compliance pass are
all done. **Do not rebuild them.** What follows is what is genuinely missing.

## How to work through this

Do the sections in order. After each one:

```
npm run build && npm test
```

must pass, then commit with a real message. If a section leaves the build red
and you cannot fix it, `git reset --hard` that section and move to the next —
report it rather than leaving it broken.

**Do not stop to ask me questions.** Where a decision is needed, make the most
conservative call that keeps the app shippable, do it, and put one line in the
report saying what you chose and why. A wrong call I can read about is worth
more than a blocked session.

Two rules from `CLAUDE.md` that still hold and are not negotiable: **never apply
a migration to the remote database** — write it and list it for me — and **never
`git push`.**

You will probably not finish in one session. That is fine. Keep the ordering,
commit as you go, and when you stop, say exactly which section you reached.

---

# 1. The iron figure — small, do it first

`recommend.ts:211` sets `amountFactor: 1.8` for vegetarian iron and
`Results.tsx:116` multiplies it out, showing 32 mg as a personal daily target.

The NIH ODS 1.8× figure is about **total dietary iron intake** — the exact
wording is "the requirement for iron is 1.8 times higher for people who follow
vegetarian diets" — and it exists because non-haem iron across a whole plant
diet absorbs poorly. It is not a supplement dosing instruction, and no NIH table
publishes 32 mg for anyone.

- Remove the multiplication. Show the stored RDA.
- Render the vegetarian factor as a tertiary annotation: it applies across the
  whole diet, not to a supplement.
- Then confirm **no other figure anywhere in the app is computed rather than
  read** from a stored NIH value or a DSLD label panel. Report anything you find.

This is the last calculated dose in the app, and removing it is what makes the
1.4.2 position clean: every number is read, nothing is calculated.

---

# 2. The free/pro split — the big one

`PROMPT_TIERS.md`, in full. `src/lib/entitlements.ts` does not exist; none of it
is started.

Priority order inside it, in case you run short:

1. `useEntitlement()` off `profiles.subscription_tier`, one source of truth
2. The 1-item stack cap, **with the Postgres trigger** — a client-side limit is
   a suggestion
3. The 3-message Ask AI cap, counted server-side in the Edge Function
4. The `ProSheet`, opened from every gate, reusing what `Commit.tsx` has
5. `free_rank` and the blurred rows
6. The upsell card on Today
7. The message counter card and the "Meet PepStack AI" empty state

**Leave `purchase()` as the stub and `SKIP_PAYWALL` defaulting to `'true'`.** A
paywall that grants the tier without charging is Guideline 3.1.1 and 2.1.

---

# 3. Three bugs from screenshots of the running app

Real, seen on device, not in any prompt yet.

- **The tab row renders over the status bar.** On the Discover screen, scrolled,
  "Ask AI / Peptides / Vitamins & Minerals" sits on top of the clock and
  battery. The sticky header is missing its safe-area inset.
- **The floating tab bar covers content.** "See more articles" is half behind
  it, and on the list a whole product row is hidden. The scroll container needs
  bottom padding equal to the bar height plus the home indicator.
- **The search placeholder clips mid-word** — "Search a product, or describe
  your g…". Shorten the string or fix the field width.

Check every screen for the same two classes of problem while you are in there,
at 375, 390, 393, 430 and 440 wide.

---

# 3b. The doodle background — welcome and catch-up

`public/doodle-pattern.svg` is in the repo: scattered outline capsules, tablets,
softgels, blister packs, bottles and droplets in `#7B5CFA` on transparency,
1179×2556, 7 KB. `doodle-pattern.png` at 2358×5112 is the raster fallback; prefer
the SVG, it scales to any device.

Use it on exactly two screens:

- **Welcome** — full-bleed behind everything, `opacity: 0.28`
- **Catch-up** — full-bleed, `opacity: 0.18`, because cards and a drag control
  sit on top and legibility wins

```css
.doodle-bg {
  position: absolute; inset: 0;
  background: url('/doodle-pattern.svg') center / cover no-repeat;
  pointer-events: none;
}
```

Rules for it:

- **Dim in CSS, never regenerate a dimmer file.** The asset stays at full accent
  brightness so line quality survives; each screen sets its own opacity.
- Pure black behind it. The pattern is transparent and carries no background.
- Nowhere else. Not Today, not Discover, not the paywall, not onboarding
  questions. Two screens is a motif; five is wallpaper.
- It sits behind content and takes no pointer events.
- Respect `prefers-reduced-transparency` by dropping to `opacity: 0.10`.

**The catch-up screen layout**, since the design is settled: pure black, doodle
at 0.18, a headline in the top third, then one card per missed dose containing
the product name, form and time due, and the scheduler's reason line. Below that
a slide-to-confirm track — full width minus 48px, 132px tall at 3x, `#0E0E11`
with a hairline border, accent thumb, label "Slide if you took it". On completion
the track fills accent, the label becomes "Taken", the thumb lands right, and it
locks. Under it, "I didn't take this" as a quiet text button at 62% white, never
equal weight to the slider. A footer line reads "Nothing is marked until you
slide it."

When fewer than three doses are missed, centre the card stack vertically —
otherwise the screen is mostly empty space.

---

# 3c. Art that is now in the repo

Two files landed and both need wiring up.

**`public/goals/growth.png`** — the seventh goal slab. `goals.tsx` has pointed at
this path since the Growth goal was added and the file did not exist, so that
card has been rendering a broken image. It is 512×512 RGBA with a transparent
background, cropped and scaled to match the other six exactly (full width, 0.75
of the height). Nothing to change in code beyond confirming the grid now shows
seven cards without an orphan on the last row.

**`public/art/empty-stack.png`** — an open six-compartment pill organiser, purple
wireframe on transparency, 1024px. Use it as the empty state for the stack:
centred, roughly 220px wide, with the empty-state copy under it. Nowhere else.

Both are transparent PNGs and must sit on pure black. Do not add a background
plate behind either.

---

# 4. States and offline

`PROMPT_SHIP.md` §4.

- **Offline.** `ask.ts` handles it; nothing else does. Today must render from
  cache with no network. Cache today's doses and the schedule, user-scoped
  through `src/lib/storage.ts`. A quiet offline line, never a spinner that never
  resolves.
- Every loading state at final dimensions so nothing shifts when data lands.
- Every empty state with one line of copy and one action.
- Every error state with a retry, never a raw error string.
- Tap targets to 44×44 with a pressed state.

---

# 5. iOS

`PROMPT_SHIP.md` §5. The icons now exist — do not generate new ones.

- `brand/appstore-1024.png` is the App Store icon: square, no rounded corners,
  no alpha. Put it in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` and fix
  `Contents.json`.
- `public/` has `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`,
  `icon-192.png`, `icon-512.png`. Wire them in `index.html` and the web manifest.
- `brand/logo-mark.svg` is the transparent mark for in-app use.
- Launch screen on pure black so there is no white flash.
- **Notification permission priming.** `notifications.ts` calls
  `requestPermissions()` directly. iOS gives one shot at that prompt ever — put
  a screen in front explaining why, and only call the API after they agree.

---

# 6. The name as one constant

`PROMPT_SHIP.md` §6. Display name, bundle id and domain in one config module,
referenced everywhere — `capacitor.config.ts`, `index.html`, `package.json`, the
copy, the Ask AI empty state.

**Do not change the name.** I have not chosen it. Make changing it a one-line
edit instead of a find-and-replace across 14 files.

---

# 6b. What the app remembers

`PROMPT_MEMORY.md`, in full.

The "Something else" free-text field in the reactions question currently stores
`reactionsNote` and nothing reads it. It becomes memory: interpreted by the model
into a validated structure, stored in `user_facts` with RLS, read by the
assistant in every future conversation, and visible and deletable by the user in
You.

Two constraints from that file that are not negotiable. **Interpretation happens
lazily, never during onboarding** — no model call in the middle of the flow.
And **a model's reading of free text may inform what the assistant says, but may
never silently change a dose, a schedule or a safety warning**; only validated
tags and resolved ingredient keys reach `recommend.ts`.

---

# 7. Final pass

Run the whole app as three fresh accounts in one browser and fix what you find.
Then:

1. `npm run build && npm test` green
2. Grep `dist/` for `sk-ant` and `service_role` — both must return nothing
3. Confirm: no dose, timing or ranking on any peptide anywhere; no injection UI;
   `purchase()` untouched; `SKIP_PAYWALL` still `'true'`
4. Bundle size before and after

---

# The report

When you stop, tell me:

1. Which sections are done, which are half done, which are untouched. Be exact.
2. **Every migration I still need to apply**, in order.
3. **Anything under `supabase/functions/` you changed** — those do not deploy
   with a commit and I have to run `supabase functions deploy`.
4. Every decision you made on my behalf, one line each.
5. Every limit enforced on the server versus only in the UI.
6. Anything broken and out of scope. The report is more useful to me than a fix
   I have to audit.

Do not claim a section is done because it compiles.

---

# What you cannot do

Do not attempt these and do not treat them as blockers:

- Choosing the name
- The Apple Developer account, tax and banking
- Subscription products in App Store Connect, and RevenueCat against them
- Screenshots, description, keywords, age rating
- Applying migrations to the remote database
- Running on a physical phone

Build so that each of those is the only thing left.
