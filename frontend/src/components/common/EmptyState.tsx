import type { ReactNode } from 'react';

type EmptyVariant = 'search' | 'empty-slot' | 'empty-roster' | 'no-detachments' | 'default';

const FLAVOR_TEXT: Record<EmptyVariant, string> = {
  search: 'No units match your query, Strategos.',
  'empty-slot': 'This position awaits reinforcement, Commander.',
  'empty-roster': 'The Cohort awaits your command, Legate.',
  'no-detachments': 'Initialize a detachment to marshal your forces.',
  default: 'Nothing to display at this time.',
};

const ICONS: Record<string, ReactNode> = {
  search: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  list: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  default: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
};

export default function EmptyState({
  message,
  icon = 'default',
  suggestion,
  actionLabel,
  onAction,
  variant = 'default',
  flavorText,
}: {
  message: string;
  icon?: string;
  suggestion?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: EmptyVariant;
  flavorText?: string;
}) {
  const svgIcon = ICONS[icon] ?? ICONS.default;
  const flavor = flavorText ?? FLAVOR_TEXT[variant];

  return (
    <div className="relative flex flex-col items-center justify-center py-14 text-text-dim overflow-hidden">
      {/* Aquila watermark with breathing animation */}
      <svg viewBox="0 0 64 28" fill="currentColor" className="absolute w-24 aquila-breathe pointer-events-none">
        <path d="M28 14 L6 5 L12 11 L3 9 L14 14 L3 19 L12 17 L6 23 Z" />
        <path d="M36 14 L58 5 L52 11 L61 9 L50 14 L61 19 L52 17 L58 23 Z" />
        <path d="M32 4 L34 12 L40 8 L35 14 L42 14 L35 16 L40 20 L34 16 L32 24 L30 16 L24 20 L29 16 L22 14 L29 14 L24 8 L30 12 Z" />
        <circle cx="32" cy="14" r="3.5" />
      </svg>

      <div className="relative z-[1] flex flex-col items-center">
        <div className="mb-3 opacity-25">{svgIcon}</div>
        <p className="font-label text-[11px] font-medium tracking-wider uppercase">{message}</p>
        {flavor && variant !== 'default' && (
          <p className="mt-2 animate-flavor-reveal text-[11px] italic text-text-dim/40 text-center max-w-[300px]">
            {flavor}
          </p>
        )}
        {suggestion && (
          <p className="mt-1.5 text-[11px] text-text-dim/50 text-center max-w-[280px]">{suggestion}</p>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-3 font-label rounded-sm border border-gold-600/25 bg-gold-900/10 px-4 py-2 text-[11px] font-semibold tracking-wider text-gold-400 uppercase transition-all hover:border-gold-500/30 hover:bg-gold-900/20"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
