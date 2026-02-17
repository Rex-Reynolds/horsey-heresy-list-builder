import { useState } from 'react';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { generateRosterText, downloadRosterText } from '../../utils/exportRoster.ts';
import ExportPreviewModal from './ExportPreviewModal.tsx';

export default function ExportButton() {
  const { rosterName, pointsLimit, detachments, totalPoints, doctrine } = useRosterStore();
  const addToast = useUIStore((s) => s.addToast);
  const [showPreview, setShowPreview] = useState(false);

  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);

  function handleDownload() {
    const text = generateRosterText(rosterName, pointsLimit, detachments, totalPoints);
    const filename = `${rosterName.replace(/\s+/g, '_')}.txt`;
    downloadRosterText(text, filename);
    setShowPreview(false);
  }

  function handleCopy() {
    const text = generateRosterText(rosterName, pointsLimit, detachments, totalPoints);
    navigator.clipboard.writeText(text).then(() => {
      addToast('Roster copied to clipboard');
    }).catch(() => {
      addToast('Failed to copy', 'error');
    });
    setShowPreview(false);
  }

  function handlePrint() {
    setShowPreview(false);
    window.print();
  }

  return (
    <>
      <button
        onClick={() => setShowPreview(true)}
        disabled={totalEntries === 0}
        className="font-label w-full rounded-sm border border-edge-600/40 bg-plate-800/40 py-1.5 text-[10px] font-semibold tracking-wider text-text-secondary uppercase transition-all hover:border-gold-600/30 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-25"
      >
        Export Roster
      </button>

      <ExportPreviewModal
        open={showPreview}
        rosterName={rosterName}
        pointsLimit={pointsLimit}
        totalPoints={totalPoints}
        detachments={detachments}
        doctrine={doctrine}
        onClose={() => setShowPreview(false)}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onPrint={handlePrint}
      />
    </>
  );
}
