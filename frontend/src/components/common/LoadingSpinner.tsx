export default function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 gap-3 ${className}`}>
      {/* Aquila pulse animation */}
      <svg
        viewBox="0 0 64 28"
        className="w-12 text-gold-500/40 animate-aquila-pulse"
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
      <span className="font-label text-[10px] tracking-[0.2em] text-text-dim/40 uppercase animate-pulse">
        Loading
      </span>
    </div>
  );
}
