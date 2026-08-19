import { test, expect, seedSignedIn } from './support/app';

/**
 * Free accounts must be able to build a stack.
 *
 * The only route in was Discover, where six articles are readable on Free — so
 * the picker was six products out of the catalogue. These walk the screen
 * rather than trusting that the component compiles.
 */
const openPicker = async (page: import('@playwright/test').Page) => {
  await page.getByRole('heading', { name: 'Today' }).waitFor({ timeout: 20_000 });
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Add to stack' }).click();
};

test('a free account can reach every product, names only', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await openPicker(page);

  const rows = page.locator('.picker-row');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count(), 'not limited to the free six').toBeGreaterThan(1);

  /* Names only. No article text may appear in the picker — that is the whole
     distinction this change rests on. */
  /* Tabs renders every panel, not just the visible one, so all three lists are
     in the DOM. Checking all of them is the stronger assertion anyway: article
     text must not be present in any of them, visible or not. */
  const body = (await page.locator('.picker-list').allInnerTexts()).join(' ');
  for (const leak of ['mechanism', 'research', 'evidence', 'studied', 'mg per']) {
    expect(body.toLowerCase(), `the picker leaks ${leak}`).not.toContain(leak);
  }
});

test('the button is there when the stack is empty', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor({ timeout: 20_000 });
  await page.getByRole('button', { name: 'You', exact: true }).click();
  // empty stack: the button must still be the way forward
  await expect(page.getByRole('button', { name: 'Add to stack' })).toBeVisible();
});

test('adding one works on Free, and a second opens the paywall', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await openPicker(page);

  const rows = page.locator('.picker-row');
  await expect(rows.first()).toBeVisible();

  await rows.first().click();
  await expect(rows.first().locator('.picker-state')).toHaveText('Added');
  await expect(rows.first(), 'cannot be added twice').toBeDisabled();

  // second add on a free account is a gate, never a silent no-op
  await rows.nth(1).click();
  await expect(page.getByText(/Pepstack Pro|Everything, in one place|unlimited/i).first()).toBeVisible();
});

test('a Pro account is not gated', async ({ page, app }) => {
  app.stub.tier = 'pro';
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await openPicker(page);

  const rows = page.locator('.picker-row');
  await expect(rows.first()).toBeVisible();
  await rows.first().click();
  await expect(rows.first().locator('.picker-state')).toHaveText('Added');
  await rows.nth(1).click();
  await expect(rows.nth(1).locator('.picker-state')).toHaveText('Added');
});
