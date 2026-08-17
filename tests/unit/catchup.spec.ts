import { expect, test } from '@playwright/test';
import { markShown, shownToday } from '../../src/lib/catchup';
import { userKey } from '../../src/lib/storage';

/**
 * The once-a-day rule, and the account boundary around it.
 *
 * `getMissedSince` now returns everything past due and unmarked, which is the
 * honest window — so this is the only thing standing between the user and a
 * catch-up screen on every single launch. It is worth holding precisely.
 */

const A = 'user-a';
const B = 'user-b';
const day = (iso: string) => new Date(`${iso}T12:00:00`);

// a localStorage that lives for the length of a test
class Mem {
  store = new Map<string, string>();
  getItem = (k: string) => this.store.get(k) ?? null;
  setItem = (k: string, v: string) => void this.store.set(k, v);
  removeItem = (k: string) => void this.store.delete(k);
  key = (i: number) => [...this.store.keys()][i] ?? null;
  get length() {
    return this.store.size;
  }
  clear = () => this.store.clear();
}

test.beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new Mem();
});

test('a dose offered today is not offered again today', () => {
  const today = day('2026-08-17');
  expect(shownToday(A, today).size).toBe(0);
  markShown(A, ['dose-1', 'dose-2'], today);
  const seen = shownToday(A, today);
  expect(seen.has('dose-1')).toBe(true);
  expect(seen.has('dose-2')).toBe(true);
});

test('but it is offered again tomorrow', () => {
  markShown(A, ['dose-1'], day('2026-08-17'));
  /* A marker from yesterday is not a marker. This is what makes "does not
     reappear the same day" and "does reappear the next day if still unticked"
     both true without anything having to prune. */
  expect(shownToday(A, day('2026-08-18')).has('dose-1')).toBe(false);
});

test('marking more later keeps what was already marked', () => {
  const today = day('2026-08-17');
  markShown(A, ['dose-1'], today);
  markShown(A, ['dose-2'], today);
  const seen = shownToday(A, today);
  expect([...seen].sort()).toEqual(['dose-1', 'dose-2']);
});

test('marking the same id twice does not duplicate it', () => {
  const today = day('2026-08-17');
  markShown(A, ['dose-1'], today);
  markShown(A, ['dose-1'], today);
  expect(shownToday(A, today).size).toBe(1);
});

test('two accounts on one device do not share what they have seen', () => {
  const today = day('2026-08-17');
  markShown(A, ['dose-1'], today);
  /* The bug lib/storage.ts exists to close. Without scoping, B's overdue dose
     is suppressed because A dismissed one this morning. */
  expect(shownToday(B, today).size).toBe(0);
  markShown(B, ['dose-9'], today);
  expect(shownToday(A, today).has('dose-9')).toBe(false);
  expect(shownToday(B, today).has('dose-1')).toBe(false);
});

test('it is stored under the account-scoped key, not a bare one', () => {
  markShown(A, ['dose-1'], day('2026-08-17'));
  const keys = [...(globalThis.localStorage as unknown as Mem).store.keys()];
  expect(keys).toContain(userKey('pepstack.catchup.shown.v1', A));
  expect(keys).not.toContain('pepstack.catchup.shown.v1');
});

test('marking nothing writes nothing', () => {
  markShown(A, [], day('2026-08-17'));
  expect((globalThis.localStorage as unknown as Mem).store.size).toBe(0);
});

test('a corrupt record reads as nothing seen rather than throwing', () => {
  (globalThis.localStorage as unknown as Mem).setItem(
    userKey('pepstack.catchup.shown.v1', A),
    '{not json',
  );
  expect(shownToday(A, day('2026-08-17')).size).toBe(0);
});
