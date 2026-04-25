'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquare,
  Globe,
  Menu,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'webbuilder', label: 'Web Builder', icon: Globe },
];

export default function MobileNav() {
  const { currentView, setCurrentView, setSidebarOpen } = useAppStore();

  const handleMore = () => {
    setSidebarOpen(true);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-card/95 backdrop-blur-lg safe-area-bottom" aria-label="Navigation mobile">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                // Haptic-style feedback via Vibration API if available
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(5);
                }
              }}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative active:scale-90 transition-transform duration-150"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active background pill */}
              {isActive && (
                <motion.div
                  layoutId="mobilenav-bg"
                  className="absolute inset-x-2 inset-y-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {/* Active top indicator */}
              {isActive && (
                <motion.div
                  layoutId="mobilenav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-emerald-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={`h-5 w-5 transition-colors duration-200 relative z-10 ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`text-[10px] transition-colors duration-200 relative z-10 ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-muted-foreground font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => {
            handleMore();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(5);
            }
          }}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative active:scale-90 transition-transform duration-150"
          aria-label="Plus d'options"
        >
          {/* Background for "more" when a sub-view is active */}
          {['agents', 'marketplace', 'documents', 'payments', 'settings', 'templates', 'comparison', 'admin', 'billing'].includes(currentView) && (
            <motion.div
              layoutId="mobilenav-bg-more"
              className="absolute inset-x-2 inset-y-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          {['agents', 'marketplace', 'documents', 'payments', 'settings', 'templates', 'comparison', 'admin', 'billing'].includes(currentView) && (
            <motion.div
              layoutId="mobilenav-indicator-more"
              className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-emerald-500 rounded-full"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <Menu
            className={`h-5 w-5 transition-colors duration-200 relative z-10 ${
              ['agents', 'marketplace', 'documents', 'payments', 'settings', 'templates', 'comparison', 'admin', 'billing'].includes(currentView)
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            }`}
          />
          <span
            className={`text-[10px] transition-colors duration-200 relative z-10 ${
              ['agents', 'marketplace', 'documents', 'payments', 'settings', 'templates', 'comparison', 'admin', 'billing'].includes(currentView)
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground font-medium'
            }`}
          >
            Plus
          </span>
        </button>
      </div>
    </nav>
  );
}
