import { test as base, expect, type Page } from '@playwright/test';
import { AUTH_STORAGE_KEY, ONBOARDED_KEY } from './env';
import { seededScheduleItem, STUB_EMAIL } from './catalogue';
import { installSupabaseStub, stubSession, type Stub } from './supabaseStub';

/**
 * Nothing authenticates against this. The signup endpoint is intercepted in
 * the page; the string only has to clear the form's own six-character rule.
 */
const FORM_PASSWORD = 'smoke-account';

export interface AppFixture {
  stub: Stub;
  consoleErrors: string[];
  pageErrors: string[];
}

/**
 * Boots the app against the stub and holds it to three things afterwards: no
 * uncaught exception, no console error, and no Supabase call the stub did not
 * model. A screen that renders and throws is still broken, and a gate that
 * only proves the code compiles is what these tests exist to replace.
 */
export const test = base.extend<{ app: AppFixture }>({
  app: async ({ page }, use) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const stub = await installSupabaseStub(page);
    await use({ stub, consoleErrors, pageErrors });

    expect(pageErrors, 'uncaught errors').toEqual([]);
    expect(consoleErrors, 'console errors').toEqual([]);
    expect(stub.unhandled, 'Supabase calls the stub does not model').toEqual([]);
  },
});

export { expect };

/**
 * Drops the app straight into the signed-in, already-onboarded state, so the
 * Today and Discover tests are not twenty screens of setup each. The
 * onboarding test is the one that proves that path still works.
 */
export async function seedSignedIn(page: Page, stub: Stub): Promise<void> {
  stub.db.schedule_items.push(seededScheduleItem());
  await page.addInitScript(
    (seed: { authKey: string; session: string; onboardedKey: string }) => {
      localStorage.setItem(seed.authKey, seed.session);
      localStorage.setItem(seed.onboardedKey, '1');
    },
    { authKey: AUTH_STORAGE_KEY, session: JSON.stringify(stubSession()), onboardedKey: ONBOARDED_KEY },
  );
}

/** The heading on the screen we should be looking at before acting on it. */
async function onScreen(page: Page, title: string | RegExp): Promise<void> {
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

const cta = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: false });

/** The survey options are radios, not buttons — see SurveyScreen. */
const option = (page: Page, name: string) => page.getByRole('radio', { name });

/**
 * The whole flow, screen by screen.
 *
 * Every step asserts which screen it is on before it touches anything, because
 * most screens have a button reading "Continue" and clicking the wrong one is
 * indistinguishable from the flow working.
 */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.goto('/');

  await onScreen(page, 'Pepstack');
  await cta(page, 'Get started').click();

  await cta(page, 'Continue with email').click();

  await page.getByPlaceholder('Email').fill(STUB_EMAIL);
  await page.getByPlaceholder('Password', { exact: true }).fill(FORM_PASSWORD);
  await page.getByPlaceholder('Confirm password').fill(FORM_PASSWORD);
  await cta(page, 'Create account').click();

  await onScreen(page, 'About you');
  await cta(page, 'Female').click();
  await cta(page, 'Continue').click();

  await onScreen(page, 'Where this comes from');
  await cta(page, 'Continue').click();

  await onScreen(page, 'How a suggestion is made');
  await cta(page, 'Continue').click();

  await onScreen(page, /How many peptides or supplements/);
  await option(page, 'None yet').click();
  await cta(page, 'Continue').click();

  await onScreen(page, /Have you started a routine/);
  // Not "Never tried" — that answer retires q3, and q3 is a screen worth
  // walking.
  await option(page, 'Once or twice').click();
  await cta(page, 'Continue').click();

  await onScreen(page, 'What usually goes wrong?');
  await option(page, 'I forget').click();
  await cta(page, 'Continue').click();

  await onScreen(page, 'Your day, part one');
  await cta(page, 'Continue').click();

  await onScreen(page, 'Your day, part two');
  await cta(page, 'Continue').click();

  await onScreen(page, 'What are you already taking?');
  await cta(page, 'Continue').click();

  // Goals has no heading — the CTA counts the selection instead.
  await expect(cta(page, 'Pick at least one')).toBeVisible();
  // The dots carry the same aria-label as the glyphs, so the glyph is named
  // by class rather than by role.
  await page.locator('button.ob-goal-icon').first().click();
  await cta(page, /Continue \(1 selected\)/).click();

  await onScreen(page, 'Reminders at the right times');
  await cta(page, 'Not now').click();

  await onScreen(page, 'Everything, in one place');
  await cta(page, 'Start with Pepstack').click();

  // building-recs holds itself for 2.2s before the list appears.
  await onScreen(page, 'What we found');
  await cta(page, 'Create schedule').click();

  // building-schedule holds itself for 1.8s.
  await onScreen(page, 'Your schedule');
  await cta(page, 'Start').click();

  await onScreen(page, /You.re set/);
}
