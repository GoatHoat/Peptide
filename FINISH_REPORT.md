# Finish report

Written 17 August 2026. Covers `PROMPT_FINISH.md` and `PROMPT_LEGAL.md`.

Nothing below is rounded up. Where a section is partial it says so and says
which part.

---

## 1. Sections

| § | What | State |
|---|---|---|
| 1 | The iron figure | **Done** |
| 2 | Free/pro split | **Done** |
| 3 | Three device bugs | **Done** |
| 3b | Doodle background | **Done** |
| 3c | growth.png, empty-stack.png | **Done** |
| 4 | States and offline | **Partial** — offline done, the audits are not |
| 5 | iOS | **Done** |
| 6 | Name as one constant | **Done** |
| 6b | What the app remembers | **Partial** — storage and UI done, interpretation is not |
| 7 | Final pass | **Partial** — checks run, three-account walkthrough not |
| LEGAL 1 | Point the app at hosted docs | **Done** |
| LEGAL 2 | Write both documents | **Done** |

### §2

All of it. `useEntitlement()` off `profiles.subscription_tier`; the stack
trigger; the lifetime ask cap in the Edge Function; `ProSheet` from every gate;
`free_rank`; blurred locked rows with the divider; the upsell card; the counter
card and the "Meet PepStack AI" empty state.

The onboarding gate now reads `profiles.onboarded_at` as the source of truth
with the local flag as a cache, so signing in on a new device does not re-run a
flow the account finished, and signing in as a different person on the same
device does. `undefined` from that read — offline, or 0035 unapplied — leaves
the cache standing rather than being treated as "not onboarded".

### §4, what is missing

Offline is done for Today. The four sweeps — every loading state at final
dimensions, every empty state, every error state with a retry, 44×44 tap
targets — were **not** carried out as audits. Individual screens have them;
nobody went screen by screen. I also did not check safe areas at 375/393/430/440.

### §6b, what is missing

The table, the validation trigger, the write from onboarding, and the
`You → What Pepstack remembers` list with a Forget control all exist. **The lazy
interpretation step does not** — no model call ever runs, so `summary`, `tags`,
`ingredient_keys` and `confidence` stay null and empty. Facts are stored and
shown verbatim; the assistant does not yet read them.

### §7, what is missing

The scripted checks ran (below). The three-fresh-accounts-in-one-browser
walkthrough did **not** — the automated login in my measurement harness broke
when onboarding moved behind the account-scoped flag and I did not rebuild it.

---

## 2. Migrations to apply, in order

Everything up to and including `0037` was already applied by you. New here:

| File | What it does |
|---|---|
| `supabase/pending/20_0037_tiers.sql` | `free_rank`, the stack-limit trigger, `my_entitlement()` |
| `supabase/pending/21_0038_user_facts.sql` | `user_facts`, key validation, the tag trigger |

`0037` is the one that matters: until it runs, `my_entitlement` is absent, every
account reads as free with a catalogue total of 0, and the upsell copy says
"0 products are locked".

---

## 3. Edge Function changes — these do not deploy with a commit

`supabase/functions/ask/` changed. **Run `supabase functions deploy ask`.**

- `lib.ts` — `RATE_LIMIT` raised to 20/hour and 200/day; `FREE_ASK_LIFETIME = 3`
  added; `upgrade_required` added to the error union.
- `index.ts` — the lifetime cap, reading the tier from the database rather than
  from the request, returning **402**.

Until it is deployed the free cap does not exist and the client's 402 handling
is unreachable.

---

## 4. Every limit, and where it is enforced

| Limit | Server | Client |
|---|---|---|
| 1 stack item | ✅ trigger on `stack_items`, errcode `free_tier_stack_limit` | opens `ProSheet` |
| 3 assistant messages | ✅ lifetime count in the Edge Function, 402 | opens `ProSheet`, keeps the typed message |
| 30 products per kind | ❌ **UI only, deliberately** | blurred rows + lock |

The catalogue cap has no server check on purpose: it is published NIH label
filings and PubMed citations, so a check there would be theatre rather than a
boundary. `PROMPT_TIERS.md` says the same.

