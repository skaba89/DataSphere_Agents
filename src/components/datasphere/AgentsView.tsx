'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Headphones,
  TrendingUp,
  Database,
  Target,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  icon: string;
  color: string;
}

const iconMap: Record<string, React.ElementType> = {
  Headphones,
  TrendingUp,
  Database,
  Target,
  Bot,
};

const colorConfig: Record<string, {
  gradient: string;
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  hoverShadow: string;
}> = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    badge: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    hoverShadow: 'hover:shadow-emerald-500/20',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    badge: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    hoverShadow: 'hover:shadow-amber-500/20',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800/50',
    badge: 'bg-violet-100 dark:bg-violet-900/50',
    badgeText: 'text-violet-700 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
    hoverShadow: 'hover:shadow-violet-500/20',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800/50',
    badge: 'bg-rose-100 dark:bg-rose-900/50',
    badgeText: 'text-rose-700 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
    hoverShadow: 'hover:shadow-rose-500/20',
  },
};

const typeLabels: Record<string, string> = {
  support: 'Support',
  finance: 'Finance',
  data: 'Données',
  sales: 'Commercial',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setAgents(json.agents);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, [token]);

  const handleStartChat = (agentId: string) => {
    setCurrentView('chat');
    setSelectedAgentId(agentId);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 lg:p-8 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Agents IA</h1>
            <p className="text-muted-foreground mt-1">
              Choisissez un agent et commencez une conversation
            </p>
          </div>
        </div>
      </motion.div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
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
          : agents.map((agent) => {
              const colors = colorConfig[agent.color] || colorConfig.emerald;
              const IconComponent = iconMap[agent.icon] || Bot;
              return (
                <motion.div key={agent.id} variants={itemVariants}>
                  <Card
                    className={`overflow-hidden border ${colors.border} ${colors.hoverShadow} hover:shadow-lg transition-all duration-300 group`}
                  >
                    {/* Color bar top */}
                    <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${colors.iconBg} shrink-0`}>
                          <IconComponent className={`h-7 w-7 ${colors.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate">{agent.name}</h3>
                          <Badge
                            variant="secondary"
                            className={`mt-1 ${colors.badge} ${colors.badgeText} border-0`}
                          >
                            {typeLabels[agent.type] || agent.type}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                        {agent.description}
                      </p>
                      <Button
                        onClick={() => handleStartChat(agent.id)}
                        className={`w-full mt-5 bg-gradient-to-r ${colors.gradient} text-white shadow-md group-hover:shadow-lg transition-shadow`}
                      >
                        Discuter
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {!loading && agents.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-16">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">Aucun agent disponible</h3>
          <p className="text-muted-foreground mt-2">
            Les agents IA apparaîtront ici une fois configurés.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
