'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
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
  Copy,
  Check,
  RefreshCw,
  Pencil,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import AgentContentRenderer from './AgentContentRenderer';

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

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <motion.div
        className="w-2 h-2 rounded-full bg-emerald-500"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-emerald-500"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-emerald-500"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  );
}

// Message actions component
function MessageActions({ content, onRegenerate, onEdit }: { content: string; onRegenerate?: () => void; onEdit?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
        title="Copier"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      </Button>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onRegenerate}
          title="Régénérer"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          title="Modifier"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
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
    logout,
  } = useAppStore();

  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isWaitingFirstToken, setIsWaitingFirstToken] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageGenerating, setImageGenerating] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<{ error: string; quotaType: string } | null>(null);
  const [lowQuotaTokens, setLowQuotaTokens] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Agent status
  const agentStatus = isStreaming
    ? isWaitingFirstToken
      ? 'thinking'
      : 'running'
    : 'online';

  const statusConfig = {
    online: { label: 'En ligne', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    thinking: { label: 'Réflexion...', color: 'bg-amber-500', textColor: 'text-amber-600' },
    running: { label: 'Exécution...', color: 'bg-cyan-500', textColor: 'text-cyan-600' },
  };

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token || !selectedAgentId) return;
    setLoadingConvos(true);
    try {
      const res = await fetch(`/api/conversations?agentId=${selectedAgentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        console.warn("Conversations: Token expired or invalid, skipping");
        logout();
        return;
      }
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch (e) {
      // silent
    } finally {
      setLoadingConvos(false);
    }
  }, [token, selectedAgentId, logout]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (convId: string) => {
    if (!token) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/messages?conversationId=${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { logout(); return; }
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
    } catch (_e) {
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [token, logout]);

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

  // Auto-scroll with smooth behavior
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
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

  // Format timestamp
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Suggested prompts per agent type
  const getSuggestedPrompts = () => {
    const type = selectedAgent?.type;
    if (type === 'finance') return ['Analyse mes revenus mensuels', 'Crée un tableau de bord financier', 'Prévois les tendances du mois prochain'];
    if (type === 'data') return ['Analyse mes documents téléchargés', 'Crée un graphique des données', 'Génère un rapport statistique'];
    if (type === 'support') return ['J\'ai un problème de connexion', 'Comment réinitialiser mon mot de passe ?', 'Aide-moi à configurer mon compte'];
    if (type === 'sales') return ['Analyse mon pipeline commercial', 'Génère un rapport de prospection', 'Prévois les ventes du trimestre'];
    return ['Bonjour, comment peux-tu m\'aider ?', 'Quelles sont tes capacités ?', 'Aide-moi avec un projet', 'Analyse des données pour moi'];
  };

  // Pre-send quota check
  const checkQuotaBeforeSend = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const tokensLimit = data.usage?.tokens?.limit;
        const tokensUsed = data.usage?.tokens?.used;
        if (tokensLimit !== -1 && tokensLimit !== undefined && tokensUsed !== undefined) {
          const remaining = tokensLimit - tokensUsed;
          if (remaining < 1000) {
            setLowQuotaTokens(remaining);
          } else {
            setLowQuotaTokens(null);
          }
        } else {
          setLowQuotaTokens(null);
        }
      }
    } catch (_e) {
      // silent
    }
  };

  // Fetch quota on mount and when conversations change
  useEffect(() => {
    if (token) {
      checkQuotaBeforeSend();
    }
  }, [token, activeConversationId]);

  // Send message with SSE streaming
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !selectedAgentId || !token || isStreaming) return;

    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setIsWaitingFirstToken(true);
    setQuotaWarning(null);

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

      // Handle 403 quota exceeded
      if (res.status === 403) {
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch (_e) {
          errorData = { error: 'Accès refusé' };
        }
        if (errorData.quotaExceeded) {
          setQuotaWarning({ error: errorData.error || 'Quota dépassé', quotaType: errorData.quotaType || 'tokens' });
          // Remove the user message we just added since the request failed
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          return;
        }
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

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
              if (isWaitingFirstToken) setIsWaitingFirstToken(false);
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
          } catch (_e) {
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
          // Handle 403 quota exceeded on fallback too
          if (fallbackRes.status === 403) {
            let errorData: any = {};
            try {
              errorData = await fallbackRes.json();
            } catch (_e) {
              errorData = { error: 'Accès refusé' };
            }
            if (errorData.quotaExceeded) {
              setQuotaWarning({ error: errorData.error || 'Quota dépassé', quotaType: errorData.quotaType || 'tokens' });
              setStreamingContent('');
              return;
            }
          }
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
        } catch (_e) {
          toast.error('Erreur lors de l\'envoi du message');
        }
        setStreamingContent('');
      }
    } finally {
      setIsStreaming(false);
      setIsWaitingFirstToken(false);
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
    } catch (_e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const clearChat = () => {
    if (activeConversationId) {
      deleteConversation(activeConversationId);
    } else {
      setMessages([]);
      setStreamingContent('');
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 4 * 24; // ~4 lines
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  };

  // Generate image via API
  const generateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt || !token) return;

    setImageGenerating(true);

    // Add user message showing the image request
    const userMsg: StreamMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `🎨 Génère une image : ${prompt}`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/agents/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          conversationId: activeConversationId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de génération');
      }

      if (data.imageUrl) {
        const assistantMsg: StreamMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Voici l'image générée pour : *"${prompt}"*\n\n<<<IMAGE>>>${data.imageUrl}<<<END_IMAGE>>>`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        toast.error('Aucune image n\'a pu être générée');
      }
    } catch (_e) {
      toast.error('Erreur lors de la génération de l\'image');
    } finally {
      setImageGenerating(false);
      setImagePrompt('');
      setImageDialogOpen(false);
    }
  };

  // Regenerate last assistant message
  const regenerateLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove last assistant message
      setMessages((prev) => {
        const idx = prev.length - 1;
        if (prev[idx]?.role === 'assistant') return prev.slice(0, idx);
        return prev;
      });
      sendMessage(lastUserMsg.content);
    }
  };

  // Agent selection screen
  if (!selectedAgentId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto pb-20 md:pb-6">
        <div className="text-center mb-6 md:mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 mb-3 md:mb-4"
          >
            <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </motion.div>
          <h1 className="text-xl md:text-3xl font-bold">Choisissez un agent</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Sélectionnez un agent IA pour commencer</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent, index) => {
            const IconComp = iconMap[agent.icon] || Bot;
            const colors = colorMap[agent.color] || colorMap.emerald;
            return (
              <motion.button
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  newConversation();
                }}
                className={`text-left p-4 rounded-xl border ${colors.bg} border-border hover:shadow-md hover:shadow-emerald-500/5 transition-all group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
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
  const currentStatus = statusConfig[agentStatus];

  // Conversation sidebar content (shared between desktop & mobile drawer)
  const conversationList = (
    <>
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
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex items-center gap-2 cursor-pointer ${
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
              </div>
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
    </>
  );

  return (
    <div className="flex h-screen">
      {/* Sidebar - Conversations (desktop) */}
      <div className="w-64 border-r bg-card/50 hidden md:flex flex-col">
        {conversationList}
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
            <SheetContent side="left" className="w-80 p-0 flex flex-col bg-card">
              <SheetHeader className="p-4 border-b bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                <SheetTitle className="text-sm font-semibold">Conversations</SheetTitle>
              </SheetHeader>
              {conversationList}
            </SheetContent>
          </Sheet>

          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
            <IconComp className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium truncate">{selectedAgent?.name}</h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${currentStatus.color} ${agentStatus === 'thinking' || agentStatus === 'running' ? 'animate-pulse' : ''}`} />
                <span className={`text-[10px] ${currentStatus.textColor}`}>{currentStatus.label}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{selectedAgent?.description}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex text-xs text-muted-foreground"
              onClick={newConversation}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Nouveau
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-500"
              onClick={clearChat}
              title="Effacer la conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quota exceeded warning banner */}
        <AnimatePresence>
          {quotaWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-3 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {quotaWarning.quotaType === 'conversations'
                      ? 'Limite de conversations atteinte'
                      : 'Quota de tokens dépassé'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    {quotaWarning.error}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setCurrentView('billing')}
                  >
                    Voir les offres
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-amber-500 hover:text-amber-700"
                    onClick={() => setQuotaWarning(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scroll-smooth [-webkit-overflow-scrolling:touch] overscroll-contain"
        >
          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : messages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-4`}
              >
                <IconComp className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">{selectedAgent?.name}</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {selectedAgent?.description}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {getSuggestedPrompts().map(
                  (prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 dark:hover:border-emerald-800 transition-colors"
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
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 group ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                      <AvatarFallback className={`text-xs ${colors.bg} ${colors.text}`}>
                        <IconComp className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[85%] md:max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <AgentContentRenderer content={msg.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                      {msg.role === 'assistant' && (
                        <MessageActions
                          content={msg.content}
                          onRegenerate={idx === messages.length - 1 ? regenerateLastMessage : undefined}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Waiting for first token indicator */}
              {isWaitingFirstToken && !streamingContent && (
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
                  <div className="rounded-2xl px-4 py-3 bg-muted">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}

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
                    <AgentContentRenderer content={streamingContent} isStreaming />
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
              className="absolute bottom-28 md:bottom-24 left-1/2 -translate-x-1/2"
            >
              <Button
                variant="outline"
                size="icon"
                className="rounded-full shadow-lg h-8 w-8 bg-background"
                onClick={scrollToBottom}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <div className="border-t p-3 bg-card/50 backdrop-blur-sm pb-20 md:pb-3">
          <div className="max-w-3xl mx-auto">
            {/* Suggested prompts (shown when chat is active) */}
            {messages.length > 0 && !isStreaming && !streamingContent && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {getSuggestedPrompts().slice(0, 2).map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 dark:hover:border-emerald-800"
                    onClick={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                title="Générer une image"
                onClick={() => setImageDialogOpen(true)}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                title="Entrée vocale"
                onClick={() => toast.info('Entrée vocale bientôt disponible')}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Écrivez votre message... (Shift+Entrée pour un retour à la ligne)"
                  className="flex-1 resize-none min-h-[40px] max-h-[96px] py-2.5 pr-3 text-sm"
                  rows={1}
                  disabled={isStreaming}
                />
              </div>
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
            {/* Low quota warning below input */}
            {lowQuotaTokens !== null && lowQuotaTokens >= 0 && !isStreaming && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[10px] mt-1.5">
                <AlertTriangle className="h-3 w-3" />
                <span>Attention : quota de tokens faible ({lowQuotaTokens.toLocaleString('fr-FR')} restants)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Generation Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-emerald-500" />
              Générer une image
            </DialogTitle>
            <DialogDescription>
              Décrivez l'image que vous souhaitez créer. L'IA la générera pour vous.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Ex : Un coucher de soleil sur les montagnes en style aquarelle..."
              className="resize-none min-h-[80px]"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  generateImage();
                }
              }}
            />
            <div className="flex flex-wrap gap-1.5">
              {['Paysage moderne', 'Portrait stylisé', 'Architecture futuriste', 'Nature abstraite'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 dark:hover:border-emerald-800"
                  onClick={() => setImagePrompt(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setImageDialogOpen(false);
                setImagePrompt('');
              }}
              disabled={imageGenerating}
            >
              Annuler
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              onClick={generateImage}
              disabled={!imagePrompt.trim() || imageGenerating}
            >
              {imageGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Générer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
