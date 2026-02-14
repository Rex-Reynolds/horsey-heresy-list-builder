import { create } from 'zustand';
import type { SelectedUpgrade } from '../types/index.ts';

export interface RosterEntry {
  id: number;
  unitId: number;
  name: string;
  category: string;
  baseCost: number;
  upgrades: SelectedUpgrade[];
  upgradeCost: number;
  quantity: number;
  totalCost: number;
}

interface RosterState {
  rosterId: number | null;
  rosterName: string;
  detachmentType: string;
  pointsLimit: number;
  entries: RosterEntry[];
  validationErrors: string[];
  isValid: boolean | null;

  totalPoints: number;

  setRoster: (id: number, name: string, detachment: string, limit: number) => void;
  addEntry: (entry: RosterEntry) => void;
  removeEntry: (entryId: number) => void;
  updateQuantity: (entryId: number, quantity: number) => void;
  syncEntries: (entries: RosterEntry[]) => void;
  setValidation: (isValid: boolean, errors: string[]) => void;
  clearRoster: () => void;
}

function calcTotal(entries: RosterEntry[]): number {
  return entries.reduce((sum, e) => sum + e.totalCost, 0);
}

export const useRosterStore = create<RosterState>((set) => ({
  rosterId: null,
  rosterName: '',
  detachmentType: '',
  pointsLimit: 3000,
  entries: [],
  validationErrors: [],
  isValid: null,
  totalPoints: 0,

  setRoster: (id, name, detachment, limit) =>
    set({ rosterId: id, rosterName: name, detachmentType: detachment, pointsLimit: limit, entries: [], totalPoints: 0, isValid: null, validationErrors: [] }),

  addEntry: (entry) =>
    set((s) => {
      const entries = [...s.entries, entry];
      return { entries, totalPoints: calcTotal(entries) };
    }),

  removeEntry: (entryId) =>
    set((s) => {
      const entries = s.entries.filter((e) => e.id !== entryId);
      return { entries, totalPoints: calcTotal(entries) };
    }),

  updateQuantity: (entryId, quantity) =>
    set((s) => {
      const entries = s.entries.map((e) =>
        e.id === entryId
          ? { ...e, quantity, totalCost: (e.baseCost + e.upgradeCost) * quantity }
          : e,
      );
      return { entries, totalPoints: calcTotal(entries) };
    }),

  syncEntries: (entries) =>
    set({ entries, totalPoints: calcTotal(entries) }),

  setValidation: (isValid, errors) =>
    set({ isValid, validationErrors: errors }),

  clearRoster: () =>
    set({ rosterId: null, rosterName: '', detachmentType: '', pointsLimit: 3000, entries: [], totalPoints: 0, isValid: null, validationErrors: [] }),
}));
