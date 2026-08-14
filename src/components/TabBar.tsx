import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { IconDiscover, IconToday, IconYou } from './Icons';

export const TABS = [
  { key: 'today', label: 'Today', Icon: IconToday },
  { key: 'discover', label: 'Discover', Icon: IconDiscover },
  { key: 'you', label: 'You', Icon: IconYou },
] as const;

/** iOS never uses a duration ease for this. The tiny overshoot is the physics. */
export const TAB_SPRING = { type: 'spring' as const, stiffness: 380, damping: 32, mass: 1 };

const BAR_PAD = 7;
const ICON = 20;
const ICON_BOX = 24;
const GAP = 7;
/** past either end the finger only moves things a third as far */
const RUBBER = 0.35;
/** and never more than this much of a tab, however hard you pull */
const OVERSHOOT = 0.08;
const ICON_INACTIVE = 'rgba(255,255,255,0.42)';
const ICON_ACTIVE = 'rgba(255,255,255,1)'; // --t1

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Layout is a PURE FUNCTION of progress, which is what makes the pill
 * continuously coupled to a drag rather than jumping on release. At progress
 * 0.5 every derived value is exactly halfway.
 *
 * Label widths are measured once and animated as explicit px — framer-motion's
 * layout animation jitters here because the boxes it would measure are
 * themselves mid-animation.
 */
function computeLayout(raw: number, innerW: number, labelW: number[]) {
  // the pill lives on the bar; only the pages rubber-band past the ends
  const p = raw < 0 ? 0 : raw > 2 ? 2 : raw;
  const w = [0, 1, 2].map((i) => clamp01(1 - Math.abs(p - i)));
  const extra = [0, 1, 2].map((i) => w[i] * (labelW[i] + GAP));
  const base = (innerW - extra[0] - extra[1] - extra[2]) / 3;

  const boxW = extra.map((e) => base + e);
  const boxX: number[] = [];
  let acc = 0;
  for (let i = 0; i < 3; i++) {
    boxX.push(acc);
    acc += boxW[i];
  }

  const i0 = Math.max(0, Math.min(2, Math.floor(p)));
  const i1 = Math.min(2, i0 + 1);
  const f = clamp01(p - i0);

  /**
   * The pill morphs between the two REST widths rather than between the boxes
   * as they are mid-transition. Deriving it from the live boxes makes it dip
   * ~20% narrower halfway across — both tabs are holding half a label each —
   * which reads as a pinch. It should look like one object travelling and
   * resizing, so it tracks the travelling centre and the destination width.
   */
  const restW = (i: number) => (innerW - labelW[i] - GAP) / 3 + labelW[i] + GAP;
  const centre = (i: number) => boxX[i] + boxW[i] / 2;
  const pillW = lerp(restW(i0), restW(i1), f);

  return {
    w,
    boxX,
    boxW,
    pillX: lerp(centre(i0), centre(i1), f) - pillW / 2,
    pillW,
  };
}

interface Props {
  /** 0..2, continuous. Owned by App so the drag can write to it directly. */
  progress: MotionValue<number>;
  onSelect: (index: number, velocity?: number) => void;
}

