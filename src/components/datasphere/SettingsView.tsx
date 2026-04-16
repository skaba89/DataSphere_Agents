'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export default function SettingsView() {
  const { user } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'DS';

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
              Gérez votre profil et vos préférences
            </p>
          </div>
        </div>
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
                  <p className="text-sm text-muted-foreground">Plateforme d&apos;Agents IA Premium</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0">
                    1.0.0
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
                    Z-AI SDK
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
