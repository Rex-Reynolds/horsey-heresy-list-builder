interface Props {
  isValid: boolean | null;
  errors: string[];
}

export default function ValidationResults({ isValid, errors }: Props) {
  if (isValid === null) return null;

  if (isValid) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-valid/15 bg-valid/5 px-2.5 py-1.5">
        <svg className="h-3 w-3 text-valid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-label text-[10px] font-semibold tracking-wide text-valid uppercase">
          Roster Valid
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-danger/15 bg-danger/5 px-2.5 py-1.5">
      <p className="font-label mb-0.5 text-[9px] font-bold tracking-wider text-danger uppercase">
        Validation Errors
      </p>
      <ul className="space-y-0.5">
        {errors.map((err, i) => (
          <li key={i} className="text-[10px] text-danger/70">
            {err}
          </li>
        ))}
      </ul>
    </div>
  );
}
