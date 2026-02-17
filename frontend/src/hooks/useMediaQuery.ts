import { useCallback, useSyncExternalStore } from 'react';

/**
 * Reactive media query hook — subscribes to matchMedia changes.
 * Returns true when the query matches, updates on resize/orientation change.
 * Uses useSyncExternalStore for tear-free reads.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
