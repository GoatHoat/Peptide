import { chromium } from '@playwright/test';
import { BASE_URL } from './env';

/**
 * Load the app once before any test runs.
 *
 * Vite transpiles on demand, so the first navigation of a run pays for the
 * whole module graph — several hundred requests — while every later one is
 * served from its cache. With two workers starting together, both paid it at
 * once and `page.goto` could exceed the 60s test timeout waiting for `load`.
 * ask.spec.ts sorts first, so it took that hit on every run and looked like a
 * broken screen rather than a cold server.
 *
 * Warming here rather than raising the timeout keeps a real hang failing fast.
 */
export default async function warmup(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 180_000 });
    // the app mounts behind the auth gate; either outcome means it is compiled
    await page
      .locator('.app, .ob-root, .setup, #root > *')
      .first()
      .waitFor({ state: 'attached', timeout: 60_000 });
  } finally {
    await browser.close();
  }
}
