import { useState, useMemo } from 'react';
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
    return <p className="py-2 text-xs text-text-dim">Loading upgrades...</p>;
  }
  if (groups.length === 0 && ungrouped.length === 0) {
    return <p className="py-1 text-xs text-text-dim">No upgrades available</p>;
  }

  const allUpgrades = [...ungrouped, ...groups.flatMap((g) => g.upgrades)];
  const totalCost = allUpgrades
    .filter((u) => selected.has(u.id))
    .reduce((sum, u) => sum + u.cost, 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h4 className="font-label text-[11px] font-semibold tracking-wider text-text-dim uppercase">
          Upgrades
        </h4>
        {totalCost > 0 && (
          <span className="font-data text-xs tabular-nums text-gold-400">+{totalCost} pts</span>
        )}
      </div>

      {/* Grouped */}
      {groups.map((group) => (
        <UpgradeGroupSection
          key={group.group_name}
          group={group}
          selected={selected}
          onToggle={onToggle}
        />
      ))}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <UngroupedSection
          upgrades={ungrouped}
          selected={selected}
          onToggle={onToggle}
          showLabel={groups.length > 0}
        />
      )}
    </div>
  );
}

function UpgradeGroupSection({
  group,
  selected,
  onToggle,
}: {
  group: UpgradeGroup;
  selected: Set<number>;
  onToggle: (id: number, groupName?: string) => void;
}) {
  const isRadio = group.max_quantity === 1;
  const selectedInGroup = group.upgrades.filter((u) => selected.has(u.id)).length;
  const atMax = selectedInGroup >= group.max_quantity;
  const isRequired = group.min_quantity > 0;
  const hasSelection = selectedInGroup > 0;

  // Required groups and groups with selections start open, others collapsed
  const [open, setOpen] = useState(isRequired || hasSelection);

  const groupCost = useMemo(
    () => group.upgrades.filter((u) => selected.has(u.id)).reduce((s, u) => s + u.cost, 0),
    [group.upgrades, selected],
  );

  return (
    <div className={`rounded-sm border transition-colors ${
      hasSelection
        ? 'border-gold-600/20 bg-gold-500/[0.03]'
        : 'border-edge-700/25 bg-plate-800/20'
    }`}>
      {/* Group header — click to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-plate-700/20"
      >
        {/* Expand indicator */}
        <svg
          className={`h-2.5 w-2.5 shrink-0 text-text-dim transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        {/* Group name + badges */}
        <span className="flex-1 text-xs font-medium text-text-secondary">
          {group.group_name}
          {isRequired && !hasSelection && (
            <span className="ml-1.5 text-caution/80">(required)</span>
          )}
          {hasSelection && isRequired && (
            <span className="ml-1.5 text-valid/70">&#10003;</span>
          )}
        </span>

        {/* Selection count + cost */}
        <span className="flex items-center gap-2">
          {!isRadio && (
            <span className="font-data text-[10px] tabular-nums text-text-dim">
              {selectedInGroup}/{group.max_quantity}
            </span>
          )}
          {groupCost > 0 && (
            <span className="font-data text-[10px] tabular-nums text-gold-400/70">+{groupCost}</span>
          )}
        </span>
      </button>

      {/* Upgrade items */}
      {open && (
        <div className="border-t border-edge-700/15 py-0.5">
          {group.upgrades.map((u) => {
            const isSelected = selected.has(u.id);
            const disabled = !isSelected && atMax;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => !disabled && onToggle(u.id, group.group_name)}
                disabled={disabled}
                className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-[13px] transition-all disabled:cursor-not-allowed disabled:opacity-25 ${
                  isSelected
                    ? 'bg-gold-500/8 text-text-primary'
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
                  <span className={`font-data text-xs tabular-nums ${isSelected ? 'text-gold-400/70' : 'text-text-dim'}`}>
                    +{u.cost}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UngroupedSection({
  upgrades,
  selected,
  onToggle,
  showLabel,
}: {
  upgrades: Upgrade[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  showLabel: boolean;
}) {
  const hasSelection = upgrades.some((u) => selected.has(u.id));
  const [open, setOpen] = useState(true);

  return (
    <div className={`rounded-sm border transition-colors ${
      hasSelection
        ? 'border-gold-600/20 bg-gold-500/[0.03]'
        : 'border-edge-700/25 bg-plate-800/20'
    }`}>
      {showLabel && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-plate-700/20"
        >
          <svg
            className={`h-2.5 w-2.5 shrink-0 text-text-dim transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="flex-1 text-xs font-medium text-text-secondary">Other options</span>
        </button>
      )}
      {open && (
        <div className={showLabel ? 'border-t border-edge-700/15 py-0.5' : 'py-0.5'}>
          {upgrades.map((u) => {
            const isSelected = selected.has(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onToggle(u.id)}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-left text-[13px] transition-all ${
                  isSelected
                    ? 'bg-gold-500/8 text-text-primary'
                    : 'text-text-secondary hover:bg-plate-700/30 hover:text-text-primary'
                }`}
              >
                <CheckIndicator checked={isSelected} />
                <span className="flex-1">{u.name}</span>
                {u.cost > 0 && (
                  <span className={`font-data text-xs tabular-nums ${isSelected ? 'text-gold-400/70' : 'text-text-dim'}`}>
                    +{u.cost}
                  </span>
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
    <div className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-all ${
      checked
        ? 'border-gold-500 bg-gold-500/15'
        : 'border-edge-500/60 bg-plate-800'
    }`}>
      {checked && (
        <svg className="h-2.5 w-2.5 text-gold-400" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
        </svg>
      )}
    </div>
  );
}

function RadioIndicator({ checked }: { checked: boolean }) {
  return (
    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
      checked
        ? 'border-gold-500 bg-gold-500/15'
        : 'border-edge-500/60 bg-plate-800'
    }`}>
      {checked && (
        <div className="h-2 w-2 rounded-full bg-gold-400" />
      )}
    </div>
  );
}
