import { useEffect, useState } from 'react';
import { getDosesForDate, getScheduleItems, setDoseTaken, type Dose, type ScheduleItem } from '../lib/api';
import { toISODate } from '../lib/date';

interface Props {
  userId: string;
  date: Date;
  onChanged: () => void;
}

export function DayDoses({ userId, date, onChanged }: Props) {
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduleItem[] | null>(null);

  const isFuture = toISODate(date) > toISODate(new Date());

  useEffect(() => {
    if (isFuture) {
      // Nothing's materialized for a future day yet — preview what's
      // currently scheduled instead of just showing empty.
      getScheduleItems(userId).then(setUpcoming);
    } else {
      getDosesForDate(userId, date).then(setDoses);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, date, isFuture]);

  const toggle = async (dose: Dose) => {
    const updated = await setDoseTaken(dose.id, !dose.taken);
    setDoses((prev) => (prev ? prev.map((d) => (d.id === dose.id ? updated : d)) : prev));
    onChanged();
  };

  if (isFuture) {
    if (upcoming === null) return <div className="sheet-empty t-body">Loading…</div>;
    if (upcoming.length === 0) return <div className="sheet-empty t-body">Nothing scheduled.</div>;
    return (
      <div className="timeline" style={{ marginTop: 0, paddingLeft: 0, paddingRight: 0 }}>
        <div className="t-caption" style={{ color: 'var(--t3)', marginBottom: 10 }}>
          Upcoming, based on your current schedule
        </div>
        {upcoming.map((item) => (
          <div key={item.id} className="dose">
            <span className="dose-time">{item.scheduled_time ? item.scheduled_time.slice(0, 5) : '—'}</span>
            <span className="dose-body">
              <span className="dose-name" style={{ display: 'block' }}>
                {item.name}
              </span>
              <span className="dose-amt" style={{ display: 'block' }}>
                {item.amount}
              </span>
            </span>
            <span className="dose-mark off" />
          </div>
        ))}
      </div>
    );
  }

  if (doses === null) return <div className="sheet-empty t-body">Loading…</div>;
  if (doses.length === 0) return <div className="sheet-empty t-body">Nothing logged this day.</div>;

  return (
    <div className="timeline" style={{ marginTop: 0, paddingLeft: 0, paddingRight: 0 }}>
      {doses.map((d) => (
        <div key={d.id} className={`dose pressable ${d.taken ? 'taken' : ''}`}>
          <span className="dose-time">{d.scheduled_time ? d.scheduled_time.slice(0, 5) : '—'}</span>
          <span className="dose-body">
            <span className="dose-name" style={{ display: 'block' }}>
              {d.name}
            </span>
            <span className="dose-amt" style={{ display: 'block' }}>
              {d.amount}
            </span>
          </span>
          <span className={`dose-mark ${d.taken ? 'on' : 'off'}`} onClick={() => toggle(d)} />
        </div>
      ))}
    </div>
  );
}
