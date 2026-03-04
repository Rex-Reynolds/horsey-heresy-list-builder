import { useMemo, useState } from 'react';
import type { RosterDetachment } from '../../stores/rosterStore.ts';
import { useGameConfig } from '../../config/GameConfigContext.tsx';

interface Props {
  detachments: RosterDetachment[];
  totalPoints: number;
  pointsLimit: number;
}

interface Advice {
  id: string;
  message: string;
  type: 'suggestion' | 'warning' | 'tip';
}

export default function ArmyAdvice({ detachments, totalPoints, pointsLimit }: Props) {
  const { nativeToDisplayGroup } = useGameConfig();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sa_dismissed_advice');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const advice = useMemo(() => {
    const tips: Advice[] = [];
    const groups: Record<string, number> = {};
    let totalUnits = 0;

    for (const det of detachments) {
      for (const entry of det.entries) {
        const group = nativeToDisplayGroup[entry.category] ?? 'Other';
        groups[group] = (groups[group] ?? 0) + 1;
        totalUnits++;
      }
    }

    if (totalUnits === 0) return tips;

    const remaining = pointsLimit - totalPoints;

    // No anti-armour
    if (!groups['Heavy Support'] && totalUnits >= 3) {
      tips.push({
        id: 'no-heavy',
        message: 'No Heavy Support units yet \u2014 consider adding armour or artillery for anti-vehicle capability.',
        type: 'suggestion',
      });
    }

    // No troops
    if (!groups['Troops'] && totalUnits >= 2) {
      tips.push({
        id: 'no-troops',
        message: 'No Troops choices \u2014 most detachments require at least one Troops unit.',
        type: 'warning',
      });
    }

    // Over budget
    if (totalPoints > pointsLimit) {
      const over = totalPoints - pointsLimit;
      tips.push({
        id: 'over-budget',
        message: `Over budget by ${over} pts \u2014 consider removing upgrades or reducing model counts.`,
        type: 'warning',
      });
    }

    // Large points gap
    if (remaining >= 200 && totalUnits >= 3) {
      tips.push({
        id: 'large-gap',
        message: `${remaining} pts remaining \u2014 room for another full unit or significant upgrades.`,
        type: 'tip',
      });
    }

    // All one category
    const categories = Object.keys(groups);
    if (categories.length === 1 && totalUnits >= 3) {
      tips.push({
        id: 'mono-category',
        message: `All units are ${categories[0]} \u2014 consider diversifying for a balanced force.`,
        type: 'suggestion',
      });
    }

    // No HQ
    if (!groups['HQ'] && totalUnits >= 2) {
      tips.push({
        id: 'no-hq',
        message: 'No HQ units \u2014 a commander is typically required for a valid army.',
        type: 'warning',
      });
    }

    return tips;
  }, [detachments, totalPoints, pointsLimit, nativeToDisplayGroup]);

  const visible = advice.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('sa_dismissed_advice', JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  const typeStyles = {
    suggestion: 'border-steel/20 bg-steel/5',
    warning: 'border-caution/20 bg-caution/5',
    tip: 'border-gold-600/20 bg-gold-900/5',
  };

  const typeIcons = {
    suggestion: (
      <svg className="h-3.5 w-3.5 shrink-0 text-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    warning: (
      <svg className="h-3.5 w-3.5 shrink-0 text-caution" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    tip: (
      <svg className="h-3.5 w-3.5 shrink-0 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  };

  return (
    <div className="space-y-1.5">
      {visible.slice(0, 2).map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-2.5 rounded-sm border px-3 py-2 animate-fade-in ${typeStyles[item.type]}`}
        >
          {typeIcons[item.type]}
          <p className="flex-1 text-[11px] leading-relaxed text-text-secondary">
            {item.message}
          </p>
          <button
            onClick={() => dismiss(item.id)}
            className="mt-0.5 shrink-0 text-text-dim/40 transition-colors hover:text-text-dim"
            title="Dismiss"
            aria-label="Dismiss advice"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
