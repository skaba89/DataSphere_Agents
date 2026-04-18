'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Bot,
  Users,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  totalRevenue: number;
  totalTransactions: number;
  todayRevenue: number;
  todayTransactions: number;
  chartData: { month: string; total: number }[];
  userCount: number;
  agentCount: number;
  documentCount: number;
  recentTransactions: {
    id: string;
    amount: number;
    phone: string;
    status: string;
    provider: string;
    createdAt: string;
    user?: { name: string; email: string };
  }[];
}

function formatGNF(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' GNF';
}

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

export default function DashboardView() {
  const { user, token } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // silent error
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  const stats = data
    ? [
        {
          title: 'Revenu Total',
          value: formatGNF(data.totalRevenue),
          change: '+12.5%',
          icon: DollarSign,
          color: 'emerald',
        },
        {
          title: 'Transactions Aujourd\'hui',
          value: data.todayTransactions.toString(),
          change: `${formatGNF(data.todayRevenue)}`,
          icon: TrendingUp,
          color: 'teal',
        },
        {
          title: 'Agents Actifs',
          value: data.agentCount.toString(),
          change: 'IA',
          icon: Bot,
          color: 'amber',
        },
        {
          title: 'Utilisateurs',
          value: data.userCount.toString(),
          change: `${data.documentCount} docs`,
          icon: Users,
          color: 'violet',
        },
      ]
    : [];

  const colorMap: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 lg:p-8 space-y-6"
    >
      {/* Welcome Message */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold">
          Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Voici un aperçu de votre plateforme DataSphere aujourd&apos;hui.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => {
              const colors = colorMap[stat.color];
              const Icon = stat.icon;
              return (
                <motion.div key={stat.title} variants={itemVariants}>
                  <Card className={`border-0 ${colors.bg} hover:shadow-md transition-shadow`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold mt-1">{stat.value}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {stat.change}
                            </span>
                          </div>
                        </div>
                        <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                          <Icon className={`h-6 w-6 ${colors.iconColor}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {/* Chart */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Revenus Mensuels</CardTitle>
            <CardDescription>Évolution des revenus sur les 6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : data && data.chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-emerald-100 dark:stroke-emerald-900/30" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(val) => {
                        const d = new Date(val + '-01');
                        return d.toLocaleDateString('fr-FR', { month: 'short' });
                      }}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <RechartsTooltip
                      formatter={(value: number) => [formatGNF(value), 'Revenu']}
                      labelFormatter={(label) => {
                        const d = new Date(label + '-01');
                        return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
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
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                Aucune donnée de revenu disponible
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Transactions Récentes</CardTitle>
            <CardDescription>Les dernières transactions sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data && data.recentTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {tx.user?.name || 'N/A'}
                        </TableCell>
                        <TableCell>{tx.phone}</TableCell>
                        <TableCell className="font-semibold">{formatGNF(tx.amount)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.status === 'success' ? 'default' : 'secondary'}
                            className={
                              tx.status === 'success'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                            }
                          >
                            {tx.status === 'success' ? 'Réussi' : 'En attente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucune transaction récente
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
