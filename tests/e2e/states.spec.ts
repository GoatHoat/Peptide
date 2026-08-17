import type { Page } from '@playwright/test';
import { expect, seedSignedIn, test } from './support/app';

/**
 * The four sweeps in section 4 of PROMPT_FINISH.md, as assertions rather than
 * as a morning spent tapping around.
 *
 *   1. every loading state at final dimensions, so nothing shifts when data lands
 *   2. every empty state with one line of copy and one action
 *   3. every error state with a retry, never a raw error string
 *   4. every tap target 44x44, with a pressed state
 *
 * Written as a spec on purpose. An audit carried out once is a paragraph in a
 * report; an audit that runs is the only kind that survives the next change.
 */

/* ── 4. tap targets ──────────────────────────────────────────────────── */

/**
 * Apple's Human Interface Guidelines put the minimum at 44x44pt. Below that
 * the failure is not "hard to press" — it is pressing the wrong thing, which
 * on a screen about what you swallow is not a cosmetic problem.
 */
const MIN_TAP = 44;

/**
 * Controls allowed under 44, each because it is a word inside a sentence
 * rather than a target somebody aims at. Anything added here needs a reason
 * in this list, not a smaller number in the assertion.
 */
const INLINE_EXCEPTIONS = [
  /* Terms and Privacy inside the consent sentence, and the citation links
     inside an assistant answer. Enlarging a link inside running text moves the
     text around it; these are read, and tapped second. */
  'ask-cite',
  'ob-legal-link',
  'legal-inline',
  'ask-source',
];

interface Target {
  label: string;
  w: number;
  h: number;
  cls: string;
}

/** Every visible control on the screen, with the box you actually have to hit. */
async function tapTargets(page: Page, root = 'body'): Promise<Target[]> {
  return page.$$eval(
    `${root} button, ${root} a[href], ${root} [role="button"], ${root} [role="tab"], ${root} [role="radio"], ${root} [role="checkbox"], ${root} input[type="checkbox"]`,
    (nodes) =>
      nodes
        .filter((n) => {
          const el = n as HTMLElement;
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            r.width > 0 &&
            r.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            style.opacity !== '0' &&
            !(el as HTMLButtonElement).disabled
          );
        })
        .map((n) => {
          const el = n as HTMLElement;
          const r = el.getBoundingClientRect();

          /* What the finger actually hits, which is not always what is drawn.
             The pattern throughout this app is a small drawn control with an
             absolutely positioned ::after pulled outwards — the dose tick is
             24px of circle inside 44px of target. Measuring the element alone
             would report every one of those as a failure and push somebody
             into enlarging controls that are already fine. */
          let [top, right, bottom, left] = [0, 0, 0, 0];
          for (const pseudo of ['::before', '::after']) {
            const ps = getComputedStyle(el, pseudo);
            if (ps.content === 'none' || ps.position !== 'absolute') continue;
            const px = (v: string) => (v.endsWith('px') ? parseFloat(v) : 0);
            top = Math.max(top, -px(ps.top));
            right = Math.max(right, -px(ps.right));
            bottom = Math.max(bottom, -px(ps.bottom));
            left = Math.max(left, -px(ps.left));
          }

          return {
            label: (el.getAttribute('aria-label') || el.textContent || el.className || '?')
              .trim()
              .slice(0, 60),
            w: Math.round(r.width + left + right),
            h: Math.round(r.height + top + bottom),
            cls: el.className?.toString() ?? '',
          };
        }),
  );
}

function undersized(targets: Target[]): Target[] {
  return targets.filter(
    (t) =>
      (t.w < MIN_TAP || t.h < MIN_TAP) &&
      !INLINE_EXCEPTIONS.some((allowed) => t.cls.includes(allowed)),
  );
}

const describeAll = (list: Target[]) =>
  list.map((t) => `${t.w}x${t.h}  ${t.cls.split(' ')[0] || '(no class)'}  "${t.label}"`).join('\n');

