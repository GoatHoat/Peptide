import { YIR } from '../data/mock';
import { useStore } from '../state/store';
import { useSchedule } from '../data/schedule';
import { PrimaryButton } from '../components/ui';

/**
 * Year in review. Copy is about consistency, never about appearance. Photos are
 * excluded from the share card by default and need a second, explicit tap.
 */
export function YearInReview() {
  const { state, toggle } = useStore();
  const { yirPhotos } = state;
  const { totalDoses, findings } = useSchedule();
  // the counts follow what they actually take
  const numbers = [
    { v: '284', l: 'days logged' },
    { v: '31', l: 'longest streak' },
    { v: (284 * totalDoses).toLocaleString('en-US'), l: 'doses taken' },
    { v: String(findings.length), l: 'limits caught' },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="relative box-border flex min-h-full flex-col px-5 pb-10 pt-24">
        <div className="label text-t2">{YIR.year}</div>
        <div className="display mt-4">{YIR.headline}</div>

        <div className="mt-10 grid grid-cols-2" style={{ gap: '26px 16px' }}>
          {numbers.map((n) => (
            <div key={n.l}>
              <div className="text-[32px] font-medium tracking-[-0.8px] tabular-nums">{n.v}</div>
              <div className="mt-1.5 text-[12px] text-t3">{n.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex gap-3">
          {YIR.photos.map((p) => (
            <div key={p.label} className="flex-1">
              <div
                className="w-full rounded-card"
                style={{ paddingTop: '132%', background: p.tint }}
              />
              <div className="mt-2.5 text-[12px] text-t3">{p.label}</div>
            </div>
          ))}
        </div>

        <div className="min-h-8 flex-1" />
        <PrimaryButton onClick={() => toggle('yirPhotos')}>
          {yirPhotos ? 'Photos included — save this' : 'Save this'}
        </PrimaryButton>
        <div className="serif mt-[14px] text-center text-[13px] leading-[1.5] text-t3">
          {yirPhotos
            ? 'Photos will be included in the card. Tap again to leave them out.'
            : 'Photos are left out of the share card unless you add them.'}
        </div>
      </div>
    </div>
  );
}
