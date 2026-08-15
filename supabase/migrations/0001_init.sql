-- Halfpast initial schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query),
-- or via `supabase db push` if you set up the CLI later.
--
-- Layering follows legal.md: `glossary`/`glossary_research` are app-authored,
-- categorical-only reference data (public read, no user-specific numbers).
-- `stacks`/`stack_items`/`doses` are entirely user-authored data the app just
-- stores and displays back — the app never populates or suggests values in them.

create extension if not exists "pgcrypto";

-- ============================================================================
-- profiles — one row per auth.users row, holds app-specific settings
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  notifications_per_day integer not null default 3,
  reduce_motion boolean not null default false,
  larger_text boolean not null default false,
  subscription_tier text not null default 'free',
  blood_test_reminder boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profiles are created automatically on signup (trigger below), so no insert
-- policy for end users — inserts happen as the trigger owner, not the client.

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- glossary — app-authored reference data. Categorical only, never dosing.
-- ============================================================================

create table public.glossary (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('healing', 'growth', 'cosmetic', 'cognitive', 'other')),
  mechanism_summary text,
  storage_notes text,
  route text not null check (route in ('injected', 'oral', 'topical')),
  research_summary text,
  created_at timestamptz not null default now()
);

alter table public.glossary enable row level security;

-- public reference data: anyone (including logged-out users) can read
create policy "glossary: public read"
  on public.glossary for select
  using (true);

-- no insert/update/delete policy for regular users — glossary content is
-- managed by you (via the Supabase dashboard or service-role key), not by users.

create table public.glossary_research (
  id uuid primary key default gen_random_uuid(),
  glossary_id uuid not null references public.glossary (id) on delete cascade,
  title text not null,
  meta text,
  url text,
  created_at timestamptz not null default now()
);

alter table public.glossary_research enable row level security;

create policy "glossary_research: public read"
  on public.glossary_research for select
  using (true);

-- ============================================================================
-- stacks — user-named collections of glossary entries they're tracking
-- ============================================================================

create table public.stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.stacks enable row level security;

create policy "stacks: manage own"
  on public.stacks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.stack_items (
  id uuid primary key default gen_random_uuid(),
  stack_id uuid not null references public.stacks (id) on delete cascade,
  glossary_id uuid not null references public.glossary (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.stack_items enable row level security;

create policy "stack_items: manage via owning stack"
  on public.stack_items for all
  using (exists (
    select 1 from public.stacks
    where stacks.id = stack_items.stack_id
      and stacks.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.stacks
    where stacks.id = stack_items.stack_id
      and stacks.user_id = auth.uid()
  ));

-- ============================================================================
-- doses — user's own logged entries. The app has no opinion on these values;
-- it only stores and displays back what the user typed in.
-- ============================================================================

create table public.doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  glossary_id uuid references public.glossary (id) on delete set null,
  name text not null,
  amount text not null,
  log_date date not null default current_date,
  scheduled_time time,
  taken boolean not null default false,
  taken_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.doses enable row level security;

create policy "doses: manage own"
  on public.doses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index doses_user_log_date_idx on public.doses (user_id, log_date);
