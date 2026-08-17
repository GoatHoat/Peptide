import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Arc } from '../components/Arc';
import { Sheet } from '../components/Sheet';
import { AddSchedule } from './AddSchedule';
import { ReconCalculator } from './ReconCalculator';
import { DoseHistory } from './DoseHistory';
import { DayDoses } from './DayDoses';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import {
  cacheToday,
  ensureTodayDoses,
  getComplianceMap,
  getDosesForDate,
  readTodayCache,
  setDoseTaken,
  type Dose,
} from '../lib/api';
import { addDays, formatDisplayDate, formatShortDate, parseHour, startOfWeekMonday, toISODate } from '../lib/date';
import { useNow } from '../lib/now';
import { useActiveTab } from '../lib/activeTab';
import { IconChevron, IconPlus } from '../components/Icons';
import { useEntitlement } from '../lib/entitlements';
import { ProSheet } from '../components/ProSheet';
import { DoseRow } from '../components/DoseRow';
import { NowMarker } from '../components/NowMarker';
import { Skeleton } from '../components/Skeleton';
import { syncScheduleNotifications } from '../lib/notifications';

type DayState = 'completed' | 'missed' | 'today' | 'future' | 'empty';

function dayState(dateISO: string, todayISO: string, compliance: Record<string, { total: number; taken: number }>): DayState {
  if (dateISO === todayISO) return 'today';
  if (dateISO > todayISO) return 'future';
  const c = compliance[dateISO];
  /* A day with nothing scheduled is its own state. It used to fall through to
     'missed', and before that a `taken === total` test would have called an
     empty day complete — vacuously true, and a purple cell for a day the user
     did nothing is the kind of small lie that makes people stop believing the
     rest of the numbers. */
  if (!c || c.total === 0) return 'empty';
  return c.taken === c.total ? 'completed' : 'missed';
}

type SheetState =
  | { kind: 'add' }
  | { kind: 'recon' }
  | { kind: 'history'; name: string; scheduleItemId: string | null }
  | { kind: 'day'; date: Date }
  | null;

