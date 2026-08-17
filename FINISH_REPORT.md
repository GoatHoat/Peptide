# Finish report

Written 17 August 2026. Covers `PROMPT_FINISH.md` and `PROMPT_LEGAL.md`.

Nothing below is rounded up. Every section of both prompts is complete; what is
left is listed in §2, §3 and §8, and every item there is something I am not
allowed to do rather than something I did not finish. One product decision is
also yours and is named in §1.

`AUDIT_INDEPENDENT.md` is a second agent's read of this file and is worth
reading beside it — three of its findings are acted on here and credited where
they land.

---

## 1. Sections

| § | What | State |
|---|---|---|
| 1 | The iron figure | **Done** |
| 2 | Free/pro split | **Done in the app — one product decision is yours** |
| 3 | Three device bugs | **Done** |
| 3b | Doodle background | **Done** |
| 3c | growth.png, empty-stack.png | **Done** |
| 4 | States and offline | **Done** |
| 5 | iOS | **Done** |
| 6 | Name as one constant | **Done** |
| 6b | What the app remembers | **Done** |
| 7 | Final pass | **Done** |
| LEGAL 1 | Point the app at hosted docs | **Done** |
| LEGAL 2 | Write both documents | **Done** |

### §2

All of it in the app. One thing is not a coding question and is left for you,
written up in `BLOCKED.md`: **on a free account the `0037` trigger caps the
stack at one item, while onboarding builds a schedule of several products and
calls `addToStack` for each behind a `.catch(() => {})`.** The trigger raises for
every item after the first and the error is discarded, so a free account
finishes onboarding with N schedule items, one stack row, no paywall and no
error. Deleting the catch does not fix it — the outer loop swallows the error
too, and the visible result would be a schedule silently truncated to one item.
Does a free account get a one-product schedule, or does the cap only govern
manual stack adds? Both are defensible and they ship very differently.

The rest: `useEntitlement()` off `profiles.subscription_tier`; the stack
trigger; the lifetime ask cap in the Edge Function; `ProSheet` from every gate;
`free_rank`; blurred locked rows with the divider; the upsell card; the counter
card and the "Meet PepStack AI" empty state.

The onboarding gate now reads `profiles.onboarded_at` as the source of truth
with the local flag as a cache, so signing in on a new device does not re-run a
flow the account finished, and signing in as a different person on the same
device does. `undefined` from that read — offline, or 0035 unapplied — leaves
the cache standing rather than being treated as "not onboarded".

### §4

All four sweeps done, and done as tests rather than as a morning of tapping —
`tests/e2e/states.spec.ts` and `tests/e2e/widths.spec.ts`, 25 assertions. An
audit carried out once is a paragraph in a report; an audit that runs is the
only kind that survives the next change.

**Loading at final dimensions.** Six lists said `Loading…` on one centred line
and were then replaced by rows several times taller, so everything below them
jumped when the network answered. `components/Skeleton` draws the row shape at
the row height instead. No shimmer — a sweep is a gradient and this app does not
have gradients; the only motion is a small opacity pulse so "loading" does not
read as "loaded, and empty", and reduced motion turns that off too. The test
reads `.dose`'s own `min-height` and asserts the placeholder matches it, so the
number cannot drift.

**Empty states.** An empty stack now hands you to Discover; a search with no
matches offers to clear itself; four states that said only "No notes yet." say
what will put something there. A test fails any empty state under 24 characters,
which is about the length below which it is a caption on a blank screen rather
than a state.

**Offline writes, and one line of copy that was not true.** Reads were already
well built — paint from cache, never a spinner with nothing behind it. Writes
were not. `setDoseTaken` is a plain update that throws with no connection and
was called unguarded from three places, so offline the row did not even change
colour and the rejection went nowhere: the tap was silently dead. Meanwhile the
banner read *"Anything you tick will sync when you reconnect."* There is no
outbox, no queue and no `online` listener anywhere in `src/lib` — nothing syncs,
and the tick was lost.

