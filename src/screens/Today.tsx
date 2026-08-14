import { Arc } from '../components/Arc';
import { DOSES, TODAY, WEEK } from '../data/mock';

export function Today() {
  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">{TODAY.title}</h1>
        <div className="screen-sub t-body">{TODAY.date}</div>
      </div>

      {/* One property means one thing: fill = today, dot = completed. */}
      <div className="week">
        {WEEK.map((d, i) => (
          <div key={i} className={`week-cell ${d.state}`}>
            <span className="week-dow">{d.dow}</span>
            <span className="week-num">{d.num}</span>
            {d.state === 'completed' && <span className="week-dot" />}
          </div>
        ))}
      </div>

      <Arc />

      <div className="divider">
        <span className="divider-line" />
        <span className="divider-text t-section">Schedule</span>
        <span className="divider-line" />
      </div>

      <div className="timeline">
        <span className="rail" />
        {DOSES.map((d) => (
          <div key={d.id} className={`dose pressable ${d.taken ? 'taken' : ''}`}>
            <span className="dose-time">{d.time}</span>
            <span className="dose-body">
              <span className="dose-name" style={{ display: 'block' }}>
                {d.name}
              </span>
              <span className="dose-amt" style={{ display: 'block' }}>
                {d.amount}
              </span>
            </span>
            <span className={`dose-mark ${d.taken ? 'on' : 'off'}`} />
          </div>
        ))}
      </div>

      {/* plain text, never a card */}
      <button className="warn">{TODAY.warning}</button>
    </>
  );
}
