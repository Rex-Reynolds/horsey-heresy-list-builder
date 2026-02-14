import { useRosterStore } from '../../stores/rosterStore.ts';
import { generateRosterText, downloadRosterText } from '../../utils/exportRoster.ts';

export default function ExportButton() {
  const { rosterName, detachmentType, pointsLimit, entries, totalPoints } = useRosterStore();

  function handleExport() {
    const text = generateRosterText(rosterName, detachmentType, pointsLimit, entries, totalPoints);
    const filename = `${rosterName.replace(/\s+/g, '_')}.txt`;
    downloadRosterText(text, filename);
  }

  return (
    <button
      onClick={handleExport}
      disabled={entries.length === 0}
      className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-gold-500 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Export as Text
    </button>
  );
}
