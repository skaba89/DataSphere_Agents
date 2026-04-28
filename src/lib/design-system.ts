// Premium Design Tokens for DataSphere
// A comprehensive design system with glassmorphism, gradients, and micro-interactions

export const glassStyles = {
  card: 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
  sidebar: 'bg-white/40 dark:bg-gray-950/60 backdrop-blur-2xl border-r border-white/10 dark:border-gray-800/30',
  input: 'bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-white/30 dark:border-gray-600/30',
  overlay: 'bg-black/20 backdrop-blur-sm',
  header: 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-800/30',
  panel: 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg border border-white/15 dark:border-gray-700/25',
};

export const gradientPresets = {
  primary: 'from-emerald-500 via-teal-500 to-cyan-500',
  warm: 'from-amber-500 via-orange-500 to-rose-500',
  cool: 'from-blue-500 via-indigo-500 to-purple-500',
  success: 'from-green-400 via-emerald-500 to-teal-500',
  danger: 'from-red-500 via-rose-500 to-pink-500',
  sunset: 'from-orange-400 via-pink-500 to-purple-500',
  ocean: 'from-cyan-400 via-blue-500 to-indigo-500',
  forest: 'from-green-400 via-emerald-500 to-teal-600',
};

export const microInteractions = {
  hover: 'hover:scale-[1.02] hover:shadow-lg transition-all duration-200',
  press: 'active:scale-[0.98] transition-transform duration-100',
  focus: 'focus:ring-2 focus:ring-emerald-500/50 focus:outline-none',
  cardHover: 'hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300',
  glowHover: 'hover:shadow-emerald-500/20 hover:shadow-lg transition-shadow duration-300',
  slideUp: 'hover:-translate-y-1 transition-transform duration-200',
};

export const animationDelays = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.2,
  stagger: (index: number) => index * 0.05,
};

export const shadowPresets = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  glow: 'shadow-emerald-500/20 shadow-lg',
  glowStrong: 'shadow-emerald-500/30 shadow-xl',
  card: 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_20px_rgba(16,185,129,0.05)]',
  cardDark: 'dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_20px_rgba(16,185,129,0.03)]',
};

export const gradientText = {
  primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent',
  warm: 'bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent',
  cool: 'bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent',
};

export const borderGradients = {
  primary: 'before:bg-gradient-to-r before:from-emerald-500 before:via-teal-500 before:to-cyan-500',
  warm: 'before:bg-gradient-to-r before:from-amber-500 before:via-orange-500 before:to-rose-500',
  cool: 'before:bg-gradient-to-r before:from-blue-500 before:via-indigo-500 before:to-purple-500',
};
