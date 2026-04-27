'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Webhook,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Send,
  ChevronLeft,
  Link,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Loader2,
  Copy,
  Power,
  PowerOff,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Types ──────────────────────────────────────────────────────
interface WebhookDelivery {
  id: string;
  event: string;
  payload: string;
  statusCode: number | null;
  response: string | null;
  success: boolean;
  createdAt: string;
}

interface WebhookItem {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt: string | null;
  failureCount: number;
  totalDeliveries: number;
  successCount: number;
  failCount: number;
  recentDeliveries: WebhookDelivery[];
}

// ─── Event config ───────────────────────────────────────────────
const EVENT_CATEGORIES: Record<string, { label: string; events: { id: string; label: string }[] }> = {
  chat: {
    label: 'Chat',
    events: [
      { id: 'chat.message_created', label: 'Message créé' },
      { id: 'chat.conversation_created', label: 'Conversation créée' },
    ],
  },
  agent: {
    label: 'Agents',
    events: [
      { id: 'agent.created', label: 'Agent créé' },
      { id: 'agent.deleted', label: 'Agent supprimé' },
    ],
  },
  marketplace: {
    label: 'Marketplace',
    events: [
      { id: 'marketplace.agent_published', label: 'Agent publié' },
      { id: 'marketplace.agent_installed', label: 'Agent installé' },
    ],
  },
  billing: {
    label: 'Facturation',
    events: [
      { id: 'billing.subscription_created', label: 'Abonnement créé' },
      { id: 'billing.subscription_updated', label: 'Abonnement mis à jour' },
      { id: 'billing.invoice_paid', label: 'Facture payée' },
      { id: 'billing.invoice_failed', label: 'Facture échouée' },
    ],
  },
  user: {
    label: 'Utilisateur',
    events: [
      { id: 'user.registered', label: 'Utilisateur inscrit' },
    ],
  },
  organization: {
    label: 'Organisation',
    events: [
      { id: 'organization.member_invited', label: 'Membre invité' },
    ],
  },
  document: {
    label: 'Documents',
    events: [
      { id: 'document.uploaded', label: 'Document téléchargé' },
    ],
  },
};

