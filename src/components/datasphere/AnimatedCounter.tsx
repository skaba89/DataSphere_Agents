'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  target: number;
  duration?: number; // in ms
  format?: 'number' | 'percentage' | 'currency';
  currency?: string;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedCounter({
  target,
  duration = 1500,
  format = 'number',
  currency = 'GNF',
  decimals = 0,
  className,
  prefix,
  suffix,
}: AnimatedCounterProps) {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    // Only reset if target actually changed
    if (prevTargetRef.current !== target) {
      prevTargetRef.current = target;
      startTimeRef.current = null;
      // Reset current to 0 in the animation start instead of synchronously
    }

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    let startValue = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        startValue = 0;
        setCurrent(0);
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      setCurrent(easedProgress * target);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, duration]);

  const formatValue = (value: number): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(decimals)}%`;
      case 'currency':
        return `${Math.round(value).toLocaleString('fr-FR')} ${currency}`;
      case 'number':
      default:
        if (decimals > 0) {
          return value.toFixed(decimals);
        }
        return Math.round(value).toLocaleString('fr-FR');
    }
  };

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}{formatValue(current)}{suffix}
    </span>
  );
}