/**
 * The pager's own controls are buttons with these labels; `role="tab"` on this
 * app means the segmented control inside Discover, which is a different thing.
 */
async function openTab(page: Page, name: 'Today' | 'Discover' | 'You', index: number) {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.locator('[data-active-tab]')).toHaveAttribute('data-active-tab', String(index));
  // the pager animates; measure after it has settled
  await page.waitForTimeout(500);
}

for (const [name, index] of [
  ['Today', 0],
  ['Discover', 1],
  ['You', 2],
] as const) {
  test(`every tap target on ${name} is at least 44x44`, async ({ page, app }) => {
    await seedSignedIn(page, app.stub);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Today' }).waitFor();
    if (index > 0) await openTab(page, name, index);
    else await page.waitForTimeout(500);

    const small = undersized(await tapTargets(page));
    expect(small, `undersized controls on ${name}:\n${describeAll(small)}`).toEqual([]);
  });
}

test('the pressed state exists on the controls that carry it', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor();

  /* `.pressable` is the one pressed state in the app. This does not assert
     every control has it — the tab bar and the dose tick draw their own — it
     asserts the class still does something, because a rule quietly renamed
     would leave every button in the app feeling dead and nothing would fail. */
  const active = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      })
      .some((rule) => rule.cssText.includes('.pressable') && rule.cssText.includes(':active')),
  );
  expect(active, '.pressable no longer has an :active rule').toBe(true);
  expect(await page.locator('.pressable').count()).toBeGreaterThan(0);
});

/* ── 1. loading at final dimensions ──────────────────────────────────── */

test('the schedule placeholder is the size the schedule will be', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.delayMs = 1200;
  await page.goto('/');

  const timeline = page.locator('.timeline');
  await page.locator('.skel').first().waitFor();
  const loadingBox = await timeline.boundingBox();

  await expect(page.locator('.dose').first()).toBeVisible({ timeout: 15_000 });
  app.stub.delayMs = 0;
  const loadedBox = await timeline.boundingBox();

  /* One seeded item against three placeholder rows, so these are not equal and
     were never going to be. What matters is that the placeholder is drawn in
     row-sized blocks rather than one line of centred text — the old state was
     ~60px tall and the loaded list is several times that, and everything below
     jumped by the difference. */
  expect(loadingBox!.height).toBeGreaterThan(150);
  const rows = await page.locator('.dose').count();
  expect(Math.abs(loadingBox!.height - loadedBox!.height)).toBeLessThan(72 * (3 - rows) + 24);
});

test('a placeholder row is the height of the row it stands in for', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.delayMs = 1200;
  await page.goto('/');

  const skelRow = page.locator('.timeline .skel-row').first();
  await skelRow.waitFor();
  const skelBox = await skelRow.boundingBox();

  await expect(page.locator('.dose').first()).toBeVisible({ timeout: 15_000 });
  app.stub.delayMs = 0;
  const dose = page.locator('.dose').first();
  const doseBox = await dose.boundingBox();
  // a dose row is min-height, not height: a long product name grows it
  const rowMin = parseFloat(
    await dose.evaluate((el) => getComputedStyle(el).minHeight),
  );

  expect(skelBox!.height).toBe(rowMin);
  expect(skelBox!.width).toBe(doseBox!.width);
  // and the placeholder is never taller than what replaces it
  expect(skelBox!.height).toBeLessThanOrEqual(doseBox!.height);
});

/* ── 3. error states ─────────────────────────────────────────────────── */

