'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  LayoutTemplate, Search, Star, Download, Crown, Check,
  Filter, Sparkles, ArrowRight, Loader2, Bot, Tag,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  icon: string;
  color: string;
  category: string;
  tags: string[];
  isPremium: boolean;
  popularity: number;
}

export default function TemplatesView() {
  const { token } = useAppStore();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [customName, setCustomName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async (search?: string, category?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);

      const res = await fetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        if (data.categories) setCategories(data.categories);
      }
    } catch (_e) {
      toast.error('Erreur chargement templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    fetchTemplates(query, selectedCategory || undefined);
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
    fetchTemplates(searchQuery || undefined, category || undefined);
  };

  const openInstallDialog = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setCustomName(template.name);
    setCustomPrompt(template.systemPrompt);
    setDialogOpen(true);
  };

  const handleInstall = async () => {
    if (!selectedTemplate) return;
    setInstalling(selectedTemplate.id);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customName,
          customPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgradeRequired) {
          toast.error(data.error || 'Plan Pro requis pour ce template');
        } else if (data.quotaExceeded) {
          toast.error(data.error || 'Quota d\'agents atteint');
        } else {
          toast.error(data.error || 'Erreur lors de l\'installation');
        }
        return;
      }

      toast.success(`Agent "${customName}" créé avec succès !`);
      setDialogOpen(false);
    } catch (_e) {
      toast.error('Erreur de connexion');
    } finally {
      setInstalling(null);
    }
  };

  const getIconEmoji = (icon: string) => {
    const icons: Record<string, string> = {
      Headphones: '🎧', TrendingUp: '📈', BarChart3: '📊', Target: '🎯',
      PenTool: '✍️', Code: '💻', Scale: '⚖️', Users: '👥',
      Megaphone: '📣', ClipboardList: '📋', Bot: '🤖', Globe: '🌐',
    };
    return icons[icon] || '🤖';
  };

  const getColorGradient = (color: string) => {
    const gradients: Record<string, string> = {
      blue: 'from-blue-400 to-indigo-500',
      emerald: 'from-emerald-400 to-teal-500',
      violet: 'from-violet-400 to-purple-500',
      orange: 'from-orange-400 to-amber-500',
      pink: 'from-pink-400 to-rose-500',
      cyan: 'from-cyan-400 to-blue-500',
      slate: 'from-slate-400 to-gray-500',
      teal: 'from-teal-400 to-emerald-500',
      rose: 'from-rose-400 to-pink-500',
      indigo: 'from-indigo-400 to-violet-500',
    };
    return gradients[color] || gradients.emerald;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"><span className="gradient-text">Templates d'Agents</span></h1>
            <p className="text-muted-foreground text-sm">Installez des agents pré-configurés en un clic</p>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleCategoryFilter(null)}
          >
            Tous
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-xl bg-muted skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full flex flex-col hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getColorGradient(template.color)} flex items-center justify-center text-xl`}>
                        {getIconEmoji(template.icon)}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <CardDescription className="text-xs">{template.category}</CardDescription>
                      </div>
                    </div>
                    {template.isPremium && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400 text-[10px]">
                        <Crown className="h-2.5 w-2.5 mr-0.5" /> Pro
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{template.description}</p>

                  {/* Tags */}
                  <div className="flex gap-1 flex-wrap mb-4">
                    {template.tags.slice(0, 4).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        <Tag className="h-2.5 w-2.5 mr-0.5" /> {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Popularity */}
                  <div className="flex items-center gap-1 mb-4">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${star <= Math.round(template.popularity / 20) ? 'text-amber-500 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">{template.popularity}% populaire</span>
                  </div>

                  {/* Install Button */}
                  <div className="mt-auto">
                    <Button
                      className="w-full"
                      size="sm"
                      variant="outline"
                      onClick={() => openInstallDialog(template)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Installer ce template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-12">
              <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">Aucun template trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Install Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && (
                <>
                  <span className="text-xl">{getIconEmoji(selectedTemplate.icon)}</span>
                  Installer : {selectedTemplate?.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>Personnalisez votre agent avant l'installation</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom de l'agent</label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nom personnalisé"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Prompt système</label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[160px] resize-y"
                />
              </div>

              {selectedTemplate.isPremium && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <Crown className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">Ce template nécessite le plan Pro ou supérieur</p>
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                onClick={handleInstall}
                disabled={installing !== null || !customName.trim()}
              >
                {installing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Installation...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Créer l'agent</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
