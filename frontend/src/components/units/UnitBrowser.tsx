import { useState } from 'react';
import { useUnits } from '../../api/units.ts';
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

  const { data: units = [], isLoading, error } = useUnits(
    category ?? undefined,
    search || undefined,
  );

  return (
    <div className="space-y-4">
      <CategoryFilter selected={category} onChange={setCategory} />
      <SearchInput value={search} onChange={setSearch} />

      {isLoading && <LoadingSpinner />}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">
          Failed to load units. Is the API server running?
        </div>
      )}

      {!isLoading && !error && units.length === 0 && (
        <EmptyState message="No units found" icon="🔍" />
      )}

      {!isLoading && !error && units.length > 0 && (
        <p className="text-xs text-slate-500">{units.length} unit{units.length !== 1 ? 's' : ''}</p>
      )}

      <div className="space-y-2">
        {units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            expanded={expandedId === unit.id}
            onClick={() => setExpandedId(expandedId === unit.id ? null : unit.id)}
          >
            <UnitDetail unit={unit} />
          </UnitCard>
        ))}
      </div>
    </div>
  );
}
