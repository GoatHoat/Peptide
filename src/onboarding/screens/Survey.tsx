import { useEffect, useRef, useState } from 'react';
import { Cta, OnboardIllustration, Screen, Sub, Title } from '../chrome';

/* ── profile ─────────────────────────────────────────────────────────── */

const MIN_AGE = 13;
const MAX_AGE = 99;
/** px between year ticks on the ruler */
const TICK = 14;

export function Profile({
  age,
  gender,
  onChange,
  onNext,
}: {
  age: number | null;
  gender: 'm' | 'f' | 'na' | null;
  onChange: (p: { age?: number; gender: 'm' | 'f' | 'na' | null }) => void;
  onNext: () => void;
}) {
  const value = age ?? 25;
  const set = (n: number) => onChange({ age: Math.round(Math.min(MAX_AGE, Math.max(MIN_AGE, n))), gender });

  const drag = useRef<{ x: number; start: number } | null>(null);
  const [width, setWidth] = useState(320);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => railRef.current && setWidth(railRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, start: value };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    set(drag.current.start - (e.clientX - drag.current.x) / TICK);
  };
  const onUp = () => {
    drag.current = null;
  };

  // enough ticks either side to fill the rail, clipped to the real range
  const half = Math.ceil(width / TICK / 2) + 1;
  const ticks: number[] = [];
  for (let y = value - half; y <= value + half; y++) if (y >= MIN_AGE && y <= MAX_AGE) ticks.push(y);

  return (
    <Screen scroll footer={<Cta onClick={onNext}>Continue</Cta>}>
      <Title>About you</Title>
      <Sub>Dose ranges differ by age and sex. This stays on your device.</Sub>

      <div className="ob-age">
        <div className="ob-age-num">
          {value}
          <span className="ob-age-unit">yrs</span>
        </div>

        <div
          className="ob-ruler"
          ref={railRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="slider"
          tabIndex={0}
          aria-label="Age"
          aria-valuemin={MIN_AGE}
          aria-valuemax={MAX_AGE}
          aria-valuenow={value}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') set(value - 1);
            if (e.key === 'ArrowRight') set(value + 1);
          }}
        >
          {ticks.map((y) => {
            const major = y % 5 === 0;
            return (
              <span key={y}>
                <span
                  className={`ob-ruler-mark${major ? ' major' : ''}`}
                  style={{ left: width / 2 + (y - value) * TICK, height: major ? 22 : 13 }}
                />
                {major && (
                  <span className="ob-ruler-label" style={{ left: width / 2 + (y - value) * TICK }}>
                    {y}
                  </span>
                )}
              </span>
            );
          })}
          <span className="ob-ruler-needle" />
        </div>

        <div className="ob-age-steppers">
          <button className="ob-stepper" onClick={() => set(value - 1)} aria-label="One year younger">
            <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              <path d="M3.5 8h9" />
            </svg>
          </button>
          <button className="ob-stepper" onClick={() => set(value + 1)} aria-label="One year older">
            <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="ob-pill-row" style={{ marginTop: 30 }}>
        {([['m', 'Male'], ['f', 'Female'], ['na', 'Prefer not to say']] as const).map(([id, label]) => (
          <button
            key={id}
            className={`ob-pill${gender === id ? ' on' : ''}`}
            aria-pressed={gender === id}
            onClick={() => onChange({ age: value, gender: id })}
          >
            {label}
          </button>
        ))}
      </div>
    </Screen>
  );
}

/* ── the one read-only explainer ─────────────────────────────────────── */

/**
 * Was two consecutive screens — "Where this comes from" and "How a suggestion
 * is made" — neither of which asked for anything. One screen makes both
 * points, and the second of them is now true: since the diet, reaction and
 * form questions arrived, goals, age and sex are not "nothing else".
 */
