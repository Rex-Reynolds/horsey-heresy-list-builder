import { useRosterStore } from '../../stores/rosterStore.ts';

interface Props {
  onToggleRoster: () => void;
  rosterVisible: boolean;
}

export default function AppHeader({ onToggleRoster, rosterVisible }: Props) {
  const { totalPoints, pointsLimit, rosterId } = useRosterStore();
  const over = totalPoints > pointsLimit;

  return (
    <header className="relative z-10 border-b border-edge-700 bg-plate-900">
      {/* Top accent — thicker bronze line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold-600/40 to-transparent" />

      <div className="flex items-center justify-between px-5 py-3.5 lg:px-6">
        {/* Left: Identity */}
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:block">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gold-500/50">
              <path d="M12 2L9 7H4L7 12L4 17H9L12 22L15 17H20L17 12L20 7H15L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="text-imperial text-[13px] leading-tight lg:text-sm">
              Solar Auxilia
            </h1>
            <p className="font-label -mt-px text-[9px] font-medium tracking-[0.25em] text-gold-500/70">
              REGIMENTAL DATASLATE
            </p>
          </div>
        </div>

        {/* Center: Points readout (desktop) */}
        {rosterId && (
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-baseline gap-1">
              <span className={`font-data text-sm font-medium tabular-nums ${over ? 'text-danger' : 'text-gold-400'}`}>
                {totalPoints}
              </span>
              <span className="font-data text-[10px] text-text-dim">/</span>
              <span className="font-data text-[10px] text-text-secondary tabular-nums">
                {pointsLimit}
              </span>
            </div>
            <span className="font-label text-[9px] font-semibold tracking-[0.15em] text-text-dim uppercase">
              pts
            </span>
          </div>
        )}

        {/* Right: Mobile toggle */}
        <button
          onClick={onToggleRoster}
          className="font-label flex items-center gap-1.5 rounded-sm border border-edge-600/60 bg-plate-800/60 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-text-secondary uppercase transition-all hover:border-gold-600/40 hover:text-gold-400 lg:hidden"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {rosterVisible ? (
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            ) : (
              <path strokeLinecap="round" d="M9 5h10M9 9h10M9 13h10M9 17h10M5 5v0M5 9v0M5 13v0M5 17v0" />
            )}
          </svg>
          {rosterVisible ? 'Units' : 'Roster'}
        </button>
      </div>

      {/* Bottom rule */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-700/20 to-transparent" />
    </header>
  );
}
