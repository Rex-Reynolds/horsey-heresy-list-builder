import { useState, useCallback } from 'react';
import type { Unit, Upgrade } from '../../types/index.ts';
import { useUnitUpgrades } from '../../api/units.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useAddEntry } from '../../api/rosters.ts';
import { parseProfiles, parseRules } from '../../utils/profileParser.ts';
import StatBlock from './StatBlock.tsx';
import UpgradeList from './UpgradeList.tsx';

interface Props {
  unit: Unit;
}

export default function UnitDetail({ unit }: Props) {
  const { data: upgrades = [], isLoading: upgradesLoading } = useUnitUpgrades(unit.id);
  const [selectedUpgrades, setSelectedUpgrades] = useState<Set<number>>(new Set());
  const { rosterId, addEntry } = useRosterStore();
  const addEntryMutation = useAddEntry(rosterId);

  const { statBlocks, traits } = parseProfiles(unit.profiles);
  const rules = parseRules(unit.rules);

  const toggleUpgrade = useCallback((id: number) => {
    setSelectedUpgrades((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const upgradeCost = upgrades
    .filter((u: Upgrade) => selectedUpgrades.has(u.id))
    .reduce((sum: number, u: Upgrade) => sum + u.cost, 0);
  const totalCost = unit.base_cost + upgradeCost;

  function handleAdd() {
    if (!rosterId) return;

    const upgradesList = upgrades
      .filter((u: Upgrade) => selectedUpgrades.has(u.id))
      .map((u: Upgrade) => ({ upgrade_id: u.bs_id, quantity: 1 }));

    addEntryMutation.mutate(
      { unit_id: unit.id, quantity: 1, upgrades: upgradesList },
      {
        onSuccess: (data) => {
          addEntry({
            id: data.id,
            unitId: unit.id,
            name: unit.name,
            category: unit.unit_type,
            baseCost: unit.base_cost,
            upgrades: upgradesList,
            upgradeCost,
            quantity: 1,
            totalCost: data.total_cost,
          });
          setSelectedUpgrades(new Set());
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      {/* Stat blocks */}
      <StatBlock stats={statBlocks} />

      {/* Traits */}
      {traits.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-slate-400">Special Rules</h4>
          <div className="flex flex-wrap gap-1">
            {traits.map((t, i) => (
              <span key={i} className="rounded bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      {rules.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium text-slate-400">Rules</h4>
          <div className="space-y-1">
            {rules.map((r, i) => (
              <details key={i} className="group rounded bg-slate-700/40 px-2 py-1">
                <summary className="cursor-pointer text-xs font-medium text-slate-300 group-open:text-gold-400">
                  {r.name}
                </summary>
                {r.description && (
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{r.description}</p>
                )}
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Upgrades */}
      <UpgradeList
        upgrades={upgrades}
        selected={selectedUpgrades}
        onToggle={toggleUpgrade}
        loading={upgradesLoading}
      />

      {/* Add to roster */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-medium text-gold-300">{totalCost} pts total</span>
        <button
          onClick={handleAdd}
          disabled={!rosterId || addEntryMutation.isPending}
          className="rounded-lg bg-gold-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {addEntryMutation.isPending ? 'Adding...' : 'Add to Roster'}
        </button>
      </div>
      {!rosterId && (
        <p className="text-xs text-slate-500">Create a roster first to add units.</p>
      )}
    </div>
  );
}
