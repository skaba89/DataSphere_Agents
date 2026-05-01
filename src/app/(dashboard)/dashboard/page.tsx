'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Agents', value: stats.agents, href: '/agents', color: 'text-blue-600' },
          { label: 'Conversations', value: stats.conversations, href: '/conversations', color: 'text-green-600' },
          { label: 'Organizations', value: stats.organizations, href: '/settings', color: 'text-purple-600' },
          { label: 'Notifications', value: stats.unreadNotifications, href: '/settings', color: 'text-orange-600' },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>
              {loading ? '...' : stat.value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/agents" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors block">
              <p className="text-sm font-medium">View Agents</p>
              <p className="text-xs text-muted-foreground">Manage your AI agents</p>
            </Link>
            <Link href="/conversations" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors block">
              <p className="text-sm font-medium">Conversations</p>
              <p className="text-xs text-muted-foreground">View chat history</p>
            </Link>
            <Link href="/settings" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors block">
              <p className="text-sm font-medium">Settings</p>
              <p className="text-xs text-muted-foreground">Profile, billing, API keys</p>
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-sm font-medium">Configure an AI Provider</p>
                <p className="text-xs text-muted-foreground">Add your OpenAI or Anthropic API key in the AI Providers settings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-sm font-medium">Create an Agent</p>
                <p className="text-xs text-muted-foreground">Set up your first AI agent with a custom system prompt</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
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
