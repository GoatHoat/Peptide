import { expect, test } from '@playwright/test';
import { ARC_BOX, ARC_PAINTED, windowFor, type ArcDose } from '../../src/components/Arc';

/**
 * The Today arc: the box it paints inside, and the hours it spans.
 *
 * Both halves of this were silent. The end caps were sliced flat because the
 * path was drawn to the exact edge of a viewBox that then had to hold another
 * 4.5px of round cap; and a dose outside the waking day was dragged onto the
 * end of it and labelled with the wrong time. Neither throws, neither logs,
 * and both are visible only if you know what the arc is meant to look like.
 */

let seq = 0;
const dose = (hour: number, taken = false): ArcDose => ({ id: `d${++seq}`, hour, taken });

/* ── the box ──────────────────────────────────────────────────────────── */

test('the stroke, caps included, fills the viewBox and does not leave it', () => {
  // The whole point of deriving R from W: the arc is exactly as wide as the
  // box. Wider clips the caps flat, narrower shrinks the artwork.
  expect(ARC_PAINTED.left).toBeCloseTo(0, 6);
  expect(ARC_PAINTED.right).toBeCloseTo(ARC_BOX.w, 6);
  expect(ARC_PAINTED.top).toBeCloseTo(0, 6);
  expect(ARC_PAINTED.bottom).toBeLessThanOrEqual(ARC_BOX.h);
});

test('the box is tall enough for the ends', () => {
  // H is ceil()ed, so this is a hair — but it is a hair the hardcoded radius
  // did not have: 0.13px, and only until some rounding moved.
  expect(ARC_BOX.h - ARC_PAINTED.bottom).toBeGreaterThan(0);
  expect(ARC_BOX).toMatchObject({ w: 368, h: 69 });
});

/* ── the window ───────────────────────────────────────────────────────── */

test('with no doses the arc is the waking day', () => {
  expect(windowFor([], 7, 23)).toMatchObject({ start: 7, end: 23 });
});

test('doses inside the waking day leave it alone', () => {
  expect(windowFor([dose(8), dose(13), dose(22)], 7, 23)).toMatchObject({ start: 7, end: 23 });
});

test('a dose before waking widens the start rather than stacking on it', () => {
  expect(windowFor([dose(6), dose(8)], 7, 23).start).toBe(6);
});

test('a dose after bedtime widens the end', () => {
  expect(windowFor([dose(8), dose(23.5)], 7, 23).end).toBe(23.5);
});

test('the widest dose wins at each end', () => {
  expect(windowFor([dose(5.5), dose(6), dose(23.5), dose(23.25)], 7, 23)).toMatchObject({
    start: 5.5,
    end: 23.5,
  });
});

test('a bedtime past midnight ends the day at midnight, not before breakfast', () => {
  // 00:30 is a smaller number than 07:00. Read literally it is a span of minus
  // six and a half hours, which drew every dose of the day as one segment.
  expect(windowFor([dose(8), dose(23)], 7, 0.5)).toMatchObject({ start: 7, end: 24 });
});

test('a bedtime of exactly midnight is the end of the day, not the start', () => {
  expect(windowFor([dose(20)], 7, 0)).toMatchObject({ start: 7, end: 24 });
});

test('a dose after a midnight bedtime is the start of the day, as the list has it', () => {
  // The timeline under the arc orders by scheduled_time, so 00:15 is the first
  // row of the day. The arc has to agree with it.
  expect(windowFor([dose(0.25), dose(20)], 7, 0.5)).toMatchObject({ start: 0.25, end: 24 });
});

test('the end is always past the start, whatever the profile says', () => {
  for (const [a, b] of [[7, 23], [7, 0.5], [23, 7], [9, 9], [0, 0]]) {
    const w = windowFor([], a, b);
    expect(w.end, `${a}..${b}`).toBeGreaterThan(w.start);
  }
});

test('an unparseable time cannot take the window with it', () => {
  expect(windowFor([dose(NaN), dose(9)], 7, 23)).toMatchObject({ start: 7, end: 23 });
});
