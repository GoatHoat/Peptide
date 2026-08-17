import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Arc } from '../components/Arc';
import { Sheet } from '../components/Sheet';
import { AddSchedule } from './AddSchedule';
import { DoseHistory } from './DoseHistory';
import { DayDoses } from './DayDoses';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import { ensureTodayDoses, getComplianceMap, getDosesForDate, setDoseTaken, type Dose } from '../lib/api';
import { addDays, formatDisplayDate, formatShortDate, parseHour, startOfWeekMonday, toISODate } from '../lib/date';
import { useNow } from '../lib/now';
import { useActiveTab } from '../lib/activeTab';
import { IconChevron, IconPlus } from '../components/Icons';
import { useEntitlement } from '../lib/entitlements';
import { ProSheet } from '../components/ProSheet';
import { DoseRow } from '../components/DoseRow';
import { NowMarker } from '../components/NowMarker';
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
    // Materialize today's row for every active schedule item before reading —
    // that's the whole trick: the user set the amount up once, this just
    // stops asking them to retype it every morning.
    await ensureTodayDoses(user.id);
    const [d, c] = await Promise.all([
      getDosesForDate(user.id, today),
      getComplianceMap(user.id, weekStart, addDays(weekStart, 6)),
    ]);
    setDoses(d);
    setCompliance(c);
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
    const updated = await setDoseTaken(dose.id, !dose.taken);
    setDoses((prev) => (prev ? prev.map((d) => (d.id === dose.id ? updated : d)) : prev));
    // taken/not-taken feeds the compliance map too — refresh the week
    await refreshCompliance();
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
        <span className="rail" />
        {doses === null && <div className="sheet-empty t-body">Loading…</div>}
        {doses !== null && doses.length === 0 && (
          <div className="empty-state t-body">Nothing on your schedule yet.</div>
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
