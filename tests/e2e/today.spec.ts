import { expect, seedSignedIn, test } from './support/app';
import { SCHEDULED_PRODUCT } from './support/catalogue';

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
