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

/* ── the two read-only explainers ────────────────────────────────────── */

export const INFO_COPY = {
  'info-library': {
    illustration: 'library',
    title: 'Where this comes from',
    body: 'Every entry is tied to published research rather than to anything we decided ourselves. You can open the papers behind any of it from Discover, at any point, without asking us.',
  },
  'info-recs': {
    illustration: 'recs',
    title: 'How a suggestion is made',
    body: 'Suggestions are drawn from the goals you pick, your age and your sex — nothing else. You set every amount yourself; the app stores your numbers and never invents them.',
  },
} as const;

export function Info({ which, onNext }: { which: keyof typeof INFO_COPY; onNext: () => void }) {
  const c = INFO_COPY[which];
  return (
    <Screen center footer={<Cta onClick={onNext}>Continue</Cta>}>
      <OnboardIllustration name={c.illustration} />
      <div style={{ marginTop: 30 }}>
        <Title>{c.title}</Title>
        <Sub>{c.body}</Sub>
      </div>
    </Screen>
  );
}

/* ── the three survey questions ──────────────────────────────────────── */

export interface Question {
  id: 'q1' | 'q2' | 'q3';
  title: string;
  sub: string;
  options: { id: string; label: string }[];
}

/**
 * Every one of these changes something downstream. None of them exists to make
 * the user feel bad about themselves — that shape of question produces refunds
 * a week later, not engagement.
 */
export const QUESTIONS: Record<'q1' | 'q2' | 'q3', Question> = {
  q1: {
    id: 'q1',
    title: 'How many separate things are you taking right now?',
    sub: 'Including anything over the counter.',
    options: [
      { id: 'none', label: 'None yet' },
      { id: '1-2', label: '1–2' },
      { id: '3-5', label: '3–5' },
      { id: '6+', label: '6 or more' },
    ],
  },
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
