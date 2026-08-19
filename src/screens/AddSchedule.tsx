import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  addScheduleItem,
  PeptideNotSchedulable,
  findGlossaryByName,
  getPriorEntry,
  getStack,
  type PriorEntry,
  type ScheduleItem,
  type StackItem,
} from '../lib/api';
import { AmountInput } from '../components/AmountInput';
import { formatShortDate, toISODate } from '../lib/date';
import { syncScheduleNotifications } from '../lib/notifications';

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
/**
 * Said when somebody tries to give a peptide a dose time.
 *
 * States the rule and what they can do instead. Peptides are a reference
 * library here - no dose, no timing - so being unable to schedule one is the
 * product working, not an error, and it must not read like a retryable
 * failure. The rule itself lives in api.ts and is not changed by any of this.
 */
const PEPTIDE_MESSAGE =
  'Peptides are reference only, so this one cannot be given a dose time. It can stay in your stack.';

export function AddSchedule({ userId, glossaryId, defaultName, onAdded, onClose }: Props) {
  const [name, setName] = useState(defaultName ?? '');
  const [pickedGlossaryId, setPickedGlossaryId] = useState<string | null>(glossaryId ?? null);
  const [amount, setAmount] = useState('');
  /**
   * Closed unless asked for, always — including when history prefilled a value.
   *
   * The amount was a step between deciding to track something and it being
   * tracked, and it earned nothing: the app suggests no doses, checks the
   * number against nothing, and shows it back only as a caption on Today.
   * Collapsed rather than deleted because DoseRow does render it for somebody
   * taking two capsules of one thing and one of another, and because api.ts
   * types it non-optional in five places - deleting it means touching every
   * insert path for a change whose whole point is being small.
   */
  const [showAmount, setShowAmount] = useState(false);
  /**
   * Whether the chosen product is a peptide, which cannot be scheduled.
   *
   * api.ts enforces that and is the right place for it - every path to the
   * schedule goes through addScheduleItem. But being told after pressing Save
   * is the wrong moment to learn a rule, so this stops the attempt earlier and
   * says why. The guard itself is untouched.
   */
  const [pickedIsPeptide, setPickedIsPeptide] = useState(false);
  const [time, setTime] = useState('');
  // local date, so "today" means the user's today and not the server's
  const [startDate, setStartDate] = useState(() => toISODate(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<StackItem[] | null>(null);
  const [prior, setPrior] = useState<PriorEntry | null>(null);
  const [prefilling, setPrefilling] = useState(false);

  useEffect(() => {
    getStack(userId)
      .then(setStack)
      /* Uncaught, this took the whole app down rather than showing an empty
         picker. An empty picker is wrong; a white screen is worse. */
      .catch((err) => {
        console.error('stack load failed', err);
        setStack([]);
      });
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
    setPickedIsPeptide(item.glossary.kind === 'peptide');
    prefillFrom({ glossaryId: item.glossary_id, name: item.glossary.name });
  };

  /** Typing a name that matches something used before fills the rest in too. */
  const onNameBlur = async () => {
    const n = name.trim();
    if (!n || pickedGlossaryId) return;
    if (!amount.trim()) prefillFrom({ name: n });
    // recognise a catalogue product typed by hand, so it can reach the stack
    const match = await findGlossaryByName(n).catch(() => null);
    if (match) {
      setPickedGlossaryId(match.id);
      /* Typed by hand counts too - the guard keys off the glossary row, not
         off how the row was chosen. */
      setPickedIsPeptide(match.kind === 'peptide');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    /* Name and time are what this sheet exists to collect. The amount was in
       this check, so leaving it blank failed validation - which would have
       made the field optional in appearance only. */
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    if (pickedIsPeptide) {
      setError(PEPTIDE_MESSAGE);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      /* A reminder exists for a block, so adding to one changes its copy and
         adding a new time creates one. Synced here rather than only on Today,
         because this sheet also opens from Discover. */
      const item = await addScheduleItem(userId, {
        name: name.trim(),
        amount: amount.trim(),
        scheduled_time: time || null,
        glossary_id: pickedGlossaryId,
        start_date: startDate || toISODate(new Date()),
      });
      onAdded(item);
      await syncScheduleNotifications(userId);
      onClose();
    } catch (err) {
      /* This used to be a bare catch showing "Could not save. Try again." for
         everything, so a peptide - which can never be saved - invited somebody
         to keep pressing a button that could not work. The rule is a fact
         about the product, not a failure, so it reads as one. */
      setError(err instanceof PeptideNotSchedulable ? PEPTIDE_MESSAGE : 'Could not save. Try again.');
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
            {stack.map((item) => {
              /* Peptides are in the stack and cannot be scheduled, and the
                 picker makes them easy to put there — so they are shown,
                 disabled, rather than offered and then refused on save. */
              const peptide = item.glossary.kind === 'peptide';
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`stack-pick-chip pressable ${pickedGlossaryId === item.glossary_id ? 'active' : ''}${peptide ? ' off' : ''}`}
                  disabled={peptide}
                  title={peptide ? 'Peptides cannot be given a dose time' : undefined}
                  onClick={() => pickFromStack(item)}
                >
                  {item.glossary.name}
                </button>
              );
            })}
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
            setPickedIsPeptide(false);
          }}
          onBlur={onNameBlur}
          placeholder="e.g. Magnesium glycinate"
          required
        />
      </div>

      {/* One tap to reach, nothing above it moves when it opens - the sheet
          grows downward. The label carries the value when there is one, so a
          prefilled amount is never hidden information: it would be saved
          either way, and a collapsed control concealing a value it is about to
          write is worse than one extra line of text. */}
      {!showAmount && (
        <button type="button" className="disclose t-caption" onClick={() => setShowAmount(true)}>
          {amount.trim() ? `Amount: ${amount.trim()} — change` : 'Add an amount (optional)'}
        </button>
      )}
      {showAmount && (
        <AmountInput id="sched-amount" label="Your dose" value={amount} onChange={setAmount} />
      )}

      {prefilling && <div className="prefill-note t-caption">Checking your history…</div>}
      {!prefilling && prior && (
        <div className="prefill-note t-caption">
          Filled in from {prior.source === 'schedule' ? 'when you last scheduled this' : `your log on ${formatShortDate(prior.lastUsed!)}`}. Change anything you need.
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
