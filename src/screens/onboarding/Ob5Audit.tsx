import { useSchedule } from '../../data/schedule';
import { useStore } from '../../state/store';
import { PrimaryButton } from '../../components/ui';

/**
 * 5 · THE AUDIT — the payoff. "You're taking 45mg of zinc a day and the ceiling
 * is 40." Everything before this was setup (PRODUCT.md §5).
 *
 * `ob5b` is the never-empty variant: if nothing is over a ceiling, show their
 * closest call instead. Never an empty state here.
 */
export function Ob5Audit() {
  const { state, go } = useStore();
  const { audit } = useSchedule();
  const overs = audit.filter((x) => x.over);
  const clear = state.screen === 'ob5b';

  const tiles = clear ? [] : overs.filter((x) => x.n !== 'Zinc');

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="relative box-border flex min-h-full flex-col px-5 pb-10" style={{ paddingTop: 104 }}>
        <div className="flex items-end gap-1.5">
          <span className="text-[72px] font-bold leading-[0.92] tracking-[-2.5px] tabular-nums">
            {clear ? '85' : '45'}
          </span>
          <span className="pb-[9px] text-[24px] font-semibold text-t2">{clear ? '%' : 'mg'}</span>
        </div>
        <div className="serif mt-[14px] text-[16px] text-t2">
          {clear ? 'selenium, daily, from 1 product' : 'zinc, daily, across 3 products'}
        </div>
        <div className="serif mt-1.5 text-[13px] text-t3">
          {clear ? 'of the 400 mcg ceiling — your closest call' : 'upper limit is 40'}
        </div>

        <div className="mt-10 flex flex-col gap-2.5">
          {tiles.map((n) => (
            <div
              key={n.n}
              className="relative flex items-center justify-between gap-3 overflow-hidden rounded-tile px-[18px] py-4"
              style={{ background: '#131316' }}
            >
              {/* critical (≥150% of the ceiling) gets the one non-copper accent */}
              <div className="absolute inset-y-0 left-0 bg-crit" style={{ width: n.crit ? 3 : 0 }} />
              <div>
                <div className="text-[16px] font-semibold">{n.n}</div>
                <div className="mt-1 text-[12px] text-t3">
                  {n.amt} {n.u} · ceiling {n.ul} {n.u}
                </div>
              </div>
              <div className="text-[24px] font-bold tracking-[-0.5px] tabular-nums text-copper-light">{n.pctT}</div>
            </div>
          ))}
        </div>

        <div className="serif mt-6 text-[16px] text-t2">
          {clear
            ? 'Nothing in your stack crosses a ceiling. We’ll keep watching as it changes.'
            : 'Everything else is in range.'}
        </div>
        <div className="min-h-7 flex-1" />
        {/* single most important credibility moment in the app */}
        <div className="serif mb-[18px] text-[13px] text-t3">
          Limits from the NIH Office of Dietary Supplements.
        </div>
        <PrimaryButton onClick={() => go('ob6')}>Fix my schedule</PrimaryButton>
      </div>
    </div>
  );
}
