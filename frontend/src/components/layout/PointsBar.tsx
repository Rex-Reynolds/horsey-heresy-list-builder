interface Props {
  current: number;
  limit: number;
}

export default function PointsBar({ current, limit }: Props) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const over = current > limit;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className={over ? 'font-bold text-red-400' : 'text-slate-400'}>
          {current} / {limit} pts
        </span>
        {over && <span className="text-red-400">+{current - limit} over</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-gold-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