export function Info({ onNext }: { onNext: () => void }) {
  return (
    <Screen center footer={<Cta onClick={onNext}>Continue</Cta>}>
      <OnboardIllustration name="library" />
      <div style={{ marginTop: 30 }}>
        <Title>Where this comes from</Title>
        <Sub>
          Every entry is tied to published research rather than to anything we decided ourselves.
          You can open the papers behind any of it from Discover, at any point.
        </Sub>
        <Sub>
          What we suggest comes from the goals you pick and the answers you give us, and nothing
          else. You set every amount yourself; the app stores your numbers and never invents them.
        </Sub>
      </div>
    </Screen>
  );
}

/* ── the three survey questions ──────────────────────────────────────── */

export interface Question {
  id: 'q2' | 'q3';
  title: string;
  sub: string;
  options: { id: string; label: string }[];
}

/**
 * None of these exists to make the user feel bad about themselves — that shape
 * of question produces refunds a week later, not engagement.
 *
 * There were three. The first asked how many supplements they were taking; the
 * `current-stack` screen asks the same thing four screens on and gets back a
 * list the scorer reads, so the count was collected and never looked at again.
 * The ids of the two left are unchanged on purpose — see FLOW.
 */
export const QUESTIONS: Record<'q2' | 'q3', Question> = {
  q2: {
    id: 'q2',
    title: 'Have you started a routine and stopped before?',
    sub: 'There is no wrong answer here.',
    options: [
      { id: 'never', label: 'Never tried' },
      { id: 'once', label: 'Once or twice' },
      { id: 'several', label: 'Several times' },
      { id: 'always', label: 'I always stop' },
    ],
  },
  q3: {
    id: 'q3',
    title: 'What usually goes wrong?',
    sub: 'This decides how the schedule is laid out.',
    options: [
      { id: 'forget', label: 'I forget' },
      { id: 'too-many', label: 'Too many to keep track of' },
      { id: 'unsure', label: 'Not sure it’s working' },
      { id: 'nothing', label: 'Nothing, I’m consistent' },
    ],
  },
};

/* ── the three multi-select questions ────────────────────────────────── */

export interface MultiQuestion {
  id: 'diet' | 'reactions' | 'forms';
  title: string;
  sub: string;
  options: { id: string; label: string }[];
  /** the "none of this applies" option: it clears the rest, and the rest clear it */
  clears: string;
  /** picking the key means the values are true as well */
  implies?: Record<string, string[]>;
  /** free text, stored on its own and never read by a rule */
  note?: { link: string; label: string; placeholder: string };
}

/**
 * These three pick *which* product, not whether. None of them can remove a
 * nutrient from the list, and every one of them is answerable with nothing
 * selected — a skip has to mean the same thing as "no preference".
 */
export const MULTI_QUESTIONS: Record<'diet' | 'reactions' | 'forms', MultiQuestion> = {
  diet: {
    id: 'diet',
    title: 'Anything you don’t eat?',
    sub: 'This changes what we suggest more than anything else you’ll tell us.',
    options: [
      { id: 'no-red-meat', label: 'No red meat' },
      { id: 'no-meat', label: 'No meat at all' },
      { id: 'no-fish', label: 'No fish or seafood' },
      { id: 'no-dairy', label: 'No dairy' },
      { id: 'no-eggs', label: 'No eggs' },
      { id: 'omnivore', label: 'I eat everything' },
    ],
    clears: 'omnivore',
    // nobody should end up saying they eat no meat but do eat red meat
    implies: { 'no-meat': ['no-red-meat'] },
  },
  reactions: {
    id: 'reactions',
    // The sub-line is the point of the screen: the answer gets them a
    // different form rather than taking something away, which is what gets
    // people to answer it honestly.
    title: 'Has anything you’ve taken not agreed with you?',
    sub: 'We’ll pick a different form rather than skipping it.',
    options: [
      { id: 'iron-gi', label: 'Iron upset my stomach' },
      { id: 'mag-gi', label: 'Magnesium gave me loose stools' },
      { id: 'fishoil-burp', label: 'Fish oil repeats on me' },
      { id: 'niacin-flush', label: 'Niacin made me flush' },
      { id: 'large-caps', label: 'Capsules are too big to swallow' },
      { id: 'zinc-nausea', label: 'Zinc on an empty stomach made me nauseous' },
      { id: 'none', label: 'None of these' },
    ],
    clears: 'none',
    note: {
      link: 'Something else',
      label: 'Anything else that did not agree with you',
      placeholder: 'What happened',
    },
  },
  forms: {
    id: 'forms',
    title: 'How do you prefer to take things?',
    sub: 'We’ll rank these first where there’s a choice.',
    // Every id maps onto a product_form already on the glossary rows. There is
    // no injection option here and there is not going to be one: peptides are
    // reference only, and asking someone which route they prefer to inject by
    // is the app tailoring its output to injection use.
    options: [
      { id: 'capsule', label: 'Capsules' },
      { id: 'tablet', label: 'Tablets' },
      { id: 'softgel', label: 'Softgels' },
      { id: 'powder', label: 'Powders' },
      { id: 'liquid', label: 'Liquids' },
      { id: 'gummy', label: 'Gummies' },
      { id: 'no-preference', label: 'No preference' },
    ],
    clears: 'no-preference',
  },
};

