import type { Unit, StatBlock as StatBlockType } from '../../types/index.ts';
import { parseProfiles } from '../../utils/profileParser.ts';

interface Props {
  units: Unit[];
  onRemove: (unitId: number) => void;
  onClose: () => void;
}

const STAT_COLS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'LD', 'SAV'] as const;

function getStatValue(stats: StatBlockType[], col: string): string {
  if (stats.length === 0) return '-';
  const block = stats[0];
  return (block as unknown as Record<string, string>)[col] ?? '-';
}

function parseStatNum(val: string): number {
  return parseInt(val.replace('+', '').replace('"', ''), 10);
}

/** Highlight the "better" value in green, worse in dim */
function getDiffClass(col: string, val: string, allVals: string[]): string {
  const num = parseStatNum(val);
  if (isNaN(num) || allVals.length < 2) return '';
  const nums = allVals.map(parseStatNum).filter((n) => !isNaN(n));
  if (nums.length < 2) return '';

  const isSaveType = col === 'SAV' || col === 'INV';
  const best = isSaveType ? Math.min(...nums) : Math.max(...nums);
  const worst = isSaveType ? Math.max(...nums) : Math.min(...nums);

  if (num === best && best !== worst) return 'text-valid font-bold';
  if (num === worst && best !== worst) return 'text-text-dim';
  return '';
}

export default function CompareView({ units, onRemove, onClose }: Props) {
  const parsed = units.map((u) => ({
    unit: u,
    stats: parseProfiles(u.profiles).statBlocks,
  }));

  return (
    <div className="animate-fade-in rounded-sm border border-gold-600/20 bg-plate-900/95">
      <div className="flex items-center justify-between border-b border-edge-700/30 px-4 py-2.5">
        <h3 className="font-label text-[11px] font-bold tracking-[0.15em] text-gold-400 uppercase">
          Compare Units ({units.length})
        </h3>
        <button
          onClick={onClose}
          className="font-label text-[10px] tracking-wider text-text-dim uppercase transition-colors hover:text-text-primary"
        >
          Close
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="font-label sticky left-0 z-10 bg-plate-900 px-3 py-2 text-left text-[10px] font-semibold tracking-wider text-text-dim uppercase">
                Stat
              </th>
              {parsed.map(({ unit }) => (
                <th key={unit.id} className="px-3 py-2 text-center min-w-[100px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-unit-name text-[13px] text-text-primary truncate max-w-[120px]">
                      {unit.name}
                    </span>
                    <button
                      onClick={() => onRemove(unit.id)}
                      className="shrink-0 text-text-dim/40 transition-colors hover:text-danger"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <span className="font-data text-[11px] text-gold-400 tabular-nums">{unit.base_cost} pts</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAT_COLS.map((col) => {
              const allVals = parsed.map(({ stats }) => getStatValue(stats, col));
              return (
                <tr key={col} className="border-t border-edge-700/15 hover:bg-plate-800/20">
                  <td className="font-label sticky left-0 z-10 bg-plate-900 px-3 py-1.5 text-[10px] font-bold tracking-wider text-gold-500/70 uppercase">
                    {col}
                  </td>
                  {parsed.map(({ unit, stats }) => {
                    const val = getStatValue(stats, col);
                    const diffCls = getDiffClass(col, val, allVals);
                    return (
                      <td
                        key={unit.id}
                        className={`px-3 py-1.5 text-center font-data text-sm tabular-nums ${diffCls || 'text-text-primary'}`}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Cost row */}
            <tr className="border-t-2 border-gold-600/20">
              <td className="font-label sticky left-0 z-10 bg-plate-900 px-3 py-1.5 text-[10px] font-bold tracking-wider text-gold-500/70 uppercase">
                Cost
              </td>
              {parsed.map(({ unit }) => (
                <td key={unit.id} className="px-3 py-1.5 text-center font-data text-sm tabular-nums text-gold-300">
                  {unit.base_cost}
                </td>
              ))}
            </tr>
            {/* Models row */}
            <tr className="border-t border-edge-700/15">
              <td className="font-label sticky left-0 z-10 bg-plate-900 px-3 py-1.5 text-[10px] font-bold tracking-wider text-gold-500/70 uppercase">
                Models
              </td>
              {parsed.map(({ unit }) => (
                <td key={unit.id} className="px-3 py-1.5 text-center font-data text-[12px] tabular-nums text-text-secondary">
                  {unit.model_min === unit.model_max
                    ? unit.model_min
                    : `${unit.model_min}–${unit.model_max ?? '?'}`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
