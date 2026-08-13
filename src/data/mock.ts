/**
 * All mock data for the app, lifted verbatim out of
 * `mockup/Stack Tracker.dc.html`. Nothing here is invented.
 *
 * Swap this file for a real API later — no screen imports data from anywhere
 * else.
 */

// ─────────────────────────────────────────────────────────────
// Onboarding · build your stack (ob3)
// ─────────────────────────────────────────────────────────────

export interface BuildItem {
  n: string;
  d: string;
}

export const BUILD: BuildItem[] = [
  { n: 'Hair, Skin & Nails gummy', d: '2 gummies · 10,000 mcg biotin' },
];

/** Bar widths, in px, for the fake barcode inside the scanner viewfinder. */
export const BARCODE_WIDTHS = [2, 5, 3, 7, 2, 4, 6, 3, 5, 2, 7, 3];

// ─────────────────────────────────────────────────────────────
// Nutrients — the load-bearing numbers. Zinc 45 against a 40 ceiling.
// ─────────────────────────────────────────────────────────────

export interface Nutrient {
  n: string;
  amt: number;
  u: string;
  rda: number;
  ul: number;
  from: string;
}


export interface ScoredNutrient extends Nutrient {
  /** amount ÷ upper limit */
  p: number;
  pctT: string;
  crit: boolean;
  over: boolean;
  near: boolean;
}

/** Nutrients scored against their upper limit, sorted worst-first. */


// ─────────────────────────────────────────────────────────────
// Goals (ob6) — Apple Action Button pager
// ─────────────────────────────────────────────────────────────

export interface Goal {
  t: string;
  s: string;
  /** SVG path, 24×24 viewBox */
  d: string;
}

export const GOALS: Goal[] = [
  {
    t: 'Sleep',
    s: 'We’ll push magnesium and glycine into your wind-down window and watch what it does.',
    d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z',
  },
  {
    t: 'Recovery',
    s: 'We’ll prioritise timing around training and track soreness alongside your stack.',
    d: 'M4 12a8 8 0 1 0 2.4-5.7M4 3.5v3.8h3.8',
  },
  {
    t: 'Energy',
    s: 'B-vitamins and iron move to the morning, and we flag anything sedating before noon.',
    d: 'M13 2 5 13.5h5.5L9.5 22 18 10.5h-5.5L13 2Z',
  },
  {
    t: 'Focus',
    s: 'We separate the things that compete for the same transporters so each one lands.',
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z',
  },
  {
    t: 'Training',
    s: 'Creatine gets a fixed daily slot and we track it against your session days.',
    d: 'M3 9v6M6 6.5v11M18 6.5v11M21 9v6M6 12h12',
  },
  {
    t: 'General health',
    s: 'We keep every nutrient between its RDA and its ceiling, and tell you when it drifts.',
    d: 'M12 20.5S5 16.4 5 10.9a3.9 3.9 0 0 1 7-2.5 3.9 3.9 0 0 1 7 2.5c0 5.5-7 9.6-7 9.6Z',
  },
  {
    t: 'Skin & hair',
    s: 'Zinc, biotin and omega-3s get watched together — this trio is easy to overshoot.',
    d: 'M12 3s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.4 12 3 12 3Z',
  },
  {
    t: 'Gut',
    s: 'Probiotics move away from anything that kills them, including your morning coffee.',
    d: 'M8 3v4.2a4 4 0 0 0 8 0M16 7.2v4.2a4 4 0 0 1-8 0M8 11.4v4.2a4 4 0 0 0 8 0M16 15.6V20',
  },
];

// ─────────────────────────────────────────────────────────────
// The day — three blocks, nine doses
// ─────────────────────────────────────────────────────────────

export interface Dose {
  id: string;
  n: string;
  d: string;
  why?: string;
}

export interface Block {
  id: string;
  label: string;
  time: string;
  past: boolean;
  items: Dose[];
}



// ─────────────────────────────────────────────────────────────
// Stack tab
// ─────────────────────────────────────────────────────────────

export interface StackItem {
  n: string;
  d: string;
  t: string;
  on: boolean;
}

export interface StackSection {
  s: string;
  items: StackItem[];
}



/** Doses per hour, for the Stack screen's 24-hour chart. */

// ─────────────────────────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────────────────────────

export interface Ratio {
  n: string;
  v: string;
  ideal: string;
  pos: string;
  lo: string;
  hi: string;
  ok: boolean;
  note: string;
}


export interface Interaction {
  a: string;
  b: string;
  fixed: boolean;
  note: string;
}


/** 12 bars, used on both Analysis and Item detail. */
export const ADHERENCE_BARS = [72, 80, 66, 91, 88, 94, 79, 86, 90, 84, 96, 88];

