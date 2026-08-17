import { expect, type Page } from '@playwright/test';
import { STUB_EMAIL } from './catalogue';

/**
 * One driver, twenty answers.
 *
 * `onboarding.spec.ts` walks the flow as a straight line: screen, assert,
 * click, next line. That is the right shape for one happy path and the wrong
 * shape for twenty, because half of what is worth testing is the flow *not*
 * going in a straight line — a question retired by an earlier answer, a step
 * re-opened by going back, a store restored from a kill.
 *
 * So this is a loop instead. It reads `data-step` off `.ob-root`, does whatever
 * the persona says for that screen, and waits for the step to change. Nothing
 * here knows the order of the flow, which means moving a screen in `FLOW`
 * cannot make these pass while the product is broken.
 */

/** Cleared by the six-character rule on the form and by nothing else. */
const FORM_PASSWORD = 'smoke-account';

/** `KEY` in src/onboarding/store.ts. */
export const STORE_KEY = 'pepstack.onboarding.v1';

export interface Persona {
  /** 1..20, the number in section 5 of PROMPT_PERSONALISATION.md */
  n: number;
  name: string;
  /** what this run is for, in one line. Printed with the report. */
  watch: string;

  age?: number;
  gender?: 'Male' | 'Female' | 'Prefer not to say';
  /** option labels to tick; `null` presses Skip; omitted presses Continue */
  diet?: string[] | null;
  reactions?: string[] | null;
  reactionsNote?: string;
  forms?: string[] | null;
  /** option labels; `null` presses Skip */
  q2?: string | null;
  q3?: string | null;
  wake?: string;
  sleep?: string;
  /** 'none' deletes every meal the flow starts with */
  meals?: 'none';
  /** names typed into the search box, catalogue or not */
  stack?: string[];
  /** goal names exactly as they appear on the cards */
  goals?: string[];
  notifications?: 'grant' | 'decline';
  /** 'restore' presses Restore Purchases first, then buys */
  paywall?: 'buy' | 'restore';

  /**
   * Extra work on a given screen, before the standard handler runs. If the
   * hook leaves on a different screen the standard handler is skipped, which
   * is what lets one drive the flow backwards mid-run.
   */
  hooks?: Record<string, (page: Page, run: RunRecord) => Promise<void>>;
}

export interface ScreenRecord {
  step: string;
  /** ms spent on the screen, arrival to departure */
  ms: number;
  /** `aria-valuenow` off the progress bar; null on the screens with no chrome */
  progress: number | null;
  /** anything clipped, blank, or otherwise wrong about the screen as drawn */
  problems: string[];
}

export interface RunRecord {
  persona: string;
  /** every screen shown, in the order shown, including any shown twice */
  screens: ScreenRecord[];
  ms: number;
  recommendations: { name: string; dose: string; why: string }[];
  /** the subtitle on the recommendations screen, which names the goals used */
  matchedTo: string;
  /** the "what was left out" block, flattened */
  leftOut: string;
  schedule: { slot: string; time: string; items: string[] }[];
  /** everything the run found, screen-qualified */
  problems: string[];
  /** appended by a hook, so a persona can record something the driver cannot */
  notes: string[];
}

/**
 * The screen currently up, or null once onboarding has handed over.
 *
 * Read out of the DOM rather than through a locator: the last thing this is
 * asked is whether onboarding is still there at all, and a locator would wait
 * for an element that has just been unmounted for good.
 */
export async function currentStep(page: Page): Promise<string | null> {
  return page.evaluate(() => document.querySelector('.ob-root')?.getAttribute('data-step') ?? null);
}

/** `aria-valuenow` off the progress bar; null on the screens with no chrome. */
async function progressOf(page: Page): Promise<number | null> {
  const raw = await page.evaluate(
    () => document.querySelector('.ob-progress')?.getAttribute('aria-valuenow') ?? null,
  );
  return raw === null ? null : Number(raw);
}

/**
 * What is wrong with the screen as drawn.
 *
 * Only containers that actually clip are checked. An element overflowing a
 * parent with `overflow: visible` is not a defect on its own — it is only a
 * defect once something above it cuts it off, and that ancestor is where this
 * reports it.
 */
