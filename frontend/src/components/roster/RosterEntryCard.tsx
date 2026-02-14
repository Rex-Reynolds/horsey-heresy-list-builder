import type { RosterEntry } from '../../stores/rosterStore.ts';

interface Props {
  entry: RosterEntry;
  onRemove: (id: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
}

export default function RosterEntryCard({ entry, onRemove, onUpdateQty }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-200">{entry.name}</p>
        <p className="text-xs text-gold-400">{entry.totalCost} pts</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => entry.quantity > 1 && onUpdateQty(entry.id, entry.quantity - 1)}
          disabled={entry.quantity <= 1}
          className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-xs text-slate-300 transition-colors hover:bg-slate-600 disabled:opacity-30"
        >
          -
        </button>
        <span className="w-6 text-center text-xs text-slate-300">{entry.quantity}</span>
        <button
          onClick={() => onUpdateQty(entry.id, entry.quantity + 1)}
          className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-xs text-slate-300 transition-colors hover:bg-slate-600"
        >
          +
        </button>
      </div>

      <button
        onClick={() => onRemove(entry.id)}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
        title="Remove"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
