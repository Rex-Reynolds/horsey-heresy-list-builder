import { useState } from 'react';
import { useCreateRoster } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';

const POINTS_OPTIONS = [1000, 1500, 2000, 2500, 3000, 4000, 5000];

export default function RosterSetup() {
  const createMutation = useCreateRoster();
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse);

  const [name, setName] = useState('My Solar Auxilia List');
  const [points, setPoints] = useState(3000);

  function handleCreate() {
    createMutation.mutate(
      { name, points_limit: points },
      {
        onSuccess: (data) => {
          syncFromResponse(data);
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs animate-fade-in-scale rounded-sm border border-edge-600/30 bg-plate-900/60 p-6 space-y-5">
        {/* Emblem */}
        <div className="text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-3 text-gold-600/40">
            <path d="M12 2L9 7H4L7 12L4 17H9L12 22L15 17H20L17 12L20 7H15L12 2Z" />
          </svg>
          <h2 className="text-imperial text-xs">New Roster</h2>
          <p className="mt-1 text-[10px] text-text-dim">Configure your force allocation</p>
        </div>

        <div className="divider-glow" />

        {/* Name */}
        <div>
          <label className="font-label mb-1 block text-[9px] font-semibold tracking-wider text-text-dim uppercase">
            Designation
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-sm border border-edge-600/50 bg-plate-800/80 px-3 py-2 text-xs text-text-primary outline-none transition-all focus:border-gold-600/40"
          />
        </div>

        {/* Points */}
        <div>
          <label className="font-label mb-1 block text-[9px] font-semibold tracking-wider text-text-dim uppercase">
            Points Allocation
          </label>
          <select
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full rounded-sm border border-edge-600/50 bg-plate-800/80 px-3 py-2 text-xs text-text-primary outline-none transition-all focus:border-gold-600/40"
          >
            {POINTS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.toLocaleString()} pts
              </option>
            ))}
          </select>
        </div>

        {/* Create */}
        <button
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="font-label w-full rounded-sm bg-gold-600 py-2 text-[10px] font-bold tracking-[0.15em] text-white uppercase transition-all hover:bg-gold-500 disabled:opacity-40"
        >
          {createMutation.isPending ? 'Initializing...' : 'Initialize Roster'}
        </button>

        <p className="text-center text-[9px] leading-relaxed text-text-dim">
          Add detachments after creation to build your force.
        </p>
      </div>
    </div>
  );
}
