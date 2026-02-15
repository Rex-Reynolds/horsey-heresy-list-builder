import { create } from 'zustand';
import type { SelectedUpgrade, SlotStatus, RosterDetachmentResponse, RosterEntryResponse, CompositionStatus } from '../types/index.ts';

export interface RosterEntry {
  id: number;
  unitId: number;
  name: string;
  category: string; // Native HH3 slot name
  baseCost: number;
  upgrades: SelectedUpgrade[];
  upgradeNames: string[];
  upgradeCost: number;
  quantity: number;
  totalCost: number;
  modelMin: number;
  modelMax: number | null;
}

export interface RosterDetachment {
  id: number;
  detachmentId: number;
  name: string;
  type: string; // "Primary", "Auxiliary", "Apex"
  slots: Record<string, SlotStatus>;
  entries: RosterEntry[];
}

const DEFAULT_COMPOSITION: CompositionStatus = {
  primary_count: 0,
  primary_max: 1,
  auxiliary_budget: 0,
  auxiliary_used: 0,
  apex_budget: 0,
  apex_used: 0,
  warlord_available: false,
  warlord_count: 0,
};

interface RosterState {
  rosterId: number | null;
  rosterName: string;
  pointsLimit: number;
  detachments: RosterDetachment[];
  composition: CompositionStatus;
  validationErrors: string[];
  isValid: boolean | null;
  doctrine: string | null; // Selected Cohort Doctrine category ID

  totalPoints: number;

  setRoster: (id: number, name: string, limit: number, detachments: RosterDetachment[]) => void;
  addDetachment: (det: RosterDetachment) => void;
  removeDetachment: (detId: number) => void;
  updateDetachmentSlots: (detId: number, slots: Record<string, SlotStatus>) => void;
  addEntry: (detachmentId: number, entry: RosterEntry) => void;
  removeEntry: (detachmentId: number, entryId: number) => void;
  updateQuantity: (detachmentId: number, entryId: number, quantity: number) => void;
  setComposition: (composition: CompositionStatus) => void;
  setDoctrine: (doctrine: string | null) => void;
  syncFromResponse: (resp: {
    id: number;
    name: string;
    points_limit: number;
    detachments: RosterDetachmentResponse[];
    composition?: CompositionStatus;
    doctrine?: string | null;
  }) => void;
  setValidation: (isValid: boolean, errors: string[]) => void;
  clearRoster: () => void;
}

function calcTotal(detachments: RosterDetachment[]): number {
  return detachments.reduce(
    (sum, d) => sum + d.entries.reduce((s, e) => s + e.totalCost, 0),
    0,
  );
}

function mapResponseDetachments(dets: RosterDetachmentResponse[]): RosterDetachment[] {
  return dets.map((d) => ({
    id: d.id,
    detachmentId: d.detachment_id,
    name: d.name,
    type: d.type,
    slots: d.slots,
    entries: d.entries.map(mapResponseEntry),
  }));
}

function mapResponseEntry(e: RosterEntryResponse): RosterEntry {
  return {
    id: e.id,
    unitId: e.unit_id,
    name: e.unit_name,
    category: e.category,
    baseCost: e.total_cost / Math.max(e.quantity, 1), // Approximate
    upgrades: e.upgrades,
    upgradeNames: [],
    upgradeCost: 0,
    quantity: e.quantity,
    totalCost: e.total_cost,
    modelMin: e.model_min ?? 1,
    modelMax: e.model_max ?? null,
  };
}

export const useRosterStore = create<RosterState>((set) => ({
  rosterId: null,
  rosterName: '',
  pointsLimit: 3000,
  detachments: [],
  composition: DEFAULT_COMPOSITION,
  validationErrors: [],
  isValid: null,
  doctrine: null,
  totalPoints: 0,

  setRoster: (id, name, limit, detachments) =>
    set({
      rosterId: id,
      rosterName: name,
      pointsLimit: limit,
      detachments,
      totalPoints: calcTotal(detachments),
      isValid: null,
      validationErrors: [],
    }),

  addDetachment: (det) =>
    set((s) => {
      const detachments = [...s.detachments, det];
      return { detachments };
    }),

  removeDetachment: (detId) =>
    set((s) => {
      const detachments = s.detachments.filter((d) => d.id !== detId);
      return { detachments, totalPoints: calcTotal(detachments) };
    }),

  updateDetachmentSlots: (detId, slots) =>
    set((s) => ({
      detachments: s.detachments.map((d) =>
        d.id === detId ? { ...d, slots } : d,
      ),
    })),

  addEntry: (detachmentId, entry) =>
    set((s) => {
      const detachments = s.detachments.map((d) =>
        d.id === detachmentId
          ? { ...d, entries: [...d.entries, entry] }
          : d,
      );
      return { detachments, totalPoints: calcTotal(detachments) };
    }),

  removeEntry: (detachmentId, entryId) =>
    set((s) => {
      const detachments = s.detachments.map((d) =>
        d.id === detachmentId
          ? { ...d, entries: d.entries.filter((e) => e.id !== entryId) }
          : d,
      );
      return { detachments, totalPoints: calcTotal(detachments) };
    }),

  updateQuantity: (detachmentId, entryId, quantity) =>
    set((s) => {
      const detachments = s.detachments.map((d) =>
        d.id === detachmentId
          ? {
              ...d,
              entries: d.entries.map((e) =>
                e.id === entryId
                  ? { ...e, quantity, totalCost: (e.baseCost + e.upgradeCost) * quantity }
                  : e,
              ),
            }
          : d,
      );
      return { detachments, totalPoints: calcTotal(detachments) };
    }),

  setComposition: (composition) =>
    set({ composition }),

  setDoctrine: (doctrine) =>
    set({ doctrine }),

  syncFromResponse: (resp) =>
    set(() => {
      const detachments = mapResponseDetachments(resp.detachments);
      // Persist roster ID for session restore
      try { localStorage.setItem('sa_roster_id', String(resp.id)); } catch {}
      return {
        rosterId: resp.id,
        rosterName: resp.name,
        pointsLimit: resp.points_limit,
        detachments,
        totalPoints: calcTotal(detachments),
        composition: resp.composition ?? DEFAULT_COMPOSITION,
        doctrine: resp.doctrine ?? null,
        isValid: null,
        validationErrors: [],
      };
    }),

  setValidation: (isValid, errors) =>
    set({ isValid, validationErrors: errors }),

  clearRoster: () => {
    try { localStorage.removeItem('sa_roster_id'); } catch {}
    set({
      rosterId: null,
      rosterName: '',
      pointsLimit: 3000,
      detachments: [],
      composition: DEFAULT_COMPOSITION,
      doctrine: null,
      totalPoints: 0,
      isValid: null,
      validationErrors: [],
    });
  },
}));
