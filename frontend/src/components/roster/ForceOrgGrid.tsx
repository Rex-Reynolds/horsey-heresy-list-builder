import type { SlotStatus } from '../../types/index.ts';
import { SLOT_FILL_COLORS } from '../../types/index.ts';

interface Props {
  slots: [string, SlotStatus][];
  onSlotClick?: (slotName: string, filled: number, max: number) => void;
}

export default function ForceOrgGrid({ slots, onSlotClick }: Props) {
  if (slots.length === 0) return null;

  return (
    <div className="force-org-grid grid grid-cols-2 gap-1.5 px-3.5 py-2.5 border-t border-edge-700/15">
      {slots.map(([name, status]) => {
        const isFull = status.filled >= status.max;
        const isOverfilled = status.filled > status.max;
        const isUnderMin = status.filled < status.min && status.min > 0;
        const isEmpty = status.filled === 0;
        const hasFiniteMax = status.max > 0 && status.max < 999;
        const isClickable = !!onSlotClick && !isFull;
        const isRequired = status.min > 0 && isEmpty;

        const fillPct = hasFiniteMax
          ? Math.min((status.filled / status.max) * 100, 100)
          : 0;

        const baseName = name.includes(' - ') ? name.split(' - ', 1)[0].trim() : name;
        const slotColor = SLOT_FILL_COLORS[baseName] ?? 'bg-edge-400/70';

        const borderColor = isOverfilled
          ? 'border-danger/40'
          : isUnderMin && !isEmpty
            ? 'border-caution/30'
            : isFull
              ? 'border-valid/20'
              : isRequired
                ? 'border-dashed border-caution/20'
                : isEmpty && isClickable
                  ? 'border-dashed border-edge-500/25'
                  : 'border-edge-600/15';

        return (
          <button
            key={name}
            type="button"
            onClick={isClickable ? () => onSlotClick!(name, status.filled, status.max) : undefined}
            disabled={!isClickable}
            className={`relative overflow-hidden rounded-sm border px-2.5 py-2 text-left transition-all ${borderColor} ${
              isClickable
                ? 'cursor-pointer hover:border-gold-600/25 hover:bg-plate-700/20'
                : ''
            } ${isEmpty && isClickable ? 'bg-transparent' : 'bg-plate-800/15'} ${
              isRequired ? 'animate-pulse-glow' : ''
            }`}
          >
            {/* Fill bar background */}
            {hasFiniteMax && fillPct > 0 && (
              <div
                className={`absolute inset-y-0 left-0 opacity-15 transition-all duration-300 ${
                  isOverfilled ? 'bg-danger' : isFull ? 'bg-valid' : slotColor
                }`}
                style={{ width: `${fillPct}%` }}
              />
            )}

            <div className="relative flex items-center justify-between gap-1.5">
              <span className={`font-label text-[11px] font-semibold tracking-wide uppercase truncate ${
                isRequired ? 'text-caution/70' : isEmpty ? 'text-text-dim/60' : 'text-text-secondary'
              }`}>
                {name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {/* Filled dots — larger */}
                {hasFiniteMax && status.max <= 6 ? (
                  <div className="flex gap-1">
                    {Array.from({ length: status.max }, (_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          i < status.filled
                            ? isOverfilled
                              ? 'bg-danger'
                              : isFull
                                ? 'bg-valid/80'
                                : slotColor.replace('/70', '')
                            : 'bg-edge-600/30'
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className={`font-data text-[11px] tabular-nums ${
                    isOverfilled
                      ? 'text-danger'
                      : isFull
                        ? 'text-valid/80'
                        : isEmpty
                          ? 'text-text-dim/40'
                          : 'text-text-dim'
                  }`}>
                    {status.filled}/{status.max === 999 ? '\u221e' : status.max}
                  </span>
                )}
                {/* Plus icon for empty clickable slots */}
                {isEmpty && isClickable && (
                  <svg className="h-3 w-3 text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
