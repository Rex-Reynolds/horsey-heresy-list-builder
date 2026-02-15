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
  const isExpensive = totalCost >= 200;

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
        className={`group flex items-center gap-2.5 rounded-sm border-l-3 px-3 py-2 transition-all duration-200 ${stripe} ${
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
        <Badge label={unit.unit_type} />
        {/* Cost */}
        <span className={`shrink-0 font-data text-[13px] font-semibold tabular-nums ${isExpensive ? 'text-gold-300' : 'text-gold-400'}`}>
          {totalCost}<span className="text-[10px] font-normal text-gold-500/50">pts</span>
        </span>
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
      className={`group rounded-sm border-l-3 transition-all duration-200 ${stripe} ${
        expanded
          ? 'glow-border-active bg-plate-800'
          : `glow-border unit-card-hover bg-plate-900/80 hover:bg-plate-800/70 ${tint}`
      } ${dimmed ? 'opacity-35' : ''} ${isExpensive && !expanded && !dimmed ? 'ring-1 ring-gold-700/10' : ''}`}
    >
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 text-left ${isExpensive ? 'px-4 py-3.5' : 'px-4 py-3'}`}
      >
        {/* Status indicator — shape varies for color-blind accessibility */}
        {dotStyle && (
          dotStyle.shape === 'diamond' ? (
            <span className={`h-2.5 w-2.5 shrink-0 rotate-45 ring-2 ring-current/5 ${dotStyle.color}`} />
          ) : dotStyle.shape === 'dash' ? (
            <span className={`h-1 w-3 shrink-0 rounded-full ${dotStyle.color}`} />
          ) : (
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-current/5 ${dotStyle.color}`} />
          )
        )}

        {/* Name + badge — allow wrapping */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-unit-name text-[16px] font-medium leading-normal text-text-primary"><HighlightedName name={unit.name} term={searchTerm} /></span>
            <Badge label={unit.unit_type} />
            {unit.is_legacy && (
              <span className="shrink-0 rounded-sm border border-gold-700/30 bg-gold-900/40 px-1.5 py-px font-label text-[10px] font-semibold tracking-wider text-gold-500/70 uppercase">
                Legacy
              </span>
            )}
          </div>
          {/* Weapon summary + model range — collapsed only */}
          {!expanded && (weaponSummary || (hasModelRange && unit.model_min !== unit.model_max)) && (
            <div className="mt-1 flex items-center gap-2 text-[11px] text-text-secondary/80 truncate">
              {weaponSummary && (
                <>
                  <svg className="h-3 w-3 shrink-0 text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  <span className="truncate">{weaponSummary}</span>
                </>
              )}
              {hasModelRange && unit.model_min !== unit.model_max && (
                <span className="shrink-0 font-data text-[10px]">
                  {unit.model_min}&ndash;{unit.model_max} models
                </span>
              )}
            </div>
          )}
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
          <span className={`inline-flex items-baseline gap-0.5 rounded-sm border px-2 py-0.5 font-data font-semibold tabular-nums ${
            isExpensive
              ? 'border-gold-500/35 bg-gold-900/50 text-[15px] text-gold-300 shadow-[0_0_8px_rgba(184,147,64,0.08)]'
              : 'border-gold-600/25 bg-gold-900/40 text-sm text-gold-400'
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

        {/* Quick add button — wrench for defaults, + for plain */}
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
      </button>

      {expanded && (
        <div className="animate-slide-down scan-lines border-t border-edge-700/40 px-4 py-3.5">
          {children}
        </div>
      )}
    </div>
  );
}