async function audit(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const root = document.querySelector('.ob-root');
    if (!root?.querySelector('.ob-body')) return ['nothing mounted'];
    const problems: string[] = [];

    /* Let the screen finish sliding in first. Chrome counts a transformed
       descendant in its ancestor's scrollable overflow, so a screen measured
       mid-animation is 60px wider than the phone on every single screen —
       which is a report of nothing, twenty times over. The wrapper's own
       animations only: the loading screens run an infinite one underneath
       that would never settle. */
    const wrapper = document.querySelector('.ob-stage > .ob-screen');
    await Promise.all((wrapper?.getAnimations() ?? []).map((a) => a.finished.catch(() => {})));

    /* Clipped on purpose: the goal reel pages its neighbours in from off-stage
       behind a mask, and the age ruler draws ticks past both ends of the rail
       so the numbers keep going as you drag. */
    const BY_DESIGN = ['ob-goal-stage', 'ob-ruler'];

    const name = (el: HTMLElement) => {
      const cls = el.getAttribute('class');
      return cls ? `.${cls.trim().split(/\s+/).join('.')}` : el.tagName.toLowerCase();
    };

    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (!(el instanceof HTMLElement)) continue;
      if (BY_DESIGN.some((c) => el.classList.contains(c))) continue;
      const style = getComputedStyle(el);
      if (style.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) {
        problems.push(`${name(el)} holds ${el.scrollWidth}px of content in ${el.clientWidth}px`);
      }
      if (style.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1) {
        problems.push(
          `${name(el)} holds ${el.scrollHeight}px of content in ${el.clientHeight}px and cannot scroll`,
        );
      }
    }

    const body = root.querySelector('.ob-body');
    if (!(body?.textContent ?? '').trim() && !body?.querySelector('svg, img')) {
      problems.push('the body rendered nothing');
    }
    return problems;
  });
}

/* ── the per-screen handlers ─────────────────────────────────────────── */

const cta = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: false });
const heading = (page: Page, name: string | RegExp) => page.getByRole('heading', { name });

/**
 * Every screen is a pair: `ready` waits until it is worth looking at, `act`
 * leaves it. The audit runs between the two, so it measures the finished
 * screen rather than a loading state.
 */
interface Handler {
  ready: (page: Page) => Promise<void>;
  act: (page: Page, p: Persona, run: RunRecord) => Promise<void>;
}

/** Tick a set of options on one of the three multi-selects, or skip it. */
async function multi(page: Page, picks: string[] | null | undefined): Promise<void> {
  if (picks === null) {
    await cta(page, 'Skip').click();
    return;
  }
  for (const label of picks ?? []) await page.getByRole('checkbox', { name: label }).click();
  await cta(page, 'Continue').click();
}

/** Answer one of the three survey questions, or skip it. */
async function single(page: Page, pick: string | null | undefined): Promise<void> {
  if (pick === null || pick === undefined) {
    await cta(page, 'Skip').click();
    return;
  }
  await page.getByRole('radio', { name: pick }).click();
  await cta(page, 'Continue').click();
}

