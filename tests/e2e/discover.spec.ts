import { expect, seedSignedIn, test } from './support/app';
import { IRON_PRODUCT, SCHEDULED_PRODUCT } from './support/catalogue';

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

  // Six supplements in the fixture and one peptide; the tabs split on `kind`,
  // so a row landing on the wrong side is a filter regression, not a style one.
  await expect(supplements.locator('.prod-row')).toHaveCount(6);
  await expect(page.locator('.tabs-panel').nth(1).locator('.prod-row')).toHaveCount(1);
});

/**
 * Iron, for the stub profile: female, 34, and never asked whether she
 * menstruates. The figure is 18 mg or 8 mg and the app does not know which —
 * `age >= 51` used to pick 18 with nothing on the screen admitting it guessed.
 */
test('says the iron figure depends, and takes the answer', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: 'Discover', exact: true }).click();

  const supplements = page.locator('.tabs-panel').nth(2);
  const iron = supplements.locator('.prod', { hasText: IRON_PRODUCT });
  await expect(iron.getByText('18 or 8 mg a day', { exact: true })).toBeVisible();

  await iron.locator('.prod-row').click();
  const target = iron.locator('.prod-ask-target');
  await expect(target).toContainText('18 mg if you menstruate');
  // the reason for asking sits next to the question, or it is just a form
  await expect(iron.locator('.prod-ask-why')).toBeVisible();

  await iron.getByRole('button', { name: /I don/ }).click();

  await expect(iron.getByText('8 mg a day', { exact: true })).toBeVisible();
  await expect(target).not.toContainText('if you menstruate');
  expect(app.stub.db.profiles[0].menstruates).toBe(false);
});
