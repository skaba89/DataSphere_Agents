'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Store,
  Search,
  Star,
  Download,
  Bot,
  Headphones,
  TrendingUp,
  Database,
  Target,
  Globe,
  Plus,
  Filter,
  ChevronDown,
  Loader2,
  Share2,
  Sparkles,
  Users,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- Types ---
interface SharedAgent {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  icon: string;
  color: string;
  creatorId: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

// --- Icon/Color maps (same as AgentsView) ---
const iconMap: Record<string, React.ElementType> = {
  Headphones,
  TrendingUp,
  Database,
  Target,
  Globe,
  Bot,
};

const colorMap: Record<string, { gradient: string; bg: string; text: string; border: string }> = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/50',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
  },
  cyan: {
    gradient: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/50',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50 dark:bg-orange-950/50',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
};

const categoryFilters = [
  { id: 'all', label: 'Tous' },
  { id: 'support', label: 'Support' },
  { id: 'finance', label: 'Finance' },
  { id: 'data', label: 'Data' },
  { id: 'sales', label: 'Commercial' },
  { id: 'webbuilder', label: 'Web' },
  { id: 'custom', label: 'Personnalisé' },
];

const sortOptions = [
  { id: 'newest', label: 'Plus récents' },
  { id: 'popular', label: 'Mieux notés' },
  { id: 'downloads', label: 'Plus téléchargés' },
];

const typeLabels: Record<string, string> = {
  support: 'Support',
  finance: 'Finance',
  data: 'Data / RAG',
  sales: 'Commercial',
  webbuilder: 'Web Builder',
  custom: 'Personnalisé',
};

