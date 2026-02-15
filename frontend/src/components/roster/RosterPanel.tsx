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
import { SLOT_DISPLAY_GROUPS } from '../../types/index.ts';
import PointsBar from '../layout/PointsBar.tsx';
import type { PointsSegment } from '../layout/PointsBar.tsx';
import RosterSetup from './RosterSetup.tsx';
import DetachmentSection from './DetachmentSection.tsx';
import DetachmentPickerModal from './DetachmentPickerModal.tsx';
import ValidationResults from './ValidationResults.tsx';
import ExportButton from './ExportButton.tsx';
import DoctrinePicker from './DoctrinePicker.tsx';
import CompositionSummary from './CompositionSummary.tsx';
import OnboardingHint from './OnboardingHint.tsx';
import ConfirmDialog from '../common/ConfirmDialog.tsx';

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
  const [confirmNewRoster, setConfirmNewRoster] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(rosterName);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const newEntryId = useUIStore((s) => s.newEntryId);
  const setSlotFilter = useUIStore((s) => s.setSlotFilter);
  const setSlotFilterContext = useUIStore((s) => s.setSlotFilterContext);
  const addToast = useUIStore((s) => s.addToast);
  const setMobileRosterOpen = useUIStore((s) => s.setMobileRosterOpen);

  // Map a native slot name to a display group for the unit browser filter
  function handleSlotClick(slotName: string, detachmentName: string, filled: number, max: number) {
    const baseName = slotName.includes(' - ') ? slotName.split(' - ', 1)[0].trim() : slotName;
    let displayGroup = baseName;
    for (const [group, slots] of Object.entries(SLOT_DISPLAY_GROUPS)) {
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
        onError: (err: any) => {
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

  // Determine onboarding step
  const onboardingStep = detachments.length === 0
    ? 1
    : totalEntries === 0
      ? 2
      : null;

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <div className="sticky-roster-header border-b border-edge-700/40 p-4">
        <div className="mb-3 flex items-center justify-between">
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

        {/* Budget chips */}
        <div className="divider-glow mt-3 mb-3" />
        <div className="flex flex-wrap gap-x-3 gap-y-2">
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

        {/* Composition Summary */}
        {detachments.length > 0 && totalEntries > 0 && (
          <CompositionSummary detachments={detachments} totalPoints={totalPoints} />
        )}
      </div>

      {/* Detachments */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
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
            {detachments.map((det) => (
              <DetachmentSection
                key={det.id}
                detachment={det}
                onRemoveEntry={handleRemoveEntry}
                onUpdateQty={handleUpdateQty}
                onRemoveDetachment={handleRemoveDetachment}
                onSlotClick={(slotName, filled, max) => handleSlotClick(slotName, det.name, filled, max)}
                newEntryId={newEntryId}
              />
            ))}
          </div>
        )}

        {/* Cohort Doctrine */}
        {detachments.length > 0 && <DoctrinePicker />}

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
