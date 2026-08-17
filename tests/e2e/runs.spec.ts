import { expect, seedSignedIn, test } from './support/app';
import { STUB_EMAIL } from './support/catalogue';
import type { Page } from '@playwright/test';

/**
 * The two complete walkthroughs — PROMPT_FINAL_TWO Part A.
 *
 * HOW THIS IS RUN: headless Chromium, driving the real UI served by the Vite
 * dev server, against the Supabase stub in `support/supabaseStub.ts`. Every
 * screen below is actually rendered and actually clicked. What that does **not**
 * cover is anything only a device has — the real database, StoreKit, iOS
 * notification delivery — and those are called out per step rather than
 * glossed.
 *
 * This is a recorder as much as a test. Findings are collected and printed
 * rather than thrown, because a run that stops at the first problem is not a
 * run; the assertions at the end are for the things that must not regress.
 */

const PASSWORD = 'smoke-account';

interface Log {
  screens: string[];
  findings: string[];
  notes: string[];
}

const mk = (): Log => ({ screens: [], findings: [], notes: [] });

/** Record a screen and check it for the six things the report asks about. */
async function visit(page: Page, log: Log, name: string) {
  log.screens.push(name);
  const body = await page.locator('body').innerText().catch(() => '');
  if (!body.trim()) log.findings.push(`${name}: rendered nothing`);
  for (const leak of ['undefined', 'NaN', '[object Object]', 'Infinity']) {
    if (body.includes(leak)) log.findings.push(`${name}: shows "${leak}" on screen`);
  }
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return d.scrollWidth > d.clientWidth + 1;
  });
  if (overflow) log.findings.push(`${name}: scrolls sideways`);
}

