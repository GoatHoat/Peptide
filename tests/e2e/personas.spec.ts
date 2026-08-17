import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from './support/app';
import { IRON_PRODUCT, B12_PRODUCT } from './support/catalogue';
import { readStore, relaunch, runPersona, seedStore, timeline, type Persona, type RunRecord } from './support/persona';

/**
 * Twenty runs through onboarding — section 5 of PROMPT_PERSONALISATION.md.
 *
 * The point is not coverage for its own sake. Every one of these is a branch
 * that the happy path in `onboarding.spec.ts` walks straight past: a question
 * retired by an earlier answer, that same question re-opened by going back, a
 * store restored from a kill, a screen asked to hold fifteen chips or none.
 *
 * Each run records every screen in the order it was shown, how long it spent
 * on each, the recommendations it ended with, and anything that rendered
 * blank or was clipped by a container. That record is attached to the test, so
 * a failure comes with the whole run rather than one assertion.
 */

/* ── the shared answers ──────────────────────────────────────────────── */

/** Every persona answers these unless it says otherwise. */
const BASE: Omit<Persona, 'n' | 'name' | 'watch'> = {
  gender: 'Female',
  q2: 'Once or twice',
  q3: 'I forget',
  goals: ['Sleep'],
  notifications: 'decline',
};

const persona = (p: Persona): Persona => ({ ...BASE, ...p });

/* ── running one ─────────────────────────────────────────────────────── */

/**
 * What every run is held to, whatever it answered: it ends in the app, it
 * ends with something to suggest, and nothing on the way was clipped or blank.
 */
async function report(run: RunRecord, info: TestInfo): Promise<void> {
  const lines = [
    `# ${run.persona}`,
    '',
    `${run.screens.length} screens, ${(run.ms / 1000).toFixed(1)}s`,
    '',
    '| screen | ms | progress | problems |',
    '| --- | --- | --- | --- |',
    ...run.screens.map(
      (s) => `| ${s.step} | ${s.ms} | ${s.progress ?? '—'} | ${s.problems.join('; ') || ''} |`,
    ),
    '',
    '## Recommendations',
    run.matchedTo || '—',
    '',
    ...run.recommendations.map((r) => `- **${r.name}** — ${r.dose}${r.why ? `\n  - ${r.why}` : ''}`),
    '',
    '## What was left out',
    run.leftOut || '—',
    '',
    '## Schedule',
    ...run.schedule.map((s) => `- ${s.time} ${s.slot}: ${s.items.join(', ') || '(empty)'}`),
    '',
    '## Notes',
    ...(run.notes.length ? run.notes.map((n) => `- ${n}`) : ['- none']),
  ];
  await info.attach('run.md', { body: lines.join('\n'), contentType: 'text/markdown' });

  // the list reporter shows this, which is what makes twenty runs readable
  console.log(
    `${run.persona} · ${(run.ms / 1000).toFixed(1)}s · ${run.screens.length} screens · ` +
      `${run.recommendations.length} recs: ${run.recommendations.map((r) => r.name).join(', ')}`,
  );
  console.log(`   ${timeline(run)}`);
  for (const problem of run.problems) console.log(`   ! ${problem}`);
}

/** One run, reported, held to what every run is held to. */
async function walk(p: Persona, page: Page, info: TestInfo): Promise<RunRecord> {
  const run = await runPersona(page, p);
  await report(run, info);

  expect(run.problems, 'clipped, blank or overflowing screens').toEqual([]);
  expect(run.recommendations.length, 'an empty recommendation list is a dead end').toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  return run;
}

/* ── 1-3: what they eat ──────────────────────────────────────────────── */

test('1. vegan, all six goals', async ({ page }, info) => {
  await page.context().grantPermissions(['notifications']);
  const run = await walk(
    persona({
      n: 1,
      name: 'Vegan, all six goals',
      watch: 'four diet answers at once, every goal, and the notification prompt actually asked',
      diet: ['No meat at all', 'No fish or seafood', 'No dairy', 'No eggs'],
      goals: ['Skin & hair', 'Sleep', 'Energy', 'Focus', 'Training', 'Immunity'],
      notifications: 'grant',
    }),
    page,
    info,
  );

  // "no reliable plant source" outranks every goal tag, so B12 is first
  expect(run.recommendations[0].name).toBe(B12_PRODUCT);
  expect(run.recommendations[0].why).toContain('no reliable plant source');
});

