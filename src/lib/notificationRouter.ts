import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getDosesForDate, setDoseTaken } from './api';
import { enqueueMark } from './doseQueue';
import { blockTime, snoozeBlock, syncScheduleNotifications, type DoseBlockPayload } from './notifications';

/**
 * What happens when somebody acts on a reminder.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO RULES THIS FILE EXISTS TO KEEP.
 *
 * A bare **tap** never marks anything. People tap notifications to make them go
 * away, and writing a dose because a banner was dismissed turns adherence data
 * into fiction — which is the one dataset the app is for. A tap opens Today at
 * the block with the rows ready to confirm.
 *
 * The **Taken** button does write, because pressing a button labelled "Taken"
 * is an explicit statement rather than a dismissal. That write is the whole
 * reason the buttons exist: a dose logged from the lock screen is a dose
 * logged, without the app ever opening.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Registered once, at app start, never inside a screen. A listener registered
 * in a component is gone the moment that component unmounts, and the tap that
 * matters most is the one that arrives while nothing is mounted at all.
 */

/** The block a tap asked us to open, waiting for a screen to come and take it. */
let pendingBlock: string | null = null;
const subscribers = new Set<(time: string) => void>();

/**
 * A tap can land before there is a session, a route or a mounted screen —
 * a cold start from the lock screen is exactly that. So the block is parked
 * here and handed over whenever something asks, rather than dispatched into an
 * app that does not exist yet.
 */
export function takePendingBlock(): string | null {
  const block = pendingBlock;
  pendingBlock = null;
  return block;
}

export function onBlockRequested(fn: (time: string) => void): () => void {
  subscribers.add(fn);
  /* Anything parked before this subscriber existed is delivered immediately,
     which is the cold-start case: the listener fires during boot and Today
     mounts a moment later. */
  const parked = takePendingBlock();
  if (parked) fn(parked);
  return () => subscribers.delete(fn);
}

function routeToBlock(time: string) {
  if (subscribers.size === 0) {
    pendingBlock = time;
    return;
  }
  for (const fn of subscribers) fn(time);
}

const readPayload = (extra: unknown): DoseBlockPayload | null => {
  if (!extra || typeof extra !== 'object') return null;
  const value = extra as Partial<DoseBlockPayload>;
  if (value.kind !== 'dose-block' || typeof value.time !== 'string') return null;
  return { kind: 'dose-block', time: value.time, date: value.date ?? null };
};

/**
 * Mark every dose in a block taken.
 *
 * Failures are queued rather than dropped — see `lib/doseQueue.ts`. The
 * resync afterwards is not housekeeping: the streak has moved, and a local
 * notification's text is fixed when it is scheduled, so tomorrow's banner would
 * otherwise still be offering to kick off a streak that started today.
 */
async function markBlockTaken(userId: string, time: string): Promise<void> {
  let doses: Awaited<ReturnType<typeof getDosesForDate>> = [];
  try {
    doses = await getDosesForDate(userId, new Date());
  } catch (err) {
    /* Offline, and without the day's rows there are no dose ids to queue
       against. Nothing is written and nothing is invented. */
    console.error('could not read the day to mark it taken', err);
    return;
  }

  const inBlock = doses.filter(
    (dose) => dose.scheduled_time && blockTime(dose.scheduled_time) === time && !dose.taken,
  );

  for (const dose of inBlock) {
    try {
      await setDoseTaken(dose.id, true);
    } catch {
      enqueueMark(userId, { doseId: dose.id, taken: true, at: new Date().toISOString() });
    }
  }

  await syncScheduleNotifications(userId);
}

/**
 * Wire the listeners. Idempotent — calling it twice does not double-handle a
 * tap, because a second call is ignored.
 */
let registered = false;

export async function registerNotificationRouter(getUserId: () => string | null): Promise<void> {
  if (!Capacitor.isNativePlatform() || registered) return;
  registered = true;

  try {
    await LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {
      const payload = readPayload(event.notification?.extra);
      if (!payload) return;
      const userId = getUserId();

      /* `tap` is the plugin's id for the notification body itself, as opposed
         to one of the buttons on it. */
      if (event.actionId === 'taken') {
        if (userId) await markBlockTaken(userId, payload.time);
        return;
      }
      if (event.actionId === 'later') {
        if (userId) await snoozeBlock(userId, payload.time);
        return;
      }
      routeToBlock(payload.time);
    });

    /* Cold start. A tap that launched the app can be delivered before any
       listener is attached, and on some versions is not re-delivered at all —
       so the tray is read once at boot and the most recent dose block is
       treated as the thing the person came here for. Nothing is marked; this
       only decides which block Today opens on. */
    const delivered = await LocalNotifications.getDeliveredNotifications();
    const blocks = (delivered.notifications ?? [])
      .map((n) => readPayload(n.extra))
      .filter((p): p is DoseBlockPayload => p !== null);
    if (blocks.length > 0 && pendingBlock === null) {
      pendingBlock = blocks[blocks.length - 1].time;
    }
  } catch {
    /* No permission, or a platform without the plugin. Reminders are a
       convenience — nothing here may take the app down with it. */
  }
}
