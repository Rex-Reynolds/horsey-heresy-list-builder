import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  onUndo?: () => void;
}

export interface SlotFilterContext {
  slotName: string;
  detachmentName: string;
  filled: number;
  max: number;
}

// Resizable panel constants
export const PANEL_MIN = 360;
export const PANEL_MAX = 720;
export const PANEL_DEFAULT = 500;

function loadPanelWidth(): number {
  try {
    const v = localStorage.getItem('sa_panel_width');
    if (v) {
      const n = Number(v);
      if (n >= PANEL_MIN && n <= PANEL_MAX) return n;
    }
  } catch { /* storage unavailable */ }
  return PANEL_DEFAULT;
}

export interface UndoAction {
  type: string;
  description: string;
  payload: Record<string, unknown>;
}

interface UIState {
  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], onUndo?: () => void) => void;
  removeToast: (id: number) => void;

  // Undo/redo history
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  pushUndo: (action: UndoAction) => void;
  popUndo: () => UndoAction | undefined;
  pushRedo: (action: UndoAction) => void;
  popRedo: () => UndoAction | undefined;

  // Slot-click filter: set by roster panel, read by unit browser
  slotFilter: string | null;
  setSlotFilter: (slot: string | null) => void;

  // Rich slot filter context for contextual banner
  slotFilterContext: SlotFilterContext | null;
  setSlotFilterContext: (ctx: SlotFilterContext | null) => void;

  // Track newly added entry for flash animation
  newEntryId: number | null;
  setNewEntryId: (id: number | null) => void;

  // Mobile roster sheet visibility
  mobileRosterOpen: boolean;
  setMobileRosterOpen: (open: boolean) => void;

  // Inline mobile confirmation for unit added
  lastAddedInfo: { unitName: string; detachmentName: string } | null;
  setLastAddedInfo: (info: { unitName: string; detachmentName: string } | null) => void;

  // Unit browser view mode
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;

  // Resizable roster panel width (desktop only)
  panelWidth: number;
  setPanelWidth: (w: number) => void;

  // Theme: 'dataslate' (dark) or 'parchment' (light)
  theme: 'dataslate' | 'parchment';
  toggleTheme: () => void;
}

let nextToastId = 0;
let lastAddedTimer: ReturnType<typeof setTimeout> | undefined;

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  addToast: (message, type = 'success', onUndo) => {
    const id = ++nextToastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type, onUndo }] }));
    // Auto-dismiss: 5s if undo present, 3s otherwise
    const delay = onUndo ? 5000 : 3000;
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, delay);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  undoStack: [],
  redoStack: [],
  pushUndo: (action) => set((s) => ({
    undoStack: [...s.undoStack.slice(-19), action],
    redoStack: [],
  })),
  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return undefined;
    const action = stack[stack.length - 1];
    set({ undoStack: stack.slice(0, -1) });
    return action;
  },
  pushRedo: (action) => set((s) => ({
    redoStack: [...s.redoStack.slice(-19), action],
  })),
  popRedo: () => {
    const stack = get().redoStack;
    if (stack.length === 0) return undefined;
    const action = stack[stack.length - 1];
    set({ redoStack: stack.slice(0, -1) });
    return action;
  },

  slotFilter: null,
  setSlotFilter: (slot) => set({ slotFilter: slot }),

  slotFilterContext: null,
  setSlotFilterContext: (ctx) => set({ slotFilterContext: ctx }),

  newEntryId: null,
  setNewEntryId: (id) => {
    set({ newEntryId: id });
    if (id !== null) {
      setTimeout(() => set({ newEntryId: null }), 1600);
    }
  },

  mobileRosterOpen: false,
  setMobileRosterOpen: (open) => set({ mobileRosterOpen: open }),

  lastAddedInfo: null,
  setLastAddedInfo: (info) => {
    clearTimeout(lastAddedTimer);
    set({ lastAddedInfo: info });
    if (info) {
      lastAddedTimer = setTimeout(() => {
        set({ lastAddedInfo: null });
      }, 3000);
    }
  },

  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),

  panelWidth: loadPanelWidth(),
  setPanelWidth: (w) => {
    const clamped = Math.round(Math.max(PANEL_MIN, Math.min(PANEL_MAX, w)));
    set({ panelWidth: clamped });
    try { localStorage.setItem('sa_panel_width', String(clamped)); } catch { /* storage unavailable */ }
  },

  theme: (() => {
    try {
      const saved = localStorage.getItem('sa_theme');
      if (saved === 'parchment') return 'parchment' as const;
    } catch { /* storage unavailable */ }
    return 'dataslate' as const;
  })(),
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dataslate' ? 'parchment' as const : 'dataslate' as const;
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('sa_theme', next); } catch { /* storage unavailable */ }
    return { theme: next };
  }),
}));
