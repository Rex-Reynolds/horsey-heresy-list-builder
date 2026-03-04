import { type ReactNode, useRef, useCallback, useState } from 'react';
import { useUIStore, PANEL_DEFAULT } from '../../stores/uiStore.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import AnimatedNumber from '../common/AnimatedNumber.tsx';

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

  // Compute total slot fill + unfilled required slots
  let slotFilled = 0;
  let slotMax = 0;
  let requiredUnfilled = 0;
  for (const det of detachments) {
    for (const status of Object.values(det.slots)) {
      if (status.max > 0 && status.max < 999) {
        slotFilled += Math.min(status.filled, status.max);
        slotMax += status.max;
      }
      if (status.min > 0 && status.filled < status.min) {
        requiredUnfilled += (status.min - status.filled);
      }
    }
  }
  const slotPct = slotMax > 0 ? Math.min((slotFilled / slotMax) * 100, 100) : 0;

  const lastAddedInfo = useUIStore((s) => s.lastAddedInfo);

  // Actionable status message
  const statusMsg = detachments.length === 0
    ? null
    : requiredUnfilled > 0
      ? `${requiredUnfilled} required slot${requiredUnfilled !== 1 ? 's' : ''} unfilled`
      : !isValid && validationErrors.length > 0
        ? `${validationErrors.length} issue${validationErrors.length !== 1 ? 's' : ''}`
        : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
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
        className="mobile-bottom-bar flex w-full flex-col px-5 pb-6 pt-3.5"
      >
        {/* Drag handle affordance */}
        <div className="mb-2.5 flex w-full justify-center">
          <div className="h-1.5 w-12 rounded-full bg-gold-500/30" />
        </div>

        {/* Slot fill progress bar */}
        {slotMax > 0 && (
          <div className="mb-2.5 w-full slot-fill-bar">
            <div
              className={`slot-fill-bar-inner ${slotFilled >= slotMax ? 'bg-valid/80' : 'bg-gold-500/60'}`}
              style={{ width: `${slotPct}%` }}
            />
          </div>
        )}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <AnimatedNumber
                value={totalPoints}
                className={`font-data text-xl font-semibold tabular-nums ${over ? 'text-danger' : 'text-gold-400'}`}
              />
              <span className="font-data text-sm text-text-dim">/</span>
              <span className="font-data text-sm tabular-nums text-text-secondary">{pointsLimit}</span>
              <span className="font-label text-xs tracking-wider text-text-dim uppercase">pts</span>
            </div>
            {/* Actionable status instead of raw numbers */}
            {statusMsg ? (
              <span className={`font-label text-xs font-semibold tracking-wide ${
                requiredUnfilled > 0 ? 'text-caution/80' : 'text-danger/80'
              }`}>
                {statusMsg}
              </span>
            ) : totalEntries > 0 ? (
              <span className="font-label rounded-sm border border-edge-600/25 bg-plate-700/40 px-2 py-0.5 text-xs font-semibold tracking-wider text-text-secondary">
                {totalEntries} unit{totalEntries !== 1 ? 's' : ''}
              </span>
            ) : null}
            {isValid !== null && !statusMsg && (
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
          <div className="flex items-center gap-0 rounded-sm border border-gold-600/30 overflow-hidden">
            <span className="font-label bg-plate-800/60 px-3 py-2 text-xs font-semibold tracking-wider text-text-dim uppercase border-r border-gold-600/30">
              Browse
            </span>
            <span className="font-label bg-gold-700/40 px-3 py-2 text-xs font-semibold tracking-wider text-gold-400 uppercase flex items-center gap-1.5">
              Roster
              {totalEntries > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-600/25 px-1 font-data text-[9px] font-bold tabular-nums text-gold-300">
                  {totalEntries}
                </span>
              )}
              <svg className="h-3 w-3 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </span>
          </div>
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

  // Swipe-to-close for mobile sheet
  const touchStartY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setSwipeOffset(delta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset > 80) {
      setMobileRosterOpen(false);
    }
    setSwipeOffset(0);
  }, [swipeOffset, setMobileRosterOpen]);

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
        <main className="relative flex-1 overflow-y-auto bg-void p-4 pb-20 md:p-6 md:pb-6" style={{ scrollPaddingTop: '200px' }}>
          {hasNoDetachments && (
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-l from-plate-950/40 via-transparent to-transparent" />
          )}
          {left}
        </main>

        {/* Desktop resize handle — decorative divider rail */}
        <div
          className="resize-divider panel-divider-depth group relative hidden w-[10px] cursor-col-resize md:block"
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          title="Drag to resize — double-click to reset"
        >
          {/* Visible rail line — always gold-tinted */}
          <div className="panel-divider-line absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-all group-hover:w-[3px] group-hover:shadow-[0_0_8px_rgba(130,102,36,0.15)]" />
          {/* Center diamond ornament — always visible */}
          <div className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold-600 opacity-60 transition-all group-hover:scale-150 group-hover:bg-gold-500 group-hover:opacity-100" />
          {/* Horizontal notch marks above/below diamond */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2" style={{ marginTop: '-12px' }}>
            <div className="panel-divider-notch" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2" style={{ marginTop: '10px' }}>
            <div className="panel-divider-notch" />
          </div>
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
          className="hidden overflow-y-auto bg-plate-950 md:block"
          style={{ width: panelWidth }}
        >
          {right}
        </aside>
      </div>

      {/* Mobile roster backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-void/80 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileRosterOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMobileRosterOpen(false)}
      />

      {/* Mobile roster sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 top-[57px] z-50 flex flex-col overflow-hidden bg-plate-950 transition-transform duration-300 ease-out md:hidden ${
          mobileRosterOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={swipeOffset > 0 ? { transform: `translateY(${swipeOffset}px)`, transition: 'none' } : undefined}
      >
        {/* Sheet handle — swipe down to close */}
        <div
          className="flex flex-col items-center border-b border-edge-700/40 px-4 py-3"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe indicator pill */}
          <div className="mb-2 h-1.5 w-10 rounded-full bg-edge-500/40" />
          <div className="flex w-full items-center justify-between">
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
