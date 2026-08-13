import { SHEET_ROWS } from '../data/mock';
import { useStore } from '../state/store';
import { Chevron } from './ui';

/** The six-option add sheet behind [+]. A sheet, not a page (PRODUCT.md §3). */
export function AddSheet() {
  const { state, set } = useStore();
  const open = state.sheet;

  return (
    <>
      <div
        onClick={() => set({ sheet: false })}
        className="absolute inset-0 transition-opacity duration-[400ms]"
        style={{
          zIndex: 6,
          background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      {/* The slide transform lives on the glass element itself, not on a
          wrapper. A transformed ancestor forms a backdrop root, which would
          leave this panel blurring nothing. */}
      <div
        data-panel="add-sheet"
        className="glass-2 absolute inset-x-0 bottom-0 px-5 pb-10 pt-3"
        style={{
          zIndex: 7,
          transition: 'transform 0.5s cubic-bezier(0.32,0.72,0,1)',
          transform: open ? 'translateY(0%)' : 'translateY(100%)',
          pointerEvents: open ? 'auto' : 'none',
          borderRadius: '28px 28px 0 0',
        }}
      >
        <div>
          <div className="mx-auto mb-[18px] h-1 w-[38px] rounded-sm bg-white/[0.22]" />
          {/* separators inset past the icon, to the leading text edge */}
          <div className="row-separator" style={{ '--sep-inset': '38px' } as React.CSSProperties}>
            {SHEET_ROWS.map((r) => (
              <div
                key={r.k}
                onClick={() => set({ sheet: false })}
                className="flex h-[60px] cursor-pointer items-center gap-4"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C87941"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={r.d} />
                </svg>
                <span className="flex-1 text-[17px]">{r.n}</span>
                <Chevron />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
