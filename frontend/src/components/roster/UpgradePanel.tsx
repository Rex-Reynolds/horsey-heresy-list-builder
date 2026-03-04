import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUnitUpgrades } from '../../api/units.ts';
import { useUpdateEntry } from '../../api/rosters.ts';
import type { Upgrade } from '../../types/index.ts';
import UpgradeList from '../units/UpgradeList.tsx';
import client from '../../api/client.ts';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

export default function UpgradePanel() {
  const panelEntry = useUIStore((s) => s.upgradePanelEntry);
  const closePanel = useUIStore((s) => s.closeUpgradePanel);
  const addToast = useUIStore((s) => s.addToast);

  const rosterId = useRosterStore((s) => s.rosterId);
  const detachments = useRosterStore((s) => s.detachments);
  const updateEntry = useRosterStore((s) => s.updateEntry);
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse);

  // Find the entry
  const detachment = panelEntry ? detachments.find((d) => d.id === panelEntry.detachmentId) : null;
  const entry = detachment?.entries.find((e) => e.id === panelEntry?.entryId);

  const unitId = entry?.unitId ?? null;
  const { data: upgradeData, isLoading } = useUnitUpgrades(unitId);
  const groups = useMemo(() => upgradeData?.groups ?? [], [upgradeData?.groups]);
  const ungrouped = useMemo(() => upgradeData?.ungrouped ?? [], [upgradeData?.ungrouped]);

  const allUpgrades = useMemo(
    () => [...ungrouped, ...groups.flatMap((g) => g.upgrades)],
    [ungrouped, groups],
  );

  // Build bs_id → db id map
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
    if (!entry) return set;
    for (const u of entry.upgrades) {
      const dbId = bsIdToDbId.get(u.upgrade_id);
      if (dbId !== undefined) set.add(dbId);
    }
    return set;
  }, [entry, bsIdToDbId]);

  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());

  // Reset selected when entry changes
  useEffect(() => {
    setSelectedUpgrades(initialSelected);
  }, [initialSelected]);

  const trapRef = useFocusTrap(!!panelEntry);

  const detachmentId = panelEntry?.detachmentId ?? 0;
  const updateMutation = useUpdateEntry(rosterId, detachmentId);

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

  // Cost calculations
  const upgradeCost = allUpgrades
    .filter((u: Upgrade) => selectedUpgrades.has(u.id))
    .reduce((sum: number, u: Upgrade) => sum + u.cost, 0);
  const baseCost = entry?.baseCost ?? 0;
  const quantity = entry?.quantity ?? 1;
  const perModelCost = baseCost + upgradeCost;
  const projectedTotal = perModelCost * quantity;
  const currentTotal = entry?.totalCost ?? 0;
  const costDelta = projectedTotal - currentTotal;

  // Check if selection has changed
  const hasChanged = useMemo(() => {
    if (selectedUpgrades.size !== initialSelected.size) return true;
    for (const id of selectedUpgrades) {
      if (!initialSelected.has(id)) return true;
    }
    return false;
  }, [selectedUpgrades, initialSelected]);

  // Esc to close
  useEffect(() => {
    if (!panelEntry) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [panelEntry, closePanel]);

  function handleSave() {
    if (!rosterId || !entry || !panelEntry) return;

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
          updateEntry(panelEntry.detachmentId, entry.id, {
            upgrades: upgradesList,
            upgradeNames,
            upgradeCost,
            totalCost: data.total_cost,
          });
          addToast(`${entry.name} updated`);
          closePanel();
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

  if (!panelEntry || !entry) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="upgrade-panel-overlay fixed inset-0 z-[70]"
        onClick={closePanel}
      />

      {/* Panel */}
      <div className="animate-upgrade-panel-in fixed z-[71] md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-md inset-0 max-md:top-0">
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Upgrades for ${entry.name}`}
          className="flex h-full flex-col bg-plate-900 border-l border-edge-700/30"
        >
          {/* Sticky header */}
          <div className="border-b border-edge-700/30 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-[14px] font-semibold tracking-[0.08em] text-ivory uppercase truncate">
                  {entry.name}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-data text-sm tabular-nums font-medium text-gold-300">
                    {projectedTotal} pts
                  </span>
                  {costDelta !== 0 && (
                    <span className={`font-data text-xs tabular-nums font-medium ${costDelta > 0 ? 'text-caution' : 'text-valid'}`}>
                      {costDelta > 0 ? '+' : ''}{costDelta}
                    </span>
                  )}
                  {quantity > 1 && (
                    <span className="font-data text-[11px] text-text-dim">
                      ({perModelCost}/model)
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closePanel}
                aria-label="Close"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text-dim transition-colors hover:text-text-secondary"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body — upgrade list */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <UpgradeList
              groups={groups}
              ungrouped={ungrouped}
              selected={selectedUpgrades}
              onToggle={toggleUpgrade}
              loading={isLoading}
              modelCount={quantity}
            />
          </div>

          {/* Sticky footer */}
          <div className="border-t border-edge-700/30 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-data text-sm font-medium tabular-nums text-gold-300">
                  {projectedTotal}
                </span>
                <span className="ml-1 text-xs text-text-dim">pts total</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closePanel}
                  className="font-label rounded-sm border border-edge-600/30 px-4 py-2 text-[11px] font-semibold tracking-wider text-text-dim uppercase transition-colors hover:text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanged || updateMutation.isPending}
                  className="font-label rounded-sm bg-gold-600 px-4 py-2 text-[11px] font-semibold tracking-wider text-white uppercase transition-all hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