export const COST = {
  monthly: '$84.20',
  sub: 'per month · $2.77 a day',
  rows: [
    { n: 'Nordic Naturals Omega-3', v: '$0.62 / serving' },
    { n: 'Vital Proteins Collagen', v: '$0.71 / serving' },
  ],
};

// ─────────────────────────────────────────────────────────────
// Cost
// ─────────────────────────────────────────────────────────────

export interface Ingredient {
  n: string;
  amt: string;
  rdaP: string;
  ulW: string;
  ulT: string;
}



// ─────────────────────────────────────────────────────────────
// Paywall (ob12)
// ─────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  n: string;
  p: string;
  sub: string;
  tag: string;
}

export const PLANS: Plan[] = [
  { id: 'annual', n: 'Annual', p: '$29.99', sub: '7 days free, then $29.99/yr', tag: 'BEST VALUE' },
  { id: 'monthly', n: 'Monthly', p: '$4.99', sub: 'Billed every month', tag: '' },
  { id: 'lifetime', n: 'Lifetime', p: '$69.99', sub: 'One payment. Yours for good.', tag: 'NO SUBSCRIPTION' },
];

export interface Feature {
  f: string;
  a: boolean | string;
  b: boolean | string;
}

export const FEATURES: Feature[] = [
  { f: 'Barcode scanning', a: true, b: true },
  { f: 'The over-limit audit', a: true, b: true },
  { f: 'Schedule & reminders', a: true, b: true },
  { f: 'Streak & check-in', a: true, b: true },
  { f: 'Progress photos', a: true, b: true },
  { f: 'History', a: '30 days', b: 'Unlimited' },
  { f: 'Ratios & interactions', a: false, b: true },
  { f: 'Conflict auto-fix', a: false, b: true },
  { f: 'Cost tracking', a: false, b: true },
  { f: 'CSV & provider PDF', a: false, b: true },
];

// ─────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────

export const PROFILE = {
  name: 'Marcus',
  initial: 'M',
  since: 'Member since January',
  streak: '12',
  longest: '31',
};

export const QUIET_ROWS = ['Notifications', 'Units', 'Data', 'Sources & method', 'Subscription'];

export const PHOTO_THUMBS = ['3 Jan', '12 Apr', '28 Jul'];
export const PHOTO_GRID = ['3 Jan', '1 Feb', '2 Mar', '12 Apr', '9 May', '20 Jun', '28 Jul', '9 Aug'];

// ─────────────────────────────────────────────────────────────
// Year in review
// ─────────────────────────────────────────────────────────────

export const YIR = {
  year: '2026',
  headline: 'You showed up 284 days this year.',
  numbers: [
    { v: '284', l: 'days logged' },
    { v: '31', l: 'longest streak' },
    { v: '2,146', l: 'doses taken' },
    { v: '4', l: 'limits caught' },
  ],
  photos: [
    { label: '3 Jan · first', tint: 'linear-gradient(160deg,rgba(200,121,65,0.20),rgba(255,255,255,0.05))' },
    { label: '1 Dec · most recent', tint: 'linear-gradient(160deg,rgba(200,121,65,0.28),rgba(255,255,255,0.06))' },
  ],
};

// ─────────────────────────────────────────────────────────────
// Add sheet — the six options behind [+]
// ─────────────────────────────────────────────────────────────

