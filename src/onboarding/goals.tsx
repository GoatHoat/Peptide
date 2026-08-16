export interface Goal {
  id: string;
  name: string;
  /** two lines, what the app will actually do — not what the supplement does */
  copy: string;
  /** tags present in the glossary; see the distinct set in migration 0003 */
  tags: string[];
  /** supplied artwork in public/goals; matched to the goal by its glyph */
  img: string;
}

export const GOALS: Goal[] = [
  {
    id: 'skin',
    name: 'Skin & hair',
    copy: 'We’ll group the topicals into one block so they’re not competing, and keep the evidence for each one a tap away.',
    tags: ['Skin', 'Anti-Aging'],
    img: '/goals/skin.png',

  },
  {
    id: 'sleep',
    name: 'Sleep',
    copy: 'Anything that belongs in your wind-down gets scheduled there, and the app checks nothing lands too close to bed.',
    tags: ['Sleep', 'Mood'],
    img: '/goals/sleep.png',

  },
  {
    id: 'energy',
    name: 'Energy',
    copy: 'Morning items stay in the morning block, and the streak view shows whether the days you took them differ.',
    tags: ['Energy', 'Recovery'],
    img: '/goals/energy.png',

  },
  {
    id: 'focus',
    name: 'Focus',
    copy: 'The cognitive entries get their own block away from meals, with the research behind each one linked in Discover.',
    tags: ['Focus'],
    img: '/goals/focus.png',

  },
  {
    id: 'training',
    name: 'Training',
    copy: 'Recovery items are spaced around your meals, and anything that shouldn’t share a slot gets flagged when it does.',
    tags: ['Muscle', 'Recovery', 'Injury'],
    img: '/goals/training.png',

  },
  {
    id: 'immunity',
    name: 'Immunity',
    copy: 'The immune and gut entries are kept in a consistent daily slot, since these are the ones people drop first.',
    tags: ['Immune', 'Gut Health'],
    img: '/goals/immunity.png',

  },
  {
    id: 'growth',
    name: 'Growth',
    copy: 'The mass and strength entries get placed around your training rather than scattered, so the ones that want food land on a meal.',
    tags: ['Growth', 'Muscle'],
    /* Artwork does not exist yet. The reference is deliberate, per the spec:
       substituting one of the other six would ship a picture that means
       something else, and a missing image is at least honest. See the report. */
    img: '/goals/growth.png',
  },
];

export const GOAL_BY_ID = Object.fromEntries(GOALS.map((g) => [g.id, g]));

/** Used when someone reaches the results with no goals chosen. */
export const DEFAULT_GOAL_IDS = ['energy', 'immunity'];
