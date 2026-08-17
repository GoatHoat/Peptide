import { expect, test } from '@playwright/test';
import type { GlossaryEntry } from '../../src/lib/api';
import { classifyForm, recommend, type Answers } from '../../src/lib/recommend';

/**
 * The rule table, one assertion per rule.
 *
 * These run in Node with no browser and no server — `src/lib/recommend.ts` is
 * pure, imports nothing at runtime, and is the one place in the app where a
 * wrong answer is invisible rather than a blank screen. The smoke tests prove
 * the recommendations screen renders; this proves the right things are on it.
 *
 * Fixtures are minimal and named after real catalogue rows, because the rules
 * match on the product name and slug and a fixture called "Product A" would
 * prove nothing.
 */

let seq = 0;
const entry = (over: Partial<GlossaryEntry> & { name: string }): GlossaryEntry => ({
  id: `id-${++seq}`,
  slug: over.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name: over.name,
  category: 'other',
  mechanism_summary: null,
  storage_notes: null,
  route: 'oral',
  research_summary: null,
  goal_tags: ['Energy'],
  search_keywords: [],
  kind: 'supplement',
  brand: null,
  product_form: 'Capsule',
  label_url: null,
  timing: null,
  timing_note: null,
  evidence: 'mixed',
  ods_url: null,
  ...over,
});

const answers = (over: Partial<Answers> = {}): Answers => ({
  goalTags: ['Energy'],
  goalLabel: 'energy',
  currentStack: [],
  diet: [],
  reactions: [],
  forms: [],
  ...over,
});

/** The library as it stands, cut down to the rows the rules can reach. */
const B12 = entry({ name: 'BulkSupplements.com Vitamin B12 1% (Methylcobalamin)', goal_tags: ['Focus'], product_form: 'Powder' });
const IRON_BISGLYCINATE = entry({ name: 'Thorne Iron Bisglycinate' });
const IRON_SULFATE = entry({ name: 'Nature Made Iron Ferrous Sulfate 65 mg' });
const ZINC = entry({ name: 'AOR Premium Zinc-Copper Balance' });
const MAG_GLYCINATE = entry({ name: 'Vinco’s Magnesium Glycinate', product_form: 'Powder' });
const MAG_CITRATE = entry({ name: 'NutriCology Magnesium Citrate' });
const MAG_THREONATE = entry({ name: 'Teraputics Magnesium L-Threonate' });
const OMEGA3_ALGAL = entry({ name: 'DEVA Vegan Omega-3 DHA-EPA' });
const OMEGA3_FISH = entry({ name: 'Nordic Naturals Fish Oil' });
const NIACIN = entry({ name: 'Bluebonnet Niacin 100 mg' });
const NIACINAMIDE = entry({ name: 'Thorne Niacinamide' });
const CALCIUM = entry({ name: 'NutriCology Calcium Citrate' });
const VITAMIN_D = entry({ name: 'Protocol For Life Balance High Potency D3 Cholecalciferol' });
const CHOLINE = entry({ name: 'KRK Supplements Choline Bitartrate' });
const CREATINE = entry({ name: 'Pure Advantage Creatine Monohydrate', product_form: 'Powder' });
const PEPTIDE = entry({ name: 'Thymalin', kind: 'peptide', route: 'injected', product_form: null });

const names = (r: ReturnType<typeof recommend>) => r.ranked.map((s) => s.entry.name);
const find = (r: ReturnType<typeof recommend>, e: GlossaryEntry) =>
  r.ranked.find((s) => s.entry.id === e.id);

/* ── the baseline, before any answer ─────────────────────────────────── */

test('ranks on goal overlap and carries the goal reason when no rule fires', () => {
  const two = entry({ name: 'Pure Advantage Creatine Monohydrate', goal_tags: ['Energy', 'Recovery'] });
  const r = recommend([CREATINE, two], answers({ goalTags: ['Energy', 'Recovery'] }));
  expect(names(r)[0]).toBe(two.name);
  expect(find(r, two)?.reason).toBe('Tagged Energy and Recovery — matches energy.');
});

