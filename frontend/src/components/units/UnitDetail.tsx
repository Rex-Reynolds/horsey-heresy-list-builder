import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Unit, Upgrade } from '../../types/index.ts';
import { useUnitUpgrades } from '../../api/units.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { useAddEntry, useAddDetachment } from '../../api/rosters.ts';
import { useUnitAvailability, findMatchingSlotKey } from '../../hooks/useUnitAvailability.ts';
import { parseProfiles, parseRules } from '../../utils/profileParser.ts';
import client from '../../api/client.ts';
import StatBlock from './StatBlock.tsx';
import UpgradeList from './UpgradeList.tsx';

interface Props {
  unit: Unit;
}

export default function UnitDetail({ unit }: Props) {
  const { data: upgradeData, isLoading: upgradesLoading } = useUnitUpgrades(unit.id);
  const groups = upgradeData?.groups ?? [];
  const ungrouped = upgradeData?.ungrouped ?? [];

  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  const { rosterId, addEntry, addDetachment, syncFromResponse } = useRosterStore();
  const [targetDetId, setTargetDetId] = useState<number | null>(null);

  const [addError, setAddError] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);
  const setNewEntryId = useUIStore((s) => s.setNewEntryId);
  const footerRef = useRef<HTMLDivElement>(null);

  const getAvailability = useUnitAvailability();
  const availability = getAvailability(unit.unit_type, unit.name, unit.id, unit.constraints);
  const { status, openDetachments, fullDetachments, unlockableDetachments, rosterLimitMessage } = availability;

  const effectiveDetId =
    targetDetId ?? (openDetachments.length === 1 ? openDetachments[0].id : null);

  const addEntryMutation = useAddEntry(rosterId, effectiveDetId);
  const addDetMutation = useAddDetachment(rosterId);

  // Scroll the add button into view after expansion animation
  useEffect(() => {
    const timer = setTimeout(() => {
      footerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 350); // After slide-down animation
    return () => clearTimeout(timer);
  }, []);

  const { statBlocks, traits } = parseProfiles(unit.profiles);
  const rules = parseRules(unit.rules);

  const upgradeGroupMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of groups) {
      for (const u of g.upgrades) {
        map.set(u.id, g.group_name);
      }
    }
    return map;
  }, [groups]);

  const toggleUpgrade = useCallback((id: number, groupName?: string) => {
    setSelectedUpgrades((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const gName = groupName ?? upgradeGroupMap.get(id);
        if (gName) {
          const group = groups.find((g) => g.group_name === gName);
          if (group && group.max_quantity === 1) {
            for (const u of group.upgrades) {
              next.delete(u.id);
            }
          }
        }
        next.add(id);
      }
      return next;
    });
  }, [upgradeGroupMap, groups]);

  const allUpgrades = useMemo(
    () => [...ungrouped, ...groups.flatMap((g) => g.upgrades)],
    [ungrouped, groups],
  );

  const upgradeCost = allUpgrades
    .filter((u: Upgrade) => selectedUpgrades.has(u.id))
    .reduce((sum: number, u: Upgrade) => sum + u.cost, 0);
  const perModelCost = unit.base_cost + upgradeCost;
  const modelCount = Math.max(unit.model_min, 1);
  const totalCost = perModelCost * modelCount;

  function handleAdd() {
    if (!rosterId || !effectiveDetId) return;

    for (const group of groups) {
      if (group.min_quantity > 0) {
        const selectedInGroup = group.upgrades.filter((u) => selectedUpgrades.has(u.id)).length;
        if (selectedInGroup < group.min_quantity) {
          setAddError(`"${group.group_name}" requires at least ${group.min_quantity} selection(s)`);
          return;
        }
      }
    }

    const selectedUpgradeObjects = allUpgrades.filter((u: Upgrade) => selectedUpgrades.has(u.id));
    const upgradesList = selectedUpgradeObjects.map((u: Upgrade) => ({ upgrade_id: u.bs_id, quantity: 1 }));
    const upgradeNames = selectedUpgradeObjects.map((u: Upgrade) => u.name);

    setAddError(null);
    addEntryMutation.mutate(
      { unit_id: unit.id, quantity: unit.model_min, upgrades: upgradesList },
      {
        onSuccess: (data) => {
          addEntry(effectiveDetId, {
            id: data.id,
            unitId: unit.id,
            name: unit.name,
            category: unit.unit_type,
            baseCost: unit.base_cost,
            upgrades: upgradesList,
            upgradeNames,
            upgradeCost,
            quantity: unit.model_min,
            totalCost: data.total_cost,
            modelMin: unit.model_min,
            modelMax: unit.model_max,
          });
          setSelectedUpgrades(new Set());
          setTargetDetId(null);
          addToast(`${unit.name} added to roster`);
          setNewEntryId(data.id);
          if (rosterId) {
            client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
              syncFromResponse(resp);
            });
          }
        },
        onError: (err: any) => {
          const detail = err?.response?.data?.detail;
          setAddError(detail ?? 'Failed to add unit');
          addToast(detail ?? 'Failed to add unit', 'error');
        },
      },
    );
  }

  function handleAddDetachment(detId: number, detType: string) {
    addDetMutation.mutate(
      { detachment_id: detId, detachment_type: detType },
      {
        onSuccess: (data) => {
          addDetachment({
            id: data.id,
            detachmentId: data.detachment_id,
            name: data.name,
            type: data.type,
            slots: data.slots,
            entries: [],
          });
          if (rosterId) {
            client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
              syncFromResponse(resp);
            });
          }
        },
      },
    );
  }

  const buttonLabel = (() => {
    if (addEntryMutation.isPending) return 'Adding...';
    if (!rosterId) return 'Create Roster First';
    if (status === 'roster_limit') return 'Roster Limit Reached';
    if (status === 'no_detachment') return 'Add Detachment First';
    if (status === 'no_slot') return 'No Matching Slot';
    if (status === 'slot_full') return 'Slots Full';
    if (status === 'addable' && !effectiveDetId) return 'Select Detachment';
    return 'Add to Roster';
  })();

  const buttonDisabled =
    !rosterId || (status !== 'addable') || !effectiveDetId || addEntryMutation.isPending;

  return (
    <div className="space-y-3.5">
      {/* Stats */}
      <StatBlock stats={statBlocks} />

      {/* Traits */}
      {traits.length > 0 && (
        <div>
          <SectionLabel>Special Rules</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {traits.map((t, i) => (
              <span key={i} className="rounded-sm border border-edge-600/30 bg-plate-700/30 px-2 py-0.5 text-xs text-text-secondary">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      {rules.length > 0 && (
        <div>
          <SectionLabel>Rules</SectionLabel>
          <div className="space-y-1">
            {rules.map((r, i) => (
              <details key={i} className="group rounded-sm border border-edge-700/30 bg-plate-800/30">
                <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors group-open:text-gold-400">
                  {r.name}
                </summary>
                {r.description && (
                  <p className="border-t border-edge-700/20 px-3 py-2.5 text-[13px] leading-relaxed text-text-dim">
                    {r.description}
                  </p>
                )}
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Upgrades */}
      <UpgradeList
        groups={groups}
        ungrouped={ungrouped}
        selected={selectedUpgrades}
        onToggle={toggleUpgrade}
        loading={upgradesLoading}
      />

      {/* Detachment picker */}
      {rosterId && status === 'addable' && openDetachments.length > 1 && (
        <div>
          <SectionLabel>Add to detachment</SectionLabel>
          <select
            value={targetDetId ?? ''}
            onChange={(e) => setTargetDetId(e.target.value ? Number(e.target.value) : null)}
            className="input-imperial w-full rounded-sm px-2.5 py-2 text-[13px] text-text-primary outline-none"
          >
            <option value="">Select...</option>
            {openDetachments.map((d) => {
              const slotKey = findMatchingSlotKey(unit.unit_type, unit.name, d.slots);
              const slot = slotKey ? d.slots[slotKey] : undefined;
              const filled = slotKey
                ? d.entries.filter((e) => e.category === slotKey).length
                : 0;
              const restriction = slot?.restriction;
              return (
                <option key={d.id} value={d.id}>
                  {d.name} ({filled}/{slot?.max ?? '?'})
                  {restriction ? ` — ${restriction}` : ''}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Status messages */}
      {rosterId && status === 'roster_limit' && rosterLimitMessage && (
        <InfoPanel variant="caution">
          <p className="text-[13px] text-caution">{rosterLimitMessage}</p>
        </InfoPanel>
      )}

      {rosterId && status === 'no_slot' && (
        <InfoPanel variant="neutral">
          <p className="text-[13px] text-text-secondary">
            No detachment has a <span className="font-medium text-text-primary">{unit.unit_type}</span> slot.
          </p>
          {unlockableDetachments.length > 0 && (
            <DetachmentSuggestions
              label={`Unlock ${unit.unit_type}`}
              detachments={unlockableDetachments}
              onAdd={handleAddDetachment}
              loading={addDetMutation.isPending}
            />
          )}
        </InfoPanel>
      )}

      {rosterId && status === 'slot_full' && (
        <InfoPanel variant="caution">
          <p className="text-[13px] text-caution">
            All {unit.unit_type} slots are full.
          </p>
          <div className="space-y-0.5">
            {fullDetachments.map((d) => {
              const slotKey = findMatchingSlotKey(unit.unit_type, unit.name, d.slots);
              const slot = slotKey ? d.slots[slotKey] : undefined;
              const filled = slotKey
                ? d.entries.filter((e) => e.category === slotKey).length
                : 0;
              return (
                <p key={d.id} className="font-data text-[11px] text-text-dim">
                  {d.name}: {slotKey ?? unit.unit_type} {filled}/{slot?.max ?? '?'}
                </p>
              );
            })}
          </div>
          {unlockableDetachments.length > 0 && (
            <DetachmentSuggestions
              label="Add more slots"
              detachments={unlockableDetachments}
              onAdd={handleAddDetachment}
              loading={addDetMutation.isPending}
            />
          )}
        </InfoPanel>
      )}

      {rosterId && status === 'no_detachment' && (
        <InfoPanel variant="neutral">
          <p className="text-[13px] text-text-secondary">Add a detachment to start building your roster.</p>
          {unlockableDetachments.length > 0 && (
            <DetachmentSuggestions
              label={`Detachments with ${unit.unit_type}`}
              detachments={unlockableDetachments}
              onAdd={handleAddDetachment}
              loading={addDetMutation.isPending}
            />
          )}
        </InfoPanel>
      )}

      {/* Error */}
      {addError && (
        <p className="text-[13px] text-danger">{addError}</p>
      )}

      {/* Add footer */}
      <div ref={footerRef} className="flex items-center justify-between border-t border-edge-700/30 pt-3">
        <div>
          <span className="font-data text-base font-medium tabular-nums text-gold-300">
            {totalCost}
          </span>
          <span className="ml-1 text-xs text-text-dim">pts</span>
          {modelCount > 1 && (
            <span className="ml-2 font-data text-[11px] text-text-dim">
              ({perModelCost}/model &times; {modelCount})
            </span>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={buttonDisabled}
          className={`font-label rounded-sm px-5 py-2 text-xs font-semibold tracking-wider uppercase transition-all disabled:cursor-not-allowed disabled:opacity-25 ${
            status === 'addable'
              ? 'bg-gold-600 text-white hover:bg-gold-500'
              : status === 'slot_full'
                ? 'bg-plate-700 text-caution'
                : 'bg-plate-700 text-text-dim'
          }`}
        >
          {buttonLabel}
        </button>
      </div>
      {!rosterId && (
        <p className="text-xs text-text-dim">Create a roster first to add units.</p>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-label mb-1.5 text-[11px] font-semibold tracking-wider text-text-dim uppercase">
      {children}
    </h4>
  );
}

function InfoPanel({ children, variant }: { children: React.ReactNode; variant: 'neutral' | 'caution' }) {
  return (
    <div className={`space-y-2 rounded-sm border p-3 ${
      variant === 'caution'
        ? 'border-caution/15 bg-caution/4'
        : 'border-edge-600/30 bg-plate-700/20'
    }`}>
      {children}
    </div>
  );
}

function DetachmentSuggestions({
  label,
  detachments,
  onAdd,
  loading,
}: {
  label: string;
  detachments: Array<{ id: number; name: string; type: string }>;
  onAdd: (id: number, type: string) => void;
  loading: boolean;
}) {
  return (
    <div>
      <p className="font-label mb-1.5 text-[11px] font-semibold tracking-wider text-text-dim uppercase">
        {label}
      </p>
      <div className="space-y-1">
        {detachments.map((d) => (
          <div key={d.id} className="flex items-center justify-between border border-edge-700/20 bg-plate-800/40 px-2.5 py-1.5">
            <span className="text-[13px] text-text-secondary">
              {d.name}
              <span className="ml-1 text-text-dim">({d.type})</span>
            </span>
            <button
              onClick={() => onAdd(d.id, d.type)}
              disabled={loading}
              className="font-label shrink-0 rounded-sm bg-gold-600/70 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white uppercase transition-all hover:bg-gold-500 disabled:opacity-30"
            >
              + Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
