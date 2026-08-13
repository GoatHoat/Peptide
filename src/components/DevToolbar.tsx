import { useStore, type AppState, type Screen } from '../state/store';

/**
 * The mockup's left rail: a screen picker so you can jump straight to any
 * screen without walking through onboarding, plus the state toggles.
 * Not part of the phone app.
 */

const GROUPS: { title: string; ids: [Screen, string][] }[] = [
  {
    title: 'Onboarding',
    ids: [
      ['ob1', 'Cold open'],
      ['ob2', 'About you'],
      ['ob3', 'Build your stack'],
      ['ob4', 'Injectables'],
      ['ob5', 'The audit'],
      ['ob5b', 'Audit — no overlaps'],
      ['ob6', 'Goals'],
      ['ob6b', 'Recommendations'],
      ['ob7', 'Progress photo'],
      ['ob8', 'Sleep'],
      ['ob9', 'Meals'],
      ['ob10', 'Schedule reveal'],
      ['ob11', 'Notifications'],
      ['ob12', 'Paywall'],
    ],
  },
  { title: 'The gate', ids: [['gate', 'Check-in gate']] },
  {
    title: 'Main app',
    ids: [
      ['today', 'Today'],
      ['stack', 'Stack'],
      ['item', 'Item detail'],
      ['analysis', 'Analysis'],
      ['profile', 'Profile'],
      ['yir', 'Year in review'],
    ],
  },
  {
    title: 'Accessibility',
    ids: [
      ['st_rt', 'Reduce Transparency'],
      ['st_ax3', 'Dynamic Type AX3'],
    ],
  },
];

const TOGGLES: [keyof AppState, string][] = [
  ['reduceMotion', 'Reduce Motion'],
  ['lowPower', 'Low Power (12fps)'],
  ['alerts', 'Alerts card present'],
  ['emptyStack', 'Empty stack'],
  ['scanFail', 'Scan fails'],
];

export function DevToolbar() {
  const { state, go, toggle, reset } = useStore();
  let num = 0;

  return (
    <aside
      className="sticky top-0 box-border flex h-screen w-[292px] flex-none flex-col gap-5 overflow-y-auto border-r border-white/[0.08] px-[18px] pb-12 pt-[26px]"
    >
      <div>
        <div className="text-[15px] font-semibold tracking-[-0.2px]">Stack — supplement audit</div>
        <div className="mt-1 text-[12px] tracking-[0.2px] text-white/[0.38]">
          iOS prototype · dark only · 402×874
        </div>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="text-[11px] font-semibold uppercase tracking-[1.2px] text-white/[0.32]">{g.title}</div>
          <div className="mt-2 flex flex-col gap-px">
            {g.ids.map(([id, label]) => {
              num += 1;
              const on = state.screen === id;
              return (
                <div
                  key={id}
                  onClick={() => go(id)}
                  className="flex cursor-pointer items-center gap-[9px] rounded-lg px-[9px] py-[7px] text-[13px] leading-[1.2] hover:bg-white/[0.06]"
                  style={{ background: on ? 'rgba(200,121,65,0.16)' : 'transparent' }}
                >
                  <span className="w-5 flex-none text-[10.5px] tabular-nums text-white/30">
                    {String(num).padStart(2, '0')}
                  </span>
                  <span style={{ color: on ? '#E8A87C' : 'rgba(255,255,255,0.72)' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[1.2px] text-white/[0.32]">States</div>
        <div className="mt-2 flex flex-col gap-0.5">
          {TOGGLES.map(([key, label]) => {
            const on = state[key] as boolean;
            return (
              <div
                key={key}
                onClick={() => toggle(key)}
                className="flex cursor-pointer items-center justify-between gap-[10px] rounded-lg px-[9px] py-[7px] text-[13px] hover:bg-white/[0.06]"
              >
                <span className="text-white/[0.72]">{label}</span>
                <span
                  className="relative h-5 w-[34px] flex-none rounded-full transition-colors duration-200"
                  style={{ background: on ? '#C87941' : 'rgba(255,255,255,0.12)' }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left] duration-200"
                    style={{ left: on ? 16 : 2 }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        onClick={reset}
        className="cursor-pointer rounded-lg border border-white/[0.10] px-[9px] py-[7px] text-center text-[12px] text-white/[0.62] hover:bg-white/[0.06]"
      >
        Reset demo state
      </div>

      <div className="border-t border-white/[0.08] pt-[14px] text-[11px] leading-[1.55] text-white/30">
        Every value from DESIGN.md. Particle field is the only unprompted motion. Type falls back to Inter off macOS.
      </div>
    </aside>
  );
}

export const CRUMBS: Record<string, string> = {
  ob1: 'Cold open',
  ob2: 'About you',
  ob3: 'Build your stack',
  ob4: 'Injectables',
  ob5: 'The audit',
  ob5b: 'The audit — no overlaps',
  ob6: 'Goals',
  ob7: 'Progress photo',
  ob8: 'Sleep',
  ob9: 'Meals',
  ob10: 'Schedule reveal',
  ob11: 'Notifications',
  ob12: 'Paywall',
  gate: 'Check-in gate',
  today: 'Today',
  stack: 'Stack',
  item: 'Item detail',
  analysis: 'Analysis',
  profile: 'Profile',
  yir: 'Year in review',
  st_rt: 'Reduce Transparency',
  st_ax3: 'Dynamic Type AX3',
};

export const CRUMB_NOTES: Record<string, string> = {
  ob3: 'entry · scanning · populated · failure',
  ob5: 'the payoff',
  ob6: 'tap the glyph to select · drag to page',
  gate: 'tap YES, TAKEN',
  today: 'tap a circle to log · drag a row left to skip',
  analysis: 'the only dense screen',
};
