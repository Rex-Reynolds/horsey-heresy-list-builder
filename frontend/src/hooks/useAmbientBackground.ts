import { useEffect } from 'react';
import { useRosterStore } from '../stores/rosterStore.ts';

/**
 * Subtly shifts the background vignette color based on army state:
 * - Cool blue-grey when building (has entries but incomplete)
 * - Warm amber when near completion (>75% points used)
 * - Green tint when army is valid
 */
export function useAmbientBackground() {
  const totalPoints = useRosterStore((s) => s.totalPoints);
  const pointsLimit = useRosterStore((s) => s.pointsLimit);
  const isValid = useRosterStore((s) => s.isValid);
  const detachments = useRosterStore((s) => s.detachments);

  useEffect(() => {
    const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);
    const body = document.body;

    // Remove all ambient classes
    body.classList.remove('ambient-building', 'ambient-warm', 'ambient-valid');

    if (totalEntries === 0) return;

    if (isValid === true) {
      body.classList.add('ambient-valid');
    } else if (pointsLimit > 0 && totalPoints / pointsLimit > 0.75) {
      body.classList.add('ambient-warm');
    } else {
      body.classList.add('ambient-building');
    }

    return () => {
      body.classList.remove('ambient-building', 'ambient-warm', 'ambient-valid');
    };
  }, [totalPoints, pointsLimit, isValid, detachments]);
}
