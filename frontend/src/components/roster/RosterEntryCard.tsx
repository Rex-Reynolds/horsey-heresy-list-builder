import type { RosterEntry } from '../../stores/rosterStore.ts';
import { SLOT_STRIPE_COLORS } from '../../types/index.ts';

interface Props {
  entry: RosterEntry;
  onRemove: (id: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
  isNew?: boolean;
}

export default function RosterEntryCard({ entry, onRemove, onUpdateQty, isNew }: Props) {
  const modelMin = entry.modelMin ?? 1;
  const modelMax = entry.modelMax ?? null;
  const atMin = entry.quantity <= modelMin;
  const atMax = modelMax !== null && entry.quantity >= modelMax;
  const isFixed = modelMax !== null && modelMin === modelMax;
  const perModel = entry.quantity > 0 ? Math.round(entry.totalCost / entry.quantity) : 0;

  const stripe = SLOT_STRIPE_COLORS[entry.category] ?? 'border-l-edge-500';

  return (
    <div className={`group flex items-center gap-2.5 rounded-sm border-l-2 ${stripe} bg-plate-800/20 px-3 py-2 transition-all hover:bg-plate-800/40 ${isNew ? 'animate-entry-flash' : ''}`}>
      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text-primary">{entry.name}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-data text-xs font-medium tabular-nums text-gold-500/80">{entry.totalCost} pts</span>
          {entry.quantity > 1 && (
            <span className="font-data text-[10px] tabular-nums text-text-dim">({perModel}/model)</span>
          )}
        </div>
        {/* Upgrade names — shown when available */}
        {entry.upgradeNames && entry.upgradeNames.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.upgradeNames.map((name, i) => (
              <span key={i} className="rounded-sm border border-edge-700/20 bg-plate-700/30 px-1.5 py-px text-[10px] text-text-dim">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quantity — models stepper */}
      {isFixed ? (
        <span className="font-data text-xs tabular-nums text-text-dim" title={`${entry.quantity} models (fixed)`}>
          {entry.quantity}
        </span>
      ) : (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => !atMin && onUpdateQty(entry.id, entry.quantity - 1)}
            disabled={atMin}
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-edge-600/30 bg-plate-700/40 text-sm text-text-secondary transition-colors hover:border-edge-400/50 hover:text-text-primary disabled:opacity-15"
            title={atMin ? `Minimum ${modelMin} models` : `Remove model (-${perModel} pts)`}
          >
            -
          </button>
          <div className="flex min-w-[3rem] flex-col items-center px-1">
            <span className="font-data text-xs tabular-nums text-text-secondary leading-tight">
              {entry.quantity}
            </span>
            <span className="text-[9px] text-text-dim leading-tight">
              {modelMax !== null ? `of ${modelMax}` : 'models'}
            </span>
          </div>
          <button
            onClick={() => !atMax && onUpdateQty(entry.id, entry.quantity + 1)}
            disabled={atMax}
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-edge-600/30 bg-plate-700/40 text-sm text-text-secondary transition-colors hover:border-edge-400/50 hover:text-text-primary disabled:opacity-15"
            title={atMax ? `Maximum ${modelMax} models` : `Add model (+${perModel} pts)`}
          >
            +
          </button>
        </div>
      )}

      {/* Remove */}
      <button
        onClick={() => onRemove(entry.id)}
        className="flex h-5 w-5 items-center justify-center text-text-dim opacity-0 transition-all hover:text-danger group-hover:opacity-100"
        title="Remove"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
