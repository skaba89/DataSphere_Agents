'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Loader2,
  Bot,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Headphones,
  TrendingUp,
  Database,
  Target,
  Plus,
  Trash2,
  Clock,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

interface Conversation {
  id: string;
  agentId: string;
  title: string;
  updatedAt: string;
  messages?: { role: string; content: string; createdAt: string }[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const iconMap: Record<string, React.ElementType> = {
  Headphones, TrendingUp, Database, Target, Bot,
};

const colorConfig: Record<string, { gradient: string; iconBg: string; iconColor: string }> = {
  emerald: { gradient: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  amber: { gradient: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400' },
  violet: { gradient: 'from-violet-500 to-purple-600', iconBg: 'bg-violet-100 dark:bg-violet-900/50', iconColor: 'text-violet-600 dark:text-violet-400' },
  rose: { gradient: 'from-rose-500 to-pink-600', iconBg: 'bg-rose-100 dark:bg-rose-900/50', iconColor: 'text-rose-600 dark:text-rose-400' },
  cyan: { gradient: 'from-cyan-500 to-teal-600', iconBg: 'bg-cyan-100 dark:bg-cyan-900/50', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  orange: { gradient: 'from-orange-500 to-red-600', iconBg: 'bg-orange-100 dark:bg-orange-900/50', iconColor: 'text-orange-600 dark:text-orange-400' },
};

const typeLabels: Record<string, string> = {
  support: 'Support', finance: 'Finance', data: 'Données + RAG', sales: 'Commercial', custom: 'Personnalisé',
};

export default function ChatView() {
  const { token, selectedAgentId, setSelectedAgentId, activeConversationId, setActiveConversationId } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setAgents(json.agents);
          if (selectedAgentId) {
            // Handle special 'data' ID from DocumentsView — find the data-type agent
            if (selectedAgentId === 'data') {
              const dataAgent = json.agents.find((a: Agent) => a.type === 'data');
              if (dataAgent) {
                setCurrentAgent(dataAgent);
                setSelectedAgentId(dataAgent.id);
              }
            } else {
              const agent = json.agents.find((a: Agent) => a.id === selectedAgentId);
              if (agent) setCurrentAgent(agent);
            }
          }
        }
      } catch { /* silent */ } finally { setLoadingAgents(false); }
    };
    fetchAgents();
  }, [token, selectedAgentId]);