export default function MarketplaceView() {
  const { token, agents } = useAppStore();
  const [marketplaceAgents, setMarketplaceAgents] = useState<SharedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [installing, setInstalling] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishAgentId, setPublishAgentId] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [ratingAgent, setRatingAgent] = useState<string | null>(null);

  // Fetch marketplace agents
  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory !== 'all') params.set('tag', selectedCategory);
      params.set('sort', sortBy);

      const res = await fetch(`/api/marketplace?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMarketplaceAgents(data.agents || []);
      }
    } catch {
      toast.error('Erreur lors du chargement du marketplace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMarketplace();
  }, [token, searchQuery, selectedCategory, sortBy]);

  // Install agent
  const handleInstall = async (sharedAgentId: string, agentName: string) => {
    setInstalling(sharedAgentId);
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sharedAgentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de l\'installation');
        return;
      }
      toast.success(`Agent "${agentName}" installé avec succès !`);
      // Refresh to update download count
      fetchMarketplace();
    } catch {
      toast.error('Erreur lors de l\'installation');
    } finally {
      setInstalling(null);
    }
  };

  // Publish agent
  const handlePublish = async () => {
    if (!publishAgentId) {
      toast.error('Veuillez sélectionner un agent à publier');
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId: publishAgentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la publication');
        return;
      }
      toast.success('Agent publié sur le marketplace !');
      setPublishDialogOpen(false);
      setPublishAgentId('');
      fetchMarketplace();
    } catch {
      toast.error('Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };

  // Rate agent
  const handleRate = async (sharedAgentId: string, rating: number) => {
    setRatingAgent(sharedAgentId);
    try {
      const res = await fetch('/api/marketplace/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sharedAgentId, rating }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la notation');
        return;
      }
      toast.success(`Note de ${rating}/5 enregistrée !`);
      fetchMarketplace();
    } catch {
      toast.error('Erreur lors de la notation');
    } finally {
      setRatingAgent(null);
    }
  };

  // Render stars for rating
  const renderStars = (agent: SharedAgent) => {
    const stars = [];
    const displayRating = Math.round(agent.rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          onClick={() => handleRate(agent.id, i)}
          disabled={ratingAgent === agent.id}
          className="transition-transform hover:scale-125 disabled:opacity-50"
          title={`Noter ${i}/5`}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              i <= displayRating
                ? 'text-amber-500 fill-amber-500'
                : 'text-muted-foreground/40'
            }`}
          />
        </button>
      );
    }
    return stars;
  };

  // Loading skeleton
  if (loading && marketplaceAgents.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-80 bg-muted animate-pulse rounded-lg mt-2" />
          </div>
          <div className="h-10 w-40 bg-muted animate-pulse rounded-lg" />
        </div>
        {/* Search skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 flex-1 max-w-sm bg-muted animate-pulse rounded-lg" />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-1.5 bg-muted animate-pulse" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-muted animate-pulse rounded-xl" />
                  <div className="w-16 h-5 bg-muted animate-pulse rounded-md" />
                </div>
                <div className="h-4 w-32 bg-muted animate-pulse rounded mt-3" />
                <div className="h-3 w-full bg-muted animate-pulse rounded mt-1" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-9 bg-muted animate-pulse rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Marketplace d&apos;Agents</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Découvrez et installez des agents IA créés par la communauté
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setPublishDialogOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Publier un agent
        </Button>
      </div>

      {/* Search and filters */}
      <div className="space-y-4 mb-6">
        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un agent..."
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {categoryFilters.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
                  : ''
              }
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          {marketplaceAgents.length} agent{marketplaceAgents.length !== 1 ? 's' : ''} disponible{marketplaceAgents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Agent Grid */}
      {marketplaceAgents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
            <Store className="h-10 w-10 text-emerald-500/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucun agent disponible</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-4">
            {searchQuery || selectedCategory !== 'all'
              ? 'Aucun agent ne correspond à vos critères de recherche.'
              : 'Le marketplace est vide pour le moment. Soyez le premier à publier un agent !'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Effacer les filtres
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {marketplaceAgents.map((agent, index) => {
              const IconComp = iconMap[agent.icon] || Bot;
              const colors = colorMap[agent.color] || colorMap.emerald;

              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  layout
                >
                  <Card
                    className={`group relative overflow-hidden border ${colors.border} hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300`}
                  >
                    {/* Gradient bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}
                        >
                          <IconComp className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="secondary" className={`text-[10px] ${colors.bg} ${colors.text}`}>
                          {typeLabels[agent.type] || agent.type}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-3">{agent.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {agent.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      {/* Author & stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{agent.creatorId ? 'Communauté' : 'DataSphere'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {agent.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {agent.ratingCount}
                          </span>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {renderStars(agent)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {agent.rating > 0 ? agent.rating.toFixed(1) : '—'}
                        </span>
                      </div>

                      {/* Tags */}
                      {agent.tags && (
                        <div className="flex flex-wrap gap-1">
                          {agent.tags.split(',').map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] h-5 px-1.5">
                              {tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Install button */}
                      <Button
                        onClick={() => handleInstall(agent.id, agent.name)}
                        disabled={installing === agent.id}
                        className={`w-full bg-gradient-to-r ${colors.gradient} text-white shadow-sm hover:opacity-90`}
                        size="sm"
                      >
                        {installing === agent.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Installer
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-500" />
              Publier un agent sur le Marketplace
            </DialogTitle>
            <DialogDescription>
              Partagez votre agent avec la communauté DataSphere.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sélectionnez un agent</label>
              {agents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Vous n&apos;avez pas encore d&apos;agents à publier.</p>
                  <p className="text-xs mt-1">Créez d&apos;abord un agent dans la section Agents IA.</p>
                </div>
              ) : (
                <Select value={publishAgentId} onValueChange={setPublishAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <span>{agent.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {typeLabels[agent.type] || agent.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {publishAgentId && (
              <div className="p-3 rounded-lg border bg-accent/30">
                <p className="text-sm font-medium">
                  {agents.find((a) => a.id === publishAgentId)?.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {agents.find((a) => a.id === publishAgentId)?.description}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!publishAgentId || publishing || agents.length === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
