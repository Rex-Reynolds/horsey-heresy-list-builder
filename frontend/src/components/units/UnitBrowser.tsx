import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useUnits } from '../../api/units.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { useUnitAvailability } from '../../hooks/useUnitAvailability.ts';
import client from '../../api/client.ts';
import type { Unit } from '../../types/index.ts';
import { NATIVE_TO_DISPLAY_GROUP, DISPLAY_GROUP_ORDER, FILTER_COLORS } from '../../types/index.ts';
import CategoryFilter from '../common/CategoryFilter.tsx';
import SearchInput from '../common/SearchInput.tsx';
import LoadingSpinner from '../common/LoadingSpinner.tsx';
import EmptyState from '../common/EmptyState.tsx';
import UnitCard from './UnitCard.tsx';
import UnitDetail from './UnitDetail.tsx';

type SortMode = 'name' | 'cost-asc' | 'cost-desc';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'cost-asc', label: 'Cost \u2191' },
  { value: 'cost-desc', label: 'Cost \u2193' },
];

export default function UnitBrowser() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('name');

  const { rosterId, detachments, addEntry, syncFromResponse, totalPoints, pointsLimit } = useRosterStore();
  const addToast = useUIStore((s) => s.addToast);
  const setNewEntryId = useUIStore((s) => s.setNewEntryId);
  const setLastAddedInfo = useUIStore((s) => s.setLastAddedInfo);
  const getAvailability = useUnitAvailability();

  // React to slot-click filter from roster panel
  const slotFilter = useUIStore((s) => s.slotFilter);
  const setSlotFilter = useUIStore((s) => s.setSlotFilter);
  const slotFilterContext = useUIStore((s) => s.slotFilterContext);
  const setSlotFilterContext = useUIStore((s) => s.setSlotFilterContext);

  useEffect(() => {
    if (slotFilter) {
      setCategory(slotFilter); // eslint-disable-line react-hooks/set-state-in-effect -- consuming cross-store signal
      setAvailableOnly(true);
      setSlotFilter(null); // Consume the filter
    }
  }, [slotFilter, setSlotFilter]);

  function clearSlotContext() {
    setSlotFilterContext(null);
    setCategory(null);
    setAvailableOnly(false);
  }

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
    const items = !hasDetachments
      ? units.map((u) => ({ unit: u, availability: undefined as ReturnType<typeof getAvailability> | undefined }))
      : units
          .map((u) => ({ unit: u, availability: getAvailability(u.unit_type, u.name, u.id, u.constraints) }))
          .filter((item) => !availableOnly || item.availability!.status === 'addable');

    // Sort
    return items.sort((a, b) => {
      switch (sortMode) {
        case 'cost-asc': {
          const costA = a.unit.base_cost * Math.max(a.unit.model_min, 1);
          const costB = b.unit.base_cost * Math.max(b.unit.model_min, 1);
          return costA - costB || a.unit.name.localeCompare(b.unit.name);
        }
        case 'cost-desc': {
          const costA = a.unit.base_cost * Math.max(a.unit.model_min, 1);
          const costB = b.unit.base_cost * Math.max(b.unit.model_min, 1);
          return costB - costA || a.unit.name.localeCompare(b.unit.name);
        }
        default:
          return a.unit.name.localeCompare(b.unit.name);
      }
    });
  }, [units, hasDetachments, getAvailability, availableOnly, sortMode]);

  // Group units by display category for group headers (only when no filter active)
  const showGroupHeaders = !category && !search && sortMode === 'name';
  const groupedUnits = useMemo(() => {
    if (!showGroupHeaders) return null;
    const groups: { group: string; dotColor: string; items: typeof displayUnits }[] = [];
    const byGroup = new Map<string, typeof displayUnits>();

    for (const item of displayUnits) {
      const group = NATIVE_TO_DISPLAY_GROUP[item.unit.unit_type] ?? 'Other';
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group)!.push(item);
    }

    for (const group of DISPLAY_GROUP_ORDER) {
      const items = byGroup.get(group);
      if (items && items.length > 0) {
        const dotColor = FILTER_COLORS[group]?.dot ?? 'bg-edge-400';
        groups.push({ group, dotColor, items });
      }
    }

    // Any remaining
    for (const [group, items] of byGroup) {
      if (!(DISPLAY_GROUP_ORDER as readonly string[]).includes(group) && items.length > 0) {
        groups.push({ group, dotColor: 'bg-edge-400', items });
      }
    }

    return groups;
  }, [displayUnits, showGroupHeaders]);

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
          setLastAddedInfo({ unitName: unit.name, detachmentName: det.name });
          client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
            syncFromResponse(resp);
          });
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
          addToast(err?.response?.data?.detail ?? 'Failed to add', 'error');
        },
      },
    );
  }, [rosterId, quickAddMutation, getAvailability, addEntry, addToast, setNewEntryId, setLastAddedInfo, syncFromResponse]);

  // Keyboard navigation
  const listRef = useRef<HTMLDivElement>(null);
  const flatUnitIds = useMemo(() => displayUnits.map((i) => i.unit.id), [displayUnits]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!flatUnitIds.length) return;
    const currentIdx = expandedId ? flatUnitIds.indexOf(expandedId) : -1;

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      const nextIdx = currentIdx < flatUnitIds.length - 1 ? currentIdx + 1 : 0;
      setExpandedId(flatUnitIds[nextIdx]);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : flatUnitIds.length - 1;
      setExpandedId(flatUnitIds[prevIdx]);
    } else if (e.key === 'Escape') {
      setExpandedId(null);
    }
  }, [flatUnitIds, expandedId]);

  function renderUnitCard(item: { unit: Unit; availability: ReturnType<typeof getAvailability> | undefined }) {
    const { unit, availability } = item;
    return (
      <UnitCard
        key={unit.id}
        unit={unit}
        expanded={expandedId === unit.id}
        onClick={() => setExpandedId(expandedId === unit.id ? null : unit.id)}
        availability={availability?.status}
        onQuickAdd={hasDetachments && availability?.status === 'addable' ? handleQuickAdd : undefined}
        searchTerm={search}
      >
        <UnitDetail unit={unit} />
      </UnitCard>
    );
  }

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      {/* Sticky toolbar */}
      <div className="sticky-toolbar space-y-3">
        {/* Header */}
        <div className="flex items-baseline justify-between">
          <h2 className="text-imperial heading-imperial text-sm">Unit Compendium</h2>
          <div className="flex items-center gap-3">
            {rosterId && (
              <span className={`font-data text-[11px] tabular-nums ${
                pointsLimit - totalPoints < 0 ? 'text-danger' : 'text-text-dim'
              }`}>
                {pointsLimit - totalPoints} pts left
              </span>
            )}
            {!isLoading && !error && displayUnits.length > 0 && (
              <span className="font-data text-[11px] tabular-nums text-text-dim">
                {displayUnits.length} unit{displayUnits.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Slot-aware contextual banner — single-line compact */}
        {slotFilterContext && (
          <div className="flex items-center gap-2 rounded-sm border border-gold-600/20 bg-gold-900/10 px-3 py-2">
            <svg className="h-3 w-3 shrink-0 text-gold-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-display text-[11px] font-semibold tracking-wide text-gold-400 uppercase truncate">
              {slotFilterContext.detachmentName}
            </span>
            <span className="text-text-dim/30">&rsaquo;</span>
            <span className="font-label text-[11px] font-semibold tracking-wide text-text-secondary uppercase truncate">
              {slotFilterContext.slotName}
            </span>
            <span className="font-data text-[10px] tabular-nums text-text-dim shrink-0">
              {slotFilterContext.filled}/{slotFilterContext.max === 999 ? '\u221e' : slotFilterContext.max}
            </span>
            <button
              onClick={clearSlotContext}
              className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-text-dim/60 transition-colors hover:text-gold-400"
              title="Clear filter"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Category filter */}
        <CategoryFilter selected={category} onChange={(cat) => { setCategory(cat); if (!cat) setSlotFilterContext(null); }} counts={unitCounts} />

        {/* Search + sort + available */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className={`font-label h-[36px] appearance-none rounded-sm border px-2.5 pr-7 text-[11px] font-semibold tracking-wider uppercase outline-none transition-all ${
                sortMode !== 'name'
                  ? 'sort-btn-active'
                  : 'border-edge-600/40 bg-plate-800/30 text-text-dim hover:text-text-secondary'
              }`}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
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
      <div className="mt-3 outline-none" ref={listRef} tabIndex={-1} onKeyDown={handleKeyDown}>
        {isLoading && <LoadingSpinner />}

        {error && (
          <div className="rounded-sm border border-danger/20 bg-danger/5 p-3.5 text-sm text-danger">
            Failed to load units. Is the API server running?
          </div>
        )}

        {!isLoading && !error && displayUnits.length === 0 && (
          <EmptyState
            message={availableOnly ? 'No available units in this category' : 'No units found'}
            icon="search"
            actionLabel={availableOnly ? 'Show all units' : category ? 'Clear filter' : undefined}
            onAction={availableOnly ? () => setAvailableOnly(false) : category ? () => { setCategory(null); setSlotFilterContext(null); } : undefined}
          />
        )}

        {/* Grouped view with category headers */}
        {groupedUnits ? (
          <div className="space-y-1">
            {groupedUnits.map(({ group, dotColor, items }) => (
              <div key={group}>
                <div className="category-group-header mb-1.5 mt-3 first:mt-0">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <span className="font-label text-[11px] font-bold tracking-[0.12em] text-text-secondary uppercase">
                    {group}
                  </span>
                  <span className="font-data text-[10px] tabular-nums text-text-dim">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
                  {items.map(renderUnitCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="stagger-list grid grid-cols-1 gap-1.5 xl:grid-cols-2">
            {displayUnits.map(renderUnitCard)}
          </div>
        )}
      </div>
    </div>
  );
}
