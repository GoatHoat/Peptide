import type { Page } from '@playwright/test';
import { expect, test } from './support/app';
import { seededScheduleItem, STUB_EMAIL, STUB_USER_ID } from './support/catalogue';
import { stubSession, type Stub } from './support/supabaseStub';
import { AUTH_STORAGE_KEY } from './support/env';

/**
 * Three fresh accounts in one browser — section 7 of PROMPT_FINISH.md.
 *
 * This is the walkthrough that found the bug `src/lib/storage.ts` exists to
 * close: three keys written to fixed names with no account in them and cleared
 * by nothing, so a second person signing in on the same phone skipped
 * onboarding entirely, landed on a Today screen built from the first person's
 * answers, and found the first person's conversation above their own question.
 *
 * Nothing ever leaked between devices — every table carries user_id under RLS.
 * It was local storage alone, on the one device two people actually share.
 *
 * The test walks it rather than describing it: A uses the app and signs out,
 * B and C each sign up behind them, and at every step it asks what is on the
 * device and who it belongs to.
 */

const SECOND = { id: '00000000-0000-4000-8000-0000000000b2', email: 'second@pepstack.test' };
const THIRD = { id: '00000000-0000-4000-8000-0000000000c3', email: 'third@pepstack.test' };
const FIRST = { id: STUB_USER_ID, email: STUB_EMAIL };

const FORM_PASSWORD = 'smoke-account';

/** Everything the app has written to this device, key by key. */
async function localKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith('pepstack.')),
  );
}

/** Who each stored record says it belongs to. */
async function owners(page: Page): Promise<Record<string, string | null | 'unwrapped'>> {
  return page.evaluate(() => {
    const out: Record<string, string | null | 'unwrapped'> = {};
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('pepstack.')) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? 'null');
        out[key] =
          parsed && typeof parsed === 'object' && 'userId' in parsed
            ? (parsed.userId as string | null)
            : 'unwrapped';
      } catch {
        out[key] = 'unwrapped';
      }
    }
    return out;
  });
}

/**
 * Sign in once, and only once.
 *
 * `seedSignedIn` uses addInitScript, which re-runs on every navigation — fine
 * for a test that opens the app and stays there, useless here: clearing the
 * session and reloading put it straight back, so the second account never
 * reached the sign-up screen at all. This writes the same records through a
 * single evaluate instead, so signing out stays signed out.
 */
async function signInOnce(page: Page, stub: Stub, who: { id: string; email: string }) {
  stub.identity = who;
  await page.evaluate(
    (seed: { authKey: string; session: string; userId: string }) => {
      localStorage.setItem(seed.authKey, seed.session);
      localStorage.setItem(
        `pepstack.onboarded.v1:${seed.userId}`,
        JSON.stringify({ userId: seed.userId, savedAt: Date.now(), data: true }),
      );
    },
    {
      authKey: AUTH_STORAGE_KEY,
      session: JSON.stringify(stubSession(who)),
      userId: who.id,
    },
  );
  await page.reload();
}

