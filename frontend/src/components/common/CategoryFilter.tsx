import { FOC_CATEGORIES } from '../../types/index.ts';

interface Props {
  selected: string | null;
  onChange: (cat: string | null) => void;
}

export default function CategoryFilter({ selected, onChange }: Props) {
  const categories = ['All', ...FOC_CATEGORIES];
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const value = cat === 'All' ? null : cat;
        const active = selected === value;
        return (
          <button
            key={cat}
            onClick={() => onChange(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-gold-500 bg-gold-500/20 text-gold-300'
                : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
