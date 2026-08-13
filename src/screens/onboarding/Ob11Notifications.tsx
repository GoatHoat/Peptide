import { useStore } from '../../state/store';
import { Glass, PrimaryButton, Tertiary } from '../../components/ui';

/**
 * 11 · Notifications. Asked here and nowhere earlier, because now there's
 * something obvious to be notified about. Shows a real rendered notification.
 */
export function Ob11Notifications() {
  const { state, set, next, go } = useStore();
  const prompt = state.notif === 'prompt';

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div className="min-h-3" style={{ flex: 0.5 }} />

        <Glass level="flat" className="flex items-start gap-3 px-4 py-[14px]">
          <div
            className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] text-[15px] font-bold"
            style={{ background: 'linear-gradient(140deg,#E8A87C,#8A4E24)', color: '#0A0A0A' }}
          >
            S
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold">Stack</span>
              <span className="text-[12px] text-t3">now</span>
            </div>
            <div className="mt-[3px] text-[15px] leading-[1.35]">
              Evening — Santa Cruz Copper + Zinc, 15 mg with food.
            </div>
          </div>
        </Glass>

        <div className="display mt-[38px]">One nudge per block</div>
        <div className="serif pretty mt-[14px] text-[18px] leading-[1.5] text-t2">
          Three a day at most, at the times you just set. No streak guilt, no marketing.
        </div>
        <div className="min-h-7 flex-1" />
        <PrimaryButton onClick={() => set({ notif: 'prompt' })}>Turn on reminders</PrimaryButton>
        <Tertiary onClick={next}>Not now</Tertiary>
      </div>

      {prompt && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 5 }}
        >
          <div
            className="w-[270px] overflow-hidden rounded-[14px] text-center"
            style={{ background: 'rgba(40,40,40,0.92)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
          >
            <div style={{ padding: '20px 16px 16px' }}>
              <div className="text-[17px] font-semibold">“Stack” Would Like to Send You Notifications</div>
              <div className="mt-1.5 text-[13px] leading-[1.35] text-t2">
                Notifications may include alerts, sounds and icon badges.
              </div>
            </div>
            <div className="flex" style={{ borderTop: '0.5px solid #38383A' }}>
              <div
                onClick={next}
                className="flex-1 cursor-pointer p-3 text-[17px]"
                style={{ color: '#0A84FF', borderRight: '0.5px solid #38383A' }}
              >
                Don’t Allow
              </div>
              <div
                onClick={() => {
                  set({ notif: 'mock' });
                  go('ob12');
                }}
                className="flex-1 cursor-pointer p-3 text-[17px] font-semibold"
                style={{ color: '#0A84FF' }}
              >
                Allow
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