export function TabBar({ progress, onSelect }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [innerW, setInnerW] = useState(0);
  const [labelW, setLabelW] = useState<number[]>([0, 0, 0]);

  /** Press lifts the pill; release travels it. Two separate motion values. */
  const lift = useMotionValue(0);

  useLayoutEffect(() => {
    const measure = () => {
      const bar = barRef.current;
      if (bar) setInnerW(bar.clientWidth - BAR_PAD * 2);
      const m = measureRef.current;
      if (m) {
        setLabelW(Array.from(m.children).map((c) => (c as HTMLElement).getBoundingClientRect().width));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (barRef.current) ro.observe(barRef.current);
    // fonts can land after first paint and change the label width
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, []);


  const layoutAt = (p: number) => computeLayout(p, innerW, labelW);

  /**
   * Grabbing the pill needs the inverse of the layout: given a pill centre in
   * px, which progress puts it there. pillCentre(p) is monotonic but not
   * linear — the labels growing and shrinking bend it — so it is sampled once
   * per measurement and inverted by interpolation on every frame of the drag.
   */
  const inverse = useMemo(() => {
    const N = 64;
    const cs: number[] = [];
    for (let i = 0; i <= N; i++) {
      const l = computeLayout((i / N) * 2, innerW, labelW);
      cs.push(l.pillX + l.pillW / 2);
    }
    const span = cs[N] - cs[0];
    const pxPerUnit = span > 0 ? span / 2 : 1;
    return (centre: number) => {
      if (centre <= cs[0]) return (centre - cs[0]) / pxPerUnit;
      if (centre >= cs[N]) return 2 + (centre - cs[N]) / pxPerUnit;
      let i = 0;
      while (i < N - 1 && cs[i + 1] < centre) i++;
      const t = (centre - cs[i]) / (cs[i + 1] - cs[i] || 1);
      return ((i + t) / N) * 2;
    };
  }, [innerW, labelW]);

  const pillX = useTransform(progress, (p) => layoutAt(p).pillX);
  const pillW = useTransform(progress, (p) => layoutAt(p).pillW);
  const pillScale = useTransform(lift, (l) => 1 + 0.04 * l);
  /* the lit rim is part of the material and must survive the lift, so the
     drop shadow is composed with it rather than replacing it */
  const pillShadow = useTransform(
    lift,
    (l) =>
      `inset 1px 1px 0 var(--pill-rim-hi), inset -1px -1px 0 var(--pill-rim-lo), 0 ${
        2 + 6 * l
      }px ${8 + 12 * l}px rgba(0,0,0,${0.4 + 0.15 * l})`,
  );

  const press = () => animate(lift, 1, { duration: 0.12, ease: 'easeOut' });
  const release = () => animate(lift, 0, TAB_SPRING);

  /* ── press, hold, and move the pill ───────────────────────────────
     The pill stays under the finger for the whole gesture: its centre is
     wherever you put it, and progress is read back out of that position, so
     the pages travel with it rather than after it. */
  const grab = useRef({
    active: false,
    moved: false,
    startX: 0,
    startCentre: 0,
    pointerId: -1,
    lastT: 0,
    vel: 0,
  });
  /** set for the lifetime of one gesture so a drag never fires a tab's click */
  const dragged = useRef(false);

  const onBarDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    progress.stop();
    const l = layoutAt(progress.get());
    grab.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startCentre: l.pillX + l.pillW / 2,
      pointerId: e.pointerId,
      lastT: performance.now(),
      vel: 0,
    };
    dragged.current = false;
    press();
    /* No pointer capture yet. Capturing here would retarget the pointerup to
       the bar, and the tab's click would never fire — a plain tap would stop
       selecting anything. It is taken on the first real movement instead. */
  };

  const onBarMove = (e: React.PointerEvent) => {
    const g = grab.current;
    if (!g.active) return;
    const dx = e.clientX - g.startX;
    if (!g.moved && Math.abs(dx) < 4) return;
    if (!g.moved) {
      g.moved = true;
      dragged.current = true;
      barRef.current?.setPointerCapture?.(g.pointerId);
    }

    /* Resistance is applied in bar pixels before the inversion. Applying it to
       progress instead would be a third of a *tab*, and one tab is 402px of
       page against 60px of bar — the pages would fly off past either end. */
    /* Resistance is capped rather than merely scaled. One tab is 60px of bar
       but 402px of page, so an unbounded 0.35× on a bar overdrag would throw
       the pages several screens clear. OVERSHOOT is the whole give. */
    const raw = inverse(g.startCentre + dx);
    const p =
      raw < 0
        ? -Math.min(OVERSHOOT, -raw * RUBBER)
        : raw > 2
          ? 2 + Math.min(OVERSHOOT, (raw - 2) * RUBBER)
          : raw;

    const now = performance.now();
    const dt = now - g.lastT;
    if (dt > 0) {
      // tabs per second, smoothed the same way the page drag smooths it
      const inst = ((p - progress.get()) / dt) * 1000;
      g.vel = g.vel * 0.7 + inst * 0.3;
      g.lastT = now;
    }
    progress.set(p);
  };

  const onBarUp = () => {
    const g = grab.current;
    if (!g.active) return;
    g.active = false;
    release();
    if (!g.moved) return; // a tap — the button's click handler owns it
    const projected = progress.get() + g.vel * 0.22;
    onSelect(Math.max(0, Math.min(2, Math.round(projected))), g.vel);
  };

  useEffect(() => {
    const up = () => {
      if (!grab.current.active) release();
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="bar"
      ref={barRef}
      onPointerDown={onBarDown}
      onPointerMove={onBarMove}
      onPointerUp={onBarUp}
      onPointerCancel={onBarUp}
    >
      {/* offscreen: real label widths, so the pill can size to them exactly */}
      <div className="tab-measure" ref={measureRef} aria-hidden>
        {TABS.map((t) => (
          <span key={t.key}>{t.label}</span>
        ))}
      </div>

      <div className="bar-inner">
        {/* ONE indicator node. Never three toggling backgrounds. */}
        <motion.div
          className="pill"
          style={{ x: pillX, width: pillW, scale: pillScale, boxShadow: pillShadow }}
        />

        {TABS.map((t, i) => (
          <Tab
            key={t.key}
            index={i}
            label={t.label}
            Icon={t.Icon}
            labelW={labelW[i]}
            progress={progress}
            layoutAt={layoutAt}
            onSelect={(n) => {
              if (!dragged.current) onSelect(n);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Tab({
  index,
  label,
  Icon,
  labelW,
  progress,
  layoutAt,
  onSelect,
}: {
  index: number;
  label: string;
  Icon: (p: { size?: number; color?: string }) => JSX.Element;
  labelW: number;
  progress: MotionValue<number>;
  layoutAt: (p: number) => ReturnType<typeof computeLayout>;
  onSelect: (i: number) => void;
}) {
  const x = useTransform(progress, (p) => layoutAt(p).boxX[index]);
  const width = useTransform(progress, (p) => layoutAt(p).boxW[index]);
  const w = useTransform(progress, (p) => clamp01(1 - Math.abs(p - index)));

  /**
   * Shaped so the outgoing label leads and the incoming lags — the same
   * asymmetry as the 110ms-out / 160ms-in-after-90ms sequence, but expressed
   * continuously so it also holds mid-drag.
   */
  const labelOpacity = useTransform(w, (v) => clamp01((v - 0.35) / 0.45));
  const labelX = useTransform(w, (v) => -6 * (1 - v));
  const labelWidth = useTransform(w, (v) => labelW * v);
  const labelGap = useTransform(w, (v) => GAP * v);

  /* Icons never disappear, they cross-fade. These two are the literal values
     from BUILD.md §4 — inactive rgba(255,255,255,0.42), active --t1. They are
     written out because useTransform interpolates colour strings and cannot
     resolve a CSS custom property. */
  const iconColor = useTransform(w, [0, 1], [ICON_INACTIVE, ICON_ACTIVE]);
  const iconScale = useTransform(w, (v) => 1 + 0.06 * v);

  return (
    <motion.button
      className="tab"
      style={{ x, width }}
      onClick={() => onSelect(index)}
      aria-label={label}
    >
      <motion.span className="tab-icon" style={{ scale: iconScale, color: iconColor, width: ICON_BOX }}>
        <Icon size={ICON} />
      </motion.span>
      <motion.span style={{ width: labelGap, flex: 'none' }} />
      <motion.span
        className="tab-label"
        style={{ opacity: labelOpacity, x: labelX, width: labelWidth }}
      >
        {label}
      </motion.span>
    </motion.button>
  );
}
