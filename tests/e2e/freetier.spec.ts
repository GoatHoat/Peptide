import { expect, test } from './support/app';
import { STUB_EMAIL } from './support/catalogue';

const PASSWORD = 'smoke-account';

/**
 * The free-tier reveal — section 2 of the last prompt.
 *
 * What is being held here is honesty, not a flow. The person is shown a
 * personalised list, asked to choose from it, and then told free covers one.
 * The five they cannot track must still be on screen and must not be described
 * as taken away — that is guideline 2.3.1 territory, and it is also the
 * difference between an upgrade reason and a one-star review.
 */
async function reachPaywall(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByPlaceholder('Email').fill(STUB_EMAIL);
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await page.getByRole('heading', { name: 'How old are you?' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'And your sex' }).waitFor();
  await page.getByRole('button', { name: 'Female', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: /Anything you don.t eat/ }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Where this comes from' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: 'Once or twice' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: 'I forget' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Your day' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'When do you eat?' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: /How many things are you taking/ }).waitFor();
  await page.getByRole('button', { name: 'Three to five' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'What are you already taking?' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: /not agreed with you/ }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.locator('button.ob-goal-icon').first().click();
  await page.getByRole('button', { name: /Continue \(1 selected\)/ }).click();
  // goal-priority is skipped with one goal
  await page.getByRole('heading', { name: /How many days a week/ }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Reminders at the right times' }).waitFor();
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.getByRole('heading', { name: 'Vitamins and minerals for you' }).waitFor({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Create schedule' }).click();
  await page.getByRole('heading', { name: 'Here is your plan' }).waitFor();
  await page.getByRole('button', { name: 'See what it costs' }).click();
  await page.getByRole('heading', { name: 'Everything, in one place' }).waitFor();
}

test('the paywall names the free limits before the choice, and shows the way past', async ({ page }) => {
  test.setTimeout(120_000);
  await reachPaywall(page);

  const terms = page.locator('.ob-free-terms');
  await expect(terms).toBeVisible();
  await expect(terms).toContainText('One product');
  await expect(terms).toContainText('assistant messages');

  /* Visible, and a real target — not a greyed word in a corner. */
  const free = page.getByRole('button', { name: 'Continue with Free' });
  await expect(free).toBeVisible();
  const box = await free.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThan(200);

  // nothing on this screen counts down or expires
  const body = (await page.locator('.ob-root, body').first().innerText()).toLowerCase();
  for (const pressure of ['expires', 'offer ends', 'limited time', 'only today', 'hurry']) {
    expect(body, `the paywall applies pressure: ${pressure}`).not.toContain(pressure);
  }
});

test('choosing free asks which product, and keeps the rest on screen', async ({ page }) => {
  test.setTimeout(120_000);
  await reachPaywall(page);
  await page.getByRole('button', { name: 'Continue with Free' }).click();

  await expect(page.getByRole('heading', { name: 'Free covers one product' })).toBeVisible();

  const cards = page.locator('.ob-rec');
  const count = await cards.count();
  expect(count, 'every earlier selection is still listed').toBeGreaterThan(1);

  // the ones not chosen say which plan tracks them, and are still readable
  await expect(page.locator('.ob-rec-pro').first()).toBeVisible();
  await expect(page.locator('.ob-rec-pro').first()).toContainText('Pro');

  // and nothing claims they were removed
  const body = (await page.locator('.ob-root, body').first().innerText()).toLowerCase();
  for (const lie of ['removed', 'discarded', 'lost', 'deleted']) {
    expect(body, `free-pick says something was ${lie}`).not.toContain(lie);
  }
  expect(body).toContain('nothing you picked is thrown away');

  // choosing one carries on into the schedule
  await cards.nth(1).click();
  await page.getByRole('button', { name: 'Build my schedule' }).click();
  await expect(page.getByRole('heading', { name: 'Your schedule' })).toBeVisible({ timeout: 20_000 });
});
