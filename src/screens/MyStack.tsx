import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  getScheduleItems,
  getStack,
  removeFromStack,
  removeScheduleItem,
  setStackItemExpiry,
  type ScheduleItem,
  type StackItem,
} from '../lib/api';
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


export function MyStack() {
  const { user } = useAuth();
  const activeTab = useActiveTab();
  const [items, setItems] = useState<StackItem[] | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [detail, setDetail] = useState<StackItem | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<StackItem | null>(null);
  const [expiryInput, setExpiryInput] = useState('');

  const load = async () => {
    if (!user) return;
    const [stack, sched] = await Promise.all([getStack(user.id), getScheduleItems(user.id)]);
    setItems(stack);
    setSchedule(sched);
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
          return (
            <div key={item.id} className="stack-row pressable" onClick={() => setDetail(item)}>
              <div className="stack-row-main">
                <span className="stack-name">{item.glossary.name}</span>
                <span className="stack-meta t-caption">
                  {CATEGORY_LABEL[item.glossary.category] ?? item.glossary.category}
                  {status && <span className={`expiry-badge ${status.className}`}> · {status.label}</span>}
                </span>
              </div>
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

    </>
  );
}

