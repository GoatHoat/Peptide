-- Ingredients as first-class data.
--
-- THE PROBLEM THIS SOLVES. `src/lib/conflicts.ts` matches interaction rules by
-- substring against the product name. That works for "Thorne Zinc Picolinate
-- 30 mg" and is completely blind to "Thorne Basic Nutrients 2/Day", which
-- contains zinc, iron and calcium and whose name says none of them. The
-- scheduler places that multivitamin next to an iron capsule and reports no
-- conflict, which is the exact case the conflict feature exists for.
--
-- The branded catalogue makes it worse rather than better: "Nobi Nutrition
-- Sambucus Elderberry" carries less usable information in its name than the
-- generic slug it replaced.
--
-- The same gap breaks search. Someone typing "zinc" sees only products with
-- zinc in the title, which is a small fraction of the products containing it.
--
-- Two tables fix both, and everything downstream — the solver in
-- PROMPT_V2.md section 4, ingredient search, the stacking upper-limit check —
-- reads from them.

-- ---------------------------------------------------------------- ingredients

create table if not exists public.glossary_ingredient (
  id             uuid primary key default gen_random_uuid(),
  glossary_id    uuid not null references public.glossary (id) on delete cascade,
  -- canonical key: 'zinc', 'vitamin-d', 'iron'. Null where the raw string could
  -- not be confidently mapped — those rows stay searchable by raw_name and are
  -- deliberately excluded from conflict rules rather than guessed at.
  ingredient_key text,
  raw_name       text not null,          -- as printed: 'Zinc (as zinc picolinate)'
  amount         numeric,
  unit           text,
  is_primary     boolean not null default false,
  position       integer,                -- order on the label panel
  unique (glossary_id, raw_name)
);

comment on table public.glossary_ingredient is
  'The supplement facts panel for each product, from its DSLD filing. Excipients and capsule shells are excluded. is_primary marks what the product exists to deliver.';
comment on column public.glossary_ingredient.ingredient_key is
  'Canonical key, or null where the raw string could not be mapped. Null rows are searchable but never participate in conflict rules.';

create index if not exists glossary_ingredient_key_idx
  on public.glossary_ingredient (ingredient_key);
create index if not exists glossary_ingredient_glossary_idx
  on public.glossary_ingredient (glossary_id);
-- the search path: key -> every product carrying it, primary ones first
create index if not exists glossary_ingredient_key_primary_idx
  on public.glossary_ingredient (ingredient_key, is_primary desc, amount desc nulls last);

alter table public.glossary_ingredient enable row level security;

drop policy if exists "glossary_ingredient: public read" on public.glossary_ingredient;
create policy "glossary_ingredient: public read"
  on public.glossary_ingredient for select using (true);

-- ------------------------------------------------------------------ synonyms

-- The half that makes it work. A label says Cholecalciferol; a user types
-- vitamin D. A label says Ascorbic Acid; a user types vitamin C. Without this
-- the ingredient table is only as useful as the words the manufacturer chose.
create table if not exists public.ingredient_synonym (
  id             uuid primary key default gen_random_uuid(),
  ingredient_key text not null,
  synonym        text not null,
  unique (synonym)
);

comment on table public.ingredient_synonym is
  'Maps printed and colloquial ingredient names onto canonical keys. Seeded from the raw strings actually present on the catalogue''s labels, not from a generic list.';

create index if not exists ingredient_synonym_synonym_idx
  on public.ingredient_synonym (synonym);
create index if not exists ingredient_synonym_key_idx
  on public.ingredient_synonym (ingredient_key);

alter table public.ingredient_synonym enable row level security;

drop policy if exists "ingredient_synonym: public read" on public.ingredient_synonym;
create policy "ingredient_synonym: public read"
  on public.ingredient_synonym for select using (true);

-- ------------------------------------------------------------------- lookup

/**
 * Resolve a typed query to a canonical ingredient key.
 *
 * Tries the synonym table first, then the key itself, so both "cholecalciferol"
 * and "vitamin-d" land on 'vitamin-d'. Returns null when nothing matches, which
 * the caller reads as "this was not an ingredient search" and falls back to
 * name and keyword matching.
 */
create or replace function public.resolve_ingredient_key(query_text text)
returns text
language sql
stable
set search_path = public
as $$
  with q as (select lower(btrim(coalesce(query_text, ''))) as t)
  select coalesce(
    (select s.ingredient_key from public.ingredient_synonym s, q
      where lower(s.synonym) = q.t limit 1),
    (select i.ingredient_key from public.glossary_ingredient i, q
      where i.ingredient_key = q.t limit 1)
  );
$$;

comment on function public.resolve_ingredient_key(text) is
  'Typed query -> canonical ingredient key, via the synonym dictionary. Null when the query is not an ingredient.';

grant execute on function public.resolve_ingredient_key(text) to anon, authenticated;
