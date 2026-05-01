'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Conversation {
  id: string
  title?: string
  agent?: { id: string; name: string; model: string }
  _count?: { messages: number }
  createdAt: string
  updatedAt: string
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/conversations?limit=50', { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setConversations(data.data || [])
        } else {
          setError(data.error?.message || 'Failed to load conversations')
        }
      } catch {
        setError('Failed to load conversations')
      } finally {
        setLoading(false)
      }
    }
    fetchConversations()
  }, [])

  const filteredConversations = conversations.filter((conv) =>
    !search || (conv.title?.toLowerCase().includes(search.toLowerCase()) || conv.agent?.name.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
      }
    } catch {
      // Ignore
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-muted-foreground mt-1">Your chat history with agents</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full max-w-md px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
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
        <div className="space-y-3">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
            >
              <Link href={`/conversations/${conv.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{conv.title || 'Untitled Conversation'}</p>
                    <p className="text-sm text-muted-foreground">
                      {conv.agent?.name || 'Unknown Agent'} &middot; {conv._count?.messages || 0} messages &middot; {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2 ml-4">
                {conv.agent && (
                  <Link
                    href={`/agents/${conv.agent.id}/chat`}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Continue
                  </Link>
                )}
                <button
                  onClick={() => handleDelete(conv.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredConversations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {conversations.length === 0 ? 'No conversations yet. Start chatting with an agent!' : 'No conversations match your search.'}
          </p>
          {conversations.length === 0 && (
            <Link href="/agents" className="text-primary hover:underline font-medium mt-2 inline-block">
              Browse Agents
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
