import { useDoctrines, useSetDoctrine } from '../../api/rosters.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';

export default function DoctrinePicker() {
  const { rosterId, doctrine, syncFromResponse, setDoctrine } = useRosterStore();
  const { data: doctrines = [] } = useDoctrines();
  const setDoctrineMutation = useSetDoctrine(rosterId);

  if (!rosterId || doctrines.length === 0) return null;

  function handleChange(doctrineId: string | null) {
    if (!rosterId) return;
    setDoctrine(doctrineId); // Optimistic update — select reflects change immediately
    setDoctrineMutation.mutate(
      { doctrine_id: doctrineId },
      {
        onSuccess: (resp) => {
          syncFromResponse(resp);
        },
      },
    );
  }

  // Format doctrine name: strip "Cohort Doctrine: " prefix
  function displayName(name: string) {
    return name.replace(/^Cohort Doctrine:\s*/, '').replace(/ Cohort$/, '');
  }

  return (
    <div className="rounded-sm border border-edge-600/20 bg-plate-800/30 px-3 py-2.5">
      <label className="font-label mb-1.5 block text-[11px] font-semibold tracking-wider text-text-dim uppercase">
        Cohort Doctrine
      </label>
      <select
        value={doctrine ?? ''}
        onChange={(e) => handleChange(e.target.value || null)}
        disabled={setDoctrineMutation.isPending}
        className="input-imperial w-full rounded-sm px-2.5 py-2 text-[13px] text-text-primary outline-none disabled:opacity-50"
      >
        <option value="">None</option>
        {doctrines.map((d) => (
          <option key={d.id} value={d.id}>
            {displayName(d.name)}
          </option>
        ))}
      </select>
      {doctrine && (
        <p className="mt-1.5 text-[11px] text-gold-400/80">
          Doctrine active — Tercio slot caps doubled, matching auxiliary cost halved
        </p>
      )}
    </div>
  );
}
