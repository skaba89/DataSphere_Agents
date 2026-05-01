'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Monitor,
  MessageSquare,
  Building2,
  Bell,
  ArrowRight,
  Bot,
  Settings,
  Zap,
  AlertTriangle,
  Database,
} from 'lucide-react'

interface DashboardStats {
  agents: number
  conversations: number
  organizations: number
  unreadNotifications: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ agents: 0, conversations: 0, organizations: 0, unreadNotifications: 0 })
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('User')
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'unavailable'>('checking')

  useEffect(() => {
    // Check database availability
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        setDbStatus(data.database === 'connected' ? 'connected' : 'unavailable')
      })
      .catch(() => setDbStatus('unavailable'))
  }, [])

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetch user data
        const userRes = await fetch('/api/users/me', { credentials: 'include' })
        const userData = await userRes.json()
        if (userData.success && userData.data) {
          setUserName(userData.data.name || 'User')
          const orgs = userData.data.organizations || []
          setStats(prev => ({ ...prev, organizations: orgs.length }))

          // Fetch agents for first organization
          if (orgs.length > 0) {
            const orgId = orgs[0].organization.id
            const [agentsRes, conversationsRes, notifsRes] = await Promise.allSettled([
              fetch(`/api/agents?organizationId=${orgId}`, { credentials: 'include' }),
              fetch('/api/conversations?limit=1', { credentials: 'include' }),
              fetch('/api/notifications?unread=true', { credentials: 'include' }),
            ])

            if (agentsRes.status === 'fulfilled') {
              const agentsData = await agentsRes.value.json()
              if (agentsData.success) setStats(prev => ({ ...prev, agents: agentsData.data?.length || 0 }))
            }
            if (conversationsRes.status === 'fulfilled') {
              const convData = await conversationsRes.value.json()
              if (convData.success) setStats(prev => ({ ...prev, conversations: convData.pagination?.total || 0 }))
            }
            if (notifsRes.status === 'fulfilled') {
              const notifData = await notifsRes.value.json()
              if (notifData.success) setStats(prev => ({ ...prev, unreadNotifications: notifData.meta?.unreadCount || 0 }))
            }
          }
        }
      } catch {
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem('user')
          if (stored) {
            const user = JSON.parse(stored)
            setUserName(user.name || 'User')
          }
        } catch {}
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const statCards = [
    {
      label: 'Active Agents',
      value: stats.agents,
      href: '/agents',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      icon: Monitor,
    },
    {
      label: 'Conversations',
      value: stats.conversations,
      href: '/conversations',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      icon: MessageSquare,
    },
    {
      label: 'Organizations',
      value: stats.organizations,
      href: '/settings',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      icon: Building2,
    },
    {
      label: 'Notifications',
      value: stats.unreadNotifications,
      href: '/settings',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      icon: Bell,
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
      </div>

      {/* Database Status Banner */}
      {dbStatus === 'unavailable' && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Database Unavailable</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              PostgreSQL is not reachable. Some features like authentication and data persistence will not work.
              Please ensure PostgreSQL is running on localhost:5432.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-2xl font-bold">
                {loading ? '...' : stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/agents" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-3 group">
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">View Agents</p>
                <p className="text-xs text-muted-foreground">Manage your AI agents</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/conversations" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-3 group">
              <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Conversations</p>
                <p className="text-xs text-muted-foreground">View chat history</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/settings" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-3 group">
              <div className="w-8 h-8 bg-violet-50 dark:bg-violet-950/30 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Settings className="w-4 h-4 text-violet-600 dark:text-violet-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Settings</p>
                <p className="text-xs text-muted-foreground">Profile, billing, API keys</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-medium">Configure an AI Provider</p>
                <p className="text-xs text-muted-foreground">Add your OpenAI or Anthropic API key in the AI Providers settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-medium">Create an Agent</p>
                <p className="text-xs text-muted-foreground">Set up your first AI agent with a custom system prompt</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-medium">Start Chatting</p>
                <p className="text-xs text-muted-foreground">Begin a conversation with your agent and explore its capabilities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
