import { useEffect, useState, type FormEvent } from 'react';
import { addScheduleItem, getStack, type ScheduleItem, type StackItem } from '../lib/api';
import { AmountInput } from '../components/AmountInput';

interface Props {
  userId: string;
  glossaryId?: string | null;
  defaultName?: string;
  onAdded: (item: ScheduleItem) => void;
  onClose: () => void;
}

/**
 * Set up once — name, the user's own amount, an optional time and
 * injection site. From then on it shows up as a checkbox every day; the
 * app never fills in or suggests any of these values, it just stops making
 * the user retype the same entry each morning. See legal.md.
 */
export function AddSchedule({ userId, glossaryId, defaultName, onAdded, onClose }: Props) {
  const [name, setName] = useState(defaultName ?? '');
  const [pickedGlossaryId, setPickedGlossaryId] = useState<string | null>(glossaryId ?? null);
  const [amount, setAmount] = useState('');
  const [time, setTime] = useState('');
  const [site, setSite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<StackItem[] | null>(null);

  useEffect(() => {
    getStack(userId).then(setStack);
  }, [userId]);

  const pickFromStack = (item: StackItem) => {
    setName(item.glossary.name);
    setPickedGlossaryId(item.glossary_id);
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
        injection_site: site.trim() || null,
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
          placeholder="e.g. BPC-157"
          required
        />
      </div>

      <AmountInput id="sched-amount" label="Your dose" value={amount} onChange={setAmount} />

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

      <div className="field">
        <label className="t-label" htmlFor="sched-site">
          Injection site (optional)
        </label>
        <input
          id="sched-site"
          className="field-input"
          list="sched-site-suggestions"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="e.g. Abdomen"
        />
        <datalist id="sched-site-suggestions">
          <option value="Abdomen" />
          <option value="Thigh" />
          <option value="Glute" />
          <option value="Upper arm" />
          <option value="Shoulder" />
        </datalist>
      </div>

      <div className="t-caption" style={{ color: 'var(--t3)', marginTop: -2 }}>
        This repeats daily starting today. Remove it from Today whenever you want it to stop.
      </div>

      {error && <div className="auth-error t-secondary">{error}</div>}

      <button className="btn btn-fill pressable" type="submit" disabled={busy} style={{ marginTop: 8, width: '100%' }}>
        {busy ? 'Saving…' : 'Add to Schedule'}
      </button>
    </form>
  );
}
