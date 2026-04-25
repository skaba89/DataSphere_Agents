'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Users, Bot, MessageSquare, DollarSign, FileText, Shield, Loader2,
  Trash2, UserCheck, UserX, Crown, Search, TrendingUp, Activity,
  BarChart3, Eye, EyeOff, Ban, CheckCircle2, AlertTriangle,
  Clock, Zap, Star, ChevronDown, Globe, Key, ScrollText,
  LayoutGrid, List, ArrowUpDown, Download, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

// ============================================
// TYPES
// ============================================

interface AdminStats {
  users: number;
  agents: number;
  conversations: number;
  transactions: number;
  documents: number;
  revenue: number;
  activeSubscriptions: number;
  mrr: number;
  sharedAgents: number;
  platformApiKeys: number;
  usersByRole: { role: string; count: number }[];
  planCounts: Record<string, { count: number; displayName: string; revenue: number }>;
  usageByType: { eventType: string; tokens: number; count: number }[];
  totalTokens30d: number;
  totalEvents30d: number;
  newUsers30d: number;
  activeUsers7d: number;
  topAgents: { id: string; name: string; type: string; conversations: number; avgRating: number; totalConversations: number }[];
  dailySignups: { date: string; count: number }[];
  dailyConversations: { date: string; count: number }[];
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { conversations: number; documents: number; usageEvents: number };
  subscription?: { plan: { name: string; displayName: string } } | null;
}

interface AdminAgent {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  avgRating: number;
  ratingCount: number;
  totalConversations: number;
  creator?: { id: string; name: string; email: string } | null;
  _count: { conversations: number; ratings: number };
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string } | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString('fr-FR');
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'super_admin':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400 text-[10px]"><Shield className="h-2.5 w-2.5 mr-0.5" /> Super Admin</Badge>;
    case 'admin':
      return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-400 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" /> Admin</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">Utilisateur</Badge>;
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'user.login': 'Connexion',
    'user.register': 'Inscription',
    'user.role_change': 'Changement de rôle',
    'user.suspend': 'Suspension',
    'user.delete': 'Suppression',
    'agent.create': 'Création agent',
    'agent.disable': 'Désactivation agent',
    'agent.delete': 'Suppression agent',
    'billing.subscribe': 'Souscription',
    'billing.cancel': 'Annulation',
    'comparison.run': 'Comparaison IA',
  };
  return labels[action] || action;
}

