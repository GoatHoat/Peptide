import { FEATURES, PLANS } from '../../data/mock';
import { useStore } from '../../state/store';
import { PrimaryButton } from '../../components/ui';

/**
 * 12 · Paywall. After value, never before. The audit stays free — it is the
 * marketing (PRODUCT.md §5).
 */
export function Ob12Paywall() {
  const { state, set, go } = useStore();
  const close = () => go('today');

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div
          onClick={close}
          className="flex h-11 w-11 cursor-pointer items-center justify-center"
          style={{ margin: '-8px 0 8px -12px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </div>

        <div className="display">
          The audit stays free.
          <br />
          The rest is Full Panel.
        </div>

        <div className="mt-[26px] flex flex-col gap-2.5">
          {PLANS.map((p) => {
            const on = state.plan === p.id;
            return (
              <div
                key={p.id}
                onClick={() => set({ plan: p.id })}
                className="relative flex cursor-pointer items-center gap-[14px] overflow-hidden rounded-card p-[18px]"
                style={{
                  transition: 'border-color 0.25s, background 0.25s',
                  background: on ? 'rgba(200,121,65,0.10)' : '#131316',
                  border: on ? '1.5px solid #C87941' : 'none',
                }}
              >
                <div
                  className="box-border h-[22px] w-[22px] flex-none rounded-full"
                  style={{
                    border: `1.5px solid ${on ? '#C87941' : 'rgba(255,255,255,0.22)'}`,
                    background: on ? 'linear-gradient(135deg,#E8A87C,#8A4E24)' : 'transparent',
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[17px] font-semibold">{p.n}</span>
                    {p.tag && (
                      <span className="label text-t3">{p.tag}</span>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-t3">{p.sub}</div>
                </div>
                <div className="font-display text-[25px] font-normal tracking-[0.9px] tabular-nums">{p.p}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-[30px] flex items-baseline justify-between pb-2.5">
          <span className="section-label">What you get</span>
          <span className="flex">
            <span className="label w-16 text-center text-t3">Free</span>
            <span className="label w-[74px] text-center font-semibold text-white">Full panel</span>
          </span>
        </div>
        <div className="flex flex-col">
          {FEATURES.map((f) => (
            <div key={f.f} className="flex items-center justify-between py-[11px]">
              <span className="text-[15px] text-white/[0.86]">{f.f}</span>
              <span className="flex flex-none">
                <span
                  className="w-16 text-center text-[13px]"
                  style={{ color: f.a === false ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.62)' }}
                >
                  {f.a === true ? '·' : f.a === false ? '—' : f.a}
                </span>
                <span className="w-[74px] text-center text-[13px] text-white">{f.b === true ? '·' : f.b}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="min-h-7 flex-1" />
        <PrimaryButton className="mt-5" onClick={close}>
          Start 7-day trial
        </PrimaryButton>
        <div className="serif mt-[14px] text-center text-[13px] leading-[1.5] text-t3">
          Cancel any time. Nothing you’ve already scanned gets locked.
        </div>
      </div>
    </div>
  );
}
