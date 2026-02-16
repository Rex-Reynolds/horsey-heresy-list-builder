import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import AnimatedNumber from '../common/AnimatedNumber.tsx';

function AquilaEmblem({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" fill="currentColor" className={className}>
      {/* Left wing */}
      <path d="M28 14 L6 5 L12 11 L3 9 L14 14 L3 19 L12 17 L6 23 Z" opacity="0.7" />
      {/* Right wing */}
      <path d="M36 14 L58 5 L52 11 L61 9 L50 14 L61 19 L52 17 L58 23 Z" opacity="0.7" />
      {/* Center star */}
      <path d="M32 4 L34 12 L40 8 L35 14 L42 14 L35 16 L40 20 L34 16 L32 24 L30 16 L24 20 L29 16 L22 14 L29 14 L24 8 L30 12 Z" />
      {/* Inner ring */}
      <circle cx="32" cy="14" r="3.5" opacity="0.9" />
      <circle cx="32" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

export default function AppHeader() {
  const isValid = useRosterStore((s) => s.isValid);
  const errorCount = useRosterStore((s) => s.validationErrors.length);
  const rosterId = useRosterStore((s) => s.rosterId);
  const rosterName = useRosterStore((s) => s.rosterName);
  const totalPoints = useRosterStore((s) => s.totalPoints);
  const pointsLimit = useRosterStore((s) => s.pointsLimit);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const hasRoster = !!rosterId;

  return (
    <header className="relative z-10 bg-plate-900">
      {/* Top accent — ornate bronze line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      <div className={`flex items-center justify-between px-5 lg:px-7 ${hasRoster ? 'py-2 lg:py-2' : 'py-3 lg:py-3.5'}`}>
        <div className="flex items-center gap-3.5">
          <div className={`relative flex items-center justify-center rounded-sm border border-gold-600/25 bg-gold-900/15 ${hasRoster ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-9 w-9 sm:h-10 sm:w-10'}`}>
            <AquilaEmblem className={`text-gold-500/60 ${hasRoster ? 'w-5 sm:w-6' : 'w-7 sm:w-8'}`} />
            <div className="absolute inset-0 rounded-sm ring-1 ring-inset ring-gold-500/10" />
          </div>
          <div>
            {hasRoster ? (
              <>
                {/* Contextual breadcrumb mode */}
                <div className="flex items-baseline gap-1.5">
                  <span className="hidden sm:inline text-imperial text-[11px] leading-tight tracking-[0.12em]">
                    Solar Auxilia
                  </span>
                  <span className="hidden sm:inline text-text-dim/30 text-[11px]">&rsaquo;</span>
                  <span className="font-display text-[13px] font-semibold tracking-[0.08em] text-gold-400 uppercase leading-tight truncate max-w-[180px] sm:max-w-[240px]">
                    {rosterName}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Full title mode */}
                <h1 className="text-imperial text-base leading-tight tracking-[0.14em] lg:text-[17px]">
                  Solar Auxilia
                </h1>
                <p className="font-label mt-0.5 text-[10px] font-medium tracking-[0.3em] text-gold-600/60 uppercase">
                  Regimental Dataslate
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-3 sm:flex">
          {/* Points ticker — shown when roster active */}
          {hasRoster && (
            <span className={`font-data text-sm tabular-nums font-medium ${totalPoints > pointsLimit ? 'text-danger' : 'text-gold-300/80'}`}>
              <AnimatedNumber value={totalPoints} />/{pointsLimit} <span className="text-[10px] text-text-dim">pts</span>
            </span>
          )}
          {isValid !== null && !isValid && errorCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger/20">
                <span className="font-data text-[9px] font-bold text-danger">{errorCount}</span>
              </span>
              <span className="font-label text-[9px] font-semibold tracking-[0.15em] text-danger/70 uppercase">
                {errorCount === 1 ? 'Error' : 'Errors'}
              </span>
            </div>
          )}
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-6 w-6 items-center justify-center rounded-sm border border-edge-600/30 transition-all hover:border-gold-600/30 hover:text-gold-400"
            title={theme === 'dataslate' ? 'Switch to parchment (light) theme' : 'Switch to dataslate (dark) theme'}
          >
            {theme === 'dataslate' ? (
              <svg className="h-3.5 w-3.5 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-valid/60 shadow-[0_0_4px_rgba(56,178,96,0.4)]" />
            <span className="font-label text-[9px] font-semibold tracking-[0.2em] text-text-dim/60 uppercase">Online</span>
          </div>
          {!hasRoster && (
            <span className="font-data text-[10px] tabular-nums text-text-dim/40">HH3.SA</span>
          )}
        </div>

        {/* Mobile points ticker */}
        {hasRoster && (
          <div className="flex items-center gap-2 sm:hidden">
            <span className={`font-data text-sm tabular-nums font-medium ${totalPoints > pointsLimit ? 'text-danger' : 'text-gold-300/80'}`}>
              {totalPoints}/{pointsLimit}
            </span>
          </div>
        )}
      </div>

      {/* Bottom ornate rule */}
      <div className="divider-imperial" />
    </header>
  );
}
