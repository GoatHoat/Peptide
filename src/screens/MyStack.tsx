import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  clearVialInfo,
  getScheduleItems,
  getStack,
  getTakenCountSince,
  removeFromStack,
  removeScheduleItem,
  setStackItemExpiry,
  setVialInfo,
  type ScheduleItem,
  type StackItem,
} from '../lib/api';
import { computeDrawMl } from '../lib/recon';
import { Sheet } from '../components/Sheet';
import { GlossaryDetail } from './GlossaryDetail';
import { IconClose } from '../components/Icons';
import { toISODate } from '../lib/date';
import { useActiveTab } from '../lib/activeTab';

const YOU_TAB = 2;

const CATEGORY_LABEL: Record<string, string> = {
  healing: 'Healing',
  growth: 'Growth',
  cosmetic: 'Cosmetic',
  cognitive: 'Cognitive',
  other: 'Other',
};

function expiryStatus(expiresOn: string | null): { label: string; className: string } | null {
  if (!expiresOn) return null;
  const days = Math.round(
    (new Date(expiresOn + 'T00:00:00').getTime() - new Date(toISODate(new Date()) + 'T00:00:00').getTime()) /
      86_400_000,
  );
  if (days < 0) return { label: 'Expired', className: 'expired' };
  if (days === 0) return { label: 'Expires today', className: 'soon' };
  if (days <= 7) return { label: `Expires in ${days}d`, className: 'soon' };
  return { label: `Expires ${expiresOn}`, className: '' };
}

/** Doses/days remaining — pure arithmetic on the vial size and draw-per-dose the user entered, plus a count of their own taken doses. Nothing here is estimated or suggested. */
function vialStatus(item: StackItem, takenCount: number, hasActiveSchedule: boolean): string | null {
  if (!item.vial_total_ml || !item.ml_per_dose) return null;
  const totalDoses = Math.floor(item.vial_total_ml / item.ml_per_dose);
  const remaining = Math.max(0, totalDoses - takenCount);
  const dayPart = hasActiveSchedule ? ` · ~${remaining}d left` : '';
  return `${remaining} dose${remaining === 1 ? '' : 's'} left${dayPart}`;
}

