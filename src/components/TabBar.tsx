import { TABS } from '../data/mock';
import { useStore, type Screen } from '../state/store';

/** Today · Stack · [+] · Analysis · Profile (DESIGN.md §7). */
export function TabBar() {
  const { state, go, set } = useStore();

  const tab = (t: (typeof TABS)[number]) => {
    const on = state.screen === t.id;
    return (
      <div
        key={t.id}
        onClick={() => go(t.id as Screen)}
        className="flex flex-1 cursor-pointer flex-col items-center gap-[5px] pt-1.5"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke={on ? '#C87941' : 'rgba(255,255,255,0.38)'}
        >
          <path d={t.d} />
        </svg>
        <span
          className="text-[10px] tracking-[0.2px]"
          style={{ color: on ? '#FFFFFF' : 'rgba(255,255,255,0.38)' }}
        >
          {t.label}
        </span>
      </div>
    );
  };

  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-start bg-black pt-2"
      style={{ height: 92, zIndex: 3, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.slice(0, 2).map(tab)}
      <div className="flex flex-1 justify-center">
        <div
          onClick={() => set({ sheet: true })}
          className="-mt-[14px] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full"
          style={{ background: 'linear-gradient(135deg,#E8A87C,#C87941 55%,#8A4E24)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>
      {TABS.slice(2).map(tab)}
    </div>
  );
}
