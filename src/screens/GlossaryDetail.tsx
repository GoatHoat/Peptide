import { useEffect, useState } from 'react';
import { getGlossaryResearch, type GlossaryEntry, type GlossaryResearch } from '../lib/api';
import type { MatchReason } from '../lib/matchReason';

const CATEGORY_LABEL: Record<string, string> = {
  healing: 'Healing',
  growth: 'Growth',
  cosmetic: 'Cosmetic',
  cognitive: 'Cognitive',
  other: 'Other',
};

const ROUTE_LABEL: Record<string, string> = {
  injected: 'Injected',
  oral: 'Oral',
  topical: 'Topical',
  nasal: 'Nasal',
};

interface Props {
  entry: GlossaryEntry;
  /** Set when opened from a search result — explains why this entry matched, so it doesn't look arbitrary. */
  matchContext?: { query: string; reason: MatchReason };
}

export function GlossaryDetail({ entry, matchContext }: Props) {
  const [research, setResearch] = useState<GlossaryResearch[] | null>(null);

  useEffect(() => {
    getGlossaryResearch(entry.id)
      .then(setResearch)
      .catch((err) => {
        console.error('research load failed', err);
        setResearch(null);
      });
  }, [entry.id]);

  return (
    <div className="glossary-detail">
      {matchContext && (
        <div className="match-context t-caption">
          {matchContext.reason.type === 'keyword'
            ? `Matched "${matchContext.query}" via: "${matchContext.reason.keyword}"`
            : `Matched "${matchContext.query}" via: ${matchContext.reason.tags.map((t) => CATEGORY_LABEL[t] ?? t).join(', ')}`}
        </div>
      )}

      {/* a branded product says whose label this is, and links the filing */}
      {entry.brand && (
        <div className="glossary-brand">
          <span className="glossary-brand-name">{entry.brand}</span>
          {entry.product_form && <span className="t-caption"> · {entry.product_form}</span>}
          {entry.label_url && (
            <a className="glossary-brand-link t-caption" href={entry.label_url} target="_blank" rel="noreferrer">
              NIH label
            </a>
          )}
        </div>
      )}

      <div className="glossary-tags">
        <span className="tag">{entry.kind === 'supplement' ? 'Supplement' : 'Peptide'}</span>
        <span className="tag">{CATEGORY_LABEL[entry.category] ?? entry.category}</span>
        <span className="tag">{ROUTE_LABEL[entry.route] ?? entry.route}</span>
        {entry.goal_tags.map((g) => (
          <span key={g} className="tag">
            {g}
          </span>
        ))}
      </div>

      {entry.mechanism_summary && (
        <div className="glossary-field">
          <div className="t-label" style={{ color: 'var(--t3)' }}>
            Mechanism
          </div>
          <div className="t-body" style={{ marginTop: 4 }}>
            {entry.mechanism_summary}
          </div>
        </div>
      )}

      {entry.research_summary && (
        <div className="glossary-field">
          <div className="t-label" style={{ color: 'var(--t3)' }}>
            Research Trends
          </div>
          <div className="t-body" style={{ marginTop: 4 }}>
            {entry.research_summary}
          </div>
        </div>
      )}

      {entry.storage_notes && (
        <div className="glossary-field">
          <div className="t-label" style={{ color: 'var(--t3)' }}>
            Storage
          </div>
          <div className="t-body" style={{ marginTop: 4 }}>
            {entry.storage_notes}
          </div>
        </div>
      )}

      {research && research.length > 0 && (
        <div className="glossary-field">
          <div className="t-label" style={{ color: 'var(--t3)' }}>
            {research.length === 1 ? 'The paper' : `The ${research.length} papers`}
          </div>
          <div style={{ marginTop: 8 }}>
            {research.map((r) => (
              <a
                key={r.id}
                className="research-link t-body-m pressable"
                href={r.url ?? undefined}
                target={r.url ? '_blank' : undefined}
                rel="noreferrer"
                style={{ pointerEvents: r.url ? 'auto' : 'none' }}
              >
                <div>{r.title}</div>
                {r.meta && <div className="t-caption" style={{ color: 'var(--t3)', marginTop: 2 }}>{r.meta}</div>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
