import { expect, test } from '@playwright/test';
import type { GlossaryEntry, NutrientReference } from '../../src/lib/api';
import {
  figureDependsOnMenstruation,
  intakeLabel,
  intakeSentence,
  offersMenstrualStatus,
  pickReference,
  resolveIntake,
} from '../../src/lib/intake';

/**
 * Which figure applies to whom — and the one place the honest answer is two
 * figures.
 *
 * `src/lib/intake.ts` is pure, so these run in Node with no browser and no
 * server, next to the rule-table tests. The defect they exist for is silent:
 * `age >= 51` standing in for menopause renders 18 mg to a 46-year-old who
 * stopped menstruating at 44, and nothing on the screen says it guessed.
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

const IRON = entry({ name: 'Thorne Iron Bisglycinate' });
const IRON_SULFATE = entry({ name: 'Nature Made Iron Ferrous Sulfate 65 mg' });
const ZINC = entry({ name: 'AOR Premium Zinc-Copper Balance' });

const ref = (
  age_band: NutrientReference['age_band'],
  sex: NutrientReference['sex'],
  rda: number | null,
  ul: number | null,
  unit = 'mg',
): NutrientReference => ({ glossary_id: 'iron', age_band, sex, rda, ul, unit });

/** The iron rows exactly as migration 0017 seeds them. */
const IRON_ROWS: NutrientReference[] = [
  ref('19-50', 'm', 8, 45),
  ref('19-50', 'f', 18, 45),
  ref('51+', 'm', 8, 45),
  ref('51+', 'f', 8, 45),
  ref('14-18', 'm', 11, 45),
  ref('14-18', 'f', 15, 45),
];

/** A nutrient that differs by age but not by sex — zinc's shape, near enough. */
const ZINC_ROWS: NutrientReference[] = [
  ref('19-50', 'any', 11, 40),
  ref('51+', 'any', 11, 40),
  ref('14-18', 'any', 9, 34),
];

/* ── the band pick, unchanged by any of this ─────────────────────────── */

test('picks the sex-specific row, then the any row, then the adult band', () => {
  expect(pickReference(IRON_ROWS, 34, 'f')?.rda).toBe(18);
  expect(pickReference(ZINC_ROWS, 34, 'f')?.rda).toBe(11);
  expect(pickReference(ZINC_ROWS, 16, 'm')?.rda).toBe(9);
  // an unstated age reads as 19-50, the way every figure in the app does
  expect(pickReference(ZINC_ROWS, null, null)?.rda).toBe(11);
  expect(pickReference(undefined, 34, 'f')).toBeNull();
});

test('leaves every nutrient that is not iron alone', () => {
  expect(offersMenstrualStatus(ZINC, 34, 'f')).toBe(false);
  const i = resolveIntake(ZINC, ZINC_ROWS, 34, 'f', null);
  expect(i.rda).toBe(11);
  expect(i.rdaIfNot).toBeNull();
});

/* ── the defect ──────────────────────────────────────────────────────── */

test('renders both iron figures for a woman under 51 rather than picking one', () => {
  const i = resolveIntake(IRON, IRON_ROWS, 34, 'f', null);
  expect(i.rda).toBe(18);
  expect(i.rdaIfNot).toBe(8);
  expect(i.ul).toBe(45);
});

test('renders both figures at 46, which is where the age proxy was wrong', () => {
  // 45-50 is the band the old `age >= 51` test got wrong in the direction that
  // matters: it showed 18 mg to someone who may have stopped years earlier.
  expect(resolveIntake(IRON, IRON_ROWS, 46, 'f', null).rdaIfNot).toBe(8);
});

test('an unstated age still gets both figures', () => {
  const i = resolveIntake(IRON, IRON_ROWS, null, 'f', null);
  expect(i.rda).toBe(18);
  expect(i.rdaIfNot).toBe(8);
});

test('prefer-not-to-say on sex gets both figures rather than no figure at all', () => {
  // Iron's rows are sex-specific, so this resolved to nothing before and the
  // entry read "no set intake". Both figures are more use than none.
  expect(pickReference(IRON_ROWS, 34, 'na')).toBeNull();
  const i = resolveIntake(IRON, IRON_ROWS, 34, 'na', null);
  expect(i.rda).toBe(18);
  expect(i.rdaIfNot).toBe(8);
});