  // Fetch conversations when agent is selected
  useEffect(() => {
    if (currentAgent) {
      fetchConversations();
      inputRef.current?.focus();
    }
  }, [currentAgent]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
    }
  }, [activeConversationId]);

  const fetchConversations = async () => {
    if (!currentAgent) return;
    try {
      const res = await fetch(`/api/conversations?agentId=${currentAgent.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations);
      }
    } catch { /* silent */ }
  };

  const loadConversationMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/messages?conversationId=${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const loaded: Message[] = json.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(loaded);
      }
    } catch { /* silent */ } finally { setLoadingMessages(false); }
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setCurrentAgent(agent);
    setActiveConversationId(null);
    setMessages([]);
    setShowConversations(false);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setShowConversations(false);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setShowConversations(false);
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${convId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Conversation supprimée');
        fetchConversations();
        if (activeConversationId === convId) {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch { toast.error('Erreur réseau'); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentAgent || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: currentAgent.id,
          message: userMessage.content,
          conversationId: activeConversationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }

      // Set conversation ID if new
      if (data.conversationId && !activeConversationId) {
        setActiveConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      fetchConversations();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSending(false);
    }
  };

  const handleBackToAgents = () => {
    setSelectedAgentId(null);
    setCurrentAgent(null);
    setActiveConversationId(null);
    setMessages([]);
    setShowConversations(false);
  };

  // Agent colors
  const agentColors = colorConfig[currentAgent?.color || 'emerald'] || colorConfig.emerald;
  const AgentIcon = iconMap[currentAgent?.icon || 'Bot'] || Bot;

  // No agent selected — show agent picker
  if (!currentAgent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Conversations</h1>
            <p className="text-muted-foreground mt-1">Sélectionnez un agent pour commencer</p>
          </div>
        </div>

        {loadingAgents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2 flex-1"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24" /></div>
              </CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const colors = colorConfig[agent.color] || colorConfig.emerald;
              const IconComp = iconMap[agent.icon] || Bot;
              return (
                <motion.div key={agent.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow border-emerald-100 dark:border-emerald-900/50"
                    onClick={() => handleSelectAgent(agent)}
                  >
                    <CardContent className="p-5 flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
                        <IconComp className={`h-5 w-5 ${colors.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate text-sm">{agent.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
                            {typeLabels[agent.type] || agent.type}
                          </Badge>
                          {agent.type === 'data' && (
                            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400 border-0 text-[10px]">RAG</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  }

  // Chat interface with agent selected
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[calc(100vh)]">
      {/* Conversation Sidebar */}
      <AnimatePresence>
        {showConversations && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-gray-950 overflow-hidden flex flex-col shrink-0"
          >
            <div className="p-4 border-b border-emerald-100 dark:border-emerald-900/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Historique</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowConversations(false)}>
                  Fermer
                </Button>
              </div>
              <Button
                onClick={handleNewChat}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nouvelle conversation
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Aucune conversation</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors group ${
                        activeConversationId === conv.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/30'
                          : 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                      }`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(conv.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteConversation(conv.id)} className="bg-red-600 hover:bg-red-700">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-2 p-3 md:p-4 border-b border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-gray-950 shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleBackToAgents}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={`p-1.5 rounded-lg ${agentColors.iconBg}`}>
            <AgentIcon className={`h-4 w-4 ${agentColors.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{currentAgent.name}</h2>
            <p className="text-[10px] text-muted-foreground">
              {typeLabels[currentAgent.type] || currentAgent.type}
              {currentAgent.type === 'data' && ' • RAG activé'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => setShowConversations(!showConversations)}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Historique</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={handleNewChat}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau</span>
            </Button>
            <Badge className={`bg-gradient-to-r ${agentColors.gradient} text-white border-0 text-[10px]`}>
              <Sparkles className="h-3 w-3 mr-0.5" />
              IA
            </Badge>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-emerald-50/30 to-transparent dark:from-emerald-950/10">
          <div className="max-w-3xl mx-auto px-3 md:px-6 py-6 space-y-3">
            {loadingMessages ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-3/4 rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                {/* Welcome message */}
                {messages.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
                    <div className={`inline-flex p-3 rounded-2xl ${agentColors.iconBg} mb-3`}>
                      <AgentIcon className={`h-8 w-8 ${agentColors.iconColor}`} />
                    </div>
                    <h3 className="font-semibold">{currentAgent.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{currentAgent.description}</p>
                    {currentAgent.type === 'data' && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                        <FileText className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        <span className="text-xs text-violet-700 dark:text-violet-400 font-medium">
                          RAG activé — vos documents seront analysés
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">Envoyez un message pour commencer</p>
                  </motion.div>
                )}

                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-emerald-200 dark:ring-emerald-800 mt-1">
                          <AvatarFallback className={`bg-gradient-to-br ${agentColors.gradient} text-white text-[10px]`}>
                            <AgentIcon className="h-3.5 w-3.5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/50 shadow-sm rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-emerald-200' : 'text-muted-foreground'}`}>
                          {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {sending && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-start">
                    <Avatar className="h-7 w-7 shrink-0 ring-1 ring-emerald-200 dark:ring-emerald-800 mt-1">
                      <AvatarFallback className={`bg-gradient-to-br ${agentColors.gradient} text-white text-[10px]`}>
                        <AgentIcon className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-gray-950 p-3 shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tapez votre message..."
              disabled={sending}
              className="flex-1 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500 text-sm"
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 shrink-0"
              size="icon"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
