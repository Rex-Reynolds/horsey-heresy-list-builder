/**
 * Inline unit suggestions for empty required slots.
 * Shows 2-3 cheapest available units for the slot category.
 */
import { useMemo } from 'react';
import { useUnits } from '../../api/units.ts';
import type { Unit } from '../../types/index.ts';

interface Props {
  /** The native HH3 slot name (e.g., "Troops", "Armour") */
  slotName: string;
  /** Callback when a suggestion is clicked — filters the unit browser */
  onBrowse: () => void;
}

export default function SlotSuggestions({ slotName, onBrowse }: Props) {
  // Use the base slot name (strip restriction suffix) for category lookup
  const baseName = slotName.includes(' - ') ? slotName.split(' - ', 1)[0].trim() : slotName;

  // Fetch all units (cached) and filter locally
  const { data: allUnits = [] } = useUnits();

  const suggestions = useMemo(() => {
    const matching = allUnits
      .filter((u: Unit) => u.unit_type === baseName)
      .sort((a: Unit, b: Unit) => a.base_cost - b.base_cost);
    return matching.slice(0, 3);
  }, [allUnits, baseName]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-1 mb-1 ml-1">
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-label text-[9px] tracking-wider text-text-dim/50 uppercase mr-0.5">
          Try:
        </span>
        {suggestions.map((unit: Unit) => (
          <button
            key={unit.id}
            onClick={onBrowse}
            className="inline-flex items-center gap-1 rounded-sm border border-edge-600/20 bg-plate-700/25 px-2 py-0.5 transition-all hover:border-gold-600/25 hover:bg-gold-900/10"
          >
            <span className="text-[10px] text-text-secondary/80 truncate max-w-[120px]">
              {unit.name}
            </span>
            <span className="font-data text-[9px] tabular-nums text-gold-500/60">
              {unit.base_cost}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
