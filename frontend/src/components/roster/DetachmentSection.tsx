import { useState, useMemo, useCallback } from 'react';
import type { RosterDetachment, RosterEntry } from '../../stores/rosterStore.ts';
import type { SlotStatus } from '../../types/index.ts';
import { SLOT_FILL_COLORS } from '../../types/index.ts';
import RosterEntryCard from './RosterEntryCard.tsx';
import ConfirmDialog from '../common/ConfirmDialog.tsx';
import ForceOrgGrid from './ForceOrgGrid.tsx';

interface Props {
  detachment: RosterDetachment;
  onRemoveEntry: (detachmentId: number, entryId: number) => void;
  onUpdateQty: (detachmentId: number, entryId: number, qty: number) => void;
  onRemoveDetachment?: (detachmentId: number) => void;
  onSlotClick?: (slotName: string, filled: number, max: number) => void;
  newEntryId?: number | null;
}

const TYPE_HEADER_COLORS: Record<string, string> = {
  Primary: 'bg-gradient-to-r from-gold-900/30 via-gold-800/12 to-transparent border-l-2 border-l-gold-500/60',
  Auxiliary: 'bg-gradient-to-r from-steel/10 via-steel/4 to-transparent border-l-2 border-l-steel/40',
  Apex: 'bg-gradient-to-r from-royal/10 via-royal/4 to-transparent border-l-2 border-l-royal/50',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  Primary: 'text-gold-400 border-gold-600/30 bg-gold-600/10',
  Auxiliary: 'text-steel border-steel-dim/30 bg-steel/8',
  Apex: 'text-royal border-royal-dim/30 bg-royal/8',
};

/** A slot is "relevant" if it has entries, has a minimum requirement, or has available capacity */
function isRelevantSlot(status: SlotStatus, hasEntries: boolean): boolean {
  if (hasEntries) return true;
  if (status.min > 0) return true;
  if (status.max > 0 && status.max < 999) return true;
  return false;
}

/**
 * A hidden slot is "discoverable" — it has max=0 but could become available
 * via Tercio Unlock modifiers. Unlimited slots (max=999) like "Paragon of Malevolence"
 * are never useful to show in the toggle since they have no meaningful capacity.
 */
function isDiscoverableSlot(status: SlotStatus): boolean {
  return status.max === 0;
}

