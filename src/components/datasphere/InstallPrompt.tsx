'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  // Detect iOS once using useMemo (not in an effect)
  const isIOS = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  }, []);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('ds_install_dismissed');
    if (dismissed) return;

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    if (isIOS) {
      // iOS doesn't support beforeinstallprompt, show manual hint
      const timer = setTimeout(() => {
        const iosDismissed = localStorage.getItem('ds_ios_install_dismissed');
        if (!iosDismissed) {
          setShowIOSHint(true);
          setShowPrompt(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after a short delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isIOS]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        // Successfully installed
      }
    } catch (_e) {
      // Prompt failed
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ds_install_dismissed', 'true');
    if (isIOS) {
      localStorage.setItem('ds_ios_install_dismissed', 'true');
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[100] p-3"
        >
          <div className="max-w-lg mx-auto">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-emerald-500/20 rounded-xl shadow-lg shadow-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  {isIOS ? (
                    <Smartphone className="w-5 h-5 text-white" />
                  ) : (
                    <Download className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">Installer DataSphere sur votre appareil</h3>
                  {isIOS && showIOSHint ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Appuyez sur <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-current text-[10px] font-bold mx-0.5">↑</span> puis &quot;Sur l&apos;écran d&apos;accueil&quot;
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Accédez rapidement à vos agents IA depuis votre écran d&apos;accueil
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isIOS && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm"
                      onClick={handleInstall}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Installer
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={handleDismiss}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
