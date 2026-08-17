import { expect, seedSignedIn, test } from './support/app';

/**
 * Peptides are a reference library and nothing else.
 *
 * CLAUDE.md, legal.md and PROMPT_V2.md section 3 all say the same thing, and
 * legal.md records why: app-sourced dosing for unapproved compounds is what got
 * the design legal.md:5 records as abandoned. The rule is enforced in three places
 * — the render, the API, and a database trigger — so these tests check the
 * behaviour rather than any one of them.
 *
 * A peptide entry shows what it is, its category, and its papers. Nothing else.
 */

/** Open Discover's Peptides tab and return the panel that is on screen. */
async function openPeptides(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
  await page.getByRole('tab', { name: 'Peptides' }).click();
  return page.locator('.tabs-panel').nth(1);
}

test('a peptide row shows no amount, no upper limit and no timing', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  /* Pro: six articles are free now and these rows are not among them, so on
     a free account the row renders locked and never expands. This test is
     about what an opened product shows, not about the paywall — that is
     freearticles.spec.ts. */
  app.stub.tier = 'pro';

  const panel = await openPeptides(page);

  const rows = panel.locator('.prod-row');
  await expect(rows.first()).toBeVisible();

  /* Every pill on every peptide row, gathered in one go. The dose, limit and
     timing pills carry distinct icons, so their absence is checked by the
     wording that only those pills produce. */
  const pills = await panel.locator('.prod-row .tagpill').allInnerTexts();
  const joined = pills.join(' | ').toLowerCase();

  expect(joined, 'no daily amount').not.toContain('a day');
  expect(joined, 'no upper limit').not.toContain('limit');
  expect(joined, 'no "no set intake" either — that is still a dose claim')
    .not.toContain('no set intake');
  for (const timing of ['with food', 'empty stomach', 'morning', 'evening', 'before bed']) {
    expect(joined, `no timing chip: ${timing}`).not.toContain(timing);
  }
});

test('an opened peptide card offers its papers and no dosing line', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  /* Pro: six articles are free now and these rows are not among them, so on
     a free account the row renders locked and never expands. This test is
     about what an opened product shows, not about the paywall — that is
     freearticles.spec.ts. */
  app.stub.tier = 'pro';

  const panel = await openPeptides(page);

  await panel.locator('.prod-row').first().click();
  const card = panel.locator('.prod.open .prod-card');
  await expect(card).toBeVisible();

  // the reading is the point
  await expect(card.getByRole('button', { name: 'See more articles' })).toBeVisible();

  const text = ((await card.innerText()) || '').toLowerCase();
  expect(text, 'no reference-intake sentence').not.toContain('reference intake');
  expect(text, 'no upper limit').not.toContain('upper limit');
  expect(text, 'no menstrual question — that exists to pick between two intakes')
    .not.toContain('menstruat');
});

test('nothing offers to schedule a peptide', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  /* Pro: six articles are free now and these rows are not among them, so on
     a free account the row renders locked and never expands. This test is
     about what an opened product shows, not about the paywall — that is
     freearticles.spec.ts. */
  app.stub.tier = 'pro';

  const panel = await openPeptides(page);

  await panel.locator('.prod-row').first().click();
  const card = panel.locator('.prod.open .prod-card');
  await expect(card).toBeVisible();

  /* Add to stack is fine — the stack is "what I have", which is a record and
     not a plan. Scheduling is what the rule is about. */
  await expect(card.getByRole('button', { name: /schedule/i })).toHaveCount(0);
});

test('the Add to Schedule search does not offer peptides', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  /* Pro: six articles are free now and these rows are not among them, so on
     a free account the row renders locked and never expands. This test is
     about what an opened product shows, not about the paywall — that is
     freearticles.spec.ts. */
  app.stub.tier = 'pro';

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to Schedule' }).click();

  const sheet = page.locator('.sheet');
  await expect(sheet).toBeVisible();

  /* Typing a peptide name must not produce a schedulable suggestion. The API
     refuses it and a trigger refuses it after that, but offering it and then
     failing is a worse experience than never offering it. */
  const field = sheet.getByPlaceholder(/name/i).first();
  if (await field.count()) {
    await field.fill('Argireline');
    await page.waitForTimeout(600);
    const suggestions = sheet.locator('.stack-pick-row button, .search-result');
    const texts = (await suggestions.allInnerTexts()).join(' ').toLowerCase();
    expect(texts).not.toContain('argireline');
  }
});