/** Onboarding, answering everything. Returns the screens seen in order. */
async function onboard(
  page: Page,
  log: Log,
  opts: { email: string; goals: number; stack: string[]; reactions: string[]; pro: boolean },
) {
  await page.goto('/');
  await visit(page, log, 'welcome');
  await page.getByRole('button', { name: 'Get started' }).click();

  await visit(page, log, 'auth');
  await page.getByPlaceholder('Email').fill(opts.email);
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD);
  await page.getByPlaceholder('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await page.getByRole('heading', { name: 'How old are you?' }).waitFor({ timeout: 20_000 });
  await visit(page, log, 'profile (age)');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: 'And your sex' }).waitFor();
  await visit(page, log, 'sex');
  await page.getByRole('button', { name: 'Female', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: /Anything you don.t eat/ }).waitFor();
  await visit(page, log, 'diet');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: 'Where this comes from' }).waitFor();
  await visit(page, log, 'info');
  const art = page.locator('img.ob-illustration');
  const artOk = (await art.count()) > 0 && (await art.evaluate((el: HTMLImageElement) => el.naturalWidth)) > 0;
  if (!artOk) log.findings.push('info: the illustration did not load');
  else log.notes.push('info: stacks.png rendered');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: /Have you started a routine/ }).waitFor();
  await visit(page, log, 'q2');
  await page.getByRole('radio', { name: 'Once or twice' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: 'What usually goes wrong?' }).waitFor();
  await visit(page, log, 'q3');
  await page.getByRole('radio', { name: 'I forget' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: 'Your day' }).waitFor();
  await visit(page, log, 'day (wake/sleep)');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: 'When do you eat?' }).waitFor();
  await visit(page, log, 'meals');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: /How many things are you taking/ }).waitFor();
  await visit(page, log, 'stack-count');
  const label =
    opts.stack.length === 0 ? 'Nothing yet' : opts.stack.length <= 2 ? 'One or two' : opts.stack.length <= 5 ? 'Three to five' : 'Six or more';
  await page.getByRole('button', { name: label }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: 'What are you already taking?' }).waitFor();
  await visit(page, log, 'current-stack');
  for (const name of opts.stack) {
    const box = page.getByPlaceholder(/Search|Add/i).first();
    if ((await box.count()) === 0) {
      log.findings.push('current-stack: no input to type a product into');
      break;
    }
    await box.fill(name);
    await page.waitForTimeout(450);
    const hit = page.locator('.ob-stack-hit, .ob-option, .ob-pick').first();
    if ((await hit.count()) > 0) await hit.click();
    else log.notes.push(`current-stack: "${name}" produced no match to click`);
  }
  await page.getByRole('button', { name: 'Continue' }).click();

  // the screen the whole of Run A is for
  await page.locator('.ob-root[data-step="stack-insight"]').waitFor({ timeout: 15_000 });
  await visit(page, log, 'stack-insight');
  const insight = await page.locator('.ob-body').innerText();
  log.notes.push(`stack-insight said: ${JSON.stringify(insight.replace(/\s+/g, ' ').trim())}`);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: /not agreed with you/ }).waitFor();
  await visit(page, log, 'reactions');
  for (const r of opts.reactions) {
    const box = page.getByRole('checkbox', { name: r });
    if ((await box.count()) > 0) await box.click();
    else log.notes.push(`reactions: no option named "${r}"`);
  }
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: /How do you prefer to take things/ }).waitFor();
  await visit(page, log, 'forms');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.locator('.ob-goals').waitFor();
  await visit(page, log, 'goals');
  /* The glyph only takes a tap once it is the centre card — the reel pages its
     neighbours in from off-stage behind a mask. So page to each by its tab
     first. Clicking nth(i) directly hangs on an element that is present but
     parked, which is how the first attempt at this run stalled for six minutes
     on step 16 of 27. */
  const GOAL_NAMES = ['Skin & hair', 'Sleep', 'Energy', 'Focus', 'Training', 'Immune', 'Growth'];
  let picked = 0;
  for (const name of GOAL_NAMES.slice(0, opts.goals)) {
    const tab = page.getByRole('tab', { name });
    if ((await tab.count()) === 0) {
      log.notes.push(`goals: no tab named "${name}"`);
      continue;
    }
    await tab.click();
    await page.waitForTimeout(350);
    const glyph = page.getByRole('button', { name, exact: true });
    if ((await glyph.count()) === 0) {
      log.notes.push(`goals: "${name}" glyph not tappable once centred`);
      continue;
    }
    await glyph.click();
    picked += 1;
  }
  log.notes.push(`goals: selected ${picked} of ${opts.goals} asked for`);
  await page.getByRole('button', { name: /Continue \(/ }).click();

  if (opts.goals > 1) {
    await page.getByRole('heading', { name: 'Which of those matters most?' }).waitFor();
    await visit(page, log, 'goal-priority');
    await page.locator('.ob-option').first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
  } else {
    log.notes.push('goal-priority skipped, as designed with one goal');
  }

  await page.getByRole('heading', { name: /How many days a week/ }).waitFor();
  await visit(page, log, 'commitment');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('heading', { name: 'Reminders at the right times' }).waitFor();
  await visit(page, log, 'notifications');
  await page.getByRole('button', { name: 'Not now' }).click();

  await visit(page, log, 'building-recs');
  await page.getByRole('heading', { name: 'Vitamins and minerals for you' }).waitFor({ timeout: 30_000 });
  /* The frame arrives before the list. Measure the gap: this is the "appeared
     without a loading state at its final dimensions" check. */
  const skel = await page.locator('.skel-row').count();
  await expect(page.locator('.ob-rec').first()).toBeVisible({ timeout: 30_000 });
  await visit(page, log, 'recommendations');
  if (skel === 0) log.findings.push('recommendations: no placeholder while the list loaded');
  else log.notes.push(`recommendations: ${skel} placeholder rows held the space`);
  const recCount = await page.locator('.ob-rec').count();
  log.notes.push(`recommendations: ${recCount} products offered`);
  await page.getByRole('button', { name: 'Create schedule' }).click();

  await page.getByRole('heading', { name: 'Here is your plan' }).waitFor();
  await visit(page, log, 'plan-preview');
  const preview = await page.locator('.ob-preview').innerText();
  log.notes.push(`plan-preview: ${JSON.stringify(preview.replace(/\s+/g, ' ').trim())}`);
  await page.getByRole('button', { name: 'See what it costs' }).click();

  await page.getByRole('heading', { name: 'Everything, in one place' }).waitFor();
  await visit(page, log, 'paywall');

  if (opts.pro) {
    await page.getByRole('button', { name: /Start with/ }).click();
  } else {
    await page.getByRole('button', { name: 'Continue with Free' }).click();
    await page.getByRole('heading', { name: 'Free covers one product' }).waitFor();
    await visit(page, log, 'free-pick');
    const cards = page.locator('.ob-rec');
    const n = await cards.count();
    const pro = await page.locator('.ob-rec-pro').count();
    log.notes.push(`free-pick: ${n} products listed, ${pro} marked "Tracked on Pro"`);
    if (n <= 1) log.findings.push('free-pick: the other selections were not carried through');
    if (pro === 0) log.findings.push('free-pick: nothing marked as Pro — the rest look dropped');
    await cards.first().click();
    await page.getByRole('button', { name: 'Build my schedule' }).click();
  }

  await visit(page, log, 'building-schedule');
  await page.getByRole('heading', { name: 'Your schedule' }).waitFor({ timeout: 30_000 });
  await visit(page, log, 'schedule');
  await page.getByRole('button', { name: 'Start' }).click();

  await page.getByRole('heading', { name: /You.re set/ }).waitFor();
  await visit(page, log, 'done');
  await page.getByRole('button', { name: /Continue|Done|Start/ }).first().click().catch(() => {});
}

