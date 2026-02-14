import { useRosterStore } from '../../stores/rosterStore.ts';

interface Props {
  onToggleRoster: () => void;
  rosterVisible: boolean;
}

export default function AppHeader({ onToggleRoster, rosterVisible }: Props) {
  const { totalPoints, pointsLimit, rosterId } = useRosterStore();

  return (
    <header className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-wide text-gold-400">
          Solar Auxilia List Builder
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {rosterId && (
          <span className="hidden text-sm text-slate-400 sm:inline">
            {totalPoints} / {pointsLimit} pts
          </span>
        )}
        <button
          onClick={onToggleRoster}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-gold-500 hover:text-gold-400 lg:hidden"
        >
          {rosterVisible ? 'Units' : 'Roster'}
        </button>
      </div>
    </header>
  );
}
