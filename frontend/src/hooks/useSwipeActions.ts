/**
 * Swipe gesture hook for revealing action buttons on mobile.
 * Swipe left → reveal right actions (remove)
 * Swipe right → reveal left actions (duplicate)
 */
import { useState, useRef, useCallback } from 'react';

interface SwipeConfig {
  /** Minimum horizontal distance to trigger reveal (px) */
  threshold?: number;
  /** Whether swipe is enabled */
  enabled?: boolean;
}

export function useSwipeActions({ threshold = 60, enabled = true }: SwipeConfig = {}) {
  const [revealedSide, setRevealedSide] = useState<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const [offset, setOffset] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // If vertical movement is greater, don't interfere with scrolling
    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) > 10) {
      swiping.current = true;
    }

    if (swiping.current) {
      // Clamp offset with rubber-band effect
      const maxOffset = 80;
      const clampedDx = Math.sign(dx) * Math.min(Math.abs(dx), maxOffset + Math.abs(dx - maxOffset) * 0.2);
      setOffset(clampedDx);
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !swiping.current) {
      setOffset(0);
      return;
    }

    if (offset < -threshold) {
      // Swiped left → reveal right actions
      setRevealedSide('right');
      setOffset(-70);
    } else if (offset > threshold) {
      // Swiped right → reveal left actions
      setRevealedSide('left');
      setOffset(70);
    } else {
      setRevealedSide(null);
      setOffset(0);
    }
    swiping.current = false;
  }, [enabled, offset, threshold]);

  const dismiss = useCallback(() => {
    setRevealedSide(null);
    setOffset(0);
  }, []);

  return {
    revealedSide,
    offset,
    dismiss,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
