import { useEffect, useState } from 'react';
import { getDosesForDate, getScheduleItems, setDoseTaken, type Dose, type ScheduleItem } from '../lib/api';
import { toISODate } from '../lib/date';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';

interface Props {
  userId: string;
  date: Date;
  onChanged: () => void;
}

export function DayDoses({ userId, date, onChanged }: Props) {
  const [doses, setDoses] = useState<Dose[] | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduleItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  /** bumped by the retry; the effect below is the only thing that fetches */
  const [attempt, setAttempt] = useState(0);

  const isFuture = toISODate(date) > toISODate(new Date());

  useEffect(() => {
    setFailed(false);
    const onError = (err: unknown) => {
      console.error('day load failed', err);
      setFailed(true);
    };
    if (isFuture) {
      // Nothing's materialized for a future day yet — preview what's
      // currently scheduled instead of just showing empty.
      getScheduleItems(userId).then(setUpcoming).catch(onError);
    } else {
      getDosesForDate(userId, date).then(setDoses).catch(onError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, date, isFuture, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  const toggle = async (dose: Dose) => {
    // same as Today's: it throws with no connection, and it was unguarded
    let updated: Dose;
    try {
      updated = await setDoseTaken(dose.id, !dose.taken);
    } catch (err) {
      console.error('marking a dose failed', err);
      setFailed(true);
      return;
    }
    setDoses((prev) => (prev ? prev.map((d) => (d.id === dose.id ? updated : d)) : prev));
    onChanged();
  };

  if (failed) return <ErrorState message="This day did not load. It is usually the connection." onRetry={retry} />;

  if (isFuture) {
    if (upcoming === null) return <Skeleton rows={3} height={64} radius={18} label="Loading the day" />;
    if (upcoming.length === 0)
      return (
        <div className="sheet-empty t-body">
          Nothing scheduled for this day. Anything you add to your schedule will show up here.
        </div>
      );
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

  if (doses === null) return <Skeleton rows={3} height={64} radius={18} label="Loading the day" />;
  if (doses.length === 0)
    return (
      <div className="sheet-empty t-body">
        Nothing logged this day. Days before you added something to your schedule stay empty.
      </div>
    );

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
