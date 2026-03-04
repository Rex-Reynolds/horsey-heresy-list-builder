import { GAME_CONFIGS, type GameSystemId } from '../../config/gameConfig.ts';
import { useUIStore } from '../../stores/uiStore.ts';

interface Props {
  onSelect: (gs: GameSystemId) => void;
}

const GAME_CARDS: { id: GameSystemId; subtitle: string; accent: string; bgGlow: string }[] = [
  {
    id: 'hh3',
    subtitle: 'Age of Darkness',
    accent: 'border-gold-500/40 hover:border-gold-500/60',
    bgGlow: 'radial-gradient(ellipse at 50% 60%, rgba(200, 160, 72, 0.08) 0%, transparent 70%)',
  },
  {
    id: '40k10e',
    subtitle: '10th Edition',
    accent: 'border-crimson/40 hover:border-crimson/60',
    bgGlow: 'radial-gradient(ellipse at 50% 60%, rgba(194, 40, 48, 0.08) 0%, transparent 70%)',
  },
];

export default function GameSelector({ onSelect }: Props) {
  const setGameSystem = useUIStore((s) => s.setGameSystem);
  const setTheme = useUIStore((s) => s.setTheme);

  function handleSelect(gs: GameSystemId) {
    const config = GAME_CONFIGS[gs];
    setGameSystem(gs);
    setTheme(config.defaultTheme);
    onSelect(gs);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-imperial text-2xl tracking-[0.2em] lg:text-3xl">
          List Builder
        </h1>
        <p className="font-label mt-2 text-[11px] font-medium tracking-[0.3em] text-text-dim uppercase">
          Choose your game system
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        {GAME_CARDS.map((card) => {
          const config = GAME_CONFIGS[card.id];
          return (
            <button
              key={card.id}
              onClick={() => handleSelect(card.id)}
              className={`group relative w-72 overflow-hidden rounded-sm border-2 bg-plate-900/80 p-8 text-left transition-all duration-300 hover:bg-plate-800/80 hover:shadow-lg ${card.accent}`}
            >
              {/* Background glow */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: card.bgGlow }}
              />

              <div className="relative z-10">
                <p className="font-display text-[18px] font-semibold tracking-[0.1em] text-text-primary uppercase">
                  {config.shortName}
                </p>
                <p className="mt-1 font-label text-[11px] tracking-[0.2em] text-text-dim uppercase">
                  {card.subtitle}
                </p>
                <div className="mt-4 h-px bg-gradient-to-r from-transparent via-edge-500/30 to-transparent" />
                <p className="mt-4 text-[13px] text-text-secondary">
                  {config.factionLabel}
                </p>
                <p className="mt-1 text-[11px] text-text-dim">
                  {config.pointsOptions.length} game sizes
                </p>
              </div>

              {/* Chevron */}
              <svg className="absolute bottom-4 right-4 h-5 w-5 text-text-dim/30 transition-all group-hover:text-gold-400/60 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
