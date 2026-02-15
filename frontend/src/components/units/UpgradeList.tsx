import type { Upgrade, UpgradeGroup } from '../../types/index.ts';

interface Props {
  groups: UpgradeGroup[];
  ungrouped: Upgrade[];
  selected: Set<number>;
  onToggle: (upgradeId: number, groupName?: string) => void;
  loading?: boolean;
}

export default function UpgradeList({ groups, ungrouped, selected, onToggle, loading }: Props) {
  if (loading) {
    return <p className="py-2 text-[10px] text-text-dim">Loading upgrades...</p>;
  }
  if (groups.length === 0 && ungrouped.length === 0) {
    return <p className="py-1 text-[10px] text-text-dim">No upgrades available</p>;
  }

  const allUpgrades = [...ungrouped, ...groups.flatMap((g) => g.upgrades)];
  const totalCost = allUpgrades
    .filter((u) => selected.has(u.id))
    .reduce((sum, u) => sum + u.cost, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-label text-[9px] font-semibold tracking-wider text-text-dim uppercase">
          Upgrades
        </h4>
        {totalCost > 0 && (
          <span className="font-data text-[10px] tabular-nums text-gold-400">+{totalCost} pts</span>
        )}
      </div>

      {/* Grouped */}
      {groups.map((group) => {
        const isRadio = group.max_quantity === 1;
        const selectedInGroup = group.upgrades.filter((u) => selected.has(u.id)).length;
        const atMax = selectedInGroup >= group.max_quantity;

        return (
          <div key={group.group_name} className="space-y-px">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-text-secondary">
                {group.group_name}
                {group.min_quantity > 0 && (
                  <span className="ml-1 text-caution/80">(required)</span>
                )}
              </p>
              {!isRadio && (
                <span className="font-data text-[9px] tabular-nums text-text-dim">
                  {selectedInGroup}/{group.max_quantity}
                </span>
              )}
            </div>
            {group.upgrades.map((u) => {
              const isSelected = selected.has(u.id);
              const disabled = !isSelected && atMax;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => !disabled && onToggle(u.id, group.group_name)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2 px-1.5 py-1 text-left text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-25 ${
                    isSelected
                      ? 'bg-gold-500/6 text-text-primary'
                      : 'text-text-secondary hover:bg-plate-700/30 hover:text-text-primary'
                  }`}
                >
                  {isRadio ? (
                    <RadioIndicator checked={isSelected} />
                  ) : (
                    <CheckIndicator checked={isSelected} />
                  )}
                  <span className="flex-1">{u.name}</span>
                  {u.cost > 0 && (
                    <span className="font-data text-[10px] tabular-nums text-text-dim">+{u.cost}</span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div className="space-y-px">
          {groups.length > 0 && (
            <p className="text-[10px] font-medium text-text-secondary">Other options</p>
          )}
          {ungrouped.map((u) => {
            const isSelected = selected.has(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onToggle(u.id)}
                className={`flex w-full cursor-pointer items-center gap-2 px-1.5 py-1 text-left text-[11px] transition-all ${
                  isSelected
                    ? 'bg-gold-500/6 text-text-primary'
                    : 'text-text-secondary hover:bg-plate-700/30 hover:text-text-primary'
                }`}
              >
                <CheckIndicator checked={isSelected} />
                <span className="flex-1">{u.name}</span>
                {u.cost > 0 && (
                  <span className="font-data text-[10px] tabular-nums text-text-dim">+{u.cost}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CheckIndicator({ checked }: { checked: boolean }) {
  return (
    <div className={`flex h-3 w-3 shrink-0 items-center justify-center border transition-all ${
      checked
        ? 'border-gold-500 bg-gold-500/15'
        : 'border-edge-500/60 bg-plate-800'
    }`}>
      {checked && (
        <svg className="h-2 w-2 text-gold-400" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
        </svg>
      )}
    </div>
  );
}

function RadioIndicator({ checked }: { checked: boolean }) {
  return (
    <div className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border transition-all ${
      checked
        ? 'border-gold-500 bg-gold-500/15'
        : 'border-edge-500/60 bg-plate-800'
    }`}>
      {checked && (
        <div className="h-1.5 w-1.5 rounded-full bg-gold-400" />
      )}
    </div>
  );
}
