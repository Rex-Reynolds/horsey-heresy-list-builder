import type { StatBlock as StatBlockType } from '../../types/index.ts';

const COLUMNS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'LD', 'SAV'] as const;

// Thresholds for color coding — higher is better for offensive, lower for defensive
const STAT_THRESHOLDS: Record<string, { high: number; low: number }> = {
  WS: { high: 5, low: 3 },
  BS: { high: 5, low: 3 },
  S: { high: 6, low: 3 },
  T: { high: 6, low: 3 },
  W: { high: 3, low: 1 },
  I: { high: 5, low: 2 },
  A: { high: 3, low: 1 },
  LD: { high: 9, low: 7 },
};

function getStatClass(col: string, value: string): string {
  const threshold = STAT_THRESHOLDS[col];
  if (!threshold) return '';

  const num = parseInt(value, 10);
  if (isNaN(num)) return '';

  if (num >= threshold.high) return 'stat-high';
  if (num <= threshold.low) return 'stat-low';
  return '';
}

function getSaveClass(value: string): string {
  if (!value || value === '-') return 'stat-low';
  const num = parseInt(value.replace('+', ''), 10);
  if (isNaN(num)) return '';
  if (num <= 3) return 'stat-high';
  if (num >= 6) return 'stat-low';
  return '';
}

interface Props {
  stats: StatBlockType[];
}

export default function StatBlock({ stats }: Props) {
  if (stats.length === 0) return null;

  const showInv = stats.some((s) => s.INV && s.INV !== '-' && s.INV !== '');

  return (
    <div className="overflow-x-auto rounded-sm border border-edge-600/30">
      <table className="data-readout w-full">
        <thead>
          <tr>
            <th className="text-left">Unit</th>
            {COLUMNS.map((col) => (
              <th key={col} className="text-center">{col}</th>
            ))}
            {showInv && <th className="text-center">INV</th>}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i}>
              <td>{s.name}</td>
              {COLUMNS.map((col) => {
                const val = s[col];
                const cls = col === 'SAV' ? getSaveClass(val) : getStatClass(col, val);
                return <td key={col} className={cls}>{val}</td>;
              })}
              {showInv && (
                <td className="stat-special">{s.INV ?? '-'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
