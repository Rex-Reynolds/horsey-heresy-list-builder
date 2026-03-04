import { useState } from 'react';
import { useCreateRoster } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { useGameConfig } from '../../config/GameConfigContext.tsx';

export default function RosterSetup() {
  const createMutation = useCreateRoster();
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse);
  const { pointsOptions, defaultPointsLimit, factionLabel } = useGameConfig();

  const [name, setName] = useState(() => `My ${factionLabel} List`);
  const [points, setPoints] = useState(defaultPointsLimit);

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
    <div className="relative flex h-full flex-col items-center justify-center p-8 overflow-hidden">
      {/* Atmospheric background — radial glow + chevron pattern + scanlines */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 setup-scanlines" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(130,102,36,0.08)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 40px,
            rgba(180,143,60,0.3) 40px,
            rgba(180,143,60,0.3) 41px
          )`,
        }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            rgba(180,143,60,0.3) 40px,
            rgba(180,143,60,0.3) 41px
          )`,
        }} />
      </div>

      <div className="imperial-frame imperial-frame-animated relative w-full max-w-sm bg-plate-900/80 p-6 shadow-[0_0_80px_rgba(130,102,36,0.06)]">
        {/* Inner corner ornaments */}
        <div className="imperial-frame-inner imperial-frame-inner-animated pointer-events-none absolute inset-0" />

        {/* Staggered content reveal */}
        <div className="setup-stagger space-y-4">
          {/* Emblem — compact */}
          <div className="flex items-center justify-center gap-3">
            <svg
              viewBox="0 0 64 28"
              className="aquila-draw aquila-fill w-16 text-gold-500/50"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
            >
              <path d="M28 14 L6 5 L12 11 L3 9 L14 14 L3 19 L12 17 L6 23 Z" />
              <path d="M36 14 L58 5 L52 11 L61 9 L50 14 L61 19 L52 17 L58 23 Z" />
              <path d="M32 4 L34 12 L40 8 L35 14 L42 14 L35 16 L40 20 L34 16 L32 24 L30 16 L24 20 L29 16 L22 14 L29 14 L24 8 L30 12 Z" />
              <circle cx="32" cy="14" r="3.5" />
              <circle cx="32" cy="14" r="2" fill="none" strokeWidth="0.5" />
            </svg>
            <div>
              <h2 className="text-imperial text-base tracking-[0.14em]">New Roster</h2>
              <p className="text-[11px] text-text-dim animate-text-reveal" style={{ animationDelay: '2.0s' }}>Configure your force allocation</p>
            </div>
          </div>

          <div className="divider-imperial" />

          {/* Name */}
          <div>
            <label className="font-label mb-1.5 block text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
              Designation
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-imperial w-full rounded-sm px-3.5 py-2.5 text-sm text-text-primary outline-none"
            />
          </div>

          {/* Points — tier quick-select buttons */}
          <div>
            <label className="font-label mb-1.5 block text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
              Points Allocation
            </label>
            <div className={`grid gap-1.5 ${pointsOptions.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-4'}`}>
              {pointsOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPoints(opt.value)}
                  className={`rounded-sm border px-1.5 py-2 text-center transition-all ${
                    points === opt.value
                      ? 'border-gold-500/40 bg-gold-900/30 shadow-[0_0_8px_rgba(130,102,36,0.1)]'
                      : 'border-edge-600/25 bg-plate-800/20 hover:border-gold-600/25 hover:bg-plate-800/40'
                  }`}
                >
                  <span className={`font-data text-[13px] font-semibold tabular-nums block ${points === opt.value ? 'text-gold-400' : 'text-text-primary'}`}>
                    {opt.value >= 1000 ? `${(opt.value / 1000).toFixed(opt.value % 1000 === 0 ? 0 : 1)}k` : opt.value}
                  </span>
                  <span className={`font-label text-[8px] tracking-wider uppercase block mt-0.5 ${points === opt.value ? 'text-gold-500/70' : 'text-text-dim/60'}`}>
                    {opt.label.replace(/\s*\([\d,]+\)/, '')}
                  </span>
                </button>
              ))}
            </div>
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
            <button
              onClick={() => useUIStore.getState().setShowRosterDrawer(true)}
              className="ml-1 text-gold-500/60 underline underline-offset-2 transition-colors hover:text-gold-400"
            >
              Load existing
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