/* ── the answer ──────────────────────────────────────────────────────── */

test('an answer of yes gives the single 18 mg figure', () => {
  const i = resolveIntake(IRON, IRON_ROWS, 34, 'f', true);
  expect(i.rda).toBe(18);
  expect(i.rdaIfNot).toBeNull();
});

test('an answer of no gives the single 8 mg figure', () => {
  const i = resolveIntake(IRON, IRON_ROWS, 34, 'f', false);
  expect(i.rda).toBe(8);
  expect(i.rdaIfNot).toBeNull();
});

test('the answer beats the age proxy at 51 and over', () => {
  // Menstruating at 52 is exactly the person the proxy fails.
  expect(resolveIntake(IRON, IRON_ROWS, 52, 'f', true).rda).toBe(18);
  expect(resolveIntake(IRON, IRON_ROWS, 52, 'f', false).rda).toBe(8);
});

test('unanswered at 51 and over leaves the published figure alone', () => {
  const i = resolveIntake(IRON, IRON_ROWS, 60, 'f', null);
  expect(i.rda).toBe(8);
  expect(i.rdaIfNot).toBeNull();
});

test('never defaults to 18 for anyone the question was not put to', () => {
  expect(resolveIntake(IRON, IRON_ROWS, 34, 'm', null).rda).toBe(8);
  expect(figureDependsOnMenstruation(IRON, 34, 'm', null)).toBe(false);
});

/* ── who is asked ────────────────────────────────────────────────────── */

test('offers the question to women and to unstated sex, at any adult age', () => {
  expect(offersMenstrualStatus(IRON, 34, 'f')).toBe(true);
  expect(offersMenstrualStatus(IRON, 34, 'na')).toBe(true);
  expect(offersMenstrualStatus(IRON, null, null)).toBe(true);
  expect(offersMenstrualStatus(IRON, 60, 'f')).toBe(true);
  expect(offersMenstrualStatus(IRON, 34, 'm')).toBe(false);
});

test('does not put the question to 13-18 year olds', () => {
  // That band's figures carry adolescent growth as well as menstruation, so
  // there is no published "does not menstruate" figure to pair with them.
  expect(offersMenstrualStatus(IRON, 16, 'f')).toBe(false);
  const i = resolveIntake(IRON, IRON_ROWS, 16, 'f', null);
  expect(i.rda).toBe(15);
  expect(i.rdaIfNot).toBeNull();
});

test('recognises iron by any of its forms, not just the bisglycinate', () => {
  expect(offersMenstrualStatus(IRON_SULFATE, 34, 'f')).toBe(true);
});

test('invents no pair when the catalogue has only one of the two rows', () => {
  const partial = [ref('19-50', 'f', 18, 45)];
  const i = resolveIntake(IRON, partial, 34, 'f', null);
  expect(i.rda).toBe(18);
  expect(i.rdaIfNot).toBeNull();
});

/* ── how it reads ────────────────────────────────────────────────────── */

test('says it depends, in the sentence the spec asks for', () => {
  const i = resolveIntake(IRON, IRON_ROWS, 34, 'f', null);
  expect(intakeLabel(i)).toBe('18 or 8 mg');
  expect(intakeSentence(i)).toBe(
    'Daily target — 18 mg if you menstruate · 8 mg if you don’t. Upper limit 45 mg.',
  );
});

test('drops back to one figure once it has been told', () => {
  const i = resolveIntake(IRON, IRON_ROWS, 34, 'f', false);
  expect(intakeLabel(i)).toBe('8 mg');
  expect(intakeSentence(i)).toBe('Daily target — 8 mg. Upper limit 45 mg.');
});

test('says nothing where nothing is established', () => {
  const i = resolveIntake(ZINC, [], 34, 'f', null);
  expect(intakeLabel(i)).toBeNull();
  expect(intakeSentence(i)).toBeNull();
});

test('leaves the upper limit off when there is not one', () => {
  const i = resolveIntake(ZINC, [ref('19-50', 'any', 30, null, 'mcg')], 34, 'f', null);
  expect(intakeSentence(i)).toBe('Daily target — 30 mcg.');
});
