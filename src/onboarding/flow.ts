/**
 * The order of the flow, in one place.
 *
 * Every screen reads its position from this array — the progress bar, the back
 * chevron and the next/previous transitions all derive from the index. Moving a
 * string moves the screen; no screen component knows what comes before or after
 * it.
 */
export const FLOW = [
  'welcome',
  'auth-choice',
  'auth-form',
  'profile',
  'info-library',
  'info-recs',
  'q1',
  'q2',
  'q3',
  'sleep',
  'meals',
  'current-stack',
  'goals',
  'notifications',
  'paywall',
  'building-recs',
  'recommendations',
  'building-schedule',
  'schedule',
  'done',
] as const;

export type Step = (typeof FLOW)[number];

/** Skip is offered on the three survey questions and nowhere else. */
export const SKIPPABLE: ReadonlySet<Step> = new Set<Step>(['q1', 'q2', 'q3']);

/** Welcome carries no chrome at all — no wordmark, no progress, no back. */
export const NO_CHROME: ReadonlySet<Step> = new Set<Step>(['welcome']);

/**
 * The two loading screens and the final confirmation drive themselves, so the
 * back chevron would strand the user mid-generation.
 */
export const NO_BACK: ReadonlySet<Step> = new Set<Step>([
  'welcome',
  'building-recs',
  'building-schedule',
  'done',
]);

export const indexOfStep = (s: Step): number => FLOW.indexOf(s);

export function nextStep(s: Step): Step | null {
  const i = FLOW.indexOf(s);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

export function prevStep(s: Step): Step | null {
  const i = FLOW.indexOf(s);
  return i > 0 ? FLOW[i - 1] : null;
}
