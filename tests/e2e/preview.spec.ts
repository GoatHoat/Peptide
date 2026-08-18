import { expect, seedSignedIn, test } from './support/app';

/**
 * TEMPORARY — remove with the preview row.
 *
 * The dev server runs in dev mode, so the row is present here; the production
 * check is a grep of `dist`, which cannot be done from a browser.
 */
test('the preview row opens the catch-up screen from You', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.doses = [
    {
      id: 'dddddddd-0000-4000-8000-000000000001',
      user_id: app.stub.db.profiles[0].id,
      schedule_item_id: null,
      glossary_id: null,
      name: 'Preview target',
      amount: '1 capsule',
      scheduled_time: '08:00:00',
      log_date: new Date().toISOString().slice(0, 10),
      taken: false,
      taken_at: null,
      notes: null,
    },
  ];
  await page.goto('/');
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.waitForTimeout(900);

  const row = page.getByRole('button', { name: /Preview catch-up screen/ });
  await expect(row).toBeVisible();
  await row.click();

  await expect(page.getByRole('heading', { name: 'While you were away' })).toBeVisible({
    timeout: 10_000,
  });
  /* Every incomplete card carries the way out that is not a slide. */
  await expect(page.getByRole('button', { name: /I didn/ }).first()).toBeVisible();
  /* Opening it marks nothing — only a completed slide or a saved reason does. */
  expect(app.stub.db.doses[0].taken).toBe(false);
});

test('the fill and the thumb are different shades of the one accent', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.doses = [
    {
      id: 'dddddddd-0000-4000-8000-000000000002',
      user_id: app.stub.db.profiles[0].id,
      schedule_item_id: null,
      glossary_id: null,
      name: 'Shade check',
      amount: '1 capsule',
      scheduled_time: '08:00:00',
      log_date: new Date().toISOString().slice(0, 10),
      taken: false,
      taken_at: null,
      notes: null,
    },
  ];
  await page.goto('/');
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Preview catch-up screen/ }).click();
  await page.locator('.catchup-track').first().waitFor();

  const shades = await page.evaluate(() => {
    const fill = document.querySelector('.catchup-fill') as HTMLElement;
    const thumb = document.querySelector('.catchup-thumb') as HTMLElement;
    return {
      fill: getComputedStyle(fill).backgroundColor,
      thumb: getComputedStyle(thumb).backgroundColor,
      /* No width animation during a drag: the fill must be transform-driven. */
      fillTransition: getComputedStyle(fill).transitionProperty,
    };
  });
  expect(shades.fill, 'the fill is the dim accent').toContain('123, 92, 250');
  expect(shades.thumb, 'the thumb is the solid accent').toBe('rgb(123, 92, 250)');
  expect(shades.fill).not.toBe(shades.thumb);
  expect(shades.fillTransition, 'nothing eases width').not.toContain('width');
});
