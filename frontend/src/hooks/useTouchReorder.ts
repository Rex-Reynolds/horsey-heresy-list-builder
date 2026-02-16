import { useRef, useCallback, useEffect } from 'react';

interface UseTouchReorderOptions {
  enabled: boolean;
  onReorder: (fromId: number, toId: number) => void;
}

/**
 * Touch-based drag and drop reorder hook for mobile.
 * Uses long-press (300ms) to initiate drag, document.elementFromPoint
 * to find drop target via data-entry-id attribute.
 */
export function useTouchReorder({ enabled, onReorder }: UseTouchReorderOptions) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const dragging = useRef(false);
  const dragId = useRef<number | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const currentOverId = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Remove visual feedback
    if (dragId.current !== null) {
      const el = document.querySelector(`[data-entry-id="${dragId.current}"]`);
      if (el) el.classList.remove('touch-dragging');
    }
    if (currentOverId.current !== null) {
      const el = document.querySelector(`[data-entry-id="${currentOverId.current}"]`);
      if (el) el.classList.remove('touch-drag-over');
    }
    dragging.current = false;
    dragId.current = null;
    currentOverId.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };

    // Find the entry id from the closest data-entry-id element
    const target = e.target as HTMLElement;
    const entryEl = target.closest('[data-entry-id]');
    if (!entryEl) return;

    const entryId = Number(entryEl.getAttribute('data-entry-id'));
    if (isNaN(entryId)) return;

    // Start long-press timer
    longPressTimer.current = setTimeout(() => {
      dragging.current = true;
      dragId.current = entryId;
      entryEl.classList.add('touch-dragging');

      // Haptic feedback
      try { navigator.vibrate?.(30); } catch { /* unsupported */ }
    }, 300);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];

    // Cancel long-press if finger moved >10px before threshold
    if (!dragging.current && longPressTimer.current) {
      const dx = touch.clientX - startPos.current.x;
      const dy = touch.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        return;
      }
    }

    if (!dragging.current) return;

    e.preventDefault();

    // Find element under finger
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;

    const entryEl = (el as HTMLElement).closest?.('[data-entry-id]');
    const overId = entryEl ? Number(entryEl.getAttribute('data-entry-id')) : null;

    // Update drag-over visual
    if (overId !== currentOverId.current) {
      if (currentOverId.current !== null) {
        const prev = document.querySelector(`[data-entry-id="${currentOverId.current}"]`);
        if (prev) prev.classList.remove('touch-drag-over');
      }
      if (overId !== null && overId !== dragId.current) {
        const next = document.querySelector(`[data-entry-id="${overId}"]`);
        if (next) next.classList.add('touch-drag-over');
      }
      currentOverId.current = overId;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragging.current && dragId.current !== null && currentOverId.current !== null && dragId.current !== currentOverId.current) {
      onReorder(dragId.current, currentOverId.current);
    }
    cleanup();
  }, [onReorder, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
