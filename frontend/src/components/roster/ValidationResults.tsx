interface Props {
  isValid: boolean | null;
  errors: string[];
}

export default function ValidationResults({ isValid, errors }: Props) {
  if (isValid === null) return null;

  if (isValid) {
    return (
      <div className="rounded-lg border border-green-800 bg-green-900/20 px-3 py-2 text-sm text-green-300">
        Roster is valid
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-800 bg-red-900/20 px-3 py-2">
      <p className="mb-1 text-xs font-bold uppercase text-red-400">Validation Errors</p>
      <ul className="space-y-0.5">
        {errors.map((err, i) => (
          <li key={i} className="text-xs text-red-300">
            {err}
          </li>
        ))}
      </ul>
    </div>
  );
}
