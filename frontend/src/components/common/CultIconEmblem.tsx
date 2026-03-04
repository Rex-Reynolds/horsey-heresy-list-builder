interface Props {
  className?: string;
}

/** Genestealer Cults three-armed star icon */
export default function CultIconEmblem({ className = 'h-10 w-10' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Three arms radiating from center */}
      <path d="M32 6 L35 26 L32 28 L29 26 Z" opacity={0.85} />
      <path d="M50 48 L36 32 L37 29 L40 30 Z" opacity={0.85} />
      <path d="M14 48 L28 32 L27 29 L24 30 Z" opacity={0.85} />
      {/* Center circle */}
      <circle cx="32" cy="30" r="5" opacity={0.9} />
      <circle cx="32" cy="30" r="3" fill="none" stroke="currentColor" strokeWidth="0.8" opacity={0.5} />
      {/* Arm tips — small circles */}
      <circle cx="32" cy="8" r="2" opacity={0.6} />
      <circle cx="49" cy="47" r="2" opacity={0.6} />
      <circle cx="15" cy="47" r="2" opacity={0.6} />
    </svg>
  );
}