function report(title: string, log: Log): string {
  return [
    `\n${'='.repeat(70)}`,
    title,
    '='.repeat(70),
    `SCREENS (${log.screens.length}), in order:`,
    ...log.screens.map((s, i) => `  ${String(i + 1).padStart(2)}. ${s}`),
    '',
    `NOTES (${log.notes.length}):`,
    ...log.notes.map((n) => `  · ${n}`),
    '',
    `FINDINGS (${log.findings.length}):`,
    ...(log.findings.length ? log.findings.map((f) => `  ! ${f}`) : ['  none']),
  ].join('\n');
}

/* ── Run A ───────────────────────────────────────────────────────────── */

test('RUN A — maximal', async ({ page, app }, info) => {
  test.setTimeout(900_000);
  const log = mk();
  app.allowConsoleError(/Failed to load resource|load failed/);

  await onboard(page, log, {
    email: 'run-a@pepstack.test',
    goals: 7,
    stack: ['Vitamin D3', 'Iron', 'Magnesium', 'B12', 'Vitamin E', 'Collagen'],
    reactions: ['Iron upset my stomach'],
    pro: true,
  });

  /* ── the app ── */
  await page.getByRole('heading', { name: 'Today' }).waitFor({ timeout: 20_000 });
  await visit(page, log, 'Today');
  const doses = await page.locator('.dose').count();
  log.notes.push(`Today: ${doses} dose rows`);
  if (doses === 0) log.findings.push('Today: no doses after building a schedule');

  // tick in more than one block
  const marks = page.locator('.dose-mark');
  for (let i = 0; i < Math.min(2, await marks.count()); i++) {
    await marks.nth(i).click();
    await page.waitForTimeout(250);
  }
  log.notes.push(`Today: ticked ${Math.min(2, await marks.count())} doses`);

  // catch-up: is touch_last_opened modelled, or silently swallowed?
  const rpcSeen = app.stub.lastOpened;
  log.notes.push(
    `catch-up: stub lastOpened = ${JSON.stringify(rpcSeen)} — the gate calls touchLastOpened() and a null previous open never fires by design`,
  );

  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.waitForTimeout(600);
  await visit(page, log, 'Discover (Vitamins & Minerals)');
  const prods = await page.locator('.prod').count();
  log.notes.push(`Discover: ${prods} products listed`);

  await page.getByRole('tab', { name: 'Peptides' }).click();
  await page.waitForTimeout(500);
  await visit(page, log, 'Discover (Peptides)');
  const pepBody = await page.locator('.tabs-panel.on').innerText();
  if (/\d+\s?(mg|mcg|iu)\b/i.test(pepBody)) {
    log.findings.push('Discover/Peptides: an amount is shown on a peptide');
  } else {
    log.notes.push('Discover/Peptides: no amount shown, as required');
  }

  // an ingredient that is inside a blend rather than in a title
  await page.getByRole('tab', { name: 'Vitamins & Minerals' }).click();
  const search = page.locator('.tabs-panel.on').getByPlaceholder(/Search/i);
  await search.fill('zinc');
  await page.waitForTimeout(900);
  const zincHits = await page.locator('.tabs-panel.on .prod').count();
  const titles = await page.locator('.tabs-panel.on .prod-name').allInnerTexts();
  const byTitle = titles.filter((t) => /zinc/i.test(t)).length;
  log.notes.push(
    `ingredient search "zinc": ${zincHits} results, ${byTitle} of which have zinc in the title`,
  );
  if (zincHits > 0 && zincHits === byTitle) {
    log.findings.push(
      'ingredient search only matched product titles — a blend containing zinc without the word in its name did not surface',
    );
  }
  await search.fill('');
  await page.waitForTimeout(600);

  await page.locator('.tabs-panel.on .prod-row').first().click();
  await page.waitForTimeout(500);
  await visit(page, log, 'Discover — product open');

  /* ── the assistant ── */
  await page.getByRole('tab', { name: 'Ask AI' }).click();
  const ask = page.locator('.tabs-panel').first();
  const questions = [
    'what helps with sleep',
    'is BPC-157 worth taking',
    'is it safe to take iron while pregnant',
    'can I take magnesium and zinc together',
  ];
  for (const q of questions) {
    await ask.getByPlaceholder(/Ask in a sentence/).fill(q.slice(0, 240));
    await ask.getByRole('button', { name: 'Send' }).click();
    await page.waitForTimeout(1800);
    const last = await ask.locator('.ask-bubble, .ask-error').last().innerText().catch(() => '(none)');
    log.notes.push(`ASK "${q}" -> ${JSON.stringify(last.replace(/\s+/g, ' ').slice(0, 220))}`);
    if (/BPC|peptide/i.test(q)) {
      const cards = await ask.locator('.ask-card').count();
      if (cards > 0) log.findings.push('peptide question returned product cards');
      if (/\d+\s?(mg|mcg)\b/i.test(last)) log.findings.push('peptide answer contains an amount');
    }
    if (/pregnan/i.test(q)) {
      if (!/doctor|midwife|pharmacist|healthcare|professional/i.test(last)) {
        log.findings.push('pregnancy answer did not refer to a professional');
      }
    }
  }
  await visit(page, log, 'Ask AI');

  const reportBtn = ask.getByRole('button', { name: /Report/i }).first();
  if ((await reportBtn.count()) > 0) {
    await reportBtn.click();
    await page.waitForTimeout(500);
    log.notes.push('report control opened');
    await page.getByRole('button', { name: 'Close' }).first().click().catch(() => {});
  } else {
    log.findings.push('Ask AI: no report control on an answer');
  }

  /* ── You ── */
  await page.getByRole('button', { name: 'You', exact: true }).click();
  await page.waitForTimeout(800);
  await visit(page, log, 'You');
  const rows = await page.locator('.row .row-label').allInnerTexts();
  log.notes.push(`You rows: ${rows.join(' | ')}`);

  for (const row of ['Notifications', 'Subscription', 'Export Data']) {
    const btn = page.getByRole('button', { name: new RegExp(row) }).first();
    if ((await btn.count()) === 0) {
      log.findings.push(`You: no "${row}" row`);
      continue;
    }
    await btn.click();
    await page.waitForTimeout(700);
    await visit(page, log, `You → ${row}`);
    await page.getByRole('button', { name: 'Close' }).first().click().catch(() => {});
    await page.waitForTimeout(400);
  }

  /* ── delete the account ── */
  const del = page.getByRole('button', { name: 'Delete Account' });
  if ((await del.count()) === 0) {
    log.findings.push('You: no Delete Account row — 5.1.1(v) requires one');
  } else {
    await del.click();
    await page.waitForTimeout(600);
    await visit(page, log, 'You → Delete Account');
    const field = page.locator('.sheet input').first();
    if ((await field.count()) > 0) {
      await field.fill('DELETE');
      await page.getByRole('button', { name: /Delete my account/i }).click();
      await page.waitForTimeout(1500);
      log.notes.push(`account deletion reached; stub recorded deleted=${app.stub.deleted}`);
      if (!app.stub.deleted) log.findings.push('Delete Account: the RPC was never called');
    } else {
      log.findings.push('Delete Account: no confirmation field');
    }
  }

  console.log(report('RUN A — maximal (observed, headless Chromium + stub)', log));
  await info.attach('run-a.txt', { body: report('RUN A', log), contentType: 'text/plain' });

  // the two that must not regress
  expect(log.screens.length, 'screens visited').toBeGreaterThan(20);
});

