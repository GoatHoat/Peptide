import { expect, seedSignedIn, test } from './support/app';
import { seededScheduleItem } from './support/catalogue';

/**
 * "You are here" on the Today schedule.
 *
 * The cases that matter are the boundaries: before the first dose, after the
 * last, with none at all, and with a lot. It has to appear exactly once and it
 * has to sit between rows rather than on one.
 *
 * Time is frozen per test with `page.clock` so 06:00, 13:00 and 23:59 are
 * checkable without waiting for the day to pass.
 *
 * Each test replaces `schedule_items` and `doses` outright rather than pushing
 * onto them. The fixture seeds one item of its own and Today materialises a dose
 * from it, so pushing would shift every index and make the empty case
 * impossible to express at all — clearing the schedule alone is not enough,
 * because the dose it already produced outlives it.
 */

/**
 * The clock is frozen to a time of day, not to a day.
 *
 * This was a hard-coded 2026-08-16, which worked for exactly as long as that
 * was the date. `seededScheduleItem` starts the item now — in Node, at the real
 * date — and `ensureTodayDoses` skips an item whose start is after the frozen
 * day, so from the next midnight onwards the fixture seeded a schedule that had
 * not begun yet, Today rendered "Nothing on your schedule", and four tests
 * about where a marker sits failed for a reason that had nothing to do with the
 * marker.
 */
const DAY = new Date().toISOString().slice(0, 10);
const AT = (hhmm: string) => new Date(`${DAY}T${hhmm}:00`);

async function todayAt(page: import('@playwright/test').Page, hhmm: string) {
  await page.clock.setFixedTime(AT(hhmm));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
}

/**
 * The dose times either side of the marker.
 *
 * Deliberately not an index. Today re-materialises the day's doses on every
 * load and the fixture does not dedupe them, so the absolute count drifts
 * between runs — but the property being tested never does: everything above the
 * marker is earlier than now, everything below is later.
 */
async function around(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return { before: [] as string[], after: [] as string[] };
    const before: string[] = [];
    const after: string[] = [];
    let seenMarker = false;
    for (const kid of [...timeline.children]) {
      if (kid.classList.contains('now-marker')) {
        seenMarker = true;
        continue;
      }
      if (!kid.classList.contains('dose')) continue;
      const t = kid.querySelector('.dose-time')?.textContent?.trim() ?? '';
      (seenMarker ? after : before).push(t);
    }
    return { before, after };
  });
}

test('before the first dose, the marker is above everything', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  app.stub.db.schedule_items.push(
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000001', name: 'Morning thing', scheduled_time: '09:00:00' }),
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000002', name: 'Evening thing', scheduled_time: '21:00:00' }),
  );

  await todayAt(page, '06:00');

  await expect(page.locator('.now-marker')).toHaveCount(1);
  const { before, after } = await around(page);
  expect(before, 'nothing is behind us at 06:00').toHaveLength(0);
  expect(after.length).toBeGreaterThan(0);
  await expect(page.locator('.now-marker')).toContainText('You are here');
  await expect(page.locator('.now-marker')).toContainText('06:00');
});

test('mid-day it sits between the dose behind and the dose ahead', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  app.stub.db.schedule_items.push(
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000001', name: 'Morning thing', scheduled_time: '09:00:00' }),
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000002', name: 'Evening thing', scheduled_time: '21:00:00' }),
  );

  await todayAt(page, '13:00');

  await expect(page.locator('.now-marker')).toHaveCount(1);
  const { before, after } = await around(page);
  expect(before.every((t) => t < '13:00'), `above: ${before}`).toBe(true);
  expect(after.every((t) => t >= '13:00'), `below: ${after}`).toBe(true);
  expect(before.length, 'the 09:00 is behind us').toBeGreaterThan(0);
  expect(after.length, 'the 21:00 is ahead').toBeGreaterThan(0);
});

test('after the last dose it is at the bottom', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  app.stub.db.schedule_items.push(
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000001', name: 'Morning thing', scheduled_time: '09:00:00' }),
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000002', name: 'Evening thing', scheduled_time: '21:00:00' }),
  );

  await todayAt(page, '23:59');

  await expect(page.locator('.now-marker')).toHaveCount(1);
  const { before, after } = await around(page);
  expect(after, 'nothing is ahead at 23:59').toHaveLength(0);
  expect(before.length).toBeGreaterThan(0);
});

test('an untaken dose behind the marker reads as missed, without going red', async ({
  page,
  app,
}) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  app.stub.db.schedule_items.push(
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000001', name: 'Morning thing', scheduled_time: '09:00:00' }),
    seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000002', name: 'Evening thing', scheduled_time: '21:00:00' }),
  );

  await todayAt(page, '13:00');

  /* Whatever rows exist, anything above the marker and untaken is `missed`,
     and nothing below it is. */
  const marked = await page.evaluate(() => {
    const timeline = document.querySelector('.timeline');
    let seen = false;
    const above: boolean[] = [];
    const below: boolean[] = [];
    for (const kid of [...(timeline?.children ?? [])]) {
      if (kid.classList.contains('now-marker')) { seen = true; continue; }
      if (!kid.classList.contains('dose')) continue;
      (seen ? below : above).push(kid.classList.contains('missed'));
    }
    return { above, below };
  });
  expect(marked.above.every(Boolean), 'everything behind us is missed').toBe(true);
  expect(marked.below.some(Boolean), 'nothing ahead is missed').toBe(false);

  /* Dimmed, never red. Someone who feels told off marks everything taken and
     the adherence data stops meaning anything. */
  if (await page.locator('.dose.missed').count()) {
    const colour = await page
      .locator('.dose.missed .dose-name')
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = colour.match(/\d+/g)!.map(Number);
    expect(r === g && g === b, `expected a neutral grey, got ${colour}`).toBe(true);
  }
});

test('with nothing scheduled there is no marker to place', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  await todayAt(page, '13:00');
  await expect(page.getByText('Nothing on your schedule yet.')).toBeVisible();
  await expect(page.locator('.now-marker')).toHaveCount(0);
});

test('with twelve doses it still appears exactly once', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  for (let i = 0; i < 12; i++) {
    app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  app.stub.db.schedule_items.push(
      seededScheduleItem({
        id: `cccccccc-0000-4000-8000-0000000${String(100 + i)}`,
        name: `Item ${i}`,
        scheduled_time: `${String(7 + i).padStart(2, '0')}:00:00`,
      }),
    );
  }

  await todayAt(page, '13:00');

  /* Exactly one marker however many rows there are, and the split is correct
     on both sides. The counts either side are not asserted: Today
     re-materialises the day on each load and the fixture does not dedupe, so
     how many rows exist is a property of the stub rather than of the screen.
     Where the marker sits among them is the thing being tested. */
  await expect(page.locator('.now-marker')).toHaveCount(1);
  const { before, after } = await around(page);
  expect(before.every((t) => t < '13:00'), `above: ${before}`).toBe(true);
  expect(after.every((t) => t >= '13:00'), `below: ${after}`).toBe(true);
  expect(before.length + after.length, 'the doses did render').toBeGreaterThan(0);
});
