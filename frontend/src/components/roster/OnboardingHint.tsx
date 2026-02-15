interface Props {
  step: 1 | 2;
  onAction?: () => void;
}

export default function OnboardingHint({ step, onAction }: Props) {
  if (step === 1) {
    return (
      <div className="setup-stagger flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-600/25 bg-gold-900/15">
          <svg className="h-7 w-7 text-gold-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <div>
          <p className="font-label text-xs font-semibold tracking-wider text-text-secondary uppercase">
            Begin Your Muster
          </p>
          <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-text-dim">
            Every force requires a Primary Detachment. This forms the backbone of your army.
          </p>
        </div>
        <button
          onClick={onAction}
          className="btn-imperial font-label rounded-sm bg-gold-600/80 px-6 py-2.5 text-[11px] font-bold tracking-[0.14em] text-white uppercase animate-pulse-glow"
        >
          Add Primary Detachment
        </button>
      </div>
    );
  }

  // Step 2: detachments exist but no units
  return (
    <div className="setup-stagger rounded-sm border border-edge-600/20 bg-plate-800/15 px-4 py-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <svg className="h-4 w-4 text-gold-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <p className="font-label text-xs font-semibold tracking-wider text-text-secondary uppercase">
          Fill Your Ranks
        </p>
      </div>
      <p className="text-[13px] leading-relaxed text-text-dim">
        Click a slot name above to filter units, or browse the compendium to add units to your roster.
      </p>
      {/* Mobile: show browse button that closes the drawer */}
      <button
        onClick={onAction}
        className="mt-3 font-label rounded-sm border border-gold-600/25 bg-gold-900/10 px-4 py-2 text-[11px] font-semibold tracking-wider text-gold-400 uppercase transition-all hover:border-gold-500/30 hover:bg-gold-900/20 lg:hidden"
      >
        Browse Units
      </button>
    </div>
  );
}
