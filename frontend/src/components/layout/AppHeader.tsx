import { useState } from 'react';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { useGameConfig } from '../../config/GameConfigContext.tsx';
import { GAME_CONFIGS, type GameSystemId } from '../../config/gameConfig.ts';
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

type ReadinessLevel = 'valid' | 'warning' | 'critical' | 'unknown';

function ReadinessShield({ level }: { level: ReadinessLevel }) {
  const colors: Record<ReadinessLevel, { fill: string; glow: string }> = {
    valid: { fill: 'text-valid', glow: 'readiness-pulse' },
    warning: { fill: 'text-caution', glow: '' },
    critical: { fill: 'text-danger', glow: '' },
    unknown: { fill: 'text-text-dim/40', glow: '' },
  };

  const { fill, glow } = colors[level];

  return (
    <div className={`relative ${glow}`} title={
      level === 'valid' ? 'Army valid' : level === 'warning' ? 'Warnings present' : level === 'critical' ? 'Errors present' : 'Not validated'
    }>
      <svg className={`h-5 w-5 ${fill}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" opacity="0.2" />
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {level === 'valid' && (
          <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {level === 'critical' && (
          <path d="M12 8v4m0 4h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
        {level === 'warning' && (
          <path d="M12 9v3m0 3h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

export default function AppHeader() {
  const isValid = useRosterStore((s) => s.isValid);
  const errorCount = useRosterStore((s) => s.validationErrors.length);
  const rosterId = useRosterStore((s) => s.rosterId);
  const rosterName = useRosterStore((s) => s.rosterName);
  const totalPoints = useRosterStore((s) => s.totalPoints);
  const pointsLimit = useRosterStore((s) => s.pointsLimit);
  const detachments = useRosterStore((s) => s.detachments);
  const clearRoster = useRosterStore((s) => s.clearRoster);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const gameSystem = useUIStore((s) => s.gameSystem);
  const setGameSystem = useUIStore((s) => s.setGameSystem);
  const setTheme = useUIStore((s) => s.setTheme);
  const setShowRosterDrawer = useUIStore((s) => s.setShowRosterDrawer);
  const undoStack = useUIStore((s) => s.undoStack);
  const hasRoster = !!rosterId;
  const config = useGameConfig();
  const [showGameMenu, setShowGameMenu] = useState(false);

  // Compute readiness level
  const readiness: ReadinessLevel = !hasRoster || detachments.length === 0
    ? 'unknown'
    : isValid === true
      ? 'valid'
      : isValid === false && errorCount > 0
        ? 'critical'
        : 'warning';

  // Keyboard hint visibility (first-visit pulse)
  const [kbdHintSeen] = useState(() => {
    try { return localStorage.getItem('sa_kbd_hint_seen') === '1'; } catch { return false; }
  });

  function handleKbdHintClick() {
    try { localStorage.setItem('sa_kbd_hint_seen', '1'); } catch { /* noop */ }
    // Fire synthetic keydown to open the keyboard shortcuts overlay
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
  }

  function handleGameSwitch(gs: GameSystemId) {
    setShowGameMenu(false);
    if (gs === gameSystem) return;
    clearRoster();
    setGameSystem(gs);
    const newConfig = GAME_CONFIGS[gs];
    setTheme(newConfig.defaultTheme);
  }

  return (
    <header className="relative z-10 bg-plate-900">
      {/* Top accent — ornate bronze line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      <div className={`flex items-center justify-between px-5 md:px-7 ${hasRoster ? 'py-2 md:py-2' : 'py-3 md:py-3.5'}`}>
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
                  <button
                    onClick={() => setShowGameMenu(!showGameMenu)}
                    className="hidden md:inline text-imperial text-[11px] leading-tight tracking-[0.12em] hover:text-gold-400 transition-colors"
                  >
                    {config.factionLabel}
                    <svg className="inline ml-1 h-2.5 w-2.5 text-text-dim/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <span className="hidden md:inline text-text-dim/30 text-[11px]">&rsaquo;</span>
                  <span className="font-display text-[13px] font-semibold tracking-[0.08em] text-gold-400 uppercase leading-tight truncate max-w-[180px] sm:max-w-[240px]">
                    {rosterName}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Full title mode */}
                <button
                  onClick={() => setShowGameMenu(!showGameMenu)}
                  className="text-left"
                >
                  <h1 className="text-imperial text-base leading-tight tracking-[0.14em] md:text-[17px] hover:text-gold-400 transition-colors">
                    {config.factionLabel}
                  </h1>
                  <p className="font-label mt-0.5 text-[10px] font-medium tracking-[0.3em] text-gold-600/60 uppercase">
                    {config.shortName}
                  </p>
                </button>
              </>
            )}
            {/* Game system dropdown */}
            {showGameMenu && (
              <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-sm border border-edge-600/30 bg-plate-900/98 shadow-lg backdrop-blur-sm">
                {Object.values(GAME_CONFIGS).map((gc) => (
                  <button
                    key={gc.id}
                    onClick={() => handleGameSwitch(gc.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-plate-800/50 ${
                      gc.id === gameSystem ? 'bg-gold-900/20 border-l-2 border-l-gold-500' : ''
                    }`}
                  >
                    <div>
                      <p className="font-display text-[12px] font-semibold tracking-[0.08em] uppercase text-text-primary">
                        {gc.factionLabel}
                      </p>
                      <p className="text-[10px] text-text-dim">{gc.shortName}</p>
                    </div>
                    {gc.id === gameSystem && (
                      <svg className="ml-auto h-3.5 w-3.5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Points ticker — shown when roster active */}
          {hasRoster && (
            <span className={`font-data text-sm tabular-nums font-medium ${totalPoints > pointsLimit ? 'text-danger' : 'text-gold-300/80'}`}>
              <AnimatedNumber value={totalPoints} />/{pointsLimit} <span className="text-[10px] text-text-dim">pts</span>
            </span>
          )}
          {/* Undo hint — desktop only, when undo stack is non-empty */}
          {hasRoster && undoStack.length > 0 && (
            <span className="kbd-hint text-[9px] hidden md:inline">
              {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl+'}Z undo
            </span>
          )}
          {/* Readiness shield */}
          {hasRoster && detachments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <ReadinessShield level={readiness} />
              {readiness === 'critical' && errorCount > 0 && (
                <span className="font-data text-[9px] font-bold text-danger">{errorCount}</span>
              )}
            </div>
          )}
          {/* Roster drawer button — hidden on phone (accessible from bottom bar) */}
          {hasRoster && (
            <button
              onClick={() => setShowRosterDrawer(true)}
              className="hidden md:flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-sm border border-edge-600/30 transition-all hover:border-gold-600/30 hover:text-gold-400"
              title="My Rosters"
            >
              <svg className="h-4 w-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </button>
          )}
          {/* Keyboard shortcuts hint — hidden on phone */}
          <button
            onClick={handleKbdHintClick}
            className={`hidden md:flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-sm border border-edge-600/30 transition-all hover:border-gold-600/30 hover:text-gold-400 ${
              !kbdHintSeen ? 'kbd-hint-pulse' : ''
            }`}
            title="Keyboard shortcuts"
          >
            <span className="font-data text-[11px] font-bold text-text-dim">?</span>
          </button>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-sm border border-edge-600/30 transition-all hover:border-gold-600/30 hover:text-gold-400"
            title={theme === 'dataslate' ? 'Switch to parchment (light) theme' : 'Switch to dataslate (dark) theme'}
          >
            {theme === 'dataslate' ? (
              <svg className="h-4 w-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {!hasRoster && (
            <span className="font-data text-[10px] tabular-nums text-text-dim/40">
              {gameSystem === 'hh3' ? 'HH3.SA' : '40K.10E'}
            </span>
          )}
        </div>

        {/* Mobile points ticker removed — visible in bottom bar */}
      </div>

      {/* Bottom ornate rule */}
      <div className="divider-imperial" />
    </header>
  );
}