function getActionColor(action: string): string {
  if (action.includes('delete') || action.includes('suspend')) return 'text-red-600 dark:text-red-400';
  if (action.includes('create') || action.includes('subscribe')) return 'text-emerald-600 dark:text-emerald-400';
  if (action.includes('role_change')) return 'text-amber-600 dark:text-amber-400';
  if (action.includes('login')) return 'text-blue-600 dark:text-blue-400';
  return 'text-muted-foreground';
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminView() {
  const { token, user } = useAppStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'super_admin') return;
    fetchAllData();
  }, [token, user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    } catch (_e) {
      toast.error('Erreur lors du chargement des données admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/admin/agents-manage', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (_e) {
      toast.error('Erreur chargement agents');
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/audit?limit=50', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (_e) {
      toast.error('Erreur chargement audit logs');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        toast.success(`Rôle changé en "${newRole}"`);
        fetchAllData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, isActive }),
      });
      if (res.ok) {
        toast.success(isActive ? 'Compte activé' : 'Compte suspendu');
        fetchAllData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Supprimer cet utilisateur et toutes ses données ?')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Utilisateur supprimé');
        fetchAllData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  const handleToggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/agents-manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentId, isActive }),
      });
      if (res.ok) {
        toast.success(isActive ? 'Agent activé' : 'Agent désactivé');
        fetchAgents();
      } else {
        toast.error('Erreur');
      }
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Supprimer cet agent et toutes ses conversations ?')) return;
    try {
      const res = await fetch(`/api/admin/agents-manage?id=${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Agent supprimé');
        fetchAgents();
      } else {
        toast.error('Erreur');
      }
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  // Tab change handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'agents' && agents.length === 0) fetchAgents();
    if (tab === 'audit' && auditLogs.length === 0) fetchAuditLogs();
  };

  // Access check
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
          <p className="text-muted-foreground">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.type.toLowerCase().includes(agentSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Panneau d'administration</h1>
            <p className="text-muted-foreground text-sm">Gérez les utilisateurs, agents et la plateforme</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAllData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualiser
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 text-xs">
            <Bot className="h-3.5 w-3.5" /> Agents
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <ScrollText className="h-3.5 w-3.5" /> Audit
          </TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { title: 'Utilisateurs', value: stats.users, icon: Users, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
                  { title: 'Agents IA', value: stats.agents, icon: Bot, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                  { title: 'Conversations', value: stats.conversations, icon: MessageSquare, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                  { title: 'MRR', value: `${stats.mrr.toLocaleString('fr-FR')} €`, icon: TrendingUp, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
                  { title: 'Documents', value: stats.documents, icon: FileText, color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
                  { title: 'Tokens 30j', value: formatNumber(stats.totalTokens30d), icon: Zap, color: 'from-orange-500 to-red-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className={stat.bg}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                              <Icon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-xs text-muted-foreground">{stat.title}</span>
                          </div>
                          <p className="text-xl font-bold">{stat.value}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Growth Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Nouveaux utilisateurs (30j)</p>
                          <p className="text-2xl font-bold text-emerald-600">{stats.newUsers30d}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Utilisateurs actifs (7j) : <span className="font-semibold text-foreground">{stats.activeUsers7d}</span></p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                          <Crown className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Abonnements actifs</p>
                          <p className="text-2xl font-bold text-amber-600">{stats.activeSubscriptions}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {Object.entries(stats.planCounts).map(([name, info]) => (
                          <Badge key={name} variant="secondary" className="text-[10px]">
                            {info.displayName}: {info.count}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Événements (30j)</p>
                          <p className="text-2xl font-bold text-violet-600">{formatNumber(stats.totalEvents30d)}</p>
                        </div>
                      </div>
                      <div className="space-y-1 mt-1">
                        {stats.usageByType.slice(0, 3).map(u => (
                          <div key={u.eventType} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{u.eventType}</span>
                            <span className="font-medium">{formatNumber(u.count)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Top Agents & Daily Signups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Top Agents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.topAgents.map((agent, i) => (
                          <div key={agent.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                              <div>
                                <p className="text-sm font-medium">{agent.name}</p>
                                <p className="text-xs text-muted-foreground">{agent.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">{agent.conversations} conv</span>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                <span>{agent.avgRating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {stats.topAgents.length === 0 && (
                          <p className="text-center text-muted-foreground py-4 text-sm">Aucun agent</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Inscriptions quotidiennes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {stats.dailySignups.slice(-7).map((d) => (
                          <div key={d.date} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16">{new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (d.count / Math.max(...stats.dailySignups.map(s => s.count), 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-6 text-right">{d.count}</span>
                          </div>
                        ))}
                        {stats.dailySignups.length === 0 && (
                          <p className="text-center text-muted-foreground py-4 text-sm">Aucune donnée</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Users by Role */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Répartition par rôle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 flex-wrap">
                      {stats.usersByRole.map(r => (
                        <div key={r.role} className="flex items-center gap-2">
                          {getRoleBadge(r.role)}
                          <span className="text-sm font-semibold">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </TabsContent>

        {/* ==================== USERS TAB ==================== */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Gestion des utilisateurs ({users.length})</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-colors gap-3 ${
                  !u.isActive ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={`bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-semibold ${!u.isActive ? 'grayscale' : ''}`}>
                        {u.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {u.isActive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{u.name}</p>
                      {getRoleBadge(u.role)}
                      {!u.isActive && <Badge variant="destructive" className="text-[10px]"><Ban className="h-2.5 w-2.5 mr-0.5" /> Suspendu</Badge>}
                      {u.subscription?.plan && (
                        <Badge variant="outline" className="text-[10px]">{u.subscription.plan.displayName}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{u.email}</span>
                      <span>·</span>
                      <span>{u._count.conversations} conv · {u._count.documents} docs</span>
                      {u.lastLoginAt && (
                        <>
                          <span>·</span>
                          <span>Dernière connexion : {formatDate(u.lastLoginAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-12 sm:ml-0">
                  {/* Role selector */}
                  <Select
                    value={u.role}
                    onValueChange={(role) => handleChangeRole(u.id, role)}
                    disabled={u.id === user?.id}
                  >
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilisateur</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {user?.role === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>

                  {/* Suspend/Activate */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleToggleActive(u.id, !u.isActive)}
                    disabled={u.id === user?.id}
                  >
                    {u.isActive ? (
                      <><Ban className="h-3 w-3 mr-1" /> Suspendre</>
                    ) : (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Activer</>
                    )}
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteUser(u.id)}
                    disabled={u.id === user?.id}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</p>
            )}
          </div>
        </TabsContent>

        {/* ==================== AGENTS TAB ==================== */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Gestion des agents ({agents.length || '...'})</h2>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un agent..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchAgents}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground mb-2">Aucun agent chargé</p>
              <Button variant="outline" size="sm" onClick={fetchAgents}>Charger les agents</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAgents.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-colors gap-3 ${
                    !a.isActive ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg bg-gradient-to-br ${
                      a.color === 'emerald' ? 'from-emerald-400 to-teal-500' :
                      a.color === 'blue' ? 'from-blue-400 to-indigo-500' :
                      a.color === 'violet' ? 'from-violet-400 to-purple-500' :
                      a.color === 'amber' ? 'from-amber-400 to-orange-500' :
                      a.color === 'rose' ? 'from-rose-400 to-pink-500' :
                      'from-gray-400 to-gray-500'
                    } ${!a.isActive ? 'grayscale' : ''}`}>
                      {a.icon === 'Bot' ? '🤖' : a.icon === 'Headphones' ? '🎧' : a.icon === 'TrendingUp' ? '📈' : a.icon === 'PenTool' ? '✍️' : a.icon === 'Code' ? '💻' : a.icon === 'Globe' ? '🌐' : '🤖'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{a.name}</p>
                        {a.isDefault && <Badge variant="secondary" className="text-[10px]">Défaut</Badge>}
                        {!a.isActive && <Badge variant="destructive" className="text-[10px]">Désactivé</Badge>}
                        <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{a._count.conversations} conv</span>
                        <span>·</span>
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-amber-500 fill-current" />
                          <span>{a.avgRating.toFixed(1)} ({a.ratingCount})</span>
                        </div>
                        {a.creator && (
                          <>
                            <span>·</span>
                            <span>Par {a.creator.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-12 sm:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleToggleAgent(a.id, !a.isActive)}
                    >
                      {a.isActive ? (
                        <><Ban className="h-3 w-3 mr-1" /> Désactiver</>
                      ) : (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Activer</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteAgent(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {filteredAgents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Aucun agent trouvé</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ==================== AUDIT TAB ==================== */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Journal d'audit</h2>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${auditLoading ? 'animate-spin' : ''}`} /> Rafraîchir
            </Button>
          </div>

          {auditLoading && auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">Aucune entrée d'audit</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Les actions administratives seront enregistrées ici</p>
            </div>
          ) : (
            <div className="space-y-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-sm">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${
                      log.action.includes('delete') ? 'bg-red-500' :
                      log.action.includes('create') ? 'bg-emerald-500' :
                      log.action.includes('role_change') ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      {log.entity && (
                        <Badge variant="outline" className="text-[10px]">{log.entity}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {log.user && <span>Par {log.user.name} ({log.user.email})</span>}
                      <span>·</span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                    {log.details && log.details !== '{}' && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono truncate">
                        {(() => { try { return JSON.stringify(JSON.parse(log.details)); } catch (_e) { return log.details; } })()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
