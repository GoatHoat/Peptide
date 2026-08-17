/**
 * Which six articles a free account can read.
 *
 * Its own module because it is a pure function of the catalogue and nothing
 * else — `entitlements.tsx` reaches the Supabase client, which does not exist
 * in Node, and this is worth unit testing without a browser. Same split as
 * `notificationCopy.ts`. `entitlements.tsx` re-exports both names.
 */

/**
 * The six articles a free account can read, and the only six.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY PATTERNS AND NOT SLUGS. Hard-coding six branded slugs means a free slot
 * disappears silently the day one of those rows is renamed or replaced — the
 * catalogue is 304 filings and it moves. Each pattern resolves to the first
 * match in name order, so the set is always six as long as the catalogue holds
 * a magnesium, a zinc and a vitamin D at all.
 *
 * WHY NOT `free_rank`. That column arrives with migration 0037, which is not
 * applied. Anything depending on it is off until it is, and "which articles are
 * free" is not a thing that should wait on a migration.
 *
 * Three of each kind, the most-looked-up in both: the peptides people arrive
 * having already heard of, and the three minerals with the most published
 * reference data behind them.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const FREE_ARTICLES = {
  /** matched against the slug, which for these is the compound itself */
  peptide: [/^bpc-157$/i, /^tb-500$/i, /^ipamorelin$/i],
  /** matched against the product name, first in name order wins */
  supplement: [/magnesium/i, /zinc/i, /vitamin d/i],
} as const;

/**
 * The exact slugs that are free, resolved against the catalogue in hand.
 *
 * Deterministic: the caller passes rows already ordered by name, and each
 * pattern takes the first row it has not already claimed, so two patterns
 * cannot resolve to the same product and the set is stable between renders.
 */
export function freeSlugs(
  entries: { slug: string; name: string; kind?: string | null }[],
): Set<string> {
  const out = new Set<string>();
  for (const [kind, patterns] of Object.entries(FREE_ARTICLES)) {
    const pool = entries.filter((e) =>
      kind === 'peptide' ? e.kind === 'peptide' : e.kind !== 'peptide',
    );
    for (const re of patterns) {
      const hit = pool.find(
        (e) => !out.has(e.slug) && (re.test(e.slug) || re.test(e.name)),
      );
      if (hit) out.add(hit.slug);
    }
  }
  return out;
}
