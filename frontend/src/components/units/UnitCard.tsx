import { useMemo, useRef, useEffect, useState } from 'react';
import type { Unit } from '../../types/index.ts';
import { SLOT_STRIPE_COLORS, SLOT_CARD_TINTS } from '../../types/index.ts';
import type { UnitAvailability } from '../../hooks/useUnitAvailability.ts';
import Badge from '../common/Badge.tsx';

const DOT_STYLES: Partial<Record<UnitAvailability, { color: string; shape: 'circle' | 'diamond' | 'dash' }>> = {
  addable: { color: 'bg-valid shadow-[0_0_6px_rgba(56,178,96,0.5)]', shape: 'circle' },
  slot_full: { color: 'bg-caution shadow-[0_0_5px_rgba(196,154,32,0.35)]', shape: 'diamond' },
  no_slot: { color: 'bg-danger/40', shape: 'dash' },
  roster_limit: { color: 'bg-danger/40', shape: 'dash' },
};

/** Cost tier thresholds for visual differentiation */
function getCostTier(cost: number): 'standard' | 'elite' | 'flagship' {
  if (cost >= 300) return 'flagship';
  if (cost >= 150) return 'elite';
  return 'standard';
}

/** Extract weapon names from profiles JSON */
function extractWeaponSummary(profilesRaw: string | null): string | null {
  if (!profilesRaw) return null;
  try {
    const parsed = JSON.parse(profilesRaw);
    if (!Array.isArray(parsed)) return null;
    const weapons: string[] = [];
    for (const item of parsed) {
      if (item?.type === 'Weapon' || item?.type === 'weapon') {
        const name = String(item.name ?? '');
        if (name && !weapons.includes(name)) weapons.push(name);
      }
    }
    if (weapons.length === 0) return null;
    return weapons.slice(0, 3).join(', ') + (weapons.length > 3 ? ` +${weapons.length - 3}` : '');
  } catch {
    return null;
  }
}

interface Props {
  unit: Unit;
  expanded: boolean;
  onClick: () => void;
  availability?: UnitAvailability;
  onQuickAdd?: (unit: Unit, e: React.MouseEvent) => void;
  searchTerm?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

function HighlightedName({ name, term }: { name: string; term?: string }) {
  if (!term || term.length < 2) return <>{name}</>;
  const idx = name.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="rounded-sm bg-gold-500/25 text-inherit">{name.slice(idx, idx + term.length)}</mark>
      {name.slice(idx + term.length)}
    </>
  );
}

