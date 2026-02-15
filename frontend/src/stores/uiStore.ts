import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: number) => void;

  // Slot-click filter: set by roster panel, read by unit browser
  slotFilter: string | null;
  setSlotFilter: (slot: string | null) => void;

  // Track newly added entry for flash animation
  newEntryId: number | null;
  setNewEntryId: (id: number | null) => void;

  // Mobile roster sheet visibility
  mobileRosterOpen: boolean;
  setMobileRosterOpen: (open: boolean) => void;

  // Brief auto-reveal of roster sheet on mobile when a unit is added
  triggerMobileReveal: () => void;
}

let nextToastId = 0;
let mobileRevealTimer: ReturnType<typeof setTimeout> | undefined;

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = ++nextToastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    // Auto-dismiss after 3s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  slotFilter: null,
  setSlotFilter: (slot) => set({ slotFilter: slot }),

  newEntryId: null,
  setNewEntryId: (id) => {
    set({ newEntryId: id });
    if (id !== null) {
      setTimeout(() => set({ newEntryId: null }), 1600);
      // Trigger mobile auto-reveal
      get().triggerMobileReveal();
    }
  },

  mobileRosterOpen: false,
  setMobileRosterOpen: (open) => set({ mobileRosterOpen: open }),

  triggerMobileReveal: () => {
    // Only auto-reveal on mobile (check viewport width)
    if (window.innerWidth >= 1024) return;
    // Don't reveal if already open
    if (get().mobileRosterOpen) return;

    clearTimeout(mobileRevealTimer);
    set({ mobileRosterOpen: true });

    // Auto-close after 2 seconds
    mobileRevealTimer = setTimeout(() => {
      set({ mobileRosterOpen: false });
    }, 2000);
  },
}));
