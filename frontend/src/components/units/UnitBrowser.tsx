import { useState, useMemo } from 'react';
import { useUnits } from '../../api/units.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUnitAvailability } from '../../hooks/useUnitAvailability.ts';
import CategoryFilter from '../common/CategoryFilter.tsx';
import SearchInput from '../common/SearchInput.tsx';
import LoadingSpinner from '../common/LoadingSpinner.tsx';
import EmptyState from '../common/EmptyState.tsx';
import UnitCard from './UnitCard.tsx';
import UnitDetail from './UnitDetail.tsx';

export default function UnitBrowser() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  const { rosterId, detachments } = useRosterStore();
  const getAvailability = useUnitAvailability();

  const { data: units = [], isLoading, error } = useUnits(
    category ?? undefined,
    search || undefined,
  );

  const hasDetachments = !!rosterId && detachments.length > 0;

  const displayUnits = useMemo(() => {
    if (!hasDetachments) return units.map((u) => ({ unit: u, availability: undefined as ReturnType<typeof getAvailability> | undefined }));
    return units
      .map((u) => ({ unit: u, availability: getAvailability(u.unit_type, u.name, u.id, u.constraints) }))
      .filter((item) => !availableOnly || item.availability!.status === 'addable');
  }, [units, hasDetachments, getAvailability, availableOnly]);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-imperial text-xs">Unit Compendium</h2>
        {!isLoading && !error && displayUnits.length > 0 && (
          <span className="font-data text-[9px] tabular-nums text-text-dim">
            {displayUnits.length} unit{displayUnits.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="space-y-2">
        <CategoryFilter selected={category} onChange={setCategory} />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} />
          </div>
          {hasDetachments && (
            <button
              onClick={() => setAvailableOnly((v) => !v)}
              className={`font-label shrink-0 rounded-sm border px-2 py-1.5 text-[9px] font-semibold tracking-wider uppercase transition-all ${
                availableOnly
                  ? 'border-valid/25 bg-valid/6 text-valid'
                  : 'border-edge-600/40 text-text-dim hover:text-text-secondary'
              }`}
            >
              Available
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading && <LoadingSpinner />}

      {error && (
        <div className="rounded-sm border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
          Failed to load units. Is the API server running?
        </div>
      )}

      {!isLoading && !error && displayUnits.length === 0 && (
        <EmptyState message={availableOnly ? 'No available units in this category' : 'No units found'} icon="🔍" />
      )}

      <div className="stagger-list space-y-1">
        {displayUnits.map(({ unit, availability }) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            expanded={expandedId === unit.id}
            onClick={() => setExpandedId(expandedId === unit.id ? null : unit.id)}
            availability={availability?.status}
          >
            <UnitDetail unit={unit} />
          </UnitCard>
        ))}
      </div>
    </div>
  );
}
