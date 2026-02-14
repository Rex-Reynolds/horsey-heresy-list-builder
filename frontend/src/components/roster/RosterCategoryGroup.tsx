import type { RosterEntry } from '../../stores/rosterStore.ts';
import RosterEntryCard from './RosterEntryCard.tsx';

interface Props {
  category: string;
  entries: RosterEntry[];
  onRemove: (id: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
}

export default function RosterCategoryGroup({ category, entries, onRemove, onUpdateQty }: Props) {
  if (entries.length === 0) return null;

  const catTotal = entries.reduce((s, e) => s + e.totalCost, 0);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{category}</h3>
        <span className="text-xs text-slate-600">{catTotal} pts</span>
      </div>
      <div className="space-y-1">
        {entries.map((e) => (
          <RosterEntryCard
            key={e.id}
            entry={e}
            onRemove={onRemove}
            onUpdateQty={onUpdateQty}
          />
        ))}
      </div>
    </div>
  );
}
