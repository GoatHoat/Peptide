import { expect, seedSignedIn, test } from './support/app';

/**
 * The App Store Review blockers, as tests.
 *
 * Every case here stands for a specific guideline that would get the build
 * rejected, and each one was a real defect in the app before this file existed.
 * They are gathered rather than spread through the screen suites because they
 * share a reason for existing: none of them is about whether a feature works,
 * they are about whether the app is publishable at all. A screen test that goes
 * green while one of these regresses would be telling the truth and still
 * letting a rejection through.
 */

/** 5.1.1(v) — deletion has to be reachable and complete, from inside the app. */
test('an account can be deleted from within the app, and the data goes with it', async ({
  page,
  app,
}) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('button', { name: 'You', exact: true }).click();

  // Reachable without hunting: a row in the settings list, not buried in a FAQ.
  const row = page.getByText('Delete Account', { exact: true });
  await expect(row).toBeVisible();
  await row.click();

  const sheet = page.locator('.sheet');
  await expect(sheet).toContainText('cannot be undone');
  // It must point at the export, since after this there is nothing left to take.
  await expect(sheet).toContainText('Export Data');

  /* Guarded by a typed word rather than a second tap. The button stays dead
     until the word is right, including for a near miss. */
  const confirm = sheet.getByRole('button', { name: 'Delete my account' });
  await expect(confirm).toBeDisabled();
  await sheet.getByPlaceholder('DELETE').fill('delete me');
  await expect(confirm).toBeDisabled();
  await sheet.getByPlaceholder('DELETE').fill('DELETE');
  await expect(confirm).toBeEnabled();

  await confirm.click();

  // The RPC ran, and the user-owned tables are empty afterwards.
  await expect.poll(() => app.stub.deleted).toBe(true);
  expect(app.stub.db.profiles).toHaveLength(0);
  expect(app.stub.db.schedule_items).toHaveLength(0);
  expect(app.stub.db.stacks).toHaveLength(0);

  /* And it signs out. Rows gone but the session still alive is a half-deleted
     account, so this asserts the authenticated shell is gone rather than
     looking for a particular screen — signOut lands on onboarding's welcome,
     which is not the email form. */
  await expect(page.getByRole('button', { name: 'You', exact: true })).toHaveCount(0, {
    timeout: 15_000,
  });
});

/** 5.1.1(i) and 2.1 — the policy links have to resolve, and not trap the user. */
test('the legal links are absolute and open outside the app', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('button', { name: 'You', exact: true }).click();

  for (const name of ['Privacy Policy', 'Terms of Use']) {
    const link = page.getByRole('link', { name });
    await expect(link).toBeVisible();

    /* Absolute, because a relative href inside the iOS WebView navigates the
       whole app away with no back button. And _blank so it opens in the system
       browser rather than replacing the app. */
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^https?:\/\//);
    await expect(link).toHaveAttribute('target', '_blank');
  }
});

/** 1.2 — model output needs a working way to report it. */
test('an assistant answer can be reported', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  /* Wait for Today before switching. Tapping Discover while the first screen is
     still settling starts the pager transition from an unsettled position and
     the composer never stops moving, so the click never lands. */
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();

  /* Select Ask AI explicitly rather than assuming the pager opens on it. All
     three panels stay mounted side by side in one track, so an off-screen one
     still resolves every locator — it simply cannot be clicked. */
  await page.getByRole('tab', { name: 'Ask AI' }).click();

  const panel = page.locator('.tabs-panel').first();
  await expect(panel.getByText(/Ask about anything/)).toBeVisible();

  /* Sent from the example button rather than by typing: filling the composer
     runs its auto-grow, which moves the send button out from under the cursor
     and the click never lands. Same code path either way. */
  await panel.getByRole('button', { name: 'What should I take for hair thinning?' }).click();
  await expect(panel.locator('.ask-bubble.assistant')).toBeVisible();

  const report = panel.getByRole('button', { name: 'Report this answer' });
  await expect(report).toBeVisible();
  await report.click();

  await page.locator('.sheet').getByPlaceholder('Inaccurate, unsafe, offensive…').fill('wrong');
  await page.locator('.sheet').getByRole('button', { name: 'Send report' }).click();

  // Acknowledged on screen, and the row carries what was asked as well as the
  // answer — a report without the question cannot be triaged.
  await expect(panel.getByText('Reported. Thank you.')).toBeVisible();
  await expect.poll(() => app.stub.db.ask_reports?.length ?? 0).toBe(1);
  const filed = app.stub.db.ask_reports[0];
  expect(String(filed.question)).toContain('hair thinning');
  expect(String(filed.answer).length).toBeGreaterThan(0);
});

/**
 * 1.4.1 — Apple requires drug dosage calculators to come from the manufacturer,
 * a hospital, a university or an equivalent approved body. legal.md records
 * that reconstitution ratios and injection specifics are what got the first
 * version of this app rejected. None of it may come back.
 */
test('no injection or dosing calculator UI is reachable', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Calculator' })).toHaveCount(0);

  // Add to Schedule takes an amount the user types, and asks nothing about
  // where it goes.
  await page.getByRole('button', { name: 'Add to Schedule' }).click();
  const sheet = page.locator('.sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/injection site/i)).toHaveCount(0);
  await expect(sheet.getByText(/diluent/i)).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toHaveCount(0);

  await page.getByRole('button', { name: 'You', exact: true }).click();
  await expect(page.getByText(/injection site/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Vial' })).toHaveCount(0);
});