test('2. vegetarian and dairy-free, two goals', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 2,
      name: 'Vegetarian and dairy-free, two goals',
      watch: 'two diet rules that reach different nutrients, and a two-goal sentence',
      diet: ['No meat at all', 'No dairy'],
      // the two goals vitamin D is tagged for, so the no-dairy rule has
      // something to fire on — a rule that fires on a product the goals
      // dropped is a rule nobody sees
      goals: ['Skin & hair', 'Immunity'],
    }),
    page,
    info,
  );

  // no meat makes B12 required, no dairy pushes vitamin D up — both fired
  expect(run.recommendations[0].name).toBe(B12_PRODUCT);
  expect(run.recommendations.map((r) => r.why).join(' ')).toContain('fortified milk');
  expect(run.matchedTo).toContain('skin & hair and immunity');
});

test('3. omnivore, every survey question skipped', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 3,
      name: 'Omnivore, every question skipped',
      watch: 'a skip on all four optional questions has to mean "no preference", never an empty list',
      diet: ['I eat everything'],
      q2: null,
      q3: null,
      reactions: null,
      forms: null,
      goals: ['Focus'],
    }),
    page,
    info,
  );

  /* Skipping q2 is not answering "never tried", so q3 is still asked — the
     branch turns on the answer, not on whether one was given. */
  expect(run.screens.map((s) => s.step)).toContain('q3');
});

/* ── 4-5: the branch ─────────────────────────────────────────────────── */

test('4. "never tried" retires the follow-up question', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 4,
      name: '"Never tried" — q3 must not be shown',
      watch: 'isSkipped, and what the progress bar does when a step is walked over',
      q2: 'Never tried',
    }),
    page,
    info,
  );

  expect(run.screens.map((s) => s.step)).not.toContain('q3');

  /* The bar is one segment per FLOW entry, filled up to the current index, so
     walking over a step moves it two. That is the honest reading — the
     denominator is the flow, and a bar that renumbered itself per answer
     would be claiming progress it has not made. Asserted rather than left to
     a reader, because "does the progress bar jump" was the question. */
  const seen = run.screens.filter((s) => s.progress !== null);
  const jumps = seen
    .slice(1)
    .map((s, i) => (s.progress ?? 0) - (seen[i].progress ?? 0))
    .filter((d) => d > 1);
  /* Two now, not one. q3 is retired by answering "never tried", and free-pick
     is retired by subscribing — this persona buys, so the screen that asks a
     free user which product to keep is not shown. Both are steps skipped for a
     reason the person gave, which is exactly what a jump of two means. */
  /* Retired steps for this persona: q3 (answered "never tried"), goal-priority
     (one goal picked) and free-pick (subscribed). Each is skipped because of
     something the person said, which is exactly what a jump of two means. */
  expect(jumps, 'the bar moves one segment per screen except over a retired one').toEqual([2, 2, 2]);
});

test('5. going back and changing that answer brings the question back', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 5,
      name: '"Never tried", back, then "I always stop"',
      watch: 'the branch most likely to be broken: a skipped step re-opening on the way forward again',
      q2: 'Never tried',
      hooks: {
        // q2 retired q3, so the screen after q2 is this one
        day: async (page, run) => {
          await page.getByRole('button', { name: 'Back' }).click();
          /* Back has to land on q2 and not on q3: the same rule that hid it
             going forward has to hide it coming back, or the chevron walks
             into a screen the answer says does not exist. */
          await expect(page.locator('.ob-root')).toHaveAttribute('data-step', 'q2');
          run.notes.push('back from the day screen lands on q2, stepping over the retired q3');

          await page.getByRole('radio', { name: 'I always stop' }).click();
          await page.getByRole('button', { name: 'Continue' }).click();
          await expect(page.locator('.ob-root')).toHaveAttribute('data-step', 'q3');
          run.notes.push('changing the answer re-opens q3 on the next move forward');
        },
      },
      q3: 'Too many to keep track of',
    }),
    page,
    info,
  );

  /* The recorded timeline is what the driver drove, so the hook's own detour
     back to q2 is not in it — what is in it is the shape the detour produced:
     day, then q3, then day again. q3 appearing after a screen that comes
     later in FLOW is the branch re-opening, and it is the only way that
     ordering can happen. */
  const steps = run.screens.map((s) => s.step);
  expect(steps.filter((s) => s === 'day')).toHaveLength(2);
  expect(steps.indexOf('q3')).toBeGreaterThan(steps.indexOf('day'));
  expect(run.notes).toHaveLength(2);
});

