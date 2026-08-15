import { useCallback, useEffect, useState } from 'react';
import { Arc } from '../components/Arc';
import { Sheet } from '../components/Sheet';
import { AddSchedule } from './AddSchedule';
import { DoseHistory } from './DoseHistory';
import { DayDoses } from './DayDoses';
import { useAuth } from '../lib/auth';
import { ensureTodayDoses, getComplianceMap, getDosesForDate, setDoseTaken, type Dose } from '../lib/api';
import { addDays, formatDisplayDate, formatShortDate, parseHour, startOfWeekMonday, toISODate } from '../lib/date';
import { useNow } from '../lib/now';
import { IconCalculator, IconPlus } from '../components/Icons';
import { ReconCalculator } from './ReconCalculator';
import { syncScheduleNotifications } from '../lib/notifications';

type DayState = 'completed' | 'missed' | 'today' | 'future';

function dayState(dateISO: string, todayISO: string, compliance: Record<string, { total: number; taken: number }>): DayState {
  if (dateISO === todayISO) return 'today';
  if (dateISO > todayISO) return 'future';
  const c = compliance[dateISO];
  return c && c.total > 0 && c.taken === c.total ? 'completed' : 'missed';
}

type SheetState =
  | { kind: 'add' }
  | { kind: 'history'; name: string; scheduleItemId: string | null }
  | { kind: 'day'; date: Date }
  | { kind: 'calculator' }
  | null;

export function Today() {
  const { user } = useAuth();
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [compliance, setCompliance] = useState<Record<string, { total: number; taken: number }>>({});
  const [sheet, setSheet] = useState<SheetState>(null);

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

  useEffect(() => {
    load();
  }, [load]);

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
    setSheet({ kind: 'history', name: dose.name, scheduleItemId: dose.schedule_item_id });
  };

  if (!user) return null;

  const leftToday = doses ? doses.filter((d) => !d.taken).length : 0;
  const arcDoses = (doses ?? [])
    .map((d) => ({ id: d.id, hour: parseHour(d.scheduled_time), taken: d.taken }))
    .filter((d): d is { id: string; hour: number; taken: boolean } => d.hour !== null);

  const nowHour = today.getHours() + today.getMinutes() / 60;
  const overdue = (doses ?? []).filter((d) => !d.taken && d.scheduled_time && (parseHour(d.scheduled_time) ?? 99) <= nowHour);

  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">Today</h1>
        <div className="screen-sub t-body">{formatDisplayDate(today)}</div>
      </div>

      {/* One property means one thing: fill = today, dot = completed. */}
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
              {state === 'completed' && <span className="week-dot" />}
            </div>
          );
        })}
      </div>

      <Arc doses={arcDoses} leftToday={leftToday} />

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
        {doses?.map((d) => (
          <div
            key={d.id}
            className={`dose pressable ${d.taken ? 'taken' : ''}`}
            onClick={() => setSheet({ kind: 'history', name: d.name, scheduleItemId: d.schedule_item_id })}
          >
            <span className="dose-time">{d.scheduled_time ? d.scheduled_time.slice(0, 5) : '—'}</span>
            <span className="dose-body">
              <span className="dose-name" style={{ display: 'block' }}>
                {d.name}
              </span>
              <span className="dose-amt" style={{ display: 'block' }}>
                {d.amount}
              </span>
            </span>
            <span
              className={`dose-mark ${d.taken ? 'on' : 'off'}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleTaken(d);
              }}
            />
          </div>
        ))}
      </div>

      <div className="action-row">
        <button className="add-dose pressable" onClick={() => setSheet({ kind: 'add' })}>
          <IconPlus size={15} color="var(--purple)" />
          Add to Schedule
        </button>
        <button className="add-dose pressable" onClick={() => setSheet({ kind: 'calculator' })}>
          <IconCalculator size={15} color="var(--purple)" />
          Calculator
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

      <Sheet open={sheet?.kind === 'add'} onClose={() => setSheet(null)} title="Add to Schedule">
        <AddSchedule
          userId={user.id}
          onAdded={() => load()}
          onClose={() => setSheet(null)}
        />
      </Sheet>

      <Sheet open={sheet?.kind === 'calculator'} onClose={() => setSheet(null)} title="Reconstitution Calculator">
        <ReconCalculator />
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
