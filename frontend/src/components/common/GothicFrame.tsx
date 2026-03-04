import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function GothicFrame({ children, className = '' }: Props) {
  return (
    <div className={`relative rounded-sm border border-edge-600/25 bg-plate-900/80 ${className}`}>
      {/* Pointed arch top accent */}
      <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-transparent via-crimson/30 to-transparent rounded-b-sm" />
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-gold-600/20 rounded-tl-sm" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-gold-600/20 rounded-tr-sm" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-gold-600/20 rounded-bl-sm" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-gold-600/20 rounded-br-sm" />
      {children}
    </div>
  );
}