function SlotRow({
  name,
  status,
  onClick,
}: {
  name: string;
  status: SlotStatus;
  onClick?: () => void;
}) {
  const isFull = status.filled >= status.max;
  const isOverfilled = status.filled > status.max;
  const isUnderMin = status.filled < status.min;
  const isEmpty = status.filled === 0;
  const isClickable = !!onClick && !isFull;

  // Fill bar computation
  const hasFiniteMax = status.max > 0 && status.max < 999;
  const fillPct = hasFiniteMax
    ? Math.min((status.filled / status.max) * 100, 100)
    : 0;

  // Determine fill bar color based on state
  const baseName = name.includes(' - ') ? name.split(' - ', 1)[0].trim() : name;
  const slotColor = SLOT_FILL_COLORS[baseName] ?? 'bg-edge-400/70';
  const barColor = isOverfilled
    ? 'bg-danger'
    : isFull
      ? 'bg-valid/80'
      : isUnderMin && !isEmpty
        ? 'bg-caution/80'
        : slotColor;

  // Inline validation class
  const validationClass = isOverfilled
    ? 'slot-error'
    : (isUnderMin && status.min > 0)
      ? 'slot-warning'
      : '';

  const isRequired = status.min > 0 && isEmpty;

  return (
    <div className={`py-1.5 ${validationClass} ${isClickable && isEmpty ? 'slot-row-empty px-2 -mx-1 my-0.5' : ''} ${isRequired ? 'animate-pulse-glow' : ''}`}>
      <button
        type="button"
        onClick={isClickable ? onClick : undefined}
        className={`flex w-full items-center justify-between text-left gap-2 ${
          isClickable
            ? `cursor-pointer transition-colors -mx-1 px-1 rounded-sm ${isRequired ? 'hover:bg-gold-900/15' : 'hover:bg-plate-700/25'}`
            : ''
        }`}
        disabled={!isClickable}
      >
        {/* Left: slot name + browse hint + validation badge */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`font-label text-xs font-semibold tracking-wide uppercase ${
            isClickable ? 'text-text-secondary hover:text-gold-400 transition-colors' : 'text-text-secondary'
          }`}>
            {name}
          </span>

          {/* Inline validation badges */}
          {isOverfilled && (
            <span className="rounded-sm bg-danger/15 px-1.5 py-px font-label text-[9px] font-bold tracking-wider text-danger uppercase">
              Over
            </span>
          )}
          {isUnderMin && !isEmpty && !isOverfilled && (
            <span className="rounded-sm bg-caution/15 px-1.5 py-px font-label text-[9px] font-bold tracking-wider text-caution uppercase">
              Need {status.min - status.filled} more
            </span>
          )}

          {isClickable && isEmpty && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium tracking-normal normal-case transition-colors ${
              status.min > 0
                ? 'text-gold-500/70 hover:text-gold-400'
                : 'text-text-dim/50 hover:text-gold-500/50'
            }`}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
              {status.min > 0 ? 'add units' : 'browse'}
            </span>
          )}
        </div>

        {/* Right: fill bar + count */}
        <div className="flex items-center gap-2 shrink-0">
          {hasFiniteMax && (
            <div className="slot-fill-bar w-12">
              <div
                className={`slot-fill-bar-inner ${barColor}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          )}
          <span
            className={`font-data text-xs tabular-nums min-w-[2.5rem] text-right ${
              isOverfilled
                ? 'text-danger'
                : isFull
                  ? 'text-valid/80'
                  : isUnderMin
                    ? 'text-caution/80'
                    : 'text-text-dim'
            }`}
          >
            {status.filled}/{status.max === 999 ? '\u221e' : status.max}
          </span>
        </div>
      </button>
      {status.restriction && (
        <p className="mt-0.5 text-[11px] text-caution/60">
          {'\u26A0'} {status.restriction}
        </p>
      )}
      {isEmpty && status.min > 0 && (
        <p className="mt-0.5 text-[11px] italic text-caution/70">
          {status.min} required
        </p>
      )}
    </div>
  );
}

