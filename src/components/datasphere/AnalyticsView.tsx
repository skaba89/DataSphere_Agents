'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  MessageSquare,
  Coins,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Activity,
  Zap,
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
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────
interface AnalyticsData {
  overview: {
    totalMessages: number;
    totalTokens: number;
    totalConversations: number;
    totalAgents: number;
    avgResponseTime: number;
    messagesGrowth: number;
    tokensGrowth: number;
    conversationsGrowth: number;
  };
  dailyActivity: {
    date: string;
    messages: number;
    tokens: number;
    conversations: number;
  }[];
  providerUsage: {
    provider: string;
    count: number;
    tokens: number;
  }[];
  agentUsage: {
    agentId: string;
    agentName: string;
    agentType: string;
    messages: number;
    tokens: number;
  }[];
  hourlyDistribution: {
    hour: number;
    count: number;
  }[];
  topConversations: {
    id: string;
    title: string;
    messageCount: number;
    agentName: string;
  }[];
  planUsage: {
    tokensUsed: number;
    tokensLimit: number;
    agentsUsed: number;
    agentsLimit: number;
    conversationsUsed: number;
    conversationsLimit: number;
    documentsUsed: number;
    documentsLimit: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────
function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10b981',
  anthropic: '#f59e0b',
  groq: '#8b5cf6',
  qwen: '#06b6d4',
  openrouter: '#ec4899',
  auto: '#6b7280',
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'];

// ─── Skeleton ───────────────────────────────────────────────────
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

function SkeletonChart() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 rounded bg-muted skeleton" />
        <div className="h-3 w-56 rounded bg-muted skeleton mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-64 rounded bg-muted skeleton" />
      </CardContent>
    </Card>
  );
}

