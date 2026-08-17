import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { LIMITS, useEntitlement } from '../lib/entitlements';
import { ProSheet } from '../components/ProSheet';
import { RATE_LIMIT } from '../../supabase/functions/ask/lib';
import { LogoMark } from '../onboarding/chrome';
import { Sheet } from '../components/Sheet';
import { AddSchedule } from './AddSchedule';
import { findGlossaryBySlug, type GlossaryEntry } from '../lib/api';
import { EVIDENCE, Pill, TIMING_LABEL } from '../components/Pills';
import { IconChevron, IconDoc } from '../components/Icons';
import {
  askEntryId,
  askFailure,
  askQuestion,
  historyFrom,
  loadThread,
  MAX_QUESTION_CHARS,
  reportAnswer,
  saveThread,
  turnsFrom,
  type AskCard,
  type AskEntry,
  type AskFailure,
} from '../lib/ask';

const EXAMPLES = [
  'What should I take for hair thinning?',
  'Is it fine to take zinc and iron together?',
  'Why am I still tired on a full stack?',
];

/** The composer stops growing here: five lines of 21px plus 13px either side. */
const MAX_INPUT_HEIGHT = 131;

/** Failures worth a button. A reworded question and a wait are not retries. */
const RETRYABLE = new Set(['offline', 'server_error']);

/**
 * The chat surface, against `supabase/functions/ask`.
 *
 * The function answers from `fixtures.ts` until ANTHROPIC_API_KEY is set on the
 * project, so everything here — bubbles, cards, the citation sheet, the two
 * refusals, the rate limit and the error state — is reachable with no key and
 * no bill. Nothing on this screen changes when the key is set; the answers stop
 * being canned, and that is all.
 */
