import type { ReactNode } from 'react';

/**
 * iPhone frame, 402×874, ported from `mockup/ios-frame.jsx` (IOSDevice with
 * `dark` and no nav bar). The app must not stretch to desktop width.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex-none overflow-hidden bg-black"
      style={{
        width: 402,
        height: 874,
        borderRadius: 48,
        boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      }}
    >
      {/* dynamic island */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bg-black"
        style={{ top: 11, width: 126, height: 37, borderRadius: 24, zIndex: 50 }}
      />

      {/* status bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0" style={{ zIndex: 10 }}>
        <StatusBar />
      </div>

      <div className="h-full w-full">{children}</div>

      {/* home indicator */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center pb-2"
        style={{ height: 34, zIndex: 60 }}
      >
        <div style={{ width: 139, height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.7)' }} />
      </div>
    </div>
  );
}

function StatusBar({ time = '9:41' }: { time?: string }) {
  const c = '#fff';
  return (
    <div
      className="ios-status-bar relative box-border flex w-full items-center justify-center"
      style={{ gap: 154, padding: '21px 24px 19px', zIndex: 20 }}
    >
      <div className="flex h-[22px] flex-1 items-center justify-center pt-[1.5px]">
        <span
          style={{
            fontFamily: '-apple-system, "SF Pro", system-ui',
            fontWeight: 590,
            fontSize: 17,
            lineHeight: '22px',
            color: c,
          }}
        >
          {time}
        </span>
      </div>
      <div className="flex h-[22px] flex-1 items-center justify-center gap-[7px] pr-px pt-px">
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c} />
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c} />
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c} />
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c} />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path
            d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z"
            fill={c}
          />
          <path
            d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z"
            fill={c}
          />
          <circle cx="8.5" cy="10.5" r="1.5" fill={c} />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none" />
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c} />
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill={c} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}
