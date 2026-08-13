import { useEffect, useRef } from 'react';
import { useSchedule } from '../../data/schedule';
import { useStore } from '../../state/store';
import { PrimaryButton } from '../../components/ui';

/**
 * 10 · Your schedule. Animates in block by block, 40ms stagger. Reasoning
 * shown inline only on the items that moved — explaining everything is noise.
 */
export function Ob10Schedule() {
  const { state, set, next } = useStore();
  const { blocks, selected } = useSchedule();

  /**
   * The reveal used to be driven only by `go('ob10')`, so loading this screen
   * cold — from the dev toolbar or a persisted screen — left it permanently
   * blank. The stagger now runs from the screen itself, and `reveal` is treated
   * as an enhancement: anything past the counter is still rendered, just at
   * opacity 0 until its turn.
   */
  useEffect(() => {
    if (state.reveal >= 14) return;
    const iv = window.setInterval(() => {
      set({ reveal: Math.min(14, stateRef.current + 1) });
    }, 40);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateRef = useRef(state.reveal);
  stateRef.current = state.reveal;

  const { reveal } = state;

  let ri = 0;
  const revealed = blocks.map((b) => {
    const blockIdx = ri++;
    return {
      ...b,
      op: blockIdx < reveal ? 1 : 0,
      items: b.items.map((it) => {
        const idx = ri++;
        return { ...it, op: idx < reveal ? 1 : 0, ty: idx < reveal ? 0 : 12 };
      }),
    };
  });

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div className="display">Your schedule</div>
        <div className="serif mt-2.5 text-[16px] leading-[1.45] text-t2">
          {selected.length} {selected.length === 1 ? 'item' : 'items'}, {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}.
        </div>

        <div className="mt-8 flex flex-col gap-8">
          {revealed.map((b) => (
            <div key={b.id} className="transition-opacity duration-[350ms]" style={{ opacity: b.op }}>
              <div className="flex items-baseline gap-2.5">
                <span className="label text-t2">{b.label}</span>
                <span className="text-[12px] tabular-nums text-t3">{b.time}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {b.items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      transition: 'opacity 0.35s, transform 0.35s cubic-bezier(.2,.7,.3,1)',
                      opacity: it.op,
                      transform: `translateY(${it.ty}px)`,
                    }}
                  >
                    <div className="flex items-center gap-[14px]">
                      <div className="h-2 w-2 flex-none rounded-full bg-copper opacity-50" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[17px] leading-[1.25]">{it.n}</div>
                        <div className="mt-[3px] text-[12px] text-t3">{it.d}</div>
                      </div>
                    </div>
                    {it.why && (
                      <div
                        className="mt-2 pl-3 text-[12px] leading-[1.45] text-t3"
                        style={{ marginLeft: 22, borderLeft: '1px solid rgba(200,121,65,0.35)' }}
                      >
                        {it.why}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="min-h-8 flex-1" />
        <PrimaryButton onClick={next}>Looks right</PrimaryButton>
      </div>
    </div>
  );
}
