'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
  X,
  Check,
  Plus,
  Sparkles,
  Clock,
  UserPlus,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface DashboardStats {
  agents: number
  conversations: number
  organizations: number
  unreadNotifications: number
}

// ── Count-up hook ────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (target === 0 && !started.current) return
    started.current = true
    let raf: number
    const startTime = performance.now() + delay

    const step = (now: number) => {
      const elapsed = now - startTime
      if (elapsed < 0) {
        raf = requestAnimationFrame(step)
        return
      }
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])

  return value
}

// ── Mini Sparkline Component ─────────────────────────────────────
function Sparkline({ data, color, width = 80, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const pathD = points
    .map((p, i) => (i === 0 ? `M${p}` : `L${p}`))
    .join(' ')

  // Area fill path
  const areaD = `${pathD} L${padding + (width - padding * 2)},${height - padding} L${padding},${height - padding} Z`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-sparkline-draw"
      />
    </svg>
  )
}

// ── Bar Chart Component ──────────────────────────────────────────
function WeeklyBarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1)
  const barWidth = 28
  const gap = 12
  const chartHeight = 160
  const chartWidth = data.length * (barWidth + gap) - gap

  return (
    <svg width="100%" viewBox={`0 0 ${chartWidth + 20} ${chartHeight + 30}`} className="overflow-visible">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1="10"
          y1={10 + pct * (chartHeight - 10)}
          x2={chartWidth + 10}
          y2={10 + pct * (chartHeight - 10)}
          stroke="currentColor"
          strokeOpacity="0.06"
          strokeWidth="1"
        />
      ))}
      {/* Bars */}
      {data.map((v, i) => {
        const barHeight = (v / max) * (chartHeight - 10)
        const x = 10 + i * (barWidth + gap)
        const y = chartHeight - barHeight
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill="currentColor"
              className="text-emerald-500 dark:text-emerald-400 animate-bar-grow"
              style={{ animationDelay: `${i * 80}ms`, transformOrigin: `${x + barWidth / 2}px ${chartHeight}px` }}
              opacity={0.85}
            />
            <text
              x={x + barWidth / 2}
              y={chartHeight + 20}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="11"
            >
              {labels[i]}
            </text>
            {/* Value label on top */}
            {v > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-foreground font-medium"
                fontSize="10"
                opacity="0.7"
              >
                {v}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Activity Feed Data ───────────────────────────────────────────
interface ActivityItem {
  id: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  description: string
  time: string
}

const mockActivity: ActivityItem[] = [
  { id: '1', icon: Plus, iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600 dark:text-emerald-400', description: 'New agent "Customer Support Bot" created', time: '2 min ago' },
  { id: '2', icon: MessageSquare, iconBg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600 dark:text-blue-400', description: 'Conversation completed with Sales Agent', time: '15 min ago' },
  { id: '3', icon: UserPlus, iconBg: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600 dark:text-violet-400', description: 'New member joined the organization', time: '1 hour ago' },
  { id: '4', icon: Zap, iconBg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600 dark:text-amber-400', description: 'AI Provider API key updated', time: '3 hours ago' },
  { id: '5', icon: Activity, iconBg: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600 dark:text-rose-400', description: 'Agent performance report generated', time: '5 hours ago' },
  { id: '6', icon: Sparkles, iconBg: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600 dark:text-teal-400', description: 'New agent template published', time: '1 day ago' },
]

// ── Main Dashboard Page ─────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ agents: 0, conversations: 0, organizations: 0, unreadNotifications: 0 })
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('User')
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'demo-mode' | 'unavailable'>('checking')
  const [dbBannerDismissed, setDbBannerDismissed] = useState(false)
  const [dbBannerRemoving, setDbBannerRemoving] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [activityItems] = useState<ActivityItem[]>(mockActivity)

  // Count-up values
  const agentsCount = useCountUp(stats.agents, 1200, 300)
  const conversationsCount = useCountUp(stats.conversations, 1200, 450)
  const organizationsCount = useCountUp(stats.organizations, 1200, 600)
  const notificationsCount = useCountUp(stats.unreadNotifications, 1200, 750)

  const dismissBanner = useCallback(() => {
    setDbBannerRemoving(true)
    setTimeout(() => setDbBannerDismissed(true), 300)
  }, [])

  const toggleStep = useCallback((step: string) => {
    setCompletedSteps(prev =>
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    )
  }, [])

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        if (data.database === 'connected') setDbStatus('connected')
        else if (data.database === 'demo-mode') setDbStatus('demo-mode')
        else setDbStatus('unavailable')
      })
      .catch(() => setDbStatus('unavailable'))
  }, [])

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const userRes = await fetch('/api/users/me', { credentials: 'include' })
        const userData = await userRes.json()
        if (userData.success && userData.data) {
          setUserName(userData.data.name || 'User')
          const orgs = userData.data.organizations || []
          setStats(prev => ({ ...prev, organizations: orgs.length }))

          if (orgs.length > 0) {
            const orgId = orgs[0].id || orgs[0].organization?.id
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
              if (convData.success) setStats(prev => ({ ...prev, conversations: convData.pagination?.total || convData.meta?.pagination?.total || 0 }))
            }
            if (notifsRes.status === 'fulfilled') {
              const notifData = await notifsRes.value.json()
              if (notifData.success) setStats(prev => ({ ...prev, unreadNotifications: notifData.meta?.unreadCount || notifData.unreadCount || 0 }))
            }
          }
        }
      } catch {
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

  // Sparkline mock trend data per stat
  const sparklineData = {
    agents: [2, 3, 2, 4, 5, 4, stats.agents || 5],
    conversations: [8, 12, 10, 15, 18, 14, stats.conversations || 20],
    organizations: [1, 1, 2, 2, 2, 3, stats.organizations || 3],
    unreadNotifications: [3, 5, 2, 7, 4, 6, stats.unreadNotifications || 5],
  }

  const statCards = [
    {
      label: 'Active Agents',
      value: stats.agents,
      displayValue: agentsCount,
      href: '/agents',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      icon: Monitor,
      sparkData: sparklineData.agents,
      sparkColor: '#3b82f6',
      change: '+12%',
      changeDir: 'up' as const,
      changeLabel: 'from last week',
    },
    {
      label: 'Conversations',
      value: stats.conversations,
      displayValue: conversationsCount,
      href: '/conversations',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      icon: MessageSquare,
      sparkData: sparklineData.conversations,
      sparkColor: '#10b981',
      change: '+23%',
      changeDir: 'up' as const,
      changeLabel: 'from last week',
    },
    {
      label: 'Organizations',
      value: stats.organizations,
      displayValue: organizationsCount,
      href: '/settings',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      icon: Building2,
      sparkData: sparklineData.organizations,
      sparkColor: '#8b5cf6',
      change: '+8%',
      changeDir: 'up' as const,
      changeLabel: 'from last month',
    },
    {
      label: 'Notifications',
      value: stats.unreadNotifications,
      displayValue: notificationsCount,
      href: '/settings',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      icon: Bell,
      sparkData: sparklineData.unreadNotifications,
      sparkColor: '#f59e0b',
      change: '-5%',
      changeDir: 'down' as const,
      changeLabel: 'from last week',
    },
  ]

  // Weekly chart mock data
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weeklyData = [4, 7, 5, 9, 12, 8, stats.conversations > 0 ? Math.min(stats.conversations, 15) : 6]

  // Getting started steps
  const gettingStartedSteps = [
    { id: 'provider', label: 'Add AI Provider', description: 'Connect your OpenAI or Anthropic API key', href: '/settings', icon: Zap, color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800' },
    { id: 'agent', label: 'Create Agent', description: 'Set up your first AI agent with a custom prompt', href: '/agents', icon: Bot, color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    { id: 'chat', label: 'Start Chatting', description: 'Begin a conversation and explore capabilities', href: '/conversations', icon: MessageSquare, color: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' },
  ]

  const totalSteps = gettingStartedSteps.length
  const stepsComplete = completedSteps.length
  const progressPct = (stepsComplete / totalSteps) * 100

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
      </div>

      {/* Database Status Banner */}
      {!dbBannerDismissed && (dbStatus === 'demo-mode' || dbStatus === 'unavailable') && (
        <div
          className={`rounded-xl border flex items-start gap-3 p-4 overflow-hidden ${
            dbBannerRemoving ? 'animate-slide-up-out' : 'animate-slide-down'
          } ${
            dbStatus === 'demo-mode'
              ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30'
              : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            dbStatus === 'demo-mode'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            {dbStatus === 'demo-mode'
              ? <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              : <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${
              dbStatus === 'demo-mode' ? 'text-blue-800 dark:text-blue-300' : 'text-amber-800 dark:text-amber-300'
            }`}>
              {dbStatus === 'demo-mode' ? 'Demo Mode' : 'Database Unavailable'}
            </p>
            <p className={`text-xs mt-0.5 ${
              dbStatus === 'demo-mode' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {dbStatus === 'demo-mode'
                ? <>The application is running without a database. Data is stored in memory and will be lost on restart. To connect a real database, set the <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs">DATABASE_URL</code> environment variable.</>
                : 'The database connection failed and demo mode is not available. Please check your configuration.'
              }
            </p>
          </div>
          <button
            onClick={dismissBanner}
            className={`shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
              dbStatus === 'demo-mode' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
            }`}
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="animate-stagger-in p-5 rounded-xl border border-border bg-card hover:shadow-lg hover:border-border/80 transition-all duration-200 group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
                </div>
                <Sparkline data={stat.sparkData} color={stat.sparkColor} />
              </div>
              <p className={`text-3xl font-bold tracking-tight ${loading ? '' : 'animate-count-up'}`}>
                {loading ? '—' : stat.displayValue}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  stat.changeDir === 'up'
                    ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30'
                    : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30'
                }`}>
                  {stat.changeDir === 'up' ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {stat.change}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{stat.changeLabel}</p>
            </Link>
          )
        })}
      </div>

      {/* Chart + Activity Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Weekly Conversations Chart */}
        <div className="lg:col-span-3 p-6 rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Conversations This Week</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Daily conversation volume</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              +18%
            </div>
          </div>
          <div className="pt-2">
            <WeeklyBarChart data={weeklyData} labels={dayLabels} />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-0 max-h-72 overflow-y-auto custom-scrollbar">
            {activityItems.map((item, idx) => {
              const ItemIcon = item.icon
              const isLast = idx === activityItems.length - 1
              return (
                <div key={item.id} className="flex gap-3 animate-stagger-in" style={{ animationDelay: `${500 + idx * 80}ms` }}>
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${item.iconBg} flex items-center justify-center shrink-0 ring-2 ring-background`}>
                      <ItemIcon className={`w-3.5 h-3.5 ${item.iconColor}`} strokeWidth={1.5} />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border my-1" />}
                  </div>
                  {/* Content */}
                  <div className={`pb-4 ${isLast ? '' : ''}`}>
                    <p className="text-sm leading-snug">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Getting Started + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Getting Started Checklist */}
        <div className="p-6 rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">Getting Started</h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {stepsComplete}/{totalSteps} complete
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-muted rounded-full mt-3 mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-progress-fill transition-all duration-500"
              style={{ width: `${progressPct}%`, animationDelay: '600ms' }}
            />
          </div>
          <div className="space-y-3">
            {gettingStartedSteps.map((step) => {
              const StepIcon = step.icon
              const isComplete = completedSteps.includes(step.id)
              return (
                <Link
                  key={step.id}
                  href={step.href}
                  onClick={(e) => {
                    e.preventDefault()
                    toggleStep(step.id)
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/60 transition-all duration-200 group cursor-pointer"
                >
                  {/* Check circle */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isComplete
                      ? 'bg-emerald-500 text-white animate-check-pop'
                      : `ring-2 ${step.ring} bg-background ${step.color} group-hover:scale-110`
                  }`}>
                    {isComplete ? (
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    ) : (
                      <StepIcon className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium transition-colors ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  {!isComplete && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/agents" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/60 transition-all duration-200 flex items-center gap-3 group relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ml-2">
                <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">View Agents</p>
                <p className="text-xs text-muted-foreground">Manage and configure your AI agents</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-200" />
            </Link>
            <Link href="/conversations" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/60 transition-all duration-200 flex items-center gap-3 group relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r" />
              <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ml-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Conversations</p>
                <p className="text-xs text-muted-foreground">Review chat history and transcripts</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-200" />
            </Link>
            <Link href="/settings" className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/60 transition-all duration-200 flex items-center gap-3 group relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-r" />
              <div className="w-8 h-8 bg-violet-50 dark:bg-violet-950/30 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ml-2">
                <Settings className="w-4 h-4 text-violet-600 dark:text-violet-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Settings</p>
                <p className="text-xs text-muted-foreground">Profile, billing, and API keys</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-200" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
