import { useEffect, useMemo, useState } from 'react';
import { addToStack, getCatalogueNames, searchByIngredient, type CatalogueName } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useEntitlement } from '../lib/entitlements';
import { Sheet } from './Sheet';
import { Skeleton } from './Skeleton';
import { Tabs, type TabDef } from './Tabs';

/**
 * Choosing anything in the catalogue to track.
 *
 * WHY IT EXISTS. The only route into a stack was Discover, where a free
 * account can open six articles — so the picker was effectively six products
 * out of three hundred. That is not a tier, it is a dead end, and it was the
 * first thing a free user hit.
 *
 * WHAT IS PAID AND WHAT IS NOT. Reading about a product is the paid part.
 * Tracking one is not. That distinction is the whole change, and it is also
 * what keeps the paid tier meaningful — so every row here is a name and, at
 * most, its kind or brand. No summary, no evidence chip, no research count, no
 * dose, no "why this for you". Nothing that reads as content, because the
 * writing is the product and the name is not.
 *
 * `getCatalogueNames` selects four columns for the same reason: fetching the
 * writing in order to render a list of names would ship the thing being
 * withheld, and it is eight times the bytes.
 */
const TABS: TabDef[] = [
  { id: 'all', label: 'Everything', sub: null },
  { id: 'supplement', label: 'Softmax', sub: 'Vitamins, minerals and supplements' },
  { id: 'peptide', label: 'Hardmax', sub: 'Peptides' },
];

export function StackPicker({
  open,
  onClose,
  inStack,
  onAdded,
  onNeedsPro,
}: {
  open: boolean;
  onClose: () => void;
  /** glossary ids already tracked — a row cannot be added twice */
  inStack: Set<string>;
  /** the stack and the schedule both have to catch up; a closing sheet is not a tab change */
  onAdded: () => void;
  /** at the free limit the existing gate opens, rather than a new message */
  onNeedsPro: () => void;
}) {
  const { user } = useAuth();
  const { isPro, limits } = useEntitlement();
  const [all, setAll] = useState<CatalogueName[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  /** ids whose panel contains the query, from the catalogue's own RPC */
  const [byIngredient, setByIngredient] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  /** added in this session, so a row settles immediately without a refetch */
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  /* Fetched when the sheet opens, not on mount. MyStack lives inside the
     permanently-mounted You panel, so fetching there would pull the catalogue
     on every launch for everybody who never opens this. */
  useEffect(() => {
    if (!open || all !== null) return;
    let live = true;
    getCatalogueNames()
      .then((rows) => {
        if (live) setAll(rows);
      })
      .catch((err) => {
        console.error('catalogue names failed', err);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [open, all]);

  /* "zinc" has to find a multivitamin containing zinc, not only products with
     zinc in the title. searchByIngredient is the catalogue's own RPC and
     already degrades to an empty array when migration 0032 is not applied, so
     the name match below still stands on its own. */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setByIngredient(new Set());
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      searchByIngredient(q)
        .then((hits) => {
          if (live) setByIngredient(new Set(hits.map((h) => h.glossary_id)));
        })
        .catch(() => {
          if (live) setByIngredient(new Set());
        });
    }, 180);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  const held = inStack.size + justAdded.size;
  const cap = limits.stackItems;
  const atLimit = !isPro && held >= cap;

  const add = async (row: CatalogueName) => {
    if (!user || adding) return;
    if (atLimit) {
      /* The existing gate, never a silent no-op and never a new message. */
      onNeedsPro();
      return;
    }
    setAdding(row.id);
    try {
      await addToStack(user.id, row.id);
      setJustAdded((s) => new Set(s).add(row.id));
      onAdded();
    } catch (err) {
      console.error('could not add to stack', err);
    } finally {
      setAdding(null);
    }
  };

  const matcher = useMemo(() => {
    if (!all) return null;
    const q = query.trim().toLowerCase();
    return (kind: string) =>
      all.filter((r) => {
        if (kind !== 'all' && (r.kind ?? 'supplement') !== kind) return false;
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          (r.brand ?? '').toLowerCase().includes(q) ||
          byIngredient.has(r.id)
        );
      });
  }, [all, query, byIngredient]);

  return (
    <Sheet open={open} onClose={onClose} title="Add to stack">
      <input
        className="field-input"
        type="search"
        placeholder="Search by name or ingredient"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search the catalogue"
      />

      {/* One quiet line, before they reach the limit rather than after.
          Not a banner, not a countdown — somebody deciding what to track does
          not need to be hurried. */}
      {!isPro && (
        <p className="picker-cap t-caption">
          {cap === 1
            ? 'Free tracks one product at a time.'
            : 'Free tracks ' + cap + ' products at a time.'}
        </p>
      )}

      <Tabs tabs={TABS} storageKey="pepstack.picker.tab" defaultId="all">
        {(tab) => {
          if (failed) {
            return (
              <p className="empty-state t-body">
                The catalogue did not load. It is usually the connection.
              </p>
            );
          }
          /* At the rows' final height, so nothing moves when they arrive. */
          if (!matcher) return <Skeleton rows={8} height={52} label="Loading the catalogue" />;

          const rows = matcher(tab.id);
          if (rows.length === 0) {
            const where = tab.id === 'all' ? 'the catalogue' : tab.label.toLowerCase();
            return (
              <p className="empty-state t-body">
                {query.trim()
                  ? 'Nothing in ' + where + ' matches that. Try an ingredient, like zinc.'
                  : 'Nothing here yet.'}
              </p>
            );
          }

          return (
            <div className="picker-list">
              {rows.map((r) => {
                const already = inStack.has(r.id) || justAdded.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    className="picker-row pressable"
                    disabled={already || adding === r.id}
                    onClick={() => add(r)}
                  >
                    <span className="picker-row-main">
                      <span className="picker-name">{r.name}</span>
                      {/* Kind or brand only. Anything more is the article. */}
                      <span className="picker-sub t-caption">
                        {r.brand ?? (r.kind === 'peptide' ? 'Peptide' : 'Supplement')}
                      </span>
                    </span>
                    {/* Fixed width, so the state changes without the row resizing. */}
                    <span className="picker-state t-label">{already ? 'Added' : 'Add'}</span>
                  </button>
                );
              })}
            </div>
          );
        }}
      </Tabs>
    </Sheet>
  );
}
