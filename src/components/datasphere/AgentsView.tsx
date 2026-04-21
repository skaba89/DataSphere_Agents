'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  custom: 'Personnalisé',
};

export default function AgentsView() {
  const { token, agents, setAgents, setCurrentView, setSelectedAgentId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleChat = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('chat');
  };

  const handleWebBuilder = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('webbuilder');
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
      setFormName('');
      setFormDesc('');
      setFormPrompt('');
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Agents IA</h1>
          <p className="text-muted-foreground mt-1">
            Choisissez un agent pour commencer une conversation
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                Personnalisez votre agent IA avec un nom, une description et un prompt système.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
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
              <div className="space-y-2">
                <Label>Prompt système</Label>
                <Textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Instructions pour l'agent..."
                  rows={4}
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
              <div className="space-y-2">
                <Label>Couleur</Label>
                <Select value={formColor} onValueChange={setFormColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emerald">💚 Émeraude</SelectItem>
                    <SelectItem value="amber">🟡 Ambre</SelectItem>
                    <SelectItem value="violet">💜 Violet</SelectItem>
                    <SelectItem value="rose">💗 Rose</SelectItem>
                    <SelectItem value="cyan">💙 Cyan</SelectItem>
                    <SelectItem value="orange">🧡 Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent, index) => {
          const IconComp = iconMap[agent.icon] || Bot;
          const colors = colorMap[agent.color] || colorMap.emerald;
          const isWebBuilder = agent.type === 'webbuilder';

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
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

                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    {isWebBuilder ? (
                      <Button
                        onClick={() => handleWebBuilder(agent.id)}
                        className={`flex-1 bg-gradient-to-r ${colors.gradient} text-white shadow-sm hover:opacity-90`}
                        size="sm"
                      >
                        <GlobeIcon className="h-3.5 w-3.5 mr-1.5" />
                        Créer un site
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleChat(agent.id)}
                        className={`flex-1 bg-gradient-to-r ${colors.gradient} text-white shadow-sm hover:opacity-90`}
                        size="sm"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Discuter
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
      </div>
    </div>
  );
}
