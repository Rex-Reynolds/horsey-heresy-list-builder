import { useState, useMemo, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useUnits } from '../../api/units.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { useUnitAvailability } from '../../hooks/useUnitAvailability.ts';
import client from '../../api/client.ts';
import type { Unit } from '../../types/index.ts';
import { NATIVE_TO_DISPLAY_GROUP } from '../../types/index.ts';
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

  const { rosterId, detachments, addEntry, syncFromResponse } = useRosterStore();
  const addToast = useUIStore((s) => s.addToast);
  const setNewEntryId = useUIStore((s) => s.setNewEntryId);
  const getAvailability = useUnitAvailability();

  // React to slot-click filter from roster panel
  const slotFilter = useUIStore((s) => s.slotFilter);
  const setSlotFilter = useUIStore((s) => s.setSlotFilter);
  useEffect(() => {
    if (slotFilter) {
      setCategory(slotFilter);
      setAvailableOnly(true);
      setSlotFilter(null); // Consume the filter
    }
  }, [slotFilter, setSlotFilter]);

  const { data: units = [], isLoading, error } = useUnits(
    category ?? undefined,
    search || undefined,
  );

  // Fetch all units (no filter) for category counts — TanStack Query caches this
  const { data: allUnits = [] } = useUnits();
  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allUnits.length };
    for (const u of allUnits) {
      const group = NATIVE_TO_DISPLAY_GROUP[u.unit_type];
      if (group) counts[group] = (counts[group] ?? 0) + 1;
    }
    return counts;
  }, [allUnits]);

  const hasDetachments = !!rosterId && detachments.length > 0;

  const displayUnits = useMemo(() => {
    if (!hasDetachments) return units.map((u) => ({ unit: u, availability: undefined as ReturnType<typeof getAvailability> | undefined }));
    return units
      .map((u) => ({ unit: u, availability: getAvailability(u.unit_type, u.name, u.id, u.constraints) }))
      .filter((item) => !availableOnly || item.availability!.status === 'addable');
  }, [units, hasDetachments, getAvailability, availableOnly]);

  // Quick-add mutation
  const quickAddMutation = useMutation({
    mutationFn: async ({ detId, unitId, quantity }: { detId: number; unitId: number; quantity: number }) => {
      const { data } = await client.post(`/api/rosters/${rosterId}/detachments/${detId}/entries`, {
        unit_id: unitId,
        quantity,
        upgrades: [],
      });
      return data;
    },
  });

  const handleQuickAdd = useCallback((unit: Unit, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rosterId || quickAddMutation.isPending) return;
    const availability = getAvailability(unit.unit_type, unit.name, unit.id, unit.constraints);
    if (availability.status !== 'addable') return;
    const det = availability.openDetachments[0];
    if (!det) return;

    const quantity = Math.max(unit.model_min, 1);
    quickAddMutation.mutate(
      { detId: det.id, unitId: unit.id, quantity },
      {
        onSuccess: (data) => {
          addEntry(det.id, {
            id: data.id,
            unitId: unit.id,
            name: unit.name,
            category: unit.unit_type,
            baseCost: unit.base_cost,
            upgrades: [],
            upgradeNames: [],
            upgradeCost: 0,
            quantity,
            totalCost: data.total_cost,
            modelMin: unit.model_min,
            modelMax: unit.model_max ?? null,
          });
          addToast(`${unit.name} added`);
          setNewEntryId(data.id);
          client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
            syncFromResponse(resp);
          });
        },
        onError: (err: any) => {
          addToast(err?.response?.data?.detail ?? 'Failed to add', 'error');
        },
      },
    );
  }, [rosterId, quickAddMutation, getAvailability, addEntry, addToast, setNewEntryId, syncFromResponse]);

  return (
    <div className="mx-auto max-w-4xl space-y-3.5 2xl:max-w-6xl">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-imperial heading-imperial text-sm">Unit Compendium</h2>
        {!isLoading && !error && displayUnits.length > 0 && (
          <span className="font-data text-[11px] tabular-nums text-text-dim">
            {displayUnits.length} unit{displayUnits.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="space-y-2.5">
        <CategoryFilter selected={category} onChange={setCategory} counts={unitCounts} />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} />
          </div>
          {hasDetachments && (
            <button
              onClick={() => setAvailableOnly((v) => !v)}
              className={`font-label shrink-0 rounded-sm border px-2.5 py-2 text-[11px] font-semibold tracking-wider uppercase transition-all ${
                availableOnly
                  ? 'border-valid/25 bg-valid/6 text-valid shadow-[0_0_6px_rgba(56,178,96,0.06)]'
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
        <div className="rounded-sm border border-danger/20 bg-danger/5 p-3.5 text-sm text-danger">
          Failed to load units. Is the API server running?
        </div>
      )}

      {!isLoading && !error && displayUnits.length === 0 && (
        <EmptyState message={availableOnly ? 'No available units in this category' : 'No units found'} icon="🔍" />
      )}

      <div className="stagger-list grid grid-cols-1 gap-1.5 2xl:grid-cols-2">
        {displayUnits.map(({ unit, availability }) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            expanded={expandedId === unit.id}
            onClick={() => setExpandedId(expandedId === unit.id ? null : unit.id)}
            availability={availability?.status}
            onQuickAdd={hasDetachments && availability?.status === 'addable' ? handleQuickAdd : undefined}
          >
            <UnitDetail unit={unit} />
          </UnitCard>
        ))}
      </div>
    </div>
  );
}
