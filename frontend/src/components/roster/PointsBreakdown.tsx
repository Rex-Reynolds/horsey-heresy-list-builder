import { useMemo } from 'react';
import type { RosterDetachment } from '../../stores/rosterStore.ts';
import { NATIVE_TO_DISPLAY_GROUP } from '../../types/index.ts';

interface Props {
  detachments: RosterDetachment[];
  pointsLimit: number;
  totalPoints: number;
}

const SLOT_GROUP_COLORS: Record<string, string> = {
  'HQ': 'bg-purple-500',
  'Troops': 'bg-emerald-500',
  'Elites': 'bg-blue-500',
  'Fast Attack': 'bg-orange-500',
  'Heavy Support': 'bg-rose-500',
  'Dedicated Transport': 'bg-teal-500',
  'Lord of War': 'bg-gold-500',
};

const SLOT_GROUP_TEXT: Record<string, string> = {
  'HQ': 'text-purple-400',
  'Troops': 'text-emerald-400',
  'Elites': 'text-blue-400',
  'Fast Attack': 'text-orange-400',
  'Heavy Support': 'text-rose-400',
  'Dedicated Transport': 'text-teal-400',
  'Lord of War': 'text-gold-400',
};

interface SlotBreakdown {
  group: string;
  points: number;
  count: number;
}

export default function PointsBreakdown({ detachments, pointsLimit, totalPoints }: Props) {
  const breakdown = useMemo(() => {
    const byGroup: Record<string, { points: number; count: number }> = {};

    for (const det of detachments) {
      for (const entry of det.entries) {
        const group = NATIVE_TO_DISPLAY_GROUP[entry.category] ?? 'Other';
        if (!byGroup[group]) byGroup[group] = { points: 0, count: 0 };
        byGroup[group].points += entry.totalCost;
        byGroup[group].count += 1;
      }
    }

    const result: SlotBreakdown[] = Object.entries(byGroup)
      .map(([group, data]) => ({ group, ...data }))
      .sort((a, b) => b.points - a.points);

    return result;
  }, [detachments]);

  if (breakdown.length === 0) return null;

  const overLimit = totalPoints > pointsLimit;

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-sm bg-plate-700/30">
        {breakdown.map(({ group, points }) => {
          const pct = pointsLimit > 0 ? (points / pointsLimit) * 100 : 0;
          if (pct < 0.5) return null;
          const barColor = SLOT_GROUP_COLORS[group] ?? 'bg-edge-400';
          return (
            <div
              key={group}
              className={`${barColor} transition-all duration-500 ease-out relative group/bar`}
              style={{ width: `${Math.min(pct, 100)}%` }}
              title={`${group}: ${points} pts (${Math.round(pct)}%)`}
            >
              {/* Separator line */}
              <div className="absolute right-0 top-0 bottom-0 w-px bg-plate-900/40" />
            </div>
          );
        })}
        {/* Remaining space */}
        {!overLimit && totalPoints < pointsLimit && (
          <div className="flex-1" />
        )}
      </div>

      {/* Compact legend — single line with dots + abbreviations */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {breakdown.map(({ group, points }) => {
          const dotColor = SLOT_GROUP_COLORS[group] ?? 'bg-edge-400';
          const textColor = SLOT_GROUP_TEXT[group] ?? 'text-text-dim';
          return (
            <span key={group} className="flex items-center gap-1" title={`${group}: ${points} pts`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              <span className={`font-label text-[9px] tracking-wider uppercase ${textColor}`}>
                {group}
              </span>
              <span className="font-data text-[9px] tabular-nums text-text-dim">
                {points}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
