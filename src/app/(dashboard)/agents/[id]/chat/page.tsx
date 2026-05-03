'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  User,
  Send,
  Plus,
  Sparkles,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
}

/* ─── Simple Markdown-like renderer ─── */
function renderMessageContent(content: string, isStreaming: boolean) {
  if (!content) return null

  const elements: React.ReactNode[] = []
  let key = 0

  // Split by code blocks first
  const codeBlockParts = content.split(/(```[\s\S]*?```)/g)

  for (const part of codeBlockParts) {
    const codeBlockMatch = part.match(/^```([\s\S]*?)```$/)
    if (codeBlockMatch) {
      const codeContent = codeBlockMatch[1].replace(/^\n/, '').replace(/\n$/, '')
      elements.push(
        <pre key={key++} className="my-2 rounded-lg bg-zinc-900 dark:bg-zinc-950 p-4 overflow-x-auto text-sm">
          <code className="text-green-400 font-mono whitespace-pre">{codeContent}</code>
        </pre>
      )
      continue
    }

    // Process inline content line by line
    const lines = part.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isLastLineOfPart = i === lines.length - 1
      const isLastElement = codeBlockParts.indexOf(part) === codeBlockParts.length - 1

      // Process inline formatting
      const processedLine = processInlineFormatting(line)

      // Add cursor on last line if streaming
      if (isStreaming && isLastLineOfPart && isLastElement) {
        elements.push(
          <span key={key++}>
            {processedLine}
            <span className="inline-block w-2 h-4 ml-0.5 bg-foreground animate-pulse align-text-bottom rounded-sm" />
          </span>
        )
      } else {
        elements.push(<span key={key++}>{processedLine}</span>)
      }

      // Add line break (but not after the very last line)
      if (i < lines.length - 1) {
        elements.push(<br key={key++} />)
      }
    }
  }

  return <>{elements}</>
}