const HANDLERS: Record<string, Handler> = {
  welcome: {
    ready: async (page) => void (await expect(heading(page, 'Pepstack')).toBeVisible()),
    act: async (page) => void (await cta(page, 'Get started').click()),
  },

  auth: {
    ready: async (page) => {
      await expect(heading(page, 'Create your account')).toBeVisible();
      /* Email is the only way in, and the screen must not offer anything else.
         The Apple and Google buttons used to sit here permanently disabled,
         which is a control that cannot be used and therefore App Store Review
         Guideline 2.1 — a reviewer taps them first. Asserting they are absent
         rather than disabled is what stops them being drawn back in. */
      await expect(page.getByRole('button', { name: 'Continue with Apple' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
      await expect(page.getByPlaceholder('Email')).toBeVisible();
    },
    act: async (page) => {
      await page.getByPlaceholder('Email').fill(STUB_EMAIL);
      await page.getByPlaceholder('Password', { exact: true }).fill(FORM_PASSWORD);
      await page.getByPlaceholder('Confirm password').fill(FORM_PASSWORD);
      await cta(page, 'Create account').click();
    },
  },

  profile: {
    ready: async (page) => void (await expect(heading(page, 'About you')).toBeVisible()),
    act: async (page, p) => {
      if (p.age !== undefined) {
        const rail = page.getByRole('slider', { name: 'Age' });
        await rail.focus();
        const from = Number(await rail.getAttribute('aria-valuenow'));
        const key = p.age > from ? 'ArrowRight' : 'ArrowLeft';
        for (let i = 0; i < Math.abs(p.age - from); i++) await page.keyboard.press(key);
        await expect(rail).toHaveAttribute('aria-valuenow', String(p.age));
      }
      // exact, or "Male" also matches "Female"
      if (p.gender) await page.getByRole('button', { name: p.gender, exact: true }).click();
      await cta(page, 'Continue').click();
    },
  },

  diet: {
    ready: async (page) => void (await expect(heading(page, /Anything you don.t eat/)).toBeVisible()),
    act: async (page, p) => multi(page, p.diet),
  },

  info: {
    ready: async (page) => void (await expect(heading(page, 'Where this comes from')).toBeVisible()),
    act: async (page) => void (await cta(page, 'Continue').click()),
  },

  q2: {
    ready: async (page) => void (await expect(heading(page, /Have you started a routine/)).toBeVisible()),
    act: async (page, p) => single(page, p.q2),
  },
  q3: {
    ready: async (page) => void (await expect(heading(page, 'What usually goes wrong?')).toBeVisible()),
    act: async (page, p) => single(page, p.q3),
  },

  /* The waking window and the meals, one screen since 0.12. Both halves are
     driven here, in that order, because the meal list sits under the dial. */
  day: {
    ready: async (page) => {
      await expect(heading(page, 'Your day')).toBeVisible();
      await expect(page.locator('.ob-dial')).toBeVisible();
    },
    act: async (page, p) => {
      if (p.sleep) await page.locator('#ob-sleep').fill(p.sleep);
      if (p.wake) await page.locator('#ob-wake').fill(p.wake);
      if (p.meals === 'none') {
        const rows = page.locator('.ob-meal');
        // each removal collapses for 200ms before it leaves the list
        for (let left = await rows.count(); left > 0; left--) {
          await rows.first().locator('button').click();
          await expect(rows).toHaveCount(left - 1);
        }
      }
      await cta(page, 'Continue').click();
    },
  },

  'current-stack': {
    ready: async (page) => void (await expect(heading(page, 'What are you already taking?')).toBeVisible()),
    act: async (page, p) => {
      for (const name of p.stack ?? []) {
        await page.getByLabel('Search supplements').fill(name);
        // a catalogue hit lists it; anything else offers to add the raw text
        await page.locator('.ob-result').first().click();
      }
      await cta(page, 'Continue').click();
    },
  },

  reactions: {
    ready: async (page) =>
      void (await expect(heading(page, /Has anything you.ve taken not agreed with you/)).toBeVisible()),
    act: async (page, p) => {
      if (p.reactionsNote !== undefined && p.reactions !== null) {
        await page.getByRole('button', { name: 'Something else' }).click();
        await page.getByLabel('Anything else that did not agree with you').fill(p.reactionsNote);
      }
      await multi(page, p.reactions);
    },
  },

  forms: {
    ready: async (page) => void (await expect(heading(page, 'How do you prefer to take things?')).toBeVisible()),
    act: async (page, p) => multi(page, p.forms),
  },

  goals: {
    // no heading — the CTA counts the selection instead
    ready: async (page) => void (await expect(page.locator('.ob-goals')).toBeVisible()),
    act: async (page, p) => {
      for (const name of p.goals ?? []) {
        // page to it first: the glyph only takes a tap once it is the centre card
        await page.getByRole('tab', { name }).click();
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.getByRole('button', { name: `${name}, selected` })).toBeVisible();
      }
      await cta(page, /Continue \(\d+ selected\)/).click();
    },
  },

  notifications: {
    ready: async (page) => void (await expect(heading(page, 'Reminders at the right times')).toBeVisible()),
    act: async (page, p) => {
      if (p.notifications === 'grant') await cta(page, 'Turn on reminders').click();
      else await cta(page, 'Not now').click();
    },
  },

  'building-recs': {
    ready: async (page) => void (await expect(page.getByText('Going through the research')).toBeVisible()),
    act: async () => {
      /* holds itself for 2.2s and advances on its own */
    },
  },

  recommendations: {
    ready: async (page) => {
      await expect(heading(page, 'Vitamins and minerals for you')).toBeVisible();
      /* The frame arrives before the list now — title, disclaimer and three
         card-height placeholders — so the heading is no longer evidence the
         data landed. This waits on the cards, and waits longer than the
         default because it is a round trip behind a 2.2s hold. */
      await expect(page.locator('.ob-rec').first()).toBeVisible({ timeout: 25_000 });
    },
    act: async (page, _p, run) => {
      for (const card of await page.locator('.ob-rec').all()) {
        run.recommendations.push({
          name: (await card.locator('.ob-card-title').innerText()).trim(),
          dose: (await card.locator('.ob-rec-dose').innerText()).trim(),
          why: (await card.locator('.ob-rec-why').count())
            ? (await card.locator('.ob-rec-why').innerText()).trim()
            : '',
        });
      }
      run.matchedTo = (await page.locator('.ob-sub').innerText()).replace(/\s+/g, ' ').trim();
      run.leftOut = (await page.locator('.ob-left-out').innerText()).replace(/\s+/g, ' ').trim();
      await cta(page, 'Create schedule').click();
    },
  },

  paywall: {
    ready: async (page) => void (await expect(heading(page, 'Everything, in one place')).toBeVisible()),
    act: async (page, p, run) => {
      if (p.paywall === 'restore') {
        await page.getByRole('button', { name: 'Restore Purchases' }).click();
        await expect(page.getByRole('status')).toHaveText('No previous purchase found on this account.');
        run.notes.push('restore with no purchase says so and stays on the paywall');
      }
      await cta(page, 'Start with Pepstack').click();
    },
  },

  'building-schedule': {
    ready: async (page) => void (await expect(page.getByText('Fitting these around your meals')).toBeVisible()),
    act: async () => {
      /* holds itself for 1.8s */
    },
  },

  schedule: {
    ready: async (page) => void (await expect(heading(page, 'Your schedule')).toBeVisible()),
    act: async (page, _p, run) => {
      for (const group of await page.locator('.ob-slots > div').all()) {
        run.schedule.push({
          slot: (await group.locator('.ob-slot-name').innerText()).trim(),
          time: (await group.locator('.ob-slot-time').innerText()).trim(),
          items: (await group.locator('.ob-dose-card .ob-card-title').allInnerTexts()).map((t) => t.trim()),
        });
      }
      await cta(page, 'Start').click();
    },
  },

  done: {
    ready: async (page) => void (await expect(heading(page, /You.re set/)).toBeVisible()),
    act: async () => {
      /* hands over to the app after 1.4s */
    },
  },
};

/* ── the loop ────────────────────────────────────────────────────────── */

/** Enough to walk the flow twice over; a loop that never ends fails loudly. */
const MAX_TRANSITIONS = 90;

export async function runPersona(page: Page, p: Persona): Promise<RunRecord> {
  const run: RunRecord = {
    persona: `${p.n}. ${p.name}`,
    screens: [],
    ms: 0,
    recommendations: [],
    matchedTo: '',
    leftOut: '',
    schedule: [],
    problems: [],
    notes: [],
  };

  await page.goto('/');
  const started = Date.now();
  /* Hooks fire once each. Two of these personas walk backwards, which means
     they see a screen twice — a hook that fired again on the second visit
     would put the run in a circle rather than through the branch. */
  const fired = new Set<string>();

  for (let moves = 0; moves < MAX_TRANSITIONS; moves++) {
    const step = await currentStep(page);
    if (step === null) break;
    const arrived = Date.now();

    const handler = HANDLERS[step];
    if (!handler) throw new Error(`no handler for step "${step}" — a screen was added to FLOW`);

    await handler.ready(page);
    const problems = await audit(page);
    const entry: ScreenRecord = { step, ms: 0, progress: await progressOf(page), problems };
    run.screens.push(entry);
    for (const problem of problems) run.problems.push(`${step}: ${problem}`);

    const hook = p.hooks?.[step];
    if (hook && !fired.has(step)) {
      fired.add(step);
      await hook(page, run);
    }
    // a hook that navigated owns the move; acting again would work the wrong screen
    if ((await currentStep(page)) === step) await handler.act(page, p, run);

    /* Not an expect(locator): the last screen leaves by unmounting the whole
       flow, and a negated attribute assertion on an element that no longer
       exists fails rather than passes. */
    await page.waitForFunction(
      (from) => document.querySelector('.ob-root')?.getAttribute('data-step') !== from,
      step,
      { timeout: 20_000 },
    );
    entry.ms = Date.now() - arrived;
  }

  run.ms = Date.now() - started;
  if (run.screens.length >= MAX_TRANSITIONS) {
    run.problems.push(`the flow never ended: ${MAX_TRANSITIONS} moves and still onboarding`);
  }
  return run;
}

/**
 * Where the onboarding store actually lives now.
 *
 * It used to be the bare key. `src/lib/storage.ts` scoped it per account and
 * wrapped the payload — `pepstack.onboarding.v1:anon` before anyone has signed
 * in, `pepstack.onboarding.v1:<uuid>` afterwards, each holding
 * `{ userId, savedAt, data }`.
 *
 * These two helpers kept reading and writing the bare key. Nothing threw: they
 * read `{}` and wrote somewhere the app does not look, so every test that
 * rewrote the store and relaunched was asserting against a store it had not
 * changed. Persona 6 is the one that noticed — it emptied the goals, got the
 * goals it started with, and reported the fallback broken.
 *
 * Newest `savedAt` wins, because the anonymous record survives until the
 * migration runs and both can exist for a moment.
 */
const STORE_PROBE = (base: string) => {
  let best: { key: string; savedAt: number; data: Record<string, unknown> } | null = null;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(`${base}:`)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) continue;
      const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0;
      if (!best || savedAt >= best.savedAt) {
        best = { key, savedAt, data: (parsed.data ?? {}) as Record<string, unknown> };
      }
    } catch {
      /* a record that cannot be parsed is not the store */
    }
  }
  return best;
};

