-- Free-text goal matching — no LLM, no external API, no cost. Postgres
-- full-text search + trigram similarity + a curated synonym table, matched
-- only against the existing categorical glossary fields. Output is always a
-- filtered list of existing entries — never a generated answer, ranking by
-- effectiveness, or compatibility/side-effect judgment. See legal.md.

create extension if not exists pg_trgm;

create table public.goal_synonyms (
  phrase text primary key,
  expands_to text[] not null
);

-- Editorial, not exhaustive — covers common phrasings that wouldn't
-- literally appear in the categorical text (e.g. nobody's entry says
-- "height", but Growth-category entries are what that phrase means here).
insert into public.goal_synonyms (phrase, expands_to) values
  ('height', array['growth']),
  ('taller', array['growth']),
  ('height maxing', array['growth']),
  ('get taller', array['growth']),
  ('grow taller', array['growth']),
  ('bigger muscles', array['Muscle', 'growth']),
  ('bulk up', array['Muscle', 'growth']),
  ('build muscle', array['Muscle', 'growth']),
  -- Bare category names deliberately omitted below (past a certain point) —
  -- expanding to the whole category dumped unrelated entries, e.g.
  -- "tanning" -> cosmetic matched wrinkle-cream peptides with zero
  -- connection to tanning. Precision comes from the specific tag instead;
  -- see migration 0008 for the search_keywords that actually catch these.
  ('anti aging', array['Anti-Aging']),
  ('look younger', array['Anti-Aging']),
  ('clear skin', array['Skin']),
  ('wrinkles', array['Skin', 'Anti-Aging']),
  ('gut issues', array['Gut Health']),
  ('digestion', array['Gut Health']),
  ('immune system', array['Immune']),
  ('getting sick', array['Immune']),
  ('anxiety', array['Mood']),
  ('stress', array['Mood']),
  ('brain fog', array['Focus', 'cognitive']),
  ('concentration', array['Focus', 'cognitive']),
  ('memory', array['Focus', 'cognitive']),
  ('sleep better', array['Sleep']),
  ('insomnia', array['Sleep']),
  ('injury recovery', array['Recovery', 'Injury']),
  ('heal faster', array['Recovery', 'Injury']),
  ('joint pain', array['Joint']),
  ('weight loss', array['Metabolism']),
  ('metabolism', array['Metabolism']),
  -- Single common words that came up in real use and were missing —
  -- longer phrases don't cover their own short forms as substrings.
  ('tall', array['growth']),
  ('young', array['Anti-Aging']),
  ('sad', array['Mood']),
  ('strong', array['Muscle', 'growth']),
  ('bulky', array['Muscle', 'growth']),
  ('cut', array['Muscle', 'growth']),
  ('shred', array['Muscle', 'growth']),
  ('old', array['Anti-Aging']),
  ('wrinkly', array['Skin', 'Anti-Aging']),
  ('recall', array['Focus', 'cognitive']);
  -- 'bronze' deliberately NOT here — Skin tag is shared by all 5 cosmetic
  -- entries, so it dumped wrinkle-cream peptides the same way 'tanning'
  -- originally did. Handled as a search_keyword on Melanotan II instead.

create or replace function public.match_goal(query_text text)
returns setof public.glossary
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  expanded text := lower(query_text);
  syn record;
begin
  if length(trim(query_text)) < 2 then
    return;
  end if;

  for syn in
    select expands_to from public.goal_synonyms where lower(query_text) ilike '%' || phrase || '%'
  loop
    expanded := expanded || ' ' || lower(array_to_string(syn.expands_to, ' '));
  end loop;

  return query
  select g.*
  from public.glossary g
  where
    to_tsvector(
      'english',
      g.name || ' ' || g.category || ' ' || coalesce(g.mechanism_summary, '') || ' ' ||
      coalesce(g.research_summary, '') || ' ' || array_to_string(g.goal_tags, ' ')
    ) @@ websearch_to_tsquery('english', expanded)
    or g.name ilike '%' || query_text || '%'
    or expanded ilike '%' || lower(g.category::text) || '%'
    or exists (select 1 from unnest(g.goal_tags) t where expanded ilike '%' || lower(t) || '%')
    or similarity(g.name, query_text) > 0.3
  order by
    ts_rank(
      to_tsvector(
        'english',
        g.name || ' ' || g.category || ' ' || coalesce(g.mechanism_summary, '') || ' ' ||
        coalesce(g.research_summary, '') || ' ' || array_to_string(g.goal_tags, ' ')
      ),
      websearch_to_tsquery('english', expanded)
    ) desc,
    g.name;
end;
$$;

grant execute on function public.match_goal(text) to authenticated;

-- goal_synonyms is editorial content, same read model as glossary itself.
alter table public.goal_synonyms enable row level security;
create policy "goal_synonyms: public read"
  on public.goal_synonyms for select
  using (true);
