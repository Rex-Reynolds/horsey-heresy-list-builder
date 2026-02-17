import { useRosters } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import client from '../../api/client.ts';

export default function RosterTabs() {
  const { data: rosters = [] } = useRosters();
  const currentId = useRosterStore((s) => s.rosterId);
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse);

  if (rosters.length <= 1) return null;

  function switchToRoster(id: number) {
    if (id === currentId) return;
    client.get(`/api/rosters/${id}`).then(({ data }) => {
      syncFromResponse(data);
    });
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide border-b border-edge-700/30 bg-plate-950/50 px-4">
      {rosters.map((roster) => {
        const isActive = roster.id === currentId;
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
              {roster.total_points}
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
