import { test as base, expect, type Page } from '@playwright/test';
import { AUTH_STORAGE_KEY, ONBOARDED_KEY } from './env';
import { B12_PRODUCT, IRON_PRODUCT, seededScheduleItem, STUB_EMAIL } from './catalogue';
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
  app: [
    async ({ page }, use) => {
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
    /* auto, because a fixture is only built when a test asks for it by name —
       and a test that forgets to ask gets no stub, no error checks, and real
       requests leaving the browser. The symptom is a signup failing on an
       empty response body, which reads as a broken screen rather than as a
       missing fixture. Nothing here is worth opting out of. */
    { auto: true },
  ],
});

export { expect };

/**
 * Drops the app straight into the signed-in, already-onboarded state, so the
 * Today and Discover tests are not the whole flow of setup each. The
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

/** The three multi-select questions use checkboxes — see MultiSelectScreen. */
const choice = (page: Page, name: string) => page.getByRole('checkbox', { name });

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

  await onScreen(page, /Anything you don.t eat/);
  // "No meat at all" implies "No red meat", so this asserts the implication
  // as well as the screen.
  await choice(page, 'No meat at all').click();
  await expect(choice(page, 'No red meat')).toBeChecked();
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

  await onScreen(page, /Has anything you.ve taken not agreed with you/);
  await choice(page, 'Iron upset my stomach').click();
  await cta(page, 'Continue').click();

  // Skipped rather than answered: an empty answer has to walk through cleanly,
  // and it is the one people will give most often.
  await onScreen(page, 'How do you prefer to take things?');
  await cta(page, 'Skip').click();

  // Goals has no heading — the CTA counts the selection instead.
  await expect(cta(page, 'Pick at least one')).toBeVisible();
  // The dots carry the same aria-label as the glyphs, so the glyph is named
  // by class rather than by role.
  await page.locator('button.ob-goal-icon').first().click();
  await cta(page, /Continue \(1 selected\)/).click();

  await onScreen(page, 'Reminders at the right times');
  await cta(page, 'Not now').click();

  /* Straight to the recommendations. Nothing asks for money before this
     screen, and the next assertion is what fails if the paywall moves back in
     front of it. */
  // building-recs holds itself for 2.2s before the list appears.
  await onScreen(page, 'What we found');
  /* The answers reached the scorer. B12 is tagged for goals this run did not
     pick and is first anyway, because "no meat at all" makes it required —
     if the three questions ever stop being passed down to the rules, the list
     still renders and only this notices. */
  await expect(page.locator('.ob-rec').first()).toContainText(B12_PRODUCT);
  await expect(page.locator('.ob-rec-why').first()).toContainText('no reliable plant source');
  /* Iron is the one figure the app cannot pick without being told, and this
     flow deliberately never asks — so both figures appear here too, each with
     the vegetarian 1.8× already applied. Quietly showing 32 mg would be the
     same defect wearing a different screen. */
  await expect(
    page.locator('.ob-rec', { hasText: IRON_PRODUCT }).locator('.ob-rec-dose'),
  ).toContainText('32 mg a day if you menstruate · 14 mg if you don’t');
  await cta(page, 'Create schedule').click();

  // The purchase is asked for here, after the list and before the schedule.
  await onScreen(page, 'Everything, in one place');
  await cta(page, 'Start with Pepstack').click();

  // building-schedule holds itself for 1.8s.
  await onScreen(page, 'Your schedule');
  await cta(page, 'Start').click();

  await onScreen(page, /You.re set/);
}
