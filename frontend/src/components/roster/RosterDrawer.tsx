import { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/uiStore.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';
import { useRosters, useDeleteRoster } from '../../api/rosters.ts';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../common/ConfirmDialog.tsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';
import client from '../../api/client.ts';

export default function RosterDrawer() {
  const open = useUIStore((s) => s.showRosterDrawer);
  const setOpen = useUIStore((s) => s.setShowRosterDrawer);
  const addToast = useUIStore((s) => s.addToast);

  const activeRosterId = useRosterStore((s) => s.rosterId);
  const syncFromResponse = useRosterStore((s) => s.syncFromResponse);
  const clearRoster = useRosterStore((s) => s.clearRoster);

  const { data: rosters = [], refetch } = useRosters();
  const deleteMutation = useDeleteRoster();
  const queryClient = useQueryClient();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const rosterToDelete = rosters.find((r) => r.id === confirmDeleteId);
  const trapRef = useFocusTrap(open);

  // Refetch when drawer opens
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, setOpen]);

  function handleLoad(roster: { id: number }) {
    client.get(`/api/rosters/${roster.id}`).then(({ data }) => {
      syncFromResponse(data);
      setOpen(false);
      addToast('Roster loaded');
    }).catch(() => {
      addToast('Failed to load roster', 'error');
    });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['rosters'] });
        if (id === activeRosterId) {
          clearRoster();
        }
        setConfirmDeleteId(null);
        addToast('Roster deleted');
      },
      onError: () => {
        addToast('Failed to delete roster', 'error');
      },
    });
  }

  function handleDuplicate(id: number, name: string) {
    client.post(`/api/rosters/${id}/duplicate`).then(({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['rosters'] });
      syncFromResponse(data);
      setOpen(false);
      addToast(`Duplicated "${name}"`);
    }).catch(() => {
      addToast('Failed to duplicate roster', 'error');
    });
  }

  function handleNewRoster() {
    clearRoster();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="roster-drawer-overlay fixed inset-0 z-[80]"
        onClick={() => setOpen(false)}
      />

      {/* Drawer — slide from right on desktop, sheet from bottom on mobile */}
      <div className="fixed z-[81] lg:right-0 lg:top-0 lg:bottom-0 lg:w-[380px] lg:animate-drawer-slide-in inset-x-0 bottom-0 top-[20vh] max-lg:animate-drawer-slide-up">
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="My rosters"
          className="flex h-full flex-col bg-plate-900 border-l border-edge-700/30 max-lg:rounded-t-lg max-lg:border-t max-lg:border-l-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-edge-700/30 px-5 py-4">
            <h3 className="font-display text-sm font-semibold tracking-[0.1em] text-ivory uppercase">
              My Rosters
            </h3>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-sm text-text-dim transition-colors hover:text-text-secondary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New Roster button */}
          <div className="px-5 py-3 border-b border-edge-700/20">
            <button
              onClick={handleNewRoster}
              className="btn-imperial font-label w-full rounded-sm bg-gold-600 py-2.5 text-xs font-bold tracking-[0.15em] text-white uppercase"
            >
              + New Roster
            </button>
          </div>

          {/* Roster list */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {rosters.length === 0 ? (
              <div className="relative flex flex-col items-center justify-center py-14 text-text-dim overflow-hidden">
                <svg viewBox="0 0 64 28" fill="currentColor" className="absolute w-24 aquila-breathe pointer-events-none">
                  <path d="M28 14 L6 5 L12 11 L3 9 L14 14 L3 19 L12 17 L6 23 Z" />
                  <path d="M36 14 L58 5 L52 11 L61 9 L50 14 L61 19 L52 17 L58 23 Z" />
                  <path d="M32 4 L34 12 L40 8 L35 14 L42 14 L35 16 L40 20 L34 16 L32 24 L30 16 L24 20 L29 16 L22 14 L29 14 L24 8 L30 12 Z" />
                  <circle cx="32" cy="14" r="3.5" />
                </svg>
                <p className="relative z-[1] font-label text-[11px] font-medium tracking-wider uppercase">No saved rosters</p>
                <p className="relative z-[1] mt-1.5 text-[11px] text-text-dim/50">Create one to begin</p>
              </div>
            ) : (
              <div className="stagger-list space-y-2">
                {rosters.map((roster) => {
                  const isActive = roster.id === activeRosterId;
                  const pts = roster.total_points ?? 0;
                  const limit = roster.points_limit ?? 0;
                  const fillPct = limit > 0 ? Math.min((pts / limit) * 100, 100) : 0;
                  const over = pts > limit;
                  const completeness = fillPct === 0 ? 'empty' : over ? 'over' : fillPct >= 80 ? 'near' : 'building';
                  const borderLeftColor = {
                    empty: 'border-l-edge-600/30',
                    building: 'border-l-gold-500/40',
                    near: 'border-l-caution/50',
                    over: 'border-l-danger/50',
                  }[completeness];
                  return (
                    <div
                      key={roster.id}
                      className={`group relative rounded-sm border-l-2 border border-l-solid transition-all ${borderLeftColor} ${
                        isActive
                          ? 'border-gold-500/30 bg-gold-900/15 shadow-[0_0_12px_rgba(200,160,72,0.08)]'
                          : 'border-edge-600/20 bg-plate-800/30 hover:border-edge-500/30 hover:bg-plate-800/50'
                      }`}
                    >
                      <button
                        onClick={() => handleLoad(roster)}
                        className="w-full px-4 py-3 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-display text-[13px] font-semibold tracking-[0.08em] uppercase truncate ${
                            isActive ? 'text-gold-400' : 'text-text-primary'
                          }`}>
                            {roster.name}
                          </span>
                          {isActive && (
                            <span className="shrink-0 rounded-sm bg-gold-600/20 px-1.5 py-px font-label text-[9px] font-bold tracking-wider text-gold-400 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        {/* Points bar + detachment badges */}
                        <div className="mt-1.5 flex items-center gap-2.5">
                          <span className={`font-data text-xs tabular-nums ${over ? 'text-danger' : 'text-text-dim'}`}>
                            {pts}/{limit}
                          </span>
                          {/* Mini fill bar */}
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge-700/20">
                            <div
                              className={`h-full rounded-full transition-all ${
                                over ? 'bg-danger' : fillPct >= 80 ? 'bg-caution/80' : fillPct > 0 ? 'bg-gold-500/60' : 'bg-transparent'
                              }`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                        {roster.detachments && roster.detachments.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {roster.detachments.map((d: { id: number; type: string; name: string }) => (
                              <span
                                key={d.id}
                                className={`rounded-sm border px-1.5 py-px font-label text-[9px] tracking-wider uppercase ${
                                  d.type === 'Primary'
                                    ? 'border-gold-600/25 bg-gold-900/20 text-gold-400/80'
                                    : d.type === 'Auxiliary'
                                      ? 'border-steel-dim/25 bg-steel/8 text-steel/80'
                                      : 'border-royal-dim/25 bg-royal/8 text-royal/80'
                                }`}
                              >
                                {d.type}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>

                      {/* Action buttons */}
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-all group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(roster.id, roster.name);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-sm text-text-dim/40 transition-all hover:text-steel"
                          aria-label="Duplicate roster"
                          title="Duplicate roster"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(roster.id);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-sm text-text-dim/40 transition-all hover:text-danger"
                          aria-label="Delete roster"
                          title="Delete roster"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete Roster"
        message={`Permanently delete "${rosterToDelete?.name ?? 'this roster'}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