function getEventCategoryColor(event: string): string {
  if (event.startsWith('chat.')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
  if (event.startsWith('agent.')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400';
  if (event.startsWith('marketplace.')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
  if (event.startsWith('billing.')) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
  if (event.startsWith('user.')) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400';
  if (event.startsWith('organization.')) return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400';
  if (event.startsWith('document.')) return 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400';
  if (event === 'test.delivery') return 'bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-400';
}

function getEventLabel(event: string): string {
  for (const cat of Object.values(EVENT_CATEGORIES)) {
    const found = cat.events.find((e) => e.id === event);
    if (found) return found.label;
  }
  if (event === 'test.delivery') return 'Test';
  return event;
}

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return `${parsed.protocol}//${host}/…`;
    return `${parsed.protocol}//${host}/…${pathParts[pathParts.length - 1]}`;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '…' : url;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay < 7) return `Il y a ${diffDay}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Skeleton ───────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-48 rounded bg-muted skeleton" />
            <div className="h-6 w-16 rounded-full bg-muted skeleton" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-muted skeleton" />
            <div className="h-5 w-20 rounded-full bg-muted skeleton" />
            <div className="h-5 w-16 rounded-full bg-muted skeleton" />
          </div>
          <div className="h-3 w-32 rounded bg-muted skeleton" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function WebhooksView() {
  const { token, logout } = useAppStore();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // Create form state
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      } else {
        toast.error('Erreur lors du chargement des webhooks');
      }
    } catch (_e) {
      toast.error('Erreur lors du chargement des webhooks');
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  const fetchWebhookDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedWebhook(data.webhook);
      }
    } catch (_e) {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newUrl.trim()) {
      toast.error('Veuillez entrer une URL');
      return;
    }
    if (newEvents.length === 0) {
      toast.error('Veuillez sélectionner au moins un événement');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Webhook créé avec succès', {
          description: 'Conservez votre secret en lieu sûr, il ne sera plus affiché.',
        });
        setShowCreateDialog(false);
        setNewUrl('');
        setNewEvents([]);
        fetchWebhooks();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erreur lors de la création');
      }
    } catch (_e) {
      toast.error('Erreur lors de la création du webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Webhook supprimé avec succès');
        setSelectedWebhook(null);
        fetchWebhooks();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (_e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    setToggling(id);
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        toast.success(isActive ? 'Webhook désactivé' : 'Webhook activé');
        fetchWebhooks();
        if (selectedWebhook?.id === id) {
          fetchWebhookDetail(id);
        }
      } else {
        toast.error('Erreur lors de la modification');
      }
    } catch (_e) {
      toast.error('Erreur lors de la modification');
    } finally {
      setToggling(null);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(true);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success('Test envoyé avec succès');
        } else {
          toast.error('Le test a échoué', {
            description: 'Vérifiez l\'URL et la disponibilité du serveur',
          });
        }
        if (selectedWebhook?.id === id) {
          fetchWebhookDetail(id);
        }
        fetchWebhooks();
      } else {
        toast.error('Erreur lors de l\'envoi du test');
      }
    } catch (_e) {
      toast.error('Erreur lors de l\'envoi du test');
    } finally {
      setTesting(false);
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copié dans le presse-papiers');
  };

  const toggleEvent = (eventId: string) => {
    setNewEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  };

  const selectAllCategory = (categoryEvents: string[]) => {
    const allSelected = categoryEvents.every((e) => newEvents.includes(e));
    if (allSelected) {
      setNewEvents((prev) => prev.filter((e) => !categoryEvents.includes(e)));
    } else {
      setNewEvents((prev) => [...new Set([...prev, ...categoryEvents])]);
    }
  };

  // ─── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 rounded bg-muted skeleton mb-2" />
          <div className="h-4 w-64 rounded bg-muted skeleton" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Detail View ──────────────────────────────────────────────
  if (selectedWebhook) {
    const wh = selectedWebhook;
    const successRate = wh.totalDeliveries > 0
      ? Math.round((wh.successCount / wh.totalDeliveries) * 100)
      : 0;

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedWebhook(null)}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour aux webhooks
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Webhook className="h-7 w-7 text-emerald-500" />
                <span className="gradient-text">Détails du Webhook</span>
              </h1>
              <p className="text-muted-foreground mt-1 font-mono text-sm truncate max-w-lg">
                {wh.url}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(wh.id)}
                    disabled={testing}
                    className="gap-1.5"
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Tester
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Envoyer un événement de test</TooltipContent>
              </Tooltip>

              <Button
                variant={wh.isActive ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleToggle(wh.id, wh.isActive)}
                disabled={toggling === wh.id}
                className={`gap-1.5 ${
                  wh.isActive
                    ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/50 dark:hover:text-red-400'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {toggling === wh.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : wh.isActive ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {wh.isActive ? 'Désactiver' : 'Activer'}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/50 dark:text-red-400">
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce webhook ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes les livraisons associées seront également supprimées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(wh.id)}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Details */}
          <div className="lg:col-span-1 space-y-4">
            {/* Status Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Statut
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">État</span>
                    <Badge
                      variant="secondary"
                      className={
                        wh.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                      }
                    >
                      {wh.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  {wh.failureCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Échecs consécutifs</span>
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {wh.failureCount}
                      </span>
                    </div>
                  )}
                  {wh.failureCount >= 10 && (
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Webhook désactivé automatiquement après 10 échecs consécutifs
                      </p>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dernier déclenchement</span>
                    <span className="text-xs text-muted-foreground">
                      {wh.lastTriggeredAt ? formatTimeAgo(wh.lastTriggeredAt) : 'Jamais'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Créé le</span>
                    <span className="text-xs text-muted-foreground">{formatDate(wh.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Statistiques
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total livraisons</span>
                    <span className="text-sm font-semibold">{wh.totalDeliveries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Réussies</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {wh.successCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Échouées</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" />
                      {wh.failCount}
                    </span>
                  </div>
                  {wh.totalDeliveries > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-muted-foreground">Taux de réussite</span>
                          <span className="text-sm font-semibold">{successRate}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${successRate}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              successRate >= 80 ? 'bg-emerald-500' : successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Secret Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Secret de signature
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Utilisé pour vérifier les signatures HMAC-SHA256
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-muted font-mono text-xs overflow-hidden">
                      {showSecret ? wh.secret : '••••••••••••••••••••••••••••••••'}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{showSecret ? 'Masquer' : 'Afficher'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => copySecret(wh.secret)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copier</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Events Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Événements surveillés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {wh.events.map((event) => (
                      <Badge
                        key={event}
                        variant="secondary"
                        className={`text-[10px] h-6 ${getEventCategoryColor(event)}`}
                      >
                        {getEventLabel(event)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right column: Delivery history */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-500" />
                        Historique des livraisons
                      </CardTitle>
                      <CardDescription>
                        Derniers événements envoyés à ce webhook
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchWebhookDetail(wh.id)}
                      className="gap-1.5"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      Rafraîchir
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {wh.recentDeliveries && wh.recentDeliveries.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 font-medium text-xs">Événement</th>
                            <th className="text-center py-2 font-medium text-xs">Statut</th>
                            <th className="text-center py-2 font-medium text-xs">Code</th>
                            <th className="text-right py-2 font-medium text-xs">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wh.recentDeliveries.map((delivery) => (
                            <tr
                              key={delivery.id}
                              className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                            >
                              <td className="py-2.5">
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 ${getEventCategoryColor(delivery.event)}`}
                                >
                                  {getEventLabel(delivery.event)}
                                </Badge>
                              </td>
                              <td className="py-2.5 text-center">
                                {delivery.success ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                )}
                              </td>
                              <td className="py-2.5 text-center">
                                <span className={`text-xs font-mono ${
                                  delivery.statusCode && delivery.statusCode >= 200 && delivery.statusCode < 300
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : delivery.statusCode
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-muted-foreground'
                                }`}>
                                  {delivery.statusCode ?? '—'}
                                </span>
                              </td>
                              <td className="py-2.5 text-right text-xs text-muted-foreground">
                                {formatTimeAgo(delivery.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Send className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">Aucune livraison pour le moment</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Envoyez un test ou attendez qu&apos;un événement se produise
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────
  if (webhooks.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Webhook className="h-7 w-7 text-emerald-500" />
            <span className="gradient-text">Webhooks</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Recevez des notifications en temps réel vers vos services externes
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 flex items-center justify-center mb-6">
            <Webhook className="h-10 w-10 text-emerald-500/60" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aucun webhook configuré</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Les webhooks vous permettent de recevoir des notifications en temps réel
            lorsqu&apos;un événement se produit dans DataSphere. Configurez votre premier
            webhook pour intégrer vos services externes.
          </p>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-lg shadow-emerald-500/20">
                <Plus className="h-4 w-4" />
                Créer un webhook
              </Button>
            </DialogTrigger>
            <CreateWebhookDialog
              newUrl={newUrl}
              setNewUrl={setNewUrl}
              newEvents={newEvents}
              toggleEvent={toggleEvent}
              selectAllCategory={selectAllCategory}
              creating={creating}
              onCreate={handleCreate}
              onReset={() => { setNewUrl(''); setNewEvents([]); }}
            />
          </Dialog>
        </motion.div>
      </div>
    );
  }

  // ─── List View ────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Webhook className="h-7 w-7 text-emerald-500" />
              <span className="gradient-text">Webhooks</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Recevez des notifications en temps réel vers vos services externes
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-lg shadow-emerald-500/20">
                <Plus className="h-4 w-4" />
                Créer un webhook
              </Button>
            </DialogTrigger>
            <CreateWebhookDialog
              newUrl={newUrl}
              setNewUrl={setNewUrl}
              newEvents={newEvents}
              toggleEvent={toggleEvent}
              selectAllCategory={selectAllCategory}
              creating={creating}
              onCreate={handleCreate}
              onReset={() => { setNewUrl(''); setNewEvents([]); }}
            />
          </Dialog>
        </div>
      </motion.div>

      {/* Webhook Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {webhooks.map((wh, index) => (
          <motion.div
            key={wh.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card
              className="overflow-hidden card-hover cursor-pointer"
              onClick={() => {
                fetchWebhookDetail(wh.id);
                setShowSecret(false);
              }}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* URL + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm font-medium truncate">{maskUrl(wh.url)}</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] h-5 flex-shrink-0 ${
                        wh.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                      }`}
                    >
                      {wh.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>

                  {/* Events */}
                  <div className="flex flex-wrap gap-1">
                    {wh.events.slice(0, 3).map((event) => (
                      <Badge
                        key={event}
                        variant="secondary"
                        className={`text-[9px] h-5 ${getEventCategoryColor(event)}`}
                      >
                        {getEventLabel(event)}
                      </Badge>
                    ))}
                    {wh.events.length > 3 && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] h-5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        +{wh.events.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {wh.successCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        {wh.failCount}
                      </span>
                    </div>
                    {wh.failureCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {wh.failureCount} échecs
                      </span>
                    )}
                  </div>

                  {/* Last triggered */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                    <span>Dernier déclenchement</span>
                    <span>{wh.lastTriggeredAt ? formatTimeAgo(wh.lastTriggeredAt) : 'Jamais'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Create Webhook Dialog ─────────────────────────────────────
function CreateWebhookDialog({
  newUrl,
  setNewUrl,
  newEvents,
  toggleEvent,
  selectAllCategory,
  creating,
  onCreate,
  onReset,
}: {
  newUrl: string;
  setNewUrl: (url: string) => void;
  newEvents: string[];
  toggleEvent: (id: string) => void;
  selectAllCategory: (events: string[]) => void;
  creating: boolean;
  onCreate: () => void;
  onReset: () => void;
}) {
  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-emerald-500" />
          Créer un webhook
        </DialogTitle>
        <DialogDescription>
          Configurez l&apos;URL de destination et les événements à surveiller.
          Un secret HMAC sera généré automatiquement pour signer les payloads.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-5 py-2">
        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url" className="text-sm font-medium">
            URL de destination
          </Label>
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="webhook-url"
              placeholder="https://votre-service.com/api/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            L&apos;URL doit être accessible publiquement (https:// recommandé)
          </p>
        </div>

        {/* Events Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Événements à surveiller</Label>
          <div className="space-y-3">
            {Object.entries(EVENT_CATEGORIES).map(([key, category]) => {
              const categoryEventIds = category.events.map((e) => e.id);
              const allSelected = categoryEventIds.every((e) => newEvents.includes(e));
              const someSelected = categoryEventIds.some((e) => newEvents.includes(e));

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category.label}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-emerald-600 dark:text-emerald-400"
                      onClick={() => selectAllCategory(categoryEventIds)}
                    >
                      {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {category.events.map((event) => (
                      <label
                        key={event.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          newEvents.includes(event.id)
                            ? 'bg-emerald-50 dark:bg-emerald-950/30'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={newEvents.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="h-3.5 w-3.5 rounded border-emerald-500 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                        />
                        <span className="text-sm">{event.label}</span>
                        <code className="text-[10px] text-muted-foreground font-mono ml-auto">
                          {event.id}
                        </code>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DialogFooter className="border-t pt-4">
        <Button
          variant="outline"
          onClick={onReset}
        >
          Réinitialiser
        </Button>
        <Button
          onClick={onCreate}
          disabled={creating || !newUrl.trim() || newEvents.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Création…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Créer le webhook
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
