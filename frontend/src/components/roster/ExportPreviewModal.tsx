/**
 * Styled export preview pane — shows a formatted army sheet before export.
 * Resembles an official Horus Heresy army list with imperial frame styling.
 */
import { useEffect, useRef } from 'react';
import type { RosterDetachment } from '../../stores/rosterStore.ts';
import UnitTypeIcon from '../common/UnitTypeIcon.tsx';

interface Props {
  open: boolean;
  rosterName: string;
  pointsLimit: number;
  totalPoints: number;
  detachments: RosterDetachment[];
  doctrine: string | null;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

export default function ExportPreviewModal({
  open,
  rosterName,
  pointsLimit,
  totalPoints,
  detachments,
  doctrine,
  onClose,
  onCopy,
  onDownload,
  onPrint,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalModels = detachments.reduce(
    (sum, d) => sum + d.entries.reduce((s, e) => s + e.quantity, 0),
    0,
  );
  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);

  return (
    <div className="modal-overlay fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="animate-modal-in flex w-full max-w-2xl max-h-[85vh] flex-col rounded-sm bg-plate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge-700/30 px-5 py-3">
          <span className="font-display text-sm font-semibold tracking-[0.1em] text-ivory uppercase">
            Army Sheet Preview
          </span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-text-dim transition-colors hover:text-text-secondary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" ref={contentRef}>
          <div className="export-preview-sheet p-6 space-y-5">
            {/* Title block */}
            <div className="imperial-frame imperial-frame-inner relative rounded-sm px-6 py-5 text-center">
              <div className="imperial-frame-inner">
                <h1 className="font-display text-lg font-bold tracking-[0.14em] text-ivory uppercase">
                  {rosterName}
                </h1>
                <div className="divider-imperial my-3" />
                <div className="flex items-center justify-center gap-6">
                  <div>
                    <span className="font-data text-xl font-bold tabular-nums text-gold-400">{totalPoints}</span>
                    <span className="font-label text-[10px] tracking-wider text-text-dim"> / {pointsLimit} pts</span>
                  </div>
                  <div className="h-4 w-px bg-edge-600/40" />
                  <div>
                    <span className="font-data text-lg font-semibold tabular-nums text-text-secondary">{totalEntries}</span>
                    <span className="font-label text-[10px] tracking-wider text-text-dim"> unit{totalEntries !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-4 w-px bg-edge-600/40" />
                  <div>
                    <span className="font-data text-lg font-semibold tabular-nums text-text-secondary">{totalModels}</span>
                    <span className="font-label text-[10px] tracking-wider text-text-dim"> models</span>
                  </div>
                </div>
                {doctrine && (
                  <div className="mt-2">
                    <span className="font-label text-[10px] tracking-wider text-gold-500/60 uppercase">Doctrine: </span>
                    <span className="font-label text-[11px] font-semibold tracking-wide text-gold-400">{doctrine}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detachments */}
            {detachments.map((det) => {
              const detPoints = det.entries.reduce((s, e) => s + e.totalCost, 0);
              const typeColor = {
                Primary: 'border-l-gold-500 bg-gold-900/15',
                Auxiliary: 'border-l-steel bg-steel/8',
                Apex: 'border-l-royal bg-royal/8',
              }[det.type] ?? 'border-l-edge-500 bg-plate-800/30';

              // Group entries by slot
              const slotEntries: Record<string, typeof det.entries> = {};
              for (const entry of det.entries) {
                if (!slotEntries[entry.category]) slotEntries[entry.category] = [];
                slotEntries[entry.category].push(entry);
              }

              return (
                <div key={det.id} className="rounded-sm border border-edge-600/20 overflow-hidden">
                  {/* Detachment header */}
                  <div className={`flex items-center justify-between border-l-3 px-4 py-2.5 ${typeColor}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[13px] font-semibold tracking-[0.1em] text-text-primary uppercase">
                        {det.name}
                      </span>
                      <span className="font-label rounded-sm border border-edge-600/30 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-text-dim uppercase">
                        {det.type}
                      </span>
                    </div>
                    <span className="font-data text-[13px] font-semibold tabular-nums text-gold-400">
                      {detPoints} pts
                    </span>
                  </div>

                  {/* Entries grouped by slot */}
                  <div className="divide-y divide-edge-700/15">
                    {Object.entries(slotEntries).map(([slot, entries]) => (
                      <div key={slot} className="px-4 py-2">
                        <div className="mb-1 flex items-center gap-1.5">
                          <UnitTypeIcon unitType={slot} className="h-3 w-3 text-text-dim/40" />
                          <span className="font-label text-[10px] font-semibold tracking-wider text-text-dim uppercase">
                            {slot}
                          </span>
                        </div>
                        {entries.map((entry) => (
                          <div key={entry.id} className="flex items-baseline justify-between py-1 pl-4">
                            <div className="min-w-0 flex-1">
                              <span className="font-unit-name text-[14px] text-text-primary">
                                {entry.name}
                              </span>
                              {entry.quantity > 1 && (
                                <span className="font-data ml-1.5 text-[11px] tabular-nums text-text-dim">
                                  x{entry.quantity}
                                </span>
                              )}
                              {entry.upgradeNames && entry.upgradeNames.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {entry.upgradeNames.map((name, i) => (
                                    <span key={i} className="text-[10px] italic text-text-dim/70">
                                      {name}{i < entry.upgradeNames.length - 1 ? ',' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="font-data shrink-0 text-[12px] font-medium tabular-nums text-gold-500/80">
                              {entry.totalCost} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div className="divider-imperial" />
            <div className="text-center">
              <span className="font-label text-[10px] tracking-wider text-text-dim/50 uppercase">
                Solar Auxilia List Builder — Age of Darkness
              </span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 border-t border-edge-700/30 px-5 py-3">
          <button
            onClick={onCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-edge-600/40 bg-plate-800/40 py-2 text-[12px] font-medium text-text-secondary transition-all hover:border-gold-600/30 hover:text-gold-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          <button
            onClick={onDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-edge-600/40 bg-plate-800/40 py-2 text-[12px] font-medium text-text-secondary transition-all hover:border-gold-600/30 hover:text-gold-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </button>
          <button
            onClick={onPrint}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-edge-600/40 bg-plate-800/40 py-2 text-[12px] font-medium text-text-secondary transition-all hover:border-gold-600/30 hover:text-gold-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
