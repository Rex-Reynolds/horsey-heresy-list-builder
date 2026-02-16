import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  className?: string;
  duration?: number;
}

/**
 * Odometer-style rolling number animation.
 * Smoothly counts up/down from the previous value to the new one.
 */
export default function AnimatedNumber({ value, className = '', duration = 400 }: Props) {
  const [display, setDisplay] = useState(value);
  const animRef = useRef<number | null>(null);
  const startRef = useRef(value);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
    }

    const from = display;
    const to = value;
    if (from === to) return;

    startRef.current = from;
    startTimeRef.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startRef.current + (to - startRef.current) * eased);

      setDisplay(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
      }
    }

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [value, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span className={className}>{display}</span>;
}
