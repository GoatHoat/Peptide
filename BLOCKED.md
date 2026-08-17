# Blocked

Nothing is hard-blocked. Both items that stood here are finished; what remains
is work I am not allowed to do and one product decision that is not mine.

## Done since this file was written

- **The lazy interpretation step for `user_facts`** (PROMPT_FINISH §6b). Built
  in `supabase/functions/ask/memory.ts` and called from the first assistant turn
  after a note is written. It needs `supabase functions deploy ask` to exist in
  production.

- **The three-fresh-accounts walkthrough** (PROMPT_FINISH §7). Now
  `tests/e2e/accounts.spec.ts`. It needed three changes to the fixtures: the
  stub can swap identity, its signup creates the profile row the real trigger
  creates, and sign-in is written once rather than through `addInitScript`,
  which re-runs on every navigation and put the session straight back after a
  sign-out.

## What I cannot do, by instruction

- **Apply `0037_tiers` and `0038_user_facts`.** Written, listed, left. Git can
  revert a file; it cannot revert a dropped column.
- **Deploy the Edge Function.** `supabase/functions/ask/` has changed twice this
  run and neither change is live.
- **Answer the fourteen legal placeholders.** Country, entity, minimum age,
  retention period and contact address are facts about you, not about the code.

## What is not mine to decide

**Does a free account get a one-product schedule, or an unbounded one?** The
`0037` trigger caps `stack_items` at one for free accounts. Onboarding builds a
schedule of several products and calls `addToStack` for each through a
`.catch(() => {})`, so on a free account the trigger raises for every item after
the first and the error is discarded. The result is N schedule items and one
stack row, with no paywall and no error shown.

Do not close it by deleting the catch. The outer loop in `Onboarding.tsx`
swallows the error too, so the visible effect would be a schedule silently
truncated to one item with no explanation — worse than today. It is a conflict
between the server-enforced cap and onboarding's multi-product build, and the
two answers ship very differently. Untouched deliberately.

## One claim to downgrade

**Treat row-level security as reviewed, not tested.** Every user table carries
`auth.uid() = user_id` and `0038`'s policy on `user_facts` correctly has both
`using` and `with check` — but that is read from the migration files. Nothing
executes a policy: `accounts.spec.ts` runs against a stub with no database in
the loop, so it proves the *client* keeps accounts apart and cannot prove that
account B is unable to read account A's rows. Closing that needs either a
Postgres-backed run against a local `supabase start`, or one manual pass with
three real accounts before launch.
