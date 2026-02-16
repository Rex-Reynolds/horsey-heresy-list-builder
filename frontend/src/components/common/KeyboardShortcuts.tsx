import { useState, useEffect } from 'react';

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Focus search' },
  { keys: ['⌘', 'Z'], description: 'Undo last action' },
  { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
  { keys: ['↑', '↓'], description: 'Navigate units' },
  { keys: ['J', 'K'], description: 'Navigate units (vim)' },
  { keys: ['Enter'], description: 'Quick-add single result' },
  { keys: ['Esc'], description: 'Collapse expanded card' },
  { keys: ['?'], description: 'Toggle this overlay' },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }

      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9000] bg-void/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-[9001] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto animate-modal-in w-80 rounded-sm border border-edge-600/40 bg-plate-900/98 shadow-xl">
          <div className="flex items-center justify-between border-b border-edge-700/30 px-5 py-3.5">
            <h3 className="text-imperial text-sm tracking-[0.12em]">Keyboard Shortcuts</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-text-dim transition-colors hover:text-text-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {SHORTCUTS.map(({ keys, description }) => (
              <div key={description} className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-text-secondary">{description}</span>
                <div className="flex items-center gap-1">
                  {keys.map((key) => (
                    <kbd key={key} className="kbd-hint px-2 py-0.5">
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-edge-700/20 px-5 py-2.5">
            <p className="text-[10px] text-text-dim text-center">
              Press <kbd className="kbd-hint px-1.5 py-px mx-0.5">?</kbd> to dismiss
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