export default function UnitCard({ unit, expanded, onClick, availability, onQuickAdd, searchTerm, compact, children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rippling, setRippling] = useState(false);
  const dotStyle = availability ? DOT_STYLES[availability] : undefined;
  const dimmed = availability === 'no_slot' || availability === 'roster_limit';

  // Scroll expanded card into view
  useEffect(() => {
    if (expanded && cardRef.current) {
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [expanded]);
  const stripe = SLOT_STRIPE_COLORS[unit.unit_type] ?? 'border-l-edge-500';
  const tint = SLOT_CARD_TINTS[unit.unit_type] ?? '';

  const hasModelRange = unit.model_max !== null && unit.model_max !== undefined
    && (unit.model_min > 1 || unit.model_max > 1);

  const totalCost = unit.base_cost;
  const tier = getCostTier(totalCost);

  const weaponSummary = useMemo(() => extractWeaponSummary(unit.profiles), [unit.profiles]);

  function handleQuickAddClick(e: React.MouseEvent) {
    if (!onQuickAdd) return;
    setRippling(true);
    setTimeout(() => setRippling(false), 500);
    onQuickAdd(unit, e);
  }

  // Compact list variant — single row
  if (compact && !expanded) {
    return (
      <div
        ref={cardRef}
        className={`group flex items-center gap-2.5 rounded-sm px-3 py-2.5 transition-all duration-200 ${
          tier === 'flagship' ? 'border-l-4' : 'border-l-3'
        } ${stripe} ${
          `glow-border unit-card-hover bg-plate-900/80 hover:bg-plate-800/70 ${tint}`
        } ${dimmed ? 'opacity-35' : ''}`}
      >
        {/* Status dot */}
        {dotStyle && (
          dotStyle.shape === 'diamond' ? (
            <span className={`h-2 w-2 shrink-0 rotate-45 ${dotStyle.color}`} />
          ) : dotStyle.shape === 'dash' ? (
            <span className={`h-0.5 w-2.5 shrink-0 rounded-full ${dotStyle.color}`} />
          ) : (
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotStyle.color}`} />
          )
        )}
        {/* Name */}
        <button onClick={onClick} className="min-w-0 flex-1 truncate text-left font-unit-name text-[14px] font-medium text-text-primary">
          <HighlightedName name={unit.name} term={searchTerm} />
        </button>
        {/* Cost first, then badge */}
        <span className={`cost-pill shrink-0 font-data text-[13px] font-semibold tabular-nums ${tier === 'flagship' ? 'text-gold-300' : 'text-gold-400'}`}>
          {totalCost}<span className="text-[10px] font-normal text-gold-500/50">pts</span>
        </span>
        <Badge label={unit.unit_type} />
        {/* Quick add */}
        {onQuickAdd && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleQuickAddClick}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddClick(e as unknown as React.MouseEvent); }}
            className={`quick-add-btn quick-add-ripple flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-valid/20 bg-valid/5 text-valid/60 transition-all hover:border-valid/40 hover:bg-valid/15 hover:text-valid ${rippling ? 'rippling' : ''}`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </span>
        )}
        {/* Chevron */}
        <svg className="h-3 w-3 shrink-0 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`group rounded-sm transition-all duration-200 ${
        tier === 'flagship' ? 'border-l-4 unit-tier-elite' : tier === 'elite' ? 'border-l-4' : 'border-l-3'
      } ${stripe} ${
        expanded
          ? 'glow-border-active bg-plate-800'
          : `glow-border unit-card-hover bg-plate-900/80 hover:bg-plate-800/70 ${tint}`
      } ${dimmed ? 'opacity-35' : ''} ${tier === 'flagship' && !expanded && !dimmed ? 'ring-1 ring-gold-700/15' : ''}`}
    >
      <button
        onClick={onClick}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
      >
        {/* Status indicator — shape varies for color-blind accessibility */}
        {dotStyle && (
          <div className="mt-1.5 shrink-0">
            {dotStyle.shape === 'diamond' ? (
              <span className={`block h-2.5 w-2.5 rotate-45 ring-2 ring-current/5 ${dotStyle.color}`} />
            ) : dotStyle.shape === 'dash' ? (
              <span className={`block h-1 w-3 rounded-full ${dotStyle.color}`} />
            ) : (
              <span className={`block h-2.5 w-2.5 rounded-full ring-2 ring-current/5 ${dotStyle.color}`} />
            )}
          </div>
        )}

        {/* Name + metadata — main content area */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className={`font-unit-name font-medium leading-normal text-text-primary ${tier === 'flagship' ? 'text-[17px]' : 'text-[16px]'}`}>
              <HighlightedName name={unit.name} term={searchTerm} />
            </span>
            {/* Cost inline with name for natural reading flow */}
            <span className={`cost-pill inline-flex items-baseline gap-0.5 rounded-sm border px-2 py-0.5 font-data font-semibold tabular-nums ${
              tier === 'flagship'
                ? 'border-gold-500/35 bg-gold-900/50 text-[14px] text-gold-300 shadow-[0_0_8px_rgba(184,147,64,0.10)]'
                : tier === 'elite'
                  ? 'border-gold-500/25 bg-gold-900/40 text-[13px] text-gold-300'
                  : 'border-gold-600/25 bg-gold-900/40 text-[13px] text-gold-400'
            }`}>
              {totalCost}
              <span className="text-[10px] font-normal text-gold-500/50">pts</span>
            </span>
            {unit.cost_per_model > 0 && (
              <span className="font-data text-[10px] tabular-nums text-text-dim">
                ({unit.cost_per_model}/ea)
              </span>
            )}
          </div>
          {/* Second line: badge + model range + weapon summary */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge label={unit.unit_type} />
            {unit.is_legacy && (
              <span className="shrink-0 rounded-sm border border-gold-700/30 bg-gold-900/40 px-1.5 py-px font-label text-[10px] font-semibold tracking-wider text-gold-500/70 uppercase">
                Legacy
              </span>
            )}
            {hasModelRange && (
              <span className="font-data text-[11px] tabular-nums text-text-dim">
                {unit.model_min === unit.model_max
                  ? `${unit.model_min} model${unit.model_min !== 1 ? 's' : ''}`
                  : `${unit.model_min}\u2013${unit.model_max} models`
                }
              </span>
            )}
            {!expanded && weaponSummary && (
              <span className="flex items-center gap-1 text-[11px] text-text-secondary/70 truncate">
                <svg className="h-2.5 w-2.5 shrink-0 text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <span className="truncate">{weaponSummary}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action zone — separated from content */}
        <div className="flex shrink-0 items-center gap-2 mt-1">
          {/* Quick add button */}
          {onQuickAdd && !expanded && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleQuickAddClick}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddClick(e as unknown as React.MouseEvent); }}
              className={`quick-add-btn quick-add-ripple flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-valid/20 bg-valid/5 text-valid/60 transition-all hover:border-valid/40 hover:bg-valid/15 hover:text-valid ${rippling ? 'rippling' : ''}`}
              title={unit.has_required_upgrades ? 'Quick add (with defaults)' : 'Quick add (no upgrades)'}
            >
              {unit.has_required_upgrades ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.079A.75.75 0 015 17.656V4.344a.75.75 0 011.036-.693l5.384 3.079a.75.75 0 010 1.268l-5.384 3.08M15 12h6m-3-3v6" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              )}
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
        </div>
      </button>

      {expanded && (
        <div className="animate-slide-down scan-lines border-t border-edge-700/40 px-4 py-3.5">
          {children}
        </div>
      )}
    </div>
  );
}
