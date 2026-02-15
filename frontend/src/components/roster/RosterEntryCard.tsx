import type { RosterEntry } from '../../stores/rosterStore.ts';
import { SLOT_STRIPE_COLORS } from '../../types/index.ts';

interface Props {
  entry: RosterEntry;
  onRemove: (id: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
}

export default function RosterEntryCard({ entry, onRemove, onUpdateQty }: Props) {
  const modelMin = entry.modelMin ?? 1;
  const modelMax = entry.modelMax ?? null;
  const atMin = entry.quantity <= modelMin;
  const atMax = modelMax !== null && entry.quantity >= modelMax;
  const isFixed = modelMax !== null && modelMin === modelMax;
  const perModel = entry.quantity > 0 ? Math.round(entry.totalCost / entry.quantity) : 0;

  const stripe = SLOT_STRIPE_COLORS[entry.category] ?? 'border-l-edge-500';

  return (
    <div className={`group flex items-center gap-2 rounded-sm border-l-2 ${stripe} bg-plate-800/20 px-2.5 py-1.5 transition-colors hover:bg-plate-800/40`}>
      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-text-primary">{entry.name}</p>
        <div className="flex items-center gap-2">
          <span className="font-data text-[9px] tabular-nums text-gold-500/70">{entry.totalCost} pts</span>
          {entry.quantity > 1 && (
            <span className="font-data text-[8px] tabular-nums text-text-dim">({perModel}/model)</span>
          )}
        </div>
      </div>

      {/* Quantity */}
      {isFixed ? (
        <span className="font-data text-[10px] tabular-nums text-text-dim">{entry.quantity}</span>
      ) : (
        <div className="flex items-center gap-px">
          <button
            onClick={() => !atMin && onUpdateQty(entry.id, entry.quantity - 1)}
            disabled={atMin}
            className="flex h-5 w-5 items-center justify-center rounded-sm border border-edge-600/30 bg-plate-700/40 text-[10px] text-text-secondary transition-colors hover:border-edge-400/50 hover:text-text-primary disabled:opacity-15"
          >
            -
          </button>
          <span className="font-data min-w-[1.75rem] text-center text-[10px] tabular-nums text-text-secondary">
            {entry.quantity}
            {modelMax !== null && (
              <span className="text-text-dim">/{modelMax}</span>
            )}
          </span>
          <button
            onClick={() => !atMax && onUpdateQty(entry.id, entry.quantity + 1)}
            disabled={atMax}
            className="flex h-5 w-5 items-center justify-center rounded-sm border border-edge-600/30 bg-plate-700/40 text-[10px] text-text-secondary transition-colors hover:border-edge-400/50 hover:text-text-primary disabled:opacity-15"
          >
            +
          </button>
        </div>
      )}

      {/* Remove */}
      <button
        onClick={() => onRemove(entry.id)}
        className="flex h-4 w-4 items-center justify-center text-text-dim opacity-0 transition-all hover:text-danger group-hover:opacity-100"
        title="Remove"
      >
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