export function Today() {
  const { user } = useAuth();
  const { profile } = usePrefs();
  const activeTab = useActiveTab();
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [compliance, setCompliance] = useState<Record<string, { total: number; taken: number }>>({});
  const [sheet, setSheet] = useState<SheetState>(null);
  const [offline, setOffline] = useState(false);
  const { isPro, askLeft, lockedTotal, catalogueTotal } = useEntitlement();
  const [pro, setPro] = useState(false);

  /* Whichever limit they are nearest. Recomputed when the numbers change, not
     on every render. */
  const upsell = useMemo(() => {
    if (isPro) return null;
    if (askLeft !== null && askLeft <= 1) {
      return {
        title: askLeft === 0 ? 'No free assistant messages left' : 'One free message left',
        sub: 'Pro raises it to 20 an hour.',
      };
    }
    if (lockedTotal > 0) {
      return {
        title: `${lockedTotal} products are locked`,
        sub: `Pro unlocks all ${catalogueTotal}.`,
      };
    }
    return {
      title: 'One product at a time on Free',
      sub: 'Pro removes the limit and unlocks the whole library.',
    };
  }, [isPro, askLeft, lockedTotal, catalogueTotal]);

  // live: the header date, the week strip and the arc's "now" all read from
  // this, so the screen rolls over at midnight instead of at the next reload
  const today = useNow();
  const todayISO = toISODate(today);
  const weekStart = startOfWeekMonday(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const load = useCallback(async () => {
    if (!user) return;
    /* Paint from the cache first, so a cold start with no network shows the
       day instead of a spinner that never resolves. The network result
       replaces it a moment later when there is one. */
    const cached = readTodayCache(user.id, todayISO);
    if (cached) setDoses((prev) => prev ?? cached);
    // Materialize today's row for every active schedule item before reading —
    // that's the whole trick: the user set the amount up once, this just
    // stops asking them to retype it every morning.
    let d: Dose[];
    let c: Record<string, { total: number; taken: number }>;
    try {
      await ensureTodayDoses(user.id);
      [d, c] = await Promise.all([
        getDosesForDate(user.id, today),
        getComplianceMap(user.id, weekStart, addDays(weekStart, 6)),
      ]);
    } catch {
      /* No network, or the backend is unreachable. Say so quietly and keep
         whatever the cache gave us — never a spinner with nothing behind it. */
      setOffline(true);
      if (!cached) setDoses([]);
      return;
    }
    setDoses(d);
    setCompliance(c);
    setOffline(false);
    cacheToday(user.id, todayISO, d);
    syncScheduleNotifications(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, todayISO]);

  /* All three screens stay mounted, so adding something to the schedule from
     Discover left Today holding the list it fetched once on first mount — the
     new item only appeared after the app was reopened, which read as "it went
     in for tomorrow". Refetching when Today becomes the active tab is the same
     fix the stack already uses; see lib/activeTab. */
  useEffect(() => {
    if (activeTab === 0) load();
  }, [load, activeTab]);

  const refreshCompliance = useCallback(async () => {
    if (!user) return;
    setCompliance(await getComplianceMap(user.id, weekStart, addDays(weekStart, 6)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleTaken = async (dose: Dose) => {
    if (!user) return;
    /* `setDoseTaken` is a plain update and it throws with no connection. This
       was unguarded, so offline the row did not even change colour and the
       rejection went nowhere — the tap was silently dead. There is no outbox
       here and building one is a feature, not a finish; so the honest answer is
       to say the tick did not save rather than to show it as saved and lose it. */
    let updated: Dose;
    try {
      updated = await setDoseTaken(dose.id, !dose.taken);
    } catch (err) {
      console.error('marking a dose failed', err);
      setOffline(true);
      return;
    }
    setDoses((prev) => (prev ? prev.map((d) => (d.id === dose.id ? updated : d)) : prev));
    setOffline(false);
    // taken/not-taken feeds the compliance map too — refresh the week
    await refreshCompliance().catch((err) => console.error('compliance refresh failed', err));
    /* And the reminder copy, which is fixed into the banner when it is
       scheduled — without this, tomorrow morning still offers to kick off a
       streak that started today. */
    syncScheduleNotifications(user.id);
    /* Deliberately opens nothing. This used to push the history sheet up,
       which offered Remove From Schedule as the response to someone simply
       marking their supplement as taken. The sheet is a long press now. */
  };

  if (!user) return null;

  const leftToday = doses ? doses.filter((d) => !d.taken).length : 0;
  const arcDoses = (doses ?? [])
    .map((d) => ({ id: d.id, hour: parseHour(d.scheduled_time), taken: d.taken }))
    .filter((d): d is { id: string; hour: number; taken: boolean } => d.hour !== null);

  const nowHour = today.getHours() + today.getMinutes() / 60;
  const nowLabel = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  /* Where the marker goes: before the first dose still ahead of now. -1 means
     the whole day is behind us. */
  const firstAhead = (doses ?? []).findIndex((d) => (parseHour(d.scheduled_time) ?? 99) >= nowHour);
  const overdue = (doses ?? []).filter((d) => !d.taken && d.scheduled_time && (parseHour(d.scheduled_time) ?? 99) <= nowHour);

  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">Today</h1>
        <div className="screen-sub t-body">{formatDisplayDate(today)}</div>
      </div>

      {offline && (
        <div className="offline-line t-caption">
          {/* This promised that anything ticked would sync on reconnect.
              Nothing syncs — there is no outbox, no queue and no online
              listener anywhere in the app — so the sentence was a claim the
              code does not keep. */}
          Offline — showing your last saved day. Ticking one off needs a connection.
          {/* The line said what had happened and offered nothing to do about
              it. Reconnecting is not something the app can detect reliably
              inside a WebView, so the button is the honest answer. */}
          <button className="offline-retry pressable" onClick={() => load()}>
            Try again
          </button>
        </div>
      )}

      {/* Colour carries the state, one property, no dot: accent = completed,
          light grey = today, grey = missed, glass = still to come, and a dimmer
          grey for a past day that had nothing scheduled. */}
      <div className="week">
        {weekDays.map((d) => {
          const iso = toISODate(d);
          const state = dayState(iso, todayISO, compliance);
          return (
            <div
              key={iso}
              className={`week-cell ${state} pressable`}
              onClick={() => setSheet({ kind: 'day', date: d })}
            >
              <span className="week-dow">{d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
              <span className="week-num">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* the arc spans the user's own waking day, so the dividers land where
          those times actually fall. Defaults until onboarding has set them. */}
      <Arc
        doses={arcDoses}
        leftToday={leftToday}
        dayStart={parseHour(profile?.wake_time ?? null) ?? 7}
        dayEnd={parseHour(profile?.sleep_time ?? null) ?? 23}
      />

      <div className="divider">
        <span className="divider-line" />
        <span className="divider-text t-section">Schedule</span>
        <span className="divider-line" />
      </div>

      <div className="timeline">
        {/* The rail marks the passage of the day beside the rows. With no rows
            it was a 200px line down the side of an illustration, which reads as
            a rendering fault rather than as an empty day. */}
        {(doses === null || doses.length > 0) && <span className="rail" />}
        {doses === null && <Skeleton rows={3} height={64} gap={8} radius={18} label="Loading your schedule" />}
        {doses !== null && doses.length === 0 && (
          /* The same object the empty stack uses. Both states are the same
             shape of emptiness — a container waiting to be filled — and the
             app has one drawing of that. ILLUSTRATIONS.md §4 specifies a
             separate hollow-bar render for this screen; until that exists,
             one coherent object beats two half-matched ones. */
          <div className="schedule-empty">
            <img className="schedule-empty-art" src="/art/empty-stack.png" alt="" width={200} height={200} />
            <p className="empty-state t-body">
              Nothing on your schedule yet. Add something and it will appear here at the time you
              set.
            </p>
          </div>
        )}
        {doses?.map((d, i) => {
          /* The marker goes in the gap before the first dose whose time has not
             yet come. `firstAhead` is -1 when every dose is behind us, which is
             the after-the-last case and is handled below the list instead. */
          const showMarker = i === firstAhead;
          return (
            <Fragment key={d.id}>
              {showMarker && <NowMarker time={nowLabel} scrollIntoView />}
              <DoseRow
                dose={d}
                missed={(parseHour(d.scheduled_time) ?? 99) < nowHour && !d.taken}
                onToggle={toggleTaken}
                onLongPress={(dose) =>
                  setSheet({ kind: 'history', name: dose.name, scheduleItemId: dose.schedule_item_id })
                }
              />
            </Fragment>
          );
        })}
        {/* every dose is behind us, so the marker belongs at the bottom */}
        {doses !== null && doses.length > 0 && firstAhead === -1 && (
          <NowMarker time={nowLabel} scrollIntoView />
        )}
      </div>

      {/* Free only. Copy follows whichever limit they are closest to, so it
          stays informative rather than becoming furniture. Computed on mount,
          not per render. */}
      {!isPro && upsell && (
        <button className="upsell pressable" onClick={() => setPro(true)}>
          <span className="upsell-main">
            <span className="upsell-title">{upsell.title}</span>
            <span className="upsell-sub">{upsell.sub}</span>
          </span>
          <IconChevron size={15} color="var(--t3)" />
        </button>
      )}

      <div className="action-row">
        <button className="add-dose pressable" onClick={() => setSheet({ kind: 'add' })}>
          <IconPlus size={15} color="var(--purple)" />
          Add to Schedule
        </button>
        {/* Unit conversion on numbers the user types, nothing else. It is not
            attached to any product and it stores nothing — see lib/recon.ts,
            which explains why both of those are the point rather than
            omissions. */}
        <button className="add-dose pressable" onClick={() => setSheet({ kind: 'recon' })}>
          Reconstitution
        </button>
      </div>

      {overdue.length > 0 && (
        <button
          className="warn"
          onClick={() =>
            setSheet({ kind: 'history', name: overdue[0].name, scheduleItemId: overdue[0].schedule_item_id })
          }
        >
          {overdue.length} {overdue.length === 1 ? 'dose' : 'doses'} not yet marked as taken
        </button>
      )}

      <ProSheet open={pro} reason="stack-limit" onClose={() => setPro(false)} />

      <Sheet
        open={sheet?.kind === 'recon'}
        onClose={() => setSheet(null)}
        title="Reconstitution calculator"
      >
        <ReconCalculator />
      </Sheet>

      <Sheet open={sheet?.kind === 'add'} onClose={() => setSheet(null)} title="Add to Schedule">
        <AddSchedule
          userId={user.id}
          onAdded={() => load()}
          onClose={() => setSheet(null)}
        />
      </Sheet>

      <Sheet
        open={sheet?.kind === 'history'}
        onClose={() => setSheet(null)}
        title={sheet?.kind === 'history' ? sheet.name : ''}
      >
        {sheet?.kind === 'history' && (
          <DoseHistory
            userId={user.id}
            name={sheet.name}
            scheduleItemId={sheet.scheduleItemId}
            onScheduleRemoved={() => {
              setSheet(null);
              load();
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={sheet?.kind === 'day'}
        onClose={() => setSheet(null)}
        title={sheet?.kind === 'day' ? formatShortDate(toISODate(sheet.date)) : ''}
      >
        {sheet?.kind === 'day' && <DayDoses userId={user.id} date={sheet.date} onChanged={refreshCompliance} />}
      </Sheet>
    </>
  );
}
