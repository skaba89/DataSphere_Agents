'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Keyboard,
  Search,
  MessageSquarePlus,
  PanelLeftClose,
  LayoutDashboard,
  Bot,
  MessageSquare,
  FileText,
  Globe,
  CreditCard,
  Store,
  Crown,
  Settings,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface KeyboardShortcutsProps {
  onOpenSearch: () => void;
}

const viewShortcuts: Array<{
  key: string;
  label: string;
  view: string;
  icon: React.ElementType;
}> = [
  { key: '1', label: 'Tableau de bord', view: 'dashboard', icon: LayoutDashboard },
  { key: '2', label: 'Agents IA', view: 'agents', icon: Bot },
  { key: '3', label: 'Chat', view: 'chat', icon: MessageSquare },
  { key: '4', label: 'Documents', view: 'documents', icon: FileText },
  { key: '5', label: 'Web Builder', view: 'webbuilder', icon: Globe },
  { key: '6', label: 'Paiements', view: 'payments', icon: CreditCard },
  { key: '7', label: 'Marketplace', view: 'marketplace', icon: Store },
  { key: '8', label: 'Abonnement', view: 'billing', icon: Crown },
  { key: '9', label: 'Paramètres', view: 'settings', icon: Settings },
];

const globalShortcuts: Array<{
  keys: string;
  label: string;
  icon: React.ElementType;
}> = [
  { keys: 'Ctrl+K', label: 'Ouvrir la recherche', icon: Search },
  { keys: 'Ctrl+N', label: 'Nouvelle conversation', icon: MessageSquarePlus },
  { keys: 'Ctrl+J', label: 'Basculer la barre latérale', icon: PanelLeftClose },
  { keys: 'Ctrl+/', label: 'Afficher les raccourcis', icon: Keyboard },
  { keys: 'Échap', label: 'Fermer les dialogues', icon: X },
];

export default function KeyboardShortcuts({ onOpenSearch }: KeyboardShortcutsProps) {
  const { user, setCurrentView, setSelectedAgentId, setSidebarOpen, sidebarOpen } = useAppStore();
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle shortcuts when user is logged in
      if (!user) return;

      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + K: Open search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
        return;
      }

      // Ctrl/Cmd + N: New conversation
      if (isMod && e.key === 'n') {
        e.preventDefault();
        setSelectedAgentId(null);
        setCurrentView('chat');
        return;
      }

      // Ctrl/Cmd + J: Toggle sidebar
      if (isMod && e.key === 'j') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
        return;
      }

      // Ctrl/Cmd + /: Show shortcuts help
      if (isMod && e.key === '/') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Ctrl/Cmd + 1-9: Switch views
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (viewShortcuts[index]) {
          setCurrentView(viewShortcuts[index].view);
        }
        return;
      }

      // Escape: Close dialogs
      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
        }
      }
    },
    [user, onOpenSearch, setCurrentView, setSelectedAgentId, setSidebarOpen, sidebarOpen, showHelp]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-emerald-500" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Utilisez ces raccourcis pour naviguer rapidement dans DataSphere
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Global shortcuts */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Généraux
            </p>
            <div className="space-y-1.5">
              {globalShortcuts.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2">
                    <shortcut.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{shortcut.label}</span>
                  </div>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono text-muted-foreground">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* View shortcuts */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Navigation
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {viewShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2">
                    <shortcut.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{shortcut.label}</span>
                  </div>
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono text-muted-foreground">
                    Ctrl+{shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