/* ── 6-8: goals ──────────────────────────────────────────────────────── */

test('6. no goals at all falls back to the defaults', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 6,
      name: 'No goals selected',
      watch: 'DEFAULT_GOAL_IDS — the CTA will not let you past this screen empty, so the store is',
      hooks: {
        goals: async (page, run) => {
          /* The only way to reach the results with nothing selected: the CTA
             is disabled at zero, so the flow itself cannot produce this. A
             store written by an older build can, which is what the fallback
             in Results.tsx is for — and the only way to find out whether it
             still works. */
          const store = await readStore(page);
          await relaunch(page, { goals: [], step: Number(store.step) + 1 });
          run.notes.push('goals emptied in the store and reopened one screen further on');
        },
      },
    }),
    page,
    info,
  );

  // DEFAULT_GOAL_IDS is ['energy', 'immunity'], and the subtitle names what
  // the list was actually matched to rather than saying nothing
  expect(run.matchedTo).toContain('energy and immunity');
  // and it got there with the store still empty, not by quietly picking two
  expect((await readStore(page)).goals).toEqual([]);
});

test('7. all six goals', async ({ page }, info) => {
  await walk(
    persona({
      n: 7,
      name: 'All six goals, no diet answer',
      watch: 'every tag in the catalogue matched at once, and the list still capped at six',
      goals: ['Skin & hair', 'Sleep', 'Energy', 'Focus', 'Training', 'Immunity'],
    }),
    page,
    info,
  );
});

test('8. exactly one goal', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 8,
      name: 'Exactly one goal',
      watch: 'the singular sentence — "matched to sleep", not "matched to your goals"',
      goals: ['Sleep'],
    }),
    page,
    info,
  );

  expect(run.recommendations.some((r) => r.why.includes('matches sleep'))).toBe(true);
});

/* ── 9-12: age and sex ───────────────────────────────────────────────── */

test('9. age 14', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 9,
      name: 'Age 14, male',
      watch: 'the bottom of the age ruler, and which reference band answers for someone under 19',
      age: 14,
      gender: 'Male',
      goals: ['Energy'],
    }),
    page,
    info,
  );

  /* Male, so the menstrual question does not apply at any age and iron is one
     figure. The band for 14 is 14-18; the fixture holds no such row, and
     pickReference falls back to 19-50 rather than showing nothing. */
  const iron = run.recommendations.find((r) => r.name === IRON_PRODUCT);
  expect(iron!.dose).not.toContain('if you menstruate');
});

test('10. age 90', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 10,
      name: 'Age 90, female',
      watch: 'the 51+ band, where the age proxy is left to stand and iron is one figure again',
      age: 90,
      goals: ['Energy'],
    }),
    page,
    info,
  );

  const iron = run.recommendations.find((r) => r.name === IRON_PRODUCT);
  expect(iron, 'iron is tagged Energy and should be on this list').toBeTruthy();
  expect(iron!.dose).toContain('8 mg a day');
  expect(iron!.dose).not.toContain('if you menstruate');
});

