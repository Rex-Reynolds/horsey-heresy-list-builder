import { useState, useRef, useEffect } from 'react';
import { useRosters } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import client from '../../api/client.ts';

const MAX_VISIBLE_TABS = 4;

export default function RosterTabs() {
  const { data: rosters = [] } = useRosters();
  const currentId = useRosterStore((s) => s.rosterId);
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow dropdown on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [overflowOpen]);

  if (rosters.length <= 1) return null;

  function switchToRoster(id: number) {
    if (id === currentId) return;
    client.get(`/api/rosters/${id}`).then(({ data }) => {
      syncFromResponse(data);
    });
    setOverflowOpen(false);
  }

  // Put active roster first in visible tabs, then fill remaining slots
  const activeRoster = rosters.find((r) => r.id === currentId);
  const otherRosters = rosters.filter((r) => r.id !== currentId);
  const visibleTabs = activeRoster
    ? [activeRoster, ...otherRosters.slice(0, MAX_VISIBLE_TABS - 1)]
    : rosters.slice(0, MAX_VISIBLE_TABS);
  const overflowTabs = rosters.filter((r) => !visibleTabs.some((v) => v.id === r.id));

  function getPointsBarColor(pts: number, limit: number) {
    const pct = limit > 0 ? pts / limit : 0;
    if (pct > 1) return 'bg-danger';
    if (pct > 0.8) return 'bg-caution/80';
    if (pct > 0) return 'bg-gold-500/60';
    return 'bg-edge-600/30';
  }

  return (
    <div className="flex items-center gap-0 border-b border-edge-700/30 bg-plate-950/50 px-4">
      {visibleTabs.map((roster) => {
        const isActive = roster.id === currentId;
        const pts = roster.total_points ?? 0;
        const limit = roster.points_limit ?? 3000;
        const pct = limit > 0 ? Math.min((pts / limit) * 100, 100) : 0;
        return (
          <button
            key={roster.id}
            onClick={() => switchToRoster(roster.id)}
            className={`relative shrink-0 px-3 py-1.5 font-label text-[11px] font-semibold tracking-wider uppercase transition-all ${
              isActive
                ? 'text-gold-400'
                : 'text-text-dim/60 hover:text-text-secondary'
            }`}
          >
            <span className="truncate max-w-[120px] inline-block align-bottom">
              {roster.name}
            </span>
            <span className="ml-1.5 font-data text-[9px] tabular-nums text-text-dim/40">
              {pts}/{limit}
            </span>
            {/* Mini points bar */}
            <span className="absolute bottom-0 left-2 right-2 h-[2px] overflow-hidden rounded-full bg-edge-700/20">
              <span
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${isActive ? 'bg-gold-500' : getPointsBarColor(pts, limit)}`}
                style={{ width: isActive ? '100%' : `${pct}%` }}
              />
            </span>
          </button>
        );
      })}

      {/* Overflow dropdown */}
      {overflowTabs.length > 0 && (
        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setOverflowOpen((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 font-label text-[11px] font-semibold tracking-wider text-text-dim/60 uppercase transition-colors hover:text-text-secondary"
          >
            +{overflowTabs.length}
            <svg className={`h-2.5 w-2.5 transition-transform ${overflowOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {overflowOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-sm border border-edge-600/30 bg-plate-900 shadow-lg">
              {overflowTabs.map((roster) => {
                const pts = roster.total_points ?? 0;
                const limit = roster.points_limit ?? 3000;
                const pct = limit > 0 ? Math.min((pts / limit) * 100, 100) : 0;
                return (
                  <button
                    key={roster.id}
                    onClick={() => switchToRoster(roster.id)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-plate-800/60"
                  >
                    {/* Mini fill bar */}
                    <span className="h-3 w-1 shrink-0 overflow-hidden rounded-full bg-edge-700/20">
                      <span
                        className={`block w-full rounded-full ${getPointsBarColor(pts, limit)}`}
                        style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                      />
                    </span>
                    <span className="truncate font-label text-[11px] font-semibold tracking-wider text-text-primary uppercase">
                      {roster.name}
                    </span>
                    <span className="ml-auto shrink-0 font-data text-[10px] tabular-nums text-text-dim">
                      {pts}/{limit}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
