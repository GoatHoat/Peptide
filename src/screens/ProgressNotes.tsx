import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import {
  addProgressNote,
  getProgressNotes,
  getProgressPhotoUrl,
  uploadProgressPhoto,
  type ProgressNote,
} from '../lib/api';
import { Sheet } from '../components/Sheet';
import { formatShortDate, toISODate } from '../lib/date';
import { IconDoc, IconPlus } from '../components/Icons';

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

  const load = () => {
    if (user) getProgressNotes(user.id).then(setNotes);
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

      {notes === null && <div className="sheet-empty t-body">Loading…</div>}
      {notes !== null && notes.length === 0 && <div className="empty-state t-body">No notes yet.</div>}

      <div className="progress-list">
        {notes?.map((n) => (
          <div key={n.id} className="progress-row">
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
        <input
          id="note-photo"
          type="file"
          accept="image/*"
          capture="environment"
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
