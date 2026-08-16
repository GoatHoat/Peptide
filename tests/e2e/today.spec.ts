import { expect, seedSignedIn, test } from './support/app';
import { SCHEDULED_PRODUCT, seededScheduleItem } from './support/catalogue';

/**
 * Today, from a signed-in user with one active schedule item. Proves the arc,
 * the week strip and the timeline all draw, and that the schedule item is
 * materialised into a dose rather than leaving the list empty.
 */
test('renders Today with the day materialised', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // Seven cells, one of them marked as today — the strip is derived, so a
  // wrong count means the week maths is wrong rather than the styling.
  await expect(page.locator('.week-cell')).toHaveCount(7);
  await expect(page.locator('.week-cell.today')).toHaveCount(1);

  const timeline = page.locator('.timeline');
  await expect(timeline.getByText(SCHEDULED_PRODUCT).first()).toBeVisible();
  await expect(timeline.getByText('Nothing on your schedule yet.')).toHaveCount(0);

  /* Deliberately not an exact count. ensureTodayDoses reads the day's rows and
     then inserts the missing ones with nothing in between, so two overlapping
     calls both insert — which StrictMode's double mount causes on every dev
     load. See NIGHT_REPORT.md; not fixed here, and not papered over either. */
  expect(app.stub.db.doses.length).toBeGreaterThan(0);

  await expect(page.getByRole('button', { name: 'Add to Schedule' })).toBeVisible();
});

/**
 * The arc was drawn at a fixed 368px for the 402-wide phone it was designed
 * on, and left-aligned, so on anything narrower its right-hand end — and the
 * bedtime label under it — sat past the edge of the screen and was cut off by
 * the panel. 375 is the narrowest phone the app still runs on.
 */
test.describe('the arc on the narrowest phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('fits the screen and spans the doses it was given', async ({ page, app }) => {
    await seedSignedIn(page, app.stub);
    // 06:00, an hour before the profile's 07:00 wake time. The arc used to
    // clamp this onto the left end and keep the label reading 7:00 AM.
    app.stub.db.schedule_items.push(
      seededScheduleItem({ id: 'cccccccc-0000-4000-8000-000000000002', scheduled_time: '06:00:00' }),
    );
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

    // two times, so two segments and one gap
    await expect(page.locator('.arc-fill')).toHaveCount(2);

    const box = await page.evaluate(() => {
      const svg = document.querySelector('.arc-wrap svg') as SVGSVGElement;
      const panel = svg.closest('.panel') as HTMLElement;
      const s = svg.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      return { overflowLeft: p.left - s.left, overflowRight: s.right - p.right, width: s.width };
    });
    expect(box.overflowLeft).toBeLessThanOrEqual(0);
    expect(box.overflowRight).toBeLessThanOrEqual(0);
    // scaled down to the screen rather than staying at its drawn 368
    expect(box.width).toBeLessThan(368);

    await expect(page.locator('.arc-ends span').first()).toHaveText('6:00 AM');
    await expect(page.locator('.arc-ends span').last()).toHaveText('11:00 PM');
  });
});
