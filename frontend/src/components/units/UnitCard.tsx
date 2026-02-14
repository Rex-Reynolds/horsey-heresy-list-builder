import type { Unit } from '../../types/index.ts';
import Badge from '../common/Badge.tsx';

interface Props {
  unit: Unit;
  expanded: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

export default function UnitCard({ unit, expanded, onClick, children }: Props) {
  return (
    <div
      className={`rounded-lg border transition-colors ${
        expanded
          ? 'border-gold-500/50 bg-slate-800'
          : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
      }`}
    >
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-gray-100">{unit.name}</span>
            <Badge label={unit.unit_type} />
          </div>
        </div>
        <span className="shrink-0 text-sm font-medium text-gold-400">
          {unit.base_cost} pts
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && <div className="border-t border-slate-700 px-4 py-3">{children}</div>}
    </div>
  );
}