/**
 * Put a store on the device before the app boots.
 *
 * Written to the anonymous slot in the wrapped shape, because that is what a
 * device that started onboarding and never signed in actually holds. Tests
 * that seeded the bare key were seeding somewhere the app stopped reading, so
 * the app booted from nothing and the assertion afterwards passed or failed on
 * a store the test never wrote.
 */
export async function seedStore(page: Page, data: Record<string, unknown>): Promise<void> {
  await page.addInitScript(
    ({ base, data }) => {
      localStorage.setItem(
        `${base}:anon`,
        JSON.stringify({ userId: null, savedAt: Date.now(), data }),
      );
    },
    { base: STORE_KEY, data },
  );
}

/** The persisted store, as the app would read it back on a cold open. */
export async function readStore(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    ({ base, probeSrc }) => {
      const probe = new Function(`return (${probeSrc})`)() as (b: string) => { data: Record<string, unknown> } | null;
      return probe(base)?.data ?? {};
    },
    { base: STORE_KEY, probeSrc: STORE_PROBE.toString() },
  );
}

/** Rewrite the store and reopen the app on it — a kill and a relaunch. */
export async function relaunch(page: Page, patch: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(
    ({ base, patch, probeSrc }) => {
      const probe = new Function(`return (${probeSrc})`)() as (
        b: string,
      ) => { key: string; data: Record<string, unknown> } | null;
      const found = probe(base);
      /* Nothing saved yet means nobody has signed in either, so the anonymous
         slot is the one the app will read on the next open. */
      const key = found?.key ?? `${base}:anon`;
      const userId = key.slice(base.length + 1);
      localStorage.setItem(
        key,
        JSON.stringify({
          userId: userId === 'anon' ? null : userId,
          savedAt: Date.now(),
          data: { ...(found?.data ?? {}), ...patch },
        }),
      );
    },
    { base: STORE_KEY, patch, probeSrc: STORE_PROBE.toString() },
  );
  await page.reload();
}

/** One line per screen, for the report. */
export function timeline(run: RunRecord): string {
  return run.screens.map((s) => s.step).join(' → ');
}
