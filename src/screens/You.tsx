import { Fragment, useEffect, useState } from 'react';
import { IconClock } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import { deleteAccount, getComplianceMap, getScheduleItems } from '../lib/api';
import { exportCSV, exportPDF } from '../lib/export';
import { externalLink, PRIVACY_URL, TERMS_URL } from '../lib/legal';
import { checkNotificationPermission, requestNotificationPermission, syncScheduleNotifications } from '../lib/notifications';
import { addDays, computeMonthGrid, startOfMonth, toISODate } from '../lib/date';
import { useNow } from '../lib/now';
import { MyStack } from './MyStack';
import { ProgressNotes } from './ProgressNotes';

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
  const [openSheet, setOpenSheet] = useState<'notifications' | 'subscription' | 'export' | 'delete' | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reminderCount, setReminderCount] = useState(0);
  const [permGranted, setPermGranted] = useState(false);
  const [requestingPerm, setRequestingPerm] = useState(false);
  /* Deleting is irreversible and sits one row below Sign Out, so it asks the
     user to type the word rather than relying on a second tap they would give
     without reading. */
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // live: rolls over at midnight and after the app comes back from the background
  const today = useNow();
  const todayISO = toISODate(today);
  const monthGrid = computeMonthGrid(today);

  useEffect(() => {
    if (!user) return;
    const monthStart = startOfMonth(today);
    const lookback = addDays(today, -90);
    const from = monthStart < lookback ? monthStart : lookback;
    getComplianceMap(user.id, from, today).then(setCompliance);
    getScheduleItems(user.id).then((items) => setReminderCount(items.filter((i) => i.scheduled_time).length));
    checkNotificationPermission().then(setPermGranted);
    // keyed on the date, not the clock — this refetches once a day, not every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, todayISO]);

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
          {/* One square per day of this month and no others — the row count
              drives the grid, so February and a 31-day month both fit. */}
          <div className="cal" style={{ ['--cal-rows' as string]: monthGrid.length }}>
            <span className="cal-corner" />
            {DOW.map((d, i) => (
              <span key={`dow-${i}`} className="cal-dow">
                {d}
              </span>
            ))}
            {monthGrid.map((row, ri) => {
              const firstOfRow = row.find((d): d is Date => d !== null);
              return (
                <Fragment key={ri}>
                  <span className="cal-week-label">{firstOfRow ? firstOfRow.getDate() : ''}</span>
                  {row.map((d, ci) => {
                    if (!d) return <span key={ci} className="cal-blank" />;
                    const iso = toISODate(d);
                    const c = compliance[iso];
                    const done = !!c && c.total > 0 && c.taken === c.total;
                    return (
                      <span
                        key={ci}
                        className={`cal-cell${done ? ' on' : ''}${iso === todayISO ? ' today' : ''}`}
                        title={iso}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Intentionally empty. The label names what belongs here — the
            contents are not invented. */}
        <div className="widget widget-gap">
          <span>Widget</span>
        </div>
      </div>

      <MyStack />

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
        <a className="row pressable" href={PRIVACY_URL} {...externalLink}>
          <span className="row-label">Privacy Policy</span>
        </a>
        <a className="row pressable" href={TERMS_URL} {...externalLink}>
          <span className="row-label">Terms of Use</span>
        </a>
        <div className="row pressable" onClick={() => signOut()}>
          <span className="row-label">Sign Out</span>
        </div>
        <div
          className="row pressable"
          onClick={() => {
            setDeleteConfirm('');
            setDeleteError(null);
            setOpenSheet('delete');
          }}
        >
          <span className="row-label danger">Delete Account</span>
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
          Pepstack is free while it is in its first release. Everything in the app is
          available to you, and there is nothing to manage here yet.
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
      <Sheet open={openSheet === 'delete'} onClose={() => setOpenSheet(null)} title="Delete Account">
        <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 14 }}>
          This removes your profile, your stack, your whole dose history and your progress
          notes. It cannot be undone, and it signs you out on every device.
        </div>
        <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 18 }}>
          If you only want your records, close this and use Export Data first — once the
          account is gone there is nothing left to export.
        </div>

        <div className="field">
          <label className="t-label" htmlFor="delete-confirm">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            className="field-input"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
        </div>

        <button
          className="btn btn-danger pressable"
          style={{ marginTop: 16, width: '100%' }}
          disabled={deleteConfirm.trim().toUpperCase() !== 'DELETE' || deleting}
          onClick={async () => {
            setDeleting(true);
            setDeleteError(null);
            try {
              await deleteAccount();
              /* No navigation and no success message on purpose: the auth
                 listener sees the session end and swaps the whole app back to
                 the sign-in screen, which is the only honest confirmation. */
            } catch (err) {
              setDeleteError(
                err instanceof Error ? err.message : 'Could not delete the account. Try again.',
              );
              setDeleting(false);
            }
          }}
        >
          {deleting ? 'Deleting…' : 'Delete my account'}
        </button>

        {deleteError && (
          <div className="auth-error t-secondary" style={{ marginTop: 12 }}>
            {deleteError}
          </div>
        )}
      </Sheet>
    </>
  );
}
