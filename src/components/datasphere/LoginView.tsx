'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, Github, Shield, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';

export default function LoginView() {
  const { setAuth, setCurrentView } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA state
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCodeInput, setBackupCodeInput] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Reset password state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleLoginSuccess = (user: { id: string; email: string; name: string; role: string; avatar?: string | null }, token: string) => {
    setAuth(user, token);
    setCurrentView('dashboard');
    toast.success(`Bienvenue, ${user.name} !`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur de connexion');
        return;
      }

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTempToken(data.tempToken);
        setLoading(false);
        return;
      }

      const token = data.token;
      const user = isLogin
        ? data.user
        : { id: data.id, email: data.email, name: data.name, role: data.role };

      handleLoginSuccess(user, token);
    } catch (_e) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async () => {
    const code = useBackupCode ? backupCodeInput.trim() : twoFactorCode;
    if (!code || code.length < (useBackupCode ? 8 : 6)) {
      setTwoFactorError(useBackupCode ? 'Veuillez entrer un code de secours valide' : 'Veuillez entrer un code à 6 chiffres');
      return;
    }

    setLoading(true);
    setTwoFactorError('');

    try {
      const res = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTwoFactorError(data.error || 'Code invalide');
        return;
      }

      handleLoginSuccess(data.user, data.token);
    } catch (_e) {
      setTwoFactorError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Check for reset password token in URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset-token');
      if (token) {
        setResetToken(token);
        setShowResetPassword(true);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLogin(true);
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur de connexion');
        return;
      }

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTempToken(data.tempToken);
        setLoading(false);
        return;
      }

      handleLoginSuccess(data.user, data.token);
    } catch (_e) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient-bg relative overflow-hidden particles">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/30 dark:bg-teal-800/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/20 dark:bg-emerald-900/10 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm sm:max-w-md mx-4 relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">
            DataSphere
          </h1>
          <p className="text-muted-foreground mt-1">Plateforme IA Premium</p>
        </motion.div>

        <Card className="border-0 shadow-xl shadow-emerald-500/5 glass">
          <AnimatePresence mode="wait">
            {requiresTwoFactor ? (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -ml-2"
                      onClick={() => {
                        setRequiresTwoFactor(false);
                        setTempToken('');
                        setTwoFactorCode('');
                        setBackupCodeInput('');
                        setTwoFactorError('');
                        setUseBackupCode(false);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-500" />
                      <CardTitle className="text-xl">
                        Authentification à deux facteurs
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className="mt-1 ml-9">
                    {useBackupCode
                      ? 'Entrez un de vos codes de secours'
                      : 'Entrez le code de votre application d\'authentification'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AnimatePresence mode="wait">
                    {!useBackupCode ? (
                      <motion.div
                        key="totp"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Code à 6 chiffres</Label>
                          <InputOTP
                            maxLength={6}
                            value={twoFactorCode}
                            onChange={(value) => {
                              setTwoFactorCode(value);
                              setTwoFactorError('');
                            }}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <Button
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                          disabled={loading || twoFactorCode.length < 6}
                          onClick={handleTwoFactorVerify}
                        >
                          {loading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                          ) : (
                            <>
                              Vérifier
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <div className="text-center">
                          <button
                            type="button"
                            className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            onClick={() => {
                              setUseBackupCode(true);
                              setTwoFactorError('');
                            }}
                          >
                            Utiliser un code de secours
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="backup"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="backup-code">Code de secours</Label>
                          <Input
                            id="backup-code"
                            value={backupCodeInput}
                            onChange={(e) => {
                              setBackupCodeInput(e.target.value.toUpperCase());
                              setTwoFactorError('');
                            }}
                            placeholder="Ex: ABCD1234"
                            className="text-center text-lg tracking-widest font-mono premium-input uppercase"
                            maxLength={8}
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            Entrez un des codes de secours que vous avez enregistrés lors de la configuration du 2FA
                          </p>
                        </div>

                        <Button
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                          disabled={loading || backupCodeInput.trim().length < 8}
                          onClick={handleTwoFactorVerify}
                        >
                          {loading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                          ) : (
                            <>
                              Vérifier
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <div className="text-center">
                          <button
                            type="button"
                            className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            onClick={() => {
                              setUseBackupCode(false);
                              setTwoFactorError('');
                            }}
                          >
                            Utiliser le code de l&apos;application
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {twoFactorError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-500 text-center"
                    >
                      {twoFactorError}
                    </motion.p>
                  )}
                </CardContent>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">
                    {isLogin ? 'Connexion' : 'Créer un compte'}
                  </CardTitle>
                  <CardDescription>
                    {isLogin
                      ? 'Entrez vos identifiants pour accéder à la plateforme'
                      : 'Créez votre compte pour commencer'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence mode="wait">
                      {!isLogin && (
                        <motion.div
                          key="name-field"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Label htmlFor="name">Nom complet</Label>
                          <div className="relative mt-1">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Votre nom"
                              className="pl-10"
                              required={!isLogin}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vous@exemple.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password">Mot de passe</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isLogin && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                          />
                          <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
                            Se souvenir de moi
                          </Label>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          onClick={() => {
                            setShowForgotPassword(true);
                            setForgotSent(false);
                            setForgotEmail('');
                            setForgotError('');
                          }}
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          {isLogin ? 'Se connecter' : 'Créer le compte'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Social login */}
                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Ou continuer avec
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <Button
                        variant="outline"
                        className="w-full gradient-border cursor-pointer hover:bg-accent hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                        type="button"
                        onClick={() => toast.info('Connexion Google bientôt disponible')}
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Google
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gradient-border cursor-pointer hover:bg-accent hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                        type="button"
                        onClick={() => toast.info('Connexion GitHub bientôt disponible')}
                      >
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors"
                    >
                      {isLogin
                        ? "Pas encore de compte ? Créer un compte"
                        : 'Déjà un compte ? Se connecter'}
                    </button>
                  </div>

                  {/* Demo credentials */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      Comptes de démonstration
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gradient-border hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400"
                        onClick={() => handleDemoLogin('admin@datasphere.ai', 'admin123')}
                        disabled={loading}
                      >
                        👑 Admin
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gradient-border hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400"
                        onClick={() => handleDemoLogin('demo@datasphere.ai', 'demo123')}
                        disabled={loading}
                      >
                        👤 Demo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Forgot Password Dialog */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Email envoyé !</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Si un compte existe avec cette adresse email, vous recevrez un lien de réinitialisation.
                    </p>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Retour à la connexion
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Mot de passe oublié ?</h3>
                      <p className="text-sm text-muted-foreground">
                        Entrez votre email pour recevoir un lien de réinitialisation
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="forgot-email">Adresse email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          setForgotError('');
                        }}
                        placeholder="vous@exemple.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {forgotError && (
                    <p className="text-sm text-red-500">{forgotError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                      disabled={forgotLoading || !forgotEmail}
                      onClick={async () => {
                        if (!forgotEmail) {
                          setForgotError('Veuillez entrer votre adresse email');
                          return;
                        }
                        setForgotLoading(true);
                        try {
                          const res = await fetch('/api/auth/forgot-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: forgotEmail }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            setForgotError(data.error || 'Erreur lors de l\'envoi');
                            return;
                          }
                          setForgotSent(true);
                          toast.success('Email de réinitialisation envoyé');
                        } catch (_e) {
                          setForgotError('Erreur de connexion au serveur');
                        } finally {
                          setForgotLoading(false);
                        }
                      }}
                    >
                      {forgotLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        'Envoyer le lien'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Password Dialog (shown when token in URL) */}
      <AnimatePresence>
        {showResetPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetPassword(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {resetDone ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Mot de passe réinitialisé !</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                    </p>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                    onClick={() => {
                      setShowResetPassword(false);
                      setIsLogin(true);
                    }}
                  >
                    Se connecter
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Nouveau mot de passe</h3>
                      <p className="text-sm text-muted-foreground">
                        Entrez votre nouveau mot de passe
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 caractères"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowResetPassword(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                      disabled={resetLoading || newPassword.length < 6}
                      onClick={async () => {
                        if (newPassword.length < 6) return;
                        setResetLoading(true);
                        try {
                          const res = await fetch('/api/auth/reset-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: resetToken, newPassword }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            toast.error(data.error || 'Erreur lors de la réinitialisation');
                            return;
                          }
                          setResetDone(true);
                          toast.success('Mot de passe réinitialisé avec succès');
                        } catch (_e) {
                          toast.error('Erreur de connexion au serveur');
                        } finally {
                          setResetLoading(false);
                        }
                      }}
                    >
                      {resetLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        'Réinitialiser'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check for reset password token in URL */}
    </div>
  );
}
