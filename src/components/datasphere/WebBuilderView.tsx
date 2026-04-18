'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Send,
  ArrowLeft,
  Sparkles,
  Code2,
  Eye,
  Download,
  StopCircle,
  Copy,
  Check,
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
  ExternalLink,
  RotateCcw,
  Wand2,
  ShoppingBag,
  BarChart3,
  Newspaper,
  Users,
  Briefcase,
  Heart,
  Star,
  ChevronRight,
  FileCode,
  History,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface Version {
  id: string;
  htmlCode: string;
  label: string;
  timestamp: Date;
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const templatePrompts = [
  { label: 'Landing SaaS', icon: Layout, color: 'from-violet-500 to-purple-600', prompt: 'Crée une landing page premium pour une startup SaaS B2B avec: hero section avec gradient animé et CTA, section features avec icônes et descriptions, pricing cards (3 plans) avec le plan Pro mis en avant, testimonials carousel, section FAQ accordion, et footer complet. Design dark mode avec accents violet, typographie Inter, animations au scroll.' },
  { label: 'Portfolio', icon: Palette, color: 'from-rose-500 to-pink-600', prompt: 'Crée un portfolio créatif haut de gamme avec: hero animé avec texte qui apparaît lettre par lettre, galerie de projets en masonry grid avec overlay au hover, section about avec timeline, formulaire de contact avec validation, et footer. Design minimaliste noir et blanc avec accents dorés, police Playfair Display + Inter, animations épurées.' },
  { label: 'E-commerce', icon: ShoppingBag, color: 'from-emerald-500 to-teal-600', prompt: 'Crée une boutique e-commerce premium avec: hero banner avec promotion animée, grille de produits avec filtres (catégories, prix), cards produits avec image, prix, et bouton panier, panier latéral coulissant avec récapitulatif, section tendances, newsletter popup, et footer. Design moderne avec accents verts, micro-interactions fluides.' },
  { label: 'Dashboard', icon: BarChart3, color: 'from-blue-500 to-indigo-600', prompt: 'Crée un dashboard analytics pro avec: sidebar navigation avec icônes et badges, header avec recherche et notifications, cartes de stats avec sparklines, graphiques CSS (bar chart + donut chart), tableau de données triable avec pagination, et section activité récente. Design dark theme avec accents bleus, glassmorphism, données réalistes.' },
  { label: 'Blog', icon: Newspaper, color: 'from-amber-500 to-orange-600', prompt: 'Crée un blog moderne et élégant avec: hero section avec article vedette, grille d\'articles avec images et catégories, sidebar avec catégories et tags, article complet avec typographie soignée, commentaires, et newsletter. Design épuré avec accents ambre, police Merriweather + Inter, lecture agréable.' },
  { label: 'Agence', icon: Briefcase, color: 'from-cyan-500 to-blue-600', prompt: 'Crée un site d\'agence digitale premium avec: hero fullscreen avec vidéo background et texte animé, services avec icônes animées, portfolio filtrable, équipe avec cards et hover effects, chiffres clés avec compteur animé, témoignages, et contact. Design moderne avec accents cyan, animations spectaculaires.' },
  { label: 'Communauté', icon: Users, color: 'from-pink-500 to-red-600', prompt: 'Crée une plateforme communautaire avec: hero avec compteur de membres animé, feed de posts avec likes et commentaires, profils utilisateurs, groupes/discussions, événements à venir, et leaderboard. Design vibrant avec accents roses, interface sociale intuitive, interactions temps réel.' },
  { label: 'Santé', icon: Heart, color: 'from-green-500 to-emerald-600', prompt: 'Crée un site de santé et wellness avec: hero apaisant avec gradient, services de consultation, équipe médicale avec spécialités, prise de rendez-vous, témoignages patients, blog santé, et contact d\'urgence. Design serein avec couleurs naturelles, police Outfit, animations douces et rassurantes.' },
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
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);

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
        const lastHtml = [...loaded].reverse().find(m => m.htmlCode);
        if (lastHtml?.htmlCode) {
          setPreviewHtml(lastHtml.htmlCode);
          addVersion(lastHtml.htmlCode, 'Chargé depuis historique');
        }
      }
    } catch { /* silent */ }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setPreviewHtml('');
    setVersions([]);
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

  const addVersion = useCallback((html: string, label?: string) => {
    setVersions(prev => {
      const newVersion: Version = {
        id: Date.now().toString(),
        htmlCode: html,
        label: label || `Version ${prev.length + 1}`,
        timestamp: new Date(),
      };
      // Keep max 20 versions
      return [...prev, newVersion].slice(-20);
    });
  }, []);

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

  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent, quickPrompt?: string) => {
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
                addVersion(finalHtml);
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
                addVersion(finalHtml);
              }
              if (data.conversationId) setActiveConversationId(data.conversationId);
              fetchConversations();
            }
          } catch { /* ignore */ }
        }
      }

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
          addVersion(finalHtml);
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
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadHtml = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `website-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier HTML téléchargé !');
  };

  const handleOpenFullscreen = () => {
    if (!previewHtml) return;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(previewHtml);
      win.document.close();
    }
  };

  const handleRestoreVersion = (version: Version) => {
    setPreviewHtml(version.htmlCode);
    setActiveTab('preview');
    toast.success('Version restaurée');
  };

  const handleBackToAgents = () => {
    setSelectedAgentId(null);
    setCurrentAgent(null);
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setPreviewHtml('');
    setVersions([]);
    setShowConversations(false);
    setShowVersionHistory(false);
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

  // Simple syntax highlighting for HTML code
  const highlightHtml = (code: string): string => {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // HTML tags
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<span style="color:#f97583">$2</span>')
      // Attributes
      .replace(/([\w-]+)(=)/g, '<span style="color:#b392f0">$1</span>$2')
      // Strings
      .replace(/(".*?")/g, '<span style="color:#9ecbff">$1</span>')
      // Comments
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#6a737d">$1</span>')
      // CSS properties
      .replace(/([\w-]+)(\s*:\s*)/g, '<span style="color:#79c0ff">$1</span>$2');
  };

  // No webbuilder agent selected — show picker with templates
  if (!currentAgent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-200/50 dark:border-cyan-800/30">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-600/10 dark:from-cyan-500/20 dark:via-blue-500/10 dark:to-indigo-600/20" />
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600" />
            <div className="relative p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/30 shrink-0"
                >
                  <Globe className="h-12 w-12 text-white" />
                </motion.div>
                <div className="flex-1 text-center md:text-left space-y-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Web Builder IA
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                      Créez des sites web professionnels en quelques secondes
                    </p>
                  </div>
                  <p className="text-muted-foreground max-w-xl">
                    Décrivez votre vision et notre IA génère un site web complet, moderne et responsive.
                    Itérations illimitées, preview en direct, export en un clic.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border-0">
                      <Sparkles className="h-3 w-3 mr-1" /> IA Avancée
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0">
                      <Eye className="h-3 w-3 mr-1" /> Preview Live
                    </Badge>
                    <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border-0">
                      <History className="h-3 w-3 mr-1" /> Historique
                    </Badge>
                    <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border-0">
                      <Download className="h-3 w-3 mr-1" /> Export HTML
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Gallery */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-xl font-bold">Galerie de Templates</h2>
              <Badge variant="secondary" className="text-[10px]">{templatePrompts.length} templates</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Choisissez un template pour démarrer rapidement, ou décrivez votre propre site.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {templatePrompts.map((tp, index) => {
                const IconComp = tp.icon;
                return (
                  <motion.div
                    key={tp.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-xl transition-all border-cyan-100/50 dark:border-cyan-900/30 overflow-hidden group h-full"
                      onClick={() => {
                        const wbAgent = agents.find(a => a.type === 'webbuilder');
                        if (wbAgent) {
                          setCurrentAgent(wbAgent);
                          setSelectedAgentId(wbAgent.id);
                        }
                        setTimeout(() => {
                          setInput(tp.prompt);
                          inputRef.current?.focus();
                        }, 100);
                      }}
                    >
                      <div className={`h-2 bg-gradient-to-r ${tp.color}`} />
                      <CardContent className="p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tp.color} text-white shadow-lg`}>
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">{tp.label}</h3>
                            <p className="text-[10px] text-muted-foreground">Template premium</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{tp.prompt.slice(0, 100)}...</p>
                        <div className="flex items-center text-[10px] text-cyan-600 dark:text-cyan-400 font-medium group-hover:gap-2 transition-all">
                          <span>Utiliser ce template</span>
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Start from scratch */}
          {agents.filter(a => a.type === 'webbuilder').map((agent) => (
            <motion.div key={agent.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Card
                className="cursor-pointer hover:shadow-xl transition-all border-cyan-200 dark:border-cyan-800/50 overflow-hidden"
                onClick={() => {
                  setCurrentAgent(agent);
                  setSelectedAgentId(agent.id);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
              >
                <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600" />
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">Démarrer from scratch</h3>
                    <p className="text-sm text-muted-foreground mt-1">Décrivez votre site web en vos propres mots</p>
                  </div>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25">
                    Commencer
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {loadingAgents && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full rounded-xl" /></CardContent></Card>
              ))}
            </div>
          )}
        </div>
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
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleBackToAgents}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
            <Globe className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">Web Builder IA</h2>
            <p className="text-[10px] text-muted-foreground">Création de sites en temps réel</p>
          </div>
          <div className="flex items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setShowConversations(!showConversations); setShowVersionHistory(false); }}>
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Historique</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setShowVersionHistory(!showVersionHistory); setShowConversations(false); }}>
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Versions</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleNewChat}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Conversations</p>
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

        {/* Version history sidebar */}
        <AnimatePresence>
          {showVersionHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 200, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-cyan-100 dark:border-cyan-900/50 overflow-hidden"
            >
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Versions</p>
                  {versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Aucune version encore</p>
                  ) : (
                    [...versions].reverse().map((version, i) => (
                      <div
                        key={version.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group ${
                          previewHtml === version.htmlCode
                            ? 'bg-cyan-50 dark:bg-cyan-950/30'
                            : 'hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20'
                        }`}
                        onClick={() => handleRestoreVersion(version)}
                      >
                        <FileCode className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{version.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {version.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {i === 0 && (
                          <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border-0 text-[9px]">
                            Dernière
                          </Badge>
                        )}
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 mb-3">
                  <Globe className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg">Web Builder IA</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Décrivez le site web de vos rêves
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 max-w-sm mx-auto">
                  {templatePrompts.slice(0, 4).map((tp) => {
                    const IconComp = tp.icon;
                    return (
                      <button
                        key={tp.label}
                        onClick={() => handleSendMessage(undefined, tp.prompt)}
                        className="text-left p-3 rounded-xl border border-cyan-200 dark:border-cyan-800/50 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-all hover:shadow-md group"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <IconComp className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-[11px] font-semibold">{tp.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{tp.prompt.slice(0, 50)}...</p>
                      </button>
                    );
                  })}
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
                    <div className="p-1 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white h-6 w-6 shrink-0 flex items-center justify-center mt-1">
                      <Globe className="h-3 w-3" />
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
                        <div className="flex items-center gap-1.5">
                          {msg.htmlCode ? (
                            <>
                              <Star className="h-3 w-3 text-amber-500" />
                              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Site généré avec succès !</p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">Réponse...</p>
                          )}
                        </div>
                        {msg.htmlCode && (
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] gap-1 text-cyan-600 hover:text-cyan-700 bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-950/50"
                              onClick={() => { setPreviewHtml(msg.htmlCode!); setActiveTab('preview'); }}
                            >
                              <Eye className="h-3 w-3" /> Voir
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] gap-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => { setPreviewHtml(msg.htmlCode!); setActiveTab('code'); }}
                            >
                              <Code2 className="h-3 w-3" /> Code
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] gap-1 bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950/50"
                              onClick={() => { setPreviewHtml(msg.htmlCode!); setActiveTab('preview'); setInput('Amprove ce design, rends-le encore plus professionnel et moderne'); inputRef.current?.focus(); }}
                            >
                              <Wand2 className="h-3 w-3" /> Améliorer
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
                <div className="p-1 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white h-6 w-6 shrink-0 flex items-center justify-center mt-1">
                  <Globe className="h-3 w-3" />
                </div>
                <div className="max-w-[85%] bg-white dark:bg-gray-900 border border-cyan-100 dark:border-cyan-900/50 shadow-sm rounded-2xl rounded-bl-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <p className="text-xs text-muted-foreground">
                      {extractHtmlFromResponse(streamingContent) ? 'Construction du site en cours...' : 'Rédaction du code...'}
                    </p>
                  </div>
                  {extractHtmlFromResponse(streamingContent) && (
                    <div className="mt-1.5 h-1 bg-cyan-100 dark:bg-cyan-950/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {sending && !streamingContent && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-start">
                <div className="p-1 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white h-6 w-6 shrink-0 flex items-center justify-center mt-1">
                  <Globe className="h-3 w-3" />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-cyan-100 dark:border-cyan-900/50 rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-cyan-100 dark:border-cyan-900/50 p-3 shrink-0 bg-white dark:bg-gray-950">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Décrivez votre site web... (Shift+Enter pour nouvelle ligne)"
              disabled={sending}
              className="w-full border-cyan-200 dark:border-cyan-800 focus-visible:ring-cyan-500 text-sm min-h-[60px] max-h-[120px] resize-none"
              rows={2}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {input.trim() && (
                  <span className="text-[10px] text-muted-foreground">
                    {input.length} caractères
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {sending ? (
                  <Button type="button" onClick={handleStopStreaming} variant="destructive" className="shrink-0" size="sm">
                    <StopCircle className="h-4 w-4 mr-1.5" /> Arrêter
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!input.trim() || sending}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 shrink-0"
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-1.5" /> Générer
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-100 dark:bg-gray-900">
        {/* Preview Header */}
        <div className="flex items-center gap-2 p-2.5 border-b border-cyan-100 dark:border-cyan-900/50 bg-white dark:bg-gray-950 shrink-0">
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

          {/* Version counter */}
          {versions.length > 0 && (
            <Badge variant="secondary" className="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400 border-0 text-[10px]">
              <History className="h-3 w-3 mr-1" /> {versions.length} version{versions.length > 1 ? 's' : ''}
            </Badge>
          )}

          {/* Actions */}
          {previewHtml && (
            <div className="flex items-center gap-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenFullscreen}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Plein écran</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    title="Site Preview"
                    srcDoc={previewHtml}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 mb-4">
                      <Globe className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Aucun aperçu</h3>
                    <p className="text-sm text-center mt-2 max-w-xs">
                      Décrivez le site web que vous souhaitez créer et l&apos;IA générera le code avec preview en direct.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      <Badge variant="secondary" className="text-[10px]">
                        <Zap className="h-3 w-3 mr-1" /> HTML/CSS/JS
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        <Layout className="h-3 w-3 mr-1" /> Responsive
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        <Sparkles className="h-3 w-3 mr-1" /> Animations
                      </Badge>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="h-full overflow-auto bg-gray-950">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
                <FileCode className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-mono text-gray-400">
                  {previewHtml ? `index.html — ${(previewHtml.length / 1024).toFixed(1)} KB` : 'Aucun code généré'}
                </span>
                <div className="flex-1" />
                {previewHtml && (
                  <span className="text-[10px] font-mono text-gray-500">
                    {previewHtml.split('\n').length} lignes
                  </span>
                )}
              </div>
              {previewHtml ? (
                <pre
                  ref={codeRef}
                  className="p-4 text-xs font-mono leading-relaxed overflow-x-auto"
                  dangerouslySetInnerHTML={{
                    __html: highlightHtml(previewHtml)
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <Code2 className="h-12 w-12 text-gray-700 mb-4" />
                  <h3 className="font-semibold text-lg text-gray-400">Aucun code</h3>
                  <p className="text-sm text-center mt-2 text-gray-500 max-w-xs">
                    Le code source apparaîtra ici une fois le site généré.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state overlay when no content */}
          {!previewHtml && !streamingContent && activeTab === 'preview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
            >
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-cyan-200/50 dark:border-cyan-800/30">
                <p className="text-xs text-muted-foreground text-center">
                  <Sparkles className="h-3 w-3 inline mr-1 text-cyan-500" />
                  Choisissez un template ou décrivez votre site pour commencer
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
