import { completeOnboarding, expect, test } from './support/app';
import { SCHEDULED_PRODUCT } from './support/catalogue';

/**
 * Twenty screens end to end, ending on Today. This is the test that fails when
 * a screen renders blank, a CTA stops advancing, or the flow is reordered
 * without the screens agreeing.
 */
test('completes onboarding and lands on the app', async ({ page, app }) => {
  await completeOnboarding(page);

  // The last screen finishes itself, then hands over to the app proper.
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  // What the flow collected has to have reached the tables, or the schedule it
  // just spent three screens building does not exist.
  expect(app.stub.db.schedule_items.length).toBeGreaterThan(0);
  const profile = app.stub.db.profiles[0];
  expect(profile.wake_time).toBe('07:00');
  expect(profile.sex).toBe('f');

  /* Scoped to the timeline: Discover is mounted in the same track and lists
     the whole catalogue, so an unscoped match would pass on the wrong screen.
     .first() because ensureTodayDoses races itself — see today.spec.ts. */
  await expect(page.locator('.timeline').getByText(SCHEDULED_PRODUCT).first()).toBeVisible();
});
