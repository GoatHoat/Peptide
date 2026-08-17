import { setDoseTaken } from './api';
import { readScoped, writeScoped } from './storage';

/**
 * Doses marked from a notification that could not reach the server yet.
 *
 * The narrow case this exists for: somebody taps **Taken** on the lock screen
 * on the Underground. The app may not even be running, there is no network, and
 * the write fails. Without this the dose is silently lost — and adherence
 * history is the app's core dataset, so a dose that was taken and not recorded
 * is worse than one never taken, because it makes the record a fiction.
 *
 * Deliberately not a general offline outbox. It holds one kind of write, made
 * by an explicit confirmation, and it is flushed on the next launch. A real
 * outbox for everything the app writes is a feature and is not this.
 */
export const QUEUE_KEY = 'pepstack.dosequeue.v1';

export interface QueuedMark {
  doseId: string;
  taken: boolean;
  /** when the person actually pressed it, not when it reached the server */
  at: string;
}

export function readQueue(userId: string | null): QueuedMark[] {
  const rows = readScoped<QueuedMark[]>(QUEUE_KEY, userId, []);
  return Array.isArray(rows) ? rows : [];
}

export function enqueueMark(userId: string | null, mark: QueuedMark): void {
  const rows = readQueue(userId);
  /* Last write for a dose wins. Somebody who taps Taken, then unmarks it in the
     app while still offline, must not have the queue put it back. */
  const next = [...rows.filter((r) => r.doseId !== mark.doseId), mark];
  writeScoped(QUEUE_KEY, userId, next);
}

/**
 * Send what is queued, and keep whatever still will not go.
 *
 * Returns how many made it, so a caller can decide whether to refresh. Never
 * throws: this runs at launch, and a launch that fails because of a queued
 * write from last week is a worse bug than the write being late again.
 */
export async function flushQueue(userId: string | null): Promise<number> {
  const rows = readQueue(userId);
  if (rows.length === 0) return 0;

  const failed: QueuedMark[] = [];
  let sent = 0;
  for (const mark of rows) {
    try {
      await setDoseTaken(mark.doseId, mark.taken);
      sent += 1;
    } catch {
      failed.push(mark);
    }
  }
  writeScoped(QUEUE_KEY, userId, failed);
  return sent;
}
