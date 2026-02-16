import { useState } from 'react';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useUIStore } from '../../stores/uiStore.ts';
import { generateRosterText, downloadRosterText } from '../../utils/exportRoster.ts';

export default function ExportButton() {
  const { rosterName, pointsLimit, detachments, totalPoints } = useRosterStore();
  const addToast = useUIStore((s) => s.addToast);
  const [showMenu, setShowMenu] = useState(false);

  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);

  function handleDownload() {
    const text = generateRosterText(rosterName, pointsLimit, detachments, totalPoints);
    const filename = `${rosterName.replace(/\s+/g, '_')}.txt`;
    downloadRosterText(text, filename);
    setShowMenu(false);
  }

  function handleCopy() {
    const text = generateRosterText(rosterName, pointsLimit, detachments, totalPoints);
    navigator.clipboard.writeText(text).then(() => {
      addToast('Roster copied to clipboard');
    }).catch(() => {
      addToast('Failed to copy', 'error');
    });
    setShowMenu(false);
  }

  function handlePrint() {
    setShowMenu(false);
    window.print();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        disabled={totalEntries === 0}
        className="font-label w-full rounded-sm border border-edge-600/40 bg-plate-800/40 py-1.5 text-[10px] font-semibold tracking-wider text-text-secondary uppercase transition-all hover:border-gold-600/30 hover:text-gold-400 disabled:cursor-not-allowed disabled:opacity-25"
      >
        Export Roster
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-20 animate-fade-in rounded-sm border border-edge-600/40 bg-plate-900/98 shadow-lg overflow-hidden">
            <button
              onClick={handleCopy}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-plate-700/30 hover:text-gold-400"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to Clipboard
            </button>
            <button
              onClick={handleDownload}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-plate-700/30 hover:text-gold-400"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download .txt
            </button>
            <button
              onClick={handlePrint}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] text-text-secondary transition-colors hover:bg-plate-700/30 hover:text-gold-400"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </>
      )}
    </div>
  );
}
