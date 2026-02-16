import { useEffect, useCallback } from 'react';
import { useRosterStore } from '../stores/rosterStore.ts';
import { useUIStore } from '../stores/uiStore.ts';
import client from '../api/client.ts';

/**
 * Global undo/redo handler. Listens for Cmd+Z / Cmd+Shift+Z and
 * replays/reverses recorded roster mutations via the API.
 */
export function useUndoRedo() {
  const addToast = useUIStore((s) => s.addToast);

  const undo = useCallback(async () => {
    const action = useUIStore.getState().popUndo();
    if (!action) return;

    const rosterId = useRosterStore.getState().rosterId;
    if (!rosterId) return;

    try {
      const p = action.payload;
      switch (action.type) {
        case 'add_entry':
          await client.delete(`/api/rosters/${rosterId}/detachments/${p.detachmentId}/entries/${p.entryId}`);
          break;
        case 'remove_entry':
          await client.post(`/api/rosters/${rosterId}/detachments/${p.detachmentId}/entries`, {
            unit_id: p.unitId, quantity: p.quantity, upgrades: p.upgrades,
          });
          break;
        case 'add_detachment':
          await client.delete(`/api/rosters/${rosterId}/detachments/${p.rosterDetachmentId}`);
          break;
        case 'remove_detachment':
          await client.post(`/api/rosters/${rosterId}/detachments`, {
            detachment_id: p.detachmentId, detachment_type: p.detachmentType,
          });
          break;
        case 'update_quantity':
          await client.patch(`/api/rosters/${rosterId}/detachments/${p.detachmentId}/entries/${p.entryId}`, {
            quantity: p.previousQuantity,
          });
          break;
      }

      const { data } = await client.get(`/api/rosters/${rosterId}`);
      useRosterStore.getState().syncFromResponse(data);
      useUIStore.getState().pushRedo(action);
      addToast(`Undo: ${action.description}`);
    } catch {
      addToast('Failed to undo', 'error');
      useUIStore.getState().pushUndo(action); // restore
    }
  }, [addToast]);

  const redo = useCallback(async () => {
    const action = useUIStore.getState().popRedo();
    if (!action) return;

    const rosterId = useRosterStore.getState().rosterId;
    if (!rosterId) return;

    try {
      const p = action.payload;
      switch (action.type) {
        case 'add_entry':
          await client.post(`/api/rosters/${rosterId}/detachments/${p.detachmentId}/entries`, {
            unit_id: p.unitId, quantity: p.quantity, upgrades: p.upgrades,
          });
          break;
        case 'remove_entry':
          await client.delete(`/api/rosters/${rosterId}/detachments/${p.detachmentId}/entries/${p.entryId}`);
          break;
        case 'add_detachment':
          await client.post(`/api/rosters/${rosterId}/detachments`, {
            detachment_id: p.detachmentId, detachment_type: p.detachmentType,
          });
          break;
        case 'remove_detachment':
          await client.delete(`/api/rosters/${rosterId}/detachments/${p.rosterDetachmentId}`);
          break;
        case 'update_quantity':
          await client.patch(`/api/rosters/${rosterId}/detachments/${p.detachmentId}/entries/${p.entryId}`, {
            quantity: p.newQuantity,
          });
          break;
      }

      const { data } = await client.get(`/api/rosters/${rosterId}`);
      useRosterStore.getState().syncFromResponse(data);
      useUIStore.getState().pushUndo(action);
      addToast(`Redo: ${action.description}`);
    } catch {
      addToast('Failed to redo', 'error');
      useUIStore.getState().pushRedo(action); // restore
    }
  }, [addToast]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);
}
