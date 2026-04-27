'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Users,
  Crown,
  Shield,
  UserCheck,
  Trash2,
  LogOut,
  Loader2,
  ArrowLeft,
  UserPlus,
  Mail,
  RefreshCw,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================
// TYPES
// ============================================

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  plan: { name: string; displayName: string } | null;
  memberCount: number;
  role: string;
  joinedAt: string | null;
  createdAt: string;
}

interface MemberInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  invitedAt: string;
  joinedAt: string | null;
}

interface OrgDetail extends OrgInfo {
  members: MemberInfo[];
  updatedAt: string;
}

// ============================================
// HELPERS
// ============================================

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400 text-[10px]">
          <Crown className="h-2.5 w-2.5 mr-0.5" /> Propriétaire
        </Badge>
      );
    case 'admin':
      return (
        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-400 text-[10px]">
          <Shield className="h-2.5 w-2.5 mr-0.5" /> Admin
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px]">
          <UserCheck className="h-2.5 w-2.5 mr-0.5" /> Membre
        </Badge>
      );
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'owner': return 'Propriétaire';
    case 'admin': return 'Administrateur';
    default: return 'Membre';
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OrganizationsView() {
  const { token, user } = useAppStore();
  const [organizations, setOrganizations] = useState<OrgInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<OrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create org dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Invite member dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Edit org name
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Fetch organizations list
  const fetchOrganizations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
      }
    } catch (_e) {
      toast.error('Erreur lors du chargement des organisations');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch org detail
  const fetchOrgDetail = useCallback(async (orgId: string) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrg(data.organization);
      } else {
        toast.error('Erreur lors du chargement de l\'organisation');
        setSelectedOrg(null);
      }
    } catch (_e) {
      toast.error('Erreur serveur');
      setSelectedOrg(null);
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Create organization
  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: createName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création');
        return;
      }
      toast.success(`Organisation "${data.organization.name}" créée`);
      setCreateName('');
      setCreateOpen(false);
      fetchOrganizations();
    } catch (_e) {
      toast.error('Erreur de connexion');
    } finally {
      setCreateLoading(false);
    }
  };

  // Invite member
  const handleInvite = async () => {
    if (!selectedOrg || !inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de l\'invitation');
        return;
      }
      toast.success(`${data.member.name} ajouté(e) en tant que ${getRoleLabel(inviteRole)}`);
      setInviteEmail('');
      setInviteRole('member');
      setInviteOpen(false);
      fetchOrgDetail(selectedOrg.id);
    } catch (_e) {
      toast.error('Erreur de connexion');
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!selectedOrg) return;
    if (!confirm(`Retirer ${memberName} de l'organisation ?`)) return;
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success(`${memberName} a été retiré(e)`);
      fetchOrgDetail(selectedOrg.id);
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  // Change member role
  const handleChangeRole = async (userId: string, newRole: string, memberName: string) => {
    if (!selectedOrg) return;
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success(`Rôle de ${memberName} changé en ${getRoleLabel(newRole)}`);
      fetchOrgDetail(selectedOrg.id);
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  // Leave organization
  const handleLeave = async () => {
    if (!selectedOrg || !user) return;
    if (!confirm(`Quitter l'organisation "${selectedOrg.name}" ?`)) return;
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Vous avez quitté l\'organisation');
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  // Delete organization
  const handleDeleteOrg = async () => {
    if (!selectedOrg) return;
    if (!confirm(`Supprimer définitivement l'organisation "${selectedOrg.name}" et toutes ses données ? Cette action est irréversible.`)) return;
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Organisation supprimée');
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (_e) {
      toast.error('Erreur serveur');
    }
  };

  // Update org name
  const handleUpdateName = async () => {
    if (!selectedOrg || !newName.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Nom de l\'organisation mis à jour');
      setEditingName(false);
      fetchOrgDetail(selectedOrg.id);
      fetchOrganizations();
    } catch (_e) {
      toast.error('Erreur serveur');
    } finally {
      setEditLoading(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 rounded bg-muted skeleton mb-2" />
          <div className="h-4 w-64 rounded bg-muted skeleton" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl bg-muted skeleton" />
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // DETAIL VIEW
  // ============================================

  if (selectedOrg) {
    const canManage = selectedOrg.userRole === 'owner' || selectedOrg.userRole === 'admin';
    const isOwner = selectedOrg.userRole === 'owner';

    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Back button */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedOrg(null)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Retour aux organisations
          </Button>
        </motion.div>

        {detailLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Org Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        {editingName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="h-8 w-56 text-lg font-bold"
                              placeholder="Nom de l'organisation"
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUpdateName} disabled={editLoading}>
                              {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-500" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingName(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">{selectedOrg.name}</h1>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => { setNewName(selectedOrg.name); setEditingName(true); }}
                              >
                                <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-muted-foreground">@{selectedOrg.slug}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground">{selectedOrg.members.length} membre(s)</span>
                          {selectedOrg.plan && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <Badge variant="outline" className="text-[10px]">{selectedOrg.plan.displayName}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(selectedOrg.userRole)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Members Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-500" />
                        Membres
                        <Badge variant="secondary" className="text-[10px]">{selectedOrg.members.length}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Gérez les membres et leurs rôles
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-1.5">
                              <UserPlus className="h-3.5 w-3.5" />
                              Inviter
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Inviter un membre</DialogTitle>
                              <DialogDescription>
                                Ajoutez un utilisateur à l&apos;organisation par son email
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="utilisateur@exemple.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="pl-9"
                                    type="email"
                                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Rôle</label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">
                                      <div className="flex items-center gap-2">
                                        <UserCheck className="h-3.5 w-3.5" />
                                        Membre
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                      <div className="flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5" />
                                        Administrateur
                                      </div>
                                    </SelectItem>
                                    {isOwner && (
                                      <SelectItem value="owner">
                                        <div className="flex items-center gap-2">
                                          <Crown className="h-3.5 w-3.5" />
                                          Propriétaire
                                        </div>
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                                Annuler
                              </Button>
                              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteLoading}>
                                {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                                Ajouter
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchOrgDetail(selectedOrg.id)}
                        disabled={detailLoading}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${detailLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {selectedOrg.members.map((member) => {
                      const isSelf = member.userId === user?.id;
                      const canChangeRole = isOwner && !isSelf;
                      const canRemove = canManage && !isSelf;
                      // Allow self-removal (leave) always
                      const showRemove = canRemove || isSelf;

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border hover:bg-accent/50 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-semibold">
                                  {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isSelf && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">
                                  {member.name}
                                  {isSelf && <span className="text-muted-foreground text-xs ml-1">(vous)</span>}
                                </p>
                                {getRoleBadge(member.role)}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{member.email}</span>
                                <span>·</span>
                                <span>Rejoint le {formatDate(member.joinedAt || member.invitedAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-12 sm:ml-0">
                            {/* Role dropdown — only owner can change */}
                            {canChangeRole ? (
                              <Select
                                value={member.role}
                                onValueChange={(role) => handleChangeRole(member.userId, role, member.name)}
                              >
                                <SelectTrigger className="w-32 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">
                                    <div className="flex items-center gap-1.5">
                                      <Crown className="h-3 w-3 text-amber-500" /> Propriétaire
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-1.5">
                                      <Shield className="h-3 w-3 text-violet-500" /> Admin
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="member">
                                    <div className="flex items-center gap-1.5">
                                      <UserCheck className="h-3 w-3" /> Membre
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">{getRoleLabel(member.role)}</span>
                            )}

                            {/* Remove button */}
                            {showRemove && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                onClick={() => handleRemoveMember(member.userId, member.name)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {selectedOrg.members.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground text-sm">Aucun membre</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-red-600 dark:text-red-400">Zone de danger</CardTitle>
                  <CardDescription className="text-xs">Actions irréversibles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {selectedOrg.userRole !== 'owner' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/50"
                        onClick={handleLeave}
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        Quitter l&apos;organisation
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/50"
                        onClick={handleDeleteOrg}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Supprimer l&apos;organisation
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    );
  }

  // ============================================
  // LIST VIEW
  // ============================================

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                <span className="gradient-text">Organisations</span>
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Gérez vos équipes et organisations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchOrganizations}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Actualiser
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nouvelle organisation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une organisation</DialogTitle>
                  <DialogDescription>
                    Créez une nouvelle organisation pour collaborer avec votre équipe
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom de l&apos;organisation</label>
                    <Input
                      placeholder="Mon organisation"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Un identifiant unique sera automatiquement généré à partir du nom
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={!createName.trim() || createLoading}>
                    {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Building2 className="h-4 w-4 mr-1.5" />}
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Building2 className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune organisation</h3>
                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                  Créez votre première organisation pour commencer à collaborer avec votre équipe
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Créer une organisation
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org, index) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group"
                onClick={() => fetchOrgDetail(org.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/15 group-hover:shadow-lg group-hover:shadow-emerald-500/25 transition-shadow flex-shrink-0">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate">{org.name}</h3>
                        {getRoleBadge(org.role)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">@{org.slug}</p>
                      <Separator className="my-3" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{org.memberCount} membre{org.memberCount !== 1 ? 's' : ''}</span>
                        </div>
                        {org.plan && (
                          <Badge variant="outline" className="text-[10px]">{org.plan.displayName}</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                        Créée le {formatDate(org.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
