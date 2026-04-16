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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const iconMap: Record<string, React.ElementType> = {
  Headphones,
  TrendingUp,
  Database,
  Target,
  Bot,
};

const colorConfig: Record<string, { gradient: string; iconBg: string; iconColor: string }> = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
};

const typeLabels: Record<string, string> = {
  support: 'Support',
  finance: 'Finance',
  data: 'Données',
  sales: 'Commercial',
};

export default function ChatView() {
  const { token, selectedAgentId, setSelectedAgentId, setCurrentView } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
            const agent = json.agents.find((a: Agent) => a.id === selectedAgentId);
            if (agent) setCurrentAgent(agent);
          }
        }
      } catch {
        // silent
      } finally {
        setLoadingAgent(false);
      }
    };
    fetchAgents();
  }, [token, selectedAgentId]);

  useEffect(() => {
    if (currentAgent) {
      inputRef.current?.focus();
    }
  }, [currentAgent]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgentId || sending) return;

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
          agentId: selectedAgentId,
          message: userMessage.content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de l\'envoi du message');
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setCurrentAgent(agent);
    setMessages([]);
  };

  // No agent selected - show agent selection
  if (!selectedAgentId && !currentAgent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 md:p-6 lg:p-8 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Conversation</h1>
            <p className="text-muted-foreground mt-1">
              Sélectionnez un agent pour commencer une conversation
            </p>
          </div>
        </div>

        {loadingAgent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const colors = colorConfig[agent.color] || colorConfig.emerald;
              const IconComponent = iconMap[agent.icon] || Bot;
              return (
                <motion.div
                  key={agent.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow border-emerald-100 dark:border-emerald-900/50"
                    onClick={() => handleSelectAgent(agent)}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
                        <IconComponent className={`h-6 w-6 ${colors.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{agent.name}</h3>
                        <Badge
                          variant="secondary"
                          className="mt-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-0 text-xs"
                        >
                          {typeLabels[agent.type] || agent.type}
                        </Badge>
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

  // Chat view with selected agent
  const agentColors = colorConfig[currentAgent?.color || 'emerald'] || colorConfig.emerald;
  const AgentIcon = iconMap[currentAgent?.icon || 'Bot'] || Bot;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-0px)]"
    >
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 md:p-6 border-b border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-gray-950">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => {
            setSelectedAgentId(null);
            setCurrentAgent(null);
            setMessages([]);
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className={`p-2 rounded-xl ${agentColors.iconBg}`}>
          <AgentIcon className={`h-5 w-5 ${agentColors.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{currentAgent?.name || 'Agent'}</h2>
          <p className="text-xs text-muted-foreground">
            {typeLabels[currentAgent?.type || ''] || currentAgent?.type}
          </p>
        </div>
        <Badge
          className={`bg-gradient-to-r ${agentColors.gradient} text-white border-0`}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          IA Active
        </Badge>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-emerald-50/30 to-transparent dark:from-emerald-950/10">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className={`inline-flex p-4 rounded-2xl ${agentColors.iconBg} mb-4`}>
                <AgentIcon className={`h-10 w-10 ${agentColors.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold">{currentAgent?.name}</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {currentAgent?.description}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Envoyez un message pour commencer la conversation
              </p>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-8 w-8 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-800">
                    <AvatarFallback className={`bg-gradient-to-br ${agentColors.gradient} text-white text-xs`}>
                      <AgentIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/50 shadow-sm rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.role === 'user' ? 'text-emerald-200' : 'text-muted-foreground'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <Avatar className="h-8 w-8 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-800">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
                      Vous
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <Avatar className="h-8 w-8 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-800">
                <AvatarFallback className={`bg-gradient-to-br ${agentColors.gradient} text-white text-xs`}>
                  <AgentIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-gray-950 p-4">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tapez votre message..."
            disabled={sending}
            className="flex-1 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500"
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
