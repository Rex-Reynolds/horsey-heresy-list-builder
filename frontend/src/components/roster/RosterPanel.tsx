import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { UndoAction } from '../../stores/uiStore.ts';
import { useGameConfig } from '../../config/GameConfigContext.tsx';
import PointsBar from '../layout/PointsBar.tsx';
import type { PointsSegment } from '../layout/PointsBar.tsx';
import RosterSetup from './RosterSetup.tsx';
import DetachmentSection from './DetachmentSection.tsx';
import DetachmentPickerModal from './DetachmentPickerModal.tsx';
import ValidationResults from './ValidationResults.tsx';
import ExportButton from './ExportButton.tsx';
import DoctrinePicker from './DoctrinePicker.tsx';
import DetachmentRulePicker from './DetachmentRulePicker.tsx';
import CompletenessRing from './CompletenessRing.tsx';
import PointsBreakdown from './PointsBreakdown.tsx';
import ArmyAdvice from './ArmyAdvice.tsx';
import OnboardingHint from './OnboardingHint.tsx';
import ConfirmDialog from '../common/ConfirmDialog.tsx';

function getNextActionHint(
  composition: { primary_count: number; auxiliary_budget: number; auxiliary_used: number },
  detachmentCount: number,
  entryCount: number,
): { text: string; type: 'add-detachment' | 'browse' } | null {
  if (composition.primary_count === 0 && detachmentCount === 0) {
    return { text: 'Add a Primary Detachment to begin', type: 'add-detachment' };
  }
  if (detachmentCount > 0 && entryCount === 0) {
    return { text: 'Browse units to fill your detachment slots', type: 'browse' };
  }
  const auxRemaining = composition.auxiliary_budget - composition.auxiliary_used;
  if (detachmentCount > 0 && entryCount > 0 && auxRemaining > 0) {
    return { text: `You have ${auxRemaining} Auxiliary slot${auxRemaining !== 1 ? 's' : ''} \u2014 add a detachment?`, type: 'add-detachment' };
  }
  return null;
}

