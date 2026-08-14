import { DISCOVER } from '../data/mock';
import { IconChat, IconChevron, IconClock, IconDoc, IconMenu, IconPerson, IconSearch } from '../components/Icons';

export function Discover() {
  return (
    <>
      <div className="screen-head">
        <h1 className="t-title">{DISCOVER.title}</h1>
        <div className="screen-sub t-body">{DISCOVER.subtitle}</div>
      </div>

      {/* --card, not white: it was the only light element in the app */}
      <div className="search">
        <span style={{ color: 'var(--t3)', display: 'flex' }}>
          <IconMenu />
        </span>
        <input defaultValue={DISCOVER.query} placeholder="Search" spellCheck={false} />
        <span style={{ color: 'var(--t3)', display: 'flex' }}>
          <IconSearch />
        </span>
      </div>

      <div className="result">
        <div className="result-title">{DISCOVER.result.title}</div>
        {/* placeholder for a paper thumbnail — no real content exists yet */}
        <div className="thumb">
          <span style={{ color: 'var(--t4)', display: 'flex' }}>
            <IconDoc />
          </span>
        </div>
        <div className="result-actions">
          <button className="btn btn-fill pressable">
            <IconClock color="var(--bg)" />
            {DISCOVER.result.primary}
          </button>
          <button className="btn btn-out pressable">
            <IconChat size={15} />
            {DISCOVER.result.secondary}
          </button>
        </div>
      </div>

      <div className="papers">
        <span className="rail" />
        {DISCOVER.papers.map((p) => (
          <div key={p.id} className="paper">
            <div className="paper-title">{p.title}</div>
            <div className="paper-meta">
              <span style={{ color: 'var(--t3)', display: 'flex' }}>
                <IconPerson />
              </span>
              {p.meta}
              <button className="paper-more">
                {p.more}
                <IconChevron />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
