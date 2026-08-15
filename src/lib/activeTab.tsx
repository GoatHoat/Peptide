import { createContext, useContext } from 'react';

/**
 * Today/Discover/You are all permanently mounted (the pager moves them with
 * a transform rather than mounting/unmounting), so a screen's own
 * useEffect-on-mount fetch goes stale the moment another always-mounted
 * screen changes the same data — e.g. adding to the stack from Discover
 * never reached You without this, because You had already fetched once and
 * had no reason to refetch. Screens read this to refetch when they become
 * the active tab, not just on first mount.
 */
const ActiveTabContext = createContext(0);

export const ActiveTabProvider = ActiveTabContext.Provider;

export function useActiveTab() {
  return useContext(ActiveTabContext);
}
