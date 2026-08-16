import type { ReactNode } from 'react';

/**
 * Small line-art marks for the row pills. Drawn in a 14 box at 1.5 stroke so
 * they sit on the cap height of 12px text without shouting.
 */
const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const PillIcon = {
  /** evidence — a small bar chart, taller bars meaning more of it */
  evidence: (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
      <path {...S} d="M2.5 11V8M7 11V4.5M11.5 11V6.5" />
    </svg>
  ),
  /** dose — a measuring line with a mark on it */
  dose: (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
      <path {...S} d="M2 9.5h10M4.5 7.5v4M9.5 7.5v4M7 3v3" />
      <circle {...S} cx="7" cy="2.5" r="1" />
    </svg>
  ),
  /** form — a capsule on its side */
  form: (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
      <rect {...S} x="1.5" y="4.5" width="11" height="5" rx="2.5" />
      <path {...S} d="M7 4.5v5" />
    </svg>
  ),
  /** timing — a clock */
  timing: (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
      <circle {...S} cx="7" cy="7" r="5" />
      <path {...S} d="M7 4.2V7l2 1.2" />
    </svg>
  ),
  /** route — a droplet */
  route: (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
      <path {...S} d="M7 2.2c2 2.3 3.2 3.8 3.2 5.4a3.2 3.2 0 0 1-6.4 0c0-1.6 1.2-3.1 3.2-5.4z" />
    </svg>
  ),
  /** goal — a target */
  goal: (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
      <circle {...S} cx="7" cy="7" r="5" />
      <circle {...S} cx="7" cy="7" r="1.6" />
    </svg>
  ),
  /** upper limit — a shield */
  limit: (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
      <path {...S} d="M7 1.8 2.6 3.6v3.6c0 2.6 1.8 4.4 4.4 5.2 2.6-.8 4.4-2.6 4.4-5.2V3.6z" />
    </svg>
  ),
};

export function Pill({
  icon,
  children,
  tone = 'plain',
}: {
  icon: keyof typeof PillIcon;
  children: ReactNode;
  tone?: 'plain' | 'accent' | 'strong' | 'mixed' | 'thin';
}) {
  return (
    <span className={`tagpill tagpill-${tone}`}>
      <span className="tagpill-icon">{PillIcon[icon]}</span>
      {children}
    </span>
  );
}

/**
 * What the evidence grade means. These are editorial grades set per entry, not
 * a formal appraisal system — the wording says so, because a bare "thin" badge
 * tells the reader nothing and implies more rigour than there is.
 */
export const EVIDENCE = {
  strong: {
    label: 'Strong evidence',
    detail:
      'Several randomised trials or meta-analyses in people, broadly agreeing on the direction of the effect.',
  },
  mixed: {
    label: 'Mixed evidence',
    detail:
      'Human trials exist but disagree with each other, or the effect they find is small or inconsistent.',
  },
  thin: {
    label: 'Thin evidence',
    detail:
      'Mostly laboratory or animal work, or only a few small human studies. Not the same as disproven — it means nobody has looked properly yet.',
  },
} as const;

export const TIMING_LABEL: Record<string, string> = {
  with_food: 'With food',
  empty: 'Empty stomach',
  evening: 'Evening',
  any: 'Any time',
};

export const ROUTE_LABEL: Record<string, string> = {
  oral: 'Oral',
  injected: 'Injected',
  topical: 'Topical',
  nasal: 'Nasal',
};
