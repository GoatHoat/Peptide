import { test, expect, seedSignedIn } from './support/app';

/**
 * The Stripe button is on the paywall.
 *
 * It vanished from every deployed build because CARD_CHECKOUT_ENABLED
 * defaulted to false, so nothing rendered it unless a variable nobody set was
 * set. A string in the bundle does not prove a button on the screen — this
 * opens the sheet and looks.
 */
test('the paywall offers both ways to pay', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor({ timeout: 20_000 });

  /* The paywall opens from an upsell gate, not from the Subscription row in
     You — that row is a plain "nothing to manage yet" sheet. Today's upsell
     card is the shortest way in on a free account. */
  await page.locator('button.upsell').click();

  await expect(page.getByText('How do you want to pay?')).toBeVisible();
  await expect(page.getByRole('button', { name: /Stripe/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /In-app payment/ })).toBeVisible();
  await expect(page.getByText('5% off')).toBeVisible();
});
