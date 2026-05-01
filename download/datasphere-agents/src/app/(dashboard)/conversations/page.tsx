'use client'

import { useState } from 'react'

const mockConversations = [
  { id: '1', title: 'How to implement OAuth2?', agent: 'Support Bot', messages: 8, lastMessage: '2 min ago', status: 'active' },
  { id: '2', title: 'Analyze Q4 sales data', agent: 'Data Analyst', messages: 12, lastMessage: '15 min ago', status: 'active' },
  { id: '3', title: 'Review PR #1247', agent: 'Code Reviewer', messages: 5, lastMessage: '1 hour ago', status: 'completed' },
  { id: '4', title: 'Draft product announcement', agent: 'Document Writer', messages: 15, lastMessage: '3 hours ago', status: 'completed' },
  { id: '5', title: 'Customer onboarding flow', agent: 'Sales Assistant', messages: 7, lastMessage: '5 hours ago', status: 'active' },
  { id: '6', title: 'Bug triage for v2.1', agent: 'Code Reviewer', messages: 20, lastMessage: '1 day ago', status: 'completed' },
]

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = mockConversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.agent.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-muted-foreground mt-1">View and manage your AI conversations</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
          + New Conversation
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 px-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Conversations List */}
      <div className="space-y-3">
        {filtered.map((conversation) => (
          <div
            key={conversation.id}
            className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{conversation.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      conversation.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {conversation.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  with <span className="font-medium">{conversation.agent}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{conversation.lastMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {conversation.messages} messages
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No conversations found</p>
        </div>
      )}
    </div>
  )
}
