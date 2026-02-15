import { useMemo, useCallback } from 'react';
import { useRosterStore, type RosterDetachment } from '../stores/rosterStore.ts';
import { useDetachments } from '../api/detachments.ts';
import type { Detachment, UnitConstraint } from '../types/index.ts';

export type UnitAvailability = 'addable' | 'slot_full' | 'no_slot' | 'no_roster' | 'no_detachment' | 'roster_limit';

export interface AvailabilityInfo {
  status: UnitAvailability;
  openDetachments: RosterDetachment[];
  fullDetachments: RosterDetachment[];
  unlockableDetachments: Detachment[];
  rosterLimitMessage?: string;
}

export function useUnitAvailability() {
  const { rosterId, detachments, composition } = useRosterStore();
  const { data: allDetachments = [] } = useDetachments();

  // Set of detachment template IDs already in the roster
  const addedDetachmentIds = useMemo(
    () => new Set(detachments.map((d) => d.detachmentId)),
    [detachments],
  );

  const getAvailability = useCallback(
    (unitType: string, unitName?: string, unitId?: number, constraints?: UnitConstraint[] | null): AvailabilityInfo => {
      const empty: AvailabilityInfo = {
        status: 'no_roster',
        openDetachments: [],
        fullDetachments: [],
        unlockableDetachments: [],
      };

      if (!rosterId) return empty;

      // Check roster-wide unique limits
      if (constraints && unitId != null) {
        for (const c of constraints) {
          if (c.scope === 'roster' && c.type === 'max') {
            const rosterCount = detachments.reduce(
              (sum, d) => sum + d.entries.filter((e) => e.unitId === unitId).length,
              0,
            );
            if (rosterCount >= c.value) {
              return {
                ...empty,
                status: 'roster_limit',
                rosterLimitMessage: `${unitName ?? 'Unit'} limited to ${c.value} per roster`,
              };
            }
          }
        }
      }

      if (detachments.length === 0) {
        // Roster exists but no detachments — find which templates have this slot
        const unlockable = allDetachments.filter(
          (d) => d.constraints[unitType] != null && canAffordDetachment(d),
        );
        return { ...empty, status: 'no_detachment', unlockableDetachments: unlockable };
      }

      const open: RosterDetachment[] = [];
      const full: RosterDetachment[] = [];

      for (const det of detachments) {
        const slot = det.slots[unitType];
        if (!slot) continue;

        // Check unit restriction match
        if (unitName && slot.restriction && !matchesRestriction(unitName, slot.restriction)) {
          continue; // This slot doesn't allow this unit
        }

        // Sum quantities instead of counting entries
        const filledCount = det.entries
          .filter((e) => e.category === unitType)
          .reduce((sum, e) => sum + e.quantity, 0);
        if (filledCount < slot.max) {
          open.push(det);
        } else {
          full.push(det);
        }
      }

      // Detachments not yet in roster that have this slot and are within budget
      const unlockable = allDetachments.filter(
        (d) => d.constraints[unitType] != null && !addedDetachmentIds.has(d.id) && canAffordDetachment(d),
      );

      if (open.length > 0) {
        return { status: 'addable', openDetachments: open, fullDetachments: full, unlockableDetachments: unlockable };
      }
      if (full.length > 0) {
        return { status: 'slot_full', openDetachments: [], fullDetachments: full, unlockableDetachments: unlockable };
      }
      return { status: 'no_slot', openDetachments: [], fullDetachments: [], unlockableDetachments: unlockable };
    },
    [rosterId, detachments, allDetachments, addedDetachmentIds, composition],
  );

  function canAffordDetachment(det: Detachment): boolean {
    const auxCost = det.costs?.auxiliary ?? 0;
    const apexCost = det.costs?.apex ?? 0;

    if (auxCost > 0 && auxCost > composition.auxiliary_budget - composition.auxiliary_used) {
      return false;
    }
    if (apexCost > 0 && apexCost > composition.apex_budget - composition.apex_used) {
      return false;
    }

    // Primary max check
    if (det.type === 'Primary' && !det.name.includes('Warlord') && composition.primary_count >= composition.primary_max) {
      return false;
    }
    if (det.name.includes('Warlord') && (!composition.warlord_available || composition.warlord_count >= 1)) {
      return false;
    }

    return true;
  }

  return getAvailability;
}

/** Mirror of FOCValidator._matches_restriction from the backend. */
function matchesRestriction(unitName: string, restriction: string): boolean {
  let clean = restriction.toLowerCase();
  clean = clean.replace(/ units only/g, '').replace(/ only/g, '');
  const parts = clean.replace(/ or /g, ', ').split(', ').map((p) => p.trim()).filter(Boolean);
  const lower = unitName.toLowerCase();
  return parts.some((part) => lower.includes(part) || part.includes(lower));
}