test('11. prefer not to say', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 11,
      name: 'Gender "prefer not to say"',
      watch: 'iron has to read as a range, not as a number the app picked for them',
      gender: 'Prefer not to say',
      goals: ['Energy'],
    }),
    page,
    info,
  );

  const iron = run.recommendations.find((r) => r.name === IRON_PRODUCT);
  expect(iron!.dose).toContain('18 mg a day if you menstruate · 8 mg if you don’t');
});

test('12. female, 48', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 12,
      name: 'Female, 48',
      watch: 'the defect from 0.4 — age >= 51 must not be standing in for menstrual status',
      age: 48,
      goals: ['Energy'],
    }),
    page,
    info,
  );

  const iron = run.recommendations.find((r) => r.name === IRON_PRODUCT);
  expect(iron!.dose).toContain('18 mg a day if you menstruate · 8 mg if you don’t');
});

/* ── 13-16: the day ──────────────────────────────────────────────────── */

test('13. an overnight waking window', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 13,
      name: 'Awake 23:00 to 07:00',
      watch: 'a bedtime before the wake time — the arc drew the whole day as one segment before 0.9',
      wake: '23:00',
      sleep: '07:00',
      goals: ['Energy', 'Sleep'],
    }),
    page,
    info,
  );

  /* The arc holds one calendar day, so a day that runs past midnight ends
     there rather than doubling back. Both ends are read off the rendered
     labels: the collapsed span this used to draw showed the same time twice. */
  await expect(page.locator('.arc-ends span')).toHaveCount(2);
  const ends = await page.locator('.arc-ends span').allInnerTexts();
  expect(ends[0]).not.toBe(ends[1]);
  expect(ends[1]).toBe('12:00 AM');
  expect(run.schedule.flatMap((s) => s.items).length).toBeGreaterThan(0);
});

test('14. every meal deleted', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 14,
      name: 'No meals at all',
      watch: 'the empty state on meals, and what the schedule anchors to with nothing to anchor to',
      meals: 'none',
    }),
    page,
    info,
  );

  // morning and wind-down come off the sleep window, not off the meals, so
  // deleting every meal leaves two slots rather than none
  // lowercased because the slot headings are set in caps by the stylesheet
  expect(run.schedule.map((s) => s.slot.toLowerCase())).toEqual(['morning', 'wind-down']);
  // and everything ticked still landed somewhere; the first three are ticked
  expect(run.schedule.flatMap((s) => s.items)).toHaveLength(
    Math.min(3, run.recommendations.length),
  );
});

test('15. fifteen things already in the stack', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 15,
      name: 'Fifteen items in the current stack',
      watch: 'fifteen chips wrapping inside a screen that also holds a search box and a keyboard',
      stack: [
        B12_PRODUCT,
        IRON_PRODUCT,
        'Creatine monohydrate',
        'Ashwagandha KSM-66',
        'Rhodiola rosea',
        'L-theanine',
        'Beta alanine',
        'Citrulline malate',
        'Taurine',
        'Berberine',
        'NAC',
        'Quercetin',
        'Lutein',
        'Boron',
        'Molybdenum',
      ],
      goals: ['Sleep', 'Energy'],
    }),
    page,
    info,
  );

  // the two catalogue names have to come back as "already in your stack"
  expect(run.leftOut).toContain('Already in your stack');
  expect(run.leftOut).toContain(B12_PRODUCT);
  // and neither may be suggested again
  expect(run.recommendations.map((r) => r.name)).not.toContain(B12_PRODUCT);
});

test('16. nothing in the stack', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 16,
      name: 'Empty current stack',
      watch: 'the "Nothing yet" path, which only exists while the list is empty',
      stack: [],
    }),
    page,
    info,
  );

  expect(run.leftOut).not.toContain('Already in your stack');
});

/* ── 17-19: the optional answers ─────────────────────────────────────── */

