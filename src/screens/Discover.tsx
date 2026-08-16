import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { Tabs } from '../components/Tabs';
import { GlossaryDetail } from './GlossaryDetail';
import { AddSchedule } from './AddSchedule';
import { ProductRow } from './DiscoverList';
import { AskAI } from './AskAI';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import {
  addToStack,
  getGoalSynonyms,
  getNutrientReference,
  getStackMembership,
  listGlossary,
  matchGoal,
  type GlossaryEntry,
  type GoalSynonym,
  type NutrientReference,
} from '../lib/api';
import { computeMatchReason } from '../lib/matchReason';
import { IconMenu, IconSearch } from '../components/Icons';

const CATEGORY_LABEL: Record<string, string> = {
  healing: 'Healing',
  growth: 'Growth',
  cosmetic: 'Cosmetic',
  cognitive: 'Cognitive',
  other: 'Other',
};

const TABS = [
  { id: 'ask', label: 'Ask AI' },
  { id: 'peptide', label: 'Peptides' },
  { id: 'supplement', label: 'Vitamins & Minerals' },
];

export function Discover() {
  const { user } = useAuth();
  const { profile, save } = usePrefs();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inStackIds, setInStackIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [detailEntry, setDetailEntry] = useState<GlossaryEntry | null>(null);
  const [schedulingEntry, setSchedulingEntry] = useState<GlossaryEntry | null>(null);
  const [synonyms, setSynonyms] = useState<GoalSynonym[]>([]);
  const [refs, setRefs] = useState<Record<string, NutrientReference[]>>({});
  /** one row open at a time; its card renders underneath it */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  /** set when a product's Ask a question button is pressed */
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [goAsk, setGoAsk] = useState(0);

  useEffect(() => {
    getGoalSynonyms().then(setSynonyms);
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      // 200 rather than the default 8 — the list is the whole library now
      const fetcher = query.trim() ? matchGoal(query.trim()) : listGlossary(200);
      fetcher.then((r) => {
        setResults(r);
        setLoading(false);
      });
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (results.length === 0) return;
    getNutrientReference(results.map((r) => r.id)).then((m) =>
      setRefs((prev) => ({ ...prev, ...m })),
    );
  }, [results]);

  useEffect(() => {
    if (!user || results.length === 0) {
      setInStackIds(new Set());
      return;
    }
    getStackMembership(
      user.id,
      results.map((r) => r.id),
    ).then(setInStackIds);
  }, [results, user?.id]);

  const handleAddToStack = async (entry: GlossaryEntry) => {
    if (!user || inStackIds.has(entry.id) || addingIds.has(entry.id)) return;
    setAddingIds((prev) => new Set(prev).add(entry.id));
    try {
      await addToStack(user.id, entry.id);
      setInStackIds((prev) => new Set(prev).add(entry.id));
      /* Peptides go in the stack as a reference, never onto a schedule with an
         amount attached — the same split the tabs exist to express. */
      if ((entry.kind ?? 'peptide') === 'supplement') setSchedulingEntry(entry);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const top = results[0] ?? null;
  const topReason = top ? computeMatchReason(top, query, synonyms) : null;
  const detailReason = detailEntry ? computeMatchReason(detailEntry, query, synonyms) : null;

  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">Discover</h1>
        <div className="screen-sub t-body">Glossary · Research</div>
      </div>

      <Tabs
        tabs={TABS}
        storageKey="pepstack.discover.tab"
        defaultId="supplement"
        jumpTo={goAsk}
        jumpToIndex={0}
      >
        {(tab) => {
          if (tab.id === 'ask') {
            return <AskAI seed={askSeed} onSeedUsed={() => setAskSeed(null)} />;
          }

          /* Nothing carried a kind before migration 0016, so an unset value
             reads as a peptide — which is what every earlier entry is. */
          const shown = results.filter((r) => (r.kind ?? 'peptide') === tab.id);

          return (
            <div>
              {tab.id === 'peptide' && (
                <p className="tab-note t-caption">
                  Reference only. These are not over-the-counter supplements and Pepstack does not
                  recommend doses for them.
                </p>
              )}

              {/* Free-text match against the existing catalogue (lib/api matchGoal).
                  Never a generated answer — always a filtered list of real entries. */}
              <div className="search">
                <span style={{ color: 'var(--t3)', display: 'flex' }}>
                  <IconMenu />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a product, or describe your goal"
                  spellCheck={false}
                />
                <span style={{ color: 'var(--t3)', display: 'flex' }}>
                  <IconSearch />
                </span>
              </div>

              {topReason && query.trim() && (
                <div className="match-context t-caption" style={{ marginTop: 10 }}>
                  {topReason.type === 'keyword'
                    ? `Matched "${query.trim()}" via: "${topReason.keyword}"`
                    : `Understood "${query.trim()}" as related to: ${topReason.tags
                        .map((t) => CATEGORY_LABEL[t] ?? t)
                        .join(', ')}`}
                </div>
              )}

              {loading && (
                <div className="empty-state t-body" style={{ marginTop: 24 }}>
                  Loading…
                </div>
              )}

              {!loading && shown.length === 0 && (
                <div className="empty-state t-body" style={{ marginTop: 24 }}>
                  {query.trim() ? `Nothing here matches "${query.trim()}" yet.` : 'Nothing here yet.'}
                </div>
              )}

              <div className="prod-list">
                <span className="rail" />
                {shown.map((r) => (
                  <ProductRow
                    key={r.id}
                    entry={r}
                    refs={refs[r.id]}
                    age={profile?.age}
                    sex={profile?.sex}
                    menstruates={profile?.menstruates}
                    inStack={inStackIds.has(r.id)}
                    adding={addingIds.has(r.id)}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                    onAdd={() => handleAddToStack(r)}
                    onAsk={() => {
                      setAskSeed(`I have a question about ${r.name}. `);
                      setGoAsk((n) => n + 1);
                    }}
                    onAllArticles={() => setDetailEntry(r)}
                    /* `save` updates the profile in memory before it writes,
                       so the figure changes on the tap. The catch is for the
                       window before migration 0019 is applied, where the
                       column does not exist yet: the answer holds for the
                       session and the failed write takes nothing with it. */
                    onMenstruates={(value) => {
                      save({ menstruates: value }).catch(() => {});
                    }}
                  />
                ))}
              </div>
            </div>
          );
        }}
      </Tabs>

      <Sheet open={!!detailEntry} onClose={() => setDetailEntry(null)} title={detailEntry?.name ?? ''}>
        {detailEntry && (
          <GlossaryDetail
            entry={detailEntry}
            matchContext={detailReason ? { query: query.trim(), reason: detailReason } : undefined}
          />
        )}
      </Sheet>

      <Sheet open={!!schedulingEntry} onClose={() => setSchedulingEntry(null)} title="Add to Schedule">
        {schedulingEntry && user && (
          <AddSchedule
            userId={user.id}
            glossaryId={schedulingEntry.id}
            defaultName={schedulingEntry.name}
            onAdded={() => setSchedulingEntry(null)}
            onClose={() => setSchedulingEntry(null)}
          />
        )}
      </Sheet>
    </>
  );
}