export function MyStack() {
  const { user } = useAuth();
  const activeTab = useActiveTab();
  const [items, setItems] = useState<StackItem[] | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [takenCounts, setTakenCounts] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<StackItem | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<StackItem | null>(null);
  const [expiryInput, setExpiryInput] = useState('');
  const [editingVial, setEditingVial] = useState<StackItem | null>(null);

  const load = async () => {
    if (!user) return;
    const [stack, sched] = await Promise.all([getStack(user.id), getScheduleItems(user.id)]);
    setItems(stack);
    setSchedule(sched);

    const tracked = stack.filter((i) => i.vial_total_ml && i.ml_per_dose && i.vial_started_on);
    const counts = await Promise.all(
      tracked.map((i) => getTakenCountSince(user.id, i.glossary.name, i.vial_started_on as string)),
    );
    setTakenCounts(Object.fromEntries(tracked.map((i, idx) => [i.id, counts[idx]])));
  };
  // Refetch on mount AND every time You becomes the active tab — Discover
  // (a permanently-mounted sibling, not a separate route) can add to the
  // stack while this component sits idle, so mount-only would go stale.
  useEffect(() => {
    if (activeTab === YOU_TAB) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTab]);

  if (!user) return null;

  const remove = async (item: StackItem) => {
    await removeFromStack(item.id);
    // Removing a peptide should mean it's actually gone, including off
    // Today — not left behind because Stack and Schedule are technically
    // separate tables the user never asked to think about separately.
    const linkedSchedule = schedule.find((s) => s.glossary_id === item.glossary_id);
    if (linkedSchedule) await removeScheduleItem(linkedSchedule.id);
    load();
  };

  const saveExpiry = async () => {
    if (!editingExpiry) return;
    await setStackItemExpiry(editingExpiry.id, expiryInput || null);
    setEditingExpiry(null);
    load();
  };

  return (
    <>
      <div className="divider">
        <span className="divider-line" />
        <span className="divider-text t-section">My Stack</span>
        <span className="divider-line" />
      </div>

      {items === null && <div className="sheet-empty t-body">Loading…</div>}
      {items !== null && items.length === 0 && (
        <div className="empty-state t-body">Nothing in your stack yet — add peptides from Discover.</div>
      )}

      <div className="stack-list">
        {items?.map((item) => {
          const status = expiryStatus(item.expires_on);
          const hasActiveSchedule = schedule.some((s) => s.glossary_id === item.glossary_id);
          const vial = vialStatus(item, takenCounts[item.id] ?? 0, hasActiveSchedule);
          return (
            <div key={item.id} className="stack-row pressable" onClick={() => setDetail(item)}>
              <div className="stack-row-main">
                <span className="stack-name">{item.glossary.name}</span>
                <span className="stack-meta t-caption">
                  {CATEGORY_LABEL[item.glossary.category] ?? item.glossary.category}
                  {status && <span className={`expiry-badge ${status.className}`}> · {status.label}</span>}
                </span>
                {vial && <span className="stack-vial t-caption">{vial}</span>}
              </div>
              <button
                className="stack-expiry-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingVial(item);
                }}
              >
                Vial
              </button>
              <button
                className="stack-expiry-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingExpiry(item);
                  setExpiryInput(item.expires_on ?? '');
                }}
              >
                Expiry
              </button>
              <button
                className="stack-remove pressable"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(item);
                }}
                aria-label="Remove from stack"
              >
                <IconClose size={14} color="var(--t3)" />
              </button>
            </div>
          );
        })}
      </div>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.glossary.name ?? ''}>
        {detail && <GlossaryDetail entry={detail.glossary} />}
      </Sheet>

      <Sheet open={!!editingExpiry} onClose={() => setEditingExpiry(null)} title="Set Expiry">
        <div className="field">
          <label className="t-label" htmlFor="expiry-date">
            Expires on
          </label>
          <input
            id="expiry-date"
            type="date"
            className="field-input"
            value={expiryInput}
            onChange={(e) => setExpiryInput(e.target.value)}
          />
        </div>
        <button className="btn btn-fill pressable" style={{ marginTop: 16, width: '100%' }} onClick={saveExpiry}>
          Save
        </button>
      </Sheet>

      <Sheet open={!!editingVial} onClose={() => setEditingVial(null)} title={`${editingVial?.glossary.name ?? ''} Vial`}>
        {editingVial && (
          <VialForm
            item={editingVial}
            onSaved={() => {
              setEditingVial(null);
              load();
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function VialForm({ item, onSaved }: { item: StackItem; onSaved: () => void }) {
  const [vialMg, setVialMg] = useState('');
  const [diluentMl, setDiluentMl] = useState(item.vial_total_ml ? String(item.vial_total_ml) : '');
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg');
  const [busy, setBusy] = useState(false);

  const vial = parseFloat(vialMg);
  const diluent = parseFloat(diluentMl);
  const dose = parseFloat(doseAmount);
  const valid = vial > 0 && diluent > 0 && dose > 0;
  const drawMl = valid ? computeDrawMl(vial, diluent, dose, doseUnit) : 0;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await setVialInfo(item.id, {
        vial_total_ml: diluent,
        ml_per_dose: drawMl,
        vial_started_on: toISODate(new Date()),
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await clearVialInfo(item.id);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 16 }}>
        Same numbers as the reconstitution calculator — this just remembers them so Today can
        tell you how much is left, from your own logged doses.
      </div>

      <div className="field">
        <label className="t-label" htmlFor="vial-mg">
          Peptide in the vial
        </label>
        <div className="recon-input-row">
          <input
            id="vial-mg"
            className="field-input"
            inputMode="decimal"
            value={vialMg}
            onChange={(e) => setVialMg(e.target.value)}
            placeholder="e.g. 5"
          />
          <span className="recon-unit">mg</span>
        </div>
      </div>

      <div className="field">
        <label className="t-label" htmlFor="vial-diluent">
          Diluent
        </label>
        <div className="recon-input-row">
          <input
            id="vial-diluent"
            className="field-input"
            inputMode="decimal"
            value={diluentMl}
            onChange={(e) => setDiluentMl(e.target.value)}
            placeholder="e.g. 2"
          />
          <span className="recon-unit">mL</span>
        </div>
      </div>

      <div className="field">
        <label className="t-label" htmlFor="vial-dose">
          Your usual dose
        </label>
        <div className="recon-input-row">
          <input
            id="vial-dose"
            className="field-input"
            inputMode="decimal"
            value={doseAmount}
            onChange={(e) => setDoseAmount(e.target.value)}
            placeholder="e.g. 250"
          />
          <div className="recon-unit-toggle">
            <button
              type="button"
              className={`recon-unit-btn ${doseUnit === 'mcg' ? 'active' : ''}`}
              onClick={() => setDoseUnit('mcg')}
            >
              mcg
            </button>
            <button
              type="button"
              className={`recon-unit-btn ${doseUnit === 'mg' ? 'active' : ''}`}
              onClick={() => setDoseUnit('mg')}
            >
              mg
            </button>
          </div>
        </div>
      </div>

      {valid && (
        <div className="recon-result">
          <div className="recon-result-row">
            <span className="t-caption" style={{ color: 'var(--t3)' }}>
              That's per dose
            </span>
            <span className="t-body-m">{drawMl.toFixed(3)} mL</span>
          </div>
          <div className="recon-result-row">
            <span className="t-caption" style={{ color: 'var(--t3)' }}>
              Doses in this vial
            </span>
            <span className="recon-big">{Math.floor(diluent / drawMl)}</span>
          </div>
        </div>
      )}

      <button className="btn btn-fill pressable" style={{ marginTop: 16, width: '100%' }} disabled={!valid || busy} onClick={save}>
        {item.vial_total_ml ? 'Start New Vial' : 'Save'}
      </button>
      {item.vial_total_ml && (
        <button
          className="schedule-remove-btn pressable"
          style={{ marginTop: 10, marginBottom: 0 }}
          disabled={busy}
          onClick={clear}
        >
          Stop Tracking This Vial
        </button>
      )}
    </div>
  );
}
