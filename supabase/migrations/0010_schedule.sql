-- Recurring schedule: the user sets a peptide + their own amount + time
-- ONCE, and it shows up as a checkbox every day going forward until they
-- remove it — instead of retyping the same entry daily. The amount and
-- frequency are still entirely user-authored; only the app's job (remember
-- what you said, ask once a day if you did it) changed, not who originates
-- the number. See legal.md — the boundary is about authorship, not re-entry.

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  glossary_id uuid references public.glossary (id) on delete set null,
  name text not null,
  amount text not null,
  scheduled_time time,
  injection_site text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.schedule_items enable row level security;

create policy "schedule_items: manage own"
  on public.schedule_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.doses
  add column schedule_item_id uuid references public.schedule_items (id) on delete set null;

create index doses_schedule_item_date_idx on public.doses (schedule_item_id, log_date);
