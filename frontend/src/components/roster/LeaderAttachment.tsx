import type { RosterEntry } from '../../stores/rosterStore.ts';
import UnitTypeIcon from '../common/UnitTypeIcon.tsx';

interface Props {
  leader: RosterEntry;
  onDetach: () => void;
}

/**
 * Inline sub-card showing an attached leader within a bodyguard entry.
 * Displayed below the main entry when a leader is attached (40k only).
 */
export default function LeaderAttachment({ leader, onDetach }: Props) {
  return (
    <div className="ml-6 flex items-center gap-2 rounded-sm border border-dashed border-amber-500/25 bg-amber-900/8 px-3 py-1.5">
      {/* Link icon */}
      <svg className="h-3 w-3 shrink-0 text-amber-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>

      {/* Leader info */}
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-300/80 truncate">
          <UnitTypeIcon unitType={leader.category} className="h-3 w-3 shrink-0 text-amber-400/40" />
          <span className="truncate">{leader.name}</span>
          <span className="font-label text-[9px] tracking-wider text-amber-400/50 uppercase">Leader</span>
        </p>
        <span className="font-data text-[10px] tabular-nums text-amber-400/60">
          {leader.totalCost} pts
        </span>
      </div>

      {/* Detach button */}
      <button
        onClick={onDetach}
        className="flex h-5 w-5 items-center justify-center text-text-dim/40 transition-colors hover:text-danger"
        title="Detach leader"
        aria-label={`Detach ${leader.name}`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
