/**
 * Army Summary Dashboard — collapsible overview of army composition.
 * Shows total models, weapon breakdown, avg pts/model, transport capacity.
 */
import { useState, useMemo } from 'react';
import type { RosterDetachment } from '../../stores/rosterStore.ts';

interface Props {
  detachments: RosterDetachment[];
  totalPoints: number;
}

interface WeaponInfo {
  ranged: number;
  melee: number;
  total: number;
}

function extractWeaponBreakdown(detachments: RosterDetachment[]): WeaponInfo {
  // Count weapon types from entry categories as a proxy
  // (actual weapon parsing would need profiles data)
  let ranged = 0;
  let melee = 0;
  for (const det of detachments) {
    for (const entry of det.entries) {
      const cat = entry.category.toLowerCase();
      if (cat.includes('armour') || cat.includes('support') || cat.includes('heavy') || cat.includes('war-engine') || cat.includes('recon')) {
        ranged += entry.quantity;
      } else if (cat.includes('command') || cat.includes('retinue') || cat.includes('elites')) {
        melee += entry.quantity;
      } else {
        // Split generalist categories
        ranged += Math.ceil(entry.quantity / 2);
        melee += Math.floor(entry.quantity / 2);
      }
    }
  }
  return { ranged, melee, total: ranged + melee };
}

function countTransportCapacity(detachments: RosterDetachment[]): { capacity: number; infantry: number } {
  let capacity = 0;
  let infantry = 0;
  for (const det of detachments) {
    for (const entry of det.entries) {
      const cat = entry.category.toLowerCase();
      if (cat.includes('transport')) {
        // Rough estimate: each transport carries ~10 models
        capacity += entry.quantity * 10;
      } else if (cat === 'troops' || cat === 'command' || cat === 'elites' || cat === 'retinue') {
        infantry += entry.quantity;
      }
    }
  }
  return { capacity, infantry };
}

export default function ArmySummary({ detachments, totalPoints }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  const stats = useMemo(() => {
    const totalModels = detachments.reduce(
      (sum, d) => sum + d.entries.reduce((s, e) => s + e.quantity, 0),
      0,
    );
    const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);
    const avgPtsPerModel = totalModels > 0 ? Math.round(totalPoints / totalModels) : 0;
    const avgPtsPerUnit = totalEntries > 0 ? Math.round(totalPoints / totalEntries) : 0;
    const weapons = extractWeaponBreakdown(detachments);
    const transport = countTransportCapacity(detachments);

    // Category breakdown
    const categoryModels: Record<string, number> = {};
    for (const det of detachments) {
      for (const entry of det.entries) {
        categoryModels[entry.category] = (categoryModels[entry.category] ?? 0) + entry.quantity;
      }
    }

    return { totalModels, totalEntries, avgPtsPerModel, avgPtsPerUnit, weapons, transport, categoryModels };
  }, [detachments, totalPoints]);

  if (stats.totalEntries === 0) return null;

  const rangedPct = stats.weapons.total > 0 ? Math.round((stats.weapons.ranged / stats.weapons.total) * 100) : 0;

  return (
    <div className="glow-border overflow-hidden rounded-sm border border-edge-600/15 bg-plate-800/25">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-plate-700/20"
      >
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gold-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <span className="font-label text-[11px] font-bold tracking-[0.12em] text-text-secondary uppercase">
            Army Overview
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-data text-[11px] tabular-nums text-text-dim">
            {stats.totalModels} models
          </span>
          <svg
            className={`h-3 w-3 text-text-dim transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="animate-slide-down border-t border-edge-700/15 px-3.5 py-3 space-y-3">
          {/* Key stats row */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Models" value={String(stats.totalModels)} icon="users" />
            <StatCard label="Avg pts/model" value={String(stats.avgPtsPerModel)} icon="calculator" />
            <StatCard label="Avg pts/unit" value={String(stats.avgPtsPerUnit)} icon="tag" />
          </div>

          {/* Weapon type ratio bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">
                Force Composition
              </span>
              <span className="font-data text-[10px] tabular-nums text-text-dim">
                {rangedPct}% ranged · {100 - rangedPct}% assault
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-sm">
              <div
                className="bg-steel/70 transition-all duration-500"
                style={{ width: `${rangedPct}%` }}
                title={`Ranged: ~${stats.weapons.ranged} models`}
              />
              <div
                className="bg-danger/60 transition-all duration-500"
                style={{ width: `${100 - rangedPct}%` }}
                title={`Assault: ~${stats.weapons.melee} models`}
              />
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-steel/70" />
                <span className="font-label text-[9px] tracking-wider text-text-dim uppercase">Ranged</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-danger/60" />
                <span className="font-label text-[9px] tracking-wider text-text-dim uppercase">Assault</span>
              </span>
            </div>
          </div>

          {/* Transport capacity */}
          {stats.transport.capacity > 0 && (
            <div className="flex items-center gap-2 rounded-sm border border-edge-600/15 bg-plate-900/40 px-3 py-2">
              <svg className="h-3.5 w-3.5 shrink-0 text-teal-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span className="font-label text-[11px] font-semibold tracking-wide text-text-secondary">
                Transport
              </span>
              <span className="font-data text-[11px] tabular-nums text-text-dim">
                ~{stats.transport.capacity} capacity
              </span>
              {stats.transport.infantry > stats.transport.capacity && (
                <span className="rounded-sm bg-caution/15 px-1.5 py-px font-label text-[9px] font-bold tracking-wider text-caution uppercase">
                  {stats.transport.infantry - stats.transport.capacity} unmounted
                </span>
              )}
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(stats.categoryModels).length > 1 && (
            <div className="space-y-1">
              <span className="font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">
                By Slot
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.categoryModels)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-sm border border-edge-600/20 bg-plate-700/30 px-2 py-0.5"
                    >
                      <span className="font-label text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
                        {cat}
                      </span>
                      <span className="font-data text-[10px] tabular-nums text-text-dim">{count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  const iconPath = {
    users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.16V14.25M15 19.128a9.308 9.308 0 00-2.25-3.07m-2.25 0a9.315 9.315 0 00-2.786-3.07M12.75 7.5a3 3 0 11-6 0 3 3 0 016 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    calculator: 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008H18v-.008zm0 2.25h.008v.008H18V13.5zM4.5 4.5h15A2.25 2.25 0 0121.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5z',
    tag: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z',
  }[icon] ?? '';

  return (
    <div className="rounded-sm border border-edge-600/15 bg-plate-900/40 px-2.5 py-2 text-center">
      <svg className="mx-auto mb-1 h-3.5 w-3.5 text-gold-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
      <div className="font-data text-[14px] font-semibold tabular-nums text-text-primary">{value}</div>
      <div className="font-label text-[9px] font-semibold tracking-wider text-text-dim uppercase">{label}</div>
    </div>
  );
}
