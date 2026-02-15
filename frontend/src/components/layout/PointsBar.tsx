interface Props {
  current: number;
  limit: number;
}

export default function PointsBar({ current, limit }: Props) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const over = current > limit;

  return (
    <div>
      {/* Labels */}
      <div className="mb-1 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className={`font-data text-sm font-medium tabular-nums ${over ? 'text-danger' : 'text-gold-400'}`}>
            {current}
          </span>
          <span className="font-data text-[10px] text-text-dim">/</span>
          <span className="font-data text-[10px] tabular-nums text-text-secondary">{limit}</span>
          <span className="font-label ml-0.5 text-[8px] font-semibold tracking-[0.15em] text-text-dim uppercase">pts</span>
        </div>
        {over && (
          <span className="font-data text-[10px] font-medium text-danger">
            +{current - limit} over
          </span>
        )}
      </div>

      {/* Track */}
      <div className="relative h-2.5 overflow-hidden rounded-sm border border-edge-600/40 bg-plate-800">
        {/* Fill */}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
            over
              ? 'bg-gradient-to-r from-danger-dim to-danger'
              : 'bg-gradient-to-r from-gold-700 via-gold-500 to-gold-400'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Leading edge glow */}
        {!over && pct > 2 && (
          <div
            className="absolute inset-y-0 w-6 bg-gradient-to-r from-transparent to-gold-300/30 transition-all duration-700"
            style={{ left: `calc(${pct}% - 24px)` }}
          />
        )}
      </div>

      {/* Milestone ticks */}
      <div className="relative mt-px flex justify-between px-px">
        {[0, 25, 50, 75, 100].map((tick) => (
          <span
            key={tick}
            className={`font-data text-[7px] tabular-nums ${
              pct >= tick ? 'text-text-dim' : 'text-text-dim/40'
            }`}
          >
            {Math.round(limit * tick / 100)}
          </span>
        ))}
      </div>
    </div>
  );
}
