import { useEffect, useRef, useState } from 'react';
import { LogoMark } from '../onboarding/chrome';

const EXAMPLES = [
  'What should I take for hair thinning?',
  'Is it fine to take zinc and iron together?',
  'Why am I still tired on a full stack?',
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * The chat surface. The model behind it is not wired yet — that needs the
 * server-side function and a key that must never reach this bundle — so
 * sending puts the message in the thread and answers with the one honest thing
 * it can say. Everything else here is the finished interface.
 */
export function AskAI({
  seed,
  onSeedUsed,
}: {
  /** a question pre-filled from a product card */
  seed?: string | null;
  onSeedUsed?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pending]);

  /** grows to five lines, then scrolls */
  const grow = (ta: HTMLTextAreaElement) => {
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 132)}px`;
  };

  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setDraft('');
    if (taRef.current) taRef.current.style.height = 'auto';
    setPending(true);
    setTimeout(() => {
      setPending(false);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: "I'm not connected yet — the server-side function that holds the API key still needs deploying. Once it is, I'll be able to see your age, your goals, your schedule and everything in your stack, and answer against the papers in the library rather than from memory.",
        },
      ]);
    }, 900);
  };

  return (
    <div className="ask">
      <div className="ask-thread">
        {messages.length === 0 && !pending && (
          <div className="ask-empty">
            <span className="ask-mark">
              <LogoMark size={44} />
            </span>
            <p className="ask-empty-line">
              Ask about anything you&rsquo;re taking, or what you&rsquo;re trying to fix.
            </p>
            <div className="ask-examples">
              {EXAMPLES.map((e) => (
                <button key={e} className="ask-example pressable" onClick={() => setDraft(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`ask-bubble ${m.role}`}>
            {m.text}
          </div>
        ))}

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

      <div className="ask-composer">
        <div className="ask-input-row">
          <textarea
            ref={taRef}
            className="ask-input"
            rows={1}
            value={draft}
            placeholder="Ask a question"
            onChange={(e) => {
              setDraft(e.target.value);
              grow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className={`ask-send${draft.trim() ? ' on' : ''}`}
            onClick={send}
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
    </div>
  );
}
