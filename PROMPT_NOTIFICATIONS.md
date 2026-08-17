# Notifications that actually work on a real phone

`src/lib/notifications.ts` already does the hard parts: native-first permission,
a priming screen in front of the one-shot iOS prompt, stable IDs so a resync
replaces rather than duplicates, daily repeats, and a silent no-op on web. Do not
rebuild any of that.

Five things are missing, and without them notifications ship but do not work the
way they need to.

---

# 1. One notification per time, not per product

`syncScheduleNotifications` maps over `timed` and schedules one notification per
schedule item. Three things at 08:00 means **three notifications firing at once**.
That is the fastest way to get someone to switch them off entirely.

Group by `scheduled_time` first. One notification per block.

The stable id must then derive from the **time**, not the item id — otherwise the
grouping changes what `idFor` is hashing and stale notifications survive a
resync. Hash the `HH:MM` string plus the user id.

---

# 2. The copy

Two variants, chosen on whether the user currently has a streak.

**Title** — name the block, and the product when there is only one:

```
Time for your 08:00                        (2 or more items)
Time for Thorne Magnesium Bisglycinate     (exactly one)
```

**Body:**

```
with a streak    Let's continue your streak. Tap to log your dose for the day.
without          Let's kick off your streak. Tap to log your dose for the day.
```

Compute the streak from `doses` — consecutive days where every scheduled dose was
marked taken — at sync time, not at fire time. A local notification's text is
fixed when it is scheduled, so resync whenever the streak changes (§4).

Two notes on this. **No exclamation mark** — `CLAUDE.md` rules that out, and a
notification that arrives daily wears out its enthusiasm fast. And **iOS truncates
the body in the banner**, so the useful half must come first: "Tap to log your
dose" reads fine truncated, "Let's continue your streak, and if you tap this
notification you can log…" does not.

---

# 3. Tapping it must log the dose

Right now tapping opens the app and nothing else happens. That is the single
biggest adherence lever available and it is not wired.

**Attach the payload** when scheduling:

```ts
extra: { kind: 'dose-block', time: '08:00', date: null }
```

**Handle the tap.** Register `LocalNotifications.addListener(
'localNotificationActionPerformed', …)` once, at app start, not inside a screen —
a listener registered in a component is gone when that component unmounts.

On tap: open the app to Today, scrolled to that block, with a confirmation ready
— not silently marked. **Do not mark a dose taken purely because a notification
was tapped.** People tap notifications to dismiss them, and a silent write turns
adherence data into fiction. The catch-up screen already has the right pattern
for confirming; reuse it.

**Cold start matters.** If the app was killed, the listener must still receive the
tap once it boots. Check `LocalNotifications.getDeliveredNotifications()` on
startup as well, and handle the case where the payload arrives before the session
has resolved.

---

# 4. Add the missing sync triggers

`syncScheduleNotifications` is called from `Today.tsx:121` and `You.tsx:103`.
That misses the moments that matter most. Add it after:

- adding or removing a schedule item (`AddSchedule`)
- changing a dose time
- marking a dose taken or skipped — the streak changed, so the copy is stale
- the app returning to the foreground, so a timezone change resyncs

`schedule: { on: { hour, minute }, repeats: true }` is device-local time, which is
correct — but the notification does not move itself when the phone crosses a
timezone. A foreground resync is what fixes that.

---

# 5. Action buttons — the reason people keep notifications on

iOS lets a notification carry buttons that act **without opening the app**. For a
timing app this is the whole game: a dose logged from the lock screen is a dose
logged.

Register the type once at startup:

```ts
await LocalNotifications.registerActionTypes({
  types: [{
    id: 'DOSE_BLOCK',
    actions: [
      { id: 'taken', title: 'Taken' },
      { id: 'later', title: 'Remind me in 30 min' },
    ],
  }],
});
```

Set `actionTypeId: 'DOSE_BLOCK'` on each scheduled notification, then in the
`localNotificationActionPerformed` listener branch on `actionId`:

- `taken` — mark every dose in that block taken, write it to Supabase, resync so
  the streak copy updates. This one **is** an explicit confirmation, unlike a
  bare tap, so writing it is correct.
- `later` — schedule a one-off notification 30 minutes out with the same payload,
  and do not touch the dose.
- `tap` — open the app as in §3.

Handle the offline case: if the write fails, queue it locally and flush on next
launch. A notification tapped on the tube must not silently lose the dose.

---

# Before you say it is done

This section cannot be verified in a browser. It needs a real device or the iOS
simulator, and if you cannot run one, say so plainly rather than marking it done.

1. Three items at the same time produce **one** notification, not three.
2. The body reads correctly with a streak and without one.
3. Changing the schedule resyncs; the old notification does not survive.
4. Marking a dose taken updates the streak wording on the next notification.
5. Tapping opens Today at the right block with a confirmation, and does **not**
   silently mark anything.
6. `Taken` from the lock screen writes the dose without opening the app.
7. `Remind me in 30 min` fires once, 30 minutes later, and does not repeat daily.
8. Kill the app, wait for a notification, tap it — it still routes correctly.
9. Change the device timezone, foreground the app, and confirm the notification
   moves.
10. Deny permission and confirm nothing throws anywhere.

Then tell me: whether you could test on a device or a simulator, which of the ten
you actually verified versus reasoned about, and anything Capacitor's
LocalNotifications plugin does not support that this spec assumes.
