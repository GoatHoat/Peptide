import { expect, test } from './support/app';

/**
 * The cheapest test that would have caught a white screen: does the bundle
 * evaluate, does React mount, and does the first screen have its content.
 */
test('boots to the welcome screen', async ({ page, app }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Pepstack' })).toBeVisible();
  await expect(page.getByText('Know what to take, and when to take it.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get started' })).toBeEnabled();

  // The setup screen renders in place of the app when the env vars are
  // missing, so it looks like a pass to anything only checking for a mount.
  await expect(page.getByText('Not configured yet')).toHaveCount(0);
  expect(app.stub.unhandled).toEqual([]);
});
