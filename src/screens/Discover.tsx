import { useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { GlossaryDetail } from './GlossaryDetail';
import { AddSchedule } from './AddSchedule';
import { useAuth } from '../lib/auth';
import {
  addToStack,
  getGoalSynonyms,
  getStackMembership,
  listGlossary,
  matchGoal,
  type GlossaryEntry,
  type GoalSynonym,
} from '../lib/api';
import { computeMatchReason } from '../lib/matchReason';
import {
  IconCheck,
  IconChat,
  IconChevron,
  IconClock,
  IconDoc,
  IconPerson,
  IconMenu,
  IconPlus,
  IconSearch,
} from '../components/Icons';

const CATEGORY_LABEL: Record<string, string> = {
  healing: 'Healing',
  growth: 'Growth',
  cosmetic: 'Cosmetic',
  cognitive: 'Cognitive',
  other: 'Other',
};

export function Discover() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inStackIds, setInStackIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [detailEntry, setDetailEntry] = useState<GlossaryEntry | null>(null);
  const [justAdded, setJustAdded] = useState<GlossaryEntry | null>(null);
  const [schedulingEntry, setSchedulingEntry] = useState<GlossaryEntry | null>(null);
  const [synonyms, setSynonyms] = useState<GoalSynonym[]>([]);

  useEffect(() => {
    getGoalSynonyms().then(setSynonyms);
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      const fetcher = query.trim() ? matchGoal(query.trim()) : listGlossary();
      fetcher.then((r) => {
        setResults(r);
        setLoading(false);
      });
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const top = results[0] ?? null;
  const rest = results.slice(1);
  const topReason = top ? computeMatchReason(top, query, synonyms) : null;
  const detailReason = detailEntry ? computeMatchReason(detailEntry, query, synonyms) : null;

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
      setJustAdded(entry);
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">Discover</h1>
        <div className="screen-sub t-body">Glossary · Research</div>
      </div>

      {/* Free-text match against the existing catalog (see src/lib/api.ts
          matchGoal). Never a generated answer — always a filtered list of
          entries that already exist, with their existing categorical info. */}
      <div className="search">
        <span style={{ color: 'var(--t3)', display: 'flex' }}>
          <IconMenu />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a peptide, or describe your goal"
          spellCheck={false}
        />
        <span style={{ color: 'var(--t3)', display: 'flex' }}>
          <IconSearch />
        </span>
      </div>

      {topReason && (
        <div className="match-context t-caption" style={{ marginTop: 10 }}>
          {topReason.type === 'keyword'
            ? `Matched "${query.trim()}" via: "${topReason.keyword}"`
            : `Understood "${query.trim()}" as related to: ${topReason.tags.map((t) => CATEGORY_LABEL[t] ?? t).join(', ')}`}
        </div>
      )}

      {!loading && top && (
        <div className="result">
          <div className="result-title">{top.name}</div>
          <div className="thumb">
            <span style={{ color: 'var(--t4)', display: 'flex' }}>
              <IconDoc />
            </span>
          </div>
          <div className="result-actions">
            <button
              className="btn btn-fill pressable"
              onClick={() => handleAddToStack(top)}
              disabled={inStackIds.has(top.id) || addingIds.has(top.id)}
            >
              <IconClock color="var(--bg)" />
              {inStackIds.has(top.id) ? 'Added to Stack' : addingIds.has(top.id) ? 'Adding…' : 'Add To Stack'}
            </button>
            <button className="btn btn-out pressable" onClick={() => setDetailEntry(top)}>
              <IconChat size={15} />
              More Info
            </button>
          </div>
        </div>
      )}

      {!loading && !top && (
        <div className="empty-state t-body" style={{ marginTop: 27 }}>
          {query.trim() ? `Nothing in the catalog matches "${query.trim()}" yet.` : 'No matches.'}
        </div>
      )}

      <div className="papers">
        <span className="rail" />
        {rest.map((r) => {
          const reason = computeMatchReason(r, query, synonyms);
          return (
          <div key={r.id} className="paper">
            <div className="paper-title">{r.name}</div>
            {reason?.type === 'keyword' && (
              <div className="t-caption" style={{ color: 'var(--t3)', marginTop: 1 }}>
                Matched: "{reason.keyword}"
              </div>
            )}
            <div className="paper-meta">
              <span style={{ color: 'var(--t3)', display: 'flex' }}>
                <IconPerson />
              </span>
              {CATEGORY_LABEL[r.category] ?? r.category}
              <button
                className="paper-add pressable"
                onClick={() => handleAddToStack(r)}
                disabled={inStackIds.has(r.id) || addingIds.has(r.id)}
                aria-label="Add to stack"
              >
                {inStackIds.has(r.id) ? <IconCheck size={13} color="var(--purple)" /> : <IconPlus size={13} />}
              </button>
              <button className="paper-more" onClick={() => setDetailEntry(r)}>
                See More
                <IconChevron />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      <Sheet open={!!detailEntry} onClose={() => setDetailEntry(null)} title={detailEntry?.name ?? ''}>
        {detailEntry && (
          <GlossaryDetail
            entry={detailEntry}
            matchContext={detailReason ? { query: query.trim(), reason: detailReason } : undefined}
          />
        )}
      </Sheet>

      <Sheet open={!!justAdded} onClose={() => setJustAdded(null)} title="Added to Stack">
        {justAdded && (
          <div>
            <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 18 }}>
              {justAdded.name} is in your stack now. Want to add it to your daily schedule too, so it
              shows up on Today?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-fill pressable"
                style={{ width: '100%' }}
                onClick={() => {
                  setSchedulingEntry(justAdded);
                  setJustAdded(null);
                }}
              >
                Add to Schedule
              </button>
              <button className="btn btn-out pressable" style={{ width: '100%' }} onClick={() => setJustAdded(null)}>
                Not Now
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!schedulingEntry}
        onClose={() => setSchedulingEntry(null)}
        title="Add to Schedule"
      >
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
