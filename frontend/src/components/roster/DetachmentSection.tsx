import { useState } from 'react';
import type { RosterDetachment, RosterEntry } from '../../stores/rosterStore.ts';
import type { SlotStatus } from '../../types/index.ts';
import RosterEntryCard from './RosterEntryCard.tsx';

interface Props {
  detachment: RosterDetachment;
  onRemoveEntry: (detachmentId: number, entryId: number) => void;
  onUpdateQty: (detachmentId: number, entryId: number, qty: number) => void;
  onRemoveDetachment?: (detachmentId: number) => void;
}

const TYPE_HEADER_COLORS: Record<string, string> = {
  Primary: 'bg-gold-700/10 text-ivory',
  Auxiliary: 'bg-plate-700/20 text-text-primary',
  Apex: 'bg-royal/8 text-royal',
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  Primary: 'text-gold-400 border-gold-600/30 bg-gold-600/10',
  Auxiliary: 'text-steel border-steel-dim/30 bg-steel/8',
  Apex: 'text-royal border-royal-dim/30 bg-royal/8',
};

function SlotRow({ name, status }: { name: string; status: SlotStatus }) {
  const isFull = status.filled >= status.max;
  const isOverfilled = status.filled > status.max;
  const isUnderMin = status.filled < status.min;
  const isEmpty = status.filled === 0;

  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between">
        <span className="font-label text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
          {name}
        </span>
        <span
          className={`font-data text-[10px] tabular-nums ${
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
      {status.restriction && (
        <p className="text-[9px] text-caution/60">
          {'\u26A0'} {status.restriction}
        </p>
      )}
      {isEmpty && status.min > 0 && (
        <p className="text-[9px] italic text-text-dim">
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
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const detPoints = detachment.entries.reduce((s, e) => s + e.totalCost, 0);

  const entriesBySlot: Record<string, RosterEntry[]> = {};
  for (const entry of detachment.entries) {
    if (!entriesBySlot[entry.category]) entriesBySlot[entry.category] = [];
    entriesBySlot[entry.category].push(entry);
  }

  const headerColor = TYPE_HEADER_COLORS[detachment.type] ?? 'bg-plate-700/20 text-text-primary';
  const badgeColor = TYPE_BADGE_COLORS[detachment.type] ?? 'text-text-secondary border-edge-600/25 bg-plate-700/10';

  return (
    <div className="glow-border overflow-hidden rounded-sm border border-edge-600/20 bg-plate-800/30">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:brightness-110 ${headerColor}`}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`h-2.5 w-2.5 text-text-dim transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-display text-[11px] font-semibold tracking-wider uppercase">
            {detachment.name}
          </span>
          <span className={`font-label rounded-sm border px-1 py-px text-[8px] font-semibold tracking-wider uppercase ${badgeColor}`}>
            {detachment.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data text-[10px] tabular-nums text-text-dim">{detPoints} pts</span>
          {onRemoveDetachment && detachment.type !== 'Primary' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveDetachment(detachment.id);
              }}
              className="text-text-dim transition-colors hover:text-danger"
              title="Remove detachment"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-edge-700/20 px-3 py-1.5 space-y-0.5">
          {Object.entries(detachment.slots).map(([slotName, status]) => (
            <div key={slotName}>
              <SlotRow name={slotName} status={status} />
              {(entriesBySlot[slotName] || []).map((entry) => (
                <div key={entry.id} className="ml-1.5">
                  <RosterEntryCard
                    entry={entry}
                    onRemove={(id) => onRemoveEntry(detachment.id, id)}
                    onUpdateQty={(id, qty) => onUpdateQty(detachment.id, id, qty)}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Unmatched */}
          {Object.entries(entriesBySlot)
            .filter(([slot]) => !detachment.slots[slot])
            .map(([slot, entries]) => (
              <div key={slot}>
                <div className="flex items-center justify-between py-0.5">
                  <span className="font-label text-[10px] font-semibold tracking-wide text-danger uppercase">{slot} (no slot)</span>
                </div>
                {entries.map((entry) => (
                  <div key={entry.id} className="ml-1.5">
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
  );
}
