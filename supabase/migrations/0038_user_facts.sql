-- What the app remembers about you.
--
-- The "Something else" field in the reactions question stored `reactionsNote`
-- and nothing read it. This is where that text becomes memory: the assistant
-- reads it, and where the model can confidently map it onto something the app
-- already understands, the mapping is stored beside it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE LINE THAT RUNS THROUGH ALL OF THIS. A model's reading of free text may
-- inform what the assistant SAYS. It may never silently change a dose, a
-- schedule or a safety warning.
--
-- That is why `raw_text` and `summary` are separate columns and only the
-- validated ones are typed as arrays: `tags` is checked against the reaction
-- taxonomy the rules already use, and `ingredient_keys` is checked against
-- `ingredient_synonym` before insert. Anything the model proposes that does not
-- resolve is dropped rather than stored — an invented ingredient key reaching
-- recommend.ts would move somebody's schedule for a reason that does not exist.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_facts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  source          text not null check (source in ('onboarding_reaction', 'chat', 'manual')),
  -- verbatim, and never overwritten. The model's reading is a separate column
  -- precisely so the original survives a bad interpretation.
  raw_text        text not null,
  summary         text,
  tags            text[] not null default '{}',
  ingredient_keys text[] not null default '{}',
  confidence      numeric,
  -- null until the lazy interpretation runs; never during onboarding
  interpreted_at  timestamptz,
  -- set rather than deleted, so a dismissal is not silently undone by a
  -- re-interpretation of the same raw text
  dismissed_at    timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.user_facts is
  'Free text the user gave, plus the model''s validated reading of it. Informs what the assistant says; never changes a dose, a schedule or a safety warning on its own.';
comment on column public.user_facts.raw_text is
  'Exactly what the user typed. Never overwritten by an interpretation.';
comment on column public.user_facts.ingredient_keys is
  'Canonical keys only, validated against ingredient_synonym before insert. An unresolvable proposal is dropped, not stored.';

create index if not exists user_facts_user_created_idx
  on public.user_facts (user_id, created_at desc);

alter table public.user_facts enable row level security;

drop policy if exists "user_facts: own rows" on public.user_facts;
create policy "user_facts: own rows"
  on public.user_facts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/**
 * Keep only the ingredient keys that actually exist.
 *
 * Called by whatever writes an interpretation, so the validation cannot be
 * skipped by a caller that forgot. The model may propose "magnesium"; if it
 * proposes something resolving to no canonical key, it is dropped here.
 */
create or replace function public.validate_ingredient_keys(proposed text[])
returns text[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(distinct k), '{}')
  from unnest(coalesce(proposed, '{}')) as k
  where exists (select 1 from public.glossary_ingredient gi where gi.ingredient_key = k)
     or exists (select 1 from public.ingredient_synonym s where s.ingredient_key = k);
$$;

comment on function public.validate_ingredient_keys(text[]) is
  'Filters proposed ingredient keys down to ones the catalogue actually knows. An invented key never reaches the rules.';

grant execute on function public.validate_ingredient_keys(text[]) to authenticated;

/**
 * Enforce the validation at the table rather than trusting the writer.
 *
 * Tags are held to the taxonomy the rules already use; anything outside it is
 * kept as context but stripped from `tags`, because `tags` is the column
 * recommend.ts is allowed to read.
 */
create or replace function public.user_facts_validate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  /* Kept in step with FACT_TAGS in supabase/functions/ask/memory.ts. 'other'
     is in the list so a medical note stays marked as one — the assistant may
     mention it, and nothing in recommend.ts reads 'other', so marking it costs
     nothing and losing the marker would make a medical note indistinguishable
     from an uninterpreted one. */
  known_tags text[] := array[
    'iron-gi', 'mag-gi', 'fishoil-burp', 'niacin-flush', 'large-caps',
    'zinc-nausea', 'other'
  ];
begin
  new.ingredient_keys := public.validate_ingredient_keys(new.ingredient_keys);

  select coalesce(array_agg(t), '{}') into new.tags
  from unnest(coalesce(new.tags, '{}')) as t
  where t = any(known_tags);

  /* Below 0.6 the model is guessing. The row is still stored — the raw text is
     worth keeping either way — but it carries no tags, so nothing downstream
     can act on a guess. */
  if new.confidence is not null and new.confidence < 0.6 then
    new.tags := '{}';
  end if;

  return new;
end;
$$;

drop trigger if exists user_facts_validate_trigger on public.user_facts;
create trigger user_facts_validate_trigger
  before insert or update on public.user_facts
  for each row execute function public.user_facts_validate();
