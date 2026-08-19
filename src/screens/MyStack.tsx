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
import { StackPicker } from '../components/StackPicker';
import { ProSheet } from '../components/ProSheet';
import { GlossaryDetail } from './GlossaryDetail';
import { IconClose } from '../components/Icons';
import { toISODate } from '../lib/date';
import { TAB, useActiveTab, useGoToTab } from '../lib/activeTab';
import { Skeleton } from '../components/Skeleton';
import { syncScheduleNotifications } from '../lib/notifications';
import { ErrorState } from '../components/ErrorState';

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
  const goToTab = useGoToTab();
  const [items, setItems] = useState<StackItem[] | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [detail, setDetail] = useState<StackItem | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<StackItem | null>(null);
  const [expiryInput, setExpiryInput] = useState('');
  const [failed, setFailed] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pro, setPro] = useState(false);

  const load = async () => {
    if (!user) return;
    setFailed(false);
    try {
      const [stack, sched] = await Promise.all([getStack(user.id), getScheduleItems(user.id)]);
      setItems(stack);
      setSchedule(sched);
    } catch (err) {
      /* This was uncaught, so a failed fetch left the screen on its loading
         state with nothing to press. */
      console.error('stack load failed', err);
      setFailed(true);
    }
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
    if (linkedSchedule) {
      await removeScheduleItem(linkedSchedule.id);
      await syncScheduleNotifications(user.id);
    }
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

      {failed && <ErrorState message="Your stack did not load. It is usually the connection." onRetry={load} />}
      {!failed && items === null && <Skeleton rows={3} height={56} label="Loading your stack" />}
      {!failed && items !== null && items.length === 0 && (
        <div className="stack-empty">
          <img className="stack-empty-art" src="/art/empty-stack.png" alt="" />
          <p className="empty-state t-body">
            Nothing in your stack yet. Pick anything in the catalogue, or browse Discover to read
            about it first.
          </p>
          {/* The action, not just the instruction. Naming Discover and then
              leaving somebody to find it is half an empty state. */}
          <button className="empty-action pressable" onClick={() => goToTab(TAB.discover)}>
            Browse Discover
          </button>
        </div>
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

      {/* Always here — including on an empty stack, which is exactly when
          somebody needs it, and including while the list is still loading, so
          it does not appear late and move things. Not behind the empty state,
          not in a menu, and not behind a tier check: choosing what to track is
          not the paid part. */}
      {!failed && (
        <button className="stack-add pressable" onClick={() => setPicking(true)}>
          Add to stack
        </button>
      )}

      <StackPicker
        open={picking}
        onClose={() => setPicking(false)}
        inStack={new Set((items ?? []).map((i) => i.glossary_id))}
        /* A sheet closing over MyStack is not a tab change, so the focus
           refetch that keeps this screen fresh never fires for it. */
        onAdded={load}
        onNeedsPro={() => {
          setPicking(false);
          setPro(true);
        }}
      />
      <ProSheet open={pro} reason="stack-limit" onClose={() => setPro(false)} />

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

