'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
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

function AppContent() {
  const { user, currentView, setSidebarOpen } = useAppStore();

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
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
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
    </div>
  );
}

export default function Home() {
  const { setAuth, hydrated, setHydrated, setSelectedProvider } = useAppStore();

  useEffect(() => {
    // Restore auth from localStorage after mount
    const token = localStorage.getItem('ds_token');
    const userStr = localStorage.getItem('ds_user');
    const savedProvider = localStorage.getItem('ds_provider');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuth(user, token);
      } catch {
        localStorage.removeItem('ds_token');
        localStorage.removeItem('ds_user');
      }
    }
    if (savedProvider) {
      setSelectedProvider(savedProvider);
    }
    setHydrated(true);
  }, [setAuth, setHydrated, setSelectedProvider]);

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
