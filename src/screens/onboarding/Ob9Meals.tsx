import { useStore, type AppState } from '../../state/store';
import { PrimaryButton } from '../../components/ui';
import { clamp, fmt } from '../../lib/format';
import { startDrag } from '../../lib/drag';

type MealKey = 'breakfast' | 'lunch' | 'dinner';

const MIN = 5;
const MAX = 23;

/**
 * 9 · Your day, part two — meals. Fasting collapses breakfast. Split from
 * sleep deliberately: four inputs on one screen felt like a form.
 */
export function Ob9Meals() {
  const { state, set, next, toggle } = useStore();
  const { fasting } = state;

  const strips: { key: MealKey; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
  ];

  const visible = strips.filter((r) => !(fasting && r.key === 'breakfast'));

  const stripDown = (key: MealKey) => (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const at = (cx: number) =>
      clamp(MIN + Math.round(((cx - r.left) / r.width) * (MAX - MIN) * 2) / 2, MIN, MAX);
    const a0 = at(e.clientX);
    set({ [key]: [a0, Math.min(MAX, a0 + 1)] } as Partial<AppState>);
    startDrag((ev) => {
      const b = at(ev.clientX);
      set({ [key]: [Math.min(a0, b), Math.max(a0 + 0.5, b)] } as Partial<AppState>);
    });
  };

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div className="display">Your day, part two</div>
        <div className="serif mt-2.5 text-[16px] leading-[1.45] text-t2">
          {fasting
            ? 'Breakfast is off. Anything fat-soluble moves to lunch.'
            : 'Fat-soluble items sit with your first meal.'}
        </div>

        <div
          onClick={() => toggle('fasting')}
          className="surface mt-7 flex h-14 cursor-pointer items-center justify-between px-[18px]"
          style={{ borderRadius: 22 }}
        >
          <span className="text-[17px]">Fasting window</span>
          <span
            className="relative h-8 w-[52px] rounded-full transition-colors duration-[250ms]"
            style={{ background: fasting ? '#C87941' : '#38383A' }}
          >
            <span
              className="absolute top-0.5 h-7 w-7 rounded-full bg-white"
              style={{ transition: 'left 0.25s cubic-bezier(.2,.7,.3,1)', left: fasting ? 22 : 2 }}
            />
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {visible.map((r) => {
            const v = state[r.key];
            const steps = (MAX - MIN) * 2;
            const blocks = [];
            for (let i = 0; i < steps; i++) {
              const h = MIN + i / 2;
              const on = h >= v[0] - 0.001 && h < v[1] - 0.001;
              blocks.push({ i, on });
            }
            const labs = [];
            for (let h = 6; h <= 22; h += 4) {
              labs.push({ h, lab: fmt(h, true), x: ((h - MIN) / (MAX - MIN)) * 100 + '%' });
            }
            return (
              <div key={r.key} className="rounded-card p-[18px]" style={{ background: '#131316' }}>
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="label text-t2">{r.label}</span>
                  <span className="flex-none whitespace-nowrap text-[17px] font-semibold tabular-nums">
                    {fmt(v[0])} – {fmt(v[1])}
                  </span>
                </div>
                <div
                  onPointerDown={stripDown(r.key)}
                  className="mt-4 flex h-[34px] select-none items-end gap-0.5 cursor-ew-resize"
                  style={{ touchAction: 'none' }}
                >
                  {blocks.map((b) => (
                    <div
                      key={b.i}
                      className="flex-1 rounded-sm"
                      style={{
                        transition: 'height 0.18s, background 0.18s',
                        background: b.on ? 'linear-gradient(180deg,#E8A87C,#8A4E24)' : '#1E1E22',
                        height: b.on ? 30 : 12,
                      }}
                    />
                  ))}
                </div>
                <div className="relative mt-1.5 h-4">
                  {labs.map((l) => (
                    <div
                      key={l.h}
                      className="absolute -translate-x-1/2 text-[11px] text-t3"
                      style={{ left: l.x }}
                    >
                      {l.lab}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-h-7 flex-1" />
        <PrimaryButton onClick={next}>Build my schedule</PrimaryButton>
      </div>
    </div>
  );
}
