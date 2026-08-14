import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { TabBar, TAB_SPRING } from './components/TabBar';
import { Today } from './screens/Today';
import { Discover } from './screens/Discover';
import { You } from './screens/You';

/** Commit to an axis inside the first 10px and never revisit it. */
const AXIS_THRESHOLD = 10;
/** Past either end the finger only moves the track a third as far. */
const RUBBER = 0.35;

export default function App() {
  const isTouch = useTouch();

  /* Only the desktop phone-box draws a status bar. On a device there is
     already one above the web view — the OS's when installed, Safari's when
     not — and drawing a second one is what put a band of dead space above
     every title. */
  if (isTouch) return <Shell framed={false} />;
  return (
    <div className="frame-host">
      <div className="frame">
        <Shell framed />
      </div>
    </div>
  );
}

function Shell({ framed }: { framed: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  /** 0..2, continuous. The pill and the content both derive from this. */
  const progress = useMotionValue(0);
  const [index, setIndex] = useState(0);

  const width = useRef(402);
  useEffect(() => {
    const measure = () => {
      if (hostRef.current) width.current = hostRef.current.clientWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (hostRef.current) ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);

  const trackX = useTransform(progress, (p) => -p * width.current);

  const goTo = (i: number, velocity = 0) => {
    const target = Math.max(0, Math.min(2, i));
    setIndex(target);
    animate(progress, target, { ...TAB_SPRING, velocity });
  };

  /* ── the drag ──────────────────────────────────────────────
     Content tracks the finger 1:1 and the pill is derived from the same
     value on every frame. Nothing is applied on release except the snap.  */
  const drag = useRef({
    active: false,
    axis: null as null | 'x' | 'y',
    startX: 0,
    startY: 0,
    startP: 0,
    lastX: 0,
    lastT: 0,
    vel: 0,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    progress.stop();
    drag.current = {
      active: true,
      axis: null,
      startX: e.clientX,
      startY: e.clientY,
      startP: progress.get(),
      lastX: e.clientX,
      lastT: performance.now(),
      vel: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.axis === null) {
      if (Math.abs(dx) > AXIS_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        d.axis = 'x';
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (Math.abs(dy) > AXIS_THRESHOLD) {
        // vertical: hand it back to the panel's native momentum scrolling
        d.axis = 'y';
        d.active = false;
        return;
      } else {
        return;
      }
    }
    if (d.axis !== 'x') return;

    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) {
      // tabs per second, smoothed
      const inst = ((d.lastX - e.clientX) / width.current / dt) * 1000;
      d.vel = d.vel * 0.7 + inst * 0.3;
      d.lastX = e.clientX;
      d.lastT = now;
    }

    const raw = d.startP - dx / width.current;
    const p = raw < 0 ? raw * RUBBER : raw > 2 ? 2 + (raw - 2) * RUBBER : raw;
    progress.set(p);
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.active || d.axis !== 'x') {
      d.active = false;
      return;
    }
    d.active = false;

    const p = progress.get();
    // project where the flick was heading; a fast flick under 50% still advances
    const projected = p + d.vel * 0.22;
    const target = Math.max(0, Math.min(2, Math.round(projected)));
    setIndex(target);
    animate(progress, target, { ...TAB_SPRING, velocity: d.vel });
  };

  return (
    <div className={`app${framed ? ' framed' : ''}`} ref={hostRef}>
      {framed && (
        <div className="status">
          <span>9:41</span>
        </div>
      )}

      <motion.div
        className="track"
        style={{ x: trackX }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="panel">
          <Today />
        </div>
        <div className="panel">
          <Discover />
        </div>
        <div className="panel">
          <You />
        </div>
      </motion.div>

      <TabBar progress={progress} onSelect={goTo} />
      <span hidden data-active-tab={index} />
    </div>
  );
}

function useTouch() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const check = () =>
      setV(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return v;
}