/** Sign up through the onboarding flow's own auth screen. */
async function signUpAs(page: Page, email: string): Promise<void> {
  await page.getByRole('heading', { name: 'Pepstack' }).waitFor();
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByRole('heading', { name: 'Create your account' }).waitFor();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(FORM_PASSWORD);
  await page.getByPlaceholder('Confirm password').fill(FORM_PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
}

test('three accounts in one browser keep nothing of each other', async ({ page, app }) => {
  test.setTimeout(120_000);

  /* ── A: already set up, and uses the app ────────────────────────────── */

  app.stub.db.schedule_items.push(seededScheduleItem());
  await page.goto('/');
  await signInOnce(page, app.stub, FIRST);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.dose').first()).toBeVisible({ timeout: 15_000 });

  // a conversation, which is the record that leaked most visibly
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.getByRole('tab', { name: 'Ask AI' }).click();
  const ask = page.locator('.tabs-panel').first();
  await ask.getByPlaceholder(/Ask in a sentence/).fill('what should I take for sleep');
  await ask.getByRole('button', { name: 'Send' }).click();
  await expect(ask.locator('.ask-bubble, .ask-entry').first()).toBeVisible({ timeout: 20_000 });

  const afterA = await owners(page);
  for (const [key, owner] of Object.entries(afterA)) {
    /* The one deliberate exception is documented in lib/storage.ts: which
       Discover tab was last open is UI state, not personal data. */
    if (key === 'pepstack.discover.tab') continue;
    expect(key, `${key} is not scoped to an account`).toContain(`:${FIRST.id}`);
    expect(owner, `${key} does not say who it belongs to`).toBe(FIRST.id);
  }

  /* ── A signs out, and the device keeps none of it ───────────────────── */

  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Sign Out' }).click();

  await expect(page.getByRole('heading', { name: 'Pepstack' })).toBeVisible({ timeout: 15_000 });
  const afterSignOut = await localKeys(page);
  expect(
    afterSignOut.filter((k) => k.includes(FIRST.id)),
    `A's records survived sign-out: ${afterSignOut.join(', ')}`,
  ).toEqual([]);

  /* ── B and C, each behind the last ──────────────────────────────────── */

  for (const account of [SECOND, THIRD]) {
    app.stub.identity = account;
    /* A genuinely new account owns nothing. A's rows are still in the stub's
       tables and the sign-in gate now treats an existing schedule as evidence
       that onboarding is finished — correctly, but it is A's evidence, not
       B's, and leaving it here would test the fixture rather than the app.
       The dedicated tests below cover that gate on its own. */
    app.stub.db.schedule_items = [];
    app.stub.db.doses = [];
    await signUpAs(page, account.email);

    /* The bug, exactly: the second account skipped straight to Today because
       the onboarded flag had no account in it. The first question of the flow
       is what proves it did not. */
    await expect(
      page.getByRole('heading', { name: 'About you' }),
      `${account.email} skipped onboarding`,
    ).toBeVisible({ timeout: 15_000 });

    // and nothing on the device belongs to anybody else
    for (const [key, owner] of Object.entries(await owners(page))) {
      if (key === 'pepstack.discover.tab') continue;
      expect(owner, `${key} still belongs to ${owner}`).not.toBe(FIRST.id);
      expect(key, `${key} still carries an old account`).not.toContain(FIRST.id);
    }

    /* Out again the hard way — this account has not finished onboarding, so
       there is no Sign Out row to press. Clearing the session is what closing
       the app and signing in as somebody else amounts to. */
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      }
    });
    await page.goto('/');
  }
});

test('an account that finished onboarding elsewhere does not repeat it', async ({ page, app }) => {
  /* The other half of the same gate. The local flag is a cache; the column is
     the source of truth, so a new device signs in and lands on Today. */
  app.stub.identity = FIRST;
  app.stub.db.profiles[0].onboarded_at = new Date().toISOString();

  await page.goto('/');
  // a device this account has never opened: a session, and no cached flag
  await page.evaluate(
    ({ authKey, session }) => {
      localStorage.clear();
      localStorage.setItem(authKey, session);
    },
    { authKey: AUTH_STORAGE_KEY, session: JSON.stringify(stubSession(FIRST)) },
  );
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 15_000 });
});

test('the one unscoped key is the one that is meant to be', async ({ page, app }) => {
  await page.goto('/');
  await signInOnce(page, app.stub, FIRST);
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.getByRole('tab', { name: 'Peptides' }).click();

  /* `pepstack.discover.tab` is left global on purpose and lib/storage.ts says
     so. This is here so that "unscoped" stays a decision somebody made rather
     than something that crept back in — if a second key ever joins it, this
     fails and the comment gets read. */
  const unscoped = (await localKeys(page)).filter((k) => !k.includes(':'));
  expect(unscoped).toEqual(['pepstack.discover.tab']);
});

/**
 * Signing in to an account that is already set up.
 *
 * This sent people back through the whole flow. Two separate causes, and both
 * are covered here because either one alone reproduces it:
 *
 *   1. Onboarding advanced to the first question the instant a session
 *      appeared, before anything had checked whose account it was.
 *   2. An account that finished onboarding before `onboarded_at` existed has a
 *      null stamp, so the gate read "not onboarded" and believed it.
 */
test('signing in to a set-up account does not re-run onboarding', async ({ page, app }) => {
  app.stub.db.profiles[0].onboarded_at = new Date().toISOString();
  app.stub.db.schedule_items.push(seededScheduleItem());

  await page.goto('/');
  await signUpAs(page, FIRST.email);

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'About you' })).toHaveCount(0);
});

test('an account with a schedule but no stamp is still not re-onboarded', async ({ page, app }) => {
  /* The rows that predate 0035. The column says null and the schedule says
     otherwise; the schedule is the one telling the truth. */
  app.stub.db.profiles[0].onboarded_at = null;
  app.stub.db.schedule_items.push(seededScheduleItem());

  await page.goto('/');
  await signUpAs(page, FIRST.email);

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'About you' })).toHaveCount(0);
});

test('a genuinely new account still gets the questions', async ({ page, app }) => {
  // the other direction, so the fix cannot swallow onboarding entirely
  app.stub.identity = SECOND;
  app.stub.db.schedule_items = [];

  await page.goto('/');
  await signUpAs(page, SECOND.email);

  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible({ timeout: 15_000 });
});
