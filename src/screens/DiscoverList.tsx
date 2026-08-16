import { useEffect, useState } from 'react';
import {
  getGlossaryResearch,
  pickReference,
  type GlossaryEntry,
  type GlossaryResearch,
  type NutrientReference,
} from '../lib/api';
import { EVIDENCE, Pill, ROUTE_LABEL, TIMING_LABEL } from '../components/Pills';
import { IconChevron, IconCheck, IconChat, IconDoc, IconPlus } from '../components/Icons';

/** "11 mg" — what applies to this person, or null when nothing is established. */
export function doseLabel(
  refs: NutrientReference[] | undefined,
  age: number | null | undefined,
  sex: 'm' | 'f' | 'na' | null | undefined,
): { rda: string | null; ul: string | null } {
  const r = pickReference(refs, age, sex);
  if (!r) return { rda: null, ul: null };
  return {
    rda: r.rda == null ? null : `${r.rda} ${r.unit}`,
    ul: r.ul == null ? null : `${r.ul} ${r.unit}`,
  };
}

/** The year out of "1/5 · Efficacy · Nutrients, 2016". */
const yearOf = (meta: string | null) => meta?.match(/\b(19|20)\d{2}\b/)?.[0] ?? null;

/**
 * A product in the list.
 *
 * At rest it is flush on the background against a rail, like the paper list it
 * replaced — name, then a row of pills. It only becomes a card once opened, so
 * a long list reads as a list rather than a wall of boxes.
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

  const { rda, ul } = doseLabel(refs, age, sex);
  const isSupp = (entry.kind ?? 'peptide') === 'supplement';
  const ev = entry.evidence ? EVIDENCE[entry.evidence] : null;

  return (
    <div className={`prod${expanded ? ' open' : ''}`}>
      <button className="prod-row" onClick={onToggle} aria-expanded={expanded}>
        <span className="prod-main">
          <span className="prod-name">{entry.name}</span>

          <span className="prod-pills">
            {ev && <Pill icon="evidence" tone={entry.evidence!}>{ev.label}</Pill>}
            {isSupp && rda && <Pill icon="dose" tone="accent">{rda} a day</Pill>}
            {isSupp && !rda && <Pill icon="dose">No set intake</Pill>}
            {ul && <Pill icon="limit">{ul} limit</Pill>}
            {entry.timing && <Pill icon="timing">{TIMING_LABEL[entry.timing]}</Pill>}
            {entry.product_form && <Pill icon="form">{entry.product_form}</Pill>}
            {!entry.product_form && entry.route && <Pill icon="route">{ROUTE_LABEL[entry.route] ?? entry.route}</Pill>}
            {entry.goal_tags?.slice(0, 2).map((g) => (
              <Pill icon="goal" key={g}>
                {g}
              </Pill>
            ))}
          </span>
        </span>
        <span className={`prod-chev${expanded ? ' open' : ''}`}>
          <IconChevron size={14} color="var(--t3)" />
        </span>
      </button>

      {expanded && (
        <div className="prod-card">
          {/* what the grade on the pill above actually means */}
          {ev && (
            <p className="prod-evidence t-caption">
              <b>{ev.label}.</b> {ev.detail}
            </p>
          )}

          {entry.timing_note && <p className="prod-evidence t-caption">{entry.timing_note}</p>}

          {preview === 'loading' && <div className="prod-preview-empty t-caption">Loading the paper…</div>}

          {preview && preview !== 'loading' && (
            <a
              className="prod-preview pressable"
              href={preview.url ?? undefined}
              target={preview.url ? '_blank' : undefined}
              rel="noreferrer"
            >
              <span className="prod-preview-head t-label">
                <IconDoc size={13} color="var(--t3)" />
                Latest paper
                {yearOf(preview.meta) && <span className="prod-preview-year">{yearOf(preview.meta)}</span>}
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
              <IconDoc size={14} color="var(--purple)" />
              See more articles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
