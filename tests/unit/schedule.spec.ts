import { expect, test } from '@playwright/test';
import { MAX_BLOCKS, solve, type DayShape, type SolverItem } from '../../src/lib/schedule';

/**
 * The solver, in Node. No browser and no fixture — a wrong placement here is a
 * quietly wrong schedule rather than a blank screen, which is the kind of
 * failure that survives a smoke test.
 */

const item = (id: string, key: string): SolverItem => ({
  id,
  name: id,
  ingredients: [{ key, name: key, amount: null, unit: null }],
});

/**
 * Meals at wake, midday and evening — the case from the brief.
 *
 * Dinner at 21:00 matters: it puts wind-down (sleep minus an hour) only sixty
 * minutes after eating, so every block the user gave is either a meal or too
 * close to one. Without that the wind-down block is already food-free and
 * nothing needs deriving, which is the correct answer to a different question.
 */
const spacedDay: DayShape = {
  wake: '07:00',
  sleep: '23:00',
  meals: [
    { id: 'breakfast', name: 'Breakfast', time: '07:00' },
    { id: 'lunch', name: 'Lunch', time: '13:00' },
    { id: 'dinner', name: 'Dinner', time: '21:00', largest: true },
  ],
};

/** The same day, but eating early enough that wind-down is already clear. */
const roomyDay: DayShape = {
  wake: '07:00',
  sleep: '23:00',
  meals: [
    { id: 'breakfast', name: 'Breakfast', time: '07:30' },
    { id: 'lunch', name: 'Lunch', time: '13:00' },
    { id: 'dinner', name: 'Dinner', time: '19:00', largest: true },
  ],
};

test('nothing is derived when the day already has a food-free block', () => {
  const s = solve([item('iron', 'iron')], roomyDay);
  expect(s.blocks.some((b) => b.derived), 'wind-down already works').toBe(false);
  expect(s.placements[0].compromise, 'and nothing was compromised').toBeUndefined();
});

test('an empty-stomach item gets a real gap, not a meal', () => {
  const s = solve([item('iron', 'iron')], spacedDay);
  const p = s.placements[0];
  const block = s.blocks.find((b) => b.id === p.blockId)!;

  expect(block.derived, 'the block was derived').toBe(true);
  expect(block.isMeal, 'a derived gap is never a meal').toBe(false);
  expect(block.name).toBe('Away from food');
  expect(p.compromise, 'nothing was given up, so nothing is apologised for').toBeUndefined();
  expect(p.reason).toContain('kept clear of your meals');
});

test('the derived time is inside waking hours and clear of every meal', () => {
  const s = solve([item('iron', 'iron')], spacedDay);
  const gap = s.blocks.find((b) => b.derived)!;
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

  expect(mins(gap.time)).toBeGreaterThanOrEqual(mins(spacedDay.wake));
  expect(mins(gap.time)).toBeLessThanOrEqual(mins(spacedDay.sleep));
  for (const m of spacedDay.meals) {
    // 120 after a meal, 30 before one — the solver's own definition
    const d = mins(gap.time) - mins(m.time);
    expect(d >= 120 || d <= -30, `too close to ${m.name} (${gap.time} vs ${m.time})`).toBe(true);
  }
});

test('two empty-stomach items share one derived block', () => {
  const s = solve([item('iron', 'iron'), item('tyr', 'l-tyrosine')], spacedDay);
  expect(s.blocks.filter((b) => b.derived)).toHaveLength(1);
  const ids = new Set(s.placements.map((p) => p.blockId));
  expect(ids.has('away-from-food')).toBe(true);
  expect(s.placements.filter((p) => p.blockId === 'away-from-food')).toHaveLength(2);
});

test('a day with no gap keeps the old behaviour and still says so', () => {
  /* Eating every ninety minutes from wake to sleep: there is no food-free
     quarter hour anywhere, so nothing may be invented. */
  const packed: DayShape = {
    wake: '07:00',
    sleep: '22:00',
    meals: Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      name: `Meal ${i}`,
      time: `${String(7 + Math.floor((i * 90) / 60)).padStart(2, '0')}:${String((i * 90) % 60).padStart(2, '0')}`,
    })),
  };
  const s = solve([item('iron', 'iron')], packed);
  expect(s.blocks.some((b) => b.derived), 'no time was invented').toBe(false);
  expect(s.placements[0].compromise, 'the compromise is still admitted').toBeTruthy();
});

test('a stack with no hard anchor still fits in the preferred block count', () => {
  const s = solve(
    [item('c', 'vitamin-c'), item('d', 'vitamin-d'), item('mag', 'magnesium'), item('b12', 'vitamin-b12')],
    spacedDay,
  );
  expect(s.blocks.some((b) => b.derived), 'nothing was derived for soft anchors').toBe(false);
  expect(s.used.length).toBeLessThanOrEqual(MAX_BLOCKS);
});