---

## 5. Decisions made on your behalf

Full list in `DECISIONS.md`. The ones with consequences:

- **Legal documents live in `website/`, not `public/`.** `public/` is published
  into the app bundle, which would have recreated the second copy the prompt
  asked to delete. `website/` is inert to the build — point the site's deploy at
  it.
- **Entitlement falls back to `free` on any error.** Showing an upsell to
  someone who paid is annoying; the reverse gives away what they are paying for.
- **The catch-up slider stayed at 56px**, not the 132px-at-3x (44px) in the
  newer spec — 44 is below the tap-target minimum once the thumb inset counts.
- **The catch-up card has no scheduler reason line.** `doses` does not store
  one; the solver's reason exists only at build time. Adding a column for it is
  a schema change I did not make unasked.

---

## 6. What I found that is broken or out of scope

**A real device bug, fixed.** The onboarding notification step called the web
`Notification.requestPermission()`. Inside the iOS WebView that is a different
permission from the one `LocalNotifications.schedule` needs — so somebody could
accept the prompt during onboarding and never receive a reminder, and because
iOS shows that prompt once ever, the later ask from You would have returned the
stored answer without displaying anything. Both paths now go through
`lib/notifications`.

**The launch screen was white.** `systemBackgroundColor` resolves to white in
light mode and all three `Splash` images were solid white, so a pure-black app
opened through a white rectangle. Fixed.

**The reserve clearing the floating tab bar was a literal `34px`** written when
the bar was 48 tall at 34 up. The bar is now 58 at 20 and the literal had
drifted, which is why a product row was hidden. Every reserve is derived from
`--tab-h` and `--tab-gap` now.

**Still broken, not fixed:** `ask_usage` grows without bound. Only the last 24
hours is ever read, and now the lifetime count as well — so it cannot simply be
pruned without breaking the free cap. Whatever retention you choose has to keep
a count per user even after pruning rows.

**Out of scope and untouched:** the 23 open items in `NIGHT_QUEUE.md`.

---

## 7. Final-pass checks

```
sk-ant in dist/            0
service_role in dist/      0
ANTHROPIC_API_KEY in dist/ 0

purchase() untouched       yes — still the 900ms stub
SKIP_PAYWALL default       'true'
injection UI in src/       0 occurrences
peptide rank guard         present

npm run build              green
npm test                   139 passed, 0 failed
```

**Bundle:** `dist` 3.7 MB total, main JS **1028 KB**. It was ~980 KB before this
run; the growth is `ProSheet`, `entitlements`, the memory UI and the doodle SVG.
The main chunk is over Vite's 500 KB warning and has been for a while — code
splitting is worth a session on its own.

---

## 8. The thing to carry out of this

I am not a lawyer and neither are you. Both legal documents are drafted from
what the app actually does — which is the hard part, and the part templates get
wrong — but **before launch they want reading by someone qualified in whichever
jurisdiction you file in.** Fourteen placeholders are marked and listed in
`LEGAL_PLACEHOLDERS` below; four of them (minimum age, entity, country, contact)
have to be answered before either document can be published at all.

### Placeholders left

**Privacy Policy (10):** legal entity name · country of establishment ·
monitored contact email (×2) · Supabase project region · whether that region
means UK/EU data leaves it and which safeguard applies · whether RevenueCat is a
sub-processor · retention period · supervisory authority · minimum age

**Terms of Use (4):** legal entity name · minimum age · governing law
jurisdiction · monitored contact email

### Against `ABOUT_THE_APP.md`

Everything in §4 appears in the Privacy Policy. Nothing appears in it that is
not in that file. Two things the file describes that I could not verify from the
code, because they are not code:

- **The Supabase region.** Not knowable from the repo; it is a dashboard
  setting.
- **Whether RevenueCat will be used.** `billing.ts` names it in a TODO and
  nothing imports it.

One thing the code does that the file does not describe: **`ask_reports` stores
the question and the answer when a user reports an assistant reply.** The file
lists the table under §4 but does not say the answer text is kept as well. The
Privacy Policy says both are.
