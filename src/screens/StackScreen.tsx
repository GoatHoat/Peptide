import { useEffect, useRef } from 'react';
import { useSchedule } from '../data/schedule';
import { useStore } from '../state/store';
import { Chevron, SectionLabel } from '../components/ui';
import { startDrag } from '../lib/drag';
import { clamp } from '../lib/format';

const SNAPS = [66, 310, 620];
const Y_AXIS = [4, 3, 2, 1, 0];

/** TAB 2 — STACK. Doses-per-hour chart above a draggable list sheet. */
export function StackScreen() {
  const { state, set, go } = useStore();
  const { sheetH, sheetDragging, emptyStack } = state;
  const { selected, blocks, dosesPerHour } = useSchedule();
  const stackSections = selected.length
    ? [{ s: 'Active', items: selected.map((i) => ({ id: i.id, n: i.n.replace(/&nbsp;/g, ' '), d: `${i.d.split(' · ')[0]} · ${i.evidence.toLowerCase()}`, t: i.time, on: true })) }]
    : [];
  const stackCount = selected.length;
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) chartRef.current.scrollLeft = 230;
  }, []);

  const sheetDown = (e: React.PointerEvent) => {
    const y0 = e.clientY;
    const h0 = sheetH;
    let moved = false;
    let h = h0;
    set({ sheetDragging: true });
    startDrag(
      (ev) => {
        if (Math.abs(ev.clientY - y0) > 3) moved = true;
        h = clamp(h0 - (ev.clientY - y0), 66, 620);
        set({ sheetH: h });
      },
      () => {
        const best = moved
          ? SNAPS.reduce((a, s) => (Math.abs(s - h) < Math.abs(a - h) ? s : a), SNAPS[0])
          : h > 450
            ? 310
            : h > 150
              ? 66
              : 310;
        set({ sheetH: best, sheetDragging: false });
      },
    );
  };

  const hours = [];
  for (let h = 0; h < 24; h++) {
    const c = dosesPerHour[h] || 0;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    hours.push({
      h,
      c,
      hh: c ? c * 66 : 5,
      delay: h * 22 + 'ms',
      bg: c ? 'linear-gradient(180deg,#E8A87C,#A55F2E)' : '#1E1E22',
      lab: h12 + (h < 12 ? 'a' : 'p'),
      labC: c ? '#fff' : 'rgba(255,255,255,0.32)',
    });
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      <div className="absolute flex h-10 items-center justify-between" style={{ top: 70, left: 20, right: 20 }}>
        <div className="w-9" />
        <div className="text-[17px] font-semibold tracking-[-0.43px] text-t2">Stack</div>
        <div
          onClick={() => set({ sheet: true })}
          className="flex h-9 w-9 cursor-pointer items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C87941" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>

      <div className="absolute inset-x-0" style={{ top: 122 }}>
        <div className="flex items-baseline justify-between px-5">
          <SectionLabel>Doses per hour</SectionLabel>
          <span className="text-[11px] text-t3">{`${stackCount} ${stackCount === 1 ? 'dose' : 'doses'} · ${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}`}</span>
        </div>

        <div className="mt-[22px] flex">
          <div className="relative h-[280px] w-[26px] flex-none">
            {Y_AXIS.map((v, i) => (
              <div
                key={v}
                className="absolute -translate-y-1/2 text-[10px] tabular-nums text-t3"
                style={{ right: 6, top: 16 + i * 66 }}
              >
                {v}
              </div>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: 280 }}>
              {Y_AXIS.map((v, i) => (
                <div
                  key={v}
                  className="absolute inset-x-0 h-px"
                  style={{ background: 'rgba(255,255,255,0.06)', top: 16 + i * 66 }}
                />
              ))}
            </div>
            <div ref={chartRef} className="overflow-x-auto overflow-y-hidden">
              <div className="flex items-end pr-5" style={{ width: 'max-content' }}>
                {hours.map((h) => (
                  <div key={h.h} className="w-[46px] flex-none">
                    <div className="flex h-[280px] flex-col items-center justify-end">
                      <div
                        className="h-4 text-[11px] font-semibold tabular-nums text-copper-light"
                        style={{ animation: 'fadeIn 0.4s ease-out both', animationDelay: h.delay }}
                      >
                        {h.c ? String(h.c) : ''}
                      </div>
                      <div
                        className="w-[26px] origin-bottom rounded-[13px]"
                        style={{
                          animation: 'riseIn 0.55s cubic-bezier(.16,.84,.44,1) both',
                          animationDelay: h.delay,
                          background: h.bg,
                          height: h.hh,
                        }}
                      />
                    </div>
                    <div
                      className="flex h-8 items-center justify-center text-[12px] tabular-nums"
                      style={{ color: h.labC }}
                    >
                      {h.lab}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The list sheet — drags between 66 / 310 / 620 */}
      <div
        className="glass-2 absolute inset-x-0 flex flex-col overflow-hidden"
        style={{
          bottom: 92,
          zIndex: 4,
          borderRadius: '28px 28px 0 0',
          height: sheetH,
          transition: sheetDragging ? 'none' : 'height 0.4s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div
          onPointerDown={sheetDown}
          className="flex-none select-none px-5 pb-1 pt-2.5"
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <div className="mx-auto mb-2.5 h-1 w-[38px] rounded-sm bg-white/[0.22]" />
          <div className="flex h-[34px] items-center gap-2.5">
            <span className="flex-1 text-[16px] font-semibold">All items</span>
            <span className="text-[12px] tabular-nums text-t3">{stackCount}</span>
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              className="transition-transform duration-300"
              style={{ transform: sheetH > 450 ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M1 1.5 6 6.5l5-5" stroke="rgba(255,255,255,0.62)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {emptyStack || stackSections.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-[20px] font-semibold tracking-[-0.3px]">Nothing in here yet</div>
              <div className="mt-2 text-[14px] leading-[1.45] text-t2">
                Scan one bottle and we’ll tell you what’s in it.
              </div>
              <div
                onClick={() => set({ sheet: true })}
                className="btn-primary mx-auto mt-5"
                style={{ width: 220, height: 52, fontSize: 15 }}
              >
                Scan a barcode
              </div>
            </div>
          ) : (
            stackSections.map((sec) => (
              <div key={sec.s} className="mt-3">
                <div className="label text-t3">{sec.s}</div>
                <div className="mt-0.5">
                  {sec.items.map((it) => (
                    <div
                      key={it.n}
                      onClick={() => { set({ openItem: it.id }); go('item'); }}
                      className="flex h-12 cursor-pointer items-center gap-2.5"
                    >
                      <div
                        className="h-2 w-2 flex-none rounded-full bg-copper"
                        style={{ opacity: it.on ? 1 : 0.5 }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] leading-[1.2]">{it.n}</div>
                        <div className="mt-0.5 truncate text-[11px] text-t3">{it.d}</div>
                      </div>
                      <div className="flex-none text-[12px] tabular-nums text-t2">{it.t}</div>
                      <Chevron />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
