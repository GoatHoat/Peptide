import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import {
  addProgressNote,
  deleteProgressNote,
  getProgressNotes,
  getProgressPhotoUrl,
  uploadProgressPhoto,
  type ProgressNote,
} from '../lib/api';
import { Sheet } from '../components/Sheet';
import { formatShortDate, toISODate } from '../lib/date';
import { IconDoc, IconPlus } from '../components/Icons';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';

function NoteThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getProgressPhotoUrl(path).then(setUrl);
  }, [path]);
  if (!url) return <div className="note-thumb" />;
  return <img src={url} className="note-thumb" alt="" />;
}

export function ProgressNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ProgressNote[] | null>(null);
  const [open, setOpen] = useState(false);
  /* Press and hold to delete, the same gesture DoseRow uses for its history
     sheet — the one iOS uses everywhere for "show me more about this". A tap
     must not delete anything, and there is no swipe-to-delete here to discover
     by accident. */
  const [confirming, setConfirming] = useState<ProgressNote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  const cancelHold = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHeld(null);
  };
  useEffect(() => cancelHold, []);

  const load = () => {
    if (!user) return;
    setFailed(false);
    getProgressNotes(user.id)
      .then(setNotes)
      .catch((err) => {
        console.error('progress notes load failed', err);
        setFailed(true);
      });
  };
  useEffect(load, [user?.id]);

  if (!user) return null;

  return (
    <>
      <div className="divider">
        <span className="divider-line" />
        <span className="divider-text t-section">Progress Notes</span>
        <span className="divider-line" />
      </div>

      {failed && <ErrorState message="Your notes did not load. It is usually the connection." onRetry={load} />}
      {!failed && notes === null && <Skeleton rows={2} height={64} label="Loading your notes" />}
      {!failed && notes !== null && notes.length === 0 && (
        <div className="empty-state t-body">
          No notes yet. Write down how something is going and it will be here to look back on.
        </div>
      )}

      <div className="progress-list">
        {notes?.map((n) => (
          <div
            key={n.id}
            className={`progress-row${held === n.id ? ' holding' : ''}`}
            onPointerDown={(e) => {
              origin.current = { x: e.clientX, y: e.clientY };
              setHeld(n.id);
              timer.current = window.setTimeout(() => {
                setHeld(null);
                timer.current = null;
                setConfirming(n);
              }, 450);
            }}
            /* A scroll is a drag, not a hold. 10px of travel cancels it, the
               same tolerance DoseRow uses. */
            onPointerMove={(e) => {
              if (
                Math.abs(e.clientX - origin.current.x) > 10 ||
                Math.abs(e.clientY - origin.current.y) > 10
              ) {
                cancelHold();
              }
            }}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onPointerLeave={cancelHold}
            /* the iOS callout menu would otherwise hijack the same gesture */
            onContextMenu={(e) => e.preventDefault()}
          >
            {n.photo_path ? (
              <NoteThumb path={n.photo_path} />
            ) : (
              <div className="note-thumb note-thumb-empty">
                <IconDoc size={18} color="var(--t4)" />
              </div>
            )}
            <div className="progress-row-main">
              <span className="t-body-m">{formatShortDate(n.note_date)}</span>
              {n.measurement && (
                <span className="t-caption" style={{ color: 'var(--t3)' }}>
                  {n.measurement}
                </span>
              )}
              {n.text_note && (
                <span className="t-caption" style={{ color: 'var(--t2)' }}>
                  {n.text_note}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="add-dose pressable" onClick={() => setOpen(true)}>
        <IconPlus size={15} color="var(--purple)" />
        Add note
      </button>

      <Sheet
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={confirming ? formatShortDate(confirming.note_date) : ''}
      >
        <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 18 }}>
          Delete this note{confirming?.photo_path ? ' and its photo' : ''}? This cannot be
          undone.
        </div>
        <button
          className="btn btn-danger pressable"
          style={{ width: '100%' }}
          disabled={deleting}
          onClick={async () => {
            if (!confirming) return;
            setDeleting(true);
            try {
              await deleteProgressNote(confirming);
              /* Dropped from the list here rather than refetching: the row is
                 gone and a round trip would leave it on screen meanwhile. */
              setNotes((prev) => (prev ? prev.filter((x) => x.id !== confirming.id) : prev));
              setConfirming(null);
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? 'Deleting…' : 'Delete note'}
        </button>
        <button
          className="btn btn-out pressable"
          style={{ width: '100%', marginTop: 10 }}
          disabled={deleting}
          onClick={() => setConfirming(null)}
        >
          Keep it
        </button>
      </Sheet>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add progress note">
        <AddNoteForm
          userId={user.id}
          onAdded={() => {
            load();
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

function AddNoteForm({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [text, setText] = useState('');
  const [measurement, setMeasurement] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let photo_path: string | null = null;
      if (file) photo_path = await uploadProgressPhoto(userId, file);
      await addProgressNote(userId, {
        note_date: date,
        text_note: text.trim() || null,
        measurement: measurement.trim() || null,
        photo_path,
      });
      onAdded();
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="field">
        <label className="t-label" htmlFor="note-date">
          Date
        </label>
        <input
          id="note-date"
          type="date"
          className="field-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="t-label" htmlFor="note-measurement">
          Measurement (optional)
        </label>
        <input
          id="note-measurement"
          className="field-input"
          value={measurement}
          onChange={(e) => setMeasurement(e.target.value)}
          placeholder="e.g. Weight: 180 lbs"
        />
      </div>
      <div className="field">
        <label className="t-label" htmlFor="note-text">
          Notes (optional)
        </label>
        <input
          id="note-text"
          className="field-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How are you feeling?"
        />
      </div>
      <div className="field">
        <label className="t-label" htmlFor="note-photo">
          Photo (optional)
        </label>
        {/* No `capture` attribute here. `capture="environment"` sent iOS straight to
            the rear camera with no picker, which did two things: it terminated the
            app outright until Info.plist gained NSCameraUsageDescription, and it made
            attaching a photo you already had impossible, which the privacy policy
            says you can do. Without it iOS shows the normal sheet — photo library,
            take photo, or choose file. */}
        <input
          id="note-photo"
          type="file"
          accept="image/*"
          className="field-file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <div className="auth-error t-secondary">{error}</div>}

      <button className="btn btn-fill pressable" type="submit" disabled={busy} style={{ marginTop: 8, width: '100%' }}>
        {busy ? 'Saving…' : 'Save Note'}
      </button>
    </form>
  );
}
