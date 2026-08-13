import { DISCLAIMER, REFERENCE } from '../data/mock';
import { useSchedule } from '../data/schedule';
import { useStore } from '../state/store';
import { Glass, SectionLabel } from '../components/ui';

/** Item detail — reachable for each selected item, never a fixed product. */
export function ItemDetail() {
  const { state, go } = useStore();
  const { selected } = useSchedule();
  const item = selected.find((i) => i.id === state.openItem) ?? selected[0];

  if (!item) {
    return (
      <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
        <div className="box-border" style={{ padding: '70px 20px 120px' }}>
          <div className="display mt-10">Nothing selected</div>
          <div className="body mt-3 text-t2">
            Pick something on Recommendations and it will show up here.
          </div>
        </div>
      </div>
    );
  }

  const name = item.n.replace(/&nbsp;/g, ' ');

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border" style={{ padding: '70px 20px 120px' }}>
        <div className="flex h-11 items-center justify-between">
          <div
            onClick={() => go('stack')}
            className="-ml-[14px] flex h-11 w-11 cursor-pointer items-center justify-center"
          >
            <svg width="11" height="18" viewBox="0 0 12 20" fill="none">
              <path d="M10 2 2 10l8 8" stroke="#C87941" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-[17px] font-semibold tracking-[-0.43px] text-t2">Item</div>
          <div className="w-11" />
        </div>

        <div className="mt-5">
          <div className="display">{name}</div>
          <div className="mt-2.5 text-[15px] font-medium text-t2">
            {item.d} · {item.time}
          </div>
        </div>

        {/* Evidence grade as a sentence, never a coloured badge. */}
        <div className="mt-10">
          <SectionLabel>Evidence</SectionLabel>
          <div className="mt-3 text-[17px]">{item.evidence}</div>
          <div className="serif mt-3 text-[15px] leading-[1.5] text-t2">{item.evidenceCopy}</div>
        </div>

        {item.nutrients.length > 0 && (
          <div className="mt-10">
            <SectionLabel>Per serving</SectionLabel>
            <div className="mt-4 flex flex-col gap-5">
              {item.nutrients.map((nut) => {
                const ref = REFERENCE[nut.n];
                const pctUl = ref?.ul ? Math.round((nut.amt / ref.ul) * 100) : null;
                const pctRda = ref?.rda ? Math.round((nut.amt / ref.rda) * 100) : null;
                return (
                  <div key={nut.n}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[15px] font-medium">{nut.n}</span>
                      <span className="flex-none whitespace-nowrap text-[15px] font-medium tabular-nums text-t2">
                        {nut.amt.toLocaleString('en-US')} {nut.u}
                      </span>
                    </div>
                    <div className="relative mt-2.5 h-1.5 rounded-[3px] bg-s2">
                      <div
                        className="absolute inset-y-0 left-0 rounded-[3px]"
                        style={{
                          background: 'linear-gradient(90deg,#6E3D25,#B8784F)',
                          width: Math.min(100, pctUl ?? 0) + '%',
                        }}
                      />
                    </div>
                    <div className="mt-[7px] flex justify-between">
                      <span className="text-[12px] text-t3">
                        {pctRda !== null ? `${pctRda}% of ${ref?.aiOnly ? 'AI' : 'RDA'}` : '—'}
                      </span>
                      <span className="text-[12px] text-t3">
                        {pctUl !== null ? `${pctUl}% of ceiling` : 'no upper limit set'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {item.labelNote && (
          <div className="mt-10">
            <SectionLabel>What the label doesn’t say</SectionLabel>
            <Glass className="mt-4 p-5">
              <div className="serif text-[17px] leading-[1.5]">{item.labelNote}</div>
            </Glass>
          </div>
        )}

        <div className="mt-10">
          <SectionLabel>When to take it</SectionLabel>
          <Glass className="mt-4 p-5">
            <div className="serif text-[17px] leading-[1.5]">{item.timing}</div>
          </Glass>
        </div>

        <div className="mt-10 text-[12px] leading-[1.5] text-t3">{DISCLAIMER}</div>
      </div>
    </div>
  );
}