function processInlineFormatting(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = []
  let key = 0
  let remaining = text

  // Process bold (**text**) and inline code (`text`) together
  while (remaining.length > 0) {
    // Check for inline code first (higher priority)
    const inlineCodeMatch = remaining.match(/^(.*?)`([^`]+)`/)
    // Check for bold
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*/)

    // Find the earliest match
    const codeIdx = inlineCodeMatch ? inlineCodeMatch[1].length : Infinity
    const boldIdx = boldMatch ? boldMatch[1].length : Infinity

    if (codeIdx === Infinity && boldIdx === Infinity) {
      // No more formatting, push rest
      result.push(<span key={key++}>{remaining}</span>)
      break
    }

    if (codeIdx <= boldIdx && inlineCodeMatch) {
      if (inlineCodeMatch[1]) {
        result.push(<span key={key++}>{inlineCodeMatch[1]}</span>)
      }
      result.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-sm font-mono"
        >
          {inlineCodeMatch[2]}
        </code>
      )
      remaining = remaining.slice(inlineCodeMatch[0].length)
    } else if (boldMatch) {
      if (boldMatch[1]) {
        result.push(<span key={key++}>{boldMatch[1]}</span>)
      }
      result.push(<strong key={key++}>{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
    }
  }

  return result
}

/* ─── Typing Indicator ─── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 animate-in fade-in duration-300">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

/* ─── Format timestamp ─── */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/* ─── Main Page ─── */
export default function AgentChatPage() {
  const params = useParams()
  const agentId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentName, setAgentName] = useState('Agent')
  const [agentModel, setAgentModel] = useState('gpt-4')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}`, { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setAgentName(data.data.name || 'Agent')
          setAgentModel(data.data.model || 'gpt-4')
        }
      } catch {
        // Ignore
      }
    }
    fetchAgent()
  }, [agentId])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
    }
  }, [input])

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setIsStreaming(false)
    setNewMessageIds(new Set())
  }

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || loading) return

    const userMessage = textToSend.trim()
    setInput('')
    setLoading(true)
    setIsStreaming(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const tempId = `temp-${Date.now()}`
    const tempUserMsg: Message = {
      id: tempId,
      role: 'USER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])
    setNewMessageIds((prev) => new Set(prev).add(tempId))

    // Add placeholder for assistant
    const assistantTempId = `temp-assistant-${Date.now()}`
    const tempAssistantMsg: Message = {
      id: assistantTempId,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempAssistantMsg])

    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: userMessage,
          conversationId: conversationId || undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      // Handle SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          const lines = text.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  assistantContent += parsed.content
                  setMessages((prev) => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: assistantContent,
                    }
                    return updated
                  })
                }
                if (parsed.conversationId) {
                  setConversationId(parsed.conversationId)
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // If not streaming (fallback), parse as JSON
      if (!assistantContent) {
        const data = await res.json()
        if (data.success) {
          assistantContent = data.data?.content || data.data?.message?.content || 'No response'
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: assistantContent,
            }
            return updated
          })
        }
      }

      setNewMessageIds((prev) => new Set(prev).add(assistantTempId))
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, an error occurred while sending your message. Please try again.',
        }
        return updated
      })
    } finally {
      setLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isLastAssistantStreaming =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'ASSISTANT' &&
    messages[messages.length - 1].content === ''

  const charCount = input.length

  const suggestedPrompts = [
    'What can you do?',
    'Help me with a task',
    'Explain your capabilities',
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* ─── Chat Header ─── */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href={`/agents/${agentId}`}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{agentName}</h1>
                <div className="flex items-center gap-1">
                  <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Active</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{agentModel}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* ─── Messages Area ─── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.length === 0 ? (
          /* ─── Welcome State ─── */
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
              <Bot className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Start a conversation with {agentName}</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-md">
              Ask anything — from questions to creative tasks. Choose a suggestion below or type your own message.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-full border border-border hover:bg-muted hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isUser = message.role === 'USER'
              const isNew = newMessageIds.has(message.id)
              const isCurrentStreaming =
                isStreaming &&
                message.role === 'ASSISTANT' &&
                messages.indexOf(message) === messages.length - 1 &&
                message.content !== ''

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2.5 px-4 py-2',
                    isUser ? 'justify-end' : 'justify-start',
                    isNew && 'animate-in fade-in slide-in-from-bottom-2 duration-300'
                  )}
                >
                  {/* Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={cn('max-w-[80%] sm:max-w-[70%]', isUser && 'flex flex-col items-end')}>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      {message.content ? (
                        <div className="whitespace-pre-wrap break-words">
                          {renderMessageContent(message.content, isCurrentStreaming)}
                        </div>
                      ) : (
                        loading &&
                        message.role === 'ASSISTANT' &&
                        messages.indexOf(message) === messages.length - 1 &&
                        !message.content && <TypingIndicator />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 px-1">
                      {formatTimestamp(message.createdAt)}
                    </span>
                  </div>

                  {/* Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Show typing indicator when assistant message hasn't started yet */}
            {isLastAssistantStreaming && (
              <div className="px-4 py-2">
                <TypingIndicator />
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ─── Input Area ─── */}
      <div className="pt-3 border-t border-border">
        <div className="relative flex items-end rounded-2xl border border-border bg-card focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agentName}...`}
            rows={1}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-transparent text-sm focus:outline-none resize-none disabled:opacity-50 placeholder:text-muted-foreground/60 min-h-[44px] max-h-[160px]"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-2 mr-2 mb-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-2">
          <p className="text-[10px] text-muted-foreground/50">
            Press Enter to send, Shift+Enter for new line
          </p>
          <p className={cn(
            'text-[10px] transition-colors',
            charCount > 2000 ? 'text-destructive' : 'text-muted-foreground/50'
          )}>
            {charCount.toLocaleString()} / 4,000
          </p>
        </div>
      </div>
    </div>
  )
}
