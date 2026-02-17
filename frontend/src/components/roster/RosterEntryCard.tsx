import { useRef, useEffect, useState } from 'react';
import type { RosterEntry } from '../../stores/rosterStore.ts';
import { SLOT_STRIPE_COLORS } from '../../types/index.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import UnitTypeIcon from '../common/UnitTypeIcon.tsx';
import { useSwipeActions } from '../../hooks/useSwipeActions.ts';
import { useMediaQuery } from '../../hooks/useMediaQuery.ts';

interface Props {
  entry: RosterEntry;
  detachmentId: number;
  onRemove: (id: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
  onDuplicate?: (entry: RosterEntry) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  isNew?: boolean;
  entryIndex?: number;
  isDuplicateName?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  statLine?: string | null;
}

export default function RosterEntryCard({ entry, detachmentId, onRemove, onUpdateQty, onDuplicate, isNew, entryIndex, isDuplicateName, draggable, onDragStart, onDragOver, onDragEnd, onDrop, isDragOver, statLine }: Props) {
  const openUpgradePanel = useUIStore((s) => s.openUpgradePanel);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevQtyRef = useRef(entry.quantity);
  const [costBumped, setCostBumped] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Mobile swipe actions
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { revealedSide, offset, dismiss, touchHandlers } = useSwipeActions({
    enabled: isMobile && !draggable,
  });

  // Trigger cost bump animation when quantity changes
  useEffect(() => {
    if (prevQtyRef.current !== entry.quantity) {
      prevQtyRef.current = entry.quantity;
      setCostBumped(true); // eslint-disable-line react-hooks/set-state-in-effect -- syncing from prop change
      const timer = setTimeout(() => setCostBumped(false), 350);
      return () => clearTimeout(timer);
    }
  }, [entry.quantity]);

  // Auto-scroll newly added entries into view
  useEffect(() => {
    if (isNew && cardRef.current) {
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const modelMin = entry.modelMin ?? 1;
  const modelMax = entry.modelMax ?? null;
  const atMin = entry.quantity <= modelMin;
  const atMax = modelMax !== null && entry.quantity >= modelMax;
  const isFixed = modelMax !== null && modelMin === modelMax;
  const perModel = entry.costPerModel;

  const stripe = SLOT_STRIPE_COLORS[entry.category] ?? 'border-l-edge-500';

  return (
    <div
      ref={cardRef}
      data-entry-id={entry.id}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`group relative overflow-hidden rounded-sm border-l-2 ${stripe} transition-all hover:bg-plate-800/40 ${isNew ? 'animate-entry-flash' : ''} ${entryIndex !== undefined && entryIndex % 2 === 1 ? 'bg-plate-800/30' : 'bg-plate-800/20'} ${isDragOver ? 'border-t-2 border-t-gold-500/50' : ''}`}
    >
      {/* Swipe action layers (mobile only) */}
      {isMobile && revealedSide === 'right' && (
        <div className="absolute inset-y-0 right-0 flex items-center bg-danger/90 px-5">
          <button
            onClick={() => { dismiss(); onRemove(entry.id); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-[9px] font-bold uppercase">Remove</span>
          </button>
        </div>
      )}
      {isMobile && revealedSide === 'left' && onDuplicate && (
        <div className="absolute inset-y-0 left-0 flex items-center bg-steel/90 px-5">
          <button
            onClick={() => { dismiss(); onDuplicate(entry); }}
            className="flex flex-col items-center gap-1 text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] font-bold uppercase">Duplicate</span>
          </button>
        </div>
      )}

      <div
        className="flex items-center gap-2.5 px-3 py-2.5 relative bg-inherit transition-transform"
        style={isMobile && offset !== 0 ? { transform: `translateX(${offset}px)`, transition: revealedSide ? 'transform 0.2s ease' : 'none' } : undefined}
        {...(isMobile ? touchHandlers : {})}
      >
        {/* Drag handle */}
        {draggable && (
          <span className="cursor-grab text-text-dim/30 transition-colors hover:text-text-dim/60 active:cursor-grabbing shrink-0 touch-none" title="Drag to reorder" aria-label="Drag to reorder">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </span>
        )}
        {/* Entry number badge */}
        {entryIndex !== undefined && !draggable && (
          <span className="font-data text-[10px] text-text-dim/40 w-4 text-center shrink-0">
            #{entryIndex + 1}
          </span>
        )}
        {/* Info — clickable to open upgrade panel, hover for preview */}
        <div
          className="min-w-0 flex-1 cursor-pointer relative"
          onClick={() => openUpgradePanel(entry.id, detachmentId)}
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
        >
          <p className={`flex items-center gap-1.5 truncate text-[13px] font-medium ${isDuplicateName ? 'text-text-primary/60' : 'text-text-primary'}`}>
            <UnitTypeIcon unitType={entry.category} className="h-3.5 w-3.5 shrink-0 text-text-dim/35" />
            <span className="truncate">{entry.name}</span>
          </p>
          {/* Hover preview tooltip */}
          {showPreview && !isMobile && (
            <div className="entry-preview-tooltip absolute left-0 bottom-full z-30 mb-2 w-64 animate-fade-in rounded-sm border border-edge-600/40 bg-plate-900/98 p-3 shadow-lg pointer-events-none">
              <div className="font-unit-name text-[13px] font-medium text-gold-400 mb-1">{entry.name}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="font-data text-[11px] tabular-nums text-text-secondary">
                  Base: <span className="text-gold-500">{entry.baseCost}</span> pts
                </span>
                {entry.costPerModel > 0 && (
                  <span className="font-data text-[11px] tabular-nums text-text-secondary">
                    +{entry.costPerModel}/model
                  </span>
                )}
                <span className="font-data text-[11px] tabular-nums text-text-secondary">
                  Qty: {entry.quantity}{entry.modelMax ? `/${entry.modelMax}` : ''}
                </span>
              </div>
              {entry.upgradeCost > 0 && (
                <div className="mt-1 font-data text-[10px] tabular-nums text-text-dim">
                  Upgrades: +{entry.upgradeCost} pts
                </div>
              )}
              {entry.upgradeNames && entry.upgradeNames.length > 0 && (
                <div className="mt-1 text-[10px] text-text-dim/80">
                  {entry.upgradeNames.join(', ')}
                </div>
              )}
              <div className="mt-1.5 divider-glow" />
              <div className="mt-1.5 font-data text-[12px] font-semibold tabular-nums text-gold-400">
                Total: {entry.totalCost} pts
              </div>
            </div>
          )}
          {/* Inline stat preview */}
          {statLine && (
            <div className="font-data text-[9px] tabular-nums text-text-dim/50 mt-0.5 truncate">
              {statLine}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`font-data text-xs font-medium tabular-nums text-gold-500/80 ${costBumped ? 'animate-points-flash' : ''}`}>{entry.totalCost} pts</span>
            {entry.upgradeCost > 0 && (
              <span className="font-data text-[10px] tabular-nums text-text-dim/60">
                ({entry.totalCost - entry.upgradeCost} + {entry.upgradeCost} upg)
              </span>
            )}
            {perModel > 0 && entry.quantity > 1 && (
              <span className="font-data text-[10px] tabular-nums text-text-dim">({perModel}/model)</span>
            )}
          </div>
          {/* Upgrade names — shown when available */}
          {entry.upgradeNames && entry.upgradeNames.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.upgradeNames.map((name, i) => (
                <span key={i} className="rounded-sm border border-edge-700/20 bg-plate-700/30 px-1.5 py-px text-[10px] text-text-dim/80">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quantity — models stepper */}
        {isFixed ? (
          <span className="font-data text-xs tabular-nums text-text-dim" title={`${entry.quantity} models (fixed)`}>
            {entry.quantity}
          </span>
        ) : (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => !atMin && onUpdateQty(entry.id, entry.quantity - 1)}
              disabled={atMin}
              className="flex h-7 w-7 items-center justify-center rounded-sm border border-edge-600/30 bg-plate-700/40 text-sm text-text-secondary transition-colors hover:border-edge-400/50 hover:text-text-primary disabled:opacity-15 max-lg:h-11 max-lg:w-11"
              title={atMin ? `Minimum ${modelMin} models` : `Remove model (-${perModel} pts)`}
            >
              -
            </button>
            <div className="flex min-w-[3rem] flex-col items-center px-1">
              <span className="font-data text-xs tabular-nums text-text-secondary leading-tight">
                {entry.quantity}
              </span>
              <span className="text-[9px] text-text-dim leading-tight">
                {modelMax !== null ? `of ${modelMax}` : 'models'}
              </span>
            </div>
            <button
              onClick={() => !atMax && onUpdateQty(entry.id, entry.quantity + 1)}
              disabled={atMax}
              className="flex h-7 w-7 items-center justify-center rounded-sm border border-edge-600/30 bg-plate-700/40 text-sm text-text-secondary transition-colors hover:border-edge-400/50 hover:text-text-primary disabled:opacity-15 max-lg:h-11 max-lg:w-11"
              title={atMax ? `Maximum ${modelMax} models` : `Add model (+${perModel} pts)`}
            >
              +
            </button>
          </div>
        )}

        {/* Duplicate */}
        {onDuplicate && (
          <button
            onClick={() => onDuplicate(entry)}
            className="flex h-5 w-5 items-center justify-center text-text-dim opacity-0 transition-all hover:text-gold-400 group-hover:opacity-100 max-lg:h-11 max-lg:w-11 max-lg:opacity-60"
            title="Duplicate"
            aria-label={`Duplicate ${entry.name}`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* Remove */}
        <button
          onClick={() => onRemove(entry.id)}
          className="flex h-5 w-5 items-center justify-center text-text-dim opacity-0 transition-all hover:text-danger group-hover:opacity-100 max-lg:h-11 max-lg:w-11 max-lg:opacity-60"
          title="Remove"
          aria-label={`Remove ${entry.name}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

    </div>
  );
}
