import { useState } from 'react';
import { useCreateRoster } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';

const POINTS_OPTIONS = [1000, 1500, 2000, 2500, 3000, 4000, 5000];

const POINTS_LABELS: Record<number, string> = {
  1000: 'Skirmish',
  1500: 'Patrol',
  2000: 'Strike Force',
  2500: 'Escalation',
  3000: 'Standard',
  4000: 'Grand Battle',
  5000: 'Apocalypse',
};

function AnimatedAquila() {
  return (
    <svg
      viewBox="0 0 64 28"
      className="aquila-draw aquila-fill mx-auto mb-4 w-20 text-gold-500/50"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
    >
      {/* Left wing */}
      <path d="M28 14 L6 5 L12 11 L3 9 L14 14 L3 19 L12 17 L6 23 Z" />
      {/* Right wing */}
      <path d="M36 14 L58 5 L52 11 L61 9 L50 14 L61 19 L52 17 L58 23 Z" />
      {/* Center star */}
      <path d="M32 4 L34 12 L40 8 L35 14 L42 14 L35 16 L40 20 L34 16 L32 24 L30 16 L24 20 L29 16 L22 14 L29 14 L24 8 L30 12 Z" />
      {/* Inner ring */}
      <circle cx="32" cy="14" r="3.5" />
      <circle cx="32" cy="14" r="2" fill="none" strokeWidth="0.5" />
    </svg>
  );
}

export default function RosterSetup() {
  const createMutation = useCreateRoster();
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse);

  const [name, setName] = useState('My Solar Auxilia List');
  const [points, setPoints] = useState(3000);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length > 0;

  function handleCreate() {
    if (!nameValid) return;
    createMutation.mutate(
      { name: trimmedName, points_limit: points },
      {
        onSuccess: (data) => {
          syncFromResponse(data);
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="imperial-frame imperial-frame-animated relative w-full max-w-sm bg-plate-900/60 p-8">
        {/* Inner corner ornaments */}
        <div className="imperial-frame-inner imperial-frame-inner-animated pointer-events-none absolute inset-0" />

        {/* Staggered content reveal */}
        <div className="setup-stagger space-y-6">
          {/* Emblem */}
          <div className="text-center">
            <AnimatedAquila />
            <h2 className="text-imperial text-base tracking-[0.14em]">New Roster</h2>
            <p className="mt-1.5 text-xs text-text-dim">Configure your force allocation</p>
          </div>

          <div className="divider-imperial" />

          {/* Name */}
          <div>
            <label className="font-label mb-2 block text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
              Designation
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-imperial w-full rounded-sm px-3.5 py-2.5 text-sm text-text-primary outline-none"
            />
          </div>

          {/* Points */}
          <div>
            <label className="font-label mb-2 block text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
              Points Allocation
            </label>
            <select
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="input-imperial w-full rounded-sm px-3.5 py-2.5 text-sm text-text-primary outline-none"
            >
              {POINTS_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p.toLocaleString()} pts — {POINTS_LABELS[p] ?? ''}
                </option>
              ))}
            </select>
          </div>

          {/* Create */}
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending || !nameValid}
            className="btn-imperial font-label w-full rounded-sm bg-gold-600 py-3 text-xs font-bold tracking-[0.15em] text-white uppercase disabled:opacity-40"
          >
            {createMutation.isPending ? 'Initializing...' : 'Initialize Roster'}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-text-dim">
            Add detachments after creation to build your force.
          </p>
        </div>
      </div>
    </div>
  );
}
