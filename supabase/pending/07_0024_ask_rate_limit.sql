-- One row per question put to the `ask` edge function. It exists for one
-- reason: the function refuses to call a paid model without first counting
-- what this person has already asked today.
--
-- The limits live in `supabase/functions/ask/lib.ts` (15 an hour, 50 a day)
-- rather than here, because they are a product decision and changing them
-- should not need a migration. Both windows are rolling — a fixed hourly
-- bucket lets someone spend a whole allowance twice across the boundary.
--
-- WHY NOT THE SERVICE ROLE. The function runs on the caller's own JWT and the
-- anon key, so these rows are written under RLS like everything else. That has
-- one honest consequence: a determined person with their own access token can
-- insert rows here directly. They can only ever make their own limit tighter —
-- there is no update or delete policy, so a count cannot be cleared from the
-- client, which is the direction that would matter. Holding a service-role key
-- inside the function to close the remaining gap costs more than it buys.
--
-- HOUSEKEEPING. Nothing prunes this table. Rows older than a day are read by
-- nothing, so a scheduled delete is worth adding — that is a decision about
-- extensions and cron on a live project, not something to switch on from here.

create table if not exists public.ask_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.ask_usage is
  'One row per question asked of the ask function. Read for the rolling rate limit and nothing else.';

alter table public.ask_usage enable row level security;

-- The only query the function runs against this table is "my rows, since a
-- point in time".
create index if not exists ask_usage_user_created_idx
  on public.ask_usage (user_id, created_at desc);

drop policy if exists "ask_usage: insert own" on public.ask_usage;
create policy "ask_usage: insert own"
  on public.ask_usage for insert
  with check (auth.uid() = user_id);

drop policy if exists "ask_usage: select own" on public.ask_usage;
create policy "ask_usage: select own"
  on public.ask_usage for select
  using (auth.uid() = user_id);

-- No update and no delete policy, deliberately. See the note above.
