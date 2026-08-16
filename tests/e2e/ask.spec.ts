import type { Page, Locator } from '@playwright/test';
import { expect, seedSignedIn, test } from './support/app';

/**
 * The Ask tab against the `ask` function's no-key path.
 *
 * The point of these is that the whole surface is reachable with no
 * ANTHROPIC_API_KEY and no network: an answer with its cards, the citation
 * sheet, the peptide refusal, the rate limit, and a request that never lands.
 * The stub runs the function's own `lib.ts` and `fixtures.ts`, so the strings
 * asserted below are the ones a deployment with no key would actually return.
 */

const HAIR = 'What should I take for hair thinning?';
const SAW_PALMETTO = 'BulkSupplements.com Saw Palmetto Extract 320 mg';

/** The Ask panel is the first of Discover's three; all three stay mounted. */
async function openAsk(page: Page): Promise<Locator> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible();
  await page.getByRole('tab', { name: 'Ask AI' }).click();
  return page.locator('.tabs-panel').first();
}

async function ask(panel: Locator, question: string): Promise<void> {
  await panel.getByPlaceholder('Ask a question').fill(question);
  await panel.getByRole('button', { name: 'Send' }).click();
}

test('answers, shows its cards, opens the papers, and survives an app kill', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);

  /* A pause in front of the function, and the only reason for it: the stub
     answers inside the same tick, so without this the typing dots are never
     on screen long enough to be asserted at all. */
  await page.route('**/functions/v1/ask', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fallback();
  });

  const panel = await openAsk(page);
  await expect(panel.getByText(/Ask about anything/)).toBeVisible();
  await expect(panel.locator('.ask-example')).toHaveCount(3);

  await panel.getByRole('button', { name: HAIR }).click();

  await expect(panel.locator('.ask-bubble.user')).toHaveText(HAIR);
  await expect(panel.locator('.ask-empty')).toHaveCount(0);
  await expect(panel.locator('.ask-dots')).toBeVisible();

  await expect(panel.locator('.ask-bubble.assistant')).toContainText(
    'Hair thinning has several common causes',
  );
  await expect(panel.locator('.ask-dots')).toHaveCount(0);
  await expect(panel.locator('.ask-card')).toHaveCount(3);
  await expect(panel.locator('.ask-card').first()).toContainText(SAW_PALMETTO);
  /* No key on this build, and the answer says so — otherwise a canned reply to
     a question nobody asked reads as the app being broken. */
  await expect(panel.getByText('Example answer')).toBeVisible();

  await panel.locator('.ask-card').first().getByRole('button', { name: '2 papers' }).click();
  const sheet = page.locator('.sheet');
  await expect(sheet).toContainText(SAW_PALMETTO);
  await expect(sheet.getByText('Serenoa repens for benign prostatic hyperplasia')).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toHaveCount(0);

  // The app kill. Discover reopens on the tab it was left on.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.getByRole('button', { name: 'Discover', exact: true }).click();

  const restored = page.locator('.tabs-panel').first();
  await expect(restored.locator('.ask-bubble.user')).toHaveText(HAIR);
  await expect(restored.locator('.ask-bubble.assistant')).toContainText('Hair thinning has several');
  await expect(restored.locator('.ask-card')).toHaveCount(3);
  await expect(restored.locator('.ask-empty')).toHaveCount(0);
});

test('renders a card from the catalogue row when the catalogue holds it', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  /* The fixture answer names products from migrations 0021 and 0022, which are
     written and not applied — so against this database all three cards fall
     back to the fixture's own copies, and those carry no timing and no
     evidence because the rows they mirror do not. Putting one of the three in
     the catalogue is what a database that has run those migrations looks like,
     and resolving from the catalogue is the only path a live answer takes. */
  app.stub.db.glossary.push({
    id: 'aaaaaaaa-0000-4000-8000-0000000000f1',
    slug: 'thorne-biotin-8000-mcg',
    name: 'Test Brand Biotin 8000 mcg',
    category: 'other',
    mechanism_summary: 'Fixture row. Not a real label filing.',
    storage_notes: null,
    route: 'oral',
    research_summary: null,
    goal_tags: ['Skin'],
    search_keywords: ['biotin'],
    kind: 'supplement',
    brand: 'Test Brand',
    product_form: 'Capsule',
    label_url: null,
    timing: 'with_food',
    timing_note: null,
    evidence: 'thin',
    ods_url: null,
  });

  const panel = await openAsk(page);
  await ask(panel, HAIR);

  const card = panel.locator('.ask-card', { hasText: 'Test Brand Biotin 8000 mcg' });
  await expect(card).toBeVisible();
  // the catalogue's own timing and evidence, not the fixture's nulls
  await expect(card).toContainText('Thin evidence');
  await expect(card).toContainText('With food');
  // and the model's reason line survives the swap
  await expect(card).toContainText('The keratin cofactor');
  await expect(panel.locator('.ask-card')).toHaveCount(3);
});

test('refuses a peptide question, and does not call it an example', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  const panel = await openAsk(page);

  await ask(panel, 'Is BPC-157 worth taking for a shoulder?');

  await expect(panel.locator('.ask-bubble.assistant')).toContainText('I do not advise on peptides');
  await expect(panel.locator('.ask-card')).toHaveCount(0);
  /* The refusal is the product's real answer with or without a key, so it is
     the one canned reply that must not be labelled as a stand-in. */
  await expect(panel.getByText('Example answer')).toHaveCount(0);
});

test('renders the rate limit with the wait, and offers no retry against it', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  // Chromium logs the 429 itself, before the app sees the response.
  app.allowConsoleError(/status of 429/);
  const panel = await openAsk(page);

  await ask(panel, 'test rate limit');

  await expect(panel.locator('.ask-notice')).toContainText('That is the hourly limit for questions');
  await expect(panel.locator('.ask-notice-wait')).toHaveText('Try again in about 15 minutes.');
  await expect(panel.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  // the question stays on screen above the failure
  await expect(panel.locator('.ask-bubble.user')).toHaveText('test rate limit');
});

test('a request that never lands offers a retry, and the retry answers', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  // Chromium logs the aborted request itself, before the fetch rejects.
  app.allowConsoleError(/net::ERR_FAILED/);
  await page.route('**/functions/v1/ask', (route) => route.abort('failed'), { times: 1 });

  const panel = await openAsk(page);
  await ask(panel, HAIR);

  await expect(panel.locator('.ask-notice')).toContainText('No connection');

  await panel.getByRole('button', { name: 'Try again' }).click();

  await expect(panel.locator('.ask-bubble.assistant')).toContainText(
    'Hair thinning has several common causes',
  );
  await expect(panel.locator('.ask-notice')).toHaveCount(0);
  // asked again, not asked twice
  await expect(panel.locator('.ask-bubble.user')).toHaveCount(1);
});
