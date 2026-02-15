import { useState, useMemo } from 'react';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { useDetachments } from '../../api/detachments.ts';
import {
  useAddDetachment,
  useRemoveDetachment,
  useValidateRoster,
} from '../../api/rosters.ts';
import client from '../../api/client.ts';
import type { Detachment } from '../../types/index.ts';
import { SLOT_DISPLAY_GROUPS } from '../../types/index.ts';
import PointsBar from '../layout/PointsBar.tsx';
import type { PointsSegment } from '../layout/PointsBar.tsx';
import RosterSetup from './RosterSetup.tsx';
import DetachmentSection from './DetachmentSection.tsx';
import ValidationResults from './ValidationResults.tsx';
import ExportButton from './ExportButton.tsx';
import DoctrinePicker from './DoctrinePicker.tsx';

const TYPE_ORDER = ['Primary', 'Auxiliary', 'Apex', 'Lord of War', 'Allied', 'Other'];

const PICKER_SECTION_COLORS: Record<string, string> = {
  Primary: 'border-l-gold-500/60 text-gold-400/80',
  Auxiliary: 'border-l-steel/40 text-steel/80',
  Apex: 'border-l-royal/40 text-royal/80',
  'Lord of War': 'border-l-gold-500/40 text-gold-400/60',
  Allied: 'border-l-edge-400/30 text-text-dim',
};

const PICKER_STRIPE_COLORS: Record<string, string> = {
  Primary: 'border-l-gold-500',
  Auxiliary: 'border-l-steel',
  Apex: 'border-l-royal',
  'Lord of War': 'border-l-gold-500',
  Allied: 'border-l-edge-400',
};

