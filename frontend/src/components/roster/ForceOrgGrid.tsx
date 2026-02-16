import { useRef, useState, useEffect } from 'react';
import type { SlotStatus } from '../../types/index.ts';
import { SLOT_FILL_COLORS } from '../../types/index.ts';
import UnitTypeIcon from '../common/UnitTypeIcon.tsx';

interface Props {
  slots: [string, SlotStatus][];
  onSlotClick?: (slotName: string, filled: number, max: number) => void;
  entryNames?: Record<string, string[]>;
}

const HINT_STORAGE_KEY = 'forceOrgHintDismissed';

export default function ForceOrgGrid({ slots, onSlotClick, entryNames }: Props) {
  // Track previous fill counts to detect increases
  const prevFills = useRef<Record<string, number>>({});
  const [recentlyFilled, setRecentlyFilled] = useState<Set<string>>(new Set());
  const [hintDismissed, setHintDismissed] = useState(() => {
    try { return localStorage.getItem(HINT_STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const newFilled = new Set<string>();
    for (const [name, status] of slots) {
      const prev = prevFills.current[name] ?? 0;
      if (status.filled > prev && prev > 0) {
        newFilled.add(name);
      }
      prevFills.current[name] = status.filled;
    }
    if (newFilled.size > 0) {
      setRecentlyFilled(newFilled); // eslint-disable-line react-hooks/set-state-in-effect -- intentional flash animation
      const timer = setTimeout(() => setRecentlyFilled(new Set()), 600);
      return () => clearTimeout(timer);
    }
  }, [slots]);

  const hasClickable = !!onSlotClick && slots.some(([, s]) => s.filled < s.max);

  function handleSlotClick(name: string, filled: number, max: number) {
    if (!hintDismissed) {
      setHintDismissed(true);
      try { localStorage.setItem(HINT_STORAGE_KEY, '1'); } catch { /* noop */ }
    }
    onSlotClick?.(name, filled, max);
  }

  if (slots.length === 0) return null;

  // Compact visual summary: classic FOC circles
  const compactSlots = slots.filter(([, s]) => s.max > 0 && s.max < 999);

  return (
    <div>
      {/* Classic force org summary bar */}
      {compactSlots.length > 0 && (
        <div className="flex items-center gap-3 px-3.5 py-2 border-t border-edge-700/15 bg-plate-950/30 overflow-x-auto scrollbar-hide">
          {compactSlots.map(([name, status]) => {
            const baseName = name.includes(' - ') ? name.split(' - ', 1)[0].trim() : name;
            const slotColor = SLOT_FILL_COLORS[baseName] ?? 'bg-edge-400/70';
            const isFull = status.filled >= status.max;
            const isOver = status.filled > status.max;
            const isRequired = status.min > 0 && status.filled < status.min;
            return (
              <div key={name} className="flex items-center gap-1.5 shrink-0" title={`${baseName}: ${status.filled}/${status.max}`}>
                <span className={`font-label text-[8px] font-bold tracking-wider uppercase ${
                  isRequired ? 'text-caution/70' : isFull ? 'text-valid/60' : 'text-text-dim/50'
                }`}>
                  {baseName.slice(0, 3)}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(status.max, 8) }, (_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                        i < status.filled
                          ? isOver ? 'bg-danger' : isFull ? 'bg-valid/80' : slotColor.replace('/70', '')
                          : isRequired ? 'border border-caution/40 bg-transparent' : 'bg-edge-600/25'
                      }`}
                    />
                  ))}
                  {status.max > 8 && (
                    <span className="font-data text-[7px] text-text-dim/40 ml-0.5">+{status.max - 8}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          const unitNames = entryNames?.[name];
          const tooltipText = unitNames && unitNames.length > 0
            ? `${baseName}: ${unitNames.join(', ')}`
            : `${baseName}: ${status.filled}/${status.max}`;

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
              onClick={isClickable ? () => handleSlotClick(name, status.filled, status.max) : undefined}
              disabled={!isClickable}
              title={tooltipText}
              className={`force-org-cell-hover relative overflow-hidden rounded-sm border px-2.5 py-2 text-left transition-all ${borderColor} ${recentlyFilled.has(name) ? 'animate-slot-fill-bump' : ''} ${
                isClickable
                  ? 'cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)] hover:border-gold-600/25 hover:bg-plate-700/20'
                  : ''
              } ${isEmpty && isClickable ? 'bg-transparent' : 'bg-plate-800/15'} ${
                isRequired ? 'animate-pulse-glow' : ''
              }`}
            >
              {/* Fill bar background */}
              {hasFiniteMax && (
                <div
                  className={`absolute inset-y-0 left-0 opacity-15 transition-all duration-500 ease-out ${
                    isOverfilled ? 'bg-danger' : isFull ? 'bg-valid' : slotColor
                  }`}
                  style={{ width: `${fillPct}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-1.5">
                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <UnitTypeIcon
                    unitType={baseName}
                    className={`h-4 w-4 shrink-0 ${
                      isRequired ? 'text-caution/60' : isEmpty ? 'text-text-dim/30' : 'text-text-dim/50'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className={`font-label text-[11px] font-semibold tracking-wide uppercase block truncate ${
                      isRequired ? 'text-caution/70' : isEmpty ? 'text-text-dim/80' : 'text-text-secondary'
                    }`}>
                      {baseName}
                    </span>
                    {name !== baseName && (
                      <span className="slot-restriction block truncate uppercase mt-0.5">
                        {name.slice(baseName.length + 3).trim()}
                      </span>
                    )}
                  </div>
                </div>
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
                  {/* Browse arrow for clickable (non-full) slots */}
                  {isClickable && (
                    <svg className="h-2.5 w-2.5 text-text-dim/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {/* First-use hint */}
      {!hintDismissed && hasClickable && (
        <p className="px-3.5 pb-2 text-[9px] text-gold-500/40 text-center">Tap a slot to filter units</p>
      )}
    </div>
  );
}
