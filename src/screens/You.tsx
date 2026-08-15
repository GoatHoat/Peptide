import { useEffect, useState } from 'react';
import { IconClock } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import { getComplianceMap, getScheduleItems } from '../lib/api';
import { exportCSV, exportPDF } from '../lib/export';
import { checkNotificationPermission, requestNotificationPermission, syncScheduleNotifications } from '../lib/notifications';
import { addDays, computeMonthGrid, toISODate } from '../lib/date';
import { MyStack } from './MyStack';
import { ProgressNotes } from './ProgressNotes';
import { BodyMap } from './BodyMap';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function computeStreak(compliance: Record<string, { total: number; taken: number }>, today: Date): number {
  const isComplete = (iso: string) => {
    const c = compliance[iso];
    return !!c && c.total > 0 && c.taken === c.total;
  };
  let cursor = today;
  if (!isComplete(toISODate(today))) cursor = addDays(today, -1);
  let count = 0;
  while (isComplete(toISODate(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function You() {
  const { user, signOut } = useAuth();
  const { profile, save } = usePrefs();
  const [compliance, setCompliance] = useState<Record<string, { total: number; taken: number }>>({});
  const [openSheet, setOpenSheet] = useState<'notifications' | 'subscription' | 'export' | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [permGranted, setPermGranted] = useState(false);
  const [requestingPerm, setRequestingPerm] = useState(false);

  const today = new Date();
  const monthGrid = computeMonthGrid(today);

  useEffect(() => {
    if (!user) return;
    const rangeStart = monthGrid[0][0];
    const lookback = addDays(today, -90);
    const from = rangeStart < lookback ? rangeStart : lookback;
    getComplianceMap(user.id, from, today).then(setCompliance);
    getScheduleItems(user.id).then((items) => setReminderCount(items.filter((i) => i.scheduled_time).length));
    checkNotificationPermission().then(setPermGranted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const enableNotifications = async () => {
    if (!user) return;
    setRequestingPerm(true);
    try {
      const granted = await requestNotificationPermission();
      setPermGranted(granted);
      if (granted) await syncScheduleNotifications(user.id);
    } finally {
      setRequestingPerm(false);
    }
  };

  if (!user || !profile) return null;

  const streak = computeStreak(compliance, today);

  const runExport = async (kind: 'csv' | 'pdf') => {
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === 'csv') await exportCSV(user.id);
      else await exportPDF(user.id);
    } catch {
      setExportError('Could not export. Try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">You: {profile.display_name || user.email}</h1>
        <div className="streak">
          <IconClock size={15} />
          {streak} Day Streak
        </div>
      </div>

      <div className="widgets">
        <div className="widget">
          <div className="widget-num">{streak}</div>
          <div className="cal">
            <div className="cal-weeks">
              {monthGrid.map((row, i) => (
                <span key={i} className="cal-week-label">
                  {row[0].getMonth() === today.getMonth() || row[6].getMonth() === today.getMonth()
                    ? row.find((d) => d.getMonth() === today.getMonth())?.getDate()
                    : ''}
                </span>
              ))}
            </div>
            <div className="cal-grid">
              {DOW.map((d, i) => (
                <span key={i} className="cal-dow">
                  {d}
                </span>
              ))}
              {monthGrid.flatMap((row, ri) =>
                row.map((d, ci) => {
                  const iso = toISODate(d);
                  const c = compliance[iso];
                  const on = d.getMonth() === today.getMonth() && !!c && c.total > 0 && c.taken === c.total;
                  return <span key={`${ri}-${ci}`} className={`cal-cell ${on ? 'on' : ''}`} />;
                }),
              )}
            </div>
          </div>
        </div>

        {/* Intentionally empty. The label names what belongs here — the
            contents are not invented. */}
        <div className="widget widget-gap">
          <span>Widget</span>
        </div>
      </div>

      <MyStack />

      <BodyMap />

      <ProgressNotes />

      <div className="rows">
        <div className="row pressable" onClick={() => setOpenSheet('notifications')}>
          <span className="row-label">Notifications</span>
          <span className="row-value">
            {!permGranted ? 'Off' : reminderCount === 0 ? 'On · none set' : `${reminderCount} reminder${reminderCount === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className="row pressable" onClick={() => save({ reduce_motion: !profile.reduce_motion })}>
          <span className="row-label">Reduce motion</span>
          <span className="row-value">{profile.reduce_motion ? 'On' : 'Off'}</span>
        </div>
        <div className="row pressable" onClick={() => save({ larger_text: !profile.larger_text })}>
          <span className="row-label">Larger text</span>
          <span className="row-value">{profile.larger_text ? 'On' : 'Off'}</span>
        </div>
        <div className="row pressable" onClick={() => setOpenSheet('subscription')}>
          <span className="row-label">Subscription</span>
          <span className="row-value" style={{ textTransform: 'capitalize' }}>
            {profile.subscription_tier}
          </span>
        </div>
        <div
          className="row pressable"
          onClick={() => save({ blood_test_reminder: !profile.blood_test_reminder })}
        >
          <span className="row-label">Blood test reminder</span>
          <span className="row-value">{profile.blood_test_reminder ? 'On' : 'Off'}</span>
        </div>
        <div className="row pressable" onClick={() => setOpenSheet('export')}>
          <span className="row-label">Export Data</span>
        </div>
        <div className="row pressable" onClick={() => signOut()}>
          <span className="row-label">Sign Out</span>
        </div>
      </div>

      <Sheet open={openSheet === 'notifications'} onClose={() => setOpenSheet(null)} title="Notifications">
        {!permGranted ? (
          <>
            <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 18 }}>
              Turn on notifications to get a reminder at the time you set for each item in your
              schedule. Nothing's scheduled until you allow it.
            </div>
            <button
              className="btn btn-fill pressable"
              style={{ width: '100%' }}
              disabled={requestingPerm}
              onClick={enableNotifications}
            >
              {requestingPerm ? 'Requesting…' : 'Enable Notifications'}
            </button>
          </>
        ) : reminderCount === 0 ? (
          <div className="t-body" style={{ color: 'var(--t2)' }}>
            Notifications are on, but nothing on your schedule has a time set yet — add one when
            you add an item to your schedule and you'll get a daily reminder for it.
          </div>
        ) : (
          <div className="t-body" style={{ color: 'var(--t2)' }}>
            You'll get a reminder for {reminderCount} item{reminderCount === 1 ? '' : 's'} on your
            schedule, at whatever time you set for each one.
          </div>
        )}
      </Sheet>

      <Sheet open={openSheet === 'subscription'} onClose={() => setOpenSheet(null)} title="Subscription">
        <div className="t-body">
          You're on the <strong style={{ textTransform: 'capitalize' }}>{profile.subscription_tier}</strong> tier.
          Subscription management isn't available yet — this is a placeholder until billing is wired up.
        </div>
      </Sheet>

      <Sheet open={openSheet === 'export'} onClose={() => setOpenSheet(null)} title="Export Data">
        <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 18 }}>
          Your stack, full dose history, and progress notes — everything you've entered,
          nothing added. Good for keeping your own records or bringing to a doctor.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-fill pressable"
            style={{ width: '100%' }}
            disabled={exporting !== null}
            onClick={() => runExport('csv')}
          >
            {exporting === 'csv' ? 'Exporting…' : 'Export as CSV'}
          </button>
          <button
            className="btn btn-out pressable"
            style={{ width: '100%' }}
            disabled={exporting !== null}
            onClick={() => runExport('pdf')}
          >
            {exporting === 'pdf' ? 'Exporting…' : 'Export as PDF'}
          </button>
        </div>
        {exportError && (
          <div className="auth-error t-secondary" style={{ marginTop: 12 }}>
            {exportError}
          </div>
        )}
      </Sheet>
    </>
  );
}