An outbox is a feature and out of scope for these prompts. The honest fix is the
one made: the failure is handled and said out loud, and the sentence now reads
*"Ticking one off needs a connection."* Someone ticking doses on a plane still
cannot, but they are told, rather than losing the history and finding out later.

**Error states.** Nine fetches were bare `.then` chains. A rejection surfaced
nowhere: the screen stayed on its loading state, which reads as an app that has
hung rather than a request that failed. Every one now has a state with a retry
that works, and the technical detail goes to the console rather than the screen.

Two places printed an exception's own words. The account-deletion modal rendered
`err.message`, and the auth form relayed whatever GoTrue returned — including
`AuthRetryableFetchError` and `Database error saving new user`. Both are mapped
to plain sentences now, with the original logged.

The profile load was the worst of them. `getProfile` throws when the row is not
there, and immediately after signing up it sometimes is not — the row is made by
a trigger on `auth.users` and the client's first read can win that race.
Uncaught, so `profile` stayed null and You rendered blank with nothing to press.
Three tries over about a second, then an error state.

**Tap targets.** Measured at 44×44, counting hit areas expanded by a
pseudo-element — the pattern this app already uses, 24px of drawn circle inside
44px of target on the dose tick. Seven were genuinely short. Two on the swept
screens: the Discover segmented control at 34 tall and the lock divider at 41.
Five more once the sweep was extended to open sheets, which is where the app's
smallest control lives — `.sheet-close` at 30px, on every sheet in the app.

Eight settings rows were also `div`s with an `onClick`, Sign Out and Delete
Account among them: unreachable by keyboard, announced as static text by
VoiceOver. They are buttons.

**Safe areas and widths.** 375/390/393/430/440, all three tabs at each. One real
find: the paired widgets on You ran 13px off the right edge at 375, because
`flex: none` means "do not shrink, ever". A second test scrolls each screen to
the end and asserts nothing finishes underneath the floating tab bar.

**One thing found on the way.** `var(--ease)` was referenced by the catch-up
fill and never defined anywhere, so that declaration was invalid and dropped —
the bar snapped to its new width instead of filling. `--ease` and three duration
tokens now exist, which is what "one easing curve and one duration set" was
supposed to mean.

### §6b

Complete. The interpretation step is now `supabase/functions/ask/memory.ts`,
called from the first assistant turn after a note is written — **lazily, never
during onboarding**, where a model call would sit between two taps, cost money
for every signup including the ones that never come back, and fail badly
offline. At most three notes per turn, so six notes are read over two
conversations rather than paid for six times in one.

`interpret_note` is a forced tool call, and then nothing it returns is trusted:

| The model proposes | What happens in code |
|---|---|
| a tag outside the enum | dropped by `readInterpretation` **and** by the trigger |
| an ingredient name | resolved through `resolve_ingredient_key`; unresolvable names are discarded and logged |
| confidence below 0.6 | tags and ingredient keys both blanked; the raw sentence is still kept |
| a medical note | tagged `other`, no ingredient keys, whatever it named |
| malformed JSON, or nothing | the row is stamped `interpreted_at` anyway, or it is retried on every turn forever |

`raw_text` is never written to. Eight unit tests in `tests/unit/ask.spec.ts`
cover each row of that table.

The assistant now reads up to ten undismissed facts, introduced as context and
explicitly *"not a rule and it does not change any amount or any timing"*.

One change to `0038`: `'other'` was added to the trigger's `known_tags`. Without
it a medical note came back with empty tags and was indistinguishable from an
uninterpreted one. Nothing in `recommend.ts` reads `'other'`, so marking it
changes no schedule.

### §7

The walkthrough is `tests/e2e/accounts.spec.ts`, and it walks it rather than
describing it: A signs in, uses the app, and signs out; B and C each sign up
behind them; at every step it asks what is on the device and who it belongs to.

It needed three things in the fixtures that did not exist — the stub can now
swap identity, its signup creates the profile row the real trigger creates, and
sign-in is written once rather than through `addInitScript`, which re-runs on
every navigation and put the session straight back after a sign-out.

What it holds:

