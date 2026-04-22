'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Headphones,
  TrendingUp,
  Database,
  Target,
  Globe,
  Bot,
  Plus,
  Trash2,
  MessageSquare,
  Globe as GlobeIcon,
  Loader2,
  Search,
  LayoutGrid,
  List,
  Star,
  StarOff,
  MessageCircle,
  Sparkles,
  Zap,
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const typeLabels: Record<string, string> = {
  support: 'Support',
  finance: 'Finance',
  data: 'Data / RAG',
  sales: 'Commercial',
  webbuilder: 'Web Builder',
  image: 'Image IA',
  custom: 'Personnalisé',
};

type CategoryTab = 'all' | 'default' | 'custom' | 'favorites';

const categoryTabs: { id: CategoryTab; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'default', label: 'Par défaut' },
  { id: 'custom', label: 'Personnalisés' },
  { id: 'favorites', label: 'Favoris' },
];

export default function AgentsView() {
  const { token, agents, setAgents, setCurrentView, setSelectedAgentId, logout } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [wizardStep, setWizardStep] = useState(1);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formType, setFormType] = useState('custom');
  const [formIcon, setFormIcon] = useState('Bot');
  const [formColor, setFormColor] = useState('emerald');

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch {
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ds_favorites');
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch { /* ignore */ }
    }
  }, []);

  const toggleFavorite = (agentId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      localStorage.setItem('ds_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  const handleChat = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('chat');
  };

  const handleWebBuilder = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('webbuilder');
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormPrompt('');
    setFormType('custom');
    setFormIcon('Bot');
    setFormColor('emerald');
    setWizardStep(1);
  };

  const handleCreate = async () => {
    if (!formName || !formDesc || !formPrompt) {
      toast.error('Nom, description et prompt système sont requis');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          systemPrompt: formPrompt,
          type: formType,
          icon: formIcon,
          color: formColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création');
        return;
      }
      toast.success(`Agent "${formName}" créé avec succès !`);
      setDialogOpen(false);
      resetForm();
      fetchAgents();
    } catch {
      toast.error('Erreur lors de la création de l\'agent');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (agentId: string, agentName: string) => {
    try {
      const res = await fetch(`/api/agents/delete?id=${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la suppression');
        return;
      }
      toast.success(`Agent "${agentName}" supprimé`);
      fetchAgents();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Filter agents by category and search
  const filteredAgents = agents.filter((agent) => {
    // Category filter
    if (activeCategory === 'default' && !agent.isDefault) return false;
    if (activeCategory === 'custom' && agent.isDefault) return false;
    if (activeCategory === 'favorites' && !favorites.has(agent.id)) return false;

    // Search filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(q) ||
      agent.description.toLowerCase().includes(q) ||
      agent.type.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Agents IA</h1>
          <p className="text-muted-foreground mt-1">
            Choisissez un agent pour commencer une conversation
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25">
              <Plus className="h-4 w-4 mr-2" />
              Créer un agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un nouvel agent</DialogTitle>
              <DialogDescription>
                Personnalisez votre agent IA en 3 étapes.
              </DialogDescription>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      wizardStep >= step
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`h-0.5 flex-1 transition-colors ${wizardStep > step ? 'bg-emerald-500' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Name & Type */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de l&apos;agent</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Agent Marketing IA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Décrivez ce que fait cet agent..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="data">Data / RAG</SelectItem>
                        <SelectItem value="sales">Commercial</SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Icône</Label>
                    <Select value={formIcon} onValueChange={setFormIcon}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bot">🤖 Bot</SelectItem>
                        <SelectItem value="Headphones">🎧 Headphones</SelectItem>
                        <SelectItem value="TrendingUp">📈 TrendingUp</SelectItem>
                        <SelectItem value="Database">🗄️ Database</SelectItem>
                        <SelectItem value="Target">🎯 Target</SelectItem>
                        <SelectItem value="Globe">🌐 Globe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: System Prompt */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Prompt système</Label>
                  <Textarea
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    placeholder="Instructions détaillées pour l'agent. Décrivez son rôle, ses capacités et son style de réponse..."
                    rows={8}
                    className="min-h-[200px]"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Le prompt système définit le comportement et les capacités de votre agent. Soyez précis et détaillé.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Appearance */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'emerald', label: '💚 Émeraude', cls: 'from-emerald-500 to-teal-600' },
                      { value: 'amber', label: '🟡 Ambre', cls: 'from-amber-500 to-orange-600' },
                      { value: 'violet', label: '💜 Violet', cls: 'from-violet-500 to-purple-600' },
                      { value: 'rose', label: '💗 Rose', cls: 'from-rose-500 to-pink-600' },
                      { value: 'cyan', label: '💙 Cyan', cls: 'from-cyan-500 to-blue-600' },
                      { value: 'orange', label: '🧡 Orange', cls: 'from-orange-500 to-red-600' },
                    ].map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFormColor(color.value)}
                        className={`p-3 rounded-xl border-2 text-sm text-left transition-all ${
                          formColor === color.value
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'border-transparent hover:border-muted-foreground/25 bg-accent/50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${color.cls} mb-1.5`} />
                        <span className="text-xs">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Aperçu</Label>
                  <div className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${(colorMap[formColor] || colorMap.emerald).gradient} flex items-center justify-center`}>
                        {(() => {
                          const Ic = iconMap[formIcon] || Bot;
                          return <Ic className="h-5 w-5 text-white" />;
                        })()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{formName || 'Mon Agent'}</p>
                        <p className="text-xs text-muted-foreground">{formDesc || 'Description de l\'agent'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                  Précédent
                </Button>
              )}
              {wizardStep < 3 ? (
                <Button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  Suivant
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Créer
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Category tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeCategory === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.id === 'favorites' && favorites.size > 0 && (
                <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">({favorites.size})</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="relative flex-1 sm:flex-initial max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un agent..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Agent Grid/List */}
      <AnimatePresence mode="wait">
        {filteredAgents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {activeCategory === 'favorites'
                ? 'Aucun agent favori'
                : activeCategory === 'default'
                ? 'Aucun agent par défaut'
                : activeCategory === 'custom'
                ? 'Aucun agent personnalisé'
                : 'Aucun agent trouvé'}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchQuery('')}>
                Effacer la recherche
              </Button>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredAgents.map((agent, index) => {
              const IconComp = iconMap[agent.icon] || Bot;
              const colors = colorMap[agent.color] || colorMap.emerald;
              const isWebBuilder = agent.type === 'webbuilder';
              const isFav = favorites.has(agent.id);

              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                >
                  <Card
                    className={`group relative overflow-hidden border ${colors.border} hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300`}
                  >
                    {/* Gradient bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />

                    {/* Popular badge for default agents */}
                    {agent.isDefault && (
                      <div className="absolute top-4 right-3 z-10">
                        <Badge className="text-[10px] gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-400 border-0">
                          <Sparkles className="h-2.5 w-2.5" />
                          Populaire
                        </Badge>
                      </div>
                    )}

                    {/* Favorite button */}
                    {!agent.isDefault && (
                      <button
                        onClick={() => toggleFavorite(agent.id)}
                        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isFav ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground hover:text-amber-500" />
                        )}
                      </button>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                        >
                          <IconComp className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                          </div>
                          <Badge variant="secondary" className={`text-[10px] mt-1 ${colors.bg} ${colors.text}`}>
                            {typeLabels[agent.type] || agent.type}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="text-xs line-clamp-2 mt-2">
                        {agent.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        {isWebBuilder ? (
                          <Button
                            onClick={() => handleWebBuilder(agent.id)}
                            className={`flex-1 bg-gradient-to-r ${colors.gradient} text-white shadow-sm hover:opacity-90 gap-1.5`}
                            size="sm"
                          >
                            <GlobeIcon className="h-3.5 w-3.5" />
                            Créer un site
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleChat(agent.id)}
                            className={`flex-1 bg-gradient-to-r ${colors.gradient} text-white shadow-sm hover:opacity-90 gap-1.5`}
                            size="sm"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Démarrer une conversation
                          </Button>
                        )}
                        {!agent.isDefault && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-muted-foreground hover:text-red-500 hover:border-red-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l&apos;agent ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer l&apos;agent &quot;{agent.name}&quot; ?
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(agent.id, agent.name)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {filteredAgents.map((agent, index) => {
              const IconComp = iconMap[agent.icon] || Bot;
              const colors = colorMap[agent.color] || colorMap.emerald;
              const isWebBuilder = agent.type === 'webbuilder';
              const isFav = favorites.has(agent.id);

              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ x: 4, transition: { duration: 0.15 } }}
                >
                  <div
                    className={`flex items-center gap-4 p-3 rounded-xl border ${colors.border} hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <IconComp className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{agent.name}</p>
                        <Badge variant="secondary" className={`text-[10px] ${colors.bg} ${colors.text}`}>
                          {typeLabels[agent.type] || agent.type}
                        </Badge>
                        {agent.isDefault && (
                          <Badge className="text-[10px] gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-400 border-0">
                            <Sparkles className="h-2.5 w-2.5" />
                            Populaire
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleFavorite(agent.id)}
                        className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                      >
                        {isFav ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isWebBuilder ? (
                        <Button
                          onClick={() => handleWebBuilder(agent.id)}
                          className={`bg-gradient-to-r ${colors.gradient} text-white gap-1.5`}
                          size="sm"
                        >
                          <GlobeIcon className="h-3.5 w-3.5" />
                          Créer
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleChat(agent.id)}
                          className={`bg-gradient-to-r ${colors.gradient} text-white gap-1.5`}
                          size="sm"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Discuter
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
