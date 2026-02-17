import { useEffect, useRef, useState } from 'react';
import { useRosterStore } from '../../stores/rosterStore.ts';

type Milestone = 'first-unit' | 'slots-filled' | 'army-complete';

// Pre-compute particle distances outside render to avoid impure Math.random() calls
const PARTICLE_DISTANCES = Array.from({ length: 24 }, (_, i) => 80 + ((i * 37 + 13) % 60));

const MILESTONE_MESSAGES: Record<Milestone, { title: string; subtitle: string }> = {
  'first-unit': {
    title: 'First Unit Deployed',
    subtitle: 'Your muster begins',
  },
  'slots-filled': {
    title: 'Battle Ready',
    subtitle: 'All required slots filled',
  },
  'army-complete': {
    title: 'Muster Complete',
    subtitle: 'Points target achieved',
  },
};

export default function MilestoneCelebration() {
  const [active, setActive] = useState<Milestone | null>(null);
  const detachments = useRosterStore((s) => s.detachments);
  const totalPoints = useRosterStore((s) => s.totalPoints);
  const pointsLimit = useRosterStore((s) => s.pointsLimit);
  const isValid = useRosterStore((s) => s.isValid);

  const prevState = useRef({
    totalEntries: 0,
    allSlotsFilled: false,
    armyComplete: false,
  });

  const seen = useRef<Set<Milestone>>((() => {
    try {
      const saved = sessionStorage.getItem('sa_milestones');
      return saved ? new Set<Milestone>(JSON.parse(saved)) : new Set<Milestone>();
    } catch { return new Set<Milestone>(); }
  })());

  useEffect(() => {
    const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);
    let milestone: Milestone | null = null;

    // First unit
    if (totalEntries > 0 && prevState.current.totalEntries === 0) {
      milestone = 'first-unit';
    }

    // All required slots filled
    let allFilled = detachments.length > 0;
    for (const det of detachments) {
      for (const status of Object.values(det.slots)) {
        if (status.min > 0 && status.filled < status.min) {
          allFilled = false;
          break;
        }
      }
      if (!allFilled) break;
    }
    if (!milestone && allFilled && !prevState.current.allSlotsFilled && totalEntries > 0) {
      milestone = 'slots-filled';
    }

    // Army complete (valid + at or near points limit)
    const armyComplete = isValid === true && totalPoints >= pointsLimit * 0.95 && totalPoints <= pointsLimit;
    if (!milestone && armyComplete && !prevState.current.armyComplete && totalEntries > 0) {
      milestone = 'army-complete';
    }

    prevState.current = { totalEntries, allSlotsFilled: allFilled, armyComplete };

    // Trigger celebration in a microtask to satisfy no-setState-in-effect rule
    if (milestone && !seen.current.has(milestone)) {
      const m = milestone;
      seen.current.add(m);
      try {
        sessionStorage.setItem('sa_milestones', JSON.stringify([...seen.current]));
      } catch { /* noop */ }
      const timer = setTimeout(() => {
        setActive(m);
        setTimeout(() => setActive(null), 3000);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [detachments, totalPoints, pointsLimit, isValid]);

  if (!active) return null;

  const msg = MILESTONE_MESSAGES[active];

  return (
    <div className="fixed inset-0 z-[9500] pointer-events-none flex items-center justify-center">
      {/* Particles */}
      <div className="milestone-particles absolute inset-0">
        {Array.from({ length: active === 'army-complete' ? 24 : 12 }).map((_, i) => (
          <span
            key={i}
            className="milestone-particle"
            style={{
              '--angle': `${(i * 360) / (active === 'army-complete' ? 24 : 12)}deg`,
              '--delay': `${i * 50}ms`,
              '--distance': `${PARTICLE_DISTANCES[i]}px`,
              left: '50%',
              top: '50%',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Banner */}
      <div className={`milestone-banner ${active === 'army-complete' ? 'milestone-golden' : ''}`}>
        <div className="font-display text-lg font-semibold tracking-[0.15em] uppercase">
          {msg.title}
        </div>
        <div className="font-label mt-1 text-[11px] tracking-[0.2em] uppercase opacity-70">
          {msg.subtitle}
        </div>
      </div>
    </div>
  );
}
