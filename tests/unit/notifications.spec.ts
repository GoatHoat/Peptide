import { expect, test } from '@playwright/test';
import { blockCopy, blockTime, groupByTime, idForBlock } from '../../src/lib/notificationCopy';
import { computeStreak } from '../../src/lib/streak';

/** The two fields grouping reads. Structural, so this file needs no api types. */
type ScheduleItem = { id: string; name: string; scheduled_time: string | null };

/**
 * The half of the notification work that does not need a phone.
 *
 * Grouping, ids and copy are pure functions precisely so they can be held here:
 * everything else in that module talks to the plugin, and the plugin only
 * exists on a device. What a browser cannot check is listed in
 * `NOTIFICATIONS.md` rather than asserted vaguely.
 */

const item = (over: Partial<ScheduleItem>): ScheduleItem =>
  ({
    id: 'x',
    user_id: 'u',
    name: 'Thing',
    amount: '1 capsule',
    scheduled_time: '08:00:00',
    active: true,
    glossary_id: null,
    start_date: null,
    ...over,
  }) as ScheduleItem;

/* ── one notification per time ───────────────────────────────────────── */

test('three things at the same time are one block, not three', () => {
  const blocks = groupByTime([
    item({ id: 'a', name: 'Magnesium' }),
    item({ id: 'b', name: 'Zinc' }),
    item({ id: 'c', name: 'Vitamin D' }),
  ]);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].time).toBe('08:00');
  expect(blocks[0].names).toEqual(['Magnesium', 'Zinc', 'Vitamin D']);
});

test('different times are different blocks, in order', () => {
  const blocks = groupByTime([
    item({ id: 'a', scheduled_time: '21:00:00' }),
    item({ id: 'b', scheduled_time: '08:00:00' }),
    item({ id: 'c', scheduled_time: '13:30:00' }),
  ]);
  expect(blocks.map((b) => b.time)).toEqual(['08:00', '13:30', '21:00']);
});

test('an item with no time is not a reminder', () => {
  expect(groupByTime([item({ scheduled_time: null })])).toEqual([]);
});

test('seconds are dropped, so 08:00:00 and 08:00 are the same block', () => {
  expect(blockTime('08:00:00')).toBe('08:00');
  const blocks = groupByTime([
    item({ id: 'a', scheduled_time: '08:00:00' }),
    item({ id: 'b', scheduled_time: '08:00' }),
  ]);
  expect(blocks).toHaveLength(1);
});

/* ── the id, which is what makes a resync a replace ──────────────────── */

test('the id is stable for a user and a time', () => {
  expect(idForBlock('user-1', '08:00')).toBe(idForBlock('user-1', '08:00'));
});

test('the id does not move when a second product joins the block', () => {
  /* The point of hashing the time rather than a schedule item: if the id
     followed the items, adding a product to 08:00 would change it, and the old
     notification would survive the resync and fire alongside the new one. */
  const before = groupByTime([item({ id: 'a' })]);
  const after = groupByTime([item({ id: 'a' }), item({ id: 'b', name: 'Zinc' })]);
  expect(idForBlock('u', after[0].time)).toBe(idForBlock('u', before[0].time));
});

test('two people and two times are four different notifications', () => {
  const ids = new Set([
    idForBlock('user-1', '08:00'),
    idForBlock('user-1', '21:00'),
    idForBlock('user-2', '08:00'),
    idForBlock('user-2', '21:00'),
  ]);
  expect(ids.size).toBe(4);
});

test('the id is a positive 32-bit int, which is what the plugin takes', () => {
  for (const time of ['00:00', '08:00', '13:30', '23:59']) {
    const id = idForBlock('00000000-0000-4000-8000-0000000000a1', time);
    expect(Number.isInteger(id)).toBe(true);
    expect(id).toBeGreaterThan(0);
    expect(id).toBeLessThan(2 ** 31);
  }
});

/* ── the copy ────────────────────────────────────────────────────────── */

test('one product is named, several are not', () => {
  expect(blockCopy('08:00', ['Thorne Magnesium Bisglycinate'], 0).title).toBe(
    'Time for Thorne Magnesium Bisglycinate',
  );
  expect(blockCopy('08:00', ['Magnesium', 'Zinc'], 0).title).toBe('Time for your 08:00');
});

test('the streak decides the verb, and only the verb', () => {
  expect(blockCopy('08:00', ['A'], 3).body).toContain('continue your streak');
  expect(blockCopy('08:00', ['A'], 0).body).toContain('kick off your streak');
});

test('the useful half of the body survives being truncated', () => {
  /* iOS cuts the body in the banner. "Tap to log your dose" has to be readable
     in what is left, so the streak clause cannot run long in front of it. */
  for (const streak of [0, 5]) {
    const { body } = blockCopy('08:00', ['A'], streak);
    expect(body.indexOf('Tap to log your dose')).toBeLessThan(40);
    expect(body).toContain('Tap to log your dose for the day.');
  }
});

test('no notification copy carries an exclamation mark', () => {
  for (const streak of [0, 1, 99]) {
    const { title, body } = blockCopy('08:00', ['A', 'B'], streak);
    expect(title + body).not.toContain('!');
  }
});

/* ── the streak the copy is chosen from ──────────────────────────────── */

const day = (iso: string, total: number, taken: number) => [iso, { total, taken }] as const;

test('a streak is consecutive complete days ending today', () => {
  const today = new Date('2026-08-17T09:00:00');
  const compliance = Object.fromEntries([
    day('2026-08-17', 2, 2),
    day('2026-08-16', 2, 2),
    day('2026-08-15', 2, 2),
  ]);
  expect(computeStreak(compliance, today)).toBe(3);
});

test('today being unfinished does not break the streak', () => {
  const today = new Date('2026-08-17T09:00:00');
  const compliance = Object.fromEntries([day('2026-08-17', 2, 0), day('2026-08-16', 2, 2)]);
  expect(computeStreak(compliance, today)).toBe(1);
});

test('a day with nothing scheduled does not bridge two streaks', () => {
  const today = new Date('2026-08-17T09:00:00');
  const compliance = Object.fromEntries([
    day('2026-08-17', 1, 1),
    day('2026-08-16', 0, 0),
    day('2026-08-15', 1, 1),
  ]);
  expect(computeStreak(compliance, today)).toBe(1);
});

test('a missed day ends it', () => {
  const today = new Date('2026-08-17T09:00:00');
  const compliance = Object.fromEntries([day('2026-08-17', 2, 1), day('2026-08-16', 2, 1)]);
  expect(computeStreak(compliance, today)).toBe(0);
});