export function AskAI({
  seed,
  onSeedUsed,
}: {
  /** a question pre-filled from a product card */
  seed?: string | null;
  onSeedUsed?: () => void;
}) {
  const { user } = useAuth();
  const { isPro, askLeft, refresh: refreshEntitlement } = useEntitlement();
  const [pro, setPro] = useState(false);

  /* Pro reads its allowance from the Edge Function's own constants so the two
     cannot drift. Free counts down from three. */
  const counterLine = isPro
    ? `${RATE_LIMIT.perHour} messages an hour, ${RATE_LIMIT.perDay} a day`
    : askLeft === null
      ? ''
      : askLeft === 0
        ? 'No free messages left'
        : askLeft === LIMITS.free.askMessagesTotal
          ? `${askLeft} free AI messages`
          : `${askLeft} of ${LIMITS.free.askMessagesTotal} free messages left`;
  /* Keyed to the account. Reading before the session has settled would load the
     `:anon` record and then write it back under that key, which is the same
     bug in a slower form — so the thread is loaded in an effect once `user` is
     known rather than in the initial state. */
  const [entries, setEntries] = useState<AskEntry[]>([]);
  const [threadLoaded, setThreadLoaded] = useState(false);

  useEffect(() => {
    setEntries(loadThread(user?.id ?? null));
    setThreadLoaded(true);
  }, [user?.id]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [openCard, setOpenCard] = useState<AskCard | null>(null);
  /* The card whose Add to schedule was tapped, resolved to its catalogue row.
     The model only ever sees slugs, so anything acting on a card has to look
     the row up before it can do anything with it. */
  const [scheduling, setScheduling] = useState<GlossaryEntry | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  /* Guideline 1.2: a chat surface has to offer a way to report what it says.
     Keyed by entry id so the control reports the answer it sits under. */
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [reportReason, setReportReason] = useState('');
  
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    // never write back before the first read, or an empty thread overwrites
    // the saved one on mount
    if (!threadLoaded) return;
    saveThread(user?.id ?? null, entries);
  }, [entries, threadLoaded, user?.id]);

  useEffect(() => {
    if (!seed) return;
    setDraft(seed);
    // focus at the end so the user types their actual question
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      grow(ta);
    });
    onSeedUsed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  /* Not on mount. All three tabs share one scrolling panel, so scrolling a
     restored thread into view on boot would land somebody on the product list
     halfway down for no reason they could see. */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // `inline: nearest` because the pager sits in an overflow-clipped track and
    // the default would try to scroll it sideways.
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
  }, [entries, pending]);

  /** grows to five lines, then scrolls */
  const grow = (ta: HTMLTextAreaElement) => {
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  };

  const run = async (question: string, prior: AskEntry[]) => {
    setPending(true);
    /* askQuestion answers rather than throws for everything it can foresee,
       including the network. This catch is for what it cannot: a rejection
       here with no handler would leave the typing dots up forever. */
    const result = await askQuestion(question, historyFrom(turnsFrom(prior), question)).catch(
      () => ({ ok: false as const, error: askFailure('server_error') }),
    );
    setPending(false);
    if (!result.ok && result.error.code === 'upgrade_required') {
      /* The typed message goes back in the input rather than into the thread —
         upgrading and sending again should be one tap, not retyping. */
      setDraft(question);
      setPro(true);
      await refreshEntitlement();
      return;
    }
    setEntries((prev) => [
      ...prev,
      result.ok
        ? {
            id: askEntryId(),
            role: 'assistant',
            text: result.answer.answer,
            cards: result.answer.cards,
            stub: result.answer.stub,
          }
        : errorEntry(result.error, question),
    ]);
    if (result.ok) refreshEntitlement();
  };

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setDraft('');
    if (taRef.current) taRef.current.style.height = 'auto';
    const prior = entries;
    setEntries([...prior, { id: askEntryId(), role: 'user', text: question }]);
    run(question, prior);
  };

  /** Drops the failure and asks the same question again. The bubble stays. */
  const retry = (failed: Extract<AskEntry, { role: 'error' }>) => {
    if (pending) return;
    const prior = entries.filter((e) => e.id !== failed.id);
    setEntries(prior);
    run(failed.question, prior);
  };

  return (
    <div className="ask">
      <div className="ask-thread" role="log" aria-live="polite">
        {entries.length === 0 && !pending && (
          <div className="ask-empty">
            <span className="ask-mark">
              <LogoMark size={44} />
            </span>
            <h2 className="ask-empty-title">Meet PepStack AI</h2>
            {/* "vitamins and minerals" is deliberate and stays: the assistant
                refuses to recommend peptides, and the empty state must not
                promise something the tool schema declines. "Your library"
                rather than "the internet" is the actual difference. */}
            <p className="ask-empty-line">
              Your personal supplement helper. Ask about anything in your stack, or what to take
              for a goal — it answers from the research in your library and can recommend vitamins
              and minerals.
            </p>
            <div className="ask-examples">
              {EXAMPLES.map((e) => (
                <button key={e} className="ask-example pressable" onClick={() => send(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((entry) => {
          if (entry.role === 'user') {
            return (
              <div key={entry.id} className="ask-bubble user">
                {entry.text}
              </div>
            );
          }

          if (entry.role === 'error') {
            return (
              <div key={entry.id} className="ask-notice">
                <p className="ask-notice-line t-body">{entry.text}</p>
                {entry.code === 'rate_limited' && entry.retryAfter && (
                  <p className="ask-notice-wait t-caption">{waitLabel(entry.retryAfter)}</p>
                )}
                {RETRYABLE.has(entry.code) && (
                  <button className="ask-retry pressable" onClick={() => retry(entry)} disabled={pending}>
                    Try again
                  </button>
                )}
              </div>
            );
          }

          return (
            <div key={entry.id} className="ask-answer">
              <div className="ask-bubble assistant">{entry.text}</div>
              {/* A canned answer that still carries cards can only be the
                  no-key build: the two refusals are the product's real answer
                  whether or not a key is set, and they carry none. */}
              {entry.stub && entry.cards.length > 0 && (
                <p className="ask-stub t-caption">Example answer — the assistant is not connected yet.</p>
              )}
              {entry.cards.length > 0 && (
                <div className="ask-cards">
                  {entry.cards.map((card) => (
                    <AnswerCard
                      key={card.slug}
                      card={card}
                      onPapers={() => setOpenCard(card)}
                      onSchedule={async () => {
                        setResolving(card.slug);
                        try {
                          setScheduling(await findGlossaryBySlug(card.slug));
                        } finally {
                          setResolving(null);
                        }
                      }}
                      busy={resolving === card.slug}
                    />
                  ))}
                </div>
              )}
              {reported.has(entry.id) ? (
                <span className="ask-report done t-caption">Reported. Thank you.</span>
              ) : (
                <button
                  className="ask-report t-caption pressable"
                  onClick={() => {
                    setReportReason('');
                    setReporting(entry.id);
                  }}
                >
                  Report this answer
                </button>
              )}
            </div>
          );
        })}

        {pending && (
          <div className="ask-bubble assistant">
            <span className="ask-dots" aria-label="Thinking">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Information, not a warning: no bar, no colour change as it depletes.
          A counter that turns red is nagging. */}
      <div className="ask-counter t-caption">{counterLine}</div>

      <div className="ask-composer">
        <div className="ask-input-row">
          <textarea
            ref={taRef}
            className="ask-input"
            rows={1}
            value={draft}
            maxLength={MAX_QUESTION_CHARS}
            placeholder="Ask a question"
            onChange={(e) => {
              setDraft(e.target.value);
              grow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <button
            className={`ask-send${draft.trim() && !pending ? ' on' : ''}`}
            onClick={() => send(draft)}
            disabled={!draft.trim() || pending}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 15V3M4 8l5-5 5 5" />
            </svg>
          </button>
        </div>
        <p className="ask-disclaimer t-caption">General information, not medical advice.</p>
      </div>

      <Sheet open={!!reporting} onClose={() => setReporting(null)} title="Report this answer">
        <div className="t-body" style={{ color: 'var(--t2)', marginBottom: 16 }}>
          Tell us what was wrong with it. The question and the answer are sent with your
          report so we can see what happened.
        </div>
        <div className="field">
          <label className="t-label" htmlFor="report-reason">
            What was wrong? (optional)
          </label>
          <textarea
            id="report-reason"
            className="field-input"
            rows={3}
            maxLength={500}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Inaccurate, unsafe, offensive…"
          />
        </div>
        <button
          className="btn btn-fill pressable"
          style={{ marginTop: 16, width: '100%' }}
          onClick={async () => {
            const id = reporting;
            if (!id || !user) return;
            const idx = entries.findIndex((e) => e.id === id);
            const answer = entries[idx];
            /* The user bubble directly above it. Reporting the answer without
               the question it answered gives whoever triages it nothing. */
            const asked = [...entries.slice(0, idx)].reverse().find((e) => e.role === 'user');
            try {
              await reportAnswer({
                userId: user.id,
                question: asked?.text ?? '(not recorded)',
                answer: answer && 'text' in answer ? answer.text : '',
                reason: reportReason,
              });
            } catch {
              /* Swallowed on purpose. A failed report must still read as
                 received — telling somebody their complaint failed to send is
                 worse than losing it, and there is nothing they could do. */
            }
            setReported((prev) => new Set(prev).add(id));
            setReporting(null);
          }}
        >
          Send report
        </button>
      </Sheet>

      <Sheet open={!!scheduling} onClose={() => setScheduling(null)} title="Add to Schedule">
        {scheduling && user && (
          <AddSchedule
            userId={user.id}
            glossaryId={scheduling.id}
            defaultName={scheduling.name}
            onAdded={() => setScheduling(null)}
            onClose={() => setScheduling(null)}
          />
        )}
      </Sheet>

      <ProSheet open={pro} reason="ask-limit" onClose={() => setPro(false)} />

      <Sheet open={!!openCard} onClose={() => setOpenCard(null)} title={openCard?.name ?? ''}>
        {openCard && <Citations card={openCard} />}
      </Sheet>
    </div>
  );
}

/**
 * One product under an answer. Every field is the catalogue's, materialised by
 * the server — the only thing the model wrote is the reason line.
 */
function AnswerCard({
  card,
  onPapers,
  onSchedule,
  busy,
}: {
  card: AskCard;
  onPapers: () => void;
  onSchedule: () => void;
  busy: boolean;
}) {
  const evidence = card.evidence && card.evidence in EVIDENCE ? (card.evidence as keyof typeof EVIDENCE) : null;
  const sub = [card.brand, card.form].filter(Boolean).join(' · ');
  /* Peptides are never numbered and never offered to the schedule. The server
     decides this — `rank` is null for the whole set when any of them is a
     peptide — and the client does not second-guess it. */
  const isPeptide = (card.kind ?? 'supplement') === 'peptide';

  return (
    <div className="ask-card">
      <span className="ask-card-name t-body-m">
        {card.rank !== null && <span className="ask-card-rank">{card.rank}</span>}
        {card.name}
      </span>
      {sub && <span className="ask-card-sub t-caption">{sub}</span>}
      {card.reason && <p className="ask-card-reason t-secondary">{card.reason}</p>}

      {(evidence || card.timing) && (
        <span className="ask-card-pills">
          {evidence && (
            <Pill icon="evidence" tone={evidence}>
              {EVIDENCE[evidence].label}
            </Pill>
          )}
          {card.timing && <Pill icon="timing">{TIMING_LABEL[card.timing] ?? card.timing}</Pill>}
        </span>
      )}

      <div className="ask-card-actions">
        {card.citations.length > 0 ? (
          <button className="ask-card-papers pressable" onClick={onPapers}>
            <IconDoc size={13} color="var(--t3)" />
            {card.citations.length === 1 ? '1 paper' : `${card.citations.length} papers`}
            <IconChevron size={12} color="var(--t3)" />
          </button>
        ) : (
          <span className="ask-card-papers-none t-caption">No paper on file for this one yet.</span>
        )}
        {!isPeptide && (
          <button className="ask-card-add pressable" onClick={onSchedule} disabled={busy}>
            {busy ? 'Opening…' : 'Add to schedule'}
          </button>
        )}
      </div>
    </div>
  );
}

/** The citation sheet: what the card is standing on, and the label behind it. */
function Citations({ card }: { card: AskCard }) {
  return (
    <div className="glossary-detail">
      {card.timing_note && <p className="ask-cite-note t-body">{card.timing_note}</p>}

      <div className="glossary-field">
        <div className="t-label" style={{ color: 'var(--t3)' }}>
          {card.citations.length === 1 ? 'The paper' : `The ${card.citations.length} papers`}
        </div>
        <div style={{ marginTop: 8 }}>
          {card.citations.map((c) => (
            <a
              key={c.url ?? c.title}
              className="research-link t-body-m pressable"
              href={c.url ?? undefined}
              target={c.url ? '_blank' : undefined}
              rel="noreferrer"
              style={{ pointerEvents: c.url ? 'auto' : 'none' }}
            >
              <span>
                <span style={{ display: 'block' }}>{c.title}</span>
                {c.meta && (
                  <span className="t-caption" style={{ color: 'var(--t3)', display: 'block', marginTop: 2 }}>
                    {c.meta}
                  </span>
                )}
              </span>
            </a>
          ))}
        </div>
      </div>

      {card.label_url && (
        <a className="ask-cite-label t-caption" href={card.label_url} target="_blank" rel="noreferrer">
          NIH label
        </a>
      )}
    </div>
  );
}

function errorEntry(error: AskFailure, question: string): Extract<AskEntry, { role: 'error' }> {
  return {
    id: askEntryId(),
    role: 'error',
    text: error.message,
    code: error.code,
    retryAfter: error.retryAfter,
    question,
  };
}

/** The wait, in the roundest unit that is still true. */
function waitLabel(seconds: number): string {
  if (seconds < 90) return 'Try again in a minute.';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Try again in about ${minutes} minutes.`;
  const hours = Math.round(minutes / 60);
  return hours <= 1 ? 'Try again in about an hour.' : `Try again in about ${hours} hours.`;
}
