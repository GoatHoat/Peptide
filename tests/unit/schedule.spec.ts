import { expect, test } from '@playwright/test';
import {
  anchorFor,
  blocksFor,
  MAX_BLOCKS,
  solve,
  type DayShape,
  type SolverItem,
} from '../../src/lib/schedule';
import { toMinutes } from '../../src/lib/conflicts';

/**
 * The solver, in Node. Table-driven, per PROMPT_V2.md section 4.
 *
 * The cases that matter are the ones where "reasonable" and "correct" come
 * apart: a day with one meal, a waking window that crosses midnight, and a
 * twelve-item stack where the right answer is fewer blocks rather than better
 * spacing.
 */

const DAY: DayShape = {
  wake: '07:00',
  sleep: '23:00',
  meals: [
    { id: 'breakfast', name: 'Breakfast', time: '08:00' },
    { id: 'lunch', name: 'Lunch', time: '13:00' },
    { id: 'dinner', name: 'Dinner', time: '19:00', largest: true },
  ],
};

const item = (id: string, name: string, keys: [string, number | null][]): SolverItem => ({
  id,
  name,
  ingredients: keys.map(([key, amount]) => ({ key, amount, unit: 'mg' })),
});

const IRON = item('iron', 'Thorne Iron Bisglycinate', [['iron', 25]]);
const ZINC = item('zinc', 'Thorne Zinc Picolinate', [['zinc', 30]]);
const CALCIUM = item('cal', 'Nutricology Calcium Citrate', [['calcium', 500]]);
const OMEGA = item('omega', 'Klean Omega', [['omega-3', 1000]]);
const MAGNESIUM = item('mag', 'Thorne Magnesium Bisglycinate', [['magnesium', 200]]);

const blockOf = (sol: ReturnType<typeof solve>, id: string) =>
  sol.placements.find((p) => p.itemId === id)!.blockId;

test('iron, zinc and calcium never share a block', () => {
  const sol = solve([IRON, ZINC, CALCIUM], DAY);
  const seats = [blockOf(sol, 'iron'), blockOf(sol, 'zinc'), blockOf(sol, 'cal')];
  expect(new Set(seats).size, `all three landed in ${seats}`).toBe(3);
});

test('and the gaps between them are real, not just different names', () => {
  const sol = solve([IRON, ZINC, CALCIUM], DAY);
  const at = (id: string) => toMinutes(sol.blocks.find((b) => b.id === blockOf(sol, id))!.time);
  expect(Math.abs(at('iron') - at('zinc'))).toBeGreaterThanOrEqual(120);
  expect(Math.abs(at('zinc') - at('cal'))).toBeGreaterThanOrEqual(120);
});

test('a fat-soluble item lands on the largest meal', () => {
  const sol = solve([OMEGA], DAY);
  expect(anchorFor(OMEGA)).toBe('with_fat');
  expect(blockOf(sol, 'omega')).toBe('dinner');
  expect(sol.placements[0].reason).toContain('fat');
});

test('an empty-stomach item never lands within 30 minutes of a meal', () => {
  const sol = solve([IRON], DAY);
  const at = toMinutes(sol.blocks.find((b) => b.id === blockOf(sol, 'iron'))!.time);
  for (const m of DAY.meals) {
    expect(Math.abs(at - toMinutes(m.time)), `too close to ${m.name}`).toBeGreaterThan(30);
  }
});

test('magnesium goes to the wind-down', () => {
  const sol = solve([MAGNESIUM], DAY);
  expect(anchorFor(MAGNESIUM)).toBe('evening');
  expect(blockOf(sol, 'mag')).toBe('winddown');
});

test('a twelve-item stack produces four blocks or fewer', () => {
  const stack: SolverItem[] = [
    IRON,
    ZINC,
    CALCIUM,
    OMEGA,
    MAGNESIUM,
    item('c', 'Vitamin C', [['vitamin-c', 500]]),
    item('d', 'Vitamin D3', [['vitamin-d', 25]]),
    item('b12', 'Vitamin B12', [['vitamin-b12', 1]]),
    item('cr', 'Creatine', [['creatine', 5000]]),
    item('q', 'Quercetin', [['quercetin', 500]]),
    item('cur', 'Curcumin', [['curcumin', 1000]]),
    item('pro', 'Probiotic', [['probiotic', null]]),
  ];
  const sol = solve(stack, DAY);
  expect(sol.placements).toHaveLength(12);
  expect(sol.used.length, `used ${sol.used.map((b) => b.name)}`).toBeLessThanOrEqual(MAX_BLOCKS);
});

test('a user with one meal a day still gets a valid schedule', () => {
  const oneMeal: DayShape = {
    wake: '10:00',
    sleep: '02:00',
    meals: [{ id: 'dinner', name: 'Dinner', time: '18:00', largest: true }],
  };
  const sol = solve([IRON, ZINC, OMEGA, MAGNESIUM], oneMeal);
  expect(sol.placements).toHaveLength(4);
  // the fat-soluble one has exactly one meal to go to, and it must take it
  expect(blockOf(sol, 'omega')).toBe('dinner');
  expect(sol.used.length).toBeGreaterThan(0);
});

test('an overnight waking window does not crash or produce a negative day', () => {
  const overnight: DayShape = {
    wake: '23:00',
    sleep: '07:00',
    meals: [{ id: 'meal', name: 'Meal', time: '02:00' }],
  };
  const sol = solve([IRON, ZINC, MAGNESIUM], overnight);
  expect(sol.placements).toHaveLength(3);
  for (const b of sol.blocks) {
    expect(b.time, `block time ${b.time} is not a clock time`).toMatch(/^\d\d:\d\d$/);
  }
});

test('every placement carries a reason, and none is generic filler', () => {
  const sol = solve([IRON, ZINC, CALCIUM, OMEGA, MAGNESIUM], DAY);
  for (const p of sol.placements) {
    expect(p.reason.length, `${p.itemId} has no reason`).toBeGreaterThan(10);
    expect(p.reason).not.toBe('');
    // a reason has to name the block it is talking about
    const block = sol.blocks.find((b) => b.id === p.blockId)!;
    expect(
      p.reason.toLowerCase().includes(block.name.toLowerCase()),
      `${p.itemId}: "${p.reason}" does not name ${block.name}`,
    ).toBe(true);
  }
});

test('a compromise is stated rather than hidden', () => {
  /* Three items that all want to be away from each other, in a day with one
     anchor. Something has to give, and the solver has to say so. */
  const cramped: DayShape = {
    wake: '08:00',
    sleep: '09:00',
    meals: [{ id: 'meal', name: 'Meal', time: '08:30' }],
  };
  const sol = solve([IRON, ZINC, CALCIUM], cramped);
  expect(sol.placements).toHaveLength(3);
  expect(sol.placements.some((p) => p.compromise), 'no compromise was reported').toBe(true);
});

test('blocks collapse when a meal lands on the wake time', () => {
  const day: DayShape = {
    wake: '07:00',
    sleep: '23:00',
    meals: [{ id: 'breakfast', name: 'Breakfast', time: '07:00' }],
  };
  const blocks = blocksFor(day);
  const times = blocks.map((b) => b.time);
  expect(new Set(times).size, 'a duplicate time became two blocks').toBe(times.length);
});

test('an item with no panel still gets placed', () => {
  const typed: SolverItem = { id: 'x', name: 'Something typed by hand' };
  const sol = solve([typed], DAY);
  expect(sol.placements).toHaveLength(1);
  expect(anchorFor(typed)).toBe('any');
});
