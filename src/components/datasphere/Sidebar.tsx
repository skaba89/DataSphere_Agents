'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Globe,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'agents', label: 'Agents IA', icon: Bot },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'webbuilder', label: 'Web Builder', icon: Globe },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export default function Sidebar() {
  const {
    user,
    currentView,
    setCurrentView,
    sidebarOpen,
    setSidebarOpen,
    logout,
  } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={`fixed lg:relative z-40 h-screen bg-card border-r flex flex-col overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 min-h-[64px]">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h2 className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  DataSphere
                </h2>
                <p className="text-[10px] text-muted-foreground -mt-1">Agents IA Premium</p>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto flex-shrink-0 hidden lg:flex h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        <Separator />

        {/* User section */}
        <div className="p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-medium truncate">{user?.name || 'Utilisateur'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={logout}
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile toggle button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 lg:hidden h-10 w-10 rounded-xl bg-card border shadow-lg flex items-center justify-center"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
