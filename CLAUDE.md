# Pepstack

An iOS supplement timing and scheduling app. React + Vite + Capacitor, Supabase
for auth and data. The user picks goals, gets a sourced list of products, and
gets them placed into a daily schedule around their meals and sleep.

## Build and test

```bash
npm install
npm run build            # must pass
npx tsc --noEmit         # must pass
npm test --if-present    # must pass
```

## Layout

- `src/screens/` — the app's screens
- `src/onboarding/` — the onboarding flow. `flow.ts` is the single description
  of the order; screens read their position from it and never know what comes
  before or after them.
- `src/lib/` — data access (`api.ts`), conflicts, scheduling, prefs
- `src/components/` — shared UI
- `supabase/migrations/` — numbered, idempotent SQL. The source of truth for the
  product catalogue.

## Positioning — this decides a lot of small questions

The app is a **supplement timing and scheduling app**. Peptides are a reference
library only: no doses, no recommendations, no ranking anywhere in the product.
The interaction/overdose audit is a minor side feature and must not be given
more prominence than it currently has.

**The one exception, added deliberately: the reconstitution calculator on
Today.** It converts between units on three numbers the user types — what is in
their vial, how much water they added, and the dose they had already decided on.
That is the entire line: the app may do arithmetic on numbers it was given, and
may never be the source of a number.

So it is not attached to any product in the catalogue, it has no defaults, it
suggests no range, and it stores nothing. `legal.md` records that the rejected
version served *protocols* — ratios and amounts tied to named peptides — and
that re-wording it did not help, because what is evaluated is the function. A
converter with no substance in it has a different function. Adding a peptide
argument, a default, a suggested amount or persistence to it would put the old
function back, whatever it looked like on screen.

## Design

Pure black background. One accent, `#7B5CFA`. Hairlines at
`rgba(255,255,255,0.09)`. No second accent colour, ever. No gradients, glows,
shadows or particles.

## Secrets

No API keys, no `service_role` key, no tokens — not in code, not in `.env`, not
in a comment, not in a test fixture, not in a log. Keys are read from the
environment at runtime and are absent by design. `VITE_`-prefixed variables are
inlined into the client bundle at build time and are public; nothing sensitive
may ever carry that prefix.

---

## Overnight autonomous runs

When working from `NIGHT_QUEUE.md`, these override everything else.

### The hard rules

1. **No new features.** Nothing that adds a screen, a tab, a setting, a data
   model or a user-visible capability that does not exist today. The job is to
   finish and smooth what is already here. If you believe something needs to be
   added, write it under "Proposals" in `NIGHT_QUEUE.md` and move on.

2. **Every run ends green.** `npm run build && npx tsc --noEmit && npm test
   --if-present` must pass before you commit. If you cannot get it green,
   `git reset --hard` back to where you started and say so. A reverted iteration
   is a fine outcome; a broken branch discovered at 8am is not.

3. **One queue item per run.** Finish it completely, tick it off with a one-line
   note, commit, stop. Do not start the next one.

4. **Commit every iteration.** Small commits with real messages. Never `push`.
   Never touch `main`. Never force-push, rebase, or amend anything you did not
   create this session.

5. **Never write a secret.** See the Secrets section above. It applies here
   doubly, because nobody is watching.

6. **No new dependencies** without writing the reason in the commit message. If
   a package would take more than 50KB into the bundle, propose it instead.

7. **Do not delete or rewrite anything you do not understand.** If a file looks
   dead, say so in the report. Do not remove it.

8. **Never apply SQL to a remote database.** No `supabase db push`, no
   `supabase db reset`, no `psql` against a hosted URL, no running statements
   through the dashboard or the REST API. Write migrations to
   `supabase/migrations/` and stop there. Git can revert a file; it cannot
   revert a dropped column or 176 inserted rows on production. Applying them is
   a decision I make in the morning, awake.

9. **Never `git push`.** Everything stays local on the night branch.

### What "premium" means here, concretely

Do not add gradients, glows, shadows, particles or animation flourishes. This
app reads expensive through restraint, not decoration. Premium here is:

- Nothing ever appears without a loading state at its final dimensions.
- Nothing ever shifts layout after it appears.
- One easing curve and one duration set, used everywhere.
- One type scale, one spacing scale, one radius. No outliers.
- Empty states that say something useful, never a blank screen.
- Copy that is short and plain, sentence case, no exclamation marks.

If a change cannot be justified in one sentence as removing a seam, it is
decoration. Do not make it.

### Reporting

Append to `NIGHT_REPORT.md` every iteration:

- what you changed, in one line
- what you found and did not change, and why
- anything that looked broken but was out of scope

Be blunt in this file. Things you flagged and did not fix are more useful in the
morning than a list of things that went fine.
