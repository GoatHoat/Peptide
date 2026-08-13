import { useMemo } from 'react';
import { monthCalendar, MONTH_LABEL, WEEKDAY_HEADS, type CalendarDay } from '../data/mock';

const RING = 28; // outer diameter
const STROKE = 3;
const R = (RING - STROKE) / 2;
const C = RING / 2;

/**
 * DESIGN_V2 §2 — a dated ring calendar, not a contribution heatmap.
 *
 * Month-aligned 7-column grid with real weekday headers and date numerals. Each
 * cell's arc is the share of that day's scheduled doses that were taken, so a
 * perfect day and a two-thirds day are distinguishable. Today is marked by a
 * filled centre, the way iOS Calendar marks it.
 */
export function RingCalendar({ todayTaken, scheduled }: { todayTaken: number; scheduled: number }) {
  const days = useMemo(() => monthCalendar(Math.max(1, scheduled)), [scheduled]);

  return (
    <div>
      <div className="label text-t3">{MONTH_LABEL}</div>

      <div className="mt-4 grid grid-cols-7 gap-y-2.5">
        {WEEKDAY_HEADS.map((d, i) => (
          <div key={i} className="flex justify-center pb-1 text-[11px] text-t3">
            {d}
          </div>
        ))}
        {days.map((d) => (
          <div key={d.key} className="flex justify-center">
            <DayRing day={d} todayTaken={todayTaken} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DayRing({ day, todayTaken }: { day: CalendarDay; todayTaken: number }) {
  if (day.day === null) return <div style={{ width: RING, height: RING }} />;

  // Today's ring tracks live state — it fills as you log.
  const taken = day.isToday ? todayTaken : day.taken;
  const pct = day.scheduled > 0 ? Math.min(100, (taken / day.scheduled) * 100) : 0;

  return (
    <div className="relative" style={{ width: RING, height: RING }}>
      <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} className="absolute inset-0">
        {/* empty track — a missed day is a groove, not a mark */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#1E1E22" strokeWidth={STROKE} />

        {/* today reads as filled the way iOS Calendar marks it */}
        {day.isToday && <circle cx={C} cy={C} r={R - STROKE / 2} fill="#C87941" />}

        {!day.isFuture && pct > 0 && (
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke={day.isToday ? '#E8A87C' : '#C87941'}
            strokeWidth={STROKE}
            strokeLinecap={pct >= 100 ? 'butt' : 'round'}
            transform={`rotate(-90 ${C} ${C})`}
            pathLength={100}
            strokeDasharray={`${pct} 100`}
            style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(.2,.7,.3,1)' }}
          />
        )}
      </svg>

      <div
        className="absolute inset-0 flex items-center justify-center text-[11px] tabular-nums"
        style={{
          color: day.isToday ? '#0A0A0A' : day.isFuture ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.62)',
          fontWeight: day.isToday ? 600 : 400,
        }}
      >
        {day.day}
      </div>
    </div>
  );
}
