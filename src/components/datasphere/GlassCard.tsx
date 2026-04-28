'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glowing';
  gradient?: 'primary' | 'warm' | 'cool' | 'success' | 'danger';
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

const variantStyles = {
  default: 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
  elevated: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/30 dark:border-gray-700/40 shadow-lg',
  glowing: 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 hover:shadow-emerald-500/15 hover:shadow-xl hover:border-emerald-500/30',
};

const glowColors: Record<string, string> = {
  primary: 'hover:shadow-emerald-500/15',
  warm: 'hover:shadow-amber-500/15',
  cool: 'hover:shadow-blue-500/15',
  success: 'hover:shadow-green-500/15',
  danger: 'hover:shadow-red-500/15',
};

export default function GlassCard({
  children,
  variant = 'default',
  gradient = 'primary',
  className,
  onClick,
  animate = true,
}: GlassCardProps) {
  const baseStyles = variantStyles[variant];
  const glowStyle = variant === 'glowing' ? glowColors[gradient] : '';

  const content = (
    <div
      className={cn(
        'rounded-xl transition-all duration-300',
        baseStyles,
        glowStyle,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