export const SHEET_ROWS = [
  {
    k: 'a',
    n: 'Scan barcode',
    d: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M6 8v8M9 8v8M12 8v8M15.5 8v8M18 8v8',
  },
  {
    k: 'b',
    n: 'Photograph label',
    d: 'M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z',
  },
  { k: 'c', n: 'Search', d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16.5 16.5 21 21' },
  { k: 'd', n: 'Enter manually', d: 'M4 20h16M6 16l10-10 3 3-10 10H6v-3Z' },
  { k: 'e', n: 'Add a protocol', d: 'M4 6h16M4 12h10M4 18h7M17 14v6M14 17h6' },
  {
    k: 'f',
    n: 'Add a progress photo',
    d: 'M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  },
];

// ─────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────

export const TABS = [
  { id: 'today', d: 'M4 11.5 12 4l8 7.5M6 10.5V20h12v-9.5', label: 'Today' },
  { id: 'stack', d: 'M4 7h16M4 12h16M4 17h16', label: 'Stack' },
  { id: 'analysis', d: 'M5 20V10M12 20V4M19 20v-7', label: 'Analysis' },
  { id: 'profile', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0', label: 'Profile' },
] as const;

// ─────────────────────────────────────────────────────────────
// Seeded pseudo-random grids (deterministic — same shape every reload)
// ─────────────────────────────────────────────────────────────

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/**
 * One day in the month-aligned ring calendar.
 *
 * A dot encodes one binary; a ring encodes a continuous ratio. `taken` against
 * `scheduled` is what the arc draws, so a 6-of-9 day and a 9-of-9 day are
 * visibly different rather than both being "partial".
 */
export interface CalendarDay {
  key: string;
  /** null = leading blank before the 1st */
  day: number | null;
  scheduled: number;
  taken: number;
  isToday: boolean;
  isFuture: boolean;
}

export const MONTH_LABEL = 'August';

/** August 2026, the month the whole demo is set in. Today is the 9th. */
export function monthCalendar(scheduled = 3): CalendarDay[] {
  const r = lcg(991);
  const first = new Date(2026, 7, 1).getDay();
  const cells: CalendarDay[] = [];
  for (let i = 0; i < first; i++) {
    cells.push({ key: 'pad' + i, day: null, scheduled: 0, taken: 0, isToday: false, isFuture: false });
  }
  for (let d = 1; d <= 31; d++) {
    const u = r();
    const isToday = d === 9;
    const isFuture = d > 9;
    let taken = 0;
    if (!isFuture && !isToday) {
      // perfect day · partial day · missed day
      taken = u > 0.62 ? scheduled : u > 0.12 ? Math.max(1, Math.round(u * scheduled)) : 0;
    }
    cells.push({ key: 'd' + d, day: d, scheduled, taken, isToday, isFuture });
  }
  return cells;
}

export const WEEKDAY_HEADS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


// ─────────────────────────────────────────────────────────────
// ob6b — recommendations, keyed by the goal chosen on ob6.
// Copy is verbatim from reco_reference.html. `f` is the capsule
// frame each card starts on, so no two capsules turn in sync.
// ─────────────────────────────────────────────────────────────

export interface RecoItem {
  id: string;
  /** product name — \u00a0 keeps "Copper + Zinc" from breaking mid-phrase */
  n: string;
  /** dose line */
  d: string;
  /**
   * Capsule frame, ONE-indexed to match capsule/frame_0001..0120 — use it
   * directly, subtract nothing. Chosen by light/dark BALANCE, not brightness:
   * frames 76-86 are 85% light so they read as a pale blob at this size.
   * Frames 3-13 and 55-65 are a true 50/50 split and read as a capsule.
   */
  f: number;
  /** the source frames are broadside horizontal; rot stands the pill up */
  rot: number;
  /** 4s = 120 frames at 30fps = exactly two refreshes a frame on 60Hz.
   *  Non-integer refresh multiples judder, and it is worse on camera.
   *  Stagger is by phase (negative delay), never by speed. */
  spin: string;
  delay: string;
  /** dose only. No time, no "with food" — scheduling is ob10's job. */
  doseOnly: string;
  /** the why prose, as HTML — <em> is the emphasis colour, not italics */
  w: string;
  /** where it lands in the day, once selected — shown from ob10 onward, never on ob6b */
  time: string;
  block: string;
  /** hour as a float, for ordering and for the Today arc's gaps */
  hour: number;
  /** shown on Stack and Item detail as a sentence, never a coloured badge */
  evidence: string;
  /** what it actually contributes to the audit */
  nutrients: { n: string; amt: number; u: string }[];
  /** the timing note — only appears once scheduled */
  timing: string;
  /** PROMPT_STACK3 §2, verbatim. Distinct from `w`, which is the ob6b card prose. */
  evidenceCopy: string;
  /** the one-line why on the fit card */
  short: string;
  /** a label trap worth surfacing on Item detail */
  labelNote?: string;
}

const SKIN_AND_HAIR: RecoItem[] = [
  {
    id: 'zinc-copper',
    n: 'Santa Cruz Copper&nbsp;+&nbsp;Zinc',
    d: '15 mg zinc · 1 mg copper · evening, with food',
    f: 8,
    rot: -74,
    spin: '4s',
    delay: '0s',
    doseOnly: '15 mg zinc · 1 mg copper',
    short: 'Most zinc pills leave out copper.',
    time: '9:00 PM',
    block: 'Evening, with food',
    hour: 21,
    evidence: 'Good if deficient',
    evidenceCopy:
      'People with hair loss tend to have lower zinc levels, but that’s an association. ' +
      'There’s no good evidence that topping up someone who already has enough does anything.',
    nutrients: [
      { n: 'Zinc', amt: 15, u: 'mg' },
      { n: 'Copper', amt: 1, u: 'mg' },
    ],
    timing:
      'With food — zinc on an empty stomach commonly causes nausea. Keep 2 hours clear of any iron supplement of 25 mg or more.',
    w: `<p>Target is 11 mg a day. Diets like yours land near 7. Zinc runs
      testosterone, skin repair and hair growth &mdash; but only moves in
      people who are actually short.</p>
     <p>Taken alone it blocks copper. <em>Only 4% of zinc supplements include
      copper.</em> This one does.</p>`,
  },
  {
    id: 'omega-3',
    n: 'Nordic Naturals Omega-3',
    d: '1,000 mg EPA + DHA · with lunch',
    f: 59,
    rot: 68,
    spin: '4s',
    delay: '-1.333s',
    doseOnly: '1,000 mg EPA + DHA',
    short: 'Real EPA and DHA on the label.',
    time: '1:00 PM',
    block: 'With lunch',
    hour: 13,
    evidence: 'Limited',
    evidenceCopy:
      'Reasonable evidence for inflammatory skin conditions. Little evidence it changes ' +
      'skin appearance in people who are already healthy.',
    nutrients: [{ n: 'EPA + DHA', amt: 1000, u: 'mg' }],
    timing:
      'Take with a meal containing some fat — improves absorption, and cuts the fishy burps.',
    labelNote:
      'A “1,000 mg fish oil” softgel usually contains only about 300 mg of actual EPA + DHA. This app tracks EPA + DHA, not total oil.',
    w: `<p>A &ldquo;1,000 mg fish oil&rdquo; softgel usually holds about 300 mg of
      the thing that actually matters. This one states EPA and DHA on the front.</p>
     <p><em>Take it with something fatty.</em> On an empty stomach you absorb
      less of it and burp the rest.</p>`,
  },
  {
    id: 'collagen',
    n: 'Vital Proteins Collagen',
    d: '10 g peptides · any time of day',
    f: 11,
    rot: -61,
    spin: '4s',
    delay: '-2.667s',
    doseOnly: '10 g peptides',
    short: 'Cheap and safe. Evidence is mixed.',
    time: '8:00 AM',
    block: 'Morning',
    hour: 8,
    evidence: 'Mixed',
    evidenceCopy:
      'Trials disagree. A 2023 meta-analysis found benefits for skin hydration and elasticity; ' +
      'a 2025 meta-analysis found the benefit appeared mainly in industry-funded trials and ' +
      'disappeared in high-quality independent ones. It’s safe and popular, but we’re not going ' +
      'to tell you it’s proven.',
    nutrients: [],
    timing: 'Any time of day works. Trials found no difference.',
    w: `<p>Two meta-analyses disagree. The benefit shows up in industry-funded
      trials and largely vanishes in independent ones.</p>
     <p><em>We&rsquo;re not going to tell you it&rsquo;s proven.</em> It&rsquo;s
      safe, it&rsquo;s cheap, and timing genuinely doesn&rsquo;t matter.</p>`,
  },
];

/**
 * Only Skin & hair is authored — the other seven goals fall back to it rather
 * than inventing evidence claims for conditions nobody has written copy for.
 */
export const RECOMMENDATIONS_BY_GOAL: Record<string, RecoItem[]> = {
  'Skin & hair': SKIN_AND_HAIR,
};

/** Last resort, so no code path can hand ob6b an empty list. */
export const FALLBACK_RECOMMENDATIONS = SKIN_AND_HAIR;

export function recommendationsFor(goal: string): RecoItem[] {
  return RECOMMENDATIONS_BY_GOAL[goal] ?? SKIN_AND_HAIR;
}

/** ob6b — the ones the engine rejected. */
export const LEFT_OUT = {
  title: 'The six we left out',
  names: 'Biotin, saw palmetto, keratin, silica, MSM, selenium.',
  body: 'Either you already get enough, or nobody has shown it works.',
};

// ─────────────────────────────────────────────────────────────
// The product the user already takes, entered during ob3. Every
// over-limit finding comes from here, never from what we recommend.
// Figures per serving.
// ─────────────────────────────────────────────────────────────

export const USER_GUMMY = {
  name: 'Hair, Skin & Nails gummy',
  nutrients: [
    { n: 'Biotin', amt: 10000, u: 'mcg' },
    { n: 'Selenium', amt: 200, u: 'mcg' },
    { n: 'Zinc', amt: 30, u: 'mg' },
    { n: 'Vitamin A', amt: 1500, u: 'mcg' },
  ],
};

/** Reference intakes, NIH ODS. `ul: null` means no upper limit has been set. */
export const REFERENCE: Record<string, { rda: number; ul: number | null; u: string; aiOnly?: boolean }> = {
  Zinc: { rda: 11, ul: 40, u: 'mg' },
  Copper: { rda: 0.9, ul: 10, u: 'mg' },
  Selenium: { rda: 55, ul: 400, u: 'mcg' },
  'Vitamin A': { rda: 900, ul: 3000, u: 'mcg' },
  // Biotin has an Adequate Intake of 30 mcg, not an RDA, and no upper limit —
  // there is no evidence it is toxic. Never render this as a ceiling breach.
  Biotin: { rda: 30, ul: null, u: 'mcg', aiOnly: true },
  'EPA + DHA': { rda: 250, ul: null, u: 'mg' },
};

export const DISCLAIMER =
  'Reference intakes from the NIH Office of Dietary Supplements. This is arithmetic on labels, not medical advice.';
