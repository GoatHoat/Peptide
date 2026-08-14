/** Every string on the three screens, verbatim from the Figma exports. */

export type DayState = 'completed' | 'missed' | 'today' | 'future';

export interface Day {
  dow: string;
  num: number;
  state: DayState;
}

export const WEEK: Day[] = [
  { dow: 'M', num: 10, state: 'completed' },
  { dow: 'T', num: 11, state: 'completed' },
  { dow: 'W', num: 12, state: 'missed' },
  { dow: 'T', num: 13, state: 'today' },
  { dow: 'F', num: 14, state: 'future' },
  { dow: 'S', num: 15, state: 'future' },
  { dow: 'S', num: 16, state: 'future' },
];

export const TODAY = {
  title: 'Today',
  date: 'Thursday 13 August',
  dayStart: '7:30 AM',
  dayEnd: '10:00 PM',
  leftToday: 2,
  warning: 'Zinc 113% of the daily ceiling — your hair gummy already has 30 mg',
};

export interface Dose {
  id: string;
  time: string;
  /** hours as a float, for placing the gap on the arc */
  hour: number;
  name: string;
  amount: string;
  taken: boolean;
}

export const DOSES: Dose[] = [
  { id: 'collagen', time: '8:00 AM', hour: 8, name: 'Collagen peptides', amount: '10 g', taken: true },
  { id: 'omega', time: '1:00 PM', hour: 13, name: 'Omega-3', amount: '1,000 mg EPA + DHA', taken: false },
  { id: 'zinc', time: '9:00 PM', hour: 21, name: 'Copper + Zinc', amount: '15 mg zinc', taken: false },
];

export const DISCOVER = {
  title: 'Discover',
  subtitle: 'Recommendations · Research',
  query: 'Santa Cruz Copper+Zinc',
  result: {
    title: 'Santa Cruz Paper 1: the effects of Zinc',
    primary: 'Add To Stack',
    secondary: 'Ask Question',
  },
  papers: [2, 3, 4, 5].map((n) => ({
    id: `paper-${n}`,
    title: `Santa Cruz Paper ${n}: the effects of Zinc`,
    meta: 'neegy 2010 · Supplements',
    more: 'See More',
  })),
};

export const YOU = {
  title: 'You: Vojtech Arkes',
  streak: '14 Day Streak',
  streakCount: 14,
  /** the second widget is an intentionally empty, labelled box */
  gapLabel: 'Widget',
  rows: [
    { label: 'Notifications', value: '3 a day' },
    { label: 'Reduce motion', value: 'Off' },
    { label: 'Larger text', value: 'Off' },
    { label: 'Subscription', value: 'Founding · £2.99' },
    { label: 'Blood test reminder', value: 'On' },
  ],
};

export const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * August 2025 laid out from Sunday, with the completed days filled. Rows are
 * labelled by their week-start date down the left: 1, 8, 15, 22.
 */
export const MONTH_ROWS: { label: string; cells: boolean[] }[] = [
  { label: '1', cells: [true, true, false, false, false, false, false] },
  { label: '8', cells: [false, true, true, true, true, true, false] },
  { label: '15', cells: [true, true, true, true, true, true, true] },
  { label: '22', cells: [true, true, true, true, true, true, false] },
];
