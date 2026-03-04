import { useEffect, useRef } from 'react';
import type { Unit } from '../../types/index.ts';
import SkullGlyph from '../common/SkullGlyph.tsx';

interface Props {
  unit: Unit;
  onClose: () => void;
}

interface W40kStatLine {
  name: string;
  M: string;
  T: string;
  SV: string;
  W: string;
  LD: string;
  OC: string;
  INV?: string;
}

interface WeaponProfile {
  name: string;
  range: string;
  A: string;
  BS_WS: string;
  S: string;
  AP: string;
  D: string;
  keywords?: string;
}

function parseProfiles(raw: string | null): { stats: W40kStatLine[]; weapons: WeaponProfile[]; abilities: string[]; traits: string[] } {
  const stats: W40kStatLine[] = [];
  const weapons: WeaponProfile[] = [];
  const abilities: string[] = [];
  const traits: string[] = [];

  if (!raw) return { stats, weapons, abilities, traits };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { stats, weapons, abilities, traits };

    for (const profile of parsed) {
      const chars = profile.characteristics ?? {};
      const type = (profile.type ?? '').toLowerCase();

      if (type === 'unit' || type === 'model' || type === 'profile') {
        stats.push({
          name: profile.name ?? '',
          M: chars.M ?? chars.Move ?? '-',
          T: chars.T ?? chars.Toughness ?? '-',
          SV: chars.SV ?? chars.Save ?? chars.SAV ?? '-',
          W: chars.W ?? chars.Wounds ?? '-',
          LD: chars.LD ?? chars.Leadership ?? '-',
          OC: chars.OC ?? chars['Objective Control'] ?? '-',
          INV: chars.INV ?? chars['Invulnerable Save'] ?? undefined,
        });
      } else if (type === 'ranged weapons' || type === 'melee weapons') {
        weapons.push({
          name: profile.name ?? '',
          range: chars.Range ?? (type === 'melee weapons' ? 'Melee' : '-'),
          A: chars.A ?? chars.Attacks ?? '-',
          BS_WS: chars.BS ?? chars.WS ?? chars.Skill ?? '-',
          S: chars.S ?? chars.Strength ?? '-',
          AP: chars.AP ?? '-',
          D: chars.D ?? chars.Damage ?? '-',
          keywords: chars.Keywords ?? chars.Abilities ?? undefined,
        });
      } else if (type === 'abilities' || type === 'ability') {
        const desc = chars.Description ?? chars.description ?? profile.name ?? '';
        if (desc) abilities.push(`${profile.name}: ${desc}`);
      } else if (type === 'traits' || type === 'keywords') {
        traits.push(profile.name ?? '');
      }
    }
  } catch {
    // If parse fails, return empty
  }

  return { stats, weapons, abilities, traits };
}

export default function DatasheetView({ unit, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Trap focus on overlay click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const { stats, weapons, abilities } = parseProfiles(unit.profiles);
  const keywords = unit.keywords ?? [];
  const leaderTargets = unit.leader_targets ?? [];
  const brackets = unit.points_brackets ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-sm border border-edge-600/30 bg-plate-900/98 shadow-2xl"
        role="dialog"
        aria-label={`${unit.name} datasheet`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge-600/25 bg-plate-900/95 px-5 py-3 backdrop-blur-sm">
          <div>
            <h2 className="font-display text-[16px] font-semibold tracking-[0.08em] text-gold-400 uppercase">
              {unit.name}
            </h2>
            <p className="font-label text-[10px] tracking-[0.15em] text-text-dim uppercase">
              {unit.unit_type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-edge-600/30 text-text-dim transition-colors hover:text-text-primary"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Stat block */}
          {stats.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-2 font-label text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
                <SkullGlyph size="xs" className="text-text-dim/40" />
                Unit Profile
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center">
                  <thead>
                    <tr className="border-b border-edge-600/25">
                      <th className="px-2 py-1.5 text-left font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">Name</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">M</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">T</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">SV</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">W</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">LD</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">OC</th>
                      {stats.some((s) => s.INV) && (
                        <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">INV</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s, i) => (
                      <tr key={i} className="border-b border-edge-700/15">
                        <td className="px-2 py-1.5 text-left font-data text-[12px] font-medium text-text-primary">{s.name}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{s.M}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{s.T}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{s.SV}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{s.W}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{s.LD}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{s.OC}</td>
                        {stats.some((ss) => ss.INV) && (
                          <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-gold-400">{s.INV ?? '-'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Weapons */}
          {weapons.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-2 font-label text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
                <SkullGlyph size="xs" className="text-text-dim/40" />
                Weapons
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center">
                  <thead>
                    <tr className="border-b border-edge-600/25">
                      <th className="px-2 py-1.5 text-left font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">Weapon</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">Range</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">A</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">BS/WS</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">S</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">AP</th>
                      <th className="px-2 py-1.5 font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.map((w, i) => (
                      <tr key={i} className="border-b border-edge-700/15">
                        <td className="px-2 py-1.5 text-left">
                          <span className="font-data text-[12px] font-medium text-text-primary">{w.name}</span>
                          {w.keywords && (
                            <span className="ml-1.5 text-[9px] text-text-dim/60">[{w.keywords}]</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{w.range}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{w.A}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{w.BS_WS}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{w.S}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{w.AP}</td>
                        <td className="px-2 py-1.5 font-data text-[12px] tabular-nums text-text-secondary">{w.D}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Abilities */}
          {abilities.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-2 font-label text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
                <SkullGlyph size="xs" className="text-text-dim/40" />
                Abilities
              </h3>
              <div className="space-y-2">
                {abilities.map((a, i) => {
                  const colonIdx = a.indexOf(':');
                  const title = colonIdx > 0 ? a.slice(0, colonIdx) : '';
                  const desc = colonIdx > 0 ? a.slice(colonIdx + 1).trim() : a;
                  return (
                    <div key={i} className="rounded-sm border border-edge-700/15 bg-plate-800/30 px-3 py-2">
                      {title && (
                        <p className="font-label text-[11px] font-semibold tracking-wider text-gold-400/80 uppercase">{title}</p>
                      )}
                      <p className="text-[12px] leading-relaxed text-text-secondary">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Points Brackets */}
          {brackets.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-2 font-label text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
                Points
              </h3>
              <div className="flex flex-wrap gap-2">
                {brackets.map((b) => (
                  <span key={b.models} className="rounded-sm border border-edge-600/25 bg-plate-800/30 px-2.5 py-1 font-data text-[11px] tabular-nums text-text-secondary">
                    {b.models} models: <span className="text-gold-400">{b.cost} pts</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Leader targets */}
          {leaderTargets.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-2 font-label text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
                Can Lead
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {leaderTargets.map((t) => (
                  <span key={t} className="rounded-sm border border-amber-500/20 bg-amber-900/10 px-2 py-0.5 text-[11px] text-amber-300/80">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-2 font-label text-[11px] font-semibold tracking-[0.15em] text-text-dim uppercase">
                Keywords
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <span
                    key={kw.keyword}
                    className={`rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      kw.type === 'faction'
                        ? 'border-crimson/25 bg-crimson/8 text-crimson/80 font-semibold'
                        : 'border-edge-600/20 bg-plate-700/30 text-text-dim/80'
                    }`}
                  >
                    {kw.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
