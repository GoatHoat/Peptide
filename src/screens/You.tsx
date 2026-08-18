import { NAME } from '../lib/brand';
import { Fragment, useEffect, useState } from 'react';
import { IconClock } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import {
  deleteAccount,
  dismissFact,
  getComplianceMap,
  getScheduleItems,
  getUserFacts,
  type UserFact,
} from '../lib/api';
import { exportCSV, exportPDF } from '../lib/export';
import { externalLink, PRIVACY_URL, TERMS_URL } from '../lib/legal';
import { checkNotificationPermission, requestNotificationPermission, syncScheduleNotifications } from '../lib/notifications';
import { addDays, computeMonthGrid, startOfMonth, toISODate } from '../lib/date';
import { useNow } from '../lib/now';
import { computeStreak } from '../lib/streak';
import { MyStack } from './MyStack';
import { ProgressNotes } from './ProgressNotes';
import { ErrorState } from '../components/ErrorState';
// TEMPORARY — remove before submission; see lib/catchupPreview
import { PREVIEW_ENABLED, requestCatchUpPreview } from '../lib/catchupPreview';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function You() {
  const { user, signOut } = useAuth();
  const { profile, save, error: profileError, refresh: refreshProfile } = usePrefs();
  const [compliance, setCompliance] = useState<Record<string, { total: number; taken: number }>>({});
  /* An all-empty month claims you did nothing, which is a small lie when the
     truth is that the request failed. */
  const [complianceFailed, setComplianceFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [openSheet, setOpenSheet] = useState<'notifications' | 'subscription' | 'export' | 'delete' | 'memory' | null>(null);
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
  /** why a Forget did not take, kept next to the list rather than in a toast */
  const [forgetError, setForgetError] = useState<string | null>(null);
  /* What the assistant is allowed to remember, and the control to remove any of
     it. Memory the user cannot see is memory they cannot correct. */
  const [facts, setFacts] = useState<UserFact[]>([]);

  // live: rolls over at midnight and after the app comes back from the background
  const today = useNow();
  const todayISO = toISODate(today);
  const monthGrid = computeMonthGrid(today);

  useEffect(() => {
    if (!user) return;
    const monthStart = startOfMonth(today);
    const lookback = addDays(today, -90);
    const from = monthStart < lookback ? monthStart : lookback;
    /* All four were bare `.then` chains. A rejection from any of them was an
       uncaught error rather than a state on the screen. */
    setComplianceFailed(false);
    getComplianceMap(user.id, from, today)
      .then(setCompliance)
      .catch((err) => {
        console.error('compliance load failed', err);
        setComplianceFailed(true);
      });
    getScheduleItems(user.id)
      .then((items) => setReminderCount(items.filter((i) => i.scheduled_time).length))
      .catch((err) => console.error('reminder count load failed', err));
    checkNotificationPermission()
      .then(setPermGranted)
      .catch(() => setPermGranted(false));
    getUserFacts(user.id).then(setFacts).catch(() => setFacts([]));
    // keyed on the date, not the clock — this refetches once a day, not every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, todayISO, attempt]);

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

  if (!user) return null;
  /* A blank screen was what this rendered when the profile could not be read.
     Nothing to press, nothing to explain it. */
  if (!profile)
    return profileError ? (
      <>
        <div className="screen-head">
          <h1 className="t-title">You</h1>
        </div>
        <ErrorState
          message="Your profile did not load. It is usually the connection."
          onRetry={() => void refreshProfile()}
        />
      </>
    ) : null;

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

      {/* One card, not two. The second was a placeholder labelled "Widget" and
          a placeholder is a promise the screen does not keep; removing it lets
          the calendar have the width it wanted. */}
      <div className="cal-card">
        {complianceFailed ? (
          <ErrorState
            message="Your streak did not load. It is usually the connection."
            onRetry={() => setAttempt((n) => n + 1)}
          />
        ) : (
          <>
            <div className="cal-head">
              <span className="cal-month t-section">
                {today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <span className="cal-streak">
                <span className="cal-streak-num">{streak}</span>
                <span className="cal-streak-label t-caption">
                  day{streak === 1 ? '' : 's'}
                </span>
              </span>
            </div>

            {/* One circle per day of this month and no others — the row count
                comes from the data, so February and a 31-day month both fit. */}
            <div className="cal" style={{ ['--cal-rows' as string]: monthGrid.length }}>
              {DOW.map((d, i) => (
                <span key={`dow-${i}`} className="cal-dow t-caption">
                  {d}
                </span>
              ))}
              {monthGrid.map((row, ri) => (
                <Fragment key={ri}>
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
                      >
                        {d.getDate()}
                      </span>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </>
        )}
      </div>

      <MyStack />

      <ProgressNotes />

      {/* Every one of these was a div with an onClick. They looked and felt
          right and were unreachable by keyboard and announced as static text
          by VoiceOver — Sign Out and Delete Account included. A control is a
          button. */}
      <div className="rows">
        {/* TEMPORARY — remove before submission. See lib/catchupPreview.ts.
            First in the list rather than last: it was under Delete Account,
            below two legal links and a sign-out, which is where you put
            something you do not want found. */}
        {PREVIEW_ENABLED && (
          <button type="button" className="row pressable" onClick={requestCatchUpPreview}>
            <span className="row-label">Preview catch-up screen</span>
            <span className="row-value">Testing only</span>
          </button>
        )}
        <button type="button" className="row pressable" onClick={() => setOpenSheet('notifications')}>
          <span className="row-label">Notifications</span>
          <span className="row-value">
            {!permGranted ? 'Off' : reminderCount === 0 ? 'On · none set' : `${reminderCount} reminder${reminderCount === 1 ? '' : 's'}`}
          </span>
        </button>
        <button
          type="button"
          className="row pressable"
          aria-pressed={!!profile.reduce_motion}
          onClick={() => save({ reduce_motion: !profile.reduce_motion })}
        >
          <span className="row-label">Reduce motion</span>
          <span className="row-value">{profile.reduce_motion ? 'On' : 'Off'}</span>
        </button>
        <button
          type="button"
          className="row pressable"
          aria-pressed={!!profile.larger_text}
          onClick={() => save({ larger_text: !profile.larger_text })}
        >
          <span className="row-label">Larger text</span>
          <span className="row-value">{profile.larger_text ? 'On' : 'Off'}</span>
        </button>
        <button type="button" className="row pressable" onClick={() => setOpenSheet('subscription')}>
          <span className="row-label">Subscription</span>
          <span className="row-value" style={{ textTransform: 'capitalize' }}>
            {profile.subscription_tier}
          </span>
        </button>
        <button type="button" className="row pressable" onClick={() => setOpenSheet('export')}>
          <span className="row-label">Export Data</span>
        </button>
        <button type="button" className="row pressable" onClick={() => setOpenSheet('memory')}>
          <span className="row-label">{`What ${NAME} remembers`}</span>
          <span className="row-value">{facts.length === 0 ? 'Nothing yet' : `${facts.length}`}</span>
        </button>
        <a className="row pressable" href={PRIVACY_URL} {...externalLink}>
          <span className="row-label">Privacy Policy</span>
        </a>
        <a className="row pressable" href={TERMS_URL} {...externalLink}>
          <span className="row-label">Terms of Use</span>
        </a>
        <button type="button" className="row pressable" onClick={() => signOut()}>
          <span className="row-label">Sign Out</span>
        </button>
        <button
          type="button"
          className="row pressable"
          onClick={() => {
            setDeleteConfirm('');
            setDeleteError(null);
            setOpenSheet('delete');
          }}
        >
          <span className="row-label danger">Delete Account</span>
        </button>
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
          {NAME} is free while it is in its first release. Everything in the app is
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
      <Sheet open={openSheet === 'memory'} onClose={() => setOpenSheet(null)} title={`What ${NAME} remembers`}>
        <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 16 }}>
          Things you told us in your own words. The assistant reads these so you do not have to
          repeat yourself. Remove anything you would rather it forgot.
        </div>
        {facts.length === 0 ? (
          <div className="empty-state t-body">
            Nothing yet. Anything you type into a &ldquo;something else&rdquo; box shows up here.
          </div>
        ) : (
          <ul className="memory-list">
            {facts.map((f) => (
              <li key={f.id} className="memory-row">
                <span className="memory-text">
                  {/* The model's one-line reading where there is one, and always
                      the user's own words underneath — a summary they cannot
                      check against the original is not correctable. */}
                  {f.summary && <span className="memory-summary">{f.summary}</span>}
                  <span className="memory-raw t-caption">&ldquo;{f.raw_text}&rdquo;</span>
                </span>
                <button
                  className="memory-forget pressable"
                  onClick={async () => {
                    /* Swallowing this was the same defect as the unguarded dose
                       tick, on the one path where it matters most: this is
                       erasure. A row that leaves the list whether or not the
                       server accepted the delete tells somebody a note is
                       forgotten while the assistant is still reading it and
                       still sending it on. The row stays until the delete is
                       known to have landed. */
                    setForgetError(null);
                    try {
                      await dismissFact(f.id);
                    } catch (err) {
                      console.error('forgetting a note failed', err);
                      setForgetError('That did not save — it is still remembered. Try again.');
                      return;
                    }
                    setFacts((prev) => prev.filter((x) => x.id !== f.id));
                  }}
                >
                  Forget
                </button>
              </li>
            ))}
          </ul>
        )}

        {forgetError && (
          <div className="auth-error t-secondary" style={{ marginTop: 12 }}>
            {forgetError}
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
              await deleteAccount(user?.id ?? null);
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
