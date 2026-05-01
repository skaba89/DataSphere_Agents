'use client'

import { useState } from 'react'

const mockAgents = [
  { id: '1', name: 'Support Bot', model: 'gpt-4', provider: 'OpenAI', conversations: 342, status: 'active', lastUsed: '2 min ago' },
  { id: '2', name: 'Sales Assistant', model: 'claude-3-opus', provider: 'Anthropic', conversations: 156, status: 'active', lastUsed: '15 min ago' },
  { id: '3', name: 'Data Analyst', model: 'gemini-pro', provider: 'Google', conversations: 89, status: 'active', lastUsed: '1 hour ago' },
  { id: '4', name: 'Code Reviewer', model: 'gpt-4-turbo', provider: 'OpenAI', conversations: 234, status: 'inactive', lastUsed: '2 days ago' },
  { id: '5', name: 'Document Writer', model: 'claude-3-sonnet', provider: 'Anthropic', conversations: 67, status: 'active', lastUsed: '5 hours ago' },
]

export default function AgentsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredAgents = mockAgents.filter((agent) => {
    if (filter === 'all') return true
    return agent.status === filter
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1">Manage your AI agents</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
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
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  agent.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {agent.status}
              </span>
            </div>
            <h3 className="font-semibold mb-1">{agent.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {agent.provider} &middot; {agent.model}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{agent.conversations} conversations</span>
              <span>Last used {agent.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No agents found</p>
        </div>
      )}
    </div>
  )
}
