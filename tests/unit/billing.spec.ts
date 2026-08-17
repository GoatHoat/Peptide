import { expect, test } from '@playwright/test';
import { ANNUAL_CENTS, ANNUAL_SAVING_PCT, MONTHLY_CENTS, PLANS } from '../../src/lib/billing';

/**
 * The badge is arithmetic, not a claim.
 *
 * It used to be the literal string 'Save 50%' beside two prices it had no
 * relationship to. On the one screen in the app where a wrong number is a
 * Guideline 2.3.1 problem, a badge that cannot go stale is worth a test.
 */

test('the saving is what the two prices actually give', () => {
  const expected = Math.floor((1 - ANNUAL_CENTS / (MONTHLY_CENTS * 12)) * 100);
  expect(ANNUAL_SAVING_PCT).toBe(expected);
  // $49.99 against 12 x $4.99 = $59.88
  expect(ANNUAL_SAVING_PCT).toBe(16);
});

test('the saving is floored, never rounded up', () => {
  /* Rounding a saving up is the direction that overstates it. 16.51% must read
     as 16, not 17. */
  const exact = (1 - ANNUAL_CENTS / (MONTHLY_CENTS * 12)) * 100;
  expect(ANNUAL_SAVING_PCT).toBeLessThanOrEqual(exact);
});

test('the badge on the annual plan says what the arithmetic says', () => {
  const annual = PLANS.find((p) => p.id === 'annual');
  expect(annual?.badge).toBe(`Save ${ANNUAL_SAVING_PCT}%`);
});

test('only the annual plan carries a badge', () => {
  expect(PLANS.find((p) => p.id === 'monthly')?.badge).toBeUndefined();
});

test('the prices render from the cents, so the two cannot disagree', () => {
  expect(PLANS.find((p) => p.id === 'annual')?.price).toBe('$49.99');
  expect(PLANS.find((p) => p.id === 'monthly')?.price).toBe('$4.99');
});

test('the per-month line matches the annual price divided by twelve', () => {
  expect(PLANS.find((p) => p.id === 'annual')?.note).toContain('$4.17');
});

test('annual is genuinely cheaper than paying monthly for a year', () => {
  // if this ever inverts, the badge would be advertising a loss
  expect(ANNUAL_CENTS).toBeLessThan(MONTHLY_CENTS * 12);
});
