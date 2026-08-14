import { DOW, MONTH_ROWS, YOU } from '../data/mock';
import { IconClock } from '../components/Icons';

export function You() {
  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">{YOU.title}</h1>
        <div className="streak">
          <IconClock size={15} />
          {YOU.streak}
        </div>
      </div>

      <div className="widgets">
        <div className="widget">
          <div className="widget-num">{YOU.streakCount}</div>
          <div className="cal">
            <div className="cal-weeks">
              {MONTH_ROWS.map((r) => (
                <span key={r.label} className="cal-week-label">
                  {r.label}
                </span>
              ))}
            </div>
            <div className="cal-grid">
              {DOW.map((d, i) => (
                <span key={i} className="cal-dow">
                  {d}
                </span>
              ))}
              {MONTH_ROWS.flatMap((r, ri) =>
                r.cells.map((on, ci) => (
                  <span key={`${ri}-${ci}`} className={`cal-cell ${on ? 'on' : ''}`} />
                )),
              )}
            </div>
          </div>
        </div>

        {/* Intentionally empty. The label names what belongs here — the
            contents are not invented. */}
        <div className="widget widget-gap">
          <span>{YOU.gapLabel}</span>
        </div>
      </div>

      <div className="rows">
        {YOU.rows.map((r) => (
          <div key={r.label} className="row pressable">
            <span className="row-label">{r.label}</span>
            <span className="row-value">{r.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