export default function DetachmentSection({
  detachment,
  onRemoveEntry,
  onUpdateQty,
  onRemoveDetachment,
  onSlotClick,
  newEntryId,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detPoints = detachment.entries.reduce((s, e) => s + e.totalCost, 0);

  const entriesBySlot = useMemo(() => {
    const map: Record<string, RosterEntry[]> = {};
    for (const entry of detachment.entries) {
      if (!map[entry.category]) map[entry.category] = [];
      map[entry.category].push(entry);
    }
    return map;
  }, [detachment.entries]);

  // Split slots into relevant (shown), discoverable (locked, togglable), and irrelevant (never shown)
  const { relevantSlots, discoverableSlots } = useMemo(() => {
    const relevant: [string, SlotStatus][] = [];
    const discoverable: [string, SlotStatus][] = [];
    for (const [slotName, status] of Object.entries(detachment.slots)) {
      const hasEntries = (entriesBySlot[slotName] || []).length > 0;
      if (isRelevantSlot(status, hasEntries)) {
        relevant.push([slotName, status]);
      } else if (isDiscoverableSlot(status)) {
        discoverable.push([slotName, status]);
      }
      // Slots with max=999 and no entries are silently hidden — never shown
    }
    return { relevantSlots: relevant, discoverableSlots: discoverable };
  }, [detachment.slots, entriesBySlot]);

  const headerColor = TYPE_HEADER_COLORS[detachment.type] ?? 'bg-plate-700/15 border-l-2 border-l-edge-500/30';
  const badgeColor = TYPE_BADGE_COLORS[detachment.type] ?? 'text-text-secondary border-edge-600/25 bg-plate-700/10';

  const slotsToRender = showAllSlots
    ? [...relevantSlots, ...discoverableSlots]
    : relevantSlots;

  const handleRemoveClick = useCallback(() => {
    if (detachment.entries.length > 0) {
      setConfirmDelete(true);
    } else {
      onRemoveDetachment?.(detachment.id);
    }
  }, [detachment.entries.length, detachment.id, onRemoveDetachment]);

  return (
    <>
      <div className="glow-border overflow-hidden rounded-sm border border-edge-600/15 bg-plate-800/25">
        {/* Header — uses div+role to avoid nested-button issues with remove btn */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCollapsed(!collapsed)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed); } }}
          className={`flex w-full cursor-pointer items-center justify-between px-3.5 py-3 text-left transition-colors hover:brightness-110 ${headerColor}`}
        >
          <div className="flex items-center gap-2.5">
            <svg
              className={`h-3 w-3 text-text-dim transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-display text-[13px] font-semibold tracking-[0.1em] uppercase">
              {detachment.name}
            </span>
            <span className={`font-label rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${badgeColor}`}>
              {detachment.type}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-data text-xs tabular-nums text-text-dim">{detPoints} pts</span>
            {onRemoveDetachment && detachment.type !== 'Primary' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveClick();
                }}
                className="text-text-dim transition-colors hover:text-danger"
                title="Remove detachment"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Force Org Grid — visual summary */}
        {!collapsed && relevantSlots.length > 2 && (
          <ForceOrgGrid
            slots={relevantSlots}
            onSlotClick={onSlotClick}
          />
        )}

        {/* Body */}
        {!collapsed && (
          <div className="border-t border-edge-700/15 px-3.5 py-2 space-y-0.5">
            {slotsToRender.map(([slotName, status]) => (
              <div key={slotName}>
                <SlotRow
                  name={slotName}
                  status={status}
                  onClick={onSlotClick ? () => onSlotClick(slotName, status.filled, status.max) : undefined}
                />
                {(entriesBySlot[slotName] || []).map((entry) => (
                  <div key={entry.id} className="ml-2">
                    <RosterEntryCard
                      entry={entry}
                      onRemove={(id) => onRemoveEntry(detachment.id, id)}
                      onUpdateQty={(id, qty) => onUpdateQty(detachment.id, id, qty)}
                      isNew={entry.id === newEntryId}
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Toggle locked slots (max=0 slots that could unlock via Tercios) */}
            {discoverableSlots.length > 0 && (
              <button
                onClick={() => setShowAllSlots((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 py-1.5 text-[11px] text-text-dim/60 transition-colors hover:text-text-dim"
              >
                <span className="h-px flex-1 bg-edge-700/20" />
                <span className="font-label shrink-0 tracking-wider uppercase">
                  {showAllSlots ? 'Hide locked slots' : `${discoverableSlots.length} locked slot${discoverableSlots.length !== 1 ? 's' : ''}`}
                </span>
                <span className="h-px flex-1 bg-edge-700/20" />
              </button>
            )}

            {/* Unmatched entries */}
            {Object.entries(entriesBySlot)
              .filter(([slot]) => !detachment.slots[slot])
              .map(([slot, entries]) => (
                <div key={slot}>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-label text-xs font-semibold tracking-wide text-danger uppercase">{slot} (no slot)</span>
                  </div>
                  {entries.map((entry) => (
                    <div key={entry.id} className="ml-2">
                      <RosterEntryCard
                        entry={entry}
                        onRemove={(id) => onRemoveEntry(detachment.id, id)}
                        onUpdateQty={(id, qty) => onUpdateQty(detachment.id, id, qty)}
                      />
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title="Remove Detachment"
        message={`This will remove "${detachment.name}" and all ${detachment.entries.length} unit${detachment.entries.length !== 1 ? 's' : ''} in it. This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          setConfirmDelete(false);
          onRemoveDetachment?.(detachment.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
