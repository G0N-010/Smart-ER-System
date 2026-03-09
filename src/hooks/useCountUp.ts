// useCountUp — Counts up a number with easing when element scrolls into viewport
// Uses Intersection Observer for scroll-triggered activation
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number;       // animation duration in ms (default: 1500)
  delay?: number;          // delay before starting in ms (default: 0)
  decimals?: number;       // decimal places (default: 0)
  startOnMount?: boolean;  // start immediately without waiting for viewport (default: false)
  easing?: 'easeOut' | 'easeInOut' | 'linear'; // easing function
}

// Easing functions for smooth count-up
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function linear(t: number): number {
  return t;
}

export function useCountUp({
  end,
  duration = 1500,
  delay = 0,
  decimals = 0,
  startOnMount = false,
  easing = 'easeOut',
}: UseCountUpOptions) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const easingFn = easing === 'easeOut' ? easeOutCubic : easing === 'easeInOut' ? easeInOutCubic : linear;

  const startAnimation = useCallback(() => {
    if (hasStarted) return;
    setHasStarted(true);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current - delay;
      
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);
      const currentValue = easedProgress * end;

      setCount(Number(currentValue.toFixed(decimals)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [end, duration, delay, decimals, easingFn, hasStarted]);

  // Intersection Observer — triggers count-up when element enters viewport
  useEffect(() => {
    if (startOnMount) {
      setTimeout(startAnimation, 0); // delay to avoid setting state during mount cascade
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            startAnimation();
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of element is visible
        rootMargin: '0px 0px -50px 0px', // Slight offset for better UX
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startOnMount, startAnimation, hasStarted]);

  // Reset when end value changes (new simulation)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasStarted(false);
    setCount(0);
    startTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [end]);

  return { count, ref, hasStarted };
}
