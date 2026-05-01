'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Monitor,
  MessageSquare,
  Settings2,
  BarChart3,
  Trash2,
  ArrowLeft,
  Clock,
  Activity,
  Zap,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description?: string
  model: string
  systemPrompt?: string
  temperature: number
  maxTokens: number
  isActive: boolean
  createdAt: string
  provider?: { id: string; name: string; type: string }
  organization?: { id: string; name: string; slug: string }
  _count?: { conversations: number }
}

const tabConfig = [
  { id: 'config' as const, label: 'Config', icon: Settings2 },
  { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  { id: 'conversations' as const, label: 'Conversations', icon: MessageSquare },
]

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'conversations'>('config')

  useEffect(() => {
    fetchAgent()
  }, [agentId])

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAgent(data.data)
      } else {
        setError(data.error?.message || 'Failed to load agent')
      }
    } catch {
      setError('Failed to load agent')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        router.push('/agents')
      }
    } catch {
      setError('Failed to delete agent')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || 'Agent not found'}</p>
        <Link href="/agents" className="text-primary hover:underline">Back to Agents</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/agents" className="hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Agents
            </Link>
            <span>/</span>
            <span>{agent.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Monitor className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <p className="text-muted-foreground text-sm">{agent.description || 'No description'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/agents/${agentId}/chat`}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Chat with Agent
          </Link>
          <button
            onClick={handleDelete}
            className="border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 px-4 py-2.5 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabConfig.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              Agent Configuration
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{agent.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{agent.provider?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temperature</span>
                <span className="font-medium">{agent.temperature}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Tokens</span>
                <span className="font-medium">{agent.maxTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${agent.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {agent.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium">{agent.organization?.name || 'Unknown'}</span>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              System Prompt
            </h2>
            <pre className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap break-words max-h-64 overflow-auto">
              {agent.systemPrompt || 'No system prompt configured'}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Conversations</p>
            </div>
            <p className="text-2xl font-bold">{agent._count?.conversations || 0}</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Status</p>
            </div>
            <p className="text-2xl font-bold">{agent.isActive ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Created</p>
            </div>
            <p className="text-2xl font-bold">{new Date(agent.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {activeTab === 'conversations' && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-muted-foreground mb-4">Conversation history will appear here</p>
          <Link
            href={`/agents/${agentId}/chat`}
            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            Start a new conversation
            <ArrowLeft className="w-3 h-3 rotate-180" />
          </Link>
        </div>
      )}
    </div>
  )
}
