# Notifications — what was built, and what was actually verified

Written 17 August 2026, against `PROMPT_NOTIFICATIONS`.

## First, the thing you asked me to say plainly

**I could not run a device or the iOS simulator.** This is a Windows machine
with no Xcode, so `npx cap run ios` is not available to me. Nothing in the ten
checks that requires a phone was executed. Everything below separates what a
test actually proved from what I reasoned about, and I have not marked the
second kind as done.

---

## The ten checks

| # | Check | Status |
|---|---|---|
| 1 | Three items at the same time produce one notification, not three | **Verified** — `tests/unit/notifications.spec.ts`, four tests on `groupByTime` |
| 2 | The body reads correctly with a streak and without | **Verified** — `blockCopy` and `computeStreak` are pure and held by nine tests |
| 3 | Changing the schedule resyncs; the old notification does not survive | **Partly.** The id derivation is verified; the cancel-then-schedule call is not |
| 4 | Marking a dose taken updates the streak wording next time | **Reasoned.** Every path that moves the streak now calls the sync — five call sites, listed below |
| 5 | Tapping opens Today at the right block and marks nothing | **Reasoned.** The routing is wired; a real tap was never delivered |
| 6 | Taken from the lock screen writes without opening the app | **Reasoned, and the least certain of the ten** — see the limitations |
| 7 | Remind me in 30 min fires once and does not repeat | **Reasoned.** `schedule: { at }` with no `repeats`, and its own id |
| 8 | Kill the app, tap a notification, it still routes | **Reasoned.** Two mechanisms, below |
| 9 | Timezone change plus foreground moves the notification | **Reasoned.** `visibilitychange` resync |
| 10 | Deny permission and nothing throws | **Partly.** Every entry point is guarded and returns early; the guards are read, not executed on a device |

Nothing here is verified by an end-to-end test, because the Playwright suite
runs in Chromium and `Capacitor.isNativePlatform()` is false there — every
function in `lib/notifications.ts` returns before it touches the plugin. That is
also check 10's answer on web, and it is why the pure half was split out.

---

## What was built

**`src/lib/notificationCopy.ts`** — new. The pure half: `groupByTime`,
`idForBlock`, `blockTime`, `blockCopy`, the payload type. Split out for the same
reason `supabase/functions/ask` is split, so it can be tested in Node. 16 unit
tests.

**`src/lib/notifications.ts`** — the effectful half.

- **One notification per time.** `groupByTime` collapses the schedule into
  blocks before anything is scheduled.
- **The id hashes the user and the `HH:MM`**, not the schedule item. This is the
  subtle part and it has its own test: if the id followed an item, adding a
  second product to 08:00 would change what is hashed, and the old notification
  would survive the resync and fire beside the new one.
- **Copy** per the spec, with the streak computed at sync time because a local
  notification's text is fixed the moment it is scheduled.
- **`extra`** carries `{ kind: 'dose-block', time, date: null }`.
- **`actionTypeId: 'DOSE_BLOCK'`** on every one.
- **`snoozeBlock`** schedules `{ at }` with no `repeats`, under its own id, so a
  snooze cannot collide with the daily reminder it came from.

**`src/lib/notificationRouter.ts`** — new. Registered once in `App.tsx`, never
in a screen. Branches on `actionId`; anything that is not `taken` or `later` is
treated as a tap.

**`src/lib/doseQueue.ts`** — new. A mark that cannot reach the server is kept
and flushed at next launch. Registered in `storage.ts`'s key list, so signing
out clears it — a queue surviving into the next account would post one person's
dose against another's.

**`src/lib/streak.ts`** — `computeStreak` moved out of `You.tsx`, because the
notification copy needs the same number and two definitions of "streak" would
drift.

---

## Decisions worth arguing with

**A tap opens the catch-up screen, not Today.** The spec asked for Today,
scrolled to the block, with a confirmation ready, and said to reuse the
catch-up pattern. `CatchUp` already takes `doses`, `onTaken`, `onSkipped`,
`onDismiss` and confirms with a drag, so it is reused whole rather than copied.
That makes "a tap never marks anything" structural rather than something to
remember: the only way through that screen is a deliberate drag. If you would
rather it landed on Today itself, the change is in `CatchUpGate`.

**`visibilitychange`, not `@capacitor/app`.** The foreground resync needs an
app-resumed signal. `@capacitor/app` is the official plugin for it and would be
a new dependency; `visibilitychange` fires in the WebView on resume and costs
nothing. If the resync turns out unreliable on a device, that is the first thing
to swap.

**The streak is read over 60 days.** Long enough for any streak worth
mentioning, short enough that the sync is one small query. A failure there
leaves it at 0, so the copy says "kick off your streak" — the safe wording to be
wrong with, since the other direction congratulates somebody whose streak broke.

---

## Where sync is now called

`Today` on load and after a mark · `You` after granting permission ·
`AddSchedule` after an item is added · `DoseHistory` after one is removed ·
`MyStack` after a stack item takes its schedule item with it · `DayDoses` after
a mark · `App` after the queue flushes, and on every foreground.

---

## What Capacitor's plugin does not give you that this spec assumes

Checked against `node_modules/@capacitor/local-notifications` rather than from
memory. `registerActionTypes`, `actionTypeId`, `getDeliveredNotifications`,
`localNotificationActionPerformed` with an `actionId`, `extra`, `{ at }`,
`{ on: { hour, minute }, repeats: true }` and `allowWhileIdle` all exist.

Four gaps:

1. **A background action is not guaranteed to run your JavaScript.** This is
   the one to worry about, and it is check 6. An action with `foreground: false`
   asks iOS to hand the app a short background window. If the app is fully
   terminated, whether the WebView boots and attaches the listener inside that
   window is not something the plugin promises. If it does not, the dose is not
   written **and not queued either** — the queue only helps once JavaScript has
   run. Test this one first on a device. If it proves unreliable, the honest fix
   is `foreground: true` on **Taken**, which opens the app to complete the
   write: slower, and never silently lost.

2. **`getDeliveredNotifications` is the tray, not a tap.** It cannot tell you
   which notification launched the app, only what is sitting in Notification
   Centre. So the cold-start path takes the most recent dose block in the tray
   as the intent. That is a guess, and it is deliberately a harmless one — it
   only chooses which block the confirmation screen opens on, and nothing is
   marked without a drag.

3. **A repeating notification does not move with the timezone.** As the spec
   says. The foreground resync is the whole answer, and it only fires once the
   app is opened — so the first reminder after a flight lands on the old
   wall-clock time.

4. **No `input` on the actions.** Not needed here, but worth knowing: the
   plugin supports a text field on iOS only.

One more, not a plugin limit but an iOS one: **64 pending notifications per
app.** Each block is one repeating notification, so this bites at 64 distinct
times, which nobody will reach. It would have bitten far sooner at one per
product, which is a second reason for the grouping.
