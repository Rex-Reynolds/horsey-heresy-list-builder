import { type ReactNode, useRef, useCallback } from 'react';
import { useUIStore, PANEL_DEFAULT } from '../../stores/uiStore.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';

interface Props {
  left: ReactNode;
  right: ReactNode;
}

function MobileBottomBar({ onOpen }: { onOpen: () => void }) {
  const totalPoints = useRosterStore((s) => s.totalPoints);
  const pointsLimit = useRosterStore((s) => s.pointsLimit);
  const detachments = useRosterStore((s) => s.detachments);
  const isValid = useRosterStore((s) => s.isValid);
  const validationErrors = useRosterStore((s) => s.validationErrors);
  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);
  const over = totalPoints > pointsLimit;

  const lastAddedInfo = useUIStore((s) => s.lastAddedInfo);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      {/* Inline confirmation toast — slides up when a unit is added */}
      {lastAddedInfo && (
        <div className="animate-toast-in mx-4 mb-1 rounded-sm border border-valid/20 bg-valid/8 px-3.5 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 shrink-0 text-valid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[12px] font-medium text-valid truncate">
              {lastAddedInfo.unitName}
            </span>
            <span className="text-[11px] text-text-dim/60 shrink-0">added to</span>
            <span className="text-[12px] font-medium text-text-secondary truncate">
              {lastAddedInfo.detachmentName}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onOpen}
        className="mobile-bottom-bar flex w-full items-center justify-between px-5 py-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className={`font-data text-lg font-semibold tabular-nums ${over ? 'text-danger' : 'text-gold-400'}`}>
              {totalPoints}
            </span>
            <span className="font-data text-xs text-text-dim">/</span>
            <span className="font-data text-xs tabular-nums text-text-secondary">{pointsLimit}</span>
            <span className="font-label text-[10px] tracking-wider text-text-dim uppercase">pts</span>
          </div>
          {totalEntries > 0 && (
            <span className="font-label rounded-sm border border-edge-600/25 bg-plate-700/40 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-text-secondary">
              {totalEntries} unit{totalEntries !== 1 ? 's' : ''}
            </span>
          )}
          {detachments.length > 0 && (
            <span className="font-data text-[10px] tabular-nums text-text-dim">
              {detachments.length} det
            </span>
          )}
          {isValid !== null && (
            <span className={`flex h-4 w-4 items-center justify-center rounded-full ${
              isValid ? 'bg-valid/20' : 'bg-danger/20'
            }`}>
              {isValid ? (
                <svg className="h-2.5 w-2.5 text-valid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="font-data text-[9px] font-bold text-danger">{validationErrors.length}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label text-xs font-semibold tracking-wider text-gold-400 uppercase">
            View Roster
          </span>
          <svg className="h-4 w-4 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}

export default function AppLayout({ left, right }: Props) {
  const mobileRosterOpen = useUIStore((s) => s.mobileRosterOpen);
  const setMobileRosterOpen = useUIStore((s) => s.setMobileRosterOpen);
  const panelWidth = useUIStore((s) => s.panelWidth);
  const setPanelWidth = useUIStore((s) => s.setPanelWidth);
  const detachments = useRosterStore((s) => s.detachments);
  const hasNoDetachments = detachments.length === 0;

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (ev: PointerEvent) => {
      if (!isDragging.current) return;
      // Dragging left = increasing panel width (panel is on the right)
      const delta = startX.current - ev.clientX;
      setPanelWidth(startWidth.current + delta);
    };

    const handleUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [panelWidth, setPanelWidth]);

  const handleDoubleClick = useCallback(() => {
    setPanelWidth(PANEL_DEFAULT);
  }, [setPanelWidth]);

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Unit browser — dimmed when no detachments */}
        <main className="relative flex-1 overflow-y-auto bg-void p-4 pb-20 lg:p-6 lg:pb-6">
          {hasNoDetachments && (
            <div className="pointer-events-none absolute inset-0 z-10 bg-void/40 backdrop-blur-[1px]" />
          )}
          {hasNoDetachments && (
            <div className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-center lg:flex">
              <div className="flex items-center gap-4 rounded-sm border border-gold-600/20 bg-plate-900/90 px-6 py-4 shadow-xl backdrop-blur-sm">
                <div className="text-center">
                  <p className="font-display text-sm font-semibold tracking-[0.1em] text-gold-400 uppercase">
                    Add a detachment first
                  </p>
                  <p className="mt-1 text-[12px] text-text-dim">
                    Use the roster panel to get started
                  </p>
                </div>
                <svg className="h-5 w-5 animate-pulse text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          )}
          {left}
        </main>

        {/* Desktop resize handle — interactive divider rail */}
        <div
          className="resize-divider group relative hidden w-[10px] cursor-col-resize lg:block"
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          title="Drag to resize — double-click to reset"
        >
          {/* Visible rail line */}
          <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-all group-hover:w-[3px] group-hover:shadow-[0_0_8px_rgba(130,102,36,0.15)]" style={{
            background: 'linear-gradient(180deg, transparent 0%, var(--color-edge-600) 10%, var(--color-gold-600) 50%, var(--color-edge-600) 90%, transparent 100%)',
          }} />
          {/* Center diamond ornament */}
          <div className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold-600 transition-all group-hover:scale-150 group-hover:bg-gold-500" />
          {/* Grip dots — visible on hover */}
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[6px] opacity-0 transition-opacity group-hover:opacity-60" style={{ marginTop: '-30px' }}>
            {[0,1,2].map(i => (
              <div key={i} className="h-[3px] w-[3px] rounded-full bg-gold-500" />
            ))}
          </div>
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[6px] opacity-0 transition-opacity group-hover:opacity-60" style={{ marginTop: '18px' }}>
            {[0,1,2].map(i => (
              <div key={i} className="h-[3px] w-[3px] rounded-full bg-gold-500" />
            ))}
          </div>
        </div>

        {/* Desktop roster panel — resizable width */}
        <aside
          className="hidden overflow-y-auto bg-plate-950 lg:block"
          style={{ width: panelWidth }}
        >
          {right}
        </aside>
      </div>

      {/* Mobile roster backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-void/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileRosterOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileRosterOpen(false)}
      />

      {/* Mobile roster sheet */}
      <div className={`fixed inset-x-0 bottom-0 top-[57px] z-50 flex flex-col overflow-hidden bg-plate-950 transition-transform duration-300 ease-out lg:hidden ${
        mobileRosterOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        {/* Sheet handle */}
        <div className="flex items-center justify-between border-b border-edge-700/40 px-4 py-2.5">
          <span className="font-label text-[11px] font-bold tracking-[0.15em] text-text-secondary uppercase">
            Roster
          </span>
          <button
            onClick={() => setMobileRosterOpen(false)}
            className="font-label flex items-center gap-1.5 text-[11px] tracking-wider text-text-dim uppercase transition-colors hover:text-text-secondary"
          >
            Close
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-8">
          {right}
        </div>
      </div>

      {/* Mobile bottom summary bar */}
      {!mobileRosterOpen && (
        <MobileBottomBar onOpen={() => setMobileRosterOpen(true)} />
      )}
    </>
  );
}
