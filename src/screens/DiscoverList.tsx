import { useEffect, useState } from 'react';
import {
  getGlossaryResearch,
  pickReference,
  type GlossaryEntry,
  type GlossaryResearch,
  type NutrientReference,
} from '../lib/api';
import { IconChevron, IconCheck, IconChat, IconClock, IconPlus } from '../components/Icons';

const TIMING_LABEL: Record<string, string> = {
  with_food: 'With food',
  empty: 'Empty stomach',
  evening: 'Evening',
  any: 'Any time',
};

/** "11 mg" — the amount that applies to this person, or null if none is set. */
export function doseLabel(
  refs: NutrientReference[] | undefined,
  age: number | null | undefined,
  sex: 'm' | 'f' | 'na' | null | undefined,
): string | null {
  const r = pickReference(refs, age, sex);
  if (!r || r.rda == null) return null;
  return `${r.rda} ${r.unit}`;
}

/**
 * One product in the list. Tapping it opens a card *underneath* rather than
 * pushing a sheet up, so the list keeps its place and the surrounding rows stay
 * on screen.
 */
export function ProductRow({
  entry,
  refs,
  age,
  sex,
  inStack,
  adding,
  expanded,
  onToggle,
  onAdd,
  onAsk,
  onAllArticles,
}: {
  entry: GlossaryEntry;
  refs: NutrientReference[] | undefined;
  age: number | null | undefined;
  sex: 'm' | 'f' | 'na' | null | undefined;
  inStack: boolean;
  adding: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onAsk: () => void;
  onAllArticles: () => void;
}) {
  const [preview, setPreview] = useState<GlossaryResearch | null | 'loading'>(null);

  // the preview is only fetched when the card actually opens
  useEffect(() => {
    if (!expanded || preview !== null) return;
    let live = true;
    setPreview('loading');
    getGlossaryResearch(entry.id)
      .then((rows) => live && setPreview(rows[0] ?? null))
      .catch(() => live && setPreview(null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const dose = doseLabel(refs, age, sex);
  const isSupp = (entry.kind ?? 'peptide') === 'supplement';

  return (
    <div className={`prod${expanded ? ' open' : ''}`}>
      <button className="prod-row" onClick={onToggle} aria-expanded={expanded}>
        <span className="prod-main">
          <span className="prod-name">{entry.name}</span>
          <span className="prod-meta">
            {entry.evidence && <span className="evidence-chip">{entry.evidence}</span>}
            {entry.product_form && <span className="prod-tag">{entry.product_form}</span>}
            {/* the personalised amount sits with the tags, as a quiet detail */}
            {isSupp && dose && <span className="prod-dose">{dose}/day for you</span>}
            {isSupp && !dose && <span className="prod-tag">No set intake</span>}
          </span>
        </span>
        <span className={`prod-chev${expanded ? ' open' : ''}`}>
          <IconChevron size={14} color="var(--t3)" />
        </span>
      </button>

      {expanded && (
        <div className="prod-card">
          {preview === 'loading' && <div className="prod-preview-empty t-caption">Loading the paper…</div>}

          {preview && preview !== 'loading' && (
            <a
              className="prod-preview pressable"
              href={preview.url ?? undefined}
              target={preview.url ? '_blank' : undefined}
              rel="noreferrer"
            >
              <span className="t-label" style={{ color: 'var(--t3)' }}>
                Latest paper
              </span>
              <span className="prod-preview-title">{preview.title}</span>
              {preview.meta && <span className="t-caption" style={{ color: 'var(--t2)' }}>{preview.meta}</span>}
              <span className="prod-preview-cta t-body-m">
                Read the paper
                <IconChevron size={12} color="var(--purple)" />
              </span>
            </a>
          )}

          {preview === null && (
            <div className="prod-preview-empty t-caption">No paper on file for this one yet.</div>
          )}

          {isSupp && entry.timing && (
            <div className="prod-when">
              <span className="prod-when-chip on">{TIMING_LABEL[entry.timing]}</span>
              {entry.timing_note && <span className="t-caption">{entry.timing_note}</span>}
            </div>
          )}

          <div className="prod-actions">
            <button className="prod-btn fill pressable" onClick={onAdd} disabled={inStack || adding}>
              {inStack ? <IconCheck size={14} color="var(--bg)" /> : <IconPlus size={14} color="var(--bg)" />}
              {inStack ? 'In stack' : adding ? 'Adding…' : 'Add to stack'}
            </button>
            <button className="prod-btn pressable" onClick={onAsk}>
              <IconChat size={14} color="var(--purple)" />
              Ask a question
            </button>
            <button className="prod-btn wide pressable" onClick={onAllArticles}>
              <IconClock size={14} color="var(--purple)" />
              See more articles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
