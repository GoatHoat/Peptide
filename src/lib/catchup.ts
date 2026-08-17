import { toISODate } from './date';
import { readScoped, writeScoped } from './storage';

/**
 * Which doses the catch-up screen has already put in front of somebody today.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS. `getMissedSince` used to filter on "came due since you last
 * looked", which quietly consumed a dose: open the app at 08:05 without ticking
 * the 08:00, and the stamp moves to 08:05, so at noon the 08:00 is no longer
 * "since" and is invisible for the rest of the day — unmarked, overdue, and
 * unreachable from this screen.
 *
 * The right window is "unmarked and past due". But that alone would show the
 * screen on every launch until everything is ticked, and a screen that appears
 * every time you open the app is one people learn to dismiss without reading.
 *
 * So the window is honest and this is the rate limit: a dose is offered at most
 * once a day. Not "once ever" — tomorrow it is a new dose row and a new day.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Local storage rather than a table: it is a nag limit, not a record. It does
 * not need to survive a reinstall, and losing it costs one extra prompt.
 */
const KEY = 'pepstack.catchup.shown.v1';

interface Shown {
  /** the day these ids belong to; a different day discards them */
  date: string;
  ids: string[];
}

function read(userId: string | null, today: Date): Shown {
  const stored = readScoped<Shown | null>(KEY, userId, null);
  const date = toISODate(today);
  /* A marker from yesterday is not a marker. Discarding on read rather than
     pruning on write is what makes "it does not reappear the next day" and "it
     does reappear the next day if still unticked" both true without a job. */
  if (!stored || stored.date !== date || !Array.isArray(stored.ids)) return { date, ids: [] };
  return stored;
}

/** The ids already offered today. */
export function shownToday(userId: string | null, today: Date): Set<string> {
  return new Set(read(userId, today).ids);
}

/** Remember that these were offered, so they are not offered again today. */
export function markShown(userId: string | null, ids: string[], today: Date): void {
  if (ids.length === 0) return;
  const current = read(userId, today);
  const merged = [...new Set([...current.ids, ...ids])];
  writeScoped<Shown>(KEY, userId, { date: current.date, ids: merged });
}
