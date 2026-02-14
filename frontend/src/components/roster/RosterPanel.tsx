import { FOC_CATEGORIES } from '../../types/index.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useDeleteEntry, useUpdateEntry, useValidateRoster } from '../../api/rosters.ts';
import PointsBar from '../layout/PointsBar.tsx';
import RosterSetup from './RosterSetup.tsx';
import RosterCategoryGroup from './RosterCategoryGroup.tsx';
import ValidationResults from './ValidationResults.tsx';
import ExportButton from './ExportButton.tsx';
import EmptyState from '../common/EmptyState.tsx';

export default function RosterPanel() {
  const {
    rosterId,
    rosterName,
    detachmentType,
    pointsLimit,
    entries,
    totalPoints,
    isValid,
    validationErrors,
    removeEntry,
    updateQuantity,
    setValidation,
    clearRoster,
  } = useRosterStore();

  const deleteMutation = useDeleteEntry(rosterId);
  const updateMutation = useUpdateEntry(rosterId);
  const validateMutation = useValidateRoster(rosterId);

  function handleRemove(entryId: number) {
    removeEntry(entryId);
    deleteMutation.mutate(entryId);
  }

  function handleUpdateQty(entryId: number, qty: number) {
    updateQuantity(entryId, qty);
    updateMutation.mutate({ entryId, quantity: qty });
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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gold-400">{rosterName}</h2>
          <button
            onClick={clearRoster}
            className="text-xs text-slate-500 transition-colors hover:text-red-400"
          >
            New
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-500">{detachmentType}</p>
        <PointsBar current={totalPoints} limit={pointsLimit} />
      </div>

      {/* Entries */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <EmptyState message="No units added yet. Browse units and add them." icon="⚔️" />
        ) : (
          FOC_CATEGORIES.map((cat) => (
            <RosterCategoryGroup
              key={cat}
              category={cat}
              entries={entries.filter((e) => e.category === cat)}
              onRemove={handleRemove}
              onUpdateQty={handleUpdateQty}
            />
          ))
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-slate-700 p-4">
        <ValidationResults isValid={isValid} errors={validationErrors} />
        <button
          onClick={handleValidate}
          disabled={entries.length === 0 || validateMutation.isPending}
          className="w-full rounded-lg bg-slate-700 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {validateMutation.isPending ? 'Validating...' : 'Validate Roster'}
        </button>
        <ExportButton />
      </div>
    </div>
  );
}
