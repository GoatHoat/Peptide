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

/**
 * Move to another tab from inside a screen.
 *
 * Empty states are the reason this exists: "nothing in your stack yet" is a
 * dead end unless it can hand somebody to Discover, and the pager's index lives
 * in Shell where no screen can reach it. Defaults to a no-op so a screen
 * rendered outside the pager — in a test, or in the onboarding preview — still
 * renders rather than throwing.
 */
const GoToTabContext = createContext<(index: number) => void>(() => {});

export const GoToTabProvider = GoToTabContext.Provider;

export function useGoToTab() {
  return useContext(GoToTabContext);
}

/** The pager's order, so nothing has to remember that Discover is 1. */
export const TAB = { today: 0, discover: 1, you: 2 } as const;
