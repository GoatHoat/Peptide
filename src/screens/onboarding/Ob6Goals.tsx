import { GOALS } from '../../data/mock';
import { useStore } from '../../state/store';
import { PrimaryButton } from '../../components/ui';
import { startDrag } from '../../lib/drag';

/**
 * 6 · What are you optimising for? Apple Action Button pattern — full-screen
 * horizontal pager, multi-select, tap the centre glyph to toggle
 * (DESIGN.md §8).
 */
export function Ob6Goals() {
  const { state, set, next } = useStore();
  const { goalIdx, goalSel, goalDX } = state;

  const goal = GOALS[goalIdx];
  const selCount = Object.keys(goalSel).filter((k) => goalSel[Number(k)]).length;

  const goalDown = (e: React.PointerEvent) => {
    const sx = e.clientX;
    const i0 = goalIdx;
    let dx = 0;
    startDrag(
      (ev) => {
        dx = ev.clientX - sx;
        set({ goalDX: dx });
      },
      () => {
        let i = i0;
        if (dx < -45) i = Math.min(GOALS.length - 1, i0 + 1);
        else if (dx > 45) i = Math.max(0, i0 - 1);
        else if (Math.abs(dx) < 6) set({ goalSel: { ...goalSel, [i0]: !goalSel[i0] } });
        set({ goalIdx: i, goalDX: 0 });
      },
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      <div
        className="pointer-events-none absolute left-1/2 rounded-full"
        style={{
          top: 120,
          width: 460,
          height: 400,
          marginLeft: -230,
          background: 'radial-gradient(circle,rgba(200,121,65,0.14),transparent 60%)',
        }}
      />
      <div className="absolute inset-0 box-border flex flex-col items-center px-5 pb-10 pt-24">
        <div style={{ height: '9%' }} />

        <div
          onPointerDown={goalDown}
          className="relative h-[180px] w-full select-none overflow-hidden"
          style={{ cursor: 'grab', touchAction: 'pan-y' }}
        >
          <div
            className="absolute left-1/2 top-6 flex items-center gap-2"
            style={{
              transition: 'transform 0.42s cubic-bezier(.2,.7,.3,1)',
              transform: `translateX(${-66 - goalIdx * 140 + goalDX * 0.8}px)`,
            }}
          >
            {GOALS.map((g, i) => {
              const on = i === goalIdx;
              return (
                <div
                  key={g.t}
                  className="flex h-[132px] w-[132px] flex-none items-center justify-center rounded-full"
                  style={{
                    transition: 'transform 0.42s cubic-bezier(.2,.7,.3,1), opacity 0.42s, border-color 0.3s',
                    transform: on ? 'scale(1)' : 'scale(0.55)',
                    opacity: on ? 1 : 0.5,
                    border: on && goalSel[i] ? '2.5px solid #C87941' : '2.5px solid transparent',
                  }}
                >
                  <svg
                    width="112"
                    height="112"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    stroke={on ? '#C87941' : 'rgba(255,255,255,0.8)'}
                  >
                    <path d={g.d} />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-1.5 flex gap-1.5">
          {GOALS.map((g, i) => (
            <div
              key={g.t}
              className="h-[5px] w-[5px] rounded-full transition-colors duration-300"
              style={{ background: i === goalIdx ? '#C87941' : 'rgba(255,255,255,0.18)' }}
            />
          ))}
        </div>

        <div
          className="display mt-7 text-center transition-colors duration-300"
          style={{ color: goalSel[goalIdx] ? '#C87941' : '#fff' }}
        >
          {goal.t}
        </div>
        <div className="pretty mt-[14px] max-w-[320px] px-5 text-center text-[17px] leading-[1.45] text-t2">
          {goal.s}
        </div>

        <div className="flex-1" />

        {/* How many to recommend. Understated on purpose — a small control that
            says more about the product than any line on the paywall. */}
        <div className="mb-5 w-full">
          <div className="text-[17px]" style={{ letterSpacing: '-0.43px' }}>
            How many should we recommend?
          </div>
          <div className="mt-2 flex items-center" style={{ gap: 22 }}>
            <span
              onClick={() => set({ recCount: Math.max(1, state.recCount - 1) })}
              className="-ml-3.5 flex h-11 w-11 cursor-pointer select-none items-center justify-center text-[22px] text-t2"
            >
              −
            </span>
            <span
              className="tabular-nums"
              style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-1.05px', lineHeight: 1 }}
            >
              {state.recCount}
            </span>
            <span
              onClick={() => set({ recCount: Math.min(3, state.recCount + 1) })}
              className="flex h-11 w-11 cursor-pointer select-none items-center justify-center text-[22px] text-t2"
            >
              +
            </span>
          </div>
          <div className="mt-1 text-[13px] text-t2">
            Most people do better with fewer. You can always add more later.
          </div>
        </div>
        <PrimaryButton className="w-full" onClick={next}>
          Continue ({selCount} selected)
        </PrimaryButton>
      </div>
    </div>
  );
}
