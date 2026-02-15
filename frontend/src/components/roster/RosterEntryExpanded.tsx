import { useState, useCallback, useMemo } from 'react';
import type { RosterEntry } from '../../stores/rosterStore.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUnitUpgrades } from '../../api/units.ts';
import { useUpdateEntry } from '../../api/rosters.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import type { Upgrade } from '../../types/index.ts';
import UpgradeList from '../units/UpgradeList.tsx';
import client from '../../api/client.ts';

interface Props {
  entry: RosterEntry;
  detachmentId: number;
  onClose: () => void;
}

export default function RosterEntryExpanded({ entry, detachmentId, onClose }: Props) {
  const { data: upgradeData, isLoading } = useUnitUpgrades(entry.unitId);
  const groups = useMemo(() => upgradeData?.groups ?? [], [upgradeData?.groups]);
  const ungrouped = useMemo(() => upgradeData?.ungrouped ?? [], [upgradeData?.ungrouped]);

  const allUpgrades = useMemo(
    () => [...ungrouped, ...groups.flatMap((g) => g.upgrades)],
    [ungrouped, groups],
  );

  // Build bs_id → db id map for restoring selection from entry.upgrades
  const bsIdToDbId = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of allUpgrades) {
      map.set(u.bs_id, u.id);
    }
    return map;
  }, [allUpgrades]);

  // Initialize selected from entry's current upgrades
  const initialSelected = useMemo(() => {
    const set = new Set<number>();
    for (const u of entry.upgrades) {
      const dbId = bsIdToDbId.get(u.upgrade_id);
      if (dbId !== undefined) set.add(dbId);
    }
    return set;
  }, [entry.upgrades, bsIdToDbId]);

  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(initialSelected);

  const { rosterId, updateEntry, syncFromResponse } = useRosterStore();
  const updateMutation = useUpdateEntry(rosterId, detachmentId);
  const addToast = useUIStore((s) => s.addToast);

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
            for (const u of group.upgrades) next.delete(u.id);
          }
        }
        next.add(id);
      }
      return next;
    });
  }, [upgradeGroupMap, groups]);

  const upgradeCost = allUpgrades
    .filter((u: Upgrade) => selectedUpgrades.has(u.id))
    .reduce((sum: number, u: Upgrade) => sum + u.cost, 0);
  const perModelCost = entry.baseCost + upgradeCost;
  const projectedTotal = perModelCost * entry.quantity;

  // Check if selection has changed
  const hasChanged = useMemo(() => {
    if (selectedUpgrades.size !== initialSelected.size) return true;
    for (const id of selectedUpgrades) {
      if (!initialSelected.has(id)) return true;
    }
    return false;
  }, [selectedUpgrades, initialSelected]);

  function handleSave() {
    if (!rosterId) return;

    // Validate required groups
    for (const group of groups) {
      if (group.min_quantity > 0) {
        const count = group.upgrades.filter((u) => selectedUpgrades.has(u.id)).length;
        if (count < group.min_quantity) {
          addToast(`"${group.group_name}" requires at least ${group.min_quantity} selection(s)`, 'error');
          return;
        }
      }
    }

    const selectedObjects = allUpgrades.filter((u: Upgrade) => selectedUpgrades.has(u.id));
    const upgradesList = selectedObjects.map((u: Upgrade) => ({ upgrade_id: u.bs_id, quantity: 1 }));
    const upgradeNames = selectedObjects.map((u: Upgrade) => u.name);

    updateMutation.mutate(
      { entryId: entry.id, upgrades: upgradesList },
      {
        onSuccess: (data) => {
          updateEntry(detachmentId, entry.id, {
            upgrades: upgradesList,
            upgradeNames,
            upgradeCost,
            totalCost: data.total_cost,
          });
          addToast(`${entry.name} updated`);
          onClose();
          if (rosterId) {
            client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
              syncFromResponse(resp);
            });
          }
        },
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
          addToast(err?.response?.data?.detail ?? 'Failed to update', 'error');
        },
      },
    );
  }

  return (
    <div className="animate-slide-down border-t border-edge-700/20 px-3 py-3 space-y-3">
      <UpgradeList
        groups={groups}
        ungrouped={ungrouped}
        selected={selectedUpgrades}
        onToggle={toggleUpgrade}
        loading={isLoading}
        modelCount={entry.quantity}
      />

      {/* Footer: projected cost + save/cancel */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="font-data text-sm font-medium tabular-nums text-gold-300">
            {projectedTotal}
          </span>
          <span className="ml-1 text-xs text-text-dim">pts</span>
          {entry.quantity > 1 && (
            <span className="ml-2 font-data text-[11px] text-text-dim">
              ({perModelCost}/model)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="font-label rounded-sm border border-edge-600/30 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-text-dim uppercase transition-colors hover:text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanged || updateMutation.isPending}
            className="font-label rounded-sm bg-gold-600 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-white uppercase transition-all hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-25"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
