'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MessageSquare,
  User,
  Bot,
  ArrowRight,
} from 'lucide-react'

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  title?: string
  agent?: { id: string; name: string; model: string }
  messages: Message[]
  createdAt: string
}

export default function ConversationDetailPage() {
  const params = useParams()
  const conversationId = params.id as string
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setConversation(data.data)
        } else {
          setError(data.error?.message || 'Failed to load conversation')
        }
      } catch {
        setError('Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }
    fetchConversation()
  }, [conversationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || 'Conversation not found'}</p>
        <Link href="/conversations" className="text-primary hover:underline">Back to Conversations</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/conversations" className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Conversations
          </Link>
          <span>/</span>
          <span>{conversation.title || 'Untitled'}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold">{conversation.title || 'Untitled Conversation'}</h1>
          </div>
          {conversation.agent && (
            <Link
              href={`/agents/${conversation.agent.id}/chat`}
              className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1"
            >
              Continue with {conversation.agent.name}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        {conversation.agent && (
          <p className="text-sm text-muted-foreground mt-1">
            Agent: {conversation.agent.name} ({conversation.agent.model})
          </p>
        )}
      </div>

      <div className="space-y-4 max-w-3xl">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex gap-2.5 max-w-[80%] ${
                message.role === 'USER' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                message.role === 'USER'
                  ? 'bg-primary text-primary-foreground'
                  : message.role === 'SYSTEM'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {message.role === 'USER' ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === 'USER'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : message.role === 'SYSTEM'
                    ? 'bg-yellow-50 dark:bg-yellow-950/30 rounded-bl-md'
                    : 'bg-muted rounded-bl-md'
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-70">{message.role}</p>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-50 mt-1">{new Date(message.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
