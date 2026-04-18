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
  Mic,
  MicOff,
  Image as ImageIcon,
  Download,
  StopCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

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
  const [streamingContent, setStreamingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

  // Fetch agents and set current agent based on selectedAgentId
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setAgents(json.agents);
        }
      } catch { /* silent */ } finally { setLoadingAgents(false); }
    };
    fetchAgents();
  }, [token]);

  // Set current agent when selectedAgentId or agents list changes
  useEffect(() => {
    if (selectedAgentId && agents.length > 0) {
      if (selectedAgentId === 'data') {
        const dataAgent = agents.find((a: Agent) => a.type === 'data');
        if (dataAgent) {
          setCurrentAgent(dataAgent);
          setSelectedAgentId(dataAgent.id);
        }
      } else {
        const agent = agents.find((a: Agent) => a.id === selectedAgentId);
        if (agent) setCurrentAgent(agent);
      }
    }
  }, [selectedAgentId, agents]);

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
    if (!currentAgent || !token) return;
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
    setStreamingContent('');
    setShowConversations(false);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setShowConversations(false);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setStreamingContent('');
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !currentAgent || sending) return;
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setStreamingContent('');

    try {
      // Try streaming first
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/agents/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: currentAgent.id,
          message: userMessage.content,
          conversationId: activeConversationId || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Streaming failed, fallback to non-streaming
        throw new Error('stream_failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Pas de stream');

      const decoder = new TextDecoder();
      let convId = activeConversationId;
      let fullText = '';
      let streamWorked = false;
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;

        // Split by newlines but keep the last incomplete line in the buffer
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            if (data.type === 'meta') {
              convId = data.conversationId;
              setActiveConversationId(data.conversationId);
            } else if (data.type === 'token') {
              fullText += data.content;
              setStreamingContent(fullText);
              streamWorked = true;
            } else if (data.type === 'done') {
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.fullResponse || fullText,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingContent('');
              setActiveConversationId(data.conversationId);
              fetchConversations();
            } else if (data.type === 'error') {
              toast.error(data.content);
              setStreamingContent('');
            }
          } catch {
            // Ignore parse errors for incomplete data
          }
        }
      }

      // Process remaining buffer
      if (sseBuffer.trim()) {
        const trimmed = sseBuffer.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'done') {
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.fullResponse || fullText,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingContent('');
              if (data.conversationId) setActiveConversationId(data.conversationId);
              fetchConversations();
            }
          } catch { /* ignore */ }
        }
      }

      // If streaming produced content but no done event, add the message manually
      if (streamWorked && fullText) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent('');
        if (convId) setActiveConversationId(convId);
        fetchConversations();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStreamingContent('');
      } else {
        // Fallback to non-streaming chat
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
              conversationId: activeConversationId || undefined,
            }),
          });

          const data = await res.json();
          if (res.ok && data.response) {
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
          } else {
            toast.error(data.error || 'Erreur serveur');
          }
        } catch {
          toast.error('Erreur de connexion au serveur');
        }
        setStreamingContent('');
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setSending(false);
      setStreamingContent('');
    }
  };

  // Voice recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          const res = await fetch('/api/agents/speech', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setInput((prev) => prev ? `${prev} ${data.text}` : data.text);
            } else {
              toast.info(data.message || 'Parole non détectée');
            }
          }
        } catch {
          toast.error('Erreur de transcription');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error('Microphone non disponible');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Image generation
  const handleGenerateImage = async () => {
    if (!token || !imagePrompt.trim()) return;
    setGeneratingImage(true);
    try {
      const res = await fetch('/api/agents/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          conversationId: activeConversationId || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          const imgMsg: Message = {
            id: `img-${Date.now()}`,
            role: 'assistant',
            content: `![Image générée](${data.imageUrl})\n\n*Image générée pour : "${imagePrompt.trim()}"*`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, imgMsg]);
          toast.success('Image générée !');
        }
      } else {
        toast.error('Erreur de génération');
      }
    } catch {
      toast.error('Erreur de génération');
    } finally {
      setGeneratingImage(false);
      setImagePrompt('');
      setShowImageDialog(false);
    }
  };

  // Export conversation
  const handleExportChat = async () => {
    if (!activeConversationId || !token) return;
    try {
      const res = await fetch(`/api/conversations/export?conversationId=${activeConversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${activeConversationId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Conversation exportée');
      }
    } catch {
      toast.error('Erreur d\'export');
    }
  };

  const handleBackToAgents = () => {
    setSelectedAgentId(null);
    setCurrentAgent(null);
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setShowConversations(false);
  };

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

  // Chat interface
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
            {activeConversationId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportChat}>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter la conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                {messages.length === 0 && !sending && !streamingContent && (
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
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <p className={`text-[9px] mt-1 ${msg.role === 'user' ? 'text-emerald-200' : 'text-muted-foreground'}`}>
                          {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Streaming response */}
                {streamingContent && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-start">
                    <Avatar className="h-7 w-7 shrink-0 ring-1 ring-emerald-200 dark:ring-emerald-800 mt-1">
                      <AvatarFallback className={`bg-gradient-to-br ${agentColors.gradient} text-white text-[10px]`}>
                        <AgentIcon className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[85%] bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/50 shadow-sm rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm">
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      </div>
                      <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-0.5 align-text-bottom" />
                    </div>
                  </motion.div>
                )}

                {sending && !streamingContent && (
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

        {/* Image generation dialog */}
        {showImageDialog && (
          <div className="border-t border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-gray-950 p-3">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                placeholder="Décrivez l'image à générer..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateImage(); }}
                disabled={generatingImage}
                className="flex-1 border-violet-200 dark:border-violet-800"
              />
              <Button
                onClick={handleGenerateImage}
                disabled={!imagePrompt.trim() || generatingImage}
                className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
              >
                {generatingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-gray-950 p-3 shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`shrink-0 ${isRecording ? 'bg-red-50 dark:bg-red-950/30 border-red-300' : ''}`}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            >
              {isRecording ? <MicOff className="h-4 w-4 text-red-500 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`shrink-0 ${showImageDialog ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-300' : ''}`}
              onClick={() => setShowImageDialog(!showImageDialog)}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tapez votre message..."
              disabled={sending}
              className="flex-1 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500 text-sm"
            />
            {sending ? (
              <Button
                type="button"
                onClick={handleStopStreaming}
                variant="destructive"
                className="shrink-0"
                size="icon"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim() || sending}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 shrink-0"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </motion.div>
  );
}
