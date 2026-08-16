import { expect, seedSignedIn, test } from './support/app';
import { seededScheduleItem } from './support/catalogue';

/**
 * The catch-up screen.
 *
 * The two cases in PROMPT_V2.md section 7 are the whole specification: last
 * opened 21:00, opening at 11:00, dose at 10:30 → fires. Same app opened at
 * 10:00 → does not. Everything else follows from those.
 */

const TODAY = '2026-08-16';
/** 21:00 the night before — the scenario the spec describes. */
const LAST_NIGHT = '2026-08-15T21:00:00.000Z';
const AT = (hhmm: string) => new Date(`${TODAY}T${hhmm}:00`);

/** One dose due at `time`, already materialised and unmarked. */
function seedDose(app: { stub: { db: Record<string, Record<string, unknown>[]> } }, time: string) {
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [
    {
      id: 'dddddddd-0000-4000-8000-000000000001',
      user_id: app.stub.db.profiles[0].id,
      schedule_item_id: null,
      glossary_id: null,
      name: 'Morning thing',
      amount: '1 capsule',
      scheduled_time: time,
      log_date: TODAY,
      taken: false,
      taken_at: null,
      notes: null,
      injection_site: null,
    },
  ];
}

test('a dose that came due while the app was closed brings up catch-up', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  seedDose(app, '10:30:00');
  // last open was the night before
  app.stub.lastOpened = LAST_NIGHT;

  await page.clock.setFixedTime(AT('11:00'));
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  await expect(page.getByText('Morning thing')).toBeVisible();
  await expect(page.getByText('Slide if you took it')).toBeVisible();
});

test('a dose still ahead of now does not', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  seedDose(app, '10:30:00');
  app.stub.lastOpened = LAST_NIGHT;

  await page.clock.setFixedTime(AT('10:00'));
  await page.goto('/');

  // straight into the app, no interstitial
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'While you were away' })).toHaveCount(0);
});

test('a first launch never fires it', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  seedDose(app, '10:30:00');
  // null previous open — this device has not seen the app before
  app.stub.lastOpened = null;

  await page.clock.setFixedTime(AT('23:00'));
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'While you were away' })).toHaveCount(0);
});

test('several missed doses are one screen, not a queue', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  seedDose(app, '08:00:00');
  const base = app.stub.db.doses[0];
  app.stub.db.doses = ['08:00:00', '10:00:00', '12:00:00'].map((t, i) => ({
    ...base,
    id: `dddddddd-0000-4000-8000-00000000000${i + 1}`,
    name: `Item ${i + 1}`,
    scheduled_time: t,
  }));
  app.stub.lastOpened = `${TODAY}T06:00:00.000Z`;

  await page.clock.setFixedTime(AT('13:00'));
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();
  await expect(page.getByText('3 doses came due. Did you take them?')).toBeVisible();
  // one card each, on one screen — nobody drags a slider six times in a row
  await expect(page.locator('.catchup-card')).toHaveCount(3);
});

test('"I didn\'t take this" asks why, and records the reason', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  seedDose(app, '10:30:00');
  app.stub.lastOpened = LAST_NIGHT;

  await page.clock.setFixedTime(AT('11:00'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();

  // the label renders a typographic apostrophe, so match on the stable part
  await page.getByRole('button', { name: /take this/ }).click();
  const sheet = page.locator('.sheet');
  await expect(sheet.getByText('What got in the way?')).toBeVisible();

  // structured chips, single select
  await sheet.getByRole('button', { name: "Wasn't near them" }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => app.stub.db.dose_skips?.length ?? 0).toBe(1);
  expect(String(app.stub.db.dose_skips[0].reason)).toBe('not_near');
});

test('the slider cannot be completed by tapping it', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  seedDose(app, '10:30:00');
  app.stub.lastOpened = LAST_NIGHT;

  await page.clock.setFixedTime(AT('11:00'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();

  /* A tap is what produces false "yes" answers, and a false yes is worse than
     no answer because it silently poisons the data the screen exists to
     gather. Clicking the far end must do nothing. */
  const track = page.locator('.catchup-track');
  const box = (await track.boundingBox())!;
  await page.mouse.click(box.x + box.width - 10, box.y + box.height / 2);

  await expect(page.getByText('Slide if you took it')).toBeVisible();
  await expect(page.getByText('Taken')).toHaveCount(0);
});

test('dragging it across marks the dose taken', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  seedDose(app, '10:30:00');
  app.stub.lastOpened = LAST_NIGHT;

  await page.clock.setFixedTime(AT('11:00'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible();

  const track = page.locator('.catchup-track');
  const box = (await track.boundingBox())!;
  await page.mouse.move(box.x + 26, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + 26 + ((box.width - 40) * i) / 10, box.y + box.height / 2);
  }
  await page.mouse.up();

  await expect(page.getByText('Taken')).toBeVisible();
  await expect.poll(() => app.stub.db.doses[0].taken).toBe(true);
});
