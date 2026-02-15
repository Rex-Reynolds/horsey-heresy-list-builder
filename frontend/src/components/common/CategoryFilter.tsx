import { DISPLAY_GROUP_ORDER, FILTER_COLORS } from '../../types/index.ts';

interface Props {
  selected: string | null;
  onChange: (cat: string | null) => void;
  counts?: Record<string, number>;
  slotCounts?: Record<string, { open: number; total: number }>;
}

export default function CategoryFilter({ selected, onChange, counts, slotCounts }: Props) {
  const categories = ['All', ...DISPLAY_GROUP_ORDER];
  return (
    <div className="category-filter-scroll scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {categories.map((cat) => {
        const value = cat === 'All' ? null : cat;
        const active = selected === value;
        const colors = FILTER_COLORS[cat] ?? FILTER_COLORS['All'];
        const count = counts?.[cat];
        const slotInfo = cat !== 'All' ? slotCounts?.[cat] : undefined;
        return (
          <button
            key={cat}
            onClick={() => onChange(value)}
            className={`font-label relative flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[12px] font-semibold tracking-wider uppercase transition-all ${
              active
                ? colors.active
                : `border-edge-600/25 bg-plate-800/30 text-text-dim ${colors.inactive}`
            }`}
          >
            {/* Color dot indicator */}
            {cat !== 'All' && (
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot} ${active ? 'opacity-90' : 'opacity-30'}`} />
            )}
            {cat}
            {/* Slot open count badge */}
            {slotInfo && slotInfo.open > 0 && (
              <span className="ml-0.5 rounded-sm bg-valid/15 px-1 py-px font-data text-[10px] font-medium tabular-nums leading-none text-valid/80">
                {slotInfo.open}
              </span>
            )}
            {/* Unit count badge (shown when no slot count) */}
            {count !== undefined && count > 0 && !slotInfo && (
              <span className={`ml-0.5 rounded-sm px-1 py-px font-data text-[10px] font-medium tabular-nums leading-none ${
                active ? 'bg-white/10 text-current' : 'bg-plate-700/50 text-text-dim'
              }`}>
                {count}
              </span>
            )}
            {active && (
              <>
                <span className={`absolute bottom-0 left-1/2 h-[2px] w-4/5 -translate-x-1/2 rounded-t-full ${colors.dot} opacity-70`} />
                <span className={`absolute bottom-0 left-1/2 h-[4px] w-2/5 -translate-x-1/2 blur-[3px] ${colors.dot} opacity-30`} />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
