import { expect, test } from '@playwright/test';
import {
  clearLocalState,
  KEY_BASES,
  migrateAnonState,
  readScoped,
  removeScoped,
  userKey,
  writeScoped,
} from '../../src/lib/storage';

/**
 * Local state is scoped to the account that owns it.
 *
 * The bug these were written against: three keys were saved under fixed names
 * with no account in them, and sign-out cleared none of them. On a shared
 * device a second person signed in, skipped onboarding because the flag was
 * already set, landed on a Today screen built from the first person's answers,
 * and saw the first person's assistant conversation.
 *
 * Nothing leaked between devices — every table carries user_id under RLS. This
 * was local storage alone, which on a family phone is worse rather than better.
 */

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

/** A localStorage good enough to test against, in Node. */
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

test.beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
});

const THREAD = 'pepstack.ask.v1';
const ANSWERS = 'pepstack.onboarding.v1';
const DONE = 'pepstack.onboarded.v1';

test('the thread A wrote is not the thread B reads', () => {
  writeScoped(THREAD, A, [{ role: 'user', text: 'my private question' }]);
  expect(readScoped(THREAD, A, [])).toHaveLength(1);
  expect(readScoped(THREAD, B, []), "B must not see A's conversation").toEqual([]);
});

test('onboarding answers do not carry across accounts', () => {
  writeScoped(ANSWERS, A, { age: 41, sex: 'f', goals: ['sleep'] });
  expect(readScoped<{ age?: number }>(ANSWERS, B, {}).age, "B inherited A's age").toBeUndefined();
});

test("A's onboarded flag does not skip onboarding for B", () => {
  writeScoped(DONE, A, true);
  expect(readScoped(DONE, A, false)).toBe(true);
  expect(readScoped(DONE, B, false), 'B would have skipped the whole flow').toBe(false);
});

test('three accounts in one browser each get their own state', () => {
  for (const [id, age] of [
    [A, 20],
    [B, 40],
    [C, 60],
  ] as const) {
    writeScoped(ANSWERS, id, { age });
    writeScoped(DONE, id, true);
  }
  expect(readScoped<{ age?: number }>(ANSWERS, A, {}).age).toBe(20);
  expect(readScoped<{ age?: number }>(ANSWERS, B, {}).age).toBe(40);
  expect(readScoped<{ age?: number }>(ANSWERS, C, {}).age).toBe(60);
});

test('sign-out clears one account and leaves the others alone', () => {
  writeScoped(THREAD, A, ['a']);
  writeScoped(ANSWERS, A, { age: 30 });
  writeScoped(DONE, A, true);
  writeScoped(THREAD, B, ['b']);

  clearLocalState(A);

  for (const base of KEY_BASES) {
    expect(localStorage.getItem(userKey(base, A)), `${base} survived sign-out`).toBeNull();
  }
  expect(readScoped(THREAD, B, []), "B's thread was collateral damage").toEqual(['b']);
});

test('a payload whose embedded owner does not match is discarded', () => {
  /* Belt and braces: the key is namespaced AND the owner is written inside.
     Renaming a key must not be able to reintroduce the leak. */
  localStorage.setItem(
    userKey(THREAD, B),
    JSON.stringify({ userId: A, savedAt: Date.now(), data: ['A private'] }),
  );
  expect(readScoped(THREAD, B, []), 'a foreign payload was served').toEqual([]);
});

test('malformed storage reads as empty rather than throwing', () => {
  localStorage.setItem(userKey(THREAD, A), '{not json');
  expect(readScoped(THREAD, A, [])).toEqual([]);
  localStorage.setItem(userKey(THREAD, A), JSON.stringify(['bare array, no envelope']));
  expect(readScoped(THREAD, A, [])).toEqual([]);
});

test('anonymous answers migrate onto the account, and the anon copy goes', () => {
  // the first onboarding screens run before anyone has signed in
  writeScoped(ANSWERS, null, { age: 33, goals: ['skin'] });
  expect(localStorage.getItem(userKey(ANSWERS, null))).not.toBeNull();

  migrateAnonState(A);

  expect(readScoped<{ age?: number }>(ANSWERS, A, {}).age).toBe(33);
  expect(
    localStorage.getItem(userKey(ANSWERS, null)),
    'the anon copy would be inherited by the next person on this device',
  ).toBeNull();
});

test('migration never overwrites what the account already had', () => {
  writeScoped(ANSWERS, A, { age: 50 });
  writeScoped(ANSWERS, null, { age: 20 });
  migrateAnonState(A);
  expect(readScoped<{ age?: number }>(ANSWERS, A, {}).age, 'the account answer lost').toBe(50);
  expect(localStorage.getItem(userKey(ANSWERS, null))).toBeNull();
});

test('an anonymous session has its own bucket, distinct from every account', () => {
  writeScoped(THREAD, null, ['anon']);
  expect(readScoped(THREAD, A, [])).toEqual([]);
  expect(readScoped(THREAD, null, [])).toEqual(['anon']);
});

test('removeScoped is per account', () => {
  writeScoped(DONE, A, true);
  writeScoped(DONE, B, true);
  removeScoped(DONE, A);
  expect(readScoped(DONE, A, false)).toBe(false);
  expect(readScoped(DONE, B, false)).toBe(true);
});
