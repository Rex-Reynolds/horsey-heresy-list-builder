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
  return (
    <header className="relative z-10 bg-plate-900">
      {/* Top accent — ornate bronze line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      <div className="flex items-center px-5 py-3.5 lg:px-7 lg:py-4">
        <div className="flex items-center gap-4">
          <AquilaEmblem className="hidden w-12 text-gold-500/40 sm:block" />
          <div>
            <h1 className="text-imperial text-base leading-tight tracking-[0.14em] lg:text-[17px]">
              Solar Auxilia
            </h1>
            <p className="font-label mt-0.5 text-[10px] font-medium tracking-[0.3em] text-gold-600/60 uppercase">
              Regimental Dataslate
            </p>
          </div>
        </div>
      </div>

      {/* Bottom ornate rule */}
      <div className="divider-imperial" />
    </header>
  );
}
