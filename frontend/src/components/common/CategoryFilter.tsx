import { DISPLAY_GROUP_ORDER } from '../../types/index.ts';

interface Props {
  selected: string | null;
  onChange: (cat: string | null) => void;
}

export default function CategoryFilter({ selected, onChange }: Props) {
  const categories = ['All', ...DISPLAY_GROUP_ORDER];
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((cat) => {
        const value = cat === 'All' ? null : cat;
        const active = selected === value;
        return (
          <button
            key={cat}
            onClick={() => onChange(value)}
            className={`font-label rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase transition-all ${
              active
                ? 'border-gold-500/50 bg-gold-600/20 text-gold-300'
                : 'border-edge-600/30 bg-plate-800/40 text-text-dim hover:border-edge-400/50 hover:text-text-secondary'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
