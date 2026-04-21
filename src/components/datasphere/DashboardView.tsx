'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  DollarSign,
  Users,
  Bot,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  MessageSquare,
  Globe,
  Headphones,
  Target,
  Plus,
  Upload,
  Database,
  Clock,
  Zap,
  Rocket,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const quickAgents = [
  { name: 'Support Client', icon: Headphones, color: 'from-emerald-500 to-teal-600', type: 'support' },
  { name: 'Web Builder', icon: Globe, color: 'from-cyan-500 to-blue-600', type: 'webbuilder' },
  { name: 'Analyste Data', icon: Target, color: 'from-violet-500 to-purple-600', type: 'data' },
];

// Shortcut cards data
const shortcuts = [
  {
    title: 'Nouveau Chat',
    description: 'Démarrer une conversation IA',
    icon: MessageSquare,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    view: 'chat',
  },
  {
    title: 'Créer un Agent',
    description: 'Personnaliser votre agent IA',
    icon: Plus,
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    view: 'agents',
  },
  {
    title: 'Web Builder',
    description: 'Générer un site web',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    view: 'webbuilder',
  },
  {
    title: 'Documents',
    description: 'Gérer vos fichiers',
    icon: FileText,
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    view: 'documents',
  },
];

// Skeleton component for loading state
function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-muted skeleton" />
            <div className="h-7 w-28 rounded bg-muted skeleton" />
            <div className="h-3 w-16 rounded bg-muted skeleton" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted skeleton" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardView() {
  const { token, setCurrentView, setSelectedAgentId, agents, setAgents, user, conversations } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (res.ok) setData(result);
      } catch {
        toast.error('Erreur lors du chargement du dashboard');
      } finally {
        setLoading(false);
      }
    };

    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.agents) setAgents(result.agents);
      } catch {
        // silent
      }
    };

    fetchData();
    fetchAgents();
  }, [token]);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading || !data) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 rounded bg-muted skeleton mb-2" />
          <div className="h-4 w-64 rounded bg-muted skeleton" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Revenu Total',
      value: `${(data.totalRevenue || 0).toLocaleString('fr-FR')} GNF`,
      change: '+12.5%',
      up: true,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40',
    },
    {
      title: "Aujourd'hui",
      value: `${(data.todayRevenue || 0).toLocaleString('fr-FR')} GNF`,
      change: `${data.todayTransactions || 0} transactions`,
      up: true,
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
    },
    {
      title: 'Utilisateurs',
      value: data.userCount || 0,
      change: 'Actifs',
      up: true,
      icon: Users,
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40',
    },
    {
      title: 'Documents',
      value: data.documentCount || 0,
      change: `${data.agentCount || 0} agents`,
      up: true,
      icon: FileText,
      gradient: 'from-rose-500 to-pink-600',
      bg: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40',
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, <span className="gradient-text">{user?.name || 'Utilisateur'}</span> 👋
            </h1>
            <p className="text-muted-foreground mt-1">Voici un aperçu de votre activité DataSphere</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCurrentView('chat')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau Chat</span>
              <span className="sm:hidden">Chat</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCurrentView('agents')}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Créer Agent</span>
              <span className="sm:hidden">Agent</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCurrentView('documents')}
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Document</span>
              <span className="sm:hidden">Doc</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <Card className="overflow-hidden card-hover">
                <CardContent className={`p-4 ${stat.bg}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {stat.up ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs ${stat.up ? 'text-emerald-600' : 'text-red-600'}`}>
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-black/10`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Raccourcis section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-emerald-500" />
          <h2 className="text-base font-semibold">Raccourcis</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {shortcuts.map((shortcut, index) => {
            const Icon = shortcut.icon;
            return (
              <motion.button
                key={shortcut.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                onClick={() => setCurrentView(shortcut.view)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 card-hover ${shortcut.bg} hover:shadow-md`}
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${shortcut.gradient} flex items-center justify-center shadow-md mb-3`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium">{shortcut.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{shortcut.description}</p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="glass glow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Revenus mensuels</CardTitle>
                  <CardDescription>Évolution des revenus sur les 6 derniers mois</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data.chartData && data.chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="month"
                        className="text-xs"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        dot={{ fill: '#10b981', strokeWidth: 2, stroke: '#fff', r: 4 }}
                        activeDot={{ fill: '#10b981', strokeWidth: 2, stroke: '#fff', r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée de revenus disponible
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick agent access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass glow-card">
            <CardHeader>
              <CardTitle className="text-base">Accès rapide</CardTitle>
              <CardDescription>Vos agents les plus utilisés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Desktop: vertical list, Mobile: horizontal scroll */}
              <div className="hidden md:block space-y-2">
                {agents.slice(0, 5).map((agent) => {
                  const agentIconMap: Record<string, React.ElementType> = {
                    Headphones, TrendingUp: TrendingUp, Database, Target, Globe, Bot,
                  };
                  const colorMapLocal: Record<string, string> = {
                    emerald: 'from-emerald-500 to-teal-600',
                    amber: 'from-amber-500 to-orange-600',
                    violet: 'from-violet-500 to-purple-600',
                    rose: 'from-rose-500 to-pink-600',
                    cyan: 'from-cyan-500 to-blue-600',
                    orange: 'from-orange-500 to-red-600',
                  };
                  const IconComp = agentIconMap[agent.icon] || Bot;
                  const gradient = colorMapLocal[agent.color] || colorMapLocal.emerald;

                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setCurrentView(agent.type === 'webbuilder' ? 'webbuilder' : 'chat');
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/80 transition-colors text-left group"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow`}>
                        <IconComp className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{agent.type}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
              {/* Mobile: horizontal scrollable cards */}
              <div className="md:hidden flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory no-scrollbar">
                {agents.slice(0, 5).map((agent) => {
                  const agentIconMap: Record<string, React.ElementType> = {
                    Headphones, TrendingUp: TrendingUp, Database, Target, Globe, Bot,
                  };
                  const colorMapLocal: Record<string, string> = {
                    emerald: 'from-emerald-500 to-teal-600',
                    amber: 'from-amber-500 to-orange-600',
                    violet: 'from-violet-500 to-purple-600',
                    rose: 'from-rose-500 to-pink-600',
                    cyan: 'from-cyan-500 to-blue-600',
                    orange: 'from-orange-500 to-red-600',
                  };
                  const IconComp = agentIconMap[agent.icon] || Bot;
                  const gradient = colorMapLocal[agent.color] || colorMapLocal.emerald;

                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setCurrentView(agent.type === 'webbuilder' ? 'webbuilder' : 'chat');
                      }}
                      className="flex-shrink-0 snap-start flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors min-w-[80px]"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <IconComp className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-[11px] font-medium text-center leading-tight truncate max-w-[72px]">{agent.name}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Dernière activité section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <Card className="glass glow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  Dernière activité
                </CardTitle>
                <CardDescription>Vos conversations récentes</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                onClick={() => setCurrentView('chat')}
              >
                Voir tout
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {conversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.slice(0, 5).map((conv) => {
                  const agent = agents.find((a) => a.id === conv.agentId);
                  const agentIconMap: Record<string, React.ElementType> = {
                    Headphones, TrendingUp: TrendingUp, Database, Target, Globe, Bot,
                  };
                  const colorMapLocal: Record<string, string> = {
                    emerald: 'from-emerald-500 to-teal-600',
                    amber: 'from-amber-500 to-orange-600',
                    violet: 'from-violet-500 to-purple-600',
                    rose: 'from-rose-500 to-pink-600',
                    cyan: 'from-cyan-500 to-blue-600',
                    orange: 'from-orange-500 to-red-600',
                  };
                  const IconComp = agent ? (agentIconMap[agent.icon] || Bot) : MessageSquare;
                  const gradient = agent ? (colorMapLocal[agent.color] || colorMapLocal.emerald) : 'from-emerald-500 to-teal-600';

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedAgentId(conv.agentId);
                        setCurrentView('chat');
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/80 transition-colors text-left group"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                        <IconComp className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title || 'Conversation sans titre'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {agent?.name || 'Agent'} · {new Date(conv.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune conversation récente</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Démarrez un chat avec un agent pour voir votre activité ici
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => setCurrentView('agents')}
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Découvrir les agents
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent transactions */}
      {data.recentTransactions && data.recentTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <Card className="glass glow-card">
            <CardHeader>
              <CardTitle className="text-base">Transactions récentes</CardTitle>
              <CardDescription>Les dernières opérations Mobile Money</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.user?.name || 'Utilisateur'}</p>
                        <p className="text-xs text-muted-foreground">{tx.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {tx.amount.toLocaleString('fr-FR')} GNF
                      </p>
                      <Badge
                        variant={tx.status === 'success' ? 'default' : 'secondary'}
                        className={`text-[10px] ${
                          tx.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400'
                            : ''
                        }`}
                      >
                        {tx.status === 'success' ? 'Succès' : 'En attente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
