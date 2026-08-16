-- Peptides carry no dose and no timing, enforced by the database.
--
-- CLAUDE.md: "Peptides are a reference library only: no doses, no
-- recommendations, no ranking, no injection-related UI or questions anywhere in
-- the product." legal.md records that app-sourced dosing for these compounds is
-- what got the first version rejected. PROMPT_V2.md section 3 asks for it to be
-- enforced in code rather than in copy.
--
-- The client already refuses to render or schedule them. This is the layer
-- under that, because a UI rule is one careless conditional away from being
-- untrue, and the rows outlive any particular screen.
--
-- WHAT IS CONSTRAINED. `timing` and `timing_note` must be null on a peptide
-- row. A reference intake must not join to one. The columns PROMPT_V2.md
-- section 1 will add — serving_amount, studied_low, studied_high — are not
-- constrained here because they do not exist yet; extend this check in the
-- migration that adds them.
--
-- WHY A TRIGGER AND NOT A CHECK CONSTRAINT. A check constraint on `glossary`
-- alone cannot see `nutrient_reference`, and splitting the rule across two
-- mechanisms would leave the important half unenforced.

-- 1. No peptide row may carry timing.
update public.glossary
set timing = null, timing_note = null
where kind = 'peptide' and (timing is not null or timing_note is not null);

alter table public.glossary
  drop constraint if exists glossary_peptides_have_no_timing;
alter table public.glossary
  add constraint glossary_peptides_have_no_timing
  check (kind <> 'peptide' or (timing is null and timing_note is null));

-- 2. No reference intake may point at a peptide.
delete from public.nutrient_reference nr
using public.glossary g
where nr.glossary_id = g.id and g.kind = 'peptide';

create or replace function public.nutrient_reference_rejects_peptides()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.glossary g
    where g.id = new.glossary_id and g.kind = 'peptide'
  ) then
    raise exception
      'nutrient_reference: % is a peptide and cannot carry a reference intake',
      new.glossary_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists nutrient_reference_no_peptides on public.nutrient_reference;
create trigger nutrient_reference_no_peptides
  before insert or update on public.nutrient_reference
  for each row execute function public.nutrient_reference_rejects_peptides();

-- 3. Nothing may schedule a peptide. The client refuses first; this is what
--    makes it true rather than merely usual.
create or replace function public.schedule_items_reject_peptides()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.glossary_id is not null and exists (
    select 1 from public.glossary g
    where g.id = new.glossary_id and g.kind = 'peptide'
  ) then
    raise exception
      'schedule_items: peptides are reference only and cannot be scheduled'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_items_no_peptides on public.schedule_items;
create trigger schedule_items_no_peptides
  before insert or update on public.schedule_items
  for each row execute function public.schedule_items_reject_peptides();

do $$
declare
  bad integer;
begin
  select count(*) into bad
  from public.glossary
  where kind = 'peptide' and (timing is not null or timing_note is not null);
  raise notice 'peptides carrying timing after cleanup: %', bad;

  select count(*) into bad
  from public.schedule_items s
  join public.glossary g on g.id = s.glossary_id
  where g.kind = 'peptide';
  if bad > 0 then
    -- Pre-existing rows are left alone rather than deleted: they are a user's
    -- own data and removing them silently is worse than reporting them.
    raise warning
      '% scheduled item(s) already point at a peptide. The trigger blocks new ones; these need a decision.',
      bad;
  end if;
end $$;
