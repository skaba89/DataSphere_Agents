'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  User,
  Shield,
  CreditCard,
  Key,
  Bell,
  LogOut,
  Save,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Chrome,
  Zap,
  ArrowRight,
  Check,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type TabId = 'profile' | 'security' | 'billing' | 'api' | 'notifications'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 10
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[^a-zA-Z0-9]/.test(password)) score += 25
  score = Math.min(score, 100)
  if (score < 30) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score < 60) return { score, label: 'Fair', color: 'bg-orange-500' }
  if (score < 80) return { score, label: 'Good', color: 'bg-yellow-500' }
  return { score, label: 'Strong', color: 'bg-emerald-500' }
}

// Mock API keys
const mockApiKeys = [
  { id: '1', name: 'Production Key', maskedKey: 'dsa_sk_••••••••••••••••••a3f2', created: '2025-01-15', lastUsed: '2025-06-10', expires: 'Never' },
  { id: '2', name: 'Development Key', maskedKey: 'dsa_sk_••••••••••••••••••7b1e', created: '2025-03-22', lastUsed: '2025-06-09', expires: '2025-09-22' },
]

// Mock sessions
const mockSessions = [
  { id: '1', device: 'Desktop', browser: 'Chrome 126', location: 'San Francisco, US', lastActive: 'Now', current: true, icon: Monitor },
  { id: '2', device: 'iPhone 15', browser: 'Safari 17', location: 'New York, US', lastActive: '2 hours ago', current: false, icon: Smartphone },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; emailVerified: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // API keys
  const [apiKeys, setApiKeys] = useState(mockApiKeys)
  const [createKeyOpen, setCreateKeyOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState('90')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [showCreatedKey, setShowCreatedKey] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    agentStatus: true,
    billing: true,
  })

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Show toast helper
  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' })
        const data = await res.json()
        if (data.success && data.data) {
          setUser(data.data)
          setName(data.data.name || '')
          setEmail(data.data.email || '')
        }
      } catch {
        try {
          const stored = localStorage.getItem('user')
          if (stored) setUser(JSON.parse(stored))
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Profile updated successfully')
      } else {
        showToast('error', data.error?.message || 'Failed to update profile')
      }
    } catch {
      showToast('error', 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      showToast('error', 'Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showToast('error', data.error?.message || 'Failed to change password')
      }
    } catch {
      showToast('error', 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const handleSendVerification = async () => {
    try {
      const res = await fetch('/api/auth/verify-email', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Verification email sent! Check your inbox.')
      } else {
        showToast('error', data.error?.message || 'Failed to send verification email')
      }
    } catch {
      showToast('error', 'Failed to send verification email')
    }
  }

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) return
    const fullKey = `dsa_sk_${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`
    const maskedKey = `dsa_sk_••••••••••••••••••${fullKey.slice(-4)}`
    const newKey = {
      id: String(Date.now()),
      name: newKeyName.trim(),
      maskedKey,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      expires: newKeyExpiry === 'never' ? 'Never' : new Date(Date.now() + parseInt(newKeyExpiry) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
    setApiKeys(prev => [newKey, ...prev])
    setCreatedKey(fullKey)
    setShowCreatedKey(true)
    setNewKeyName('')
    setNewKeyExpiry('90')
    setCreateKeyOpen(false)
  }

  const handleDeleteApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id))
    showToast('success', 'API key deleted')
  }

  const handleCopyKey = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKeyId(id)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch {
      showToast('error', 'Failed to copy to clipboard')
    }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const userInitial = (user?.name || user?.email || 'U')[0].toUpperCase()

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Toast Notification */}
      <div
        className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {toast && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {toast.text}
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* ============ PROFILE TAB ============ */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Avatar & Identity Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal details and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <button className="text-xs text-primary hover:underline mt-1">Change avatar</button>
                  </div>
                </div>

                <Separator />

                {/* Two Column Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      Email
                      {user?.emailVerified ? (
                        <Badge variant="secondary" className="gap-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] px-1.5 py-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 text-[10px] px-1.5 py-0">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Unverified
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                    {user && !user.emailVerified && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSendVerification}
                        className="text-orange-600 dark:text-orange-400 h-auto p-0 text-xs hover:bg-transparent hover:underline"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Send verification email
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div>
                    <Badge variant="outline" className="text-xs font-medium">
                      <Shield className="w-3 h-3 mr-1" />
                      {user?.role || 'USER'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ============ SECURITY TAB ============ */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Authenticator App</p>
                      <p className="text-xs text-muted-foreground">Use an app to generate one-time codes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      Coming Soon
                    </Badge>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={setTwoFactorEnabled}
                      disabled
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  Change Password
                </CardTitle>
                <CardDescription>Ensure your account is using a strong password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Password strength</span>
                        <span className={`text-xs font-medium ${
                          passwordStrength.label === 'Weak' ? 'text-red-500' :
                          passwordStrength.label === 'Fair' ? 'text-orange-500' :
                          passwordStrength.label === 'Good' ? 'text-yellow-600' :
                          'text-emerald-500'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                        <span className={newPassword.length >= 8 ? 'text-emerald-500' : ''}>
                          {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                        </span>
                        <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-500' : ''}>
                          {/[A-Z]/.test(newPassword) ? '✓' : '○'} Uppercase letter
                        </span>
                        <span className={/[0-9]/.test(newPassword) ? 'text-emerald-500' : ''}>
                          {/[0-9]/.test(newPassword) ? '✓' : '○'} Number
                        </span>
                        <span className={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-emerald-500' : ''}>
                          {/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '○'} Special character
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword && (
                    <p className={`text-xs flex items-center gap-1 ${
                      newPassword === confirmPassword ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {newPassword === confirmPassword ? (
                        <><CheckCircle2 className="w-3 h-3" /> Passwords match</>
                      ) : (
                        <><AlertCircle className="w-3 h-3" /> Passwords do not match</>
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button onClick={handleChangePassword} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                      Active Sessions
                    </CardTitle>
                    <CardDescription>Manage your active sessions across devices</CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        Revoke All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke all sessions?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will sign you out of all devices except the current one. You will need to log in again on those devices.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => showToast('success', 'All other sessions revoked')}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Revoke All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockSessions.map((session) => {
                  const SessionIcon = session.icon
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <SessionIcon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{session.device}</p>
                            {session.current && (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 px-1.5 py-0">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {session.browser} · {session.location} · {session.lastActive}
                          </p>
                        </div>
                      </div>
                      {!session.current && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          Revoke
                        </Button>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Sign Out */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sign Out Everywhere</p>
                    <p className="text-xs text-muted-foreground">Sign out of your current session</p>
                  </div>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ BILLING TAB ============ */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  Current Plan
                </CardTitle>
                <CardDescription>Your current subscription and usage details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold">Free</p>
                        <Badge variant="secondary" className="text-[10px]">Current</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">$0 / month</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Features included:</p>
                    <div className="mt-1 space-y-0.5">
                      {['2 Agents', '100 messages/mo', 'Basic analytics', 'Community support'].map((f) => (
                        <p key={f} className="text-xs flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-500" />
                          {f}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Usage This Month</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Agents Used</span>
                        <span className="font-medium">1 / 2</span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Messages Sent</span>
                        <span className="font-medium">34 / 100</span>
                      </div>
                      <Progress value={34} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upgrade Card */}
            <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <CardTitle>Upgrade to Pro</CardTitle>
                </div>
                <CardDescription>Unlock the full potential of DataSphere Agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Unlimited agents',
                    '10,000 messages/mo',
                    'Advanced analytics',
                    'Priority support',
                    'Custom integrations',
                    'API access',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    fetch('/api/subscriptions/plans').then(r => r.json()).then(data => {
                      if (data.success && data.data.length > 0) {
                        showToast('success', 'Redirecting to checkout...')
                      } else {
                        showToast('error', 'No plans available at this time')
                      }
                    }).catch(() => {
                      showToast('error', 'Failed to load plans')
                    })
                  }}
                >
                  Upgrade to Pro
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>

            {/* Manage Billing */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Manage Billing</p>
                    <p className="text-xs text-muted-foreground">View invoices, update payment method, or cancel your subscription</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetch('/api/subscriptions/portal', { method: 'POST', credentials: 'include' })
                        .then(r => r.json())
                        .then(data => {
                          if (data.success && data.data?.url) {
                            window.open(data.data.url, '_blank')
                          } else {
                            showToast('error', 'Billing portal not available on the Free plan')
                          }
                        })
                        .catch(() => showToast('error', 'Failed to open billing portal'))
                    }}
                  >
                    <CreditCard className="w-4 h-4" />
                    Manage Billing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ API KEYS TAB ============ */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {/* Created Key Dialog */}
            <Dialog open={showCreatedKey} onOpenChange={setShowCreatedKey}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" strokeWidth={1.5} />
                    API Key Created
                  </DialogTitle>
                  <DialogDescription>
                    Make sure to copy your API key now. You won&apos;t be able to see it again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted border border-border font-mono text-sm break-all">
                    {createdKey}
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      This is the only time the full API key will be shown. Store it securely.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreatedKey(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      if (createdKey) handleCopyKey(createdKey, 'created')
                    }}
                  >
                    {copiedKeyId === 'created' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Key
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create Key Dialog */}
            <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key to authenticate requests to the DataSphere Agents API.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">A descriptive name to help you identify this key</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration</Label>
                    <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select expiration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateKeyOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateApiKey} disabled={!newKeyName.trim()}>
                    <Plus className="w-4 h-4" />
                    Create Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                      API Keys
                    </CardTitle>
                    <CardDescription>
                      Manage your API keys for programmatic access to DataSphere Agents
                    </CardDescription>
                  </div>
                  <Button onClick={() => setCreateKeyOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Create API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="p-8 rounded-lg border border-dashed border-border text-center">
                    <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-muted-foreground">No API keys yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create an API key to start integrating with the API</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setCreateKeyOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Create API Key
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{key.name}</p>
                            {key.expires !== 'Never' && (
                              <Badge variant="outline" className="text-[10px]">
                                Expires {key.expires}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mt-1">{key.maskedKey}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>Created {key.created}</span>
                            <span>·</span>
                            <span>Last used {key.lastUsed}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyKey(key.maskedKey, key.id)}
                            title="Copy key"
                          >
                            {copiedKeyId === key.id ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete key"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &ldquo;{key.name}&rdquo;? Any integrations using this key will stop working immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteApiKey(key.id)}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ NOTIFICATIONS TAB ============ */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive email updates about your account activity</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <Separator />

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Chrome className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Get push notifications in your browser</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, push: checked }))
                    }
                  />
                </div>

                <Separator />

                {/* Agent Status Alerts */}
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Zap className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Agent Status Alerts</p>
                      <p className="text-xs text-muted-foreground">Get notified when agents complete tasks or encounter errors</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.agentStatus}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, agentStatus: checked }))
                    }
                  />
                </div>

                <Separator />

                {/* Billing Alerts */}
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Billing Alerts</p>
                      <p className="text-xs text-muted-foreground">Receive notifications about billing, invoices, and usage limits</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.billing}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, billing: checked }))
                    }
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button
                  onClick={() => showToast('success', 'Notification preferences saved')}
                >
                  <Save className="w-4 h-4" />
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
