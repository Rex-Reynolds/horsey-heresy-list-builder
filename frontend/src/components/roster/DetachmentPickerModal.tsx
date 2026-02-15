import { useState, useMemo, useEffect } from 'react';
import type { Detachment, CompositionStatus } from '../../types/index.ts';

const TYPE_ORDER = ['Primary', 'Auxiliary', 'Apex', 'Lord of War', 'Allied', 'Other'];

const SECTION_COLORS: Record<string, string> = {
  Primary: 'border-l-gold-500/60 text-gold-400/80',
  Auxiliary: 'border-l-steel/40 text-steel/80',
  Apex: 'border-l-royal/40 text-royal/80',
  'Lord of War': 'border-l-gold-500/40 text-gold-400/60',
  Allied: 'border-l-edge-400/30 text-text-dim',
};

const STRIPE_COLORS: Record<string, string> = {
  Primary: 'border-l-gold-500',
  Auxiliary: 'border-l-steel',
  Apex: 'border-l-royal',
  'Lord of War': 'border-l-gold-500',
  Allied: 'border-l-edge-400',
};

const SECTION_HINTS: Record<string, (comp: CompositionStatus) => string | null> = {
  Primary: (comp) =>
    comp.primary_count === 0
      ? 'Every roster needs a Primary detachment. Start here.'
      : null,
  Auxiliary: (comp) =>
    comp.auxiliary_budget === 0
      ? 'Add Command units to unlock Auxiliary slots.'
      : comp.auxiliary_used >= comp.auxiliary_budget
        ? `Auxiliary budget full (${comp.auxiliary_used}/${comp.auxiliary_budget}).`
        : `${comp.auxiliary_budget - comp.auxiliary_used} Auxiliary slot${comp.auxiliary_budget - comp.auxiliary_used !== 1 ? 's' : ''} available.`,
  Apex: (comp) =>
    comp.apex_budget === 0
      ? 'Apex slots require specific High Command units.'
      : `${comp.apex_budget - comp.apex_used} Apex slot${comp.apex_budget - comp.apex_used !== 1 ? 's' : ''} available.`,
};

function getDisabledReason(
  det: Detachment,
  composition: CompositionStatus,
): string | null {
  const isWarlord = det.name.includes('Warlord');

  if (det.type === 'Primary' && !isWarlord && composition.primary_count >= composition.primary_max) {
    return 'Primary already added';
  }

  if (isWarlord) {
    if (!composition.warlord_available) return 'Requires 3000+ pts';
    if (composition.warlord_count >= 1) return 'Warlord already added';
  }

  const auxCost = det.costs?.auxiliary ?? 0;
  if (auxCost > 0 && auxCost > composition.auxiliary_budget - composition.auxiliary_used) {
    if (composition.auxiliary_budget === 0) return 'Add Command units first';
    return `Aux full (${composition.auxiliary_used}/${composition.auxiliary_budget})`;
  }

  const apexCost = det.costs?.apex ?? 0;
  if (apexCost > 0 && apexCost > composition.apex_budget - composition.apex_used) {
    if (composition.apex_budget === 0) return 'No Apex slots';
    return `Apex full (${composition.apex_used}/${composition.apex_budget})`;
  }

  return null;
}

interface Props {
  open: boolean;
  detachments: Detachment[];
  composition: CompositionStatus;
  addError: string | null;
  isPending: boolean;
  onSelect: (det: Detachment) => void;
  onClose: () => void;
}

