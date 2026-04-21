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

export default function DashboardView() {
  const { token, setCurrentView, setSelectedAgentId, agents, setAgents } = useAppStore();
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

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
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
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      title: "Aujourd'hui",
      value: `${(data.todayRevenue || 0).toLocaleString('fr-FR')} GNF`,
      change: `${data.todayTransactions || 0} transactions`,
      up: true,
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      title: 'Utilisateurs',
      value: data.userCount || 0,
      change: 'Actifs',
      up: true,
      icon: Users,
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50 dark:bg-violet-950/50',
    },
    {
      title: 'Documents',
      value: data.documentCount || 0,
      change: `${data.agentCount || 0} agents`,
      up: true,
      icon: FileText,
      gradient: 'from-rose-500 to-pink-600',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d&apos;ensemble de votre activité DataSphere</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
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
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenus mensuels</CardTitle>
              <CardDescription>Évolution des revenus sur les 6 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              {data.chartData && data.chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="month"
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
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
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accès rapide</CardTitle>
              <CardDescription>Vos agents les plus utilisés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                      <IconComp className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{agent.type}</p>
                    </div>
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent transactions */}
      {data.recentTransactions && data.recentTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card>
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
