import { ADHERENCE_BARS, COST, DISCLAIMER } from '../data/mock';
import { useSchedule } from '../data/schedule';
import { useStore } from '../state/store';
import { Glass, SectionLabel } from '../components/ui';

/** TAB 4 — ANALYSIS. The differentiator. The only dense screen in the app. */
export function Analysis() {
  const { state, set, go } = useStore();
  const { adh, costLocked } = state;
  const { audit, findings } = useSchedule();
  // the dot chart only plots nutrients that actually have a ceiling
  const plotted = audit.filter((n) => n.ul !== null);

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border" style={{ padding: '70px 20px 120px' }}>
        <div className="flex h-11 items-center justify-center">
          <div className="text-[17px] font-semibold tracking-[-0.43px] text-t2">Analysis</div>
        </div>

        {/* Nutrient totals — the audit, permanently available */}
        <div className="mt-7">
          <SectionLabel>Nutrient totals</SectionLabel>
          <Glass radius={18} className="mt-4 p-5">
            <div className="relative" style={{ padding: '0 46px 0 92px' }}>
              <div className="pointer-events-none absolute" style={{ left: 92, right: 46, top: 0, bottom: 22 }}>
                <div
                  className="absolute inset-y-0"
                  style={{ left: '62.5%', width: 0, borderLeft: '1px dashed rgba(242,233,225,0.45)' }}
                />
              </div>
              {plotted.map((n) => {
                const x = Math.min(94, (Math.min(n.p, 1.6) / 1.6) * 100);
                const trackW = Math.min(62.5, (Math.min(n.p, 1.6) / 1.6) * 100);
                return (
                  <div key={n.n} className="relative flex h-[30px] items-center">
                    <span
                      className="absolute w-[84px] truncate text-[12px] text-white/[0.86]"
                      style={{ left: -92 }}
                    >
                      {n.n}
                    </span>
                    <div className="absolute inset-x-0 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div
                      className="absolute left-0 h-0.5 rounded-sm transition-[width] duration-500"
                      style={{
                        background: n.over ? 'rgba(242,233,225,0.45)' : 'rgba(200,121,65,0.35)',
                        width: trackW + '%',
                      }}
                    />
                    <div
                      className="absolute -translate-x-1/2 rounded-full transition-[left] duration-500"
                      style={{
                        left: x + '%',
                        width: n.over ? 14 : 10,
                        height: n.over ? 14 : 10,
                        background: n.over ? '#F2E9E1' : '#C87941',
                        boxShadow: n.crit
                          ? '0 0 0 4px rgba(255,69,58,0.35)'
                          : n.over
                            ? '0 0 0 4px rgba(242,233,225,0.14)'
                            : 'none',
                      }}
                    />
                    <span
                      className="absolute w-10 text-right text-[11px] tabular-nums"
                      style={{ right: -44, color: n.over ? '#F2E9E1' : 'rgba(255,255,255,0.62)' }}
                    >
                      {n.pctT}
                    </span>
                  </div>
                );
              })}
              <div className="relative h-[22px]">
                <span
                  className="label absolute -translate-x-1/2"
                  style={{ left: '62.5%', top: 6, color: 'rgba(242,233,225,0.6)' }}
                >
                  Ceiling
                </span>
              </div>
            </div>
          </Glass>
        </div>

        {/* Findings — what the audit actually turned up */}
        <div className="mt-10">
          <SectionLabel>Findings</SectionLabel>
          <div className="mt-4 flex flex-col gap-3">
            {findings.map((f) => (
              <Glass key={f.id} className="p-5">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="text-[17px] font-medium">{f.title}</span>
                  <span
                    className="label"
                    style={{ color: f.kind === 'over' ? '#F2E9E1' : 'rgba(255,255,255,0.38)' }}
                  >
                    {f.kind === 'over' ? 'Over the ceiling' : f.kind === 'note' ? 'Worth knowing' : 'In range'}
                  </span>
                </div>
                <div className="mt-2.5 text-[14px] leading-[1.5] text-t2">{f.body}</div>
                {f.action && (
                  <div
                    className="mt-3 inline-flex h-11 cursor-pointer items-center rounded-full px-[18px] text-[15px] font-medium"
                    style={{ border: '1.5px solid #B8784F', color: '#E3B08D' }}
                  >
                    {f.action}
                  </div>
                )}
              </Glass>
            ))}
          </div>
        </div>

        {/* Adherence */}
        <div className="mt-10">
          <SectionLabel>Adherence</SectionLabel>
          <Glass className="mt-4 p-5">
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-medium tracking-[-0.8px] tabular-nums">
                {adh === 30 ? '87%' : '81%'}
              </div>
              <div className="flex gap-4">
                <span
                  onClick={() => set({ adh: 30 })}
                  className="label cursor-pointer"
                  style={{ color: adh === 30 ? '#fff' : 'rgba(255,255,255,0.38)' }}
                >
                  30D
                </span>
                <span
                  onClick={() => set({ adh: 90 })}
                  className="label cursor-pointer"
                  style={{ color: adh === 90 ? '#fff' : 'rgba(255,255,255,0.38)' }}
                >
                  90D
                </span>
              </div>
            </div>
            <div className="mt-5 flex h-14 items-end gap-[5px]">
              {ADHERENCE_BARS.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ background: 'linear-gradient(180deg,#C87941,#8A4E24)', height: v + '%' }}
                />
              ))}
            </div>
          </Glass>
        </div>

        {/* Cost — locked, with real content blurred behind it (PRODUCT.md §5) */}
        <div className="mt-10">
          <SectionLabel>Cost</SectionLabel>
          <Glass className="mt-4 p-5">
            <div style={{ transition: 'filter 0.3s', filter: costLocked ? 'blur(7px)' : 'none' }}>
              <div className="text-[32px] font-medium tracking-[-0.8px] tabular-nums">{COST.monthly}</div>
              <div className="mt-1.5 text-[12px] text-t3">{COST.sub}</div>
              {COST.rows.map((r, i) => (
                <div key={r.n} className="flex justify-between" style={{ marginTop: i === 0 ? 18 : 10 }}>
                  <span className="text-[15px] text-t2">{r.n}</span>
                  <span className="text-[15px] tabular-nums text-t2">{r.v}</span>
                </div>
              ))}
            </div>
            {costLocked && (
              <div
                onClick={() => go('ob12')}
                className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-[14px]"
              >
                <div className="text-[15px] font-medium text-t2">Cost tracking is Full Panel</div>
                <div
                  className="flex h-11 items-center rounded-full px-5 text-[15px] font-medium text-copper"
                  style={{ border: '1.5px solid #C87941' }}
                >
                  See what’s included
                </div>
              </div>
            )}
          </Glass>
        </div>
        <div className="mt-10 text-[12px] leading-[1.5] text-t3">{DISCLAIMER}</div>
      </div>
    </div>
  );
}
