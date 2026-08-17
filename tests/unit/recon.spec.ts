import { expect, test } from '@playwright/test';
import {
  computeConcentrationMcgPerMl,
  computeDrawMl,
  computeRecon,
  drawFitsSyringe,
} from '../../src/lib/recon';

/**
 * The arithmetic, and the boundary around it.
 *
 * Two things are being held here. The first is that the sums are right — this
 * is the one place in the app where a wrong number reaches a syringe. The
 * second is that a half-filled form produces nothing at all, because a
 * confident figure derived from one field is worse than a blank.
 */

test('5 mg in 2 mL is 2500 mcg per mL', () => {
  expect(computeConcentrationMcgPerMl(5, 2)).toBe(2500);
});

test('a 250 mcg dose out of that is 0.1 mL, which is 10 units', () => {
  const draw = computeDrawMl(5, 2, 250, 'mcg');
  expect(draw).toBeCloseTo(0.1, 6);
  expect(draw * 100).toBeCloseTo(10, 6);
});

test('mg and mcg are the same dose expressed twice', () => {
  expect(computeDrawMl(5, 2, 1, 'mg')).toBeCloseTo(computeDrawMl(5, 2, 1000, 'mcg'), 9);
});

test('more water means a bigger draw for the same dose', () => {
  const tight = computeDrawMl(5, 1, 250, 'mcg');
  const loose = computeDrawMl(5, 3, 250, 'mcg');
  expect(loose).toBeGreaterThan(tight);
  // and exactly three times, because the concentration is a third
  expect(loose).toBeCloseTo(tight * 3, 9);
});

const base = { vialMg: '5', diluentMl: '2', doseAmount: '250', doseUnit: 'mcg' } as const;

test('a complete form computes', () => {
  const out = computeRecon({ ...base });
  expect(out?.concentrationMcgPerMl).toBe(2500);
  expect(out?.units100).toBeCloseTo(10, 6);
});

test('anything missing, zero, negative or not a number computes nothing', () => {
  for (const patch of [
    { vialMg: '' },
    { diluentMl: '' },
    { doseAmount: '' },
    { vialMg: '0' },
    { diluentMl: '0' },
    { doseAmount: '0' },
    { vialMg: '-5' },
    { diluentMl: 'two' },
    { doseAmount: 'abc' },
    { diluentMl: ' ' },
  ]) {
    expect(computeRecon({ ...base, ...patch }), JSON.stringify(patch)).toBeNull();
  }
});

test('a zero diluent cannot produce Infinity on the screen', () => {
  // the raw helper divides by it; the guarded entry point is what the UI calls
  expect(Number.isFinite(computeConcentrationMcgPerMl(5, 0))).toBe(false);
  expect(computeRecon({ ...base, diluentMl: '0' })).toBeNull();
});

test('the syringe note is about the barrel, not about the dose', () => {
  expect(drawFitsSyringe(10)).toBe(true);
  expect(drawFitsSyringe(0.2)).toBe(true);
  expect(drawFitsSyringe(100)).toBe(true);
  // below the smallest readable mark, and more than one barrel holds
  expect(drawFitsSyringe(0.1)).toBe(false);
  expect(drawFitsSyringe(101)).toBe(false);
});

test('nothing in the module knows about any substance', async () => {
  const src = await import('node:fs/promises').then((fs) =>
    fs.readFile(new URL('../../src/lib/recon.ts', import.meta.url), 'utf8'),
  );
  /* The property that keeps this a converter rather than the thing that was
     rejected. A default, a suggested range or a peptide name appearing here is
     the app becoming the source of a number again. */
  expect(src.toLowerCase()).not.toMatch(/bpc|tb-?500|ipamorelin|semaglutide|typical|recommend/);
});
