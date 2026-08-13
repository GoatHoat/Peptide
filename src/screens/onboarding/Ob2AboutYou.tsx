import { useStore } from '../../state/store';
import { Glass, PrimaryButton } from '../../components/ui';
import { startDrag } from '../../lib/drag';
import { clamp } from '../../lib/format';

const SEXES = ['Male', 'Female', 'Prefer not to say'];

/**
 * 2 · About you. The live zinc RDA/UL bar redraws as the dial turns — the
 * screen demonstrates why it's asking while it asks (PRODUCT.md §2).
 */
export function Ob2AboutYou() {
  const { state, set, next } = useStore();
  const { age, sex } = state;

  const conservative = sex === 'Prefer not to say';
  const female = sex === 'Female';
  const rda = conservative ? 8 : female ? 8 : 11;
  const ul = age < 19 ? 34 : 40;

  const ticks = [];
  for (let i = -10; i <= 10; i++) {
    const a = age + i;
    ticks.push({
      i,
      h: i === 0 ? 34 : a % 5 === 0 ? 22 : 13,
      c: i === 0 ? '#C87941' : a % 5 === 0 ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.15)',
      lab: a % 5 === 0 && i !== 0 && a >= 18 && a <= 90 ? String(a) : '',
    });
  }

  const ageDown = (e: React.PointerEvent) => {
    const sx = e.clientX;
    const sa = age;
    startDrag((ev) => {
      const a = clamp(sa + Math.round((sx - ev.clientX) / 18), 18, 90);
      set({ age: a });
    });
  };

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div className="display">About you</div>
        <div className="serif mt-3 max-w-[320px] text-[16px] leading-[1.45] text-t2">
          Upper limits change with age and sex. We need this to do the math.
        </div>

        <div style={{ flex: 0.6 }} />

        <div className="flex items-end justify-center gap-2">
          <span className="text-[72px] font-light leading-[0.9] tracking-[-2px] tabular-nums">{age}</span>
          <span className="pb-2 text-[24px] text-t2">yrs</span>
        </div>

        <div
          onPointerDown={ageDown}
          className="relative mt-[14px] h-16 cursor-ew-resize overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-x-0 top-[10px] flex items-start justify-center">
            {ticks.map((tk) => (
              <div key={tk.i} className="flex w-[18px] flex-none flex-col items-center gap-1.5">
                <div style={{ width: 1.5, borderRadius: 1, height: tk.h, background: tk.c }} />
                <div className="text-[11px] tabular-nums text-t3">{tk.lab}</div>
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-1 -ml-px h-[34px] w-0.5 rounded-sm bg-copper" />
        </div>

        <div className="mt-0.5 flex justify-center gap-2">
          <div
            onClick={() => set({ age: Math.max(18, age - 1) })}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-chip bg-s1 text-[20px] text-t2"
          >
            −
          </div>
          <div
            onClick={() => set({ age: Math.min(90, age + 1) })}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-chip bg-s1 text-[20px] text-t2"
          >
            +
          </div>
        </div>

        <div className="mt-7 flex gap-2">
          {SEXES.map((x) => {
            const on = sex === x;
            return (
              <div
                key={x}
                onClick={() => set({ sex: x })}
                className="box-border flex h-11 flex-1 cursor-pointer items-center justify-center rounded-chip px-1.5 text-center text-[13px] leading-[1.2]"
                style={{
                  background: on ? 'rgba(200,121,65,0.10)' : '#131316',
                  border: on ? '1.5px solid #C87941' : 'none',
                  color: on ? '#fff' : 'rgba(255,255,255,0.62)',
                }}
              >
                {x}
              </div>
            );
          })}
        </div>

        <Glass level="flat" className="mt-7 p-5">
          <div className="section-label">Zinc, for you</div>
          <div className="relative mt-[18px] h-2 rounded-[4px] bg-s2">
            <div
              className="absolute inset-y-0 left-0 rounded-[4px]"
              style={{
                background: 'linear-gradient(90deg,#8A4E24,#C87941)',
                transition: 'width 0.35s cubic-bezier(.2,.7,.3,1)',
                width: (rda / 50) * 100 + '%',
              }}
            />
            <div
              className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded-sm bg-copper-light"
              style={{ transition: 'left 0.35s cubic-bezier(.2,.7,.3,1)', left: (ul / 50) * 100 + '%' }}
            />
          </div>
          <div className="mt-3 flex justify-between">
            <div>
              <div className="text-[32px] font-medium leading-none tracking-[-0.8px] tabular-nums">{rda}</div>
              <div className="mt-1 text-[12px] tracking-[0.2px] text-t3">mg RDA</div>
            </div>
            <div className="text-right">
              <div className="text-[32px] font-medium leading-none tracking-[-0.8px] tabular-nums">{ul}</div>
              <div className="mt-1 text-[12px] tracking-[0.2px] text-t3">mg upper limit</div>
            </div>
          </div>
          {conservative && (
            <div className="serif mt-[14px] text-[13px] leading-[1.45] text-t3">
              Using the more conservative limit of the two.
            </div>
          )}
        </Glass>

        <div className="min-h-8 flex-1" />
        <PrimaryButton onClick={next}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