// ─── Component ──────────────────────────────────────────────────
export default function AnalyticsView() {
  const { token, logout } = useAppStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        toast.error("Erreur lors du chargement des analytics");
      }
    } catch (_e) {
      toast.error("Erreur lors du chargement des analytics");
    } finally {
      setLoading(false);
    }
  }, [token, period, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Loading state ──────────────────────────────────────────
  if (loading || !data) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 rounded bg-muted skeleton mb-2" />
          <div className="h-4 w-64 rounded bg-muted skeleton" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const { overview, dailyActivity, providerUsage, agentUsage, hourlyDistribution, topConversations, planUsage } = data;

  // ─── Overview cards ──────────────────────────────────────────
  const stats = [
    {
      title: 'Total Messages',
      value: formatNumber(overview.totalMessages),
      growth: overview.messagesGrowth,
      icon: MessageSquare,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40',
    },
    {
      title: 'Total Tokens',
      value: formatTokens(overview.totalTokens),
      growth: overview.tokensGrowth,
      icon: Coins,
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
    },
    {
      title: 'Conversations',
      value: formatNumber(overview.totalConversations),
      growth: overview.conversationsGrowth,
      icon: Activity,
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40',
    },
    {
      title: 'Temps de réponse',
      value: `${overview.avgResponseTime}ms`,
      growth: null,
      icon: Clock,
      gradient: 'from-cyan-500 to-blue-600',
      bg: 'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40',
    },
  ];

  // ─── Custom tooltip ──────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('fr-FR') : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // ─── Progress bar helper for plan usage ──────────────────────
  function PlanProgress({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
    const isUnlimited = limit === -1;
    const pct = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const pctDisplay = isUnlimited ? 0 : Math.round(pct);
    const danger = !isUnlimited && pct > 80;
    const warn = !isUnlimited && pct > 60 && pct <= 80;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="font-semibold text-xs">
            {formatNumber(used)} / {isUnlimited ? '∞' : formatNumber(limit)}
          </span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${isUnlimited ? Math.min(used / 10, 100) : pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              danger
                ? 'bg-red-500'
                : warn
                ? 'bg-amber-500'
                : color
            }`}
          />
        </div>
        {!isUnlimited && (
          <p className="text-[10px] text-muted-foreground text-right">
            {pctDisplay}% utilisé
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-emerald-500" />
              <span className="gradient-text">Analytics</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivez l&apos;utilisation et les performances de vos agents IA
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs px-3 h-8 rounded-lg transition-all ${
                  period === p
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setPeriod(p)}
              >
                {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Overview Cards ─────────────────────────────────── */}
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
                      <p className="text-xs text-muted-foreground font-medium">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      {stat.growth !== null && (
                        <div className="flex items-center gap-1 mt-1">
                          {stat.growth >= 0 ? (
                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                          )}
                          <span
                            className={`text-xs ${
                              stat.growth >= 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}
                          >
                            {stat.growth >= 0 ? '+' : ''}
                            {stat.growth}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-black/10`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Charts Row 1: Daily Activity + Provider Usage ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Daily Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="glass glow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Activité quotidienne
                  </CardTitle>
                  <CardDescription>
                    Messages et tokens par jour
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {formatNumber(overview.totalMessages)} messages
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {dailyActivity.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyActivity}>
                      <defs>
                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val: string) => {
                          const d = new Date(val);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val: number) => formatTokens(val)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="messages"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorMessages)"
                        name="Messages"
                        dot={false}
                        activeDot={{ fill: '#10b981', strokeWidth: 2, stroke: '#fff', r: 4 }}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="tokens"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTokens)"
                        name="Tokens"
                        dot={false}
                        activeDot={{ fill: '#f59e0b', strokeWidth: 2, stroke: '#fff', r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée d&apos;activité disponible
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Provider Usage (Pie Chart) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass glow-card h-full">
            <CardHeader>
              <CardTitle className="text-base">Fournisseurs IA</CardTitle>
              <CardDescription>Répartition par provider</CardDescription>
            </CardHeader>
            <CardContent>
              {providerUsage.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={providerUsage.map((p) => ({
                          name: p.provider,
                          value: p.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {providerUsage.map((entry, idx) => (
                          <Cell
                            key={entry.provider}
                            fill={
                              PROVIDER_COLORS[entry.provider] ||
                              PIE_COLORS[idx % PIE_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée de provider
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Charts Row 2: Hourly + Agent Usage ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="glass glow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                Distribution horaire
              </CardTitle>
              <CardDescription>
                Quand êtes-vous le plus actif ?
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyDistribution.some((h) => h.count > 0) ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyDistribution}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val: number) => `${val}h`}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Messages"
                        radius={[4, 4, 0, 0]}
                        fill="#10b981"
                        maxBarSize={24}
                      >
                        {hourlyDistribution.map((entry, idx) => {
                          const maxCount = Math.max(
                            ...hourlyDistribution.map((h) => h.count)
                          );
                          const isPeak = entry.count === maxCount && entry.count > 0;
                          return (
                            <Cell
                              key={idx}
                              fill={isPeak ? '#10b981' : '#10b98140'}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée horaire disponible
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Performance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass glow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500" />
                Performance des Agents
              </CardTitle>
              <CardDescription>
                Utilisation par agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentUsage.length > 0 ? (
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium text-xs">Agent</th>
                        <th className="text-left py-2 font-medium text-xs">Type</th>
                        <th className="text-right py-2 font-medium text-xs">Messages</th>
                        <th className="text-right py-2 font-medium text-xs">Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentUsage.map((agent) => (
                        <tr
                          key={agent.agentId}
                          className="border-b last:border-0 hover:bg-accent/50 transition-colors"
                        >
                          <td className="py-2.5 font-medium text-xs">
                            {agent.agentName}
                          </td>
                          <td className="py-2.5 text-xs">
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                            >
                              {agent.agentType}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right text-xs font-semibold">
                            {formatNumber(agent.messages)}
                          </td>
                          <td className="py-2.5 text-right text-xs text-muted-foreground">
                            {formatTokens(agent.tokens)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée d&apos;agent disponible
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Charts Row 3: Top Conversations + Plan Usage ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Conversations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="glass glow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                Conversations actives
              </CardTitle>
              <CardDescription>
                Les conversations les plus actives
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topConversations.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {topConversations.map((conv, idx) => (
                    <div
                      key={conv.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {conv.agentName}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] flex-shrink-0"
                      >
                        {conv.messageCount} msg
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune conversation active
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass glow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                Utilisation du Plan
              </CardTitle>
              <CardDescription>
                Votre consommation par rapport aux limites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <PlanProgress
                label="Tokens"
                used={planUsage.tokensUsed}
                limit={planUsage.tokensLimit}
                color="bg-emerald-500"
              />
              <PlanProgress
                label="Agents"
                used={planUsage.agentsUsed}
                limit={planUsage.agentsLimit}
                color="bg-amber-500"
              />
              <PlanProgress
                label="Conversations"
                used={planUsage.conversationsUsed}
                limit={planUsage.conversationsLimit}
                color="bg-violet-500"
              />
              <PlanProgress
                label="Documents"
                used={planUsage.documentsUsed}
                limit={planUsage.documentsLimit}
                color="bg-cyan-500"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
