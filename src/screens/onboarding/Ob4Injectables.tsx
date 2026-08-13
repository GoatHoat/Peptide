import { useStore } from '../../state/store';
import { PrimaryButton, Tertiary } from '../../components/ui';

/**
 * 4 · Anything injectable or prescribed? The copy is verbatim from PRODUCT.md
 * §4 — it protects the app and reads as respect rather than legal cover.
 */
export function Ob4Injectables() {
  const { next } = useStore();
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div className="min-h-5" style={{ flex: 0.5 }} />
        <div className="flex justify-center pb-1 pt-2">
          {/* the only place vial + syringe line-art appears */}
          <svg
            width="240"
            height="150"
            viewBox="0 0 240 150"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M52 75h34" />
            <rect x="86" y="57" width="96" height="36" rx="6" />
            <path d="M182 75h16" />
            <path d="M198 61v28" />
            <path d="M110 57v36M128 57v36M146 57v36" strokeOpacity="0.4" />
            <path d="M86 66h58v18H86z" stroke="none" fill="rgba(255,255,255,0.10)" />
          </svg>
        </div>
        <div className="display mt-[22px]">Anything injectable or prescribed?</div>
        <div className="serif pretty mt-4 text-[18px] leading-[1.5] text-t2">
          You enter your own compounds and your own doses. This app never suggests what to take or how much — it
          does the math and the schedule around what you already have.
        </div>
        <div className="min-h-7 flex-1" />
        <PrimaryButton onClick={next}>Add a compound</PrimaryButton>
        <Tertiary onClick={next}>Skip — nothing injectable</Tertiary>
      </div>
    </div>
  );
}
