import { useEffect, useState } from 'react';
import { getDoseHistory, removeScheduleItem, type Dose } from '../lib/api';
import { formatShortDate, formatTime } from '../lib/date';

interface Props {
  userId: string;
  name: string;
  scheduleItemId?: string | null;
  onScheduleRemoved?: () => void;
}

export function DoseHistory({ userId, name, scheduleItemId, onScheduleRemoved }: Props) {
  const [rows, setRows] = useState<Dose[] | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDoseHistory(userId, name).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, name]);

  const removeFromSchedule = async () => {
    if (!scheduleItemId) return;
    setRemoving(true);
    try {
      await removeScheduleItem(scheduleItemId);
      onScheduleRemoved?.();
    } finally {
      setRemoving(false);
    }
  };

  if (!rows) return <div className="sheet-empty t-body">Loading…</div>;

  return (
    <div>
      {scheduleItemId && (
        <button className="schedule-remove-btn pressable" onClick={removeFromSchedule} disabled={removing}>
          {removing ? 'Removing…' : 'Remove from Schedule'}
        </button>
      )}

      {rows.length === 0 ? (
        <div className="sheet-empty t-body">No entries yet.</div>
      ) : (
        <>
          <div className="history-summary t-body">
            Taken {rows.filter((r) => r.taken).length} of {rows.length} logged {rows.length === 1 ? 'day' : 'days'}
          </div>
          <div className="history-list">
            {rows.map((d) => (
              <div key={d.id} className="history-row">
                <div>
                  <div className="t-body-m">{formatShortDate(d.log_date)}</div>
                  <div className="history-meta t-caption">
                    {d.amount}
                    {d.scheduled_time ? ` · ${formatTime(d.scheduled_time)}` : ''}
                  </div>
                </div>
                <span className={`dose-mark ${d.taken ? 'on' : 'off'}`} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
