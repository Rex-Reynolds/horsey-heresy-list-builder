import { useGameConfig } from '../../config/GameConfigContext.tsx';

interface Props {
  selected: string | null;
  onChange: (cat: string | null) => void;
  counts?: Record<string, number>;
  slotCounts?: Record<string, { open: number; total: number }>;
  requiredSlots?: Set<string>;
}

export default function CategoryFilter({ selected, onChange, counts, slotCounts, requiredSlots }: Props) {
  const { displayGroupOrder, filterColors } = useGameConfig();
  const categories = ['All', ...displayGroupOrder];
  return (
    <div className="category-filter-scroll scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x md:flex-nowrap md:overflow-visible md:snap-none">
      {categories.map((cat) => {
        const value = cat === 'All' ? null : cat;
        const active = selected === value;
        const colors = filterColors[cat] ?? filterColors['All'];
        const count = counts?.[cat];
        const slotInfo = cat !== 'All' ? slotCounts?.[cat] : undefined;
        const isRequired = !!(requiredSlots && cat !== 'All' && requiredSlots.has(cat));
        return (
          <button
            key={cat}
            onClick={() => onChange(value)}
            className={`font-label relative flex shrink-0 items-center gap-1.5 rounded-sm border px-3.5 py-2.5 text-[12px] font-semibold tracking-wider uppercase transition-all min-h-[44px] snap-start md:min-h-[38px] ${
              active
                ? colors.active
                : `border-transparent bg-transparent text-text-dim ${colors.inactive}`
            }`}
          >
            {/* Color dot indicator with optional pulse overlay */}
            {cat !== 'All' && (
              <span className="relative">
                <span className={`block h-2 w-2 shrink-0 rounded-full ${colors.dot} ${active ? 'opacity-90' : 'opacity-30'}`} />
                {isRequired && (
                  <span className={`absolute inset-0 h-2 w-2 rounded-full ${colors.dot} animate-ping opacity-40`} />
                )}
              </span>
            )}
            {cat}
            {/* Slot open count badge (primary) */}
            {slotInfo && slotInfo.open > 0 && (
              <span className="ml-0.5 rounded-sm bg-valid/15 px-1 py-px font-data text-[10px] font-medium tabular-nums leading-none text-valid/80">
                {slotInfo.open}
              </span>
            )}
            {/* Unit count badge (always shown) */}
            {count !== undefined && count > 0 && (
              <span className={`ml-0.5 rounded-sm px-1 py-px font-data text-[10px] font-medium tabular-nums leading-none ${
                slotInfo ? 'bg-plate-700/30 text-text-dim/40' :
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
