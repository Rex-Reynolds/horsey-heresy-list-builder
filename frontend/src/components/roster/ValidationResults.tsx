interface Props {
  isValid: boolean | null;
  errors: string[];
  onErrorClick?: (error: string) => void;
}

export default function ValidationResults({ isValid, errors, onErrorClick }: Props) {
  if (isValid === null) return null;

  if (isValid) {
    return (
      <div className="flex items-center gap-2.5 rounded-sm border border-valid/25 bg-valid/6 px-3 py-2.5 shadow-[0_0_12px_rgba(56,178,96,0.06)]">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-valid/15">
          <svg className="h-3 w-3 text-valid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="font-label text-[11px] font-bold tracking-wider text-valid uppercase">
          Roster Valid
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-danger/25 bg-danger/6 shadow-[0_0_12px_rgba(196,64,64,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-danger/15 px-3 py-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/15">
          <svg className="h-3 w-3 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span className="font-label text-[11px] font-bold tracking-wider text-danger uppercase">
          {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
        </span>
      </div>
      {/* Error list */}
      <ul className="px-3 py-2 space-y-1.5">
        {errors.map((err, i) => (
          <li
            key={i}
            className={`flex items-start gap-2 text-[12px] leading-relaxed text-danger/80 ${onErrorClick ? 'cursor-pointer rounded-sm px-1 -mx-1 transition-colors hover:bg-danger/8 hover:text-danger' : ''}`}
            onClick={onErrorClick ? () => onErrorClick(err) : undefined}
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger/50" />
            {err}
            {onErrorClick && (
              <svg className="mt-0.5 h-3 w-3 shrink-0 text-danger/40 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