test('never recommends a peptide, whatever the tags say', () => {
  const r = recommend([PEPTIDE, CREATINE], answers({ goalTags: ['Energy', 'Recovery', 'Injury'] }));
  expect(names(r)).toEqual([CREATINE.name]);
});

test('drops what they already take and says so', () => {
  const r = recommend([CREATINE, ZINC], answers({ currentStack: ['  pure advantage CREATINE monohydrate '] }));
  expect(names(r)).toEqual([ZINC.name]);
  expect(r.alreadyTaking).toEqual([CREATINE.name]);
});

test('an empty answer is the same as no preference', () => {
  const catalogue = [CREATINE, ZINC, MAG_CITRATE];
  const blank = recommend(catalogue, answers());
  const explicit = recommend(catalogue, answers({ diet: ['omnivore'], reactions: ['none'], forms: ['no-preference'] }));
  expect(names(explicit)).toEqual(names(blank));
});

/* ── diet (spec 2.1) ─────────────────────────────────────────────────── */

test('no meat puts B12 first even with no goal match at all', () => {
  const r = recommend([CREATINE, B12], answers({ diet: ['no-meat', 'no-red-meat'] }));
  expect(names(r)[0]).toBe(B12.name);
  expect(find(r, B12)?.reason).toBe(
    'You said no meat — this is the one thing with no reliable plant source.',
  );
  // it matched no goal; nothing else with no goal match survives
  expect(find(r, B12)?.goalHits).toEqual([]);
});

test('no meat surfaces iron, and the 1.8x is a diet note rather than a multiplier', () => {
  /* The ODS 1.8x figure is about iron from the whole diet, because non-haem
     iron absorbs less well. It is not a supplement dose. This used to be
     `amountFactor: 1.8` multiplied into the displayed figure, which printed
     32 mg as somebody's personal target and stated something ODS does not
     say. The rule now carries a sentence, and nothing can multiply by it. */
  const r = recommend([IRON_BISGLYCINATE, CREATINE], answers({ diet: ['no-meat'] }));
  const iron = find(r, IRON_BISGLYCINATE);
  expect(names(r)[0]).toBe(IRON_BISGLYCINATE.name);
  expect(iron?.dietaryIntakeNote, 'the note is missing').toBeTruthy();
  expect(iron!.dietaryIntakeNote!).toContain('1.8');
  // and it says what it applies to, which is the entire point of the change
  expect(iron!.dietaryIntakeNote!.toLowerCase()).toContain('diet');
  expect(
    (iron as unknown as Record<string, unknown>).amountFactor,
    'a multiplier survived and something could scale a dose with it',
  ).toBeUndefined();
});

test('no meat raises zinc', () => {
  const r = recommend([CREATINE, ZINC], answers({ diet: ['no-meat'] }));
  expect(names(r)[0]).toBe(ZINC.name);
  expect(find(r, ZINC)?.reason).toContain('Phytate');
});

test('no dairy raises calcium and vitamin D', () => {
  const r = recommend([CREATINE, CALCIUM, VITAMIN_D], answers({ diet: ['no-dairy'] }));
  expect(names(r).slice(0, 2).sort()).toEqual([CALCIUM.name, VITAMIN_D.name].sort());
  expect(find(r, CALCIUM)?.reason).toContain('no dairy');
});

test('no eggs raises choline', () => {
  const r = recommend([CREATINE, CHOLINE], answers({ diet: ['no-eggs'] }));
  expect(names(r)[0]).toBe(CHOLINE.name);
  expect(find(r, CHOLINE)?.reason).toContain('eggs');
});

