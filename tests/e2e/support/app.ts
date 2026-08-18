import { test as base, expect, type Page } from '@playwright/test';
import { AUTH_STORAGE_KEY, ONBOARDED_KEY } from './env';
import { STUB_USER_ID } from './catalogue';
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
  /**
   * Excuse one console line the browser writes itself.
   *
   * The only legitimate use is a response status the app asks for and renders —
   * a 429 or an aborted request in `ask.spec.ts`. Chromium logs "Failed to load
   * resource: …" for those before any of our code runs, and there is no way to
   * suppress it from the page. Anything the app logs is still a failure.
   */
  allowConsoleError(pattern: RegExp): void;
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

      const allowed: RegExp[] = [];
      const stub = await installSupabaseStub(page);
      await use({
        stub,
        consoleErrors,
        pageErrors,
        allowConsoleError: (pattern) => allowed.push(pattern),
      });

      expect(pageErrors, 'uncaught errors').toEqual([]);
      expect(
        consoleErrors.filter((line) => !allowed.some((pattern) => pattern.test(line))),
        'console errors',
      ).toEqual([]);
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
    (seed: { authKey: string; session: string; onboardedKey: string; userId: string }) => {
      localStorage.setItem(seed.authKey, seed.session);
      /* Scoped to the account and wrapped in the same envelope lib/storage
         writes. This wrote the bare key with a '1' in it, which stopped being
         what the app reads when local state was scoped per user — and a fixture
         that writes a shape the app no longer reads is a fixture testing
         nothing. */
      localStorage.setItem(
        `${seed.onboardedKey}:${seed.userId}`,
        JSON.stringify({ userId: seed.userId, savedAt: Date.now(), data: true }),
      );
    },
    {
      authKey: AUTH_STORAGE_KEY,
      session: JSON.stringify(stubSession()),
      onboardedKey: ONBOARDED_KEY,
      userId: STUB_USER_ID,
    },
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

  // one auth screen since 0.12: the providers sit above the form rather than
  // on a chooser of their own
  await onScreen(page, 'Create your account');
  await page.getByPlaceholder('Email').fill(STUB_EMAIL);
  await page.getByPlaceholder('Password', { exact: true }).fill(FORM_PASSWORD);
  await page.getByPlaceholder('Confirm password').fill(FORM_PASSWORD);
  await cta(page, 'Create account').click();

  // age and sex are two screens now — see FLOW
  await onScreen(page, 'How old are you?');
  await cta(page, 'Continue').click();

  await onScreen(page, 'And your sex');
  await cta(page, 'Female').click();
  await cta(page, 'Continue').click();

  await onScreen(page, /Anything you don.t eat/);
  // "No meat at all" implies "No red meat", so this asserts the implication
  // as well as the screen.
  await choice(page, 'No meat at all').click();
  await expect(choice(page, 'No red meat')).toBeChecked();
  await cta(page, 'Continue').click();

  await onScreen(page, 'Where this comes from');
  /* The artwork, not just the element. A wrong path renders a 0x0 img and the
     screen still looks fine in a DOM assertion — which is how the seventh goal
     slab shipped as a broken image and nothing noticed. */
  const art = page.locator('img.ob-illustration');
  await expect(art).toBeVisible();
  expect(await art.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await cta(page, 'Continue').click();

  await onScreen(page, /Have you started a routine/);
  // Not "Never tried" — that answer retires q3, and q3 is a screen worth
  // walking.
  await option(page, 'Once or twice').click();
  await cta(page, 'Continue').click();

  await onScreen(page, 'What usually goes wrong?');
  await option(page, 'I forget').click();
  await cta(page, 'Continue').click();

  // the waking window and the meals are two screens again: four time pickers
  // on one was the densest moment in the flow
  await onScreen(page, 'Your day');
  await cta(page, 'Continue').click();

  await onScreen(page, 'When do you eat?');
  await cta(page, 'Continue').click();

  // an easy number before the hard list
  await onScreen(page, /How many things are you taking/);
  await cta(page, 'One or two').click();
  await cta(page, 'Continue').click();

  await onScreen(page, 'What are you already taking?');
  await cta(page, 'Continue').click();

  /* The first screen that tells them something. With an empty stack there is
     nothing to conflict, and it must still say what it checked rather than
     render blank — which is what this assertion is for. */
  await expect(page.locator('.ob-body')).toContainText(/fights anything else|worth knowing/);
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

  /* goal-priority is skipped with one goal — a question with one answer is not
     a question. The next screen is the commitment. */
  await onScreen(page, /How many days a week/);
  await cta(page, 'Continue').click();

  await onScreen(page, 'Reminders at the right times');
  await cta(page, 'Not now').click();

  /* Straight to the recommendations. Nothing asks for money before this
     screen, and the next assertion is what fails if the paywall moves back in
     front of it. */
  // building-recs holds itself for 2.2s before the list appears.
  await onScreen(page, 'Vitamins and minerals for you');
  /* The answers reached the scorer. B12 is tagged for goals this run did not
     pick and is first anyway, because "no meat at all" makes it required —
     if the three questions ever stop being passed down to the rules, the list
     still renders and only this notices. */
  await expect(page.locator('.ob-rec').first()).toContainText(B12_PRODUCT);
  await expect(page.locator('.ob-rec-why').first()).toContainText('no reliable plant source');
  /* Iron is the one figure the app cannot pick without being told, and this
     flow deliberately never asks — so both published figures appear, exactly as
     stored. This asserted 32 mg and 14 mg, which was 18 and 8 with the ODS
     vegetarian 1.8x multiplied in. That figure is about iron from the whole
     diet, not about a supplement, so printing it as a personal target stated
     something ODS does not say. If anything ever multiplies a stored intake
     again, this line is what fails. */
  await expect(
    page.locator('.ob-rec', { hasText: IRON_PRODUCT }).locator('.ob-rec-dose'),
  ).toContainText('18 mg a day if you menstruate · 8 mg if you don’t');
  /* And the multiplier itself still reaches the screen — as a sentence, under
     the figure, saying what it actually applies to. */
  await expect(
    page.locator('.ob-rec', { hasText: IRON_PRODUCT }).locator('.ob-rec-diet'),
  ).toContainText('applies to your whole diet, not to this product');
  await cta(page, 'Create schedule').click();

  /* Their own answers, before money is mentioned. Nothing on it is new. */
  await onScreen(page, 'Here is your plan');
  await cta(page, 'See what it costs').click();

  /* The purchase is asked for here, after the list and before the schedule.
     Declining rather than buying: the paid button hands off to StoreKit or to
     Stripe in a browser, neither of which returns inside this process, so
     clicking it here waited for a screen that was never coming. Declining is
     also the path most people take, and it is the only one that reaches
     free-pick — which is the screen the flow after this depends on. */
  await onScreen(page, 'Everything, in one place');
  await expect(cta(page, 'Start with Pepstack')).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Free' }).click();

  /* Free covers one product, so declining reaches this whenever more than one
     was picked — and it is skipped when exactly one was, which is true of
     several of the personas. Conditional rather than unconditional for that
     reason: asserting it always appears would fail the single-pick walks, and
     asserting it never does would walk past it on the rest. */
  const freePick = page.getByRole('heading', { name: 'Free covers one product' });
  if (await freePick.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await page.locator('.ob-rec').first().click();
    await cta(page, 'Build my schedule').click();
  }

  // building-schedule holds itself for 1.8s.
  await onScreen(page, 'Your schedule');
  await cta(page, 'Start').click();

  await onScreen(page, /You.re set/);
}
