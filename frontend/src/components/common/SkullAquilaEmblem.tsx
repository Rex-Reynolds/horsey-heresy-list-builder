interface Props {
  className?: string;
}

export default function SkullAquilaEmblem({ className = 'h-10 w-10' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden="true"
    >
      {/* Left wing */}
      <path d="M8 32c4-12 12-18 24-20" strokeLinecap="round" />
      <path d="M12 36c3-10 10-16 20-18" strokeLinecap="round" opacity={0.6} />
      <path d="M16 38c2-6 6-12 16-14" strokeLinecap="round" opacity={0.3} />
      {/* Right wing */}
      <path d="M56 32c-4-12-12-18-24-20" strokeLinecap="round" />
      <path d="M52 36c-3-10-10-16-20-18" strokeLinecap="round" opacity={0.6} />
      <path d="M48 38c-2-6-6-12-16-14" strokeLinecap="round" opacity={0.3} />
      {/* Skull center */}
      <circle cx="32" cy="28" r="6" fill="currentColor" opacity={0.15} />
      <circle cx="30" cy="27" r="1.2" fill="currentColor" opacity={0.5} />
      <circle cx="34" cy="27" r="1.2" fill="currentColor" opacity={0.5} />
      <path d="M30 31h4" strokeWidth={1} opacity={0.4} />
      {/* Lower jaw / decoration */}
      <path d="M28 34l4 6 4-6" strokeWidth={0.8} opacity={0.3} />
    </svg>
  );
}
