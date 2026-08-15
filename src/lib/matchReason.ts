import type { GlossaryEntry, GoalSynonym } from './api';

export type MatchReason = { type: 'keyword'; keyword: string } | { type: 'tag'; tags: string[] };

/**
 * Mirrors match_goal()'s three matching paths (name substring, per-peptide
 * search_keywords, goal_synonyms tag expansion) purely to explain *why* a
 * result matched, per entry — a keyword match on one result can be totally
 * different from another's, so this can't be computed once for the whole
 * list the way the tag-level explanation can. Returns null for an obvious
 * name match or a full-text/trigram-only match with no crisp one-line
 * reason — better to show nothing than to fabricate an explanation.
 */
export function computeMatchReason(
  entry: GlossaryEntry,
  query: string,
  synonyms: GoalSynonym[],
): MatchReason | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (entry.name.toLowerCase().includes(q)) return null;

  // Two directions, both real: the query can contain a full keyword phrase
  // ("peptide for joint pain" contains the keyword "joint pain"), or a
  // shorter query's words can all appear inside a longer keyword phrase
  // ("botox alternative" inside the keyword "botox alternative peptide") —
  // the second is how full-text search actually finds these server-side,
  // so the explanation needs to cover it too, not just the substring case.
  const queryWords = q.split(/\s+/).filter(Boolean);
  const matchingKeywords = entry.search_keywords.filter((k) => {
    const kLower = k.toLowerCase();
    return q.includes(kLower) || queryWords.every((w) => kLower.includes(w));
  });
  if (matchingKeywords.length > 0) {
    const best = matchingKeywords.reduce((a, b) => (b.length > a.length ? b : a));
    return { type: 'keyword', keyword: best };
  }

  const expandedTags = new Set<string>();
  for (const syn of synonyms) {
    if (q.includes(syn.phrase)) syn.expands_to.forEach((t) => expandedTags.add(t));
  }
  const relevantTags = Array.from(expandedTags).filter(
    (t) =>
      t.toLowerCase() === entry.category.toLowerCase() ||
      entry.goal_tags.some((g) => g.toLowerCase() === t.toLowerCase()),
  );
  if (relevantTags.length > 0) return { type: 'tag', tags: relevantTags };

  return null;
}
