import { useStore } from '../../state/store';
import { PrimaryButton, Tertiary } from '../../components/ui';

/**
 * 7 · Your starting point. Framing is about consistency over time, never about
 * appearance (PRODUCT.md §7). On-device only.
 */
export function Ob7ProgressPhoto() {
  const { state, set, next } = useStore();
  const { photo } = state;

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        {photo === 'ask' && (
          <>
            <div className="min-h-4" style={{ flex: 0.5 }} />
            <div className="flex justify-center">
              <div
                className="relative flex h-[230px] w-[190px] items-center justify-center rounded-card"
                style={{ border: '1.5px solid rgba(200,121,65,0.35)' }}
              >
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#C87941" strokeWidth="1.2" strokeLinecap="round">
                  <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
                  <circle cx="12" cy="13" r="3.6" />
                </svg>
                <div className="absolute bg-black" style={{ left: -1.5, top: 22, bottom: 22, width: 3 }} />
                <div className="absolute bg-black" style={{ right: -1.5, top: 22, bottom: 22, width: 3 }} />
              </div>
            </div>
            <div className="display mt-[34px]">Your starting point</div>
            <div className="serif pretty mt-[14px] text-[18px] leading-[1.5] text-t2">
              Want a before photo? It stays on your phone, never leaves the device, and nobody sees it but you.
            </div>
            <div className="serif mt-[14px] text-[13px] leading-[1.5] text-t3">
              Kept out of your photo library. Optional Face ID lock. Blurred in the app switcher.
            </div>
            <div className="min-h-7 flex-1" />
            <PrimaryButton onClick={() => set({ photo: 'camera' })}>Take a photo</PrimaryButton>
            <Tertiary onClick={next}>Skip — I’ll do this later</Tertiary>
          </>
        )}

        {photo === 'camera' && (
          <>
            <div
              className="relative mt-2 flex-1 overflow-hidden rounded-card"
              style={{ background: 'linear-gradient(165deg,#131316,#000000)' }}
            >
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  width: 180,
                  height: 300,
                  margin: '-150px 0 0 -90px',
                  border: '1.5px dashed rgba(200,121,65,0.35)',
                  borderRadius: 90,
                }}
              />
              <div className="serif absolute inset-x-0 bottom-[18px] text-center text-[13px] text-t3">
                Same spot, same light, once a fortnight
              </div>
            </div>
            <div className="flex items-center justify-center pb-1 pt-[26px]">
              <div
                onClick={() => set({ photo: 'confirm' })}
                className="flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-full"
                style={{ border: '2px solid rgba(255,255,255,0.22)' }}
              >
                <div
                  className="h-[58px] w-[58px] rounded-full"
                  style={{ background: 'linear-gradient(135deg,#E8A87C,#8A4E24)' }}
                />
              </div>
            </div>
            <div onClick={next} className="cursor-pointer px-3 pt-2 text-center text-[16px] font-medium text-copper">
              Skip
            </div>
          </>
        )}

        {photo === 'confirm' && (
          <>
            <div className="min-h-3" style={{ flex: 0.4 }} />
            <div className="flex justify-center">
              <div
                className="box-border flex h-[250px] w-[190px] items-end rounded-card p-[14px]"
                style={{ background: 'linear-gradient(160deg,rgba(200,121,65,0.20),rgba(255,255,255,0.04))' }}
              >
                <span className="text-[12px] tracking-[0.2px] text-t2">9 Aug · day 1</span>
              </div>
            </div>
            <div className="display mt-8">Day one, saved</div>
            <div className="serif mt-[14px] text-[18px] leading-[1.5] text-t2">
              On this device only. We’ll ask again in a fortnight, once, quietly.
            </div>
            <div className="min-h-7 flex-1" />
            <PrimaryButton onClick={next}>Continue</PrimaryButton>
            <Tertiary onClick={() => set({ photo: 'camera' })}>Retake</Tertiary>
          </>
        )}
      </div>
    </div>
  );
}
