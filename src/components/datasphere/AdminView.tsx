'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Users,
  Bot,
  MessageSquare,
  DollarSign,
  FileText,
  Shield,
  Loader2,
  Trash2,
  UserCheck,
  UserX,
  Crown,
  Search,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface AdminStats {
  users: number;
  agents: number;
  conversations: number;
  transactions: number;
  documents: number;
  revenue: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count?: {
    conversations: number;
    documents: number;
  };
}

export default function AdminView() {
  const { token, user } = useAppStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    fetchData();
  }, [token, user]);

  const fetchData = async () => {
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

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        toast.success(`Rôle changé en "${newRole}"`);
        fetchData();
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
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        toast.success('Utilisateur supprimé');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  if (user?.role !== 'admin') {
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

  const statCards = stats ? [
    { title: 'Utilisateurs', value: stats.users, icon: Users, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
    { title: 'Agents IA', value: stats.agents, icon: Bot, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { title: 'Conversations', value: stats.conversations, icon: MessageSquare, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { title: 'Revenu total', value: `${(stats.revenue || 0).toLocaleString('fr-FR')} GNF`, icon: DollarSign, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    { title: 'Documents', value: stats.documents, icon: FileText, color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
    { title: 'Transactions', value: stats.transactions, icon: Activity, color: 'from-orange-500 to-red-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  ] : [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Panneau d'administration</h1>
            <p className="text-muted-foreground text-sm">Gérez les utilisateurs, les agents et la plateforme</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`${stat.bg}`}>
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

      {/* User Management */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Gestion des utilisateurs
                </CardTitle>
                <CardDescription>{users.length} utilisateurs inscrits</CardDescription>
              </div>
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
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{u.name}</p>
                        <Badge
                          variant={u.role === 'admin' ? 'default' : 'secondary'}
                          className={`text-[10px] ${
                            u.role === 'admin'
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-400'
                              : ''
                          }`}
                        >
                          {u.role === 'admin' ? <><Crown className="h-2.5 w-2.5 mr-0.5" /> Admin</> : 'Utilisateur'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-12 sm:ml-0">
                    <span className="text-xs text-muted-foreground">
                      {u._count?.conversations || 0} conv · {u._count?.documents || 0} docs
                    </span>
                    {u.role !== 'admin' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleChangeRole(u.id, 'admin')}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Admin
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {u.role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleChangeRole(u.id, 'user')}
                      >
                        <UserX className="h-3 w-3 mr-1" />
                        Rétrograder
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
