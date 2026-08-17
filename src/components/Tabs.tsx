import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 34, mass: 1 };
const AXIS_THRESHOLD = 10;
const RUBBER = 0.35;

export interface TabDef {
  id: string;
  label: string;
}

/**
 * A segmented control with a swipeable pager under it.
 *
 * The underline is derived from the same continuous value as the panel offset,
 * so a half-finished swipe shows the underline half-way rather than snapping
 * when the finger lifts — the same coupling the main tab bar uses.
 */
export function Tabs({
  tabs,
  storageKey,
  defaultId,
  jumpTo,
  jumpToIndex = 0,
  children,
}: {
  tabs: TabDef[];
  /** last tab is remembered, so coming back lands where you left */
  storageKey: string;
  defaultId?: string;
  /** bump this to jump to jumpToIndex — used by "Ask a question" on a product */
  jumpTo?: number;
  jumpToIndex?: number;
  children: (tab: TabDef, index: number) => ReactNode;
}) {
  const initial = (() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const i = tabs.findIndex((t) => t.id === saved);
      if (i >= 0) return i;
    } catch {
      /* private mode */
    }
    const d = tabs.findIndex((t) => t.id === defaultId);
    return d >= 0 ? d : 0;
  })();

  const [index, setIndex] = useState(initial);
  const pos = useMotionValue(initial);
  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  /* Measured before the first paint, not guessed. This was useRef(390) — a
     hardcoded stand-in for a phone width, the same fault as App.tsx's 402. The
     drag maths below divides by it, so a wrong value for the first frame is a
     wrong offset for the first frame. */
  const width = useRef(0);
  const [segs, setSegs] = useState<{ x: number; w: number }[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, tabs[index].id);
    } catch {
      /* ignore */
    }
  }, [index, storageKey, tabs]);

  useLayoutEffect(() => {
    const measure = () => {
      if (hostRef.current) width.current = hostRef.current.clientWidth;
      const bar = barRef.current;
      if (bar) {
        const base = bar.getBoundingClientRect().left;
        setSegs(
          [...bar.children].map((c) => {
            const r = (c as HTMLElement).getBoundingClientRect();
            return { x: r.left - base, w: r.width };
          }),
        );
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (hostRef.current) ro.observe(hostRef.current);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [tabs.length]);

  const goTo = (i: number, velocity = 0) => {
    const t = Math.max(0, Math.min(tabs.length - 1, i));
    setIndex(t);
    animate(pos, t, { ...SPRING, velocity });
  };

  /* A product's Ask a question button asks for the chat tab; the counter is
     what makes two presses in a row both register. */
  useEffect(() => {
    if (!jumpTo) return;
    setIndex(jumpToIndex);
    animate(pos, jumpToIndex, SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo]);

  const drag = useRef({ active: false, axis: null as null | 'x' | 'y', x: 0, y: 0, start: 0, vel: 0, t: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pos.stop();
    drag.current = { active: true, axis: null, x: e.clientX, y: e.clientY, start: pos.get(), vel: 0, t: performance.now() };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.axis === null) {
      if (Math.abs(dx) > AXIS_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        d.axis = 'x';
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (Math.abs(dy) > AXIS_THRESHOLD) {
        // vertical belongs to the list underneath
        d.active = false;
        return;
      } else return;
    }
    const now = performance.now();
    const dt = now - d.t;
    /* The layout effect has run long before any drag can start, so this is
       belt and braces — but it starts at 0 now rather than at a guessed 390,
       and dividing by 0 would send the track to Infinity rather than to a
       slightly wrong place. */
    const w = width.current || hostRef.current?.clientWidth || 1;
    const raw = d.start - dx / w;
    const max = tabs.length - 1;
    const p = raw < 0 ? raw * RUBBER : raw > max ? max + (raw - max) * RUBBER : raw;
    if (dt > 0) {
      d.vel = d.vel * 0.7 + ((p - pos.get()) / dt) * 1000 * 0.3;
      d.t = now;
    }
    pos.set(p);
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.axis !== 'x') return;
    goTo(Math.round(pos.get() + d.vel * 0.2), d.vel);
  };

  /* A percentage translate resolves against the element's OWN width, and the
     track is tabs.length x the viewport. Translating -100% per tab therefore
     moved three screens at a time and left the panel off to the left. */
  const trackX = useTransform(pos, (p) => `${(-p * 100) / tabs.length}%`);
  const lineX = useTransform(pos, (p) => {
    if (!segs.length) return 0;
    const i0 = Math.max(0, Math.min(segs.length - 1, Math.floor(p)));
    const i1 = Math.min(segs.length - 1, i0 + 1);
    const f = Math.max(0, Math.min(1, p - i0));
    return segs[i0].x + (segs[i1].x - segs[i0].x) * f;
  });
  const lineW = useTransform(pos, (p) => {
    if (!segs.length) return 0;
    const i0 = Math.max(0, Math.min(segs.length - 1, Math.floor(p)));
    const i1 = Math.min(segs.length - 1, i0 + 1);
    const f = Math.max(0, Math.min(1, p - i0));
    return segs[i0].w + (segs[i1].w - segs[i0].w) * f;
  });

  return (
    <div className="tabs" ref={hostRef}>
      <div className="tabs-bar" ref={barRef} role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={i === index}
            className={`tabs-tab${i === index ? ' on' : ''}`}
            onClick={() => goTo(i)}
          >
            {t.label}
          </button>
        ))}
        <motion.span className="tabs-underline" style={{ x: lineX, width: lineW }} />
      </div>

      <motion.div
        className="tabs-track"
        style={{ x: trackX, width: `${tabs.length * 100}%` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {tabs.map((t, i) => (
          <div
            className={`tabs-panel${i === index ? ' on' : ''}`}
            key={t.id}
            style={{ width: `${100 / tabs.length}%` }}
            hidden={false}
          >
            {children(t, i)}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
