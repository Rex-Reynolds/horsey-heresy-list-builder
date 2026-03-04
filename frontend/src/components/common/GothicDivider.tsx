import SkullGlyph from './SkullGlyph.tsx';

interface Props {
  className?: string;
  variant?: 'skull' | 'cross' | 'plain';
}

export default function GothicDivider({ className = '', variant = 'skull' }: Props) {
  return (
    <div className={`flex items-center gap-3 py-2 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-crimson/30 to-transparent" />
      {variant === 'skull' && (
        <SkullGlyph size="xs" className="text-gold-600/50" />
      )}
      {variant === 'cross' && (
        <svg className="h-3 w-3 text-crimson/40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11 2h2v8h8v2h-8v8h-2v-8H3v-2h8V2z" />
        </svg>
      )}
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-crimson/30 to-transparent" />
    </div>
  );
}
