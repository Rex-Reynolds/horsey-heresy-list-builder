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
  } catch {}
  return PANEL_DEFAULT;
}

interface UIState {
  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], onUndo?: () => void) => void;
  removeToast: (id: number) => void;

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

  // Resizable roster panel width (desktop only)
  panelWidth: number;
  setPanelWidth: (w: number) => void;
}

let nextToastId = 0;
let lastAddedTimer: ReturnType<typeof setTimeout> | undefined;

export const useUIStore = create<UIState>((set) => ({
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

  panelWidth: loadPanelWidth(),
  setPanelWidth: (w) => {
    const clamped = Math.round(Math.max(PANEL_MIN, Math.min(PANEL_MAX, w)));
    set({ panelWidth: clamped });
    try { localStorage.setItem('sa_panel_width', String(clamped)); } catch {}
  },
}));
