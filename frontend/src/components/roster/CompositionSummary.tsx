import { useState } from 'react';
import type { RosterDetachment } from '../../stores/rosterStore.ts';

interface Props {
  detachments: RosterDetachment[];
  totalPoints: number;
}

const TYPE_BAR_COLORS: Record<string, string> = {
  Primary: 'bg-gold-500',
  Auxiliary: 'bg-steel',
  Apex: 'bg-royal',
};

export default function CompositionSummary({ detachments, totalPoints }: Props) {
  const [expanded, setExpanded] = useState(false);

  const totalUnits = detachments.reduce((s, d) => s + d.entries.length, 0);
  const totalModels = detachments.reduce(
    (s, d) => s + d.entries.reduce((es, e) => es + e.quantity, 0),
    0,
  );

  const detStats = detachments.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    points: d.entries.reduce((s, e) => s + e.totalCost, 0),
    units: d.entries.length,
    unitNames: d.entries.map((e) => e.name),
  }));

  return (
    <div className="mt-3 rounded-sm border border-edge-600/20 bg-plate-800/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-plate-700/15"
      >
        <div className="flex items-center gap-2">
          <svg className={`h-2.5 w-2.5 text-text-dim transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-label text-[11px] font-semibold tracking-wider text-text-dim uppercase">
            Overview
          </span>
        </div>
        <span className="font-data text-[11px] tabular-nums text-text-dim">
          {detachments.length} det{detachments.length !== 1 ? 's' : ''} · {totalUnits} unit{totalUnits !== 1 ? 's' : ''} · {totalPoints} pts
        </span>
      </button>

      {expanded && (
        <div className="border-t border-edge-700/15 px-3 py-2.5 space-y-2">
          {detStats.map((d) => {
            const barPct = totalPoints > 0 ? Math.min((d.points / totalPoints) * 100, 100) : 0;
            const barColor = TYPE_BAR_COLORS[d.type] ?? 'bg-edge-400';
            return (
              <div key={d.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-label text-[11px] font-semibold tracking-wide text-text-secondary uppercase truncate">
                      {d.name}
                    </span>
                    <span className="font-label shrink-0 rounded-sm border border-edge-600/20 bg-plate-700/30 px-1.5 py-px text-[9px] font-semibold tracking-wider text-text-dim uppercase">
                      {d.type}
                    </span>
                  </div>
                  <span className="font-data text-[11px] tabular-nums text-gold-400/80 shrink-0 ml-2">
                    {d.points} pts
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-plate-700/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                {d.unitNames.length > 0 && (
                  <p className="text-[10px] leading-relaxed text-text-dim/60 truncate">
                    {d.unitNames.join(', ')}
                  </p>
                )}
              </div>
            );
          })}

          {/* Total models */}
          <div className="flex items-center justify-between pt-1 border-t border-edge-700/10">
            <span className="font-label text-[10px] tracking-wider text-text-dim uppercase">Total models</span>
            <span className="font-data text-[11px] tabular-nums text-text-secondary">{totalModels}</span>
          </div>
        </div>
      )}
    </div>
  );
}
