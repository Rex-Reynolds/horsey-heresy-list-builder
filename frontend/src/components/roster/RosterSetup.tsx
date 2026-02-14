import { useState, useMemo } from 'react';
import { useDetachments } from '../../api/detachments.ts';
import { useCreateRoster } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import type { Detachment } from '../../types/index.ts';

const POINTS_OPTIONS = [1000, 1500, 2000, 2500, 3000, 4000, 5000];

const TYPE_ORDER = ['Primary', 'Auxiliary', 'Apex', 'Lord of War', 'Allied', 'Other'];

export default function RosterSetup() {
  const { data: detachments = [], isLoading } = useDetachments();
  const createMutation = useCreateRoster();
  const setRoster = useRosterStore((s) => s.setRoster);

  const [name, setName] = useState('My Solar Auxilia List');
  const [detachment, setDetachment] = useState('');
  const [points, setPoints] = useState(3000);

  // Group detachments by type for the dropdown
  const grouped = useMemo(() => {
    const groups: Record<string, Detachment[]> = {};
    for (const d of detachments) {
      const type = d.type || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(d);
    }
    // Sort groups by TYPE_ORDER
    const sorted: [string, Detachment[]][] = [];
    for (const type of TYPE_ORDER) {
      if (groups[type]) sorted.push([type, groups[type]]);
    }
    // Add any remaining types not in the order
    for (const [type, dets] of Object.entries(groups)) {
      if (!TYPE_ORDER.includes(type)) sorted.push([type, dets]);
    }
    return sorted;
  }, [detachments]);

  const selectedDet = detachments.find((d) => d.name === detachment);

  function handleCreate() {
    const detType = detachment || (detachments[0]?.name ?? 'Primary');
    createMutation.mutate(
      { name, detachment_type: detType, points_limit: points },
      {
        onSuccess: (data) => {
          setRoster(data.id, data.name, data.detachment_type, data.points_limit);
        },
      },
    );
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gold-400">New Roster</h2>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Roster Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gold-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Detachment Type</label>
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading...</p>
        ) : (
          <select
            value={detachment}
            onChange={(e) => setDetachment(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gold-500"
          >
            {grouped.map(([type, dets]) => (
              <optgroup key={type} label={type}>
                {dets.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                    {d.faction ? ` [${d.faction}]` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>

      {/* Show slot constraints for selected detachment */}
      {selectedDet && Object.keys(selectedDet.constraints).length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-400">Slot Constraints</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(selectedDet.constraints).map(([slot, limits]) => (
              <div key={slot} className="flex justify-between text-slate-300">
                <span>{slot}</span>
                <span className="text-slate-500">
                  {limits.min > 0 ? `${limits.min}-` : '0-'}
                  {limits.max >= 999 ? 'unlimited' : limits.max}
                </span>
              </div>
            ))}
          </div>
          {selectedDet.unit_restrictions &&
            Object.keys(selectedDet.unit_restrictions).length > 0 && (
              <div className="mt-2 border-t border-slate-700 pt-2">
                <p className="mb-1 text-xs font-medium text-slate-500">Unit Restrictions</p>
                {Object.entries(selectedDet.unit_restrictions).map(([slot, restriction]) => (
                  <p key={slot} className="text-xs text-slate-400">
                    <span className="text-slate-300">{slot}:</span> {restriction}
                  </p>
                ))}
              </div>
            )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-slate-400">Points Limit</label>
        <select
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-gold-500"
        >
          {POINTS_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p} pts
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCreate}
        disabled={createMutation.isPending}
        className="w-full rounded-lg bg-gold-600 py-2 text-sm font-medium text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
      >
        {createMutation.isPending ? 'Creating...' : 'Create Roster'}
      </button>
    </div>
  );
}
