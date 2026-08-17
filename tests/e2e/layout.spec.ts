import { expect, seedSignedIn, test } from './support/app';

/**
 * The three layout faults that only show at a moment: the first painted frame,
 * a resize, and the end of a scroller.
 */

test('the first painted frame is already positioned correctly', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');

  /* The fault this catches: `useTouch` started false and only resolved in an
     effect, and `trackX` was computed from a ref the transform could not
     depend on. So the first frame was the desktop layout measured against a
     container about to change size, and nothing recomputed until a tab was
     tapped. Measured before touching anything. */
  await page.locator('.panel').first().waitFor();
  const first = await page.evaluate(() => {
    const panel = document.querySelectorAll('.panel')[0] as HTMLElement;
    const host = document.querySelector('.app') as HTMLElement;
    return { panelLeft: panel.getBoundingClientRect().left, hostLeft: host.getBoundingClientRect().left };
  });
  expect(Math.abs(first.panelLeft - first.hostLeft)).toBeLessThan(2);
});

test('a resize repositions the track without needing a tab tap', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor();

  await page.setViewportSize({ width: 320, height: 720 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const p = document.querySelectorAll('.panel')[0] as HTMLElement;
    const h = document.querySelector('.app') as HTMLElement;
    return p.getBoundingClientRect().left - h.getBoundingClientRect().left;
  });
  expect(Math.abs(narrow), 'still aligned after a resize').toBeLessThan(2);

  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(300);
  const wide = await page.evaluate(() => {
    const p = document.querySelectorAll('.panel')[0] as HTMLElement;
    const h = document.querySelector('.app') as HTMLElement;
    return p.getBoundingClientRect().left - h.getBoundingClientRect().left;
  });
  expect(Math.abs(wide), 'still aligned after resizing back').toBeLessThan(2);
});

test('no scroll container shows a scrollbar', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor();

  const visible = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      const s = getComputedStyle(el);
      const scrolls = /auto|scroll/.test(s.overflowY) || /auto|scroll/.test(s.overflowX);
      if (!scrolls) continue;
      /* offsetWidth minus clientWidth is the gutter a bar occupies. Zero means
         no bar is taking layout space. */
      const gutter = el.offsetWidth - el.clientWidth;
      if (gutter > 0) bad.push(`${el.className || el.tagName} reserves ${gutter}px`);
      if (s.scrollbarWidth !== 'none') bad.push(`${el.className || el.tagName} scrollbar-width=${s.scrollbarWidth}`);
    }
    return bad;
  });
  expect(visible, visible.join('; ')).toEqual([]);
});

test('every scroller contains its overscroll', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor();

  /* `overscroll-behavior: none` was set once on the body and inner scrollers do
     not inherit it, so reaching the end of a panel rubber-banded the page
     behind it. */
  const chaining = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      const s = getComputedStyle(el);
      if (!/auto|scroll/.test(s.overflowY) && !/auto|scroll/.test(s.overflowX)) continue;
      if (s.overscrollBehaviorY === 'auto' || s.overscrollBehaviorX === 'auto') {
        bad.push(el.className || el.tagName);
      }
    }
    return bad;
  });
  expect(chaining, chaining.join('; ')).toEqual([]);
});

test('a short screen scrolls only as far as the tab bar reserve', async ({ page, app }) => {
  await seedSignedIn(page, app.stub);
  app.stub.db.schedule_items = [];
  app.stub.db.doses = [];
  await page.goto('/');
  await page.getByText('Nothing on your schedule yet').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(400);

  /* The rule is not "a short screen never scrolls" — measured, the empty Today
     ends 819px down in an 852px viewport, and the floating bar covers the last
     ~78px of that, so the action row genuinely is underneath it and has to be
     scrollable to reach. The 98px reserve is what makes that possible and is
     correct.
     What must not happen is a screen adding its own bottom spacer on top of
     that reserve, which is a second screenful of nothing. So the test is that
     the overrun never exceeds the reserve itself. */
  const { overrun, reserve } = await page.evaluate(() => {
    const p = document.querySelectorAll('.panel')[0] as HTMLElement;
    return {
      overrun: p.scrollHeight - p.clientHeight,
      reserve: parseFloat(getComputedStyle(p).paddingBottom),
    };
  });
  expect(
    overrun,
    `the empty Today scrolls ${overrun}px against a ${reserve}px tab-bar reserve`,
  ).toBeLessThanOrEqual(reserve + 1);
});
