'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Headphones,
  TrendingUp,
  Database,
  Target,
  ArrowRight,
  Sparkles,
  Trash2,
  Edit3,
  Star,
  User,
  Globe,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import AgentBuilder from './AgentBuilder';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  icon: string;
  color: string;
  isDefault: boolean;
  creatorId?: string | null;
}

const iconMap: Record<string, React.ElementType> = {
  Headphones,
  TrendingUp,
  Database,
  Target,
  Bot,
  Globe,
};

const colorConfig: Record<string, {
  gradient: string;
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
}> = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    badge: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    badge: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800/50',
    badge: 'bg-violet-100 dark:bg-violet-900/50',
    badgeText: 'text-violet-700 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800/50',
    badge: 'bg-rose-100 dark:bg-rose-900/50',
    badgeText: 'text-rose-700 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  cyan: {
    gradient: 'from-cyan-500 to-teal-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-200 dark:border-cyan-800/50',
    badge: 'bg-cyan-100 dark:bg-cyan-900/50',
    badgeText: 'text-cyan-700 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800/50',
    badge: 'bg-orange-100 dark:bg-orange-900/50',
    badgeText: 'text-orange-700 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
};

const typeLabels: Record<string, string> = {
  support: 'Support',
  finance: 'Finance',
  data: 'Données + RAG',
  sales: 'Commercial',
  webbuilder: 'Web Builder',
  custom: 'Personnalisé',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AgentsView() {
  const { token, setSelectedAgentId, setCurrentView } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAgents(json.agents);
      } else {
        console.error('Agents fetch error:', res.status);
      }
    } catch (err) {
      console.error('Agents network error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleStartChat = (agentId: string, agentType: string) => {
    if (agentType === 'webbuilder') {
      setCurrentView('webbuilder');
      setSelectedAgentId(agentId);
    } else {
      setCurrentView('chat');
      setSelectedAgentId(agentId);
    }
  };

  const handleDelete = async (agentId: string, agentName: string) => {
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      return;
    }
    try {
      const res = await fetch(`/api/agents/delete?id=${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(`Agent "${agentName}" supprimé`);
        fetchAgents();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const defaultAgents = agents.filter((a) => a.isDefault);
  const customAgents = agents.filter((a) => !a.isDefault);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 lg:p-8 space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Agents IA</h1>
            <p className="text-muted-foreground mt-1">
              Créez et gérez vos agents IA personnalisés
            </p>
          </div>
        </div>
        <AgentBuilder onAgentCreated={fetchAgents} />
      </motion.div>

      {/* Default Agents */}
      {defaultAgents.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <h2 className="text-lg font-semibold">Agents par Défaut</h2>
            <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0">
              {defaultAgents.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-14 w-14 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      </div>
                      <Skeleton className="h-10 w-full mt-4" />
                    </CardContent>
                  </Card>
                ))
              : defaultAgents.map((agent) => {
                  const colors = colorConfig[agent.color] || colorConfig.emerald;
                  const IconComponent = iconMap[agent.icon] || Bot;
                  return (
                    <motion.div key={agent.id} variants={itemVariants}>
                      <Card className={`overflow-hidden border ${colors.border} hover:shadow-lg transition-all duration-300 group`}>
                        <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${colors.iconBg} shrink-0`}>
                              <IconComponent className={`h-6 w-6 ${colors.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate text-sm">{agent.name}</h3>
                              <Badge
                                variant="secondary"
                                className={`mt-1 ${colors.badge} ${colors.badgeText} border-0 text-[10px]`}
                              >
                                {typeLabels[agent.type] || agent.type}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                            {agent.description}
                          </p>
                          <Button
                            onClick={() => handleStartChat(agent.id, agent.type)}
                            className={`w-full mt-4 bg-gradient-to-r ${colors.gradient} text-white shadow-md text-sm h-9`}
                          >
                            {agent.type === 'webbuilder' ? 'Créer un site' : 'Discuter'}
                            <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
          </div>
        </motion.div>
      )}

      {/* Custom Agents */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-emerald-500" />
          <h2 className="text-lg font-semibold">Mes Agents Personnalisés</h2>
          {customAgents.length > 0 && (
            <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400 border-0">
              {customAgents.length}
            </Badge>
          )}
        </div>

        {customAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {customAgents.map((agent) => {
              const colors = colorConfig[agent.color] || colorConfig.emerald;
              const IconComponent = iconMap[agent.icon] || Bot;
              return (
                <motion.div key={agent.id} variants={itemVariants}>
                  <Card className={`overflow-hidden border ${colors.border} hover:shadow-lg transition-all duration-300 group`}>
                    <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl ${colors.iconBg} shrink-0`}>
                          <IconComponent className={`h-6 w-6 ${colors.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-sm">{agent.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge
                              variant="secondary"
                              className={`${colors.badge} ${colors.badgeText} border-0 text-[10px]`}
                            >
                              {typeLabels[agent.type] || agent.type}
                            </Badge>
                            {agent.type === 'data' && (
                              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400 border-0 text-[10px]">
                                RAG
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                        {agent.description}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleStartChat(agent.id, agent.type)}
                          className={`flex-1 bg-gradient-to-r ${colors.gradient} text-white shadow-md text-sm h-9`}
                        >
                          {agent.type === 'webbuilder' ? 'Créer un site' : 'Discuter'}
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0 h-9 w-9 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer l&apos;agent ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer l&apos;agent &quot;{agent.name}&quot; ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(agent.id, agent.name)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          !loading && (
            <Card className="border-dashed border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardContent className="p-8 text-center">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold">Pas encore d&apos;agents personnalisés</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Créez votre propre agent IA avec un prompt système, une icône et une couleur personnalisés.
                </p>
                <AgentBuilder onAgentCreated={fetchAgents} />
              </CardContent>
            </Card>
          )
        )}
      </motion.div>
    </motion.div>
  );
}
