import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getScheduleItems, type ScheduleItem } from './api';

/** Stable 32-bit int from a UUID, so re-syncing replaces the same notification instead of duplicating it. */
function idFor(scheduleItemId: string): number {
  let hash = 0;
  for (let i = 0; i < scheduleItemId.length; i++) {
    hash = (hash * 31 + scheduleItemId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await LocalNotifications.checkPermissions();
  return result.display === 'granted';
}

/**
 * Reconciles scheduled local notifications with the user's current active
 * schedule — one daily reminder per item that has a time set. Cancels
 * anything stale, adds anything new. No-ops outside a native build (the web
 * platform has no real local-notification equivalent), and never throws —
 * a missing/denied permission just means no reminders, not a crash.
 */
export async function syncScheduleNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const granted = await checkNotificationPermission();
    if (!granted) return;

    const items = await getScheduleItems(userId);
    const timed = items.filter((item): item is ScheduleItem & { scheduled_time: string } => !!item.scheduled_time);

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }

    if (timed.length === 0) return;

    await LocalNotifications.schedule({
      notifications: timed.map((item) => {
        const [hour, minute] = item.scheduled_time.split(':').map(Number);
        return {
          id: idFor(item.id),
          title: `Time for ${item.name}`,
          body: item.amount,
          schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        };
      }),
    });
  } catch {
    // Local notifications are a convenience, not core functionality — never
    // let a scheduling failure break the screen that called this.
  }
}
