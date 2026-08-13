import { useStore } from '../state/store';
import { useSchedule } from '../data/schedule';

/**
 * The check-in gate. A full-screen takeover, not a card and not a modal
 * (DESIGN.md §7). YES logs the dose, fills the ring, then wipes up to Today.
 */
export function Gate() {
  const { state, go, gateYes } = useStore();
  const { gate, reduceMotion } = state;
  const { blocks } = useSchedule();
  // only the most recently due dose that is still unanswered — never a queue
  const due = [...blocks].reverse().find((b) => b.past && !b.items.every((i) => state.taken[i.id])) ?? blocks[0];

  return (
    <div
      className="absolute inset-0 bg-black"
      style={{
        zIndex: 2,
        transition: 'transform 0.4s cubic-bezier(0.32,0.72,0,1)',
        transform: gate === 'wipe' ? 'translateY(-100%)' : 'translateY(0px)',
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 rounded-full animate-glow-gate"
        style={{
          top: '14%',
          width: 560,
          height: 440,
          marginLeft: -280,
          background: 'radial-gradient(circle,rgba(200,121,65,0.20),transparent 62%)',
          animationPlayState: reduceMotion ? 'paused' : 'running',
        }}
      />
      <div className="absolute inset-0 box-border flex flex-col items-center px-5 pb-11 pt-20">
        <div className="flex h-7 items-center gap-2 rounded-full bg-s1 px-[14px]">
          <span className="h-[5px] w-[5px] rounded-full bg-copper" />
          <span className="label text-t2">12-day streak</span>
        </div>

        <div className="min-h-5 flex-1" />

        <div className="relative flex h-[168px] w-[168px] flex-col items-center justify-center">
          <svg width="168" height="168" viewBox="0 0 168 168" className="absolute left-0 top-0">
            <defs>
              <linearGradient id="gateGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#E8A87C" />
                <stop offset="1" stopColor="#8A4E24" />
              </linearGradient>
            </defs>
            <circle cx="84" cy="84" r="78" fill="none" stroke="#1E1E22" strokeWidth="3" />
            <circle
              cx="84"
              cy="84"
              r="78"
              fill="none"
              stroke="url(#gateGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              transform="rotate(-90 84 84)"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={gate === 'ask' ? 100 : 0}
              style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(.2,.7,.3,1)' }}
            />
          </svg>
          <div className="flex items-start gap-[3px]">
            <span className="text-[52px] font-semibold leading-none tracking-[-1.6px] tabular-nums">20</span>
            <span className="mt-1.5 text-[17px] font-medium text-t2">mg</span>
          </div>
          <div className="label mt-2 text-t3">Zinc</div>
        </div>

        <div className="mt-10 text-[15px] font-medium text-t2">Did you take your</div>
        <div className="display mt-1.5 text-center">
          {due?.items[0].n ?? 'Nothing due'}
        </div>
        <div className="mt-[14px] flex items-center gap-2.5">
          <span className="text-[15px] font-medium text-t2">{due?.items[0].d ?? ''}</span>
          <span className="h-[3px] w-[3px] rounded-full bg-white/[0.22]" />
          <span className="text-[15px] font-medium tabular-nums text-t2">{due?.time ?? ''}</span>
        </div>

        <div className="min-h-7" style={{ flex: 1.4 }} />

        <div
          onClick={gateYes}
          className="btn-primary w-full"
          style={{ height: 60 }}
        >
          {gate === 'ask' ? 'Yes, taken' : 'Logged'}
        </div>
        <div
          onClick={() => go('today')}
          className="cursor-pointer px-3 pb-0 pt-[18px] text-[13px] font-medium"
          style={{ color: 'rgba(200,121,65,0.55)' }}
        >
          Not yet
        </div>
      </div>
    </div>
  );
}