test('a schedule that will not load offers a way to try again', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.failing.add('/rest/v1/doses');
  app.allowConsoleError(/Failed to load resource/);
  /* The technical detail belongs in the console — that is the whole point of
     keeping it off the screen. These lines are the fix working. */
  app.allowConsoleError(/load failed/);
  await page.goto('/');

  const line = page.locator('.offline-line');
  await expect(line).toBeVisible();
  await expect(line).toContainText('Offline');
  await expect(line.getByRole('button', { name: 'Try again' })).toBeVisible();

  // and it is a retry, not a label: with the fault cleared the day arrives
  app.stub.failing.clear();
  await line.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.dose').first()).toBeVisible({ timeout: 15_000 });
  await expect(line).toBeHidden();
});

test('a library that will not load offers a way to try again', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.failing.add('/rest/v1/glossary');
  app.allowConsoleError(/Failed to load resource/);
  app.allowConsoleError(/load failed/);
  await page.goto('/');
  await openTab(page, 'Discover', 1);

  /* Scoped twice over, because nothing in this app unmounts: the pager keeps
     Today's own offline retry on the page, and Discover's segmented control
     keeps Peptides mounted beside Vitamins & Minerals. Both are translated off
     the viewport, so an unscoped .first() resolves to something visible,
     enabled, stable — and unclickable. */
  const shown = page.locator('.panel').nth(1).locator('.tabs-panel.on');
  const retry = shown.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible({ timeout: 15_000 });

  app.stub.failing.clear();
  await retry.click();
  await expect(page.locator('.prod').first()).toBeVisible({ timeout: 15_000 });
  await expect(retry).toHaveCount(0);
});

test('no error anywhere is an exception’s own words', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.failing.add('/rest/v1/');
  app.allowConsoleError(/Failed to load resource/);
  app.allowConsoleError(/load failed/);
  await page.goto('/');
  await page.waitForTimeout(1500);

  /* The shapes a raw error arrives in. Any of these on screen means something
     handed the person a string written for a developer. */
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const leak of [
    'failed to fetch',
    'typeerror',
    'networkerror',
    'postgrest',
    'jwt',
    'undefined is not',
    'stub has no route',
    '[object object]',
    'status code',
  ]) {
    expect(body, `a raw error string reached the screen: ${leak}`).not.toContain(leak);
  }
});

/* ── 2. empty states ─────────────────────────────────────────────────── */

test('an empty stack says what to do and offers the way to do it', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.stack_items = [];
  await page.goto('/');
  await openTab(page, 'You', 2);

  const empty = page.locator('.stack-empty');
  await expect(empty).toBeVisible({ timeout: 15_000 });
  await expect(empty).toContainText('Nothing in your stack yet');

  const action = empty.getByRole('button', { name: 'Browse Discover' });
  await expect(action).toBeVisible();
  await action.click();
  await expect(page.locator('[data-active-tab]')).toHaveAttribute('data-active-tab', '1');
});

test('a search with no matches offers the way back', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await openTab(page, 'Discover', 1);

  await page.locator('.panel').nth(1).locator('.tabs-panel.on').getByPlaceholder(/Search/i).fill('zzzzzzzz');
  /* The segmented control keeps Peptides mounted beside Vitamins & Minerals
     and neither matches "zzzzzzzz", so this has to be the one on screen. */
  const clear = page
    .locator('.panel')
    .nth(1)
    .locator('.tabs-panel.on')
    .getByRole('button', { name: 'Clear search' });
  await expect(clear).toBeVisible({ timeout: 15_000 });
  await clear.click();
  await expect(page.locator('.prod').first()).toBeVisible();
});

test('every empty state says more than that it is empty', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.stack_items = [];
  app.stub.db.progress_notes = [];
  await page.goto('/');
  await openTab(page, 'You', 2);
  await page.waitForTimeout(800);

  /* A bare "No notes yet." is a blank screen with a caption on it. Every empty
     state has to say what will put something there. */
  for (const node of await page.locator('.empty-state, .sheet-empty').all()) {
    if (!(await node.isVisible())) continue;
    const text = (await node.innerText()).trim();
    expect(text.length, `an empty state says only "${text}"`).toBeGreaterThan(24);
  }
});
