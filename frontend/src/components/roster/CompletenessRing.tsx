/**
 * Radial progress ring showing roster completeness (required slot fill %).
 * Shows red → amber → green as required slots are satisfied.
 */

interface Props {
  /** 0-100 fill percentage */
  percent: number;
  /** Number of remaining required slots */
  remaining: number;
  /** Size of the SVG in pixels */
  size?: number;
}

export default function CompletenessRing({ percent, remaining, size = 32 }: Props) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent >= 100
      ? 'var(--color-valid)'
      : percent >= 60
        ? 'var(--color-caution)'
        : 'var(--color-danger)';

  const glowColor =
    percent >= 100
      ? 'rgba(66, 192, 112, 0.25)'
      : percent >= 60
        ? 'rgba(208, 168, 40, 0.2)'
        : 'rgba(208, 72, 72, 0.2)';

  const label =
    percent >= 100
      ? 'All required slots filled'
      : `${remaining} required slot${remaining !== 1 ? 's' : ''} unfilled`;

  return (
    <div className="relative shrink-0" title={label}>
      <svg width={size} height={size} className="completeness-ring -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-edge-600)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.3s ease',
            filter: `drop-shadow(0 0 4px ${glowColor})`,
          }}
        />
      </svg>
      {/* Center icon / text */}
      <div className="absolute inset-0 flex items-center justify-center rotate-0">
        {percent >= 100 ? (
          <svg className="h-3 w-3 text-valid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="font-data text-[9px] font-bold tabular-nums" style={{ color }}>
            {Math.round(percent)}
          </span>
        )}
      </div>
    </div>
  );
}
