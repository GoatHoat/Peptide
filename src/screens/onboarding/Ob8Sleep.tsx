import { useStore } from '../../state/store';
import { Glass, PrimaryButton } from '../../components/ui';
import { arcPath, fmt, polar } from '../../lib/format';
import { startDrag } from '../../lib/drag';

/** 8 · Your day, part one — sleep. Drag either end of the arc. */
export function Ob8Sleep() {
  const { state, set, next } = useStore();
  const { bedT, wakeT } = state;

  const dur = (((wakeT - bedT) % 24) + 24) % 24;
  const bedP = polar(bedT, 100);
  const wakeP = polar(wakeT, 100);

  const ticks = [];
  for (let h = 0; h < 24; h++) {
    const a = polar(h, h % 6 === 0 ? 113 : 117);
    const b = polar(h, 121);
    ticks.push({ h, x1: a[0], y1: a[1], x2: b[0], y2: b[1], c: h % 6 === 0 ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.12)' });
  }

  const labels = [0, 6, 12, 18].map((h) => {
    const p = polar(h, 136);
    return { h, x: p[0], y: p[1] + 4, lab: h === 0 ? '12a' : fmt(h, true) };
  });

  const dialDown = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const toH = (cx: number, cy: number) => {
      const x = cx - r.left - r.width / 2;
      const y = cy - r.top - r.height / 2;
      let a = Math.atan2(y, x) + 1.5708;
      if (a < 0) a += 6.2832;
      return (Math.round((a / 6.2832) * 96) / 4) % 24;
    };
    const h0 = toH(e.clientX, e.clientY);
    const gap = (a: number, b: number) => {
      const d = Math.abs(a - b) % 24;
      return Math.min(d, 24 - d);
    };
    const key: 'bedT' | 'wakeT' = gap(h0, bedT) <= gap(h0, wakeT) ? 'bedT' : 'wakeT';
    set({ [key]: h0 });
    startDrag((ev) => set({ [key]: toH(ev.clientX, ev.clientY) }));
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      <div className="absolute inset-0 box-border flex flex-col px-5 pb-10 pt-24">
        <div className="display">Your day, part one</div>
        <div className="serif mt-2.5 text-[16px] leading-[1.45] text-t2">
          Drag either end of the arc. We schedule around the window, not the minute.
        </div>

        <div className="min-h-3" style={{ flex: 0.6 }} />

        <div className="flex justify-center">
          <div
            onPointerDown={dialDown}
            className="relative h-[280px] w-[280px] select-none"
            style={{ cursor: 'grab', touchAction: 'none' }}
          >
            <svg width="280" height="280" viewBox="-10 -10 280 280" fill="none">
              <defs>
                <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#E8A87C" />
                  <stop offset="1" stopColor="#8A4E24" />
                </linearGradient>
              </defs>
              <circle cx="130" cy="130" r="100" stroke="#1E1E22" strokeWidth="18" />
              {ticks.map((t) => (
                <line key={t.h} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.c} strokeWidth="1.5" strokeLinecap="round" />
              ))}
              <path d={arcPath(bedT, wakeT, 100)} stroke="url(#arcGrad)" strokeWidth="18" strokeLinecap="round" />
              <circle cx={bedP[0]} cy={bedP[1]} r="11" fill="#E8A87C" />
              <circle cx={wakeP[0]} cy={wakeP[1]} r="11" fill="#E8A87C" />
              {labels.map((l) => (
                <text
                  key={l.h}
                  x={l.x}
                  y={l.y}
                  fill="rgba(255,255,255,0.38)"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="-apple-system,system-ui"
                >
                  {l.lab}
                </text>
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[44px] font-semibold leading-none tracking-[-1.2px] tabular-nums">
                {Math.floor(dur)}h {String(Math.round((dur % 1) * 60)).padStart(2, '0')}m
              </div>
              <div className="label mt-2 text-t3">In bed</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Glass level="flat" className="flex-1 px-[18px] py-4">
            <div className="label text-t2">In bed</div>
            <div className="font-display mt-2 whitespace-nowrap text-[25px] font-normal tracking-[0.9px] tabular-nums">
              {fmt(bedT)}
            </div>
          </Glass>
          <Glass level="flat" className="flex-1 px-[18px] py-4">
            <div className="label text-t2">Wake up</div>
            <div className="font-display mt-2 whitespace-nowrap text-[25px] font-normal tracking-[0.9px] tabular-nums">
              {fmt(wakeT)}
            </div>
          </Glass>
        </div>

        <div className="min-h-6 flex-1" />
        <PrimaryButton onClick={next}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