export default function DetachmentPickerModal({
  open,
  detachments,
  composition,
  addError,
  isPending,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const filtered = search
      ? detachments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
      : detachments;

    const groups: Record<string, Detachment[]> = {};
    for (const d of filtered) {
      const type = d.type || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(d);
    }
    const sorted: [string, Detachment[]][] = [];
    for (const type of TYPE_ORDER) {
      if (groups[type]) sorted.push([type, groups[type]]);
    }
    for (const [type, dets] of Object.entries(groups)) {
      if (!TYPE_ORDER.includes(type)) sorted.push([type, dets]);
    }
    return sorted;
  }, [detachments, search]);

  if (!open) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="animate-modal-in glow-border-active flex w-full max-w-lg max-h-[80vh] flex-col rounded-sm bg-plate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge-700/30 px-5 py-4">
          <div>
            <h3 className="font-display text-sm font-semibold tracking-[0.1em] text-ivory uppercase">
              Add Detachment
            </h3>
            <p className="mt-0.5 text-[11px] text-text-dim">Select a detachment type to add to your roster</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-text-dim transition-colors hover:text-text-secondary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-edge-700/20 px-5 py-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search detachments..."
            autoFocus
            className="modal-search w-full rounded-sm px-3 py-2 text-sm text-text-primary placeholder:text-text-dim outline-none"
          />
        </div>

        {addError && (
          <div className="mx-5 mt-3 rounded-sm bg-danger/8 px-3 py-2 text-xs text-danger">{addError}</div>
        )}

        {/* Detachment list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {grouped.length === 0 && (
            <p className="py-4 text-center text-sm text-text-dim">No detachments match your search</p>
          )}
          {grouped.map(([type, dets]) => {
            const sectionColor = SECTION_COLORS[type] ?? 'border-l-edge-500/30 text-text-dim';
            const hintFn = SECTION_HINTS[type];
            const hint = hintFn ? hintFn(composition) : null;
            const isPrimarySection = type === 'Primary' && composition.primary_count === 0;

            return (
              <div key={type}>
                <div className="mb-2">
                  <p className={`font-label border-l-2 pl-2 text-[11px] font-bold tracking-[0.15em] uppercase ${sectionColor}`}>
                    {type}
                    {isPrimarySection && (
                      <span className="ml-2 font-normal normal-case tracking-normal text-gold-400/60">
                        — start here
                      </span>
                    )}
                  </p>
                  {hint && (
                    <p className="mt-1 pl-3.5 text-[11px] leading-relaxed text-text-dim/70">
                      {hint}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  {dets.map((d) => {
                    const disabledReason = getDisabledReason(d, composition);
                    const isDisabled = disabledReason !== null || isPending;
                    const stripe = STRIPE_COLORS[type] ?? 'border-l-edge-500';
                    const finite = d.constraints
                      ? Object.entries(d.constraints).filter(([, c]) => c.max > 0 && c.max < 100)
                      : [];
                    const visibleSlots = finite.slice(0, 8);
                    const remaining = finite.length - visibleSlots.length;
                    return (
                      <button
                        key={d.id}
                        onClick={() => !isDisabled && onSelect(d)}
                        disabled={isDisabled}
                        className={`block w-full rounded-sm border-l-2 text-left transition-all ${stripe} ${
                          isDisabled
                            ? 'cursor-not-allowed opacity-40 bg-plate-900/30'
                            : isPrimarySection
                              ? 'bg-gold-900/10 hover:bg-gold-900/20 hover:shadow-[0_0_16px_rgba(130,102,36,0.06)] border border-r-0 border-y-0 border-gold-600/10'
                              : 'bg-plate-800/40 hover:bg-plate-700/50 hover:shadow-[0_0_12px_rgba(130,102,36,0.04)]'
                        }`}
                      >
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[14px] font-medium ${isDisabled ? 'text-text-dim/60' : 'text-text-primary'}`}>
                              {d.name}
                              {d.faction && (
                                <span className="ml-1.5 text-[11px] text-text-dim">[{d.faction}]</span>
                              )}
                            </span>
                            {disabledReason && (
                              <span className="shrink-0 rounded-sm border border-edge-600/20 bg-plate-700/40 px-2 py-0.5 font-label text-[10px] font-semibold tracking-wider text-text-dim/70 uppercase">
                                {disabledReason}
                              </span>
                            )}
                          </div>
                          {visibleSlots.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {visibleSlots.map(([slot, c]) => (
                                <span
                                  key={slot}
                                  className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] ${
                                    isDisabled
                                      ? 'border-edge-700/15 bg-plate-800/30 text-text-dim/40'
                                      : 'border-edge-600/25 bg-plate-700/40 text-text-secondary'
                                  }`}
                                >
                                  <span className="font-label font-semibold tracking-wider uppercase">{slot}</span>
                                  <span className="font-data text-text-dim">
                                    {c.min > 0 ? `${c.min}\u2013` : ''}{c.max}
                                  </span>
                                </span>
                              ))}
                              {remaining > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] text-text-dim/40">
                                  +{remaining} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