test('no fish swaps the fish oil for the algal one rather than warning about it', () => {
  const r = recommend([OMEGA3_FISH, OMEGA3_ALGAL], answers({ diet: ['no-fish'] }));
  expect(names(r)).toEqual([OMEGA3_ALGAL.name]);
  expect(find(r, OMEGA3_ALGAL)?.reason).toBe(
    'Algal rather than fish oil, because you don’t eat fish.',
  );
  expect(r.swappedOut.map((s) => s.name)).toEqual([OMEGA3_FISH.name]);
});

test('no fish with nothing but fish oil leaves it out and reports it', () => {
  const r = recommend([OMEGA3_FISH, CREATINE], answers({ diet: ['no-fish'] }));
  expect(names(r)).toEqual([CREATINE.name]);
  expect(r.swappedOut.map((s) => s.name)).toEqual([OMEGA3_FISH.name]);
});

test('vegan fires every diet rule at once without duplicating a product', () => {
  const r = recommend(
    [B12, IRON_BISGLYCINATE, ZINC, CALCIUM, VITAMIN_D, CHOLINE, OMEGA3_ALGAL, OMEGA3_FISH, CREATINE],
    answers({ diet: ['no-red-meat', 'no-meat', 'no-fish', 'no-dairy', 'no-eggs'] }),
  );
  expect(names(r)[0]).toBe(B12.name);
  expect(names(r)).not.toContain(OMEGA3_FISH.name);
  expect(new Set(names(r)).size).toBe(names(r).length);
  for (const s of r.ranked) expect(s.reason).not.toBe('');
});

/* ── reactions (spec 2.2) ────────────────────────────────────────────── */

test('iron that upset them routes to the bisglycinate', () => {
  const r = recommend([IRON_SULFATE, IRON_BISGLYCINATE], answers({ reactions: ['iron-gi'] }));
  expect(names(r)).toEqual([IRON_BISGLYCINATE.name]);
  expect(find(r, IRON_BISGLYCINATE)?.reason).toContain('Bisglycinate rather than sulfate');
  // no timing chip: the card's sentence does not mention food, and a chip the
  // sentence cannot explain is the app inventing advice
  expect(find(r, IRON_BISGLYCINATE)?.timing).toBeNull();
  expect(r.swappedOut.map((s) => s.name)).toEqual([IRON_SULFATE.name]);
});

test('a reaction with no alternative keeps the nutrient and says so', () => {
  const r = recommend([IRON_SULFATE], answers({ reactions: ['iron-gi'] }));
  expect(names(r)).toEqual([IRON_SULFATE.name]);
  expect(find(r, IRON_SULFATE)?.reason).toBe('This is the only iron we have — take it with food.');
  expect(find(r, IRON_SULFATE)?.timing).toBe('with_food');
  expect(r.swappedOut).toEqual([]);
});

test('magnesium that loosened them routes to the glycinate and leaves the threonate alone', () => {
  const r = recommend(
    [MAG_CITRATE, MAG_GLYCINATE, MAG_THREONATE],
    answers({ reactions: ['mag-gi'] }),
  );
  expect(names(r)[0]).toBe(MAG_GLYCINATE.name);
  // threonate is neither the loosening form nor the preferred one: untouched
  expect(names(r)).toContain(MAG_THREONATE.name);
  expect(find(r, MAG_THREONATE)?.reason).toContain('Tagged');
  expect(r.swappedOut.map((s) => s.name)).toEqual([MAG_CITRATE.name]);
});

test('fish oil that repeats routes to the algal one, with food', () => {
  const r = recommend([OMEGA3_FISH, OMEGA3_ALGAL], answers({ reactions: ['fishoil-burp'] }));
  expect(names(r)).toEqual([OMEGA3_ALGAL.name]);
  expect(find(r, OMEGA3_ALGAL)?.timing).toBe('with_food');
  expect(find(r, OMEGA3_ALGAL)?.reason).toContain('Take it with food.');
});

/* ── nothing on a card goes unexplained ──────────────────────────────── */

