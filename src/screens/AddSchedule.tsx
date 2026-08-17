import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  addScheduleItem,
  findGlossaryByName,
  getPriorEntry,
  getStack,
  type PriorEntry,
  type ScheduleItem,
  type StackItem,
} from '../lib/api';
import { AmountInput } from '../components/AmountInput';
import { formatShortDate, toISODate } from '../lib/date';

interface Props {
  userId: string;
  glossaryId?: string | null;
  defaultName?: string;
  onAdded: (item: ScheduleItem) => void;
  onClose: () => void;
}

/**
 * Set up once — name, the user's own amount and an optional time. From then
 * on it shows up as a checkbox every day.
 *
 * The form fills itself in from what the user entered for this item before,
 * and says so. It has nothing else to fill in from: the app holds no
 * recommended dose for anything, and deliberately so — the glossary carries
 * category, mechanism, storage and route, never an amount or a frequency.
 * See legal.md. Every number here starts as the user's own.
 */
export function AddSchedule({ userId, glossaryId, defaultName, onAdded, onClose }: Props) {
  const [name, setName] = useState(defaultName ?? '');
  const [pickedGlossaryId, setPickedGlossaryId] = useState<string | null>(glossaryId ?? null);
  const [amount, setAmount] = useState('');
  const [time, setTime] = useState('');
  // local date, so "today" means the user's today and not the server's
  const [startDate, setStartDate] = useState(() => toISODate(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<StackItem[] | null>(null);
  const [prior, setPrior] = useState<PriorEntry | null>(null);
  const [prefilling, setPrefilling] = useState(false);

  useEffect(() => {
    getStack(userId).then(setStack);
  }, [userId]);

  /** Pull the user's own last numbers for this item into the empty fields. */
  const prefillFrom = useCallback(
    async (opts: { name?: string | null; glossaryId?: string | null }) => {
      setPrefilling(true);
      try {
        const p = await getPriorEntry(userId, opts);
        setPrior(p);
        if (!p) return;
        setAmount(p.amount);
        setTime(p.scheduled_time ? p.scheduled_time.slice(0, 5) : '');
      } finally {
        setPrefilling(false);
      }
    },
    [userId],
  );

  // arriving from Discover or the stack already knows which item this is
  useEffect(() => {
    if (glossaryId || defaultName) prefillFrom({ glossaryId, name: defaultName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glossaryId, defaultName]);

  const pickFromStack = (item: StackItem) => {
    setName(item.glossary.name);
    setPickedGlossaryId(item.glossary_id);
    prefillFrom({ glossaryId: item.glossary_id, name: item.glossary.name });
  };

  /** Typing a name that matches something used before fills the rest in too. */
  const onNameBlur = async () => {
    const n = name.trim();
    if (!n || pickedGlossaryId) return;
    if (!amount.trim()) prefillFrom({ name: n });
    // recognise a catalogue product typed by hand, so it can reach the stack
    const match = await findGlossaryByName(n).catch(() => null);
    if (match) setPickedGlossaryId(match.id);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount.trim()) {
      setError('Enter a name and an amount.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const item = await addScheduleItem(userId, {
        name: name.trim(),
        amount: amount.trim(),
        scheduled_time: time || null,
        glossary_id: pickedGlossaryId,
        start_date: startDate || toISODate(new Date()),
      });
      onAdded(item);
      onClose();
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      {stack && stack.length > 0 && (
        <div className="field">
          <label className="t-label">From your stack</label>
          <div className="stack-pick-row">
            {stack.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`stack-pick-chip pressable ${pickedGlossaryId === item.glossary_id ? 'active' : ''}`}
                onClick={() => pickFromStack(item)}
              >
                {item.glossary.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label className="t-label" htmlFor="sched-name">
          Name
        </label>
        <input
          id="sched-name"
          className="field-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setPickedGlossaryId(null);
          }}
          onBlur={onNameBlur}
          placeholder="e.g. BPC-157"
          required
        />
      </div>

      <AmountInput id="sched-amount" label="Your dose" value={amount} onChange={setAmount} />

      {prefilling && <div className="prefill-note t-caption">Checking your history…</div>}
      {!prefilling && prior && (
        <div className="prefill-note t-caption">
          Filled in from {prior.source === 'schedule' ? 'when you last scheduled this' : `your log on ${formatShortDate(prior.lastUsed!)}`}. Change anything you need.
        </div>
      )}
      {!prefilling && !prior && name.trim() !== '' && (
        <div className="prefill-note t-caption">
          First time for this one — the app has no dose to suggest, so these are yours to set.
        </div>
      )}

      <div className="field">
        <label className="t-label" htmlFor="sched-start">
          Starts
        </label>
        <input
          id="sched-start"
          className="field-input"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="t-label" htmlFor="sched-time">
          Time (optional)
        </label>
        <input
          id="sched-time"
          className="field-input"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div className="t-caption" style={{ color: 'var(--t3)', marginTop: -2 }}>
        {startDate === toISODate(new Date())
          ? 'This repeats daily from today, so it is on Today straight away.'
          : `This repeats daily from ${formatShortDate(startDate)} — it appears on Today on that day.`}{' '}
        Remove it from Today whenever you want it to stop.
      </div>

      {error && <div className="auth-error t-secondary">{error}</div>}

      <button className="btn btn-fill pressable" type="submit" disabled={busy} style={{ marginTop: 8, width: '100%' }}>
        {busy ? 'Saving…' : 'Add to Schedule'}
      </button>
    </form>
  );
}
