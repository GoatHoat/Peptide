import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, PORT, SUPABASE_ANON_KEY, SUPABASE_URL } from './tests/e2e/support/env';

/**
 * Four smoke tests against the dev server, with Supabase stubbed inside the
 * page. `npm run build` already proves the bundle compiles; these prove it
 * runs.
 *
 * The dev server is started fresh rather than reused, because the whole run
 * depends on it having been given the env vars below — silently attaching to
 * a server started some other way would test the wrong thing.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  // One retry, because this runs unattended overnight and a machine stall
  // should not be indistinguishable from a broken screen. A real break fails
  // both attempts; a retried pass is still reported as flaky.
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // The rule table in src/lib/recommend.ts, in Node. No browser, no
      // server, no fixture — it is pure and it is where a wrong answer is
      // invisible rather than a blank screen.
      name: 'rules',
      testDir: './tests/unit',
    },
    {
      name: 'iphone-width',
      // The phone layout, which is the only one shipped. Below 640 the app
      // drops the desktop frame and draws as it does on a device.
      use: { ...devices['Desktop Chrome'], viewport: { width: 393, height: 852 } },
    },
  ],
  webServer: {
    // --host is not optional: Vite otherwise binds localhost, which resolves
    // to ::1 first here, and nothing answers on 127.0.0.1.
    command: `npm run dev -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
      // Dev skips the paywall by default. The tests walk the flow the way it
      // ships, so item 0.10 — moving the paywall — is covered rather than
      // stepped over.
      VITE_SKIP_PAYWALL: 'false',
    },
  },
});
