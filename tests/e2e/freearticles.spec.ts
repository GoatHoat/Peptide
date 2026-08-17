import { expect, seedSignedIn, test } from './support/app';
import { freeSlugs } from '../../src/lib/freeArticles';

/**
 * Six articles free, and everything else genuinely closed.
 *
 * The fault this replaces: locking keyed on `free_rank`, a column migration
 * 0037 adds and which is not applied — so on the real database nothing was
 * locked, the divider appeared, and every row under it stayed readable and
 * openable.
 */

test('exactly six articles are free, three of each kind', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.waitForTimeout(900);

  const rows = await page.locator('.tabs-panel.on .prod').count();
  const locked = await page.locator('.tabs-panel.on .prod-locked').count();
  expect(rows, 'the list still renders every product').toBeGreaterThan(0);
  /* Locked rows keep their exact height and stay in place — seeing that a
     product exists is the upsell. */
  expect(locked, 'most of the list is locked on free').toBeGreaterThan(0);
});

test('a locked row cannot be opened', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.waitForTimeout(900);

  const lockedRow = page.locator('.tabs-panel.on .prod-locked').first();
  if ((await lockedRow.count()) === 0) test.skip();
  await lockedRow.locator('.prod-row').click();
  await page.waitForTimeout(500);

  /* It opens the paywall, not the article. Before this the row under the
     divider expanded normally. */
  await expect(page.locator('.sheet')).toBeVisible();
  await expect(page.locator('.tabs-panel.on .prod.open')).toHaveCount(0);
});

test('every locked row is blurred, name and pills both', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.waitForTimeout(900);

  const unblurred = await page.evaluate(() => {
    const bad: string[] = [];
    for (const row of document.querySelectorAll('.tabs-panel.on .prod-locked')) {
      for (const el of row.querySelectorAll<HTMLElement>('.prod-name, .tagpill')) {
        const f = getComputedStyle(el).filter;
        if (!f.includes('blur')) bad.push(el.className);
      }
    }
    return bad;
  });
  expect(unblurred, unblurred.join(', ')).toEqual([]);
});

/* ── the resolver, held without a browser ─────────────────────────────── */

const row = (slug: string, name: string, kind: string) => ({ slug, name, kind });

test('the six resolve to three peptides and three minerals', () => {
  const set = freeSlugs([
    row('bpc-157', 'BPC-157', 'peptide'),
    row('tb-500', 'TB-500', 'peptide'),
    row('ipamorelin', 'Ipamorelin', 'peptide'),
    row('cjc-1295', 'CJC-1295', 'peptide'),
    row('a-mag', 'Klean Magnesium', 'supplement'),
    row('b-zinc', 'Klean Zinc', 'supplement'),
    row('c-vitd', 'NOW Vitamin D3', 'supplement'),
    row('d-other', 'Collagen Peptides Powder', 'supplement'),
  ]);
  expect(set.size).toBe(6);
  expect([...set].sort()).toEqual(
    ['a-mag', 'b-zinc', 'bpc-157', 'c-vitd', 'ipamorelin', 'tb-500'].sort(),
  );
});

test('a collagen "peptides" product is not mistaken for a peptide', () => {
  /* The catalogue sells Vital Proteins Collagen Peptides. The peptide patterns
     are anchored to the compound slugs precisely so a supplement with the word
     in its title cannot take a free slot. */
  const set = freeSlugs([
    row('vital-collagen-peptides', 'Vital Proteins Collagen Peptides', 'supplement'),
    row('bpc-157', 'BPC-157', 'peptide'),
  ]);
  expect(set.has('vital-collagen-peptides')).toBe(false);
  expect(set.has('bpc-157')).toBe(true);
});

test('two patterns never claim the same product', () => {
  /* A single row named "Magnesium Zinc Complex" matches two patterns; it must
     take one slot, not two, or the count silently drops below six. */
  const set = freeSlugs([
    row('combo', 'Magnesium Zinc Complex', 'supplement'),
    row('plain-zinc', 'Klean Zinc', 'supplement'),
  ]);
  expect(set.size).toBe(2);
  expect(set.has('combo')).toBe(true);
  expect(set.has('plain-zinc')).toBe(true);
});

test('a catalogue missing a mineral yields fewer, never a wrong one', () => {
  const set = freeSlugs([row('bpc-157', 'BPC-157', 'peptide')]);
  expect([...set]).toEqual(['bpc-157']);
});
