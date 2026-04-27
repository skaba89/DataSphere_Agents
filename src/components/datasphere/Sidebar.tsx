'use client';

import { useEffect, useState } from 'react';
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
  Bell,
  Store,
  BellRing,
  Crown,
  Shield,
  LayoutTemplate,
  GitCompare,
  BarChart3,
  Building2,
  Wand2,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const navItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, badge: 0 },
  { id: 'agents', label: 'Agents IA', icon: Bot, badge: 0 },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, badge: 0 },
  { id: 'marketplace', label: 'Marketplace', icon: Store, badge: 0 },
  { id: 'chat', label: 'Chat', icon: MessageSquare, badge: 0 },
  { id: 'comparison', label: 'Comparaison IA', icon: GitCompare, badge: 0 },
  { id: 'prompt-generator', label: 'Prompt Generator', icon: Wand2, badge: 0 },
  { id: 'webbuilder', label: 'Web Builder', icon: Globe, badge: 0 },
  { id: 'saas-generator', label: 'SaaS Generator', icon: Rocket, badge: 0 },
  { id: 'documents', label: 'Documents', icon: FileText, badge: 0 },
  { id: 'organizations', label: 'Organisations', icon: Building2, badge: 0 },
  { id: 'billing', label: 'Abonnement', icon: Crown, badge: 0 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: 0 },
  { id: 'payments', label: 'Paiements', icon: CreditCard, badge: 0 },
  { id: 'admin', label: 'Administration', icon: Shield, badge: 0, adminOnly: true },
  { id: 'settings', label: 'Paramètres', icon: Settings, badge: 0 },
];

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay < 7) return `Il y a ${diffDay}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function Sidebar() {
  const {
    user,
    token,
    currentView,
    setCurrentView,
    sidebarOpen,
    setSidebarOpen,
    logout,
  } = useAppStore();

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active && res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (_e) {
        // silent
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token]);

  // Mark all as read
  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (_e) {
      // silent
    }
  };

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
        {/* Gradient line at top */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 flex-shrink-0" />

        {/* Subtle gradient overlay */}
        <div className="absolute top-1 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 p-4 min-h-[64px] relative">
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
                className="overflow-hidden whitespace-nowrap flex-1"
              >
                <h2 className="font-bold text-lg gradient-text">
                  DataSphere
                </h2>
                <p className="text-[10px] text-muted-foreground -mt-1">Agents IA Premium</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification Bell */}
          {sidebarOpen && (
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8 relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                <div className="flex items-center justify-between p-3 border-b">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <BellRing className="h-3.5 w-3.5 text-emerald-500" />
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-emerald-600" onClick={markAllRead}>
                      Tout marquer lu
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Aucune notification</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Vos alertes apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 transition-colors hover:bg-accent/50 ${
                            !notif.read ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            )}
                            <div className={!notif.read ? '' : 'ml-4'}>
                              <p className="text-sm font-medium leading-tight">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-1">{formatTimeAgo(notif.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}

          {/* Unread dot indicator when sidebar collapsed */}
          {!sidebarOpen && unreadCount > 0 && (
            <span className="absolute top-3 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          )}

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
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto relative">
          {navItems.map((item) => {
            // Only show admin item to admins/super_admins
            if (item.adminOnly && user?.role !== 'admin' && user?.role !== 'super_admin') return null;

            const isActive = currentView === item.id;
            const Icon = item.icon;
            const navButton = (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full shadow-sm shadow-emerald-500/50"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-emerald-600 dark:text-emerald-400' : 'group-hover:text-emerald-500'
                    }`}
                  />
                  {isActive && (
                    <div className="absolute -inset-1 bg-emerald-500/10 rounded-lg" />
                  )}
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1 text-left"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {sidebarOpen && item.badge > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 min-w-5 flex items-center justify-center bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );

            // When sidebar is collapsed, wrap with tooltip
            if (!sidebarOpen) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {navButton}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navButton;
          })}
        </nav>

        <Separator />

        {/* User section */}
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="h-9 w-9 ring-2 ring-emerald-500/20">
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Animated online status dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card status-dot" />
            </div>
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
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">En ligne</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Déconnexion</TooltipContent>
              </Tooltip>
            )}
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
