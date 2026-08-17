import { addDays, toISODate } from './date';

export type ComplianceMap = Record<string, { total: number; taken: number }>;

/**
 * Consecutive days, ending today, on which every scheduled dose was taken.
 *
 * Lived in `screens/You.tsx`. It moved here because the notification copy needs
 * the same number, and two implementations of "what counts as a streak" would
 * drift — the banner would congratulate somebody the You screen had already
 * reset to zero.
 *
 * Today not being finished yet does not break the streak: the count starts from
 * yesterday in that case, because it is 9am and nobody has taken anything.
 */
export function computeStreak(compliance: ComplianceMap, today: Date): number {
  const isComplete = (iso: string) => {
    const c = compliance[iso];
    /* A day with nothing scheduled is not a completed day. `taken === total`
       would be vacuously true for it and would bridge two real streaks across
       a gap the person did not earn. */
    return !!c && c.total > 0 && c.taken === c.total;
  };
  let cursor = today;
  if (!isComplete(toISODate(today))) cursor = addDays(today, -1);
  let count = 0;
  while (isComplete(toISODate(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