function getDetachmentDisabledReason(
  det: Detachment,
  composition: { primary_count: number; primary_max: number; auxiliary_budget: number; auxiliary_used: number; apex_budget: number; apex_used: number; warlord_available: boolean; warlord_count: number },
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

export default function RosterPanel() {
  const {
    rosterId,
    rosterName,
    pointsLimit,
    detachments,
    composition,
    totalPoints,
    isValid,
    validationErrors,
    addDetachment,
    removeDetachment,
    removeEntry,
    updateQuantity,
    setValidation,
    clearRoster,
    syncFromResponse,
  } = useRosterStore();

  const [showDetPicker, setShowDetPicker] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const newEntryId = useUIStore((s) => s.newEntryId);
  const setSlotFilter = useUIStore((s) => s.setSlotFilter);

  // Map a native slot name to a display group for the unit browser filter
  function handleSlotClick(slotName: string) {
    const baseName = slotName.includes(' - ') ? slotName.split(' - ', 1)[0].trim() : slotName;
    for (const [group, slots] of Object.entries(SLOT_DISPLAY_GROUPS)) {
      if ((slots as readonly string[]).includes(baseName)) {
        setSlotFilter(group);
        return;
      }
    }
    setSlotFilter(baseName);
  }

  const { data: availableDetachments = [] } = useDetachments();
  const addDetMutation = useAddDetachment(rosterId);
  const removeDetMutation = useRemoveDetachment(rosterId);
  const validateMutation = useValidateRoster(rosterId);

  const grouped = useMemo(() => {
    const groups: Record<string, Detachment[]> = {};
    for (const d of availableDetachments) {
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
  }, [availableDetachments]);

  function handleAddDetachment(det: Detachment) {
    if (addDetMutation.isPending) return;
    setAddError(null);
    setShowDetPicker(false);
    addDetMutation.mutate(
      { detachment_id: det.id, detachment_type: det.type },
      {
        onSuccess: (data) => {
          addDetachment({
            id: data.id,
            detachmentId: data.detachment_id,
            name: data.name,
            type: data.type,
            slots: data.slots,
            entries: [],
          });
          if (rosterId) {
            client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
              syncFromResponse(resp);
            });
          }
        },
        onError: (err: any) => {
          const detail = err?.response?.data?.detail;
          setAddError(detail || 'Failed to add detachment');
          setShowDetPicker(true);
        },
      },
    );
  }

  function handleRemoveDetachment(detId: number) {
    removeDetMutation.mutate(detId, {
      onSuccess: () => {
        removeDetachment(detId);
        if (rosterId) {
          client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
            syncFromResponse(resp);
          });
        }
      },
    });
  }

  function handleRemoveEntry(detachmentId: number, entryId: number) {
    removeEntry(detachmentId, entryId);
    if (rosterId) {
      client.delete(`/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}`)
        .then(() => {
          client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
            syncFromResponse(resp);
          });
        });
    }
  }

  function handleUpdateQty(detachmentId: number, entryId: number, qty: number) {
    updateQuantity(detachmentId, entryId, qty);
    if (rosterId) {
      client.patch(
        `/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}`,
        { quantity: qty },
      );
    }
  }

  function handleValidate() {
    validateMutation.mutate(undefined, {
      onSuccess: (data) => {
        setValidation(data.is_valid, data.errors);
      },
    });
  }

  if (!rosterId) {
    return <RosterSetup />;
  }

  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);
  const auxRemaining = composition.auxiliary_budget - composition.auxiliary_used;
  const apexRemaining = composition.apex_budget - composition.apex_used;

  // Build segments for PointsBar
  const pointsSegments: PointsSegment[] = detachments
    .map((d) => ({
      label: d.name,
      points: d.entries.reduce((s, e) => s + e.totalCost, 0),
      type: d.type,
    }))
    .filter((s) => s.points > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-edge-700/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[13px] font-semibold tracking-[0.12em] text-gold-400 uppercase">
            {rosterName}
          </h2>
          <button
            onClick={clearRoster}
            className="font-label text-[11px] font-semibold tracking-wider text-text-dim uppercase transition-colors hover:text-danger"
          >
            New
          </button>
        </div>
        <PointsBar current={totalPoints} limit={pointsLimit} segments={pointsSegments} />

        {/* Budget chips */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
          <BudgetChip
            label="Primary"
            current={composition.primary_count}
            max={composition.primary_max}
            status={composition.primary_count > 0 ? 'valid' : 'empty'}
          />
          <BudgetChip
            label="Auxiliary"
            current={composition.auxiliary_used}
            max={composition.auxiliary_budget}
            status={auxRemaining < 0 ? 'over' : auxRemaining === 0 && composition.auxiliary_budget > 0 ? 'full' : 'empty'}
          />
          {(composition.apex_budget > 0 || composition.apex_used > 0) && (
            <BudgetChip
              label="Apex"
              current={composition.apex_used}
              max={composition.apex_budget}
              status={apexRemaining < 0 ? 'over' : 'empty'}
            />
          )}
          {composition.warlord_available && (
            <BudgetChip
              label="Warlord"
              current={composition.warlord_count}
              max={1}
              status={composition.warlord_count > 0 ? 'valid' : 'empty'}
            />
          )}
        </div>
      </div>

      {/* Detachments */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {detachments.length === 0 && totalEntries === 0 ? (
          /* Empty state — no detachments yet */
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-700/20 bg-gold-900/10">
              <svg className="h-6 w-6 text-gold-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <p className="font-label text-xs font-semibold tracking-wider text-text-secondary uppercase">
                No detachments yet
              </p>
              <p className="mt-1.5 max-w-[220px] text-[13px] leading-relaxed text-text-dim">
                Add a Primary Detachment below to start building your force.
              </p>
            </div>
            <svg className="h-5 w-5 animate-bounce text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        ) : (
          <>
            <div className="stagger-list space-y-2">
              {detachments.map((det) => (
                <DetachmentSection
                  key={det.id}
                  detachment={det}
                  onRemoveEntry={handleRemoveEntry}
                  onUpdateQty={handleUpdateQty}
                  onRemoveDetachment={handleRemoveDetachment}
                  onSlotClick={handleSlotClick}
                  newEntryId={newEntryId}
                />
              ))}
            </div>
            {/* Guidance when detachments exist but are empty */}
            {detachments.length > 0 && totalEntries === 0 && (
              <div className="rounded-sm border border-edge-600/20 bg-plate-800/15 px-4 py-3 text-center">
                <p className="text-[13px] text-text-dim">
                  Click a slot name above or browse units to add them to your roster.
                </p>
              </div>
            )}
          </>
        )}

        {/* Cohort Doctrine */}
        {detachments.length > 0 && <DoctrinePicker />}

        {/* Add Detachment */}
        {!showDetPicker ? (
          <button
            onClick={() => { setShowDetPicker(true); setAddError(null); }}
            className="font-label w-full rounded-sm border border-dashed border-edge-500/30 py-3 text-xs font-semibold tracking-wider text-text-dim uppercase transition-all hover:border-gold-600/30 hover:text-gold-400 hover:shadow-[0_0_12px_rgba(130,102,36,0.04)]"
          >
            + Add Detachment
          </button>
        ) : (
          <div className="animate-fade-in glow-border rounded-sm bg-plate-800/80 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="font-label text-[11px] font-bold tracking-[0.12em] text-text-secondary uppercase">
                Select Detachment
              </p>
              <button
                onClick={() => setShowDetPicker(false)}
                className="text-xs text-text-dim transition-colors hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>

            {addError && (
              <p className="rounded-sm bg-danger/8 px-2.5 py-1.5 text-xs text-danger">{addError}</p>
            )}

            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {grouped.map(([type, dets]) => {
                const sectionColor = PICKER_SECTION_COLORS[type] ?? 'border-l-edge-500/30 text-text-dim';
                return (
                  <div key={type}>
                    <p className={`font-label mb-1.5 border-l-2 pl-2 text-[11px] font-bold tracking-[0.15em] uppercase ${sectionColor}`}>
                      {type}
                    </p>
                    <div className="space-y-1">
                      {dets.map((d) => {
                        const disabledReason = getDetachmentDisabledReason(d, composition);
                        const isDisabled = disabledReason !== null || addDetMutation.isPending;
                        const stripe = PICKER_STRIPE_COLORS[type] ?? 'border-l-edge-500';
                        const finite = d.constraints
                          ? Object.entries(d.constraints).filter(([, c]) => c.max < 100)
                          : [];
                        const visibleSlots = finite.slice(0, 6);
                        const remaining = finite.length - visibleSlots.length;
                        return (
                          <button
                            key={d.id}
                            onClick={() => !isDisabled && handleAddDetachment(d)}
                            disabled={isDisabled}
                            className={`block w-full rounded-sm border-l-2 text-left transition-all ${stripe} ${
                              isDisabled
                                ? 'cursor-not-allowed opacity-50 bg-plate-900/30'
                                : 'bg-plate-900/50 hover:bg-plate-700/40 hover:shadow-[0_0_8px_rgba(130,102,36,0.04)]'
                            }`}
                          >
                            <div className="px-3 py-2">
                              {/* Name + disabled reason */}
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[13px] font-medium ${isDisabled ? 'text-text-dim/60' : 'text-text-primary'}`}>
                                  {d.name}
                                  {d.faction && (
                                    <span className="ml-1 text-[11px] text-text-dim">[{d.faction}]</span>
                                  )}
                                </span>
                                {disabledReason && (
                                  <span className="shrink-0 rounded-sm border border-danger/20 bg-danger/8 px-1.5 py-0.5 font-label text-[10px] font-semibold tracking-wider text-danger/70 uppercase">
                                    {disabledReason}
                                  </span>
                                )}
                              </div>
                              {/* Slot chips — always show */}
                              {visibleSlots.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {visibleSlots.map(([slot, c]) => (
                                    <span
                                      key={slot}
                                      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] ${
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
        )}
      </div>

      {/* Footer */}
      <div className="space-y-2 border-t border-edge-700/40 p-4">
        <ValidationResults isValid={isValid} errors={validationErrors} />
        <button
          onClick={handleValidate}
          disabled={totalEntries === 0 || validateMutation.isPending}
          className="font-label flex w-full items-center justify-center gap-2 rounded-sm border border-edge-600/30 bg-plate-700/50 py-2 text-xs font-semibold tracking-wider text-text-secondary uppercase transition-all hover:border-gold-600/20 hover:bg-plate-600/50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-25"
        >
          {validateMutation.isPending ? 'Validating...' : 'Validate Roster'}
          {isValid !== null && !validateMutation.isPending && (
            <span className={`flex h-4 w-4 items-center justify-center rounded-full ${
              isValid ? 'bg-valid/20' : 'bg-danger/20'
            }`}>
              {isValid ? (
                <svg className="h-2.5 w-2.5 text-valid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="font-data text-[9px] font-bold text-danger">{validationErrors.length}</span>
              )}
            </span>
          )}
        </button>
        <ExportButton />
      </div>
    </div>
  );
}

/* ── Budget Chip ── */
function BudgetChip({ label, current, max, status }: {
  label: string;
  current: number;
  max: number;
  status: 'valid' | 'full' | 'over' | 'empty';
}) {
  const barColor = {
    valid: 'bg-valid',
    full: 'bg-caution',
    over: 'bg-danger',
    empty: 'bg-text-dim/20',
  }[status];

  const textColor = {
    valid: 'text-valid/90',
    full: 'text-caution/90',
    over: 'text-danger/90',
    empty: 'text-text-dim',
  }[status];

  const glowClass = {
    valid: 'shadow-[0_0_6px_rgba(56,178,96,0.06)]',
    full: 'shadow-[0_0_6px_rgba(196,154,32,0.06)]',
    over: 'shadow-[0_0_6px_rgba(196,64,64,0.06)]',
    empty: '',
  }[status];

  return (
    <div className={`flex items-center gap-0 rounded-sm border border-edge-600/25 bg-plate-800/50 transition-all ${glowClass}`}>
      <span className={`w-[3px] self-stretch rounded-l-sm transition-colors ${barColor}`} />
      <div className="flex items-center gap-2 px-2.5 py-1">
        <span className="font-label text-[11px] font-semibold tracking-wider text-text-secondary uppercase">
          {label}
        </span>
        <span className={`font-data text-xs font-medium tabular-nums transition-colors ${textColor}`}>
          {current}/{max}
        </span>
      </div>
    </div>
  );
}
