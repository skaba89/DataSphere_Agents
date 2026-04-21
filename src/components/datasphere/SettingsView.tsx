'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import {
  Settings,
  Key,
  User,
  Lock,
  Sun,
  Moon,
  Monitor,
  Loader2,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const providerConfig: Record<string, { name: string; icon: string; color: string; models: string[] }> = {
  openai: { name: 'OpenAI', icon: '🤖', color: 'from-green-500 to-emerald-600', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  anthropic: { name: 'Anthropic', icon: '🧠', color: 'from-orange-500 to-amber-600', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
  groq: { name: 'Groq', icon: '⚡', color: 'from-violet-500 to-purple-600', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  qwen: { name: 'Qwen', icon: '🔮', color: 'from-cyan-500 to-blue-600', models: ['qwen-max', 'qwen-plus', 'qwen-turbo'] },
  openrouter: { name: 'OpenRouter', icon: '🌐', color: 'from-rose-500 to-pink-600', models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct'] },
};

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
  const { token, user, setAuth } = useAppStore();
  const { theme, setTheme } = useTheme();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/apikeys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.keys) setApiKeys(data.keys);
    } catch {
      toast.error('Erreur lors du chargement des clés API');
    } finally {
      setLoadingKeys(false);
    }
  }, [token]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setAuth(data.user, token!);
        toast.success('Profil mis à jour');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Mot de passe mis à jour');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast.error('Veuillez entrer une clé API');
      return;
    }
    setSavingKey(true);
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKeyInput,
          model: selectedModel || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Clé API sauvegardée');
        setApiKeyInput('');
        fetchApiKeys();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteApiKey = async (provider: string) => {
    try {
      const res = await fetch(`/api/apikeys?provider=${provider}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Clé API supprimée');
        fetchApiKeys();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez votre compte et vos clés API</p>
      </div>

      <Tabs defaultValue="apikeys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apikeys" className="text-xs sm:text-sm">
            <Key className="h-3.5 w-3.5 mr-1.5" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs sm:text-sm">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm">
            <Sun className="h-3.5 w-3.5 mr-1.5" />
            Apparence
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="space-y-6">
          {/* Current keys */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clés API configurées</CardTitle>
                <CardDescription>
                  Vos clés API pour les fournisseurs IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingKeys ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucune clé API configurée
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajoutez une clé ci-dessous pour utiliser les fournisseurs IA
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{key.providerIcon}</span>
                          <div>
                            <p className="text-sm font-medium">{key.providerName}</p>
                            <p className="text-xs text-muted-foreground">{key.keyMasked}</p>
                          </div>
                          {key.model && (
                            <Badge variant="secondary" className="text-[10px]">
                              {key.model}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteApiKey(key.provider)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Add new key */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ajouter une clé API</CardTitle>
                <CardDescription>
                  Configurez un fournisseur IA avec votre clé API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fournisseur</Label>
                  <Select value={selectedProvider} onValueChange={(v) => { setSelectedProvider(v); setSelectedModel(''); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(providerConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Clé API</Label>
                  <Input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Modèle (optionnel)</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerConfig[selectedProvider]?.models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSaveApiKey}
                  disabled={savingKey || !apiKeyInput.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  {savingKey ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder la clé
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations du profil</CardTitle>
                <CardDescription>Modifiez vos informations personnelles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Changer le mot de passe</CardTitle>
                <CardDescription>Modifiez votre mot de passe</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-pw">Mot de passe actuel</Label>
                    <div className="relative">
                      <Input
                        id="current-pw"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={savingPassword}
                    variant="outline"
                  >
                    {savingPassword ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Changer le mot de passe
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Apparence</CardTitle>
                <CardDescription>Personnalisez le thème de l&apos;interface</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Clair', icon: Sun },
                    { value: 'dark', label: 'Sombre', icon: Moon },
                    { value: 'system', label: 'Système', icon: Monitor },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'border-transparent hover:border-muted-foreground/25'
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          }`}
                        />
                        <span className={`text-sm font-medium ${isActive ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
