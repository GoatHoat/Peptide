import { useEffect, useState } from 'react';
import {
  getGlossaryResearch,
  type GlossaryEntry,
  type GlossaryResearch,
  type NutrientReference,
} from '../lib/api';
import {
  intakeLabel,
  intakeSentence,
  limitLabel,
  MENSTRUAL_QUESTION,
  offersMenstrualStatus,
  resolveIntake,
} from '../lib/intake';
import { EVIDENCE, Pill, ROUTE_LABEL, TIMING_LABEL } from '../components/Pills';
import { IconChevron, IconCheck, IconChat, IconDoc, IconPlus } from '../components/Icons';

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
  menstruates,
  inStack,
  adding,
  expanded,
  onToggle,
  onAdd,
  onAsk,
  onAllArticles,
  onMenstruates,
}: {
  entry: GlossaryEntry;
  refs: NutrientReference[] | undefined;
  age: number | null | undefined;
  sex: 'm' | 'f' | 'na' | null | undefined;
  /** null or absent means unanswered, which renders both iron figures */
  menstruates?: boolean | null;
  inStack: boolean;
  adding: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onAsk: () => void;
  onAllArticles: () => void;
  onMenstruates?: (value: boolean | null) => void;
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

  /* "Prefer not to say" stores null, and so does never having answered — so
     which of the three is pressed is held for the session rather than derived
     from the profile. Reopening shows nothing pressed and both figures, which
     is the honest reading of a null. */
  const [picked, setPicked] = useState<string | null>(null);

  const intake = resolveIntake(entry, refs, age, sex, menstruates);
  const rda = intakeLabel(intake);
  const ul = limitLabel(intake);
  const isSupp = (entry.kind ?? 'peptide') === 'supplement';
  const ev = entry.evidence ? EVIDENCE[entry.evidence] : null;
  const asksMenstrual = !!onMenstruates && offersMenstrualStatus(entry, age, sex);
  const chosen = picked ?? (menstruates === true ? 'yes' : menstruates === false ? 'no' : null);

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

          {/* The one figure in the library that turns on something the app is
              not told. Both numbers, and the question next to them — never a
              guess off age. See lib/intake.ts. */}
          {asksMenstrual && (
            <div className="prod-ask">
              {intakeSentence(intake) && (
                <p className="prod-ask-target t-body">{intakeSentence(intake)}</p>
              )}
              <span className="prod-ask-q t-label">{MENSTRUAL_QUESTION.ask}</span>
              <div className="prod-ask-opts">
                {MENSTRUAL_QUESTION.options.map((option) => (
                  <button
                    key={option.id}
                    className={`prod-ask-opt pressable${chosen === option.id ? ' on' : ''}`}
                    aria-pressed={chosen === option.id}
                    onClick={() => {
                      setPicked(option.id);
                      onMenstruates?.(option.value);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="prod-ask-why t-caption">{MENSTRUAL_QUESTION.why}</p>
            </div>
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
