import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react';

const SheetPortalContext = createContext<HTMLDivElement | null>(null);

/**
 * Sheets must render outside `.track` — the horizontal tab pager carries its
 * own `transform` (framer-motion drag), and since it's a nearer ancestor than
 * `.frame`, a plain nested `position: fixed` sheet takes `.track` as its
 * containing block instead, dragging the sheet along with whichever tab is
 * active. This mounts a portal target as a direct child of `.app` (a sibling
 * of `.track`), so sheets correctly resolve `.frame` (or the real viewport,
 * unframed) as their containing block.
 */
export function SheetPortalProvider({
  hostRef,
  children,
}: {
  hostRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const el = document.createElement('div');
    hostRef.current.appendChild(el);
    setNode(el);
    return () => {
      el.remove();
    };
  }, [hostRef]);

  return <SheetPortalContext.Provider value={node}>{children}</SheetPortalContext.Provider>;
}

export function useSheetPortal() {
  return useContext(SheetPortalContext);
}
