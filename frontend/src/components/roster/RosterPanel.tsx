import { useState, useMemo } from 'react';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useDetachments } from '../../api/detachments.ts';
import {
  useAddDetachment,
  useRemoveDetachment,
  useValidateRoster,
} from '../../api/rosters.ts';
import client from '../../api/client.ts';
import type { Detachment } from '../../types/index.ts';
import PointsBar from '../layout/PointsBar.tsx';
import RosterSetup from './RosterSetup.tsx';
import DetachmentSection from './DetachmentSection.tsx';
import ValidationResults from './ValidationResults.tsx';
import ExportButton from './ExportButton.tsx';
import EmptyState from '../common/EmptyState.tsx';

const TYPE_ORDER = ['Primary', 'Auxiliary', 'Apex', 'Lord of War', 'Allied', 'Other'];

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
    setAddError(null);
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
          setShowDetPicker(false);
          if (rosterId) {
            client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
              syncFromResponse(resp);
            });
          }
        },
        onError: (err: any) => {
          const detail = err?.response?.data?.detail;
          setAddError(detail || 'Failed to add detachment');
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-edge-700/40 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[11px] font-semibold tracking-wider text-gold-400 uppercase">
            {rosterName}
          </h2>
          <button
            onClick={clearRoster}
            className="font-label text-[9px] font-semibold tracking-wider text-text-dim uppercase transition-colors hover:text-danger"
          >
            New
          </button>
        </div>
        <PointsBar current={totalPoints} limit={pointsLimit} />

        {/* Budget chips */}
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
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
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3.5">
        {detachments.length === 0 && totalEntries === 0 ? (
          <EmptyState
            message="Add a Primary Detachment to begin"
            icon="⚔️"
          />
        ) : (
          <div className="stagger-list space-y-1.5">
            {detachments.map((det) => (
              <DetachmentSection
                key={det.id}
                detachment={det}
                onRemoveEntry={handleRemoveEntry}
                onUpdateQty={handleUpdateQty}
                onRemoveDetachment={handleRemoveDetachment}
              />
            ))}
          </div>
        )}

        {/* Add Detachment */}
        {!showDetPicker ? (
          <button
            onClick={() => { setShowDetPicker(true); setAddError(null); }}
            className="font-label w-full rounded-sm border border-dashed border-edge-500/40 py-2 text-[10px] font-semibold tracking-wider text-text-dim uppercase transition-all hover:border-gold-600/30 hover:text-gold-400"
          >
            + Add Detachment
          </button>
        ) : (
          <div className="animate-fade-in glow-border rounded-sm bg-plate-800/80 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-label text-[9px] font-bold tracking-wider text-text-secondary uppercase">
                Select Detachment
              </p>
              <button
                onClick={() => setShowDetPicker(false)}
                className="text-[10px] text-text-dim transition-colors hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>

            {addError && (
              <p className="bg-danger/8 px-2 py-1 text-[10px] text-danger">{addError}</p>
            )}

            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {grouped.map(([type, dets]) => (
                <div key={type}>
                  <p className="font-label mb-0.5 mt-1.5 text-[9px] font-bold tracking-[0.15em] text-text-dim uppercase first:mt-0">
                    {type}
                  </p>
                  {dets.map((d) => {
                    const disabledReason = getDetachmentDisabledReason(d, composition);
                    const isDisabled = disabledReason !== null || addDetMutation.isPending;
                    return (
                      <button
                        key={d.id}
                        onClick={() => !isDisabled && handleAddDetachment(d)}
                        disabled={isDisabled}
                        className={`block w-full px-2 py-1 text-left text-[11px] transition-all ${
                          isDisabled
                            ? 'cursor-not-allowed text-text-dim/40'
                            : 'text-text-secondary hover:bg-plate-700/40 hover:text-text-primary'
                        }`}
                        title={disabledReason ?? undefined}
                      >
                        <span className="flex items-center justify-between">
                          <span>
                            {d.name}
                            {d.faction ? (
                              <span className="ml-1 text-text-dim">[{d.faction}]</span>
                            ) : null}
                          </span>
                          {disabledReason && (
                            <span className="ml-2 shrink-0 text-[9px] text-text-dim/40">{disabledReason}</span>
                          )}
                        </span>
                        {!isDisabled && d.constraints && Object.keys(d.constraints).length > 0 && (() => {
                          const finite = Object.entries(d.constraints).filter(([, c]) => c.max < 100);
                          if (finite.length === 0) return null;
                          const visible = finite.slice(0, 6);
                          const remaining = finite.length - visible.length;
                          return (
                            <span className="mt-0.5 flex flex-wrap gap-0.5">
                              {visible.map(([slot, c]) => (
                                <span key={slot} className="font-data border border-edge-700/20 bg-plate-700/30 px-1 py-px text-[8px] text-text-dim">
                                  {slot} {c.max}
                                </span>
                              ))}
                              {remaining > 0 && (
                                <span className="px-1 py-px text-[8px] text-text-dim/40">
                                  +{remaining} more
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="space-y-1.5 border-t border-edge-700/40 p-3.5">
        <ValidationResults isValid={isValid} errors={validationErrors} />
        <button
          onClick={handleValidate}
          disabled={totalEntries === 0 || validateMutation.isPending}
          className="font-label w-full rounded-sm bg-plate-700/60 py-1.5 text-[10px] font-semibold tracking-wider text-text-secondary uppercase transition-all hover:bg-plate-600/60 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-25"
        >
          {validateMutation.isPending ? 'Validating...' : 'Validate Roster'}
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

  return (
    <div className="flex items-center gap-0 rounded-sm border border-edge-600/30 bg-plate-800/60">
      <span className={`w-[3px] self-stretch rounded-l-sm ${barColor}`} />
      <div className="flex items-center gap-1.5 px-2 py-0.5">
        <span className="font-label text-[9px] font-semibold tracking-wider text-text-secondary uppercase">
          {label}
        </span>
        <span className={`font-data text-[10px] font-medium tabular-nums ${textColor}`}>
          {current}/{max}
        </span>
      </div>
    </div>
  );
}
