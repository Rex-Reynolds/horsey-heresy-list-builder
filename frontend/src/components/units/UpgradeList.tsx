import type { Upgrade } from '../../types/index.ts';

interface Props {
  upgrades: Upgrade[];
  selected: Set<number>;
  onToggle: (upgradeId: number) => void;
  loading?: boolean;
}

export default function UpgradeList({ upgrades, selected, onToggle, loading }: Props) {
  if (loading) {
    return <p className="py-2 text-xs text-slate-500">Loading upgrades...</p>;
  }
  if (upgrades.length === 0) {
    return <p className="py-2 text-xs text-slate-500">No upgrades available</p>;
  }

  const totalCost = upgrades
    .filter((u) => selected.has(u.id))
    .reduce((sum, u) => sum + u.cost, 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-slate-400">Upgrades</h4>
        {totalCost > 0 && (
          <span className="text-xs text-gold-400">+{totalCost} pts</span>
        )}
      </div>
      {upgrades.map((u) => (
        <label
          key={u.id}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-slate-700/50"
        >
          <input
            type="checkbox"
            checked={selected.has(u.id)}
            onChange={() => onToggle(u.id)}
            className="accent-gold-500"
          />
          <span className="flex-1 text-slate-300">{u.name}</span>
          {u.cost > 0 && <span className="text-slate-500">+{u.cost} pts</span>}
        </label>
      ))}
    </div>
  );
}
