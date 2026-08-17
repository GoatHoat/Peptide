import { expect, seedSignedIn, test } from './support/app';

/**
 * The same three screens at every iPhone width Apple currently ships, plus the
 * smallest one still supported.
 *
 * The two failures this is for are the ones that only appear at one width:
 * something running off the right edge on a narrow phone, and something hidden
 * under the floating tab bar on a tall one. Both have happened here — the
 * Discover card bled 12px past the panel, and a product row sat under the bar
 * because the reserve was a literal 34px written when the bar was a different
 * size.
 *
 * Heights are the real ones, because the tab bar is positioned from the bottom
 * and a wrong height moves it.
 */
const WIDTHS = [
  { name: 'iPhone SE / 8', width: 375, height: 667 },
  { name: 'iPhone 13 mini', width: 390, height: 844 },
  { name: 'iPhone 15 / 16', width: 393, height: 852 },
  { name: 'iPhone 15 Pro Max', width: 430, height: 932 },
  { name: 'iPhone 16 Pro Max', width: 440, height: 956 },
] as const;

const TABS = [
  ['Today', 0],
  ['Discover', 1],
  ['You', 2],
] as const;

for (const size of WIDTHS) {
  test(`nothing runs off the edge at ${size.width}px (${size.name})`, async ({ page, app }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await seedSignedIn(page, app.stub);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Today' }).waitFor();

    for (const [name, index] of TABS) {
      if (index > 0) {
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.locator('[data-active-tab]')).toHaveAttribute(
          'data-active-tab',
          String(index),
        );
      }
      await page.waitForTimeout(400);

      /* The page itself must never scroll sideways. The pager moves its track
         with a transform, which does not create overflow — anything that does
         is a real bleed. */
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
      });
      expect(
        overflow.scrollWidth,
        `${name} at ${size.width} scrolls sideways`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      /* And nothing on the screen you are looking at runs off its edge.
         Scoped to the active panel, and inside Discover to the active
         segmented panel, because the pager parks two panels either side and
         the segmented control parks two more — all of them hundreds of pixels
         out, all of them fine, and all of them noise in this measurement. */
      const bleeding = await page.evaluate((i) => {
        const panel = document.querySelectorAll('.panel')[i] as HTMLElement | undefined;
        if (!panel) return [];
        const root = (panel.querySelector('.tabs-panel.on') as HTMLElement | null) ?? panel;
        const box = root.getBoundingClientRect();
        const out: { cls: string; right: number; left: number }[] = [];
        for (const node of root.querySelectorAll<HTMLElement>('*')) {
          const r = node.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (getComputedStyle(node).position === 'fixed') continue;
          if (r.right > box.right + 1 || r.left < box.left - 1) {
            out.push({
              cls: (typeof node.className === 'string' ? node.className : node.tagName).slice(0, 40),
              right: Math.round(r.right - box.right),
              left: Math.round(box.left - r.left),
            });
          }
        }
        return out;
      }, index);

      expect(
        bleeding,
        `${name} at ${size.width}: ${bleeding.map((b) => `${b.cls} +${b.right}/-${b.left}`).join(', ')}`,
      ).toEqual([]);
    }
  });
}

test('the floating tab bar never covers the end of a screen', async ({ page, app }) => {
  /* The shortest supported screen, where the reserve has the least room to be
     wrong in. */
  await page.setViewportSize({ width: 375, height: 667 });
  await seedSignedIn(page, app.stub);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today' }).waitFor();

  for (const [name, index] of TABS) {
    if (index > 0) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('[data-active-tab]')).toHaveAttribute(
        'data-active-tab',
        String(index),
      );
    }
    await page.waitForTimeout(400);

    const clear = await page.evaluate((i) => {
      const panel = document.querySelectorAll('.panel')[i] as HTMLElement;
      const bar = document.querySelector('.bar') as HTMLElement | null;
      if (!bar) return null;
      panel.scrollTop = panel.scrollHeight;
      const barTop = bar.getBoundingClientRect().top;
      // the last thing in the scroller, once it is scrolled to the end
      const children = [...panel.querySelectorAll<HTMLElement>('*')].filter((n) => {
        const r = n.getBoundingClientRect();
        return r.height > 0 && r.width > 0 && getComputedStyle(n).position !== 'fixed';
      });
      const lowest = Math.max(...children.map((n) => n.getBoundingClientRect().bottom));
      return { barTop, lowest };
    }, index);

    if (!clear) continue;
    expect(
      clear.lowest,
      `${name}: content reaches ${Math.round(clear.lowest - clear.barTop)}px into the tab bar`,
    ).toBeLessThanOrEqual(clear.barTop + 1);
  }
});
