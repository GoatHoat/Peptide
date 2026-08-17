import { SKIP_PAYWALL } from '../lib/billing';

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
  // one screen, not two: email is the only way in, so a chooser offering
  // providers that were never switched on had a single live control meaning
  // "next". See screens/Intro.tsx.
  'auth',
  'profile',
  // diet is profile information, and it wants to sit next to age and sex
  'diet',
  // one explainer, not two consecutive ones
  'info',
  /* q1 — "how many are you taking right now" — is gone. `current-stack` asks
     the same thing four screens later and gets a list the scorer actually
     reads, where q1's count was written down and never read again. The two
     that remain keep their ids: they are persisted under `survey` in
     localStorage, and renumbering them would drop the answers of anyone
     part-way through the flow when the build updates under them. */
  'q2',
  'q3',
  // the sleep window and the meals were "your day, part one" and "part two"
  'day',
  'current-stack',
  // both read as follow-ups to "what are you already taking", which is where
  // someone is already thinking about what they have tried
  'reactions',
  'forms',
  'goals',
  'notifications',
  'building-recs',
  'recommendations',
  // after the recommendations, never before: asking for money ahead of the
  // first suggestion is asking someone to buy a promise
  'paywall',
  /* Only reached by choosing Free. Free covers one product and the person has
     just selected several, so this is where they say which one — with the
     others still on screen and marked as Pro, never silently dropped. Skipped
     entirely when they subscribe; see Onboarding's `next`. */
  'free-pick',
  'building-schedule',
  'schedule',
  'done',
] as const;

export type Step = (typeof FLOW)[number];

/**
 * Skip is offered on the questions and nowhere else. Every one of these has to
 * be answerable with nothing selected: a skip means the same thing as "no
 * preference", never an empty recommendation list.
 */
export const SKIPPABLE: ReadonlySet<Step> = new Set<Step>([
  'q2',
  'q3',
  'diet',
  'reactions',
  'forms',
]);

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

/**
 * Steps that do not apply given what has been answered so far.
 *
 * Branching lives here rather than inside the screens, so the flow array stays
 * the single description of the order and a screen still never knows what
 * comes before or after it. Evaluated live on every move, so going back and
 * changing an answer re-opens whatever it closed.
 */
export function isSkipped(
  step: Step,
  answers: { q2: string | null; subscribed?: boolean; pickedCount?: number },
): boolean {
  // "What usually goes wrong?" has no answer for someone who has never
  // started a routine in the first place.
  if (step === 'q3' && answers.q2 === 'never') return true;
  // Dev builds walk past the purchase so the screens after it stay reachable
  // without stubbing a transaction every run. Here rather than in a screen, so
  // going back lands on the same screen going forward came from.
  if (step === 'paywall' && SKIP_PAYWALL) return true;
  /* Free covers one product, so the choice only exists for somebody on Free who
     picked more than one. A subscriber keeps everything they chose and is never
     shown it; somebody who picked a single product has nothing to choose
     between. */
  if (step === 'free-pick') {
    if (answers.subscribed) return true;
    if ((answers.pickedCount ?? 0) <= 1) return true;
  }
  return false;
}

export function nextStep(s: Step): Step | null {
  const i = FLOW.indexOf(s);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}

export function prevStep(s: Step): Step | null {
  const i = FLOW.indexOf(s);
  return i > 0 ? FLOW[i - 1] : null;
}
