import { expect, seedSignedIn, test } from './support/app';
import { SCHEDULED_PRODUCT } from './support/catalogue';

/**
 * Discover, on the tab it opens on. The list is the screen, so the test is
 * that the catalogue arrives, the loading state clears, and the split between
 * supplements and peptides holds.
 */
test('renders Discover with the catalogue', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: 'Discover', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
  // All three panels stay mounted, so "on screen" has to be read off the
  // pager rather than off visibility.
  await expect(page.locator('[data-active-tab]')).toHaveAttribute('data-active-tab', '1');

  const supplements = page.locator('.tabs-panel').nth(2);
  await expect(supplements.getByText('Loading…')).toHaveCount(0);
  await expect(supplements.getByText(SCHEDULED_PRODUCT)).toBeVisible();

  // Four supplements in the fixture and one peptide; the tabs split on `kind`,
  // so a row landing on the wrong side is a filter regression, not a style one.
  await expect(supplements.locator('.prod-row')).toHaveCount(4);
  await expect(page.locator('.tabs-panel').nth(1).locator('.prod-row')).toHaveCount(1);
});
