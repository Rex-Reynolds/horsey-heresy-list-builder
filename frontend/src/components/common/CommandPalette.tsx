import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore.ts';
import { useRosterStore } from '../../stores/rosterStore.ts';

interface Command {
  id: string;
  label: string;
  category: 'navigation' | 'action' | 'view' | 'roster';
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  available?: boolean;
}

const CATEGORY_ORDER = ['action', 'navigation', 'view', 'roster'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  action: 'Actions',
  navigation: 'Navigate',
  view: 'View',
  roster: 'Roster',
};

// Outer shell: manages open state + global keyboard shortcut
export default function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open]);

  if (!open) return null;

  // Inner component mounts fresh each time, resetting query + selectedIndex
  return <CommandPaletteContent onClose={() => setOpen(false)} />;
}

function CommandPaletteContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rosterId = useRosterStore((s) => s.rosterId);
  const detachments = useRosterStore((s) => s.detachments);
  const clearRoster = useRosterStore((s) => s.clearRoster);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const theme = useUIStore((s) => s.theme);
  const setShowRosterDrawer = useUIStore((s) => s.setShowRosterDrawer);
  const undoStack = useUIStore((s) => s.undoStack);
  const redoStack = useUIStore((s) => s.redoStack);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const setMobileRosterOpen = useUIStore((s) => s.setMobileRosterOpen);

  const hasRoster = !!rosterId;

  const commands: Command[] = useMemo(() => [
    {
      id: 'theme',
      label: theme === 'dataslate' ? 'Switch to Parchment theme' : 'Switch to Dataslate theme',
      category: 'view',
      icon: <ThemeIcon />,
      action: () => toggleTheme(),
    },
    {
      id: 'undo',
      label: 'Undo last action',
      category: 'action',
      shortcut: '\u2318Z',
      icon: <UndoIcon />,
      action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true })),
      available: undoStack.length > 0,
    },
    {
      id: 'redo',
      label: 'Redo last action',
      category: 'action',
      shortcut: '\u2318\u21e7Z',
      icon: <RedoIcon />,
      action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true })),
      available: redoStack.length > 0,
    },
    {
      id: 'roster-drawer',
      label: 'Open My Rosters',
      category: 'roster',
      icon: <FolderIcon />,
      action: () => setShowRosterDrawer(true),
      available: hasRoster,
    },
    {
      id: 'new-roster',
      label: 'Start new roster',
      category: 'roster',
      icon: <PlusIcon />,
      action: () => { if (hasRoster) clearRoster(); },
    },
    {
      id: 'export',
      label: 'Export army list',
      category: 'action',
      icon: <ExportIcon />,
      action: () => {
        const btn = document.querySelector('[title="Export army list"]') as HTMLButtonElement;
        btn?.click();
      },
      available: hasRoster && detachments.length > 0,
    },
    {
      id: 'view-grid',
      label: 'Switch to grid view',
      category: 'view',
      icon: <GridIcon />,
      action: () => setViewMode('grid'),
      available: viewMode === 'list',
    },
    {
      id: 'view-list',
      label: 'Switch to list view',
      category: 'view',
      icon: <ListIcon />,
      action: () => setViewMode('list'),
      available: viewMode === 'grid',
    },
    {
      id: 'keyboard',
      label: 'Show keyboard shortcuts',
      category: 'view',
      shortcut: '?',
      icon: <KeyboardIcon />,
      action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })),
    },
    {
      id: 'mobile-roster',
      label: 'Open roster panel',
      category: 'navigation',
      icon: <ChevronUpIcon />,
      action: () => setMobileRosterOpen(true),
      available: hasRoster,
    },
    {
      id: 'focus-search',
      label: 'Search units',
      category: 'navigation',
      shortcut: '/',
      icon: <SearchIcon />,
      action: () => {
        const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        input?.focus();
      },
      available: hasRoster,
    },
  ], [theme, toggleTheme, undoStack.length, redoStack.length, hasRoster, detachments.length, setShowRosterDrawer, clearRoster, viewMode, setViewMode, setMobileRosterOpen]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const available = commands.filter((c) => c.available !== false);
    if (!q) return available;
    return available.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const grouped = useMemo(() => {
    const groups: { category: string; items: Command[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = filtered.filter((c) => c.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    }
    return groups;
  }, [filtered]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Clamp selectedIndex when filtered results change
  const clampedIndex = Math.min(selectedIndex, Math.max(0, flatItems.length - 1));
  if (clampedIndex !== selectedIndex) {
    // Safe: synchronous derivation, not in effect
    setSelectedIndex(clampedIndex);
  }

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const execute = useCallback((cmd: Command) => {
    onClose();
    setTimeout(() => cmd.action(), 100);
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) execute(flatItems[selectedIndex]);
    }
  }, [flatItems, selectedIndex, execute]);

  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      {/* Palette */}
      <div className="command-palette relative w-full max-w-lg animate-modal-in rounded-sm border border-edge-600/40 bg-plate-900/98 shadow-2xl backdrop-blur-sm">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-edge-700/40 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-gold-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-dim/50"
          />
          <span className="kbd-hint text-[9px]">esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {flatItems.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-text-dim">
              No matching commands
            </div>
          )}
          {grouped.map(({ category, items }) => (
            <div key={category}>
              <div className="px-4 py-1.5">
                <span className="font-label text-[10px] font-semibold tracking-[0.15em] text-text-dim/60 uppercase">
                  {CATEGORY_LABELS[category]}
                </span>
              </div>
              {items.map((cmd) => {
                const idx = flatItems.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    data-index={idx}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                      idx === selectedIndex
                        ? 'bg-gold-600/10 text-gold-300'
                        : 'text-text-primary hover:bg-plate-800/60'
                    }`}
                  >
                    <span className={`shrink-0 ${idx === selectedIndex ? 'text-gold-400' : 'text-text-dim/50'}`}>
                      {cmd.icon}
                    </span>
                    <span className="flex-1 text-[13px]">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="kbd-hint text-[9px]">{cmd.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-edge-700/30 px-4 py-2 flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-text-dim/50">
            <span className="kbd-hint text-[8px]">&uarr;&darr;</span> navigate
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-dim/50">
            <span className="kbd-hint text-[8px]">&crarr;</span> select
          </span>
        </div>
      </div>
    </div>
  );
}

// Inline SVG icons (4x4)
function ThemeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
function KeyboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}
function ChevronUpIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
