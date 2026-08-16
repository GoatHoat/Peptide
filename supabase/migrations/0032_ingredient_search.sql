-- Ingredient-aware search, and the abstract column it needs.
--
-- Searching "zinc" returns only products with zinc in the title, which is a
-- fraction of the products containing zinc. `search_by_ingredient` resolves the
-- query through the synonym dictionary and joins the panel instead, so the
-- multivitamin carrying 15 mg of it is found by the word.
--
-- TWO SECTIONS, NOT ONE LIST. PROMPT_V3.md section 2 asks for products *for*
-- the ingredient separated from products that merely *contain* it, and asks
-- that the first section require the ingredient to appear in one of the
-- product's five citations. That article test is applied only to the first
-- section, deliberately: a 25-ingredient multivitamin has five papers about
-- multivitamins and none about its 8 mg of zinc, so using it as a filter would
-- hide exactly the products whose hidden ingredients cause the interactions
-- this whole feature exists to catch. They belong in section two, not nowhere.
--
--   section 1 "Products for zinc"     is_primary and the ingredient is named in
--                                     a citation title or abstract
--   section 2 "Also contains zinc"    everything else, amount shown
--
-- Both sorted by amount descending, nulls last — a product that does not say
-- how much cannot be ranked above one that does.

-- The article test needs the citation text searchable. Title is already stored;
-- abstract comes from the same PubMed esummary call that fetched the rest.
alter table public.glossary_research
  add column if not exists abstract text;

comment on column public.glossary_research.abstract is
  'Populated from PubMed. Searched alongside title to decide whether a paper is actually about a given ingredient.';

create index if not exists glossary_research_text_idx
  on public.glossary_research using gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, ''))
  );

/**
 * Every product containing `query_text`, in two sections.
 *
 * `section` is 1 for "products for this" and 2 for "also contains this".
 * Returns no rows when the query does not resolve to an ingredient, which the
 * caller reads as "not an ingredient search" and falls back to name matching.
 */
create or replace function public.search_by_ingredient(query_text text)
returns table (
  section     integer,
  glossary_id uuid,
  slug        text,
  name        text,
  brand       text,
  kind        text,
  evidence    text,
  product_form text,
  amount      numeric,
  unit        text,
  raw_name    text
)
language sql
stable
set search_path = public
as $$
  with key as (
    select public.resolve_ingredient_key(query_text) as k
  ),
  -- the printed names this key goes by, for the citation text search
  words as (
    select distinct s.synonym as w
    from public.ingredient_synonym s, key
    where s.ingredient_key = key.k
    union
    select key.k from key
  ),
  hits as (
    select
      gi.glossary_id,
      gi.is_primary,
      gi.amount,
      gi.unit,
      gi.raw_name,
      row_number() over (
        partition by gi.glossary_id order by gi.is_primary desc, gi.amount desc nulls last
      ) as rn
    from public.glossary_ingredient gi, key
    where key.k is not null and gi.ingredient_key = key.k
  ),
  -- does any of this product's papers actually name the ingredient?
  cited as (
    select distinct r.glossary_id
    from public.glossary_research r
    where exists (
      select 1 from words
      where coalesce(r.title, '') || ' ' || coalesce(r.abstract, '') ilike '%' || words.w || '%'
    )
  )
  select
    case when h.is_primary and c.glossary_id is not null then 1 else 2 end as section,
    g.id, g.slug, g.name, g.brand, g.kind, g.evidence, g.product_form,
    h.amount, h.unit, h.raw_name
  from hits h
  join public.glossary g on g.id = h.glossary_id
  left join cited c on c.glossary_id = h.glossary_id
  where h.rn = 1
    -- peptides are reference only and never rank in a product search
    and coalesce(g.kind, 'peptide') = 'supplement'
  order by section, h.amount desc nulls last, g.name;
$$;

comment on function public.search_by_ingredient(text) is
  'Products containing an ingredient, split into "for this" (section 1) and "also contains" (section 2). Empty when the query is not an ingredient.';

grant execute on function public.search_by_ingredient(text) to anon, authenticated;
