import { useState, useRef, useEffect } from 'react';
import type { PointsBracket } from '../../types/index.ts';

interface Props {
  brackets: PointsBracket[];
  currentModels: number;
  onSelect: (models: number) => void;
}

/**
 * Dropdown selector for 40k discrete unit size brackets.
 * Replaces the +/- stepper when a unit has points_brackets.
 */
export default function PointsBracketSelector({ brackets, currentModels, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const currentBracket = brackets.find((b) => b.models === currentModels) ?? brackets[0];

  if (brackets.length <= 1) {
    // Single bracket — just show static text
    return (
      <span className="font-data text-xs tabular-nums text-text-dim" title={`${currentBracket.models} models — ${currentBracket.cost} pts`}>
        {currentBracket.models} models
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-sm border border-edge-600/30 bg-plate-700/40 px-2.5 py-1.5 text-left transition-colors hover:border-edge-400/50 hover:bg-plate-700/60"
      >
        <div className="flex flex-col items-start">
          <span className="font-data text-xs tabular-nums text-text-secondary leading-tight">
            {currentBracket.models} models
          </span>
          <span className="font-data text-[10px] tabular-nums text-text-dim leading-tight">
            {currentBracket.cost} pts
          </span>
        </div>
        <svg className={`h-3 w-3 text-text-dim/50 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-sm border border-edge-600/30 bg-plate-900/98 shadow-lg backdrop-blur-sm">
          {brackets.map((b) => (
            <button
              key={b.models}
              type="button"
              onClick={() => { onSelect(b.models); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-plate-800/50 ${
                b.models === currentModels ? 'bg-plate-800/40' : ''
              }`}
            >
              <span className={`font-data text-[12px] tabular-nums ${
                b.models === currentModels ? 'text-gold-400 font-semibold' : 'text-text-secondary'
              }`}>
                {b.models} models
              </span>
              <span className={`font-data text-[11px] tabular-nums ${
                b.models === currentModels ? 'text-gold-400/70' : 'text-text-dim'
              }`}>
                {b.cost} pts
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
