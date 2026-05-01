'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Agent {
  id: string
  name: string
  description?: string
  model: string
  isActive: boolean
  provider?: { id: string; name: string; type: string }
  _count?: { conversations: number }
  createdAt: string
}

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Get user's organizations
        const userRes = await fetch('/api/users/me', { credentials: 'include' })
        const userData = await userRes.json()
        
        if (userData.success && userData.data?.organizations?.length > 0) {
          const firstOrgId = userData.data.organizations[0].organization.id
          setOrgId(firstOrgId)
          await fetchAgents(firstOrgId)
        } else {
          setLoading(false)
        }
      } catch {
        setError('Failed to load data')
        setLoading(false)
      }
    }

    const fetchAgents = async (organizationId: string) => {
      try {
        const res = await fetch(`/api/agents?organizationId=${organizationId}`, { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setAgents(data.data || [])
        } else {
          setError(data.error?.message || 'Failed to load agents')
        }
      } catch {
        setError('Failed to load agents')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  const filteredAgents = agents.filter((agent) => {
    if (filter === 'all') return true
    return filter === 'active' ? agent.isActive : !agent.isActive
  })

  const handleCreateAgent = async () => {
    if (!orgId) return
    // Simple prompt-based agent creation
    const name = prompt('Agent name:')
    if (!name) return
    
    const description = prompt('Description (optional):') || undefined
    const systemPrompt = prompt('System prompt (optional):') || undefined

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
          systemPrompt,
          organizationId: orgId,
          providerId: 'default', // Will use demo provider
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2048,
        }),
      })

      const data = await res.json()
      if (data.success) {
        router.push(`/agents/${data.data.id}`)
      } else {
        alert(data.error?.message || 'Failed to create agent')
      }
    } catch {
      alert('Failed to create agent')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1">Manage your AI agents</p>
        </div>
        <button
          onClick={handleCreateAgent}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          + Create Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}{' '}
            {f === 'all' ? `(${agents.length})` : `(${agents.filter(a => f === 'active' ? a.isActive : !a.isActive).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-primary hover:underline">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    agent.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {agent.isActive ? 'active' : 'inactive'}
                </span>
              </div>
              <h3 className="font-semibold mb-1">{agent.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {agent.provider?.name || 'Unknown'} &middot; {agent.model}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{agent._count?.conversations || 0} conversations</span>
                <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {agents.length === 0 ? 'No agents yet. Create your first agent!' : 'No agents match the current filter.'}
          </p>
          {agents.length === 0 && (
            <button
              onClick={handleCreateAgent}
              className="text-primary hover:underline font-medium"
            >
              + Create Agent
            </button>
          )}
        </div>
      )}
    </div>
  )
}
