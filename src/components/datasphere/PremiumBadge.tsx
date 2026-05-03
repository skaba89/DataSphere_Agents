'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface PremiumBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'live';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 dark:from-gray-800 dark:to-gray-700 dark:text-gray-300',
  success: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-900/60 dark:to-teal-900/60 dark:text-emerald-400',
  warning: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 dark:from-amber-900/60 dark:to-orange-900/60 dark:text-amber-400',
  danger: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 dark:from-red-900/60 dark:to-rose-900/60 dark:text-red-400',
  info: 'bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 dark:from-cyan-900/60 dark:to-blue-900/60 dark:text-cyan-400',
  live: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/25',
};

const sizeStyles: Record<string, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
  lg: 'text-sm px-3 py-1 gap-1.5',
};

const iconSizes: Record<string, string> = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
};

export default function PremiumBadge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  pulse = false,
  className,
}: PremiumBadgeProps) {
  const isLive = variant === 'live' || pulse;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      )}
      {Icon && !isLive && <Icon className={iconSizes[size]} />}
      {children}
    </motion.span>
  );
}
