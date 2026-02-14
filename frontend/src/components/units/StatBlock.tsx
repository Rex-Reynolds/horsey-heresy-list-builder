import type { StatBlock as StatBlockType } from '../../types/index.ts';

const COLUMNS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'LD', 'SAV'] as const;

interface Props {
  stats: StatBlockType[];
}

export default function StatBlock({ stats }: Props) {
  if (stats.length === 0) return null;

  // Check if any stat block has INV
  const showInv = stats.some((s) => s.INV && s.INV !== '-' && s.INV !== '');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-600 text-gold-400">
            <th className="px-2 py-1 text-left font-medium">Profile</th>
            {COLUMNS.map((col) => (
              <th key={col} className="px-2 py-1 text-center font-medium">
                {col}
              </th>
            ))}
            {showInv && <th className="px-2 py-1 text-center font-medium">INV</th>}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-b border-slate-700/50">
              <td className="px-2 py-1 font-medium text-slate-300">{s.name}</td>
              {COLUMNS.map((col) => (
                <td key={col} className="px-2 py-1 text-center text-slate-400">
                  {s[col]}
                </td>
              ))}
              {showInv && (
                <td className="px-2 py-1 text-center text-slate-400">{s.INV ?? '-'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
