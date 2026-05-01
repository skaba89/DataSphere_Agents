'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing' | 'api'>('profile')
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; emailVerified: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
        // Try localStorage
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
    setMessage(null)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' })
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to update profile' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to change password' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {(['profile', 'security', 'billing', 'api'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-2xl space-y-8">
        {activeTab === 'profile' && (
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {user && !user.emailVerified && (
                  <p className="text-xs text-orange-500 mt-1">Email not verified</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input
                  type="text"
                  value={user?.role || 'USER'}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm text-muted-foreground"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-border bg-card">
              <h2 className="text-lg font-semibold mb-4">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">At least 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <h2 className="text-lg font-semibold mb-4">Session</h2>
              <p className="text-sm text-muted-foreground mb-4">Sign out of your current session across all devices.</p>
              <button
                onClick={handleLogout}
                className="border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-lg font-semibold mb-4">Billing & Subscription</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your subscription and billing information.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">Current Plan</p>
                  <p className="text-xs text-muted-foreground">Free</p>
                </div>
                <button
                  onClick={() => {
                    fetch('/api/subscriptions/plans').then(r => r.json()).then(data => {
                      if (data.success && data.data.length > 0) {
                        alert('Available plans: ' + data.data.map((p: {name: string; price: number | null}) => `${p.name} ($${p.price || 'Custom'}/mo)`).join(', '))
                      }
                    })
                  }}
                  className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-lg font-semibold mb-4">API Keys</h2>
            <p className="text-sm text-muted-foreground mb-4">
              API keys allow you to authenticate requests to the DataSphere Agents API programmatically.
            </p>
            <div className="p-4 rounded-lg border border-dashed border-border text-center">
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create an API key to start integrating with the API</p>
            </div>
            <button className="mt-4 border border-border px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              + Create API Key
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
