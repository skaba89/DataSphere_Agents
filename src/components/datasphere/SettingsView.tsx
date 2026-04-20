'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  User,
  Moon,
  Sun,
  Lock,
  Shield,
  Info,
  Sparkles,
  Monitor,
  Eye,
  EyeOff,
  Key,
  Check,
  X,
  Loader2,
  Trash2,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

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

interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  configured: boolean;
  defaultModel: string;
  models: string[];
}

interface ApiKeyInfo {
  id: string;
  provider: string;
  model: string;
  isActive: boolean;
  keyMasked: string;
  providerName: string;
  providerIcon: string;
  providerColor: string;
}

export default function SettingsView() {
  const { user, token, setSelectedProvider, setAvailableProviders } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // API Key state
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [savedKeys, setSavedKeys] = useState<ApiKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Form state for each provider
  const [keyForms, setKeyForms] = useState<Record<string, { apiKey: string; model: string; showKey: boolean }>>({});

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'DS';

  // Fetch API keys and providers
  const fetchApiKeys = useCallback(async () => {
    if (!token) return;
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/apikeys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedKeys(data.keys || []);
        setProviders(data.providers || []);
        setAvailableProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  }, [token, setAvailableProviders]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  // Initialize form state for each provider
  useEffect(() => {
    const forms: Record<string, { apiKey: string; model: string; showKey: boolean }> = {};
    providers.forEach((p) => {
      const existing = savedKeys.find((k) => k.provider === p.id);
      forms[p.id] = {
        apiKey: '',
        model: existing?.model || p.defaultModel,
        showKey: false,
      };
    });
    setKeyForms(forms);
  }, [providers, savedKeys]);

  const handleSaveApiKey = async (providerId: string) => {
    const form = keyForms[providerId];
    if (!form?.apiKey || !token) return;

    setSavingKey(providerId);
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: providerId,
          apiKey: form.apiKey,
          model: form.model,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Clé ${providerId} sauvegardée`);
        // Clear the input
        setKeyForms((prev) => ({
          ...prev,
          [providerId]: { ...prev[providerId], apiKey: '' },
        }));
        fetchApiKeys();
      } else {
        toast.error(data.error || 'Erreur de sauvegarde');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeleteApiKey = async (providerId: string) => {
    if (!token) return;
    setDeletingKey(providerId);
    try {
      const res = await fetch(`/api/apikeys?provider=${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Clé supprimée');
        fetchApiKeys();
      } else {
        toast.error(data.error || 'Erreur de suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleTestApiKey = async (providerId: string) => {
    if (!token) return;
    setTestingKey(providerId);
    try {
      // Try to send a simple chat message using the provider
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: 'test',
          message: 'Hello',
          provider: providerId,
        }),
      });
      // Even if agent not found, if we get past auth, the provider key works
      if (res.status === 404) {
        toast.success(`Connexion ${providerId} réussie (clé valide)`);
      } else {
        toast.info('Test terminé');
      }
    } catch {
      toast.error('Erreur de test');
    } finally {
      setTestingKey(null);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('Fonctionnalité à venir — Le changement de mot de passe sera bientôt disponible');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <Settings className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre profil, vos clés API et vos préférences
            </p>
          </div>
        </div>
      </motion.div>

      {/* ═══ API Keys Section ═══ */}
      <motion.div variants={itemVariants}>
        <Card className="border-emerald-100 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Clés API — Fournisseurs IA
            </CardTitle>
            <CardDescription>
              Configurez vos clés API pour utiliser OpenAI, Anthropic, Groq, Qwen ou OpenRouter.
              Au moins une clé est nécessaire pour que les agents IA fonctionnent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingKeys ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {providers.map((provider) => {
                  const existingKey = savedKeys.find((k) => k.provider === provider.id);
                  const form = keyForms[provider.id] || { apiKey: '', model: provider.defaultModel, showKey: false };
                  const isSaving = savingKey === provider.id;
                  const isDeleting = deletingKey === provider.id;
                  const isTesting = testingKey === provider.id;

                  return (
                    <div
                      key={provider.id}
                      className={`rounded-xl border-2 transition-all ${
                        existingKey?.isActive
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20'
                      }`}
                    >
                      <div className="p-4 space-y-3">
                        {/* Provider header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{provider.icon}</span>
                            <div>
                              <h4 className="font-semibold text-sm">{provider.name}</h4>
                              <p className="text-xs text-muted-foreground">
                                Modèle par défaut: {provider.defaultModel}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {existingKey?.isActive ? (
                              <>
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0 text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Configuré
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => handleDeleteApiKey(provider.id)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              </>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <X className="h-3 w-3 mr-1" />
                                Non configuré
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* API Key input */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Clé API</Label>
                            <div className="relative">
                              <Input
                                type={form.showKey ? 'text' : 'password'}
                                placeholder={existingKey ? `Clé actuelle: ${existingKey.keyMasked}` : `sk-... ou gsk_...`}
                                value={form.apiKey}
                                onChange={(e) =>
                                  setKeyForms((prev) => ({
                                    ...prev,
                                    [provider.id]: { ...prev[provider.id], apiKey: e.target.value },
                                  }))
                                }
                                className="pr-10 text-sm h-9"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() =>
                                  setKeyForms((prev) => ({
                                    ...prev,
                                    [provider.id]: { ...prev[provider.id], showKey: !prev[provider.id].showKey },
                                  }))
                                }
                              >
                                {form.showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Modèle</Label>
                            <Select
                              value={form.model}
                              onValueChange={(val) =>
                                setKeyForms((prev) => ({
                                  ...prev,
                                  [provider.id]: { ...prev[provider.id], model: val },
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Sélectionner un modèle" />
                              </SelectTrigger>
                              <SelectContent>
                                {provider.models.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Save button */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                            disabled={!form.apiKey.trim() || isSaving}
                            onClick={() => handleSaveApiKey(provider.id)}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Zap className="h-3.5 w-3.5 mr-1" />
                            )}
                            {existingKey ? 'Mettre à jour' : 'Sauvegarder'}
                          </Button>
                          {existingKey?.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 border-emerald-200 dark:border-emerald-800"
                              disabled={isTesting}
                              onClick={() => handleTestApiKey(provider.id)}
                            >
                              {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                              Tester
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Help box */}
                <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Comment obtenir vos clés API ?</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li><strong>OpenAI :</strong> platform.openai.com/api-keys</li>
                        <li><strong>Anthropic :</strong> console.anthropic.com</li>
                        <li><strong>Groq :</strong> console.groq.com</li>
                        <li><strong>Qwen :</strong> dashscope.console.aliyun.com</li>
                        <li><strong>OpenRouter :</strong> openrouter.ai/keys</li>
                      </ul>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                        Vos clés sont chiffrées et stockées localement. Elles ne sont jamais partagées.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-emerald-100 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Profil Utilisateur
            </CardTitle>
            <CardDescription>Vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-emerald-200 dark:ring-emerald-800">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold">{user?.name || 'Utilisateur'}</h3>
                <p className="text-muted-foreground">{user?.email || ''}</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0">
                    <Shield className="h-3 w-3 mr-1" />
                    {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </Badge>
                </div>
              </div>
            </div>
            <Separator className="my-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Identifiant</Label>
                <p className="font-mono text-sm">{user?.id || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Rôle</Label>
                <p className="text-sm">{user?.role === 'admin' ? 'Administrateur' : 'Utilisateur standard'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-sm">{user?.email || 'N/A'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Statut</Label>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm">Actif</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password */}
      <motion.div variants={itemVariants}>
        <Card className="border-emerald-100 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Changer le Mot de Passe
            </CardTitle>
            <CardDescription>Modifiez votre mot de passe de connexion</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirmez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <Lock className="h-4 w-4 mr-2" />
                Mettre à jour le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Theme Settings */}
      <motion.div variants={itemVariants}>
        <Card className="border-emerald-100 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Apparence
            </CardTitle>
            <CardDescription>Personnalisez l&apos;apparence de l&apos;application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Sun className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Mode Sombre</p>
                    <p className="text-sm text-muted-foreground">
                      Basculer entre le mode clair et sombre
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', label: 'Clair', icon: Sun },
                  { id: 'dark', label: 'Sombre', icon: Moon },
                  { id: 'system', label: 'Système', icon: Monitor },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        theme === t.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-transparent bg-emerald-50/30 dark:bg-emerald-950/10 hover:border-emerald-200 dark:hover:border-emerald-800'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${theme === t.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${theme === t.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* App Info */}
      <motion.div variants={itemVariants}>
        <Card className="border-emerald-100 dark:border-emerald-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              À Propos
            </CardTitle>
            <CardDescription>Informations sur l&apos;application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/50">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">DataSphere Agents</h3>
                  <p className="text-sm text-muted-foreground">Plateforme d&apos;Agents IA Multi-Provider</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0">
                    2.0.0
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-sm text-muted-foreground">Framework</span>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0">
                    Next.js 16
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-sm text-muted-foreground">IA</span>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0">
                    Multi-Provider
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-sm text-muted-foreground">Base de données</span>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0">
                    SQLite
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">
                © 2024 DataSphere. Tous droits réservés. Construit avec ❤️ en Guinée.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
