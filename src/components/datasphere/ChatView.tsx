'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Square,
  Bot,
  Headphones,
  TrendingUp,
  Database,
  Target,
  Globe,
  ArrowLeft,
  Loader2,
  ImageIcon,
  Mic,
  ChevronDown,
  MessageSquare,
  Trash2,
  X,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const iconMap: Record<string, React.ElementType> = {
  Headphones, TrendingUp, Database, Target, Globe, Bot,
};

const colorMap: Record<string, { gradient: string; text: string; bg: string }> = {
  emerald: { gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900' },
  amber: { gradient: 'from-amber-500 to-orange-600', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900' },
  violet: { gradient: 'from-violet-500 to-purple-600', text: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900' },
  rose: { gradient: 'from-rose-500 to-pink-600', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900' },
  cyan: { gradient: 'from-cyan-500 to-blue-600', text: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900' },
  orange: { gradient: 'from-orange-500 to-red-600', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900' },
};

interface StreamMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function ChatView() {
  const {
    token,
    agents,
    selectedAgentId,
    setSelectedAgentId,
    activeConversationId,
    setActiveConversationId,
    setCurrentView,
    isStreaming,
    setIsStreaming,
  } = useAppStore();

  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token || !selectedAgentId) return;
    setLoadingConvos(true);
    try {
      const res = await fetch(`/api/conversations?agentId=${selectedAgentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch {
      // silent
    } finally {
      setLoadingConvos(false);
    }
  }, [token, selectedAgentId]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (convId: string) => {
    if (!token) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/messages?conversationId=${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }))
        );
      }
    } catch {
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  // Send message with SSE streaming
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !selectedAgentId || !token || isStreaming) return;

    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    // Add user message immediately
    const userMsg: StreamMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/agents/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: selectedAgentId,
          message: text,
          conversationId: activeConversationId || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let convId = activeConversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(dataStr);

            if (parsed.type === 'meta') {
              convId = parsed.conversationId;
              if (!activeConversationId) {
                setActiveConversationId(parsed.conversationId);
              }
            } else if (parsed.type === 'token') {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            } else if (parsed.type === 'done') {
              convId = parsed.conversationId;
              if (!activeConversationId) {
                setActiveConversationId(parsed.conversationId);
              }
              fullContent = parsed.fullResponse || fullContent;
            } else if (parsed.type === 'error') {
              toast.error(parsed.content || 'Erreur lors du streaming');
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      // Add assistant message
      const assistantMsg: StreamMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent('');
      fetchConversations();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled
        if (streamingContent) {
          const assistantMsg: StreamMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: streamingContent + '\n\n*[Génération interrompue]*',
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
        setStreamingContent('');
      } else {
        // Fallback to non-streaming
        try {
          const fallbackRes = await fetch('/api/agents/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              agentId: selectedAgentId,
              message: text,
              conversationId: activeConversationId || undefined,
            }),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackData.response) {
            if (fallbackData.conversationId && !activeConversationId) {
              setActiveConversationId(fallbackData.conversationId);
            }
            const assistantMsg: StreamMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: fallbackData.response,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            fetchConversations();
          }
        } catch {
          toast.error('Erreur lors de l\'envoi du message');
        }
        setStreamingContent('');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const selectConversation = (convId: string) => {
    setActiveConversationId(convId);
  };

  const newConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
  };

  const deleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/conversations?id=${convId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeConversationId === convId) {
        newConversation();
      }
      fetchConversations();
      toast.success('Conversation supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Agent selection screen
  if (!selectedAgentId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Choisissez un agent</h1>
          <p className="text-muted-foreground mt-1">Sélectionnez un agent IA pour commencer une conversation</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => {
            const IconComp = iconMap[agent.icon] || Bot;
            const colors = colorMap[agent.color] || colorMap.emerald;
            return (
              <motion.button
                key={agent.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  newConversation();
                }}
                className={`text-left p-4 rounded-xl border ${colors.bg} border-border hover:shadow-md transition-all`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                    <IconComp className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  const IconComp = iconMap[selectedAgent?.icon || 'Bot'] || Bot;
  const colors = colorMap[selectedAgent?.color || 'emerald'] || colorMap.emerald;

  return (
    <div className="flex h-screen">
      {/* Sidebar - Conversations */}
      <div className="w-64 border-r bg-card/50 hidden md:flex flex-col">
        <div className="p-3 border-b">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={newConversation}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConvos ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucune conversation
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex items-center gap-2 ${
                    activeConversationId === conv.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t">
          <button
            onClick={() => {
              setSelectedAgentId(null);
              setActiveConversationId(null);
            }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Changer d&apos;agent
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
          {/* Mobile conversation drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <PanelLeft className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-3 border-b">
                <SheetTitle className="text-sm">Conversations</SheetTitle>
              </SheetHeader>
              <div className="p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start mb-2"
                  onClick={newConversation}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Nouvelle conversation
                </Button>
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors group flex items-center gap-2 ${
                      activeConversationId === conv.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                        : 'hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    <span className="truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
            <IconComp className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium truncate">{selectedAgent?.name}</h2>
            <p className="text-[11px] text-muted-foreground truncate">{selectedAgent?.description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex text-xs text-muted-foreground"
            onClick={newConversation}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Nouveau
          </Button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : messages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg mb-4`}>
                <IconComp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{selectedAgent?.name}</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {selectedAgent?.description}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Bonjour, comment peux-tu m\'aider ?', 'Quelles sont tes capacités ?', 'Aide-moi avec un projet'].map(
                  (prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => sendMessage(prompt)}
                    >
                      {prompt}
                    </Button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                      <AvatarFallback className={`text-xs ${colors.bg} ${colors.text}`}>
                        <IconComp className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Streaming message */}
              {streamingContent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                    <AvatarFallback className={`text-xs ${colors.bg} ${colors.text}`}>
                      <IconComp className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-muted">
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    </div>
                    <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1" />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2"
            >
              <Button
                variant="outline"
                size="icon"
                className="rounded-full shadow-lg h-8 w-8"
                onClick={scrollToBottom}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="border-t p-3 bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              title="Générer une image"
              onClick={() => sendMessage('Génère une image de paysage moderne')}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              title="Entrée vocale"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Écrivez votre message..."
              className="flex-1"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon"
                className="flex-shrink-0"
                onClick={stopStreaming}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
