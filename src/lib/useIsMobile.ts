import { useEffect, useState } from 'react';

/**
 * A real touch device — not a narrow desktop window. On mobile the app fills
 * the viewport instead of rendering a phone inside a phone.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640,
  );
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const on = () => setMobile(mq.matches || window.innerWidth < 640);
    mq.addEventListener('change', on);
    window.addEventListener('resize', on);
    return () => {
      mq.removeEventListener('change', on);
      window.removeEventListener('resize', on);
    };
  }, []);
  return mobile;
}
