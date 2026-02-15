const SLOT_COLORS: Record<string, string> = {
  'High Command': 'bg-purple-600/80 text-purple-100',
  'Command': 'bg-purple-700/70 text-purple-200',
  'Troops': 'bg-emerald-700/70 text-emerald-100',
  'Elites': 'bg-blue-700/70 text-blue-100',
  'Retinue': 'bg-blue-800/60 text-blue-200',
  'Fast Attack': 'bg-orange-700/70 text-orange-100',
  'Recon': 'bg-orange-800/60 text-orange-200',
  'Support': 'bg-rose-700/70 text-rose-100',
  'Armour': 'bg-rose-700/70 text-rose-100',
  'Heavy Assault': 'bg-rose-700/70 text-rose-100',
  'War-engine': 'bg-rose-800/60 text-rose-200',
  'Transport': 'bg-teal-700/70 text-teal-100',
  'Heavy Transport': 'bg-teal-800/60 text-teal-200',
  'Lord of War': 'bg-gold-600/80 text-gold-50',
  // Legacy display group names
  'HQ': 'bg-purple-700/70 text-purple-200',
  'Heavy Support': 'bg-rose-700/70 text-rose-100',
  'Dedicated Transport': 'bg-teal-700/70 text-teal-100',
};

export default function Badge({ label }: { label: string }) {
  const colors = SLOT_COLORS[label] ?? 'bg-plate-600/50 text-text-secondary';
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 font-label text-[10px] font-semibold uppercase tracking-wider ${colors}`}>
      {label}
    </span>
  );
}
