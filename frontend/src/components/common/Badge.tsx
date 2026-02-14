const CATEGORY_COLORS: Record<string, string> = {
  HQ: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
  Troops: 'bg-green-900/60 text-green-300 border-green-700/50',
  Elites: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
  'Fast Attack': 'bg-orange-900/60 text-orange-300 border-orange-700/50',
  'Heavy Support': 'bg-red-900/60 text-red-300 border-red-700/50',
  'Dedicated Transport': 'bg-teal-900/60 text-teal-300 border-teal-700/50',
  'Lord of War': 'bg-gold-900/60 text-gold-300 border-gold-700/50',
};

export default function Badge({ label }: { label: string }) {
  const colors = CATEGORY_COLORS[label] ?? 'bg-slate-700/60 text-slate-300 border-slate-600/50';
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
