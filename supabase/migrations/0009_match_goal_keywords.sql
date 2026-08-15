-- Fold search_keywords into match_goal: into the full-text document (so
-- multi-word combos benefit from search) and as a direct substring check
-- (so "peptide for height" still matches on "height" despite the extra
-- words around it, since AND-based full-text matching alone would fail
-- when "peptide"/"for" aren't in the document).

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
      coalesce(g.research_summary, '') || ' ' || array_to_string(g.goal_tags, ' ') || ' ' ||
      array_to_string(g.search_keywords, ' ')
    ) @@ websearch_to_tsquery('english', expanded)
    or g.name ilike '%' || query_text || '%'
    or expanded ilike '%' || lower(g.category::text) || '%'
    or exists (select 1 from unnest(g.goal_tags) t where expanded ilike '%' || lower(t) || '%')
    or exists (select 1 from unnest(g.search_keywords) k where lower(query_text) ilike '%' || lower(k) || '%')
    or similarity(g.name, query_text) > 0.3
  order by
    ts_rank(
      to_tsvector(
        'english',
        g.name || ' ' || g.category || ' ' || coalesce(g.mechanism_summary, '') || ' ' ||
        coalesce(g.research_summary, '') || ' ' || array_to_string(g.goal_tags, ' ') || ' ' ||
        array_to_string(g.search_keywords, ' ')
      ),
      websearch_to_tsquery('english', expanded)
    ) desc,
    g.name;
end;
$$;