/** Toggling one option, with the clear-all and the implications applied. */
export function toggleMulti(q: MultiQuestion, value: string[], id: string): string[] {
  const order = (v: string[]) =>
    q.options.map((o) => o.id).filter((o) => v.includes(o));

  if (id === q.clears) return value.includes(id) ? [] : [id];

  // picking anything real retires the clear-all option
  const rest = value.filter((v) => v !== q.clears);

  if (rest.includes(id)) {
    // turning one off also turns off whatever implied it, rather than leaving
    // behind a pair of answers that contradict each other
    const implied = Object.entries(q.implies ?? {})
      .filter(([, ids]) => ids.includes(id))
      .map(([key]) => key);
    return order(rest.filter((v) => v !== id && !implied.includes(v)));
  }

  return order([...rest, id, ...(q.implies?.[id] ?? [])]);
}

export function MultiSelectScreen({
  question,
  value,
  onChange,
  note,
  onNote,
  onNext,
}: {
  question: MultiQuestion;
  value: string[];
  onChange: (v: string[]) => void;
  note?: string;
  onNote?: (v: string) => void;
  onNext: () => void;
}) {
  const [noteOpen, setNoteOpen] = useState(Boolean(note));

  return (
    <Screen scroll footer={<Cta onClick={onNext}>Continue</Cta>}>
      <Title>{question.title}</Title>
      <Sub>{question.sub}</Sub>

      <div className="ob-options" role="group" aria-label={question.title}>
        {question.options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              role="checkbox"
              aria-checked={on}
              className={`ob-option${on ? ' on' : ''}`}
              onClick={() => onChange(toggleMulti(question, value, o.id))}
            >
              {o.label}
              <span className={`ob-tick${on ? ' on' : ''}`}>
                {on && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {question.note && onNote && (
        <div style={{ marginTop: 14 }}>
          {noteOpen ? (
            <input
              className="ob-input"
              value={note ?? ''}
              maxLength={200}
              autoFocus
              onChange={(e) => onNote(e.target.value)}
              placeholder={question.note.placeholder}
              aria-label={question.note.label}
            />
          ) : (
            <button className="ob-textlink left" onClick={() => setNoteOpen(true)}>
              {question.note.link}
            </button>
          )}
        </div>
      )}
    </Screen>
  );
}

export function SurveyScreen({
  question,
  value,
  onPick,
  onNext,
}: {
  question: Question;
  value: string | null;
  onPick: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <Screen
      scroll
      footer={
        <Cta onClick={onNext} disabled={value === null}>
          Continue
        </Cta>
      }
    >
      <Title>{question.title}</Title>
      <Sub>{question.sub}</Sub>

      <div className="ob-options" role="radiogroup" aria-label={question.title}>
        {question.options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={value === o.id}
            className={`ob-option${value === o.id ? ' on' : ''}`}
            onClick={() => onPick(o.id)}
          >
            {o.label}
            <span className={`ob-tick${value === o.id ? ' on' : ''}`}>
              {value === o.id && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
                </svg>
              )}
            </span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
