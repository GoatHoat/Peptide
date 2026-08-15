import type { ReactNode } from 'react';

export interface Goal {
  id: string;
  name: string;
  /** two lines, what the app will actually do — not what the supplement does */
  copy: string;
  /** tags present in the glossary; see the distinct set in migration 0003 */
  tags: string[];
  icon: ReactNode;
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Drawn in a 96 box and scaled by the ring around them. */
export const GOALS: Goal[] = [
  {
    id: 'skin',
    name: 'Skin & hair',
    copy: 'We’ll group the topicals into one block so they’re not competing, and keep the evidence for each one a tap away.',
    tags: ['Skin', 'Anti-Aging'],
    icon: (
      <>
        <path {...S} d="M48 14c14 14 22 24 22 36a22 22 0 0 1-44 0c0-12 8-22 22-36z" />
        <path {...S} d="M40 52a8 8 0 0 0 8 8" />
      </>
    ),
  },
  {
    id: 'sleep',
    name: 'Sleep',
    copy: 'Anything that belongs in your wind-down gets scheduled there, and the app checks nothing lands too close to bed.',
    tags: ['Mood', 'Recovery'],
    icon: <path {...S} d="M62 54A24 24 0 0 1 38 24a26 26 0 1 0 24 30z" />,
  },
  {
    id: 'energy',
    name: 'Energy',
    copy: 'Morning items stay in the morning block, and the streak view shows whether the days you took them differ.',
    tags: ['Recovery', 'Muscle'],
    icon: <path {...S} d="M52 12 26 52h18l-6 32 28-42H48z" />,
  },
  {
    id: 'focus',
    name: 'Focus',
    copy: 'The cognitive entries get their own block away from meals, with the research behind each one linked in Discover.',
    tags: ['Focus'],
    icon: (
      <>
        <circle {...S} cx="48" cy="48" r="26" />
        <circle {...S} cx="48" cy="48" r="11" />
        <path {...S} d="M48 8v10M48 78v10M8 48h10M78 48h10" />
      </>
    ),
  },
  {
    id: 'training',
    name: 'Training',
    copy: 'Recovery items are spaced around your meals, and anything that shouldn’t share a slot gets flagged when it does.',
    tags: ['Muscle', 'Recovery', 'Injury'],
    icon: (
      <>
        <path {...S} d="M20 38v20M30 30v36M66 30v36M76 38v20" />
        <path {...S} d="M30 48h36" />
      </>
    ),
  },
  {
    id: 'immunity',
    name: 'Immunity',
    copy: 'The immune and gut entries are kept in a consistent daily slot, since these are the ones people drop first.',
    tags: ['Immune', 'Gut Health'],
    icon: (
      <>
        <path {...S} d="M48 12 20 24v22c0 18 12 30 28 38 16-8 28-20 28-38V24z" />
        <path {...S} d="M38 46l8 8 14-16" />
      </>
    ),
  },
];

export const GOAL_BY_ID = Object.fromEntries(GOALS.map((g) => [g.id, g]));

/** Used when someone reaches the results with no goals chosen. */
export const DEFAULT_GOAL_IDS = ['energy', 'immunity'];
