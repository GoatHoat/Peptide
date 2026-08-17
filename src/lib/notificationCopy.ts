/**
 * The pure half of reminders: ids, grouping and copy.
 *
 * Split out of `notifications.ts` for the same reason `supabase/functions/ask`
 * is split — that file imports the Capacitor plugin and `lib/api`, neither of
 * which exists in Node, so nothing in it can be unit tested. Everything here is
 * a function of its arguments, and `tests/unit/notifications.spec.ts` holds all
 * of it without a device.
 *
 * `notifications.ts` re-exports these, so callers import from one place.
 */

/**
 * The action type every dose reminder carries. Registered once at startup;
 * `actionTypeId` on a notification is what makes the buttons appear on the
 * banner, and a notification scheduled before the type is registered shows no
 * buttons at all.
 */
export const DOSE_BLOCK_ACTIONS = 'DOSE_BLOCK';

/** What travels on the notification and comes back on the tap. */
export interface DoseBlockPayload {
  kind: 'dose-block';
  /** HH:MM, the block this reminder is for */
  time: string;
  /** null on the daily repeat — the day is whatever day it fires */
  date: string | null;
}

/**
 * Stable 32-bit int, so a resync replaces a notification rather than adding a
 * second one beside it.
 *
 * Hashed from the user and the **time**, not from a schedule item. That
 * changed with the grouping: one notification now covers every item in a
 * block, so an id derived from an item id would move the moment somebody added
 * a second product to 08:00 — and the old notification, keyed to the old hash,
 * would survive the resync and fire alongside the new one.
 */
export function idForBlock(userId: string, time: string): number {
  const key = `${userId}@${time}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}

/** HH:MM from a HH:MM:SS the database hands back. */
export const blockTime = (scheduledTime: string): string => scheduledTime.slice(0, 5);

/**
 * The two lines on the banner.
 *
 * Exported and pure so `tests/unit/notifications.spec.ts` can hold the copy
 * without a device.
 *
 * iOS truncates the body in the banner, so the half that has to survive comes
 * first — "Tap to log your dose for the day" reads correctly cut off, and a
 * sentence that opens with the streak does not. No exclamation mark: CLAUDE.md
 * rules it out, and a line that arrives every morning wears its enthusiasm out
 * inside a week.
 */
export function blockCopy(
  time: string,
  names: string[],
  streak: number,
): { title: string; body: string } {
  const title = names.length === 1 ? `Time for ${names[0]}` : `Time for your ${time}`;
  const body =
    streak > 0
      ? 'Let’s continue your streak. Tap to log your dose for the day.'
      : 'Let’s kick off your streak. Tap to log your dose for the day.';
  return { title, body };
}

/**
 * Every timed item, gathered into one entry per time.
 *
 * Three things at 08:00 used to be three notifications firing together, which
 * is the fastest way to get somebody to switch them off entirely.
 */
export function groupByTime(
  /* Structurally typed rather than importing ScheduleItem, so this file stays
     free of `lib/api` and therefore of the Supabase client. */
  items: { name: string; scheduled_time: string | null }[],
): { time: string; names: string[] }[] {
  const byTime = new Map<string, string[]>();
  for (const item of items) {
    if (!item.scheduled_time) continue;
    const time = blockTime(item.scheduled_time);
    const names = byTime.get(time) ?? [];
    names.push(item.name);
    byTime.set(time, names);
  }
  return [...byTime.entries()]
    .map(([time, names]) => ({ time, names }))
    .sort((a, b) => a.time.localeCompare(b.time));
}
