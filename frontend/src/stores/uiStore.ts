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
}

let nextToastId = 0;

export const useUIStore = create<UIState>((set) => ({
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
    }
  },

  mobileRosterOpen: false,
  setMobileRosterOpen: (open) => set({ mobileRosterOpen: open }),
}));
