'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Send,
  Loader2,
  ArrowLeft,
  Sparkles,
  Code2,
  Eye,
  Download,
  StopCircle,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  Plus,
  Trash2,
  MessageSquare,
  Zap,
  Layout,
  Palette,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  htmlCode?: string;
  timestamp: Date;
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const quickPrompts = [
  { label: 'Landing page SaaS', icon: Layout, prompt: 'Crée une landing page moderne pour une startup SaaS avec hero section, features, pricing, testimonials et footer. Design dark mode avec accents néon.' },
  { label: 'Portfolio créatif', icon: Palette, prompt: 'Crée un portfolio créatif avec une animation hero, galerie de projets en grid, section about et contact. Design minimaliste et élégant avec animations au scroll.' },
  { label: 'E-commerce', icon: Layers, prompt: 'Crée une boutique e-commerce moderne avec hero banner, produits en grille, panier latéral, et footer. Design coloré et dynamique avec micro-interactions.' },
  { label: 'Dashboard', icon: Monitor, prompt: 'Crée un dashboard analytics avec sidebar, cartes de stats, graphiques en CSS, tableau de données et header. Design pro avec thème sombre et accents bleus.' },
];

export default function WebBuilderView() {
  const { token, selectedAgentId, setSelectedAgentId, activeConversationId, setActiveConversationId } = useAppStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [showConversations, setShowConversations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingContent, scrollToBottom]);

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
          // Auto-select webbuilder agent
          const webbuilder = json.agents.find((a: Agent) => a.type === 'webbuilder');
          if (webbuilder) {
            setCurrentAgent(webbuilder);
            setSelectedAgentId(webbuilder.id);
          }
        }
      } catch { /* silent */ } finally { setLoadingAgents(false); }
    };
    fetchAgents();
  }, [token, setSelectedAgentId]);

  // Set current agent when selectedAgentId changes
  useEffect(() => {
    if (selectedAgentId && agents.length > 0) {
      if (selectedAgentId === 'webbuilder') {
        const wbAgent = agents.find((a: Agent) => a.type === 'webbuilder');
        if (wbAgent) {
          setCurrentAgent(wbAgent);
          setSelectedAgentId(wbAgent.id);
        }
      } else {
        const agent = agents.find((a: Agent) => a.id === selectedAgentId);
        if (agent && agent.type === 'webbuilder') setCurrentAgent(agent);
      }
    }
  }, [selectedAgentId, agents, setSelectedAgentId]);

  // Fetch conversations when agent is selected
  useEffect(() => {
    if (currentAgent) fetchConversations();
  }, [currentAgent]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (activeConversationId) loadConversationMessages(activeConversationId);
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
    try {
      const res = await fetch(`/api/conversations/messages?conversationId=${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const loaded: Message[] = json.messages.map((m: any) => {
          const htmlMatch = m.content.match(/```html\s*([\s\S]*?)```/);
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            htmlCode: htmlMatch ? htmlMatch[1].trim() : undefined,
            timestamp: new Date(m.createdAt),
          };
        });
        setMessages(loaded);
        // Set preview to last generated HTML
        const lastHtml = [...loaded].reverse().find(m => m.htmlCode);
        if (lastHtml?.htmlCode) setPreviewHtml(lastHtml.htmlCode);
      }
    } catch { /* silent */ }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setPreviewHtml('');
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
          setPreviewHtml('');
        }
      }
    } catch { toast.error('Erreur réseau'); }
  };

  const extractHtmlFromResponse = (text: string): string => {
    const htmlMatch = text.match(/```html\s*([\s\S]*?)```/);
    return htmlMatch ? htmlMatch[1].trim() : '';
  };

  const updateIframePreview = useCallback((html: string) => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, []);

  // Update iframe when previewHtml changes
  useEffect(() => {
    if (previewHtml && activeTab === 'preview') {
      updateIframePreview(previewHtml);
    }
  }, [previewHtml, activeTab, updateIframePreview]);

  const handleSendMessage = async (e?: React.FormEvent, quickPrompt?: string) => {
    e?.preventDefault();
    const messageText = quickPrompt || input.trim();
    if (!messageText || !currentAgent || sending) return;
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setStreamingContent('');
    setActiveTab('preview');

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/agents/webbuilder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: currentAgent.id,
          message: messageText,
          conversationId: activeConversationId || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('stream_failed');

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

              // Live preview update: try to extract HTML and update iframe
              const extractedHtml = extractHtmlFromResponse(fullText);
              if (extractedHtml) {
                setPreviewHtml(extractedHtml);
              }
              streamWorked = true;
            } else if (data.type === 'done') {
              const finalHtml = data.htmlCode || extractHtmlFromResponse(data.fullResponse || fullText);
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.fullResponse || fullText,
                htmlCode: finalHtml,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingContent('');
              if (finalHtml) {
                setPreviewHtml(finalHtml);
                setGenerationCount(prev => prev + 1);
              }
              setActiveConversationId(data.conversationId);
              fetchConversations();
            } else if (data.type === 'error') {
              toast.error(data.content);
              setStreamingContent('');
            }
          } catch {
            // Ignore parse errors
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
              const finalHtml = data.htmlCode || extractHtmlFromResponse(data.fullResponse || fullText);
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.fullResponse || fullText,
                htmlCode: finalHtml,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingContent('');
              if (finalHtml) {
                setPreviewHtml(finalHtml);
                setGenerationCount(prev => prev + 1);
              }
              if (data.conversationId) setActiveConversationId(data.conversationId);
              fetchConversations();
            }
          } catch { /* ignore */ }
        }
      }

      // If streaming produced content but no done event
      if (streamWorked && fullText) {
        const finalHtml = extractHtmlFromResponse(fullText);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullText,
          htmlCode: finalHtml || undefined,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent('');
        if (finalHtml) {
          setPreviewHtml(finalHtml);
          setGenerationCount(prev => prev + 1);
        }
        if (convId) setActiveConversationId(convId);
        fetchConversations();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStreamingContent('');
      } else {
        toast.error('Erreur de génération. Veuillez réessayer.');
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

  const handleCopyCode = () => {
    if (previewHtml) {
      navigator.clipboard.writeText(previewHtml);
      setCopied(true);
      toast.success('Code copié dans le presse-papiers !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadHtml = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier HTML téléchargé !');
  };

  const handleBackToAgents = () => {
    setSelectedAgentId(null);
    setCurrentAgent(null);
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setPreviewHtml('');
    setShowConversations(false);
  };

  const deviceWidths: Record<PreviewDevice, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  const deviceIcons: Record<PreviewDevice, React.ElementType> = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone,
  };

  // No webbuilder agent selected — show picker
  if (!currentAgent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/50">
            <Globe className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Web Builder</h1>
            <p className="text-muted-foreground mt-1">Créez des sites web professionnels avec l&apos;IA</p>
          </div>
        </div>

        {loadingAgents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full rounded-xl" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero banner */}
            <Card className="overflow-hidden border-cyan-200 dark:border-cyan-800/50">
              <div className="h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600" />
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                    <Globe className="h-10 w-10 text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold">Créez des sites web avec l&apos;IA</h2>
                    <p className="text-muted-foreground mt-2 max-w-lg">
                      Décrivez le site de vos rêves et notre IA génère le code HTML/CSS/JS complet.
                      Preview en direct, itérations illimitées, export en un clic.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                      <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400 border-0">
                        <Zap className="h-3 w-3 mr-1" /> Génération instantanée
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border-0">
                        <Eye className="h-3 w-3 mr-1" /> Preview live
                      </Badge>
                      <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 border-0">
                        <Download className="h-3 w-3 mr-1" /> Export HTML
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick start prompts */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Démarrage rapide</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {quickPrompts.map((qp) => {
                  const IconComp = qp.icon;
                  return (
                    <motion.div key={qp.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        className="cursor-pointer hover:shadow-md transition-all border-cyan-100 dark:border-cyan-900/50 h-full"
                        onClick={() => {
                          const wbAgent = agents.find(a => a.type === 'webbuilder');
                          if (wbAgent) {
                            setCurrentAgent(wbAgent);
                            setSelectedAgentId(wbAgent.id);
                          }
                          // Will need to set input after agent is selected
                          setTimeout(() => {
                            setInput(qp.prompt);
                            inputRef.current?.focus();
                          }, 100);
                        }}
                      >
                        <CardContent className="p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                              <IconComp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <span className="text-sm font-semibold">{qp.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{qp.prompt}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Web builder agent card */}
            {agents.filter(a => a.type === 'webbuilder').map((agent) => (
              <motion.div key={agent.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all border-cyan-200 dark:border-cyan-800/50"
                  onClick={() => {
                    setCurrentAgent(agent);
                    setSelectedAgentId(agent.id);
                  }}
                >
                  <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600" />
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-900/50">
                      <Globe className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                    </div>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                      Commencer
                      <Sparkles className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Web Builder Interface
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[calc(100vh)]">
      {/* Chat Panel */}
      <div className="w-[420px] shrink-0 flex flex-col border-r border-cyan-100 dark:border-cyan-900/50 bg-white dark:bg-gray-950">
        {/* Chat Header */}
        <div className="flex items-center gap-2 p-3 border-b border-cyan-100 dark:border-cyan-900/50 shrink-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleBackToAgents}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
            <Globe className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">Web Builder IA</h2>
            <p className="text-[10px] text-muted-foreground">Création de sites en temps réel</p>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowConversations(!showConversations)}>
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Historique</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={handleNewChat}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 text-[10px]">
              <Sparkles className="h-3 w-3 mr-0.5" />
              IA
            </Badge>
          </div>
        </div>

        {/* Conversation sidebar */}
        <AnimatePresence>
          {showConversations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 200, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-cyan-100 dark:border-cyan-900/50 overflow-hidden"
            >
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-1">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucune conversation</p>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group ${
                          activeConversationId === conv.id
                            ? 'bg-cyan-50 dark:bg-cyan-950/30'
                            : 'hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20'
                        }`}
                        onClick={() => handleSelectConversation(conv)}
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-xs font-medium truncate flex-1">{conv.title}</p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                              <AlertDialogDescription>Action irréversible.</AlertDialogDescription>
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-cyan-50/20 to-transparent dark:from-cyan-950/5">
          <div className="p-3 space-y-3">
            {messages.length === 0 && !sending && !streamingContent && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                <div className="inline-flex p-3 rounded-2xl bg-cyan-100 dark:bg-cyan-900/50 mb-3">
                  <Globe className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="font-semibold">Web Builder IA</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Décrivez le site web que vous souhaitez créer
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  {quickPrompts.slice(0, 4).map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => handleSendMessage(undefined, qp.prompt)}
                      className="text-left p-2 rounded-lg border border-cyan-200 dark:border-cyan-800/50 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
                    >
                      <p className="text-[11px] font-medium">{qp.label}</p>
                    </button>
                  ))}
                </div>
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
                    <div className="p-1 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 h-6 w-6 shrink-0 flex items-center justify-center mt-1">
                      <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-900 border border-cyan-100 dark:border-cyan-900/50 shadow-sm rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {msg.htmlCode ? '✨ Site web généré avec succès !' : 'Génération en cours...'}
                        </p>
                        {msg.htmlCode && (
                          <div className="flex gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] gap-1 text-cyan-600 hover:text-cyan-700"
                              onClick={() => { setPreviewHtml(msg.htmlCode!); setActiveTab('preview'); }}
                            >
                              <Eye className="h-3 w-3" /> Voir
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => { setPreviewHtml(msg.htmlCode!); setActiveTab('code'); }}
                            >
                              <Code2 className="h-3 w-3" /> Code
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-xs">{msg.content}</p>
                    )}
                    <p className={`text-[8px] mt-1 ${msg.role === 'user' ? 'text-cyan-200' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming */}
            {streamingContent && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-start">
                <div className="p-1 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 h-6 w-6 shrink-0 flex items-center justify-center mt-1">
                  <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="max-w-[85%] bg-white dark:bg-gray-900 border border-cyan-100 dark:border-cyan-900/50 shadow-sm rounded-2xl rounded-bl-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <p className="text-xs text-muted-foreground">
                      {extractHtmlFromResponse(streamingContent) ? '🏗️ Construction du site...' : '✍️ Rédaction du code...'}
                    </p>
                  </div>
                  {extractHtmlFromResponse(streamingContent) && (
                    <div className="mt-1.5 h-1 bg-cyan-100 dark:bg-cyan-950/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {sending && !streamingContent && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-start">
                <div className="p-1 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 h-6 w-6 shrink-0 flex items-center justify-center mt-1">
                  <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-cyan-100 dark:border-cyan-900/50 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-cyan-100 dark:border-cyan-900/50 p-3 shrink-0 bg-white dark:bg-gray-950">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décrivez votre site web..."
              disabled={sending}
              className="flex-1 border-cyan-200 dark:border-cyan-800 focus-visible:ring-cyan-500 text-sm"
            />
            {sending ? (
              <Button type="button" onClick={handleStopStreaming} variant="destructive" className="shrink-0" size="icon">
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim() || sending}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 shrink-0"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-100 dark:bg-gray-900">
        {/* Preview Header */}
        <div className="flex items-center gap-2 p-3 border-b border-cyan-100 dark:border-cyan-900/50 bg-white dark:bg-gray-950 shrink-0">
          {/* Tab switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" /> Code
            </button>
          </div>

          {/* Device switcher */}
          {activeTab === 'preview' && (
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {(Object.entries(deviceIcons) as [PreviewDevice, React.ElementType][]).map(([device, Icon]) => (
                <button
                  key={device}
                  onClick={() => setPreviewDevice(device)}
                  className={`p-1.5 rounded-md transition-all ${
                    previewDevice === device
                      ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Generation counter */}
          {generationCount > 0 && (
            <Badge variant="secondary" className="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400 border-0 text-[10px]">
              {generationCount} version{generationCount > 1 ? 's' : ''}
            </Badge>
          )}

          {/* Actions */}
          {previewHtml && (
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyCode}>
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? 'Copié !' : 'Copier le code'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadHtml}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Télécharger HTML</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Preview/Code Content */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'preview' ? (
            <div className="h-full flex items-start justify-center p-4 overflow-auto bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)] dark:bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#0f0f23_0%_50%)] bg-[length_20px_20px]">
              <motion.div
                layout
                className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
                style={{
                  width: deviceWidths[previewDevice],
                  maxWidth: '100%',
                  height: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '1024px' : '812px',
                }}
              >
                {previewHtml ? (
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title="Website Preview"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                      <Globe className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">Aucun site généré</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                      Décrivez le site web que vous souhaitez créer dans le panneau de chat.
                      L&apos;IA générera le code et la preview apparaîtra ici.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      <Badge variant="outline" className="text-[10px]">HTML5</Badge>
                      <Badge variant="outline" className="text-[10px]">CSS3</Badge>
                      <Badge variant="outline" className="text-[10px]">JavaScript</Badge>
                      <Badge variant="outline" className="text-[10px]">Responsive</Badge>
                      <Badge variant="outline" className="text-[10px]">Tailwind CSS</Badge>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4">
                {previewHtml ? (
                  <pre className="bg-gray-950 text-gray-100 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                    <code>{previewHtml}</code>
                  </pre>
                ) : (
                  <div className="text-center py-16">
                    <Code2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Le code source apparaîtra ici</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </motion.div>
  );
}