- every `pepstack.*` key carries the account, and the payload agrees with the key
- nothing of A's survives A signing out
- B and C each land on the first question of onboarding rather than on A's Today
- an account that finished onboarding on another device does not repeat it
- `pepstack.discover.tab` is the only unscoped key, and a second one fails the
  test rather than passing quietly

---

## 2. Migrations to apply, in order

Everything up to and including `0036` was applied by you and confirmed against
the live database. Two are outstanding:

| File | What it does |
|---|---|
| `supabase/pending/20_0037_tiers.sql` | `free_rank`, the stack-limit trigger, `my_entitlement()` |
| `supabase/pending/21_0038_user_facts.sql` | `user_facts`, key validation, the tag trigger |

**`0037` is the one that matters, and it matters more than the last report
said.** Until it runs:

- `my_entitlement` is absent, so every account reads as free with a catalogue
  total of 0, and the upsell copy says "0 products are locked"
- the stack limit has no server-side enforcement at all
- `free_rank` does not exist, so **every product used to be locked** — fixed in
  the client this run, but the free tier still shows the whole catalogue until
  the column is there to rank it

Neither has been applied by me and neither will be. That is the one action git
cannot undo.

---

## 3. Edge Function changes — these do not deploy with a commit

`supabase/functions/ask/` changed. **Run `supabase functions deploy ask`.**

- `lib.ts` — `RATE_LIMIT` raised to 20/hour and 200/day; `FREE_ASK_LIFETIME = 3`
  added; `upgrade_required` added to the error union.
- `index.ts` — the lifetime cap, reading the tier from the database rather than
  from the request, returning **402**.
- `memory.ts` (new) + `index.ts` — the lazy `interpret_note` step and the
  memory block in the opening turn. Until it is deployed, notes are stored and
  shown verbatim but never interpreted and never read by the assistant.

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

**The whole catalogue was locked, and would have shipped that way.** Discover
locked a product when `(free_rank ?? 9999)` exceeded the free cap. `free_rank`
arrives through `select('*')`, so on a database where `0037` has not been
applied the column is simply not there, every row reads `undefined`, and a free
account sees the entire library greyed out behind a paywall. **That is the state
your production database is in right now.** A missing rank now means "we cannot
tell", and the answer to that is to show the product: an over-generous free tier
is a pricing decision, a library that is nothing but locks is a broken app.

It surfaced because it took `discover.spec` and `peptides.spec` down with it —
which is the only reason it was found at all, and worth remembering when
weighing what those tests are for.

**Four tests were pinned to a day.** `nowmarker.spec` froze the clock to a
hard-coded `2026-08-16` while the fixture starts its schedule item *now*, and
`ensureTodayDoses` skips an item whose start is after the frozen day. From the
next midnight the fixture seeded a schedule that had not begun, Today rendered
its empty state, and four tests about where a marker sits failed for a reason
with nothing to do with the marker. Both that spec and `catchup.spec` derive the
day now.

**Three CSS blocks are dead, and were left alone.** `.recon-unit-btn` and
`.bodymap-chip` have no reference in any `.tsx`. Rule 7 — I do not delete what I
do not understand — so they are reported rather than removed. `.recon-*` is
reconstitution UI, which is worth a look on its own terms given the positioning
in `CLAUDE.md`.

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
injection UI in src/       0 occurrences — the 2 matches are comments
                           saying there will not be any
peptide rank guard         present

npm run build              green
npx tsc --noEmit           green
npm test                   206 passed, 0 failed, 0 flaky
```

**Bundle:** main JS **1033 KB**, `dist` 3.7 MB total. It was 1028 KB at the last
report; the 4 KB is `Skeleton`, `ErrorState` and the nine catch blocks. The main
chunk is over Vite's 500 KB warning and has been for a while — code splitting is
worth a session on its own.

**A note on what "green" was worth earlier in this run.** Three onboarding
fixtures were reading and writing a key the app stopped using when local state
was scoped per account. They wrote where nothing reads and read back nothing,
and nothing threw — so they reported green while asserting against a store they
had not written. Two stale assertions hid behind that, including one that still
expected the multiplied iron figure. Everything in this report was re-run after
they were repaired.

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
