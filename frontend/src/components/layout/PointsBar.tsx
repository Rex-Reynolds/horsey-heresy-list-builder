import { useRef, useEffect, useState } from 'react';

export interface PointsSegment {
  label: string;
  points: number;
  type: string;
}

interface Props {
  current: number;
  limit: number;
  segments?: PointsSegment[];
}

const SEGMENT_COLORS: Record<string, string> = {
  Primary: 'bg-gold-500',
  Auxiliary: 'bg-steel',
  Apex: 'bg-royal',
  'Lord of War': 'bg-gold-400',
};

const SEGMENT_COLORS_DIM: Record<string, string> = {
  Primary: 'bg-gold-600',
  Auxiliary: 'bg-steel-dim',
  Apex: 'bg-royal-dim',
  'Lord of War': 'bg-gold-500',
};

export default function PointsBar({ current, limit, segments }: Props) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const over = current > limit;

  // Flash the points number when value changes
  const [flash, setFlash] = useState(false);
  const prevCurrent = useRef(current);
  useEffect(() => {
    if (prevCurrent.current !== current && prevCurrent.current !== 0) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      prevCurrent.current = current;
      return () => clearTimeout(timer);
    }
    prevCurrent.current = current;
  }, [current]);

  // Compute threshold ticks at common game sizes
  const step = limit >= 3000 ? 1000 : 500;
  const ticks: number[] = [];
  for (let v = step; v < limit; v += step) {
    ticks.push(v);
  }

  // Build segment widths relative to the filled portion
  const hasSegments = segments && segments.length > 0 && current > 0;

  return (
    <div>
      {/* Labels */}
      <div className="mb-1.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-data text-2xl font-bold tabular-nums tracking-tight transition-colors ${over ? 'text-danger' : 'text-gold-300'} ${flash ? 'animate-points-flash' : ''}`}>
            {current}
          </span>
          <span className="font-data text-sm text-text-dim/60">/</span>
          <span className="font-data text-sm tabular-nums text-text-secondary">{limit}</span>
          <span className="font-label ml-0.5 text-[10px] font-semibold tracking-[0.15em] text-text-dim uppercase">pts</span>
        </div>
        {over && (
          <span className="font-data text-xs font-semibold text-danger animate-pulse">
            +{current - limit} over
          </span>
        )}
      </div>

      {/* Track */}
      <div className={`relative h-4 overflow-hidden rounded-sm border transition-all ${
        over
          ? 'border-danger/40 shadow-[0_0_12px_rgba(196,64,64,0.15)]'
          : 'border-edge-600/35'
      } bg-plate-800`}>
        {/* Segmented fill */}
        {hasSegments ? (
          <div
            className="flex h-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          >
            {segments!.map((seg, i) => {
              const segPct = current > 0 ? (seg.points / current) * 100 : 0;
              if (segPct <= 0) return null;
              const color = over ? 'bg-danger' : (
                i % 2 === 0
                  ? (SEGMENT_COLORS[seg.type] ?? 'bg-edge-400')
                  : (SEGMENT_COLORS_DIM[seg.type] ?? 'bg-edge-500')
              );
              return (
                <div
                  key={i}
                  className={`h-full ${color} ${i > 0 ? 'border-l border-void/30' : ''}`}
                  style={{ width: `${segPct}%` }}
                  title={`${seg.label}: ${seg.points} pts`}
                />
              );
            })}
          </div>
        ) : (
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
              over
                ? 'bg-gradient-to-r from-danger-dim to-danger'
                : 'bg-gradient-to-r from-gold-700 via-gold-500 to-gold-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        )}

        {/* Leading edge glow */}
        {!over && pct > 2 && (
          <div
            className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent to-white/10 transition-all duration-700 pointer-events-none"
            style={{ left: `calc(${pct}% - 32px)` }}
          />
        )}

        {/* Threshold markers */}
        {ticks.map((t) => {
          const tickPct = (t / limit) * 100;
          return (
            <div
              key={t}
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{ left: `${tickPct}%` }}
            >
              <div className={`h-full ${tickPct <= pct ? 'bg-void/25' : 'bg-text-dim/12'}`} />
            </div>
          );
        })}

        {/* Scan-line texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px)',
          }}
        />
      </div>

      {/* Threshold labels */}
      <div className="relative mt-0.5 h-3">
        <span className="absolute left-0 font-data text-[9px] tabular-nums text-text-dim/40">0</span>
        {ticks.map((t) => {
          const tickPct = (t / limit) * 100;
          return (
            <span
              key={t}
              className={`absolute font-data text-[9px] tabular-nums -translate-x-1/2 ${
                pct >= tickPct ? 'text-text-dim' : 'text-text-dim/30'
              }`}
              style={{ left: `${tickPct}%` }}
            >
              {t >= 1000 ? `${t / 1000}k` : t}
            </span>
          );
        })}
        <span className="absolute right-0 font-data text-[9px] tabular-nums text-text-dim">
          {limit >= 1000 ? `${limit / 1000}k` : limit}
        </span>
      </div>
    </div>
  );
}
