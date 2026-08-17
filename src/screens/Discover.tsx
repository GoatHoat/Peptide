import { NAME } from '../lib/brand';
import { Fragment, useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { Tabs } from '../components/Tabs';
import { GlossaryDetail } from './GlossaryDetail';
import { AddSchedule } from './AddSchedule';
import { ProductRow } from './DiscoverList';
import { AskAI } from './AskAI';
import { ProSheet, type ProReason } from '../components/ProSheet';
import { isStackLimitError, useEntitlement } from '../lib/entitlements';
import { useAuth } from '../lib/auth';
import { usePrefs } from '../lib/prefs';
import {
  addToStack,
  getGoalSynonyms,
  getNutrientReference,
  getStackMembership,
  listGlossary,
  matchGoal,
  type GlossaryEntry,
  type GoalSynonym,
  type NutrientReference,
  searchByIngredient,
  type IngredientHit,
} from '../lib/api';
import { computeMatchReason } from '../lib/matchReason';
import { IconMenu, IconSearch } from '../components/Icons';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';

const CATEGORY_LABEL: Record<string, string> = {
  healing: 'Healing',
  growth: 'Growth',
  cosmetic: 'Cosmetic',
  cognitive: 'Cognitive',
  other: 'Other',
};

/** rows per page */
const PAGE = 15;

const TABS = [
  { id: 'ask', label: 'Ask AI' },
  { id: 'peptide', label: 'Peptides' },
  { id: 'supplement', label: 'Vitamins & Minerals' },
];

export function Discover() {
  const { user } = useAuth();
  const { profile, save } = usePrefs();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  /** bumped by the retry; the search effect is the only thing that fetches */
  const [attempt, setAttempt] = useState(0);
  const [inStackIds, setInStackIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [detailEntry, setDetailEntry] = useState<GlossaryEntry | null>(null);
  const [schedulingEntry, setSchedulingEntry] = useState<GlossaryEntry | null>(null);
  const [synonyms, setSynonyms] = useState<GoalSynonym[]>([]);
  const [refs, setRefs] = useState<Record<string, NutrientReference[]>>({});
  /** one row open at a time; its card renders underneath it */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  /** set when a product's Ask a question button is pressed */
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [goAsk, setGoAsk] = useState(0);
  /* How many rows each list shows. 128 products at once is a wall, so each
     tab starts at a page and grows on request. Kept per kind so opening one
     tab does not reset the other. */
  const [shown, setShown] = useState<Record<string, number>>({ peptide: PAGE, supplement: PAGE });
  /* Products found by what is inside them rather than by their name. Empty when
     the query is not an ingredient, which is not the same as no results. */
  const [ingredientHits, setIngredientHits] = useState<IngredientHit[]>([]);
  /** whether the "also contains" section is expanded */
  const [showAlso, setShowAlso] = useState(false);
  /** which gate opened the paywall, or null */
  const [pro, setPro] = useState<ProReason | null>(null);
  const { isPro, limits, lockedTotal } = useEntitlement();

  useEffect(() => {
    getGoalSynonyms().then(setSynonyms);
  }, []);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    /* Neither branch caught. A failed search left `loading` true and the
       screen on its placeholder with nothing to press. */
    const onError = (err: unknown) => {
      console.error('discover load failed', err);
      setFailed(true);
      setLoading(false);
    };
    const handle = setTimeout(() => {
      const q = query.trim();
      if (!q) {
        // 200 rather than the default 8 — the list is the whole library now
        listGlossary(200)
          .then((r) => {
            setResults(r);
            setIngredientHits([]);
            setLoading(false);
          })
          .catch(onError);
        return;
      }
      /* Both searches, always. Ingredient data can be incomplete and a name
         match is still a real match, so the two are unioned rather than one
         replacing the other — see PROMPT_V3.md section 2. An empty ingredient
         result means "not an ingredient", not "nothing found". */
      Promise.all([matchGoal(q), searchByIngredient(q)])
        .then(([byName, byIngredient]) => {
          setIngredientHits(byIngredient);
          const seen = new Set(byIngredient.map((h) => h.glossary_id));
          setResults([...byName.filter((r) => !seen.has(r.id)), ...byName.filter((r) => seen.has(r.id))]);
          setLoading(false);
        })
        .catch(onError);
    }, 350);
    setShown({ peptide: PAGE, supplement: PAGE });
    return () => clearTimeout(handle);
  }, [query, attempt]);

  useEffect(() => {
    if (results.length === 0) return;
    getNutrientReference(results.map((r) => r.id)).then((m) =>
      setRefs((prev) => ({ ...prev, ...m })),
    );
  }, [results]);

  useEffect(() => {
    if (!user || results.length === 0) {
      setInStackIds(new Set());
      return;
    }
    getStackMembership(
      user.id,
      results.map((r) => r.id),
    ).then(setInStackIds);
  }, [results, user?.id]);

  const handleAddToStack = async (entry: GlossaryEntry) => {
    if (!user || inStackIds.has(entry.id) || addingIds.has(entry.id)) return;
    setAddingIds((prev) => new Set(prev).add(entry.id));
    try {
      await addToStack(user.id, entry.id);
      setInStackIds((prev) => new Set(prev).add(entry.id));
      /* Peptides go in the stack as a reference, never onto a schedule with an
         amount attached — the same split the tabs exist to express. */
      if ((entry.kind ?? 'peptide') === 'supplement') setSchedulingEntry(entry);
    } catch (err) {
      /* The database refused it, not the UI. Turning the trigger's errcode into
         the paywall is the whole reason the trigger raises a named code rather
         than a constraint violation. */
      if (isStackLimitError(err)) setPro('stack-limit');
      else throw err;
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const top = results[0] ?? null;
  const topReason = top ? computeMatchReason(top, query, synonyms) : null;
  const detailReason = detailEntry ? computeMatchReason(detailEntry, query, synonyms) : null;

  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">Discover</h1>
        <div className="screen-sub t-body">Glossary · Research</div>
      </div>

      <Tabs
        tabs={TABS}
        storageKey="pepstack.discover.tab"
        defaultId="supplement"
        jumpTo={goAsk}
        jumpToIndex={0}
      >
        {(tab) => {
          if (tab.id === 'ask') {
            return <AskAI seed={askSeed} onSeedUsed={() => setAskSeed(null)} />;
          }

          /* Nothing carried a kind before migration 0016, so an unset value
             reads as a peptide — which is what every earlier entry is. */
          const all = results.filter((r) => (r.kind ?? 'peptide') === tab.id);
          const limit = shown[tab.id] ?? PAGE;
          const visible = all.slice(0, limit);
          const remaining = all.length - visible.length;

          /* Ingredient results only make sense on the supplement tab: peptides
             carry no panel and never rank in a product search. `also` is the
             set of products that merely contain the ingredient — the ones whose
             name gives no clue, which is the entire point of showing them. */
          const isSupplementTab = tab.id === 'supplement';
          /* Locked rows still render, in place, at their exact final height —
             so nothing shifts if they upgrade, and so seeing that a product
             exists is possible. A free search must never return "no results"
             for something the catalogue holds. */
          /* A missing free_rank means "we cannot tell", and the safe answer to
             that is to show the product. It was `?? 9999`, which locked it —
             so on a database where 0037 has not been applied the column does
             not exist, `select('*')` returns no free_rank for any row, and a
             free account saw the entire library greyed out behind a paywall.
             An over-generous free tier is a pricing decision; a library that
             appears to be nothing but locks is a broken app. */
          const locked = (e: GlossaryEntry) =>
            !isPro &&
            limits.catalogue !== null &&
            typeof e.free_rank === 'number' &&
            e.free_rank > limits.catalogue;
          const firstLocked = visible.findIndex(locked);
          const amountOf = new Map(ingredientHits.map((h) => [h.glossary_id, h]));
          const forThis = isSupplementTab
            ? ingredientHits.filter((h) => h.section === 1)
            : [];
          const also = isSupplementTab ? ingredientHits.filter((h) => h.section === 2) : [];

          return (
            <div>
              {tab.id === 'peptide' && (
                <p className="tab-note t-caption">
                  Reference only. These are not over-the-counter supplements and {NAME} does not
                  recommend doses for them.
                </p>
              )}

              {/* Free-text match against the existing catalogue (lib/api matchGoal).
                  Never a generated answer — always a filtered list of real entries. */}
              <div className="search">
                <span style={{ color: 'var(--t3)', display: 'flex' }}>
                  <IconMenu />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a product or a goal"
                  spellCheck={false}
                />
                <span style={{ color: 'var(--t3)', display: 'flex' }}>
                  <IconSearch />
                </span>
              </div>

              {topReason && query.trim() && (
                <div className="match-context t-caption" style={{ marginTop: 10 }}>
                  {topReason.type === 'keyword'
                    ? `Matched "${query.trim()}" via: "${topReason.keyword}"`
                    : `Understood "${query.trim()}" as related to: ${topReason.tags
                        .map((t) => CATEGORY_LABEL[t] ?? t)
                        .join(', ')}`}
                </div>
              )}

              {failed && (
                <ErrorState
                  message="The library did not load. It is usually the connection."
                  onRetry={() => setAttempt((n) => n + 1)}
                />
              )}

              {!failed && loading && (
                <Skeleton rows={5} height={62} gap={8} radius={12} label="Loading the library" />
              )}

              {!failed && !loading && all.length === 0 && (
                <div className="empty-block empty-state t-body" style={{ marginTop: 24 }}>
                  {query.trim()
                    ? `Nothing here matches “${query.trim()}” yet. Try an ingredient — “magnesium”, “omega-3” — or a goal.`
                    : 'Nothing here yet. The library loads from the catalogue; pull down or reopen the tab to try again.'}
                  {/* Clearing it is the way back to a screen with something on
                      it, and it is one tap away from where they are looking. */}
                  {query.trim() && (
                    <button className="empty-action pressable" onClick={() => setQuery('')}>
                      Clear search
                    </button>
                  )}
                </div>
              )}

              {/* Two headers, and only where there is something under them.
                  "Products for zinc" is is_primary plus a paper that actually
                  names it; "Also contains zinc" is everything else, which is
                  where the multivitamins land — the ones the old name search
                  could never find. */}
              {isSupplementTab && forThis.length > 0 && query.trim() && (
                <div className="ing-section t-label">
                  Products for {query.trim()}
                </div>
              )}

              <div className="prod-list">
                <span className="rail" />
                {visible.map((r, vi) => (
                  <Fragment key={r.id}>
                    {/* One divider, above the first locked row, saying what is
                        behind it. The count is read from the database. */}
                    {vi === firstLocked && (
                      <button className="lock-divider pressable" onClick={() => setPro('locked-product')}>
                        Get Pro to unlock all {lockedTotal + (limits.catalogue ?? 0) * 2} products
                      </button>
                    )}
                  <ProductRow
                    locked={locked(r)}
                    onLocked={() => setPro('locked-product')}
                    entry={r}
                    /* How much of the searched ingredient is in this product.
                       The single most useful thing on the screen when someone
                       searches "zinc", and impossible to show before the panel
                       existed. */
                    ingredientAmount={amountOf.get(r.id) ?? null}
                    refs={refs[r.id]}
                    age={profile?.age}
                    sex={profile?.sex}
                    menstruates={profile?.menstruates}
                    inStack={inStackIds.has(r.id)}
                    adding={addingIds.has(r.id)}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                    onAdd={() => handleAddToStack(r)}
                    onAsk={() => {
                      setAskSeed(`I have a question about ${r.name}. `);
                      setGoAsk((n) => n + 1);
                    }}
                    onAllArticles={() => setDetailEntry(r)}
                    /* `save` updates the profile in memory before it writes,
                       so the figure changes on the tap. The catch is for the
                       window before migration 0019 is applied, where the
                       column does not exist yet: the answer holds for the
                       session and the failed write takes nothing with it. */
                    onMenstruates={(value) => {
                      save({ menstruates: value }).catch(() => {});
                    }}
                  />
                  </Fragment>
                ))}
              </div>

              {remaining > 0 && (
                <div className="prod-more">
                  <button
                    className="prod-btn pressable"
                    onClick={() => setShown((m) => ({ ...m, [tab.id]: limit + PAGE }))}
                  >
                    Load {Math.min(PAGE, remaining)} more
                  </button>
                  <button
                    className="prod-btn pressable"
                    onClick={() => setShown((m) => ({ ...m, [tab.id]: all.length }))}
                  >
                    See all {all.length}
                  </button>
                </div>
              )}

              {/* The rest: products carrying the ingredient without being about
                  it. Collapsed, because on a common ingredient this is most of
                  the catalogue and it would bury the section above. */}
              {isSupplementTab && also.length > 0 && query.trim() && (
                <div className="ing-also">
                  <button
                    className="ing-also-toggle pressable"
                    onClick={() => setShowAlso((v) => !v)}
                    aria-expanded={showAlso}
                  >
                    {showAlso
                      ? `Hide the ${also.length} other products`
                      : `${also.length} more product${also.length === 1 ? '' : 's'} contain ${query.trim()}`}
                  </button>
                  {showAlso && (
                    <ul className="ing-also-list">
                      {also.map((h) => (
                        <li key={h.glossary_id} className="ing-also-row">
                          <span className="ing-also-name">{h.name}</span>
                          <span className="ing-also-amount t-caption">
                            {h.amount !== null
                              ? `${h.amount} ${h.unit ?? ''}`.trim()
                              : /* the label prints the blend total and not the
                                   split, so there is genuinely no number */
                                'amount not stated'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {!loading && all.length > 0 && remaining === 0 && all.length > PAGE && (
                <p className="prod-count t-caption">All {all.length} shown</p>
              )}
            </div>
          );
        }}
      </Tabs>

      <Sheet open={!!detailEntry} onClose={() => setDetailEntry(null)} title={detailEntry?.name ?? ''}>
        {detailEntry && (
          <GlossaryDetail
            entry={detailEntry}
            matchContext={detailReason ? { query: query.trim(), reason: detailReason } : undefined}
          />
        )}
      </Sheet>

      <ProSheet open={!!pro} reason={pro ?? 'goals'} onClose={() => setPro(null)} />

      <Sheet open={!!schedulingEntry} onClose={() => setSchedulingEntry(null)} title="Add to Schedule">
        {schedulingEntry && user && (
          <AddSchedule
            userId={user.id}
            glossaryId={schedulingEntry.id}
            defaultName={schedulingEntry.name}
            onAdded={() => setSchedulingEntry(null)}
            onClose={() => setSchedulingEntry(null)}
          />
        )}
      </Sheet>
    </>
  );
}
