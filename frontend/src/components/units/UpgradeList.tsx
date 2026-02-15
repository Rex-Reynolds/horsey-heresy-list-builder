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
    <div className="space-y-2.5">
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
        ? 'border-gold-600/25 bg-gold-500/[0.03] shadow-[0_0_8px_rgba(158,124,52,0.04)]'
        : 'border-edge-700/25 bg-plate-800/20'
    }`}>
      {/* Group header — click to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-plate-700/20"
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

        {/* Selection indicator + type label + cost */}
        <span className="flex items-center gap-2">
          {isRadio ? (
            <span className="font-label rounded-sm border border-edge-600/20 bg-plate-700/30 px-1.5 py-px text-[9px] font-semibold tracking-wider text-text-dim/70 uppercase">
              Choose 1
            </span>
          ) : (
            <span className="font-data text-[10px] tabular-nums text-text-dim">
              {selectedInGroup}/{group.max_quantity}
            </span>
          )}
          {groupCost > 0 && (
            <span className="font-data text-[11px] font-semibold tabular-nums text-gold-400">+{groupCost} pts</span>
          )}
        </span>
      </button>

      {/* Upgrade cards */}
      {open && (
        <div className="border-t border-edge-700/15 p-1.5 space-y-1">
          {group.upgrades.map((u) => {
            const isSelected = selected.has(u.id);
            const disabled = !isSelected && atMax;
            return (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                isSelected={isSelected}
                disabled={disabled}
                isRadio={isRadio}
                onClick={() => !disabled && onToggle(u.id, group.group_name)}
              />
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
        ? 'border-gold-600/25 bg-gold-500/[0.03] shadow-[0_0_8px_rgba(158,124,52,0.04)]'
        : 'border-edge-700/25 bg-plate-800/20'
    }`}>
      {showLabel && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-plate-700/20"
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
        <div className={showLabel ? 'border-t border-edge-700/15 p-1.5 space-y-1' : 'p-1.5 space-y-1'}>
          {upgrades.map((u) => {
            const isSelected = selected.has(u.id);
            return (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                isSelected={isSelected}
                disabled={false}
                isRadio={false}
                onClick={() => onToggle(u.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Card-style upgrade selector */
function UpgradeCard({
  upgrade,
  isSelected,
  disabled,
  isRadio,
  onClick,
}: {
  upgrade: Upgrade;
  isSelected: boolean;
  disabled: boolean;
  isRadio: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-25 ${
        isSelected
          ? 'border-gold-500/30 bg-gold-500/8 shadow-[0_0_10px_rgba(158,124,52,0.06)]'
          : 'border-edge-700/20 bg-plate-800/15 hover:border-edge-500/30 hover:bg-plate-700/25'
      }`}
    >
      {isRadio ? (
        <RadioIndicator checked={isSelected} />
      ) : (
        <CheckIndicator checked={isSelected} />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-[13px] font-medium ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
          {upgrade.name}
        </span>
        {upgrade.upgrade_type && (
          <span className={`ml-2 font-label rounded-sm border px-1.5 py-px text-[9px] font-semibold tracking-wider uppercase ${
            isSelected
              ? 'border-gold-600/20 bg-gold-900/15 text-gold-400/70'
              : 'border-edge-600/20 bg-plate-700/30 text-text-dim/60'
          }`}>
            {upgrade.upgrade_type}
          </span>
        )}
      </div>
      {upgrade.cost > 0 && (
        <span className={`font-data text-sm font-semibold tabular-nums shrink-0 ${
          isSelected ? 'text-gold-400' : 'text-text-dim'
        }`}>
          +{upgrade.cost}
        </span>
      )}
      {upgrade.cost === 0 && (
        <span className="font-data text-[11px] tabular-nums text-text-dim/40 shrink-0">
          Free
        </span>
      )}
    </button>
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