export default function RosterPanel() {
  const { displayGroups, hasDoctrine, hasDetachmentRule } = useGameConfig();
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
    addEntry,
    removeEntry,
    updateQuantity,
    reorderEntries,
    setValidation,
    clearRoster,
    syncFromResponse,
  } = useRosterStore();

  const [showDetPicker, setShowDetPicker] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmNewRoster, setConfirmNewRoster] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(rosterName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const newEntryId = useUIStore((s) => s.newEntryId);
  const setSlotFilter = useUIStore((s) => s.setSlotFilter);
  const setSlotFilterContext = useUIStore((s) => s.setSlotFilterContext);
  const addToast = useUIStore((s) => s.addToast);
  const setNewEntryId = useUIStore((s) => s.setNewEntryId);
  const setMobileRosterOpen = useUIStore((s) => s.setMobileRosterOpen);
  const pushUndo = useUIStore((s) => s.pushUndo);

  // Map a native slot name to a display group for the unit browser filter
  function handleSlotClick(slotName: string, detachmentName: string, filled: number, max: number) {
    const baseName = slotName.includes(' - ') ? slotName.split(' - ', 1)[0].trim() : slotName;
    let displayGroup = baseName;
    for (const [group, slots] of Object.entries(displayGroups)) {
      if ((slots as readonly string[]).includes(baseName)) {
        displayGroup = group;
        break;
      }
    }
    setSlotFilter(displayGroup);
    setSlotFilterContext({ slotName, detachmentName, filled, max });

    // On mobile, close the roster drawer so user sees the browser
    if (window.innerWidth < 1024) {
      setMobileRosterOpen(false);
    }
  }

  const { data: availableDetachments = [] } = useDetachments();
  const addDetMutation = useAddDetachment(rosterId);
  const removeDetMutation = useRemoveDetachment(rosterId);
  const validateMutation = useValidateRoster(rosterId);

  // Auto-validate when roster content changes (debounced)
  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);
  const autoValidateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!rosterId || totalEntries === 0) return;
    clearTimeout(autoValidateTimer.current);
    autoValidateTimer.current = setTimeout(() => {
      validateMutation.mutate(undefined, {
        onSuccess: (data) => setValidation(data.is_valid, data.errors),
      });
    }, 800);
    return () => clearTimeout(autoValidateTimer.current);
  }, [rosterId, totalEntries, totalPoints, detachments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitRename = useCallback(() => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== rosterName && rosterId) {
      client.patch(`/api/rosters/${rosterId}`, { name: trimmed }).then(({ data }) => {
        syncFromResponse(data);
      });
    } else {
      setDraftName(rosterName);
    }
    setEditingName(false);
  }, [draftName, rosterName, rosterId, syncFromResponse]);

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
        onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
          const detail = err?.response?.data?.detail;
          setAddError(detail || 'Failed to add detachment');
          setShowDetPicker(true);
        },
      },
    );
  }

  function handleRemoveDetachment(detId: number) {
    // Snapshot for undo
    const det = detachments.find((d) => d.id === detId);
    const detSnapshot = det ? { ...det, entries: [...det.entries] } : null;

    removeDetMutation.mutate(detId, {
      onSuccess: () => {
        removeDetachment(detId);
        if (rosterId) {
          client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
            syncFromResponse(resp);
          });
        }
        // Undo toast
        if (detSnapshot) {
          addToast(`${detSnapshot.name} removed`, 'success', () => {
            // Re-add detachment via API
            if (!rosterId) return;
            client.post(`/api/rosters/${rosterId}/detachments`, {
              detachment_id: detSnapshot.detachmentId,
              detachment_type: detSnapshot.type,
            }).then(() => {
              client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
                syncFromResponse(resp);
              });
              addToast(`${detSnapshot.name} restored`, 'info');
            }).catch(() => {
              addToast('Failed to restore detachment', 'error');
            });
          });
        }
      },
    });
  }

  function handleRemoveEntry(detachmentId: number, entryId: number) {
    // Snapshot for undo
    const det = detachments.find((d) => d.id === detachmentId);
    const entry = det?.entries.find((e) => e.id === entryId);
    const entrySnapshot = entry ? { ...entry } : null;

    removeEntry(detachmentId, entryId);
    // Record undo action
    if (entrySnapshot) {
      pushUndo({
        type: 'remove_entry',
        description: `removed ${entrySnapshot.name}`,
        payload: {
          detachmentId,
          entryId,
          unitId: entrySnapshot.unitId,
          quantity: entrySnapshot.quantity,
          upgrades: entrySnapshot.upgrades,
        },
      } as UndoAction);
    }
    if (rosterId) {
      client.delete(`/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}`)
        .then(() => {
          client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
            syncFromResponse(resp);
          });
          // Undo toast
          if (entrySnapshot) {
            addToast(`${entrySnapshot.name} removed`, 'success', () => {
              // Re-add entry via API
              client.post(`/api/rosters/${rosterId}/detachments/${detachmentId}/entries`, {
                unit_id: entrySnapshot.unitId,
                quantity: entrySnapshot.quantity,
                upgrades: entrySnapshot.upgrades,
              }).then(() => {
                client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
                  syncFromResponse(resp);
                });
                addToast(`${entrySnapshot.name} restored`, 'info');
              }).catch(() => {
                addToast('Failed to restore unit', 'error');
              });
            });
          }
        });
    }
  }

  function handleDuplicateEntry(detachmentId: number, entry: import('../../stores/rosterStore.ts').RosterEntry) {
    if (!rosterId) return;
    client.post(`/api/rosters/${rosterId}/detachments/${detachmentId}/entries`, {
      unit_id: entry.unitId,
      quantity: entry.quantity,
      upgrades: entry.upgrades,
    }).then(({ data }) => {
      addEntry(detachmentId, {
        id: data.id,
        unitId: entry.unitId,
        name: entry.name,
        category: entry.category,
        baseCost: entry.baseCost,
        costPerModel: entry.costPerModel,
        upgrades: entry.upgrades,
        upgradeNames: entry.upgradeNames,
        upgradeCost: entry.upgradeCost,
        quantity: entry.quantity,
        totalCost: data.total_cost,
        modelMin: entry.modelMin,
        modelMax: entry.modelMax,
      });
      addToast(`Duplicated ${entry.name}`);
      setNewEntryId(data.id);
      client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
        syncFromResponse(resp);
      });
    }).catch((err) => {
      addToast(err?.response?.data?.detail ?? 'Failed to duplicate', 'error');
    });
  }

  function handleClearAll(detachmentId: number) {
    const det = detachments.find((d) => d.id === detachmentId);
    if (!det || !rosterId) return;

    // Delete all entries sequentially via API, then sync
    Promise.all(
      det.entries.map((e) =>
        client.delete(`/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${e.id}`)
      )
    ).then(() => {
      client.get(`/api/rosters/${rosterId}`).then(({ data: resp }) => {
        syncFromResponse(resp);
      });
      addToast(`Cleared ${det.entries.length} unit${det.entries.length !== 1 ? 's' : ''} from ${det.name}`);
    }).catch(() => {
      addToast('Failed to clear units', 'error');
    });
  }

  function handleUpdateQty(detachmentId: number, entryId: number, qty: number) {
    const det = detachments.find((d) => d.id === detachmentId);
    const entry = det?.entries.find((e) => e.id === entryId);
    if (entry) {
      pushUndo({
        type: 'update_quantity',
        description: `${entry.name} qty ${entry.quantity} → ${qty}`,
        payload: { detachmentId, entryId, previousQuantity: entry.quantity, newQuantity: qty },
      } as UndoAction);
    }
    updateQuantity(detachmentId, entryId, qty);
    if (rosterId) {
      client.patch(
        `/api/rosters/${rosterId}/detachments/${detachmentId}/entries/${entryId}`,
        { quantity: qty },
      );
    }
  }

  if (!rosterId) {
    return <RosterSetup />;
  }

  const auxRemaining = composition.auxiliary_budget - composition.auxiliary_used;
  const apexRemaining = composition.apex_budget - composition.apex_used;

  // Compute completeness: how many required slot entries are filled vs needed
  const { completenessPercent, completenessRemaining } = (() => {
    let totalRequired = 0;
    let totalFilled = 0;
    for (const det of detachments) {
      for (const status of Object.values(det.slots)) {
        if (status.min > 0) {
          totalRequired += status.min;
          totalFilled += Math.min(status.filled, status.min);
        }
      }
    }
    return {
      completenessPercent: totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 100,
      completenessRemaining: Math.max(0, totalRequired - totalFilled),
    };
  })();

  // Build segments for PointsBar
  const pointsSegments: PointsSegment[] = detachments
    .map((d) => ({
      label: d.name,
      points: d.entries.reduce((s, e) => s + e.totalCost, 0),
      type: d.type,
    }))
    .filter((s) => s.points > 0);

  // Determine onboarding step
  const onboardingStep = detachments.length === 0
    ? 1
    : totalEntries === 0
      ? 2
      : null;

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header — compact layout */}
      <div className="sticky-roster-header border-b border-edge-700/40 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setDraftName(rosterName); setEditingName(false); }
              }}
              className="font-display w-full bg-transparent text-[13px] font-semibold tracking-[0.12em] text-gold-400 uppercase outline-none border-b border-gold-600/40 focus:border-gold-400"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setDraftName(rosterName); setEditingName(true); }}
              className="font-display text-[13px] font-semibold tracking-[0.12em] text-gold-400 uppercase transition-colors hover:text-gold-300"
              title="Click to rename"
            >
              {rosterName}
            </button>
          )}
          <button
            onClick={() => {
              if (detachments.length === 0) { clearRoster(); return; }
              setConfirmNewRoster(true);
            }}
            className="font-label text-[11px] font-semibold tracking-wider text-text-dim uppercase transition-colors hover:text-danger"
          >
            New
          </button>
        </div>
        <PointsBar current={totalPoints} limit={pointsLimit} segments={pointsSegments} />

        {/* Points breakdown by slot type */}
        {detachments.length > 0 && totalEntries > 0 && (
          <div className="mt-2">
            <PointsBreakdown detachments={detachments} pointsLimit={pointsLimit} totalPoints={totalPoints} />
          </div>
        )}

        {/* Budget chips — inline row below points bar */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <BudgetChip
            label="Pri"
            current={composition.primary_count}
            max={composition.primary_max}
            status={composition.primary_count > 0 ? 'valid' : 'empty'}
          />
          <BudgetChip
            label="Aux"
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
              label="War"
              current={composition.warlord_count}
              max={1}
              status={composition.warlord_count > 0 ? 'valid' : 'empty'}
            />
          )}
          {/* Completeness ring + inline composition summary */}
          {detachments.length > 0 && totalEntries > 0 && (
            <>
              <CompletenessRing percent={completenessPercent} remaining={completenessRemaining} size={28} />
              <span className="ml-auto font-data text-[10px] tabular-nums text-text-dim">
                {detachments.length} det · {totalEntries} unit{totalEntries !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        {/* Next-action suggestion — only for early onboarding */}
        {(() => {
          const hint = getNextActionHint(composition, detachments.length, totalEntries);
          if (!hint || detachments.length > 1) return null;
          return (
            <button
              onClick={hint.type === 'add-detachment' ? () => { setShowDetPicker(true); setAddError(null); } : hint.type === 'browse' ? () => { if (window.innerWidth < 1024) setMobileRosterOpen(false); } : undefined}
              className="mt-2 flex items-center gap-2 rounded-sm border border-gold-600/15 bg-gold-900/6 px-3 py-1.5 text-left transition-all hover:border-gold-500/20 hover:bg-gold-900/10 w-full"
            >
              <svg className="h-3 w-3 shrink-0 text-gold-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-label text-[11px] text-gold-400/80">{hint.text}</span>
            </button>
          );
        })()}
      </div>

      {/* Detachments */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {/* Contextual army advice — only warnings/suggestions, no dashboard clutter */}
        {detachments.length > 0 && totalEntries > 0 && (
          <ArmyAdvice detachments={detachments} totalPoints={totalPoints} pointsLimit={pointsLimit} />
        )}

        {/* Onboarding hints */}
        {onboardingStep === 1 && (
          <OnboardingHint
            step={1}
            onAction={() => { setShowDetPicker(true); setAddError(null); }}
          />
        )}

        {onboardingStep === 2 && (
          <OnboardingHint
            step={2}
            onAction={() => {
              if (window.innerWidth < 1024) {
                setMobileRosterOpen(false);
              }
            }}
          />
        )}

        {detachments.length > 0 && (
          <div className="stagger-list space-y-2">
            {detachments.map((det, i) => (
              <div key={det.id}>
                {i > 0 && <div className="divider-glow my-2" />}
                <DetachmentSection
                  detachment={det}
                  detachmentIndex={i}
                  onRemoveEntry={handleRemoveEntry}
                  onUpdateQty={handleUpdateQty}
                  onRemoveDetachment={handleRemoveDetachment}
                  onDuplicateEntry={handleDuplicateEntry}
                  onSlotClick={(slotName, filled, max) => handleSlotClick(slotName, det.name, filled, max)}
                  onReorderEntries={reorderEntries}
                  onClearAll={handleClearAll}
                  newEntryId={newEntryId}
                />
              </div>
            ))}
          </div>
        )}

        {/* Cohort Doctrine (HH3) / Detachment Rule (40k) */}
        {detachments.length > 0 && hasDoctrine && <DoctrinePicker />}
        {detachments.length > 0 && hasDetachmentRule && <DetachmentRulePicker />}

        {/* Always-on validation — shown when entries exist */}
        {totalEntries > 0 && (
          <ValidationResults
            isValid={isValid}
            errors={validationErrors}
            onErrorClick={(err) => {
              const match = err.match(/^\[(.+?)\]\s+(.+?):/);
              if (match) {
                const [, detName, slotName] = match;
                const det = detachments.find((d) => d.name === detName);
                if (det) {
                  const slot = det.slots[slotName];
                  handleSlotClick(slotName, detName, slot?.filled ?? 0, slot?.max ?? 0);
                }
              }
            }}
          />
        )}

        {/* Add Detachment button */}
        <button
          onClick={() => { setShowDetPicker(true); setAddError(null); }}
          className="font-label w-full rounded-sm border border-dashed border-edge-500/30 py-3 text-xs font-semibold tracking-wider text-text-dim uppercase transition-all hover:border-gold-600/30 hover:text-gold-400 hover:shadow-[0_0_12px_rgba(130,102,36,0.04)]"
        >
          + Add Detachment
        </button>
      </div>

      {/* Detachment picker modal */}
      <DetachmentPickerModal
        open={showDetPicker}
        detachments={availableDetachments}
        composition={composition}
        addError={addError}
        isPending={addDetMutation.isPending}
        onSelect={handleAddDetachment}
        onClose={() => setShowDetPicker(false)}
      />

      {/* Footer */}
      <div className="space-y-2 border-t border-edge-700/40 p-4">
        <ExportButton />
      </div>

      <ConfirmDialog
        open={confirmNewRoster}
        title="Start New Roster"
        message="This will discard your current roster and all detachments. Are you sure?"
        confirmLabel="Discard"
        variant="danger"
        onConfirm={() => { setConfirmNewRoster(false); clearRoster(); }}
        onCancel={() => setConfirmNewRoster(false)}
      />
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
  const prevCurrent = useRef(current);
  const [bumped, setBumped] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (prevCurrent.current !== current) {
      setBumped(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional animation trigger
      if (status === 'over') setShaking(true);
      const t1 = setTimeout(() => setBumped(false), 350);
      const t2 = setTimeout(() => setShaking(false), 400);
      prevCurrent.current = current;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevCurrent.current = current;
  }, [current, status]);

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
    <div className={`flex items-center gap-0 rounded-sm border border-edge-600/25 bg-plate-800/50 transition-all ${glowClass} ${shaking ? 'animate-budget-shake' : ''}`}>
      <span className={`w-[2px] self-stretch rounded-l-sm transition-colors ${barColor}`} />
      <div className="flex items-center gap-1.5 px-2 py-0.5">
        <span className="font-label text-[10px] font-semibold tracking-wider text-text-secondary uppercase">
          {label}
        </span>
        <span className={`font-data text-[11px] font-medium tabular-nums transition-colors ${textColor} ${bumped ? 'animate-number-bump' : ''}`}>
          {current}/{max}
        </span>
      </div>
    </div>
  );
}