test('a louder rule never buries the sentence that explains the figure', () => {
  const r = recommend(
    [IRON_BISGLYCINATE, IRON_SULFATE],
    answers({ diet: ['no-meat'], reactions: ['iron-gi'] }),
  );
  const iron = find(r, IRON_BISGLYCINATE);
  // the swap rule owns the reason line, and the diet note survives beside it
  expect(iron?.reason).toContain('Bisglycinate rather than sulfate');
  expect(iron?.dietaryIntakeNote, 'the louder rule buried the diet note').toBeTruthy();
});

test('a louder rule never buries the sentence that explains the with-food chip', () => {
  const r = recommend([ZINC], answers({ diet: ['no-meat'], reactions: ['zinc-nausea'] }));
  const zinc = find(r, ZINC);
  expect(zinc?.timing).toBe('with_food');
  expect(zinc?.reason).toContain('Phytate');
  expect(zinc?.reason).toContain('empty stomach');
});

test('a card never says the same thing twice', () => {
  const r = recommend([ZINC], answers({ reactions: ['zinc-nausea'] }));
  const reason = find(r, ZINC)?.reason ?? '';
  expect(reason.match(/empty stomach/g)).toHaveLength(1);
});

test('niacin flush routes to niacinamide, and the two forms stay distinguishable', () => {
  const r = recommend([NIACIN, NIACINAMIDE], answers({ reactions: ['niacin-flush'] }));
  expect(names(r)).toEqual([NIACINAMIDE.name]);
  expect(find(r, NIACINAMIDE)?.reason).toContain('Niacinamide rather than nicotinic acid');
  expect(r.swappedOut.map((s) => s.name)).toEqual([NIACIN.name]);
});

test('zinc nausea moves the timing and never removes the zinc', () => {
  const r = recommend([ZINC, CREATINE], answers({ reactions: ['zinc-nausea'] }));
  expect(names(r)).toContain(ZINC.name);
  expect(find(r, ZINC)?.timing).toBe('with_food');
  expect(find(r, ZINC)?.reason).toContain('With food rather than on an empty stomach');
});

test('capsules being hard to swallow ranks powders and liquids above them', () => {
  const r = recommend([IRON_BISGLYCINATE, CREATINE], answers({ reactions: ['large-caps'] }));
  expect(names(r)[0]).toBe(CREATINE.name);
  expect(find(r, CREATINE)?.reason).toContain('hard to swallow');
  // never a filter: the capsule is still on the list
  expect(names(r)).toContain(IRON_BISGLYCINATE.name);
});

test('the swallowing problem beats a stated preference for capsules', () => {
  const r = recommend(
    [IRON_BISGLYCINATE, CREATINE],
    answers({ reactions: ['large-caps'], forms: ['capsule'] }),
  );
  expect(names(r)[0]).toBe(CREATINE.name);
});

/* ── form preference (spec 2.3) ──────────────────────────────────────── */

test('a form preference re-ranks but never drops anything', () => {
  const r = recommend([IRON_BISGLYCINATE, CREATINE], answers({ forms: ['powder'] }));
  expect(names(r)[0]).toBe(CREATINE.name);
  expect(names(r)).toContain(IRON_BISGLYCINATE.name);
  expect(find(r, CREATINE)?.reason).toBe('You said you prefer powders.');
});

test('a form preference is worth less than a goal match', () => {
  const twoGoals = entry({ name: 'Thorne Copper Bisglycinate', goal_tags: ['Energy', 'Recovery'] });
  const r = recommend([twoGoals, CREATINE], answers({ goalTags: ['Energy', 'Recovery'], forms: ['powder'] }));
  expect(names(r)[0]).toBe(twoGoals.name);
});

/* ── form classification ─────────────────────────────────────────────── */

test('a softgel is a softgel and not a capsule', () => {
  expect(classifyForm('Softgel Capsule')).toBe('softgel');
  expect(classifyForm('Capsule')).toBe('capsule');
  expect(classifyForm('Powder')).toBe('powder');
  expect(classifyForm('Liquid')).toBe('liquid');
  expect(classifyForm(null)).toBe('other');
});
