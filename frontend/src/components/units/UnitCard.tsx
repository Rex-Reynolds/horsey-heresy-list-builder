import { useMemo, useRef, useEffect, useState } from 'react';
import type { Unit } from '../../types/index.ts';
import { SLOT_STRIPE_COLORS, SLOT_CARD_TINTS } from '../../types/index.ts';
import type { UnitAvailability } from '../../hooks/useUnitAvailability.ts';
import Badge from '../common/Badge.tsx';
import UnitTypeIcon from '../common/UnitTypeIcon.tsx';
import UnitSilhouette from '../common/UnitSilhouette.tsx';
import { useUIStore } from '../../stores/uiStore.ts';
import { useUnitAvailability } from '../../hooks/useUnitAvailability.ts';

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
  onCompareToggle?: (unit: Unit) => void;
  isComparing?: boolean;
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

export default function UnitCard({ unit, expanded, onClick, availability, onQuickAdd, onCompareToggle, isComparing, searchTerm, compact, children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rippling, setRippling] = useState(false);
  const dotStyle = availability ? DOT_STYLES[availability] : undefined;
  const dimmed = availability === 'no_slot' || availability === 'roster_limit';
  const isFavorite = useUIStore((s) => s.favorites.has(unit.id));
  const toggleFavorite = useUIStore((s) => s.toggleFavorite);
  const setWhatIfPreview = useUIStore((s) => s.setWhatIfPreview);
  const getAvailability = useUnitAvailability();
  const whatIfTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // What-If preview: show ghost on 800ms hover (desktop only)
  function handleWhatIfEnter() {
    if (availability !== 'addable' || expanded) return;
    whatIfTimer.current = setTimeout(() => {
      const avail = getAvailability(unit.unit_type, unit.name, unit.id, unit.constraints);
      if (avail.status === 'addable' && avail.openDetachments.length > 0) {
        setWhatIfPreview({
          unitId: unit.id,
          unitName: unit.name,
          category: unit.unit_type,
          baseCost: unit.base_cost,
          detachmentId: avail.openDetachments[0].id,
        });
      }
    }, 800);
  }
  function handleWhatIfLeave() {
    clearTimeout(whatIfTimer.current);
    setWhatIfPreview(null);
  }

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
        {/* Icon + Name */}
        <UnitTypeIcon unitType={unit.unit_type} className="h-4 w-4 shrink-0 text-text-dim/50" />
        <button onClick={onClick} className="min-w-0 flex-1 truncate text-left font-unit-name text-[14px] font-medium text-text-primary">
          <HighlightedName name={unit.name} term={searchTerm} />
        </button>
        {/* Cost first, then badge */}
        <span className={`cost-pill shrink-0 font-data text-[13px] font-semibold tabular-nums ${tier === 'flagship' ? 'text-gold-300' : 'text-gold-400'}`}>
          {totalCost}<span className="text-[10px] font-normal text-gold-500/50">pts</span>
        </span>
        <Badge label={unit.unit_type} />
        {/* Favorite star (compact) */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); toggleFavorite(unit.id); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); toggleFavorite(unit.id); } }}
          className={`quick-add-btn flex h-10 w-10 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-sm transition-all ${
            isFavorite ? 'text-gold-400' : 'text-text-dim/30 hover:text-gold-400/60'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFavorite ? `Remove ${unit.name} from favorites` : `Add ${unit.name} to favorites`}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </span>
        {/* Quick add */}
        {onQuickAdd && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleQuickAddClick}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddClick(e as unknown as React.MouseEvent); }}
            className={`quick-add-btn quick-add-ripple flex h-10 w-10 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-sm border border-valid/20 bg-valid/5 text-valid/60 transition-all hover:border-valid/40 hover:bg-valid/15 hover:text-valid ${rippling ? 'rippling' : ''}`}
            aria-label={`Quick add ${unit.name}`}
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
      className={`group relative rounded-sm transition-all duration-200 ${
        tier === 'flagship' ? 'border-l-4 unit-tier-elite' : tier === 'elite' ? 'border-l-4' : 'border-l-3'
      } ${stripe} ${
        expanded
          ? 'glow-border-active bg-plate-800'
          : `glow-border unit-card-hover bg-plate-900/80 hover:bg-plate-800/70 ${tint}`
      } ${dimmed ? 'opacity-35' : ''} ${tier === 'flagship' && !expanded && !dimmed ? 'ring-1 ring-gold-700/15' : ''}`}
      onMouseEnter={handleWhatIfEnter}
      onMouseLeave={handleWhatIfLeave}
    >
      {/* Silhouette watermark */}
      {!expanded && (
        <div className="unit-silhouette-watermark h-16 w-16 opacity-50">
          <UnitSilhouette unitType={unit.unit_type} className="h-full w-full text-text-dim" />
        </div>
      )}

      <button
        onClick={onClick}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left relative z-[1]"
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
            <span className={`font-unit-name font-medium leading-normal text-text-primary inline-flex items-center gap-1.5 ${tier === 'flagship' ? 'text-[17px]' : 'text-[16px]'}`}>
              <UnitTypeIcon unitType={unit.unit_type} className={`shrink-0 text-text-dim/40 ${tier === 'flagship' ? 'h-[18px] w-[18px]' : 'h-4 w-4'}`} />
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

        {/* Action zone — quick-add prominent, secondary hidden on hover */}
        <div className="flex shrink-0 items-center gap-1.5 mt-1">
          {/* Secondary actions — visible on hover or when active */}
          {!expanded && (
            <div className={`flex items-center gap-1 transition-opacity ${
              isFavorite || isComparing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {/* Favorite star */}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(unit.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); toggleFavorite(unit.id); } }}
                className={`flex h-9 w-9 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-sm transition-all ${
                  isFavorite
                    ? 'text-gold-400'
                    : 'text-text-dim/30 hover:text-gold-400/60'
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite ? `Remove ${unit.name} from favorites` : `Add ${unit.name} to favorites`}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </span>
              {/* Compare toggle */}
              {onCompareToggle && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onCompareToggle(unit); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCompareToggle(unit); } }}
                  className={`flex h-9 w-9 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-sm transition-all ${
                    isComparing
                      ? 'text-steel'
                      : 'text-text-dim/30 hover:text-steel/80'
                  }`}
                  title={isComparing ? 'Remove from comparison' : 'Add to comparison'}
                  aria-label={isComparing ? `Remove ${unit.name} from comparison` : `Compare ${unit.name}`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
              )}
            </div>
          )}

          {/* Quick add button — always visible, larger touch target */}
          {onQuickAdd && !expanded && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleQuickAddClick}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddClick(e as unknown as React.MouseEvent); }}
              className={`quick-add-btn quick-add-ripple flex h-11 w-11 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-sm border border-valid/25 bg-valid/8 text-valid/70 transition-all hover:border-valid/45 hover:bg-valid/18 hover:text-valid ${rippling ? 'rippling' : ''}`}
              title={unit.has_required_upgrades ? 'Quick add (with defaults)' : 'Quick add (no upgrades)'}
              aria-label={`Quick add ${unit.name}`}
            >
              {unit.has_required_upgrades ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.079A.75.75 0 015 17.656V4.344a.75.75 0 011.036-.693l5.384 3.079a.75.75 0 010 1.268l-5.384 3.08M15 12h6m-3-3v6" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
