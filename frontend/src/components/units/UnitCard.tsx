import type { Unit } from '../../types/index.ts';
import { SLOT_STRIPE_COLORS, SLOT_CARD_TINTS } from '../../types/index.ts';
import type { UnitAvailability } from '../../hooks/useUnitAvailability.ts';
import Badge from '../common/Badge.tsx';

const DOT_COLORS: Partial<Record<UnitAvailability, string>> = {
  addable: 'bg-valid shadow-[0_0_6px_rgba(56,178,96,0.5)]',
  slot_full: 'bg-caution shadow-[0_0_5px_rgba(196,154,32,0.35)]',
  no_slot: 'bg-danger/40',
  roster_limit: 'bg-danger/40',
};

interface Props {
  unit: Unit;
  expanded: boolean;
  onClick: () => void;
  availability?: UnitAvailability;
  onQuickAdd?: (unit: Unit, e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export default function UnitCard({ unit, expanded, onClick, availability, onQuickAdd, children }: Props) {
  const dot = availability ? DOT_COLORS[availability] : undefined;
  const dimmed = availability === 'no_slot' || availability === 'roster_limit';
  const stripe = SLOT_STRIPE_COLORS[unit.unit_type] ?? 'border-l-edge-500';
  const tint = SLOT_CARD_TINTS[unit.unit_type] ?? '';

  const hasModelRange = unit.model_max !== null && unit.model_max !== undefined
    && (unit.model_min > 1 || unit.model_max > 1);

  const totalCost = unit.base_cost * Math.max(unit.model_min, 1);

  return (
    <div
      className={`group rounded-sm border-l-3 transition-all duration-200 ${stripe} ${
        expanded
          ? 'glow-border-active bg-plate-800 2xl:col-span-2'
          : `glow-border unit-card-hover bg-plate-900/80 hover:bg-plate-800/70 ${tint}`
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Status dot — larger with ring */}
        {dot && (
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-current/5 ${dot}`} />
        )}

        {/* Name + badge — allow wrapping */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-unit-name text-[15px] leading-snug text-text-primary">{unit.name}</span>
            <Badge label={unit.unit_type} />
            {unit.is_legacy && (
              <span className="shrink-0 rounded-sm border border-gold-700/30 bg-gold-900/40 px-1.5 py-px font-label text-[10px] font-semibold tracking-wider text-gold-500/70 uppercase">
                Legacy
              </span>
            )}
          </div>
        </div>

        {/* Model count + cost pill */}
        <div className="flex shrink-0 items-center gap-2.5">
          {hasModelRange && (
            <span className="font-data text-[11px] text-text-dim">
              {unit.model_min === unit.model_max
                ? `${unit.model_min}`
                : `${unit.model_min}\u2013${unit.model_max}`
              }
            </span>
          )}
          <span className="inline-flex items-baseline gap-0.5 rounded-sm border border-gold-600/25 bg-gold-900/40 px-2 py-0.5 font-data text-sm font-semibold tabular-nums text-gold-400">
            {totalCost}
            <span className="text-[10px] font-normal text-gold-500/50">pts</span>
          </span>
          {unit.model_min > 1 && (
            <span className="font-data text-[10px] tabular-nums text-text-dim">
              ({unit.base_cost}/ea)
            </span>
          )}
        </div>

        {/* Quick add button — always visible (subtle), brighter on hover */}
        {onQuickAdd && !expanded && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => onQuickAdd(unit, e)}
            onKeyDown={(e) => { if (e.key === 'Enter') onQuickAdd(unit, e as any); }}
            className="quick-add-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-valid/20 bg-valid/5 text-valid/60 transition-all hover:border-valid/40 hover:bg-valid/15 hover:text-valid"
            title="Quick add (no upgrades)"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </span>
        )}

        {/* Chevron */}
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-text-dim transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="animate-slide-down scan-lines border-t border-edge-700/40 px-4 py-3.5">
          {children}
        </div>
      )}
    </div>
  );
}
