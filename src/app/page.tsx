'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { registerLogoutCallback } from '@/lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import LoginView from '@/components/datasphere/LoginView';
import Sidebar from '@/components/datasphere/Sidebar';
import DashboardView from '@/components/datasphere/DashboardView';
import AgentsView from '@/components/datasphere/AgentsView';
import ChatView from '@/components/datasphere/ChatView';
import DocumentsView from '@/components/datasphere/DocumentsView';
import PaymentsView from '@/components/datasphere/PaymentsView';
import SettingsView from '@/components/datasphere/SettingsView';
import WebBuilderView from '@/components/datasphere/WebBuilderView';
import MarketplaceView from '@/components/datasphere/MarketplaceView';
import MobileNav from '@/components/datasphere/MobileNav';

function AppContent() {
  const { user, currentView, setSidebarOpen, token, setAgents, logout } = useAppStore();

  // Register the global logout callback for apiFetch
  useEffect(() => {
    registerLogoutCallback(logout);
  }, [logout]);

  // Auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  // Load agents when token changes
  useEffect(() => {
    if (!token) return;
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.agents) setAgents(data.agents);
        }
      } catch {
        // silent
      }
    };
    fetchAgents();
  }, [token, setAgents, logout]);

  if (!user) {
    return <LoginView />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'agents':
        return <AgentsView />;
      case 'chat':
        return <ChatView />;
      case 'webbuilder':
        return <WebBuilderView />;
      case 'documents':
        return <DocumentsView />;
      case 'payments':
        return <PaymentsView />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-14 lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <MobileNav />
    </div>
  );
}

export default function Home() {
  const { setAuth, hydrated, setHydrated, setSelectedProvider, logout } = useAppStore();

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('ds_token');
      const userStr = localStorage.getItem('ds_user');
      const savedProvider = localStorage.getItem('ds_provider');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);

          // Validate the token BEFORE restoring auth
          try {
            const res = await fetch('/api/agents', {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
              // Token is invalid — clear storage and skip auth restore
              localStorage.removeItem('ds_token');
              localStorage.removeItem('ds_user');
              localStorage.removeItem('ds_provider');
            } else {
              // Token is valid — restore auth
              setAuth(user, token);

              // Also load agents from the validated response
              if (res.ok) {
                const data = await res.json();
                if (data.agents) {
                  const { setAgents } = useAppStore.getState();
                  setAgents(data.agents);
                }
              }
            }
          } catch {
            // Network error — still restore auth (might be temporary)
            setAuth(user, token);
          }
        } catch {
          localStorage.removeItem('ds_token');
          localStorage.removeItem('ds_user');
        }
      }

      if (savedProvider) {
        setSelectedProvider(savedProvider);
      }
      setHydrated(true);
    };

    init();
  }, [setAuth, setHydrated, setSelectedProvider, logout]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950 dark:via-gray-950 dark:to-teal-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Chargement de DataSphere...</p>
        </motion.div>
      </div>
    );
  }

  return <AppContent />;
}