test('17. every reaction at once', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 17,
      name: 'Every reaction ticked',
      watch: 'six rules firing on one run, including three with nothing in the catalogue to route to',
      reactions: [
        'Iron upset my stomach',
        'Magnesium gave me loose stools',
        'Fish oil repeats on me',
        'Niacin made me flush',
        'Capsules are too big to swallow',
        'Zinc on an empty stomach made me nauseous',
      ],
      reactionsNote: 'Anything effervescent',
      goals: ['Sleep', 'Energy'],
    }),
    page,
    info,
  );

  // the iron and magnesium the catalogue holds are both the preferred form
  expect(run.recommendations.map((r) => r.why).join(' ')).toContain('Bisglycinate rather than sulfate');
  // no rule may drop a nutrient outright — a reaction changes which, not whether
  expect(run.recommendations.map((r) => r.name)).toContain(IRON_PRODUCT);
});

test('18. "none of these" and "no preference" everywhere', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 18,
      name: 'The clear-all answer on every optional question',
      watch: 'the clear-all option, and the restore path on the paywall',
      diet: ['I eat everything'],
      reactions: ['None of these'],
      forms: ['No preference'],
      paywall: 'restore',
      goals: ['Immunity'],
    }),
    page,
    info,
  );

  expect(run.notes).toContain('restore with no purchase says so and stays on the paywall');
  // a clear-all answer must not read as a rule: no card may cite one
  expect(run.recommendations.every((r) => !r.why.includes('You said you prefer'))).toBe(true);
});

test('19. notifications declined', async ({ page }, info) => {
  await walk(
    persona({
      n: 19,
      name: 'Notifications declined',
      watch: 'the flow has to be identical either way — nothing may gate on the permission',
      notifications: 'decline',
    }),
    page,
    info,
  );
});

/* ── 20: the kill ────────────────────────────────────────────────────── */

test('20. killed at the goals screen and reopened', async ({ page }, info) => {
  const run = await walk(
    persona({
      n: 20,
      name: 'Killed at goals, reopened',
      watch: 'a backgrounded tab discarded by iOS: the step and every answer have to survive it',
      age: 41,
      diet: ['No fish or seafood'],
      reactions: ['Capsules are too big to swallow'],
      forms: ['Powders'],
      stack: ['Creatine monohydrate'],
      hooks: {
        goals: async (page, run) => {
          const before = await readStore(page);
          await page.reload();
          await expect(page.locator('.ob-root')).toHaveAttribute('data-step', 'goals');
          const after = await readStore(page);

          expect(after.step, 'the step index survives the kill').toBe(before.step);
          for (const key of ['profile', 'survey', 'diet', 'reactions', 'forms', 'currentStack', 'wake', 'sleep', 'meals']) {
            expect(after[key], `${key} survives the kill`).toEqual(before[key]);
          }
          run.notes.push(`reopened on goals with ${Object.keys(after).length} fields intact`);
        },
      },
    }),
    page,
    info,
  );

  expect(run.screens.filter((s) => s.step === 'goals')).toHaveLength(1);
});

/* ── the bounds clamp, on its own ────────────────────────────────────── */

test('a step index outside the flow clamps instead of blanking', async ({ page }) => {
  /* Same store, a step index that no longer exists — what a build that
     shortened FLOW leaves behind on a device that had already started. The
     clamp in store.ts is the only thing between that and FLOW[undefined]. */
  await seedStore(page, { step: 999 });
  await page.goto('/');

  const last = (await readStore(page)).step;
  /* 26 is the last index of a 27-screen FLOW, and this line is where the length
     of the flow is pinned. It has moved twice: free-pick after the paywall, and
     then six additions and two splits taking it from 20 to 27 — sex, meals,
     stack-count, stack-insight, goal-priority, commitment and plan-preview.
     Every one of them collects an answer that changes the result or shows
     something built from answers already given; the reasons are one line each
     in FINISH_REPORT.md. */
  expect(last, 'clamped to the last step rather than off the end').toBe(26);

  // and the screen it clamped onto is a screen, not a blank
  await expect(page.getByRole('heading', { name: /You.re set/ })).toBeVisible();
});

test('a negative step index clamps to the first screen', async ({ page }) => {
  await seedStore(page, { step: -4 });
  await page.goto('/');

  await expect(page.locator('.ob-root')).toHaveAttribute('data-step', 'welcome');
  // and the store was corrected on the way, not just rendered around
  expect((await readStore(page)).step).toBe(0);
});
