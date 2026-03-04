interface Props {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZES = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-6 w-6' };

export default function SkullGlyph({ size = 'sm', className = '' }: Props) {
  return (
    <svg
      className={`${SIZES[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Simplified skull glyph */}
      <path d="M12 2C7.58 2 4 5.58 4 10c0 2.76 1.4 5.2 3.54 6.63L7 20h2l.5-2h5l.5 2h2l-.54-3.37A7.98 7.98 0 0020 10c0-4.42-3.58-8-8-8zm-2.5 11a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
    </svg>
  );
}
