import { expect, test } from '@playwright/test';
import {
  checkPlacement,
  type DayContext,
  type ScheduledItem,
} from '../../src/lib/conflicts';

/**
 * The conflict rules, in Node. No browser and no database — these are pure and
 * they are where a wrong answer is invisible rather than a blank screen.
 *
 * The case that drove the rewrite is first: a multivitamin whose name says
 * nothing about its contents, next to an iron capsule. Before ingredients
 * existed this produced no conflict at all.
 */

const CTX: DayContext = { mealTimes: ['08:00', '13:00', '19:00'], sleepTime: '23:00' };

/** Klean Athlete Klean Multivitamin, as its DSLD panel actually reads. */
const MULTIVITAMIN: ScheduledItem = {
  id: 'multi',
  name: 'Klean Athlete Klean Multivitamin',
  time: '08:00',
  ingredients: [
    { key: 'zinc', raw_name: 'Zinc', amount: 15, unit: 'mg' },
    { key: 'calcium', raw_name: 'Calcium', amount: 50, unit: 'mg' },
    { key: 'magnesium', raw_name: 'Magnesium', amount: 25, unit: 'mg' },
    { key: 'copper', raw_name: 'Copper', amount: 1, unit: 'mg' },
    { key: 'vitamin-d', raw_name: 'Vitamin D', amount: 25, unit: 'mcg' },
  ],
};

/** Thorne Iron Bisglycinate. Its panel prints the iron as "Ferrochel". */
const IRON: ScheduledItem = {
  id: 'iron',
  name: 'Thorne Iron Bisglycinate',
  time: '08:00',
  ingredients: [{ key: 'iron', raw_name: 'Ferrochel', amount: 25, unit: 'mg' }],
};

test('the multivitamin case: a hidden ingredient raises a conflict', () => {
  const v = checkPlacement(MULTIVITAMIN, '08:00', [IRON], CTX);
  const zinc = v.find((x) => x.ingredient === 'zinc');
  expect(zinc, 'zinc/iron must be caught even though neither name says so').toBeTruthy();
  expect(zinc!.severity).toBe('block');
  // names both products and the amount, because the user cannot see inside one
  expect(zinc!.message).toContain('Klean Athlete Klean Multivitamin');
  expect(zinc!.message).toContain('Thorne Iron Bisglycinate');
  expect(zinc!.message).toContain('15');
  expect(zinc!.message).toContain('zinc');
});

test('and it is symmetric — moving the iron onto the multivitamin is the same conflict', () => {
  const v = checkPlacement(IRON, '08:00', [MULTIVITAMIN], CTX);
  expect(v.some((x) => x.severity === 'block')).toBe(true);
});

test('two hours apart is not a conflict', () => {
  const v = checkPlacement(MULTIVITAMIN, '08:00', [{ ...IRON, time: '10:00' }], CTX);
  expect(v.filter((x) => x.ingredient === 'zinc')).toHaveLength(0);
});

test('a trace amount of iron does not block a zinc capsule', () => {
  /* 2 mg is a token amount in a multivitamin. The interaction is documented at
     supplemental doses, and firing below them would move a schedule for a
     reason that is not real. */
  const traceIron: ScheduledItem = {
    id: 'trace',
    name: 'Some Multivitamin',
    time: '08:00',
    ingredients: [{ key: 'iron', raw_name: 'Iron', amount: 2, unit: 'mg' }],
  };
  const zinc: ScheduledItem = {
    id: 'zinc',
    name: 'Thorne Zinc Picolinate 30 mg',
    time: '08:00',
    ingredients: [{ key: 'zinc', raw_name: 'Zinc', amount: 30, unit: 'mg' }],
  };
  expect(checkPlacement(zinc, '08:00', [traceIron], CTX)).toHaveLength(0);
});

test('a product with no panel still falls back to its name', () => {
  // nothing backfilled, or typed by hand — it must not silently stop being checked
  const named: ScheduledItem = { id: 'a', name: 'Zinc Picolinate', time: '08:00' };
  const iron: ScheduledItem = { id: 'b', name: 'Iron Bisglycinate', time: '08:00' };
  const v = checkPlacement(named, '08:00', [iron], CTX);
  expect(v.some((x) => x.severity === 'block')).toBe(true);
});

test('an unmapped ingredient never fires a rule', () => {
  /* A null key means the printed string could not be mapped. Guessing would
     move someone's schedule for a reason that does not exist. */
  const unknown: ScheduledItem = {
    id: 'x',
    name: 'Mystery Blend',
    time: '08:00',
    ingredients: [{ key: null, raw_name: 'Sibelius', amount: null, unit: null }],
  };
  expect(checkPlacement(unknown, '08:00', [IRON], CTX)).toHaveLength(0);
});

test('omega-3 away from every meal is blocked, and next to one is fine', () => {
  const fish: ScheduledItem = {
    id: 'o',
    name: 'Klean Athlete Klean Omega',
    time: '15:30',
    ingredients: [{ key: 'omega-3', raw_name: 'Total Omega-3', amount: 1000, unit: 'mg' }],
  };
  expect(checkPlacement(fish, '15:30', [], CTX).some((v) => v.severity === 'block')).toBe(true);
  expect(checkPlacement(fish, '13:00', [], CTX).some((v) => v.severity === 'block')).toBe(false);
});

test('fibre is kept away from everything, in either direction', () => {
  const psyllium: ScheduledItem = {
    id: 'f',
    name: 'Vitamin World Psyllium Husk',
    time: '08:00',
    ingredients: [{ key: 'psyllium', raw_name: 'Psyllium Husk', amount: 500, unit: 'mg' }],
  };
  expect(checkPlacement(psyllium, '08:00', [IRON], CTX).length).toBeGreaterThan(0);
  expect(checkPlacement(IRON, '08:00', [psyllium], CTX).length).toBeGreaterThan(0);
  // two fibres together are nobody's problem
  const inulin: ScheduledItem = {
    id: 'g',
    name: 'Swanson Inulin',
    time: '08:00',
    ingredients: [{ key: 'inulin', raw_name: 'Inulin', amount: 2, unit: 'g' }],
  };
  expect(checkPlacement(psyllium, '08:00', [inulin], CTX)).toHaveLength(0);
});

test('the same pair is reported once, not once per matching rule', () => {
  const v = checkPlacement(MULTIVITAMIN, '08:00', [IRON], CTX);
  const messages = new Set(v.map((x) => x.message));
  expect(messages.size).toBe(v.length);
});