/* ── Run B ───────────────────────────────────────────────────────────── */

test('RUN B — minimal', async ({ page, app }, info) => {
  test.setTimeout(900_000);
  const log = mk();
  app.allowConsoleError(/Failed to load resource|load failed/);

  await onboard(page, log, {
    email: 'run-b@pepstack.test',
    goals: 1,
    stack: [],
    reactions: [],
    pro: false,
  });

  await page.getByRole('heading', { name: 'Today' }).waitFor({ timeout: 20_000 });
  await visit(page, log, 'Today');
  const doses = await page.locator('.dose').count();
  log.notes.push(`Today: ${doses} dose rows on a free, one-product account`);

  /* ── the one-product limit ── */
  await page.getByRole('button', { name: 'Add to Schedule' }).click();
  await page.waitForTimeout(700);
  await visit(page, log, 'Today → Add to Schedule');
  await page.getByRole('button', { name: 'Close' }).first().click().catch(() => {});

  /* ── the assistant cap ── */
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.getByRole('tab', { name: 'Ask AI' }).click();
  const ask = page.locator('.tabs-panel').first();
  for (let i = 1; i <= 4; i++) {
    const q = `question number ${i}`;
    await ask.getByPlaceholder(/Ask in a sentence/).fill(q);
    const send = ask.getByRole('button', { name: 'Send' });
    if (!(await send.isEnabled())) {
      log.notes.push(`message ${i}: Send disabled before sending`);
      break;
    }
    await send.click();
    await page.waitForTimeout(1600);
    const draft = await ask.getByPlaceholder(/Ask in a sentence/).inputValue();
    const last = await ask.locator('.ask-bubble, .ask-error').last().innerText().catch(() => '');
    log.notes.push(
      `message ${i}: reply ${JSON.stringify(last.replace(/\s+/g, ' ').slice(0, 120))}; box ${draft ? 'kept the text' : 'was cleared'}`,
    );
    if (i === 4 && !draft) {
      log.findings.push('4th message: the typed text was cleared rather than kept');
    }
  }
  await visit(page, log, 'Ask AI (cap)');

  /* ── offline ── */
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.reload().catch(() => {});
  await page.waitForTimeout(2000);
  await visit(page, log, 'Today (offline)');
  const offlineLine = await page.locator('.offline-line').count();
  log.notes.push(`offline: ${offlineLine > 0 ? 'the offline line rendered' : 'no offline line'}`);
  const bodyOffline = await page.locator('body').innerText().catch(() => '');
  if (/failed to fetch|networkerror|typeerror/i.test(bodyOffline)) {
    log.findings.push('offline: a raw error string reached the screen');
  }
  await page.context().setOffline(false);
  await page.waitForTimeout(1200);
  await visit(page, log, 'Today (back online)');

  console.log(report('RUN B — minimal (observed, headless Chromium + stub)', log));
  await info.attach('run-b.txt', { body: report('RUN B', log), contentType: 'text/plain' });

  expect(log.screens.length, 'screens visited').toBeGreaterThan(20);
});
