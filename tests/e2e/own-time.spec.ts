import { test, expect, seedSignedIn } from './support/app';

/** "Add your own time" — the escape hatch, below the list, on Today. */
test('Today offers a way to add your own time, below the schedule', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor({ timeout: 20_000 });

  const btn = page.getByRole('button', { name: 'Add your own time' });
  await expect(btn).toBeVisible();

  /* Below the last block, not above it — it is the escape hatch, and the
     primary action is accepting the schedule that is there. */
  const rows = page.locator('.dose');
  if ((await rows.count()) > 0) {
    const last = await rows.last().boundingBox();
    const box = await btn.boundingBox();
    expect(box!.y, 'the button sits under the list').toBeGreaterThan(last!.y);
  }

  await btn.click();
  // it routes into the existing sheet, with the time field ready
  await expect(page.getByLabel('Time (optional)')).toBeFocused();
});
