import { PHOTO_GRID, PHOTO_THUMBS, PROFILE, QUIET_ROWS } from '../data/mock';
import { useState } from 'react';
import { useStore } from '../state/store';
import { useSchedule } from '../data/schedule';
import { Chevron, Glass, SectionLabel } from '../components/ui';
import { RingCalendar } from '../components/RingCalendar';
import { fmt } from '../lib/format';

/** TAB 5 — PROFILE. Ring calendar, your day, photos, settings list. */
export function Profile() {
  const { state, toggle } = useStore();
  const { takenCount: todayTaken, totalDoses, audit } = useSchedule();
  const [bloodOpen, setBloodOpen] = useState(false);
  const biotin = audit.find((a) => a.n === 'Biotin');

  const stats = [
    { v: String(state.age), l: 'Age' },
    { v: PROFILE.streak, l: 'Day streak' },
    { v: PROFILE.longest, l: 'Longest' },
  ];

  const dayRows = [
    { n: 'Wake', v: fmt(state.wakeT) },
    {
      n: 'Meals',
      v: `${fmt(state.breakfast[0], true)} · ${fmt(state.lunch[0], true)} · ${fmt(state.dinner[0], true)}`,
    },
    { n: 'Bed', v: fmt(state.bedT) },
  ];

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ zIndex: 1 }}>
      <div className="box-border" style={{ padding: '70px 0 120px' }}>
        <div className="mt-1.5 flex items-center gap-[14px] px-5">
          <div
            className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full text-[20px] font-semibold text-copper-light"
            style={{
              background: 'linear-gradient(140deg,rgba(232,168,124,0.30),rgba(138,78,36,0.30))',
              border: '1px solid rgba(200,121,65,0.35)',
            }}
          >
            {PROFILE.initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="display">{PROFILE.name}</div>
            <div className="label mt-1 text-t3">{PROFILE.since}</div>
          </div>
        </div>

        <div className="mt-[18px] flex gap-2.5 px-5">
          {stats.map((s) => (
            <Glass key={s.l} radius={16} className="flex-1 px-[14px] py-3">
              <div className="text-[24px] font-bold tracking-[-0.5px] tabular-nums">{s.v}</div>
              <div className="label mt-1 text-t3">{s.l}</div>
            </Glass>
          ))}
        </div>

        {/* Ring calendar — full width, because 7 columns of 28pt rings need it */}
        <div className="mt-5 px-5">
          <Glass radius={18} className="p-5">
            <RingCalendar todayTaken={todayTaken} scheduled={totalDoses} />
          </Glass>
        </div>

        <div className="mt-10 px-5">
          <SectionLabel>Your day</SectionLabel>
          <Glass radius={18} className="mt-4 p-5">
            <div className="flex justify-between gap-4">
              {dayRows.map((r) => (
                <div key={r.n}>
                  <div className="label text-t3">{r.n}</div>
                  <div className="mt-1 text-[17px] font-semibold tracking-[-0.43px] tabular-nums">{r.v}</div>
                </div>
              ))}
            </div>
          </Glass>
        </div>

        {/* Photo strip — collapsed, expands to the full chronological grid */}
        <div className="mt-10 px-5">
          <SectionLabel>Progress</SectionLabel>
          <Glass radius={18} className="mt-4 cursor-pointer p-5" onClick={() => toggle('photosOpen')}>
            {!state.photosOpen ? (
              <div className="flex items-center gap-3">
                {PHOTO_THUMBS.map((d) => (
                  <div key={d} className="text-center">
                    <div
                      className="h-[52px] w-[52px] rounded-chip"
                      style={{ background: 'linear-gradient(160deg,rgba(200,121,65,0.20),rgba(255,255,255,0.05))' }}
                    />
                    <div className="label mt-1.5 text-t3">{d}</div>
                  </div>
                ))}
                <div className="label flex-1 text-right text-t3">tap to expand</div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5">
                {PHOTO_GRID.map((d) => (
                  <div key={d}>
                    <div
                      className="w-full rounded-xl"
                      style={{
                        paddingTop: '126%',
                        background: 'linear-gradient(160deg,rgba(200,121,65,0.20),rgba(255,255,255,0.05))',
                      }}
                    />
                    <div className="label mt-1.5 text-center text-t3">{d}</div>
                  </div>
                ))}
              </div>
            )}
          </Glass>
        </div>

        {/* PROMPT_STACK3 §4 — appears only when the stack carries 5,000 mcg of
            biotin or more. Grounded in an FDA safety communication. */}
        {biotin && biotin.amt >= 5000 && (
          <div className="mt-10 px-5">
            <Glass radius={18} className="p-5">
              <div
                className="flex cursor-pointer items-center gap-3"
                onClick={() => setBloodOpen((v) => !v)}
              >
                <span className="flex-1 text-[17px] font-semibold tracking-[-0.43px]">
                  Blood test coming up?
                </span>
                <span
                  className="transition-transform duration-300"
                  style={{ transform: bloodOpen ? 'rotate(90deg)' : 'none' }}
                >
                  <Chevron />
                </span>
              </div>
              <div className="label mt-2 text-t2">
                Your stack has {biotin.amt.toLocaleString('en-US')} mcg of biotin a day.
              </div>

              {bloodOpen && (
                <div className="mt-4">
                  <div className="text-[14px] leading-[1.55] text-t2">
                    High-dose biotin interferes with lab tests built on biotin-streptavidin
                    immunoassays. It does not change your body — it changes what the machine reads.
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    {['Troponin — the heart attack test', 'Thyroid panels (TSH, T4)', 'Vitamin D', 'BNP'].map((t) => (
                      <div key={t} className="flex items-center gap-2.5 text-[15px]">
                        <span className="h-1 w-1 flex-none rounded-full" style={{ background: '#B8784F' }} />
                        {t}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-[14px] leading-[1.55] text-t2">
                    Pause biotin for <b className="font-medium text-t1">72 hours</b> before a blood
                    draw, and tell whoever takes it that you have been taking it either way.
                  </div>
                </div>
              )}
            </Glass>
          </div>
        )}

        <div className="mt-10 px-5">
          <Glass radius={18} style={{ padding: '2px 20px' }}>
            {/* separators inset to the leading text edge, never full-bleed */}
            <div className="row-separator">
              {QUIET_ROWS.map((r) => (
                <div key={r} className="flex h-12 cursor-pointer items-center gap-3">
                  <span className="body flex-1">{r}</span>
                  <Chevron />
                </div>
              ))}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
