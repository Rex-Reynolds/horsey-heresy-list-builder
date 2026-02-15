import { useRosterStore } from '../../stores/rosterStore.ts';
import { generateRosterText, downloadRosterText } from '../../utils/exportRoster.ts';

export default function ExportButton() {
  const { rosterName, pointsLimit, detachments, totalPoints } = useRosterStore();

  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);

  function handleExport() {
    const text = generateRosterText(rosterName, pointsLimit, detachments, totalPoints);
    const filename = `${rosterName.replace(/\s+/g, '_')}.txt`;
    downloadRosterText(text, filename);
  }

  return (
    <button
      onClick={handleExport}
      disabled={totalEntries === 0}
      className="font-label w-full rounded-sm border border-edge-600/40 bg-plate-800/40 py-1.5 text-[10px] font-semibold tracking-wider text-text-secondary uppercase transition-all hover:border-gold-600/30 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-25"
    >
      Export as Text
    </button>
  );
}
