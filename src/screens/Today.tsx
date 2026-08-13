import { useState } from 'react';
import { NOW_HOUR, useSchedule, type Finding } from '../data/schedule';
import { useStore } from '../state/store';
import { Glass } from '../components/ui';
import { HorizonArc } from '../components/HorizonArc';
import { usePrefersReducedMotion } from '../lib/useReducedMotion';
import { startDrag } from '../lib/drag';
import { clamp } from '../lib/format';

/**
 * TAB 1 — TODAY.
 *
 * Two layers. The arc and the tab bar are pinned and never move; the title,
 * timeline and cards scroll *behind* them. That overlap is the whole reason
 * backdrop-filter is on this screen at all.
 */
export function Today() {
  const { state, set, logDose } = useStore();
  const { taken, ring, swipe, alerts, wakeT, bedT, reduceMotion } = state;
  const { blocks, totalDoses, takenCount, next: nextBlock, findings } = useSchedule();
  const zincFinding = findings.find((f) => f.id === 'zinc');
  const [pressed, setPressed] = useState<string | null>(null);
  const prefersReduced = usePrefersReducedMotion();
  const reduced = reduceMotion || prefersReduced;

  const rowDown = (id: string, blockId: string) => (e: React.PointerEvent) => {
    const sx = e.clientX;
    const sy = e.clientY;
    let mode: 'x' | null = null;
    let dx = 0;
    let cancelled = false;
    setPressed(blockId); // anticipation: the caps at this dose's gap scale up
    startDrag(
      (ev) => {
        if (cancelled) return;
        dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        if (!mode) {
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) mode = 'x';
          else if (Math.abs(dy) > 6) {
            cancelled = true;
            setPressed(null);
            return;
          } else return;
        }
        set({ swipe: { id, dx: clamp(dx, -124, 0) } });
      },
      () => {
        setPressed(null);
        if (cancelled || !mode) return;
        set({ swipe: dx < -70 ? { id, dx: -124 } : null });
      },
    );
  };

  return (
    <div className="absolute inset-0" style={{ zIndex: 1 }}>
      {/* ── scrolling layer ─────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
        {/* 320pt of tail so the last card clears the arc completely */}
        <div className="box-border" style={{ padding: '70px 0 320px' }}>
          <div className="flex h-10 items-center justify-between px-5">
            <div className="flex items-center gap-1.5">
              <span className="font-display whitespace-nowrap text-[19px] font-normal tracking-[-0.4px]">
                Today, 9 Aug
              </span>
              <svg width="11" height="7" viewBox="0 0 12 8" fill="none">
                <path
                  d="M1 1.5 6 6.5l5-5"
                  stroke="rgba(255,255,255,0.62)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-s1 text-[12px] font-semibold text-t2">
              M
            </div>
          </div>

          <div className="mt-4 px-5">
            <Glass radius={18} className="flex items-end justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="label text-t3">{nextBlock ? 'Next dose' : 'Nothing scheduled'}</div>
                <div className="body mt-1 truncate">
                  {nextBlock ? `${nextBlock.items[0].n} · ${nextBlock.items[0].d}` : 'Pick something on Recommendations'}
                </div>
              </div>
              <div className="flex-none whitespace-nowrap text-[17px] font-semibold tracking-[-0.43px] tabular-nums">
                {nextBlock?.time ?? '—'}
              </div>
            </Glass>
          </div>

          {alerts && zincFinding && <OverLimitTile finding={zincFinding} />}

          {/* Timeline — no card, no container. It sits directly on the screen
              at the 20pt margin and reads through type alone. */}
          <div className="mt-10 flex flex-col gap-8 px-5">
            {blocks.map((b) => (
              <div key={b.id}>
                {!b.past && b.hour >= NOW_HOUR && blocks.indexOf(b) === blocks.findIndex((x) => !x.past) && (
                  <div className="mb-5 flex items-center gap-2.5">
                    <div className="h-[5px] w-[5px] rounded-full" style={{ background: '#B8784F' }} />
                    <div className="h-px flex-1" style={{ background: '#38383A' }} />
                    <div className="label text-t2">Now · 3:41 PM</div>
                  </div>
                )}
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[22px] font-semibold tracking-[-0.6px]">{b.label}</span>
                  <span className="text-[15px] text-t2 tabular-nums">{b.time}</span>
                </div>
                <div className="mt-3.5 flex flex-col gap-3.5">
                  {b.items.map((it) => {
                    const on = !!taken[it.id];
                    const sw = swipe && swipe.id === it.id ? swipe.dx : 0;
                    return (
                      <div key={it.id} className="relative overflow-hidden">
                        {sw < -4 && (
                          <div className="absolute inset-y-0 right-0 flex w-[120px] flex-col items-end justify-center gap-[3px]">
                            <span className="text-[11px] text-t2">Ran out</span>
                            <span className="text-[11px] text-t2">Skipped on purpose</span>
                          </div>
                        )}
                        <div
                          onPointerDown={rowDown(it.id, b.id)}
                          className="relative flex items-center gap-3"
                          style={{
                            transition: 'transform 0.25s cubic-bezier(.2,.7,.3,1)',
                            touchAction: 'pan-y',
                            transform: `translateX(${sw}px)`,
                          }}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              logDose(it.id);
                            }}
                            className="-ml-[13px] flex h-11 w-11 flex-none cursor-pointer items-center justify-center"
                          >
                            <div
                              className="box-border h-[18px] w-[18px] rounded-full"
                              style={{
                                borderStyle: 'solid',
                                borderWidth: 1.5,
                                transition:
                                  'background 0.5s cubic-bezier(.2,.7,.3,1), border-color 0.35s, box-shadow 0.4s',
                                background: on ? 'linear-gradient(135deg,#E3B08D,#B8784F 55%,#6E3D25)' : 'transparent',
                                borderColor: on ? '#B8784F' : 'rgba(255,255,255,0.22)',
                                boxShadow:
                                  ring === it.id ? '0 0 0 6px rgba(184,120,79,0.18)' : '0 0 0 0 rgba(184,120,79,0)',
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-[17px] transition-colors duration-300"
                              style={{ color: on ? 'rgba(255,255,255,0.38)' : '#fff' }}
                            >
                              {it.n}
                            </div>
                            <div
                              className="mt-0.5 text-[13px]"
                              style={{ color: on ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.62)' }}
                            >
                              {it.d}
                            </div>
                          </div>
                        </div>
                        {it.why && (
                          <div
                            className="mt-2 pl-3 text-[13px] leading-[1.35] text-t3"
                            style={{ marginLeft: 31, borderLeft: '1px solid #38383A' }}
                          >
                            {it.why}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── fixed layer: the arc never scrolls ──────────────────── */}
      <HorizonArc
        blocks={blocks}
        totalDoses={totalDoses}
        takenCount={takenCount}
        taken={taken}
        wake={wakeT}
        bed={bedT}
        overCeiling={alerts}
        pressed={pressed}
        reducedMotion={reduced}
      />
    </div>
  );
}

/**
 * Over the ceiling — full tile inversion (DESIGN.md §2), critical bar in the
 * one permitted non-copper accent.
 */
function OverLimitTile({ finding }: { finding: Finding }) {
  return (
    <div className="mt-10 px-5">
      <div className="relative overflow-hidden rounded-tile p-[14px]" style={{ background: '#F2E9E1' }}>
        <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: '#FF453A' }} />
        <div className="flex items-center gap-3">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6E3D25"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-none"
          >
            <path d="M12 3.6 1.8 20.4h20.4L12 3.6Z" />
            <path d="M12 9.6v4.6" />
            <path d="M12 17.2h.01" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="label" style={{ color: 'rgba(10,10,10,0.62)' }}>
              Over the ceiling
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[20px] font-semibold tracking-[-0.3px] tabular-nums" style={{ color: '#0A0A0A' }}>
                {finding.title}
              </span>
              <span className="text-[12px]" style={{ color: 'rgba(10,10,10,0.62)' }}>
                of 40 mg
              </span>
            </div>
          </div>
          <div className="flex-none text-right">
            <div className="text-[22px] font-bold leading-none tabular-nums" style={{ color: '#0A0A0A' }}>
              113%
            </div>
            <div className="mt-[3px] text-[10px]" style={{ color: 'rgba(10,10,10,0.62)' }}>
              2 products
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
