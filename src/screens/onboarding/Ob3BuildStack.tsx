import { BARCODE_WIDTHS, BUILD } from '../../data/mock';
import { useStore } from '../../state/store';
import { Glass, Tertiary } from '../../components/ui';

/**
 * 3 · Build your stack. Four states: entry · scanning · populated · failure.
 * Barcode scanning is free forever (PRODUCT.md §3).
 */
export function Ob3BuildStack() {
  const { state, set, go, next, scan } = useStore();
  const { builder, added, toast } = state;

  const addManual = () =>
    set({ builder: 'list', added: Math.min(BUILD.length, added + 1), scanFail: false });

  const nextItem = BUILD[Math.min(added, BUILD.length - 1)];
  const addedItems = BUILD.slice(0, added);

  const doneLabel = added > 0 ? `Done — ${added} items` : 'Add your first item';

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div className="flex items-baseline justify-between gap-3">
          <div className="display">Build your stack</div>
          {added > 0 && (
            <div className="display tabular-nums text-copper">
              {added}
            </div>
          )}
        </div>
        <div className="serif mt-2.5 text-[16px] leading-[1.45] text-t2">
          Scanning is free forever. Every product, every ingredient.
        </div>

        {builder === 'entry' && (
          <div className="mt-8 flex flex-col gap-3">
            <div
              onClick={scan}
              className="relative box-border flex h-[150px] cursor-pointer flex-col justify-between overflow-hidden rounded-card bg-s1 p-5"
              style={{ border: '1.5px solid #C87941' }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#C87941" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <path d="M6 8v8M9 8v8M12 8v8M15.5 8v8M18 8v8" />
              </svg>
              <div>
                <div className="font-display text-[25px] font-normal tracking-[0.9px]">Scan a barcode</div>
                <div className="mt-[5px] text-[12px] tracking-[0.2px] text-t3">Fastest — full label in one shot</div>
              </div>
            </div>

            <div className="flex gap-3">
              <EntryCard onClick={scan}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
                  <circle cx="12" cy="13" r="3.6" />
                </svg>
                <div className="text-[17px] font-medium leading-[1.2]">
                  Photograph
                  <br />
                  the label
                </div>
              </EntryCard>
              <EntryCard onClick={scan}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16.5 16.5 21 21" />
                </svg>
                <div className="text-[17px] font-medium leading-[1.2]">
                  Search
                  <br />
                  by name
                </div>
              </EntryCard>
            </div>
          </div>
        )}

        {builder === 'scanning' && (
          <div
            className="relative mt-7 h-[300px] overflow-hidden rounded-card"
            style={{ background: 'linear-gradient(160deg,#131316,#000000)' }}
          >
            <div className="absolute left-1/2 top-1/2" style={{ width: 210, height: 210, margin: '-105px 0 0 -105px' }}>
              <Corner style={{ left: 0, top: 0, borderLeft: '2.5px solid #C87941', borderTop: '2.5px solid #C87941', borderTopLeftRadius: 10 }} />
              <Corner style={{ right: 0, top: 0, borderRight: '2.5px solid #C87941', borderTop: '2.5px solid #C87941', borderTopRightRadius: 10 }} />
              <Corner style={{ left: 0, bottom: 0, borderLeft: '2.5px solid #C87941', borderBottom: '2.5px solid #C87941', borderBottomLeftRadius: 10 }} />
              <Corner style={{ right: 0, bottom: 0, borderRight: '2.5px solid #C87941', borderBottom: '2.5px solid #C87941', borderBottomRightRadius: 10 }} />
              <div
                className="absolute top-1/2"
                style={{ left: 14, right: 14, height: 1.5, background: 'linear-gradient(90deg,transparent,#E8A87C,transparent)' }}
              />
              <div className="absolute flex items-stretch gap-[5px] opacity-50" style={{ left: 38, right: 38, top: 74, bottom: 74 }}>
                {BARCODE_WIDTHS.map((w, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 1, width: w }} />
                ))}
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-[18px] text-center text-[12px] tracking-[0.2px] text-t3">
              Hold steady — reading the label
            </div>
            {/* transform + glass on one element — a transformed ancestor would
                form a backdrop root and leave this blurring nothing */}
            <div
              className="glass-2 absolute right-0 top-6 flex items-center gap-3"
              style={{
                transition: 'transform 0.42s cubic-bezier(.2,.7,.3,1), opacity 0.42s',
                transform: `translateX(${toast ? '0px' : '110%'})`,
                opacity: toast ? 1 : 0,
                borderRadius: '18px 0 0 18px',
                padding: '12px 18px 12px 14px',
              }}
            >
              <div className="contents">
                <div
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
                  style={{ background: 'linear-gradient(135deg,#E8A87C,#8A4E24)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                </div>
                <div>
                  <div className="whitespace-nowrap text-[15px] font-semibold">{nextItem.n}</div>
                  <div className="mt-0.5 text-[12px] text-t3">{nextItem.d}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {builder === 'fail' && (
          <Glass level="flat" className="mt-7 p-6">
            <div className="font-display text-[25px] font-normal tracking-[0.9px]">Couldn’t read that one</div>
            <div className="serif mt-2.5 text-[16px] leading-[1.455] text-t2">
              Some labels aren’t in the database yet. Type it in and we’ll match the ingredients ourselves.
            </div>
            <div className="mt-[22px] flex flex-col gap-2.5">
              <div className="btn-secondary" onClick={addManual}>
                Enter manually
              </div>
              <div onClick={scan} className="cursor-pointer p-3 text-center text-[16px] font-medium text-copper">
                Try scanning again
              </div>
            </div>
          </Glass>
        )}

        {builder === 'list' && (
          <>
            <div className="mt-[26px] flex gap-2.5">
              <div
                onClick={scan}
                className="flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-s1 text-[15px] font-medium"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C87941" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add another
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {addedItems.map((it) => (
                <div key={it.n} className="flex h-[68px] items-center gap-[14px] px-1">
                  <div className="h-2.5 w-2.5 flex-none rounded-full bg-copper opacity-50" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] leading-[1.25]">{it.n}</div>
                    <div className="mt-[3px] text-[12px] tracking-[0.2px] text-t3">{it.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="min-h-7 flex-1" />
        <div
          onClick={next}
          className="flex h-14 cursor-pointer items-center justify-center rounded-full text-[16px] font-semibold uppercase tracking-[1.4px]"
          style={{
            color: added > 0 ? '#0A0A0A' : 'rgba(255,255,255,0.38)',
            background: added > 0 ? 'linear-gradient(135deg,#E8A87C,#C87941 55%,#8A4E24)' : '#131316',
          }}
        >
          {doneLabel}
        </div>
        {added === 0 && <Tertiary onClick={() => go('ob6')}>I’m not taking anything yet</Tertiary>}
      </div>
    </div>
  );
}

function EntryCard({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative box-border flex h-[118px] flex-1 cursor-pointer flex-col justify-between overflow-hidden rounded-card bg-s1 p-[18px]"
    >
      {children}
    </div>
  );
}

function Corner({ style }: { style: React.CSSProperties }) {
  return <div className="absolute" style={{ width: 46, height: 46, ...style }} />;
}
