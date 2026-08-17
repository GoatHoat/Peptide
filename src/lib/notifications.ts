import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getComplianceMap, getScheduleItems } from './api';
import { addDays } from './date';
import { blockCopy, DOSE_BLOCK_ACTIONS, groupByTime, idForBlock } from './notificationCopy';

export {
  blockCopy,
  blockTime,
  DOSE_BLOCK_ACTIONS,
  groupByTime,
  idForBlock,
  type DoseBlockPayload,
} from './notificationCopy';
import { computeStreak } from './streak';
import type { DoseBlockPayload } from './notificationCopy';

/**
 * Ask for permission to post local notifications.
 *
 * iOS shows the system prompt ONCE, ever. A second call after a refusal returns
 * the refusal without showing anything, and the only way back is Settings — so
 * every caller must put an explaining screen in front of this and only reach it
 * when the person has said yes to that.
 *
 * Native first. The onboarding step used to call the web `Notification` API
 * directly, which inside the iOS WebView asks for a different permission from
 * the one `LocalNotifications.schedule` needs — so somebody could accept the
 * prompt during onboarding and still get no reminders. The web path is kept
 * only so the browser build behaves.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }
  if (typeof Notification === 'undefined') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await LocalNotifications.checkPermissions();
  return result.display === 'granted';
}

/**
 * Declare the buttons the banner carries.
 *
 * Called once at startup, before anything is scheduled. A dose logged from the
 * lock screen is a dose logged — for a timing app that is the whole reason
 * somebody leaves notifications switched on.
 */
export async function registerNotificationActions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: DOSE_BLOCK_ACTIONS,
          actions: [
            { id: 'taken', title: 'Taken' },
            { id: 'later', title: 'Remind me in 30 min' },
          ],
        },
      ],
    });
  } catch {
    /* An older iOS or a plugin that will not register still gets plain
       notifications; buttons are an improvement on a tap, not a requirement. */
  }
}

/**
 * Reconciles scheduled local notifications with the user's current schedule.
 *
 * One notification per **time**, not per product. Cancels everything pending
 * first, so a removed item's reminder cannot outlive it. No-ops outside a
 * native build and never throws — reminders are a convenience, and a
 * scheduling failure must not break the screen that asked for the sync.
 */
export async function syncScheduleNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const granted = await checkNotificationPermission();
    if (!granted) return;

    const items = await getScheduleItems(userId);
    const blocks = groupByTime(items);

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    if (blocks.length === 0) return;

    /* The streak is fixed into the text at schedule time, because a local
       notification's copy cannot change after it is scheduled. That is why
       every place that can move the streak calls this again — see the callers
       of syncScheduleNotifications. */
    const today = new Date();
    let streak = 0;
    try {
      const compliance = await getComplianceMap(userId, addDays(today, -60), today);
      streak = computeStreak(compliance, today);
    } catch {
      /* No network. "Kick off your streak" is the safe wording to be wrong
         with; the opposite congratulates somebody for a streak they may have
         broken. */
    }

    await LocalNotifications.schedule({
      notifications: blocks.map(({ time, names }) => {
        const [hour, minute] = time.split(':').map(Number);
        const payload: DoseBlockPayload = { kind: 'dose-block', time, date: null };
        return {
          id: idForBlock(userId, time),
          ...blockCopy(time, names, streak),
          actionTypeId: DOSE_BLOCK_ACTIONS,
          extra: payload,
          schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        };
      }),
    });
  } catch {
    // see the doc comment: never let this break its caller
  }
}

/**
 * "Remind me in 30 min" — one notification, once, and never a second daily
 * repeat sitting behind the real one.
 *
 * A distinct id derived from the block plus a marker, so a snooze cannot
 * collide with the daily reminder it came from and cancel it.
 */
export async function snoozeBlock(userId: string, time: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const at = new Date(Date.now() + 30 * 60 * 1000);
    const payload: DoseBlockPayload = { kind: 'dose-block', time, date: null };
    await LocalNotifications.schedule({
      notifications: [
        {
          id: idForBlock(userId, `snooze:${time}`),
          title: `Time for your ${time}`,
          body: 'Tap to log your dose for the day.',
          actionTypeId: DOSE_BLOCK_ACTIONS,
          extra: payload,
          // `at` with no `repeats`, so it fires once and is gone
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* see syncScheduleNotifications */
  }
}
