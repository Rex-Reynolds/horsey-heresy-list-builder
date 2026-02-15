import type { Unit } from '../../types/index.ts';
import { SLOT_STRIPE_COLORS } from '../../types/index.ts';
import type { UnitAvailability } from '../../hooks/useUnitAvailability.ts';
import Badge from '../common/Badge.tsx';

const DOT_COLORS: Partial<Record<UnitAvailability, string>> = {
  addable: 'bg-valid shadow-[0_0_4px_rgba(56,178,96,0.4)]',
  slot_full: 'bg-caution shadow-[0_0_4px_rgba(196,154,32,0.3)]',
  no_slot: 'bg-danger/40',
  roster_limit: 'bg-danger/40',
};

interface Props {
  unit: Unit;
  expanded: boolean;
  onClick: () => void;
  availability?: UnitAvailability;
  children?: React.ReactNode;
}

export default function UnitCard({ unit, expanded, onClick, availability, children }: Props) {
  const dot = availability ? DOT_COLORS[availability] : undefined;
  const dimmed = availability === 'no_slot' || availability === 'roster_limit';
  const stripe = SLOT_STRIPE_COLORS[unit.unit_type] ?? 'border-l-edge-500';

  const hasModelRange = unit.model_max !== null && unit.model_max !== undefined
    && (unit.model_min > 1 || unit.model_max > 1);

  return (
    <div
      className={`rounded-sm border-l-3 transition-all duration-150 ${stripe} ${
        expanded
          ? 'glow-border-active bg-plate-800'
          : 'glow-border bg-plate-900/80 hover:bg-plate-800/70'
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <button
        onClick={onClick}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        {/* Status dot */}
        {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}

        {/* Name + badge */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-unit-name truncate text-[13px] text-text-primary">{unit.name}</span>
            <Badge label={unit.unit_type} />
            {unit.is_legacy && (
              <span className="shrink-0 rounded-sm border border-gold-700/30 bg-gold-900/40 px-1.5 py-px font-label text-[8px] font-semibold tracking-wider text-gold-500/70 uppercase">
                Legacy
              </span>
            )}
          </div>
        </div>

        {/* Model count + cost */}
        <div className="flex shrink-0 items-center gap-2.5">
          {hasModelRange && (
            <span className="font-data text-[9px] text-text-dim">
              {unit.model_min === unit.model_max
                ? `${unit.model_min}`
                : `${unit.model_min}-${unit.model_max}`
              }
            </span>
          )}
          <span className="font-data text-[11px] font-medium tabular-nums text-gold-400">
            {unit.base_cost}
            <span className="ml-0.5 text-[9px] text-text-dim">pts</span>
          </span>
        </div>

        {/* Chevron */}
        <svg
          className={`h-3 w-3 shrink-0 text-text-dim transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="animate-slide-down border-t border-edge-700/40 px-3.5 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
