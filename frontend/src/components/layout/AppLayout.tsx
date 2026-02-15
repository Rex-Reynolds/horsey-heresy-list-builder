import type { ReactNode } from 'react';
import { useUIStore } from '../../stores/uiStore.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';

interface Props {
  left: ReactNode;
  right: ReactNode;
}

function MobileBottomBar({ onOpen }: { onOpen: () => void }) {
  const totalPoints = useRosterStore((s) => s.totalPoints);
  const pointsLimit = useRosterStore((s) => s.pointsLimit);
  const detachments = useRosterStore((s) => s.detachments);
  const totalEntries = detachments.reduce((s, d) => s + d.entries.length, 0);
  const over = totalPoints > pointsLimit;

  return (
    <button
      onClick={onOpen}
      className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-40 flex items-center justify-between px-5 py-3.5 lg:hidden"
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
  );
}

export default function AppLayout({ left, right }: Props) {
  const mobileRosterOpen = useUIStore((s) => s.mobileRosterOpen);
  const setMobileRosterOpen = useUIStore((s) => s.setMobileRosterOpen);

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Unit browser — always visible */}
        <main className="flex-1 overflow-y-auto bg-void p-4 pb-20 lg:p-6 lg:pb-6">
          {left}
        </main>

        {/* Desktop divider — ornate vertical line with gold accent */}
        <div className="relative hidden w-[2px] lg:block">
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, transparent 0%, var(--color-edge-600) 10%, var(--color-gold-600) 50%, var(--color-edge-600) 90%, transparent 100%)',
          }} />
          <div
            className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold-600"
          />
        </div>

        {/* Desktop roster panel */}
        <aside className="hidden overflow-y-auto bg-plate-950 lg:block lg:w-[500px]">
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
