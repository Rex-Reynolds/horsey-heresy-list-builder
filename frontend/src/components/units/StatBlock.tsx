import { useState, useEffect } from 'react';
import type { StatBlock as StatBlockType } from '../../types/index.ts';

const COLUMNS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A', 'LD', 'SAV'] as const;
const ROW1_COLS = ['M', 'WS', 'BS', 'S', 'T'] as const;
const ROW2_COLS = ['W', 'I', 'A', 'LD', 'SAV'] as const;

// Contextual tooltips explaining each stat for newer players
const STAT_TOOLTIPS: Record<string, (val: string) => string> = {
  M: (v) => `Movement: ${v}" move per turn`,
  WS: (v) => `Weapon Skill: melee hit threshold ${v}`,
  BS: (v) => `Ballistic Skill: ranged hit threshold ${v}`,
  S: (v) => `Strength ${v}: compared vs Toughness to wound`,
  T: (v) => `Toughness ${v}: compared vs Strength to resist`,
  W: (v) => `Wounds: ${v} damage before removal`,
  I: (v) => `Initiative ${v}: strike order in melee`,
  A: (v) => `Attacks: ${v} melee strikes per turn`,
  LD: (v) => `Leadership ${v}: morale & pinning checks`,
  SAV: (v) => `Armour Save: ${v} to negate wounds`,
  INV: (v) => `Invulnerable Save: ${v} (ignores AP)`,
};

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
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)');
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (stats.length === 0) return null;

  const showInv = stats.some((s) => s.INV && s.INV !== '-' && s.INV !== '');

  // Narrow/mobile: 2-row key-value layout
  if (isNarrow) {
    return (
      <div className="stat-block-frame relative overflow-hidden rounded-sm border border-edge-600/30">
        <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-gold-600/50 rounded-tl-sm" />
        <div className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-gold-600/50 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-gold-600/30 rounded-bl-sm" />
        <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-gold-600/30 rounded-br-sm" />
        <div className="h-[2px] bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <span className="font-label text-[9px] font-bold tracking-[0.2em] text-gold-500/70 uppercase">Unit Profile</span>
          <span className="h-px flex-1 bg-gold-600/15" />
        </div>
        <div className="stat-inner-panel space-y-3">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="font-unit-name text-[13px] text-gold-300 mb-1.5">{s.name}</p>
              <div className="grid grid-cols-5 gap-1">
                {ROW1_COLS.map((col) => {
                  const val = s[col];
                  const cls = getStatClass(col, val);
                  return (
                    <div key={col} className="text-center" title={STAT_TOOLTIPS[col]?.(val)}>
                      <div className="font-label text-[8px] font-bold tracking-[0.15em] text-gold-400/70 uppercase">{col}</div>
                      <div className={`font-data text-[15px] font-semibold ${cls}`}>{val}</div>
                    </div>
                  );
                })}
              </div>
              <div className={`grid gap-1 mt-1 ${showInv ? 'grid-cols-6' : 'grid-cols-5'}`}>
                {ROW2_COLS.map((col) => {
                  const val = s[col];
                  const cls = col === 'SAV' ? getSaveClass(val) : getStatClass(col, val);
                  return (
                    <div key={col} className="text-center" title={STAT_TOOLTIPS[col]?.(val)}>
                      <div className="font-label text-[8px] font-bold tracking-[0.15em] text-gold-400/70 uppercase">{col}</div>
                      <div className={`font-data text-[15px] font-semibold ${cls}`}>{val}</div>
                    </div>
                  );
                })}
                {showInv && (
                  <div className="text-center" title={STAT_TOOLTIPS.INV?.(s.INV ?? '-')}>
                    <div className="font-label text-[8px] font-bold tracking-[0.15em] text-gold-400/70 uppercase">INV</div>
                    <div className="font-data text-[15px] font-semibold stat-special">{s.INV ?? '-'}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-700/40 to-transparent" />
      </div>
    );
  }

  // Wide: standard table layout
  return (
    <div className="stat-block-frame relative overflow-hidden rounded-sm border border-edge-600/30">
      {/* Imperial corner accents */}
      <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-gold-600/50 rounded-tl-sm" />
      <div className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-gold-600/50 rounded-tr-sm" />
      <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-gold-600/30 rounded-bl-sm" />
      <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-gold-600/30 rounded-br-sm" />

      {/* Gold accent bar */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

      {/* Datasheet label */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span className="font-label text-[9px] font-bold tracking-[0.2em] text-gold-500/70 uppercase">Unit Profile</span>
        <span className="h-px flex-1 bg-gold-600/15" />
      </div>

      {/* Raised inner panel for stat table */}
      <div className="stat-inner-panel">
        <div className="stat-scroll-container relative overflow-x-auto">
          <table className="data-readout w-full">
            <thead>
              <tr>
                <th className="text-left">Unit</th>
                {COLUMNS.map((col) => (
                  <th key={col} className="text-center cursor-help" title={STAT_TOOLTIPS[col]?.('X') ?? col}>{col}</th>
                ))}
                {showInv && <th className="text-center stat-inv-header cursor-help" title="Invulnerable Save (ignores AP)">INV</th>}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={i}>
                  <td>{s.name}</td>
                  {COLUMNS.map((col) => {
                    const val = s[col];
                    const cls = col === 'SAV' ? getSaveClass(val) : getStatClass(col, val);
                    return <td key={col} className={`${cls} cursor-help`} title={STAT_TOOLTIPS[col]?.(val)}>{val}</td>;
                  })}
                  {showInv && (
                    <td className="stat-special cursor-help" title={STAT_TOOLTIPS.INV?.(s.INV ?? '-')}>{s.INV ?? '-'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-700/40 to-transparent" />
    </div>
  );
}
