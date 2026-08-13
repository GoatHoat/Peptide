import { Glass, SectionLabel } from '../components/ui';

/**
 * Two accessibility proofs from the mockup's left rail.
 * DESIGN.md §9 — not optional.
 */

/**
 * Reduce Transparency. Since DESIGN_V2 §1 made every surface opaque, this
 * setting is now a no-op — the cards already render at their solid value.
 */
export function ReduceTransparency() {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-black" style={{ zIndex: 1 }}>
      <div className="box-border" style={{ padding: '70px 20px 60px' }}>
        <div className="flex h-11 items-center justify-center">
          <div className="text-[17px] font-semibold tracking-[-0.43px] text-t2">Today ⌄</div>
        </div>

        <div className="mt-7 rounded-card p-6" style={{ background: '#131316' }}>
          <SectionLabel>Next dose</SectionLabel>
          <div className="mt-[14px] flex items-end gap-2">
            <span className="text-[72px] font-light leading-[0.9] tracking-[-2px] tabular-nums">9:30</span>
            <span className="pb-2 text-[24px] text-t2">PM</span>
          </div>
          <div className="mt-[14px] text-[15px] font-medium text-t2">Copper + Zinc · 15 mg zinc</div>
        </div>

        <div className="mt-10">
          <SectionLabel>Today’s numbers</SectionLabel>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { l: 'Taken', v: '1', u: 'of 3' },
            { l: 'Streak', v: '12', u: 'days' },
          ].map((t) => (
            <div
              key={t.l}
              className="rounded-card p-5"
              style={{ background: '#131316', aspectRatio: '1.15' }}
            >
              <SectionLabel>{t.l}</SectionLabel>
              <div className="mt-[14px] text-[32px] font-medium tracking-[-0.8px] tabular-nums">{t.v}</div>
              <div className="mt-1 text-[15px] font-medium text-t2">{t.u}</div>
            </div>
          ))}
        </div>

        <div className="serif mt-8 text-[13px] leading-[1.55] text-t3">
          Reduce Transparency changes nothing here. Surfaces are already opaque at{' '}
          <span className="text-t2">#131316</span> with no border and no sheen, so there is no translucency to
          reduce. Spacing and hierarchy are identical either way.
        </div>
      </div>
    </div>
  );
}

/** Dynamic Type AX3: hero numerals cap, tiles reflow to one-up, nothing clips. */
export function DynamicTypeAX3() {
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border" style={{ padding: '70px 20px 60px' }}>
        <div className="flex h-11 items-center justify-center">
          <div className="text-[17px] font-semibold tracking-[-0.43px] text-t2">Today ⌄</div>
        </div>

        <Glass level="flat" className="mt-7 p-6">
          <div className="text-[22px] font-semibold tracking-[-0.6px]">Next dose</div>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <span className="text-[72px] font-light leading-[0.95] tracking-[-2px] tabular-nums">9:30</span>
            <span className="pb-2 text-[30px] text-t2">PM</span>
          </div>
          <div className="mt-4 text-[23px] font-medium leading-[1.35] text-t2">Copper + Zinc · 15 mg zinc</div>
        </Glass>

        <div className="mt-10 text-[22px] font-semibold tracking-[-0.6px]">Today’s numbers</div>
        <div className="mt-4 flex flex-col gap-3">
          {[
            { l: 'Taken', v: '1 of 3' },
            { l: 'Streak', v: '12 days' },
          ].map((t) => (
            <Glass level="flat" key={t.l} className="p-5">
              <div className="text-[22px] font-semibold tracking-[-0.6px]">{t.l}</div>
              <div className="mt-3 text-[44px] font-medium tracking-[-0.8px] tabular-nums">{t.v}</div>
            </Glass>
          ))}
        </div>

        <div className="serif mt-8 text-[18px] leading-[1.5] text-t3">
          Accessibility size 3: hero numerals cap here, tiles reflow to one-up, nothing clips or truncates.
        </div>
      </div>
    </div>
  );
}
