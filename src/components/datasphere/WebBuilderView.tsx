'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Globe,
  Monitor,
  Tablet,
  Smartphone,
  Send,
  Square,
  Copy,
  Download,
  Code2,
  Eye,
  Loader2,
  Sparkles,
  ArrowLeft,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const quickPrompts = [
  { label: '🏠 Landing Page', prompt: 'Crée une landing page moderne pour une startup SaaS avec hero section, features, pricing et footer' },
  { label: '💼 Portfolio', prompt: 'Crée un portfolio professionnel avec section projets, compétences et contact' },
  { label: '🛒 E-commerce', prompt: 'Crée une page d\'accueil e-commerce avec produits en vedette, catégories et promotions' },
  { label: '📊 Dashboard', prompt: 'Crée un dashboard admin moderne avec statistiques, graphiques et tableau de données' },
];

function extractHtml(text: string): string | null {
  // Try to extract HTML between ```html and ``` tags
  const match = text.match(/```html\s*\n([\s\S]*?)```/);
  if (match) return match[1].trim();

  // Try to find a complete HTML document
  if (text.includes('<html') && text.includes('</html>')) {
    const start = text.indexOf('<html');
    const end = text.lastIndexOf('</html>') + 7;
    return text.slice(start, end);
  }

  // Try to find any HTML with doctype
  if (text.includes('<!DOCTYPE') && text.includes('</html>')) {
    const start = text.indexOf('<!DOCTYPE');
    const end = text.lastIndexOf('</html>') + 7;
    return text.slice(start, end);
  }

  return null;
}

export default function WebBuilderView() {
  const {
    token,
    agents,
    selectedAgentId,
    setSelectedAgentId,
    activeConversationId,
    setActiveConversationId,
    isStreaming,
    setIsStreaming,
    setCurrentView,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [extractedHtml, setExtractedHtml] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Find webbuilder agent
  const webbuilderAgent = agents.find((a) => a.type === 'webbuilder');
  const agentId = webbuilderAgent?.id || selectedAgentId;

  // Update extracted HTML from streaming content
  useEffect(() => {
    if (streamingContent) {
      const html = extractHtml(streamingContent);
      if (html) setExtractedHtml(html);
    }
  }, [streamingContent]);

  // Also extract from final messages
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant && !isStreaming) {
      const html = extractHtml(lastAssistant.content);
      if (html) setExtractedHtml(html);
    }
  }, [messages, isStreaming]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !agentId || !token || isStreaming) return;

    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
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
          agentId,
          message: text,
          conversationId: activeConversationId || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === 'meta' && parsed.conversationId) {
              if (!activeConversationId) setActiveConversationId(parsed.conversationId);
            } else if (parsed.type === 'token') {
              fullContent += parsed.content;
              setStreamingContent(fullContent);
            } else if (parsed.type === 'done') {
              fullContent = parsed.fullResponse || fullContent;
              if (parsed.conversationId && !activeConversationId) {
                setActiveConversationId(parsed.conversationId);
              }
            }
          } catch { /* skip */ }
        }
      }

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: fullContent,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent('');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Fallback to non-streaming
        try {
          const fallbackRes = await fetch('/api/agents/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              agentId,
              message: text,
              conversationId: activeConversationId || undefined,
            }),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackData.response) {
            if (fallbackData.conversationId && !activeConversationId) {
              setActiveConversationId(fallbackData.conversationId);
            }
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: fallbackData.response,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        } catch {
          toast.error('Erreur lors de la communication avec l\'agent');
        }
      }
      setStreamingContent('');
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const copyCode = () => {
    if (extractedHtml) {
      navigator.clipboard.writeText(extractedHtml);
      toast.success('Code HTML copié !');
    }
  };

  const downloadHtml = () => {
    if (!extractedHtml) return;
    const blob = new Blob([extractedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier téléchargé !');
  };

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  // If no webbuilder agent selected yet
  if (!agentId && !webbuilderAgent) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Globe className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Web Builder non disponible</h2>
          <p className="text-muted-foreground">Aucun agent Web Builder trouvé</p>
          <Button className="mt-4" onClick={() => setCurrentView('agents')}>
            Voir les agents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentView('agents')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-medium">Web Builder IA</h2>
          <p className="text-[11px] text-muted-foreground">Créez des sites web par description</p>
        </div>
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as const).map((mode) => {
            const icons = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
            const Icon = icons[mode];
            return (
              <Button
                key={mode}
                variant={deviceMode === mode ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setDeviceMode(mode)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={copyCode} disabled={!extractedHtml}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copier
        </Button>
        <Button
          size="sm"
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
          onClick={downloadHtml}
          disabled={!extractedHtml}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Télécharger
        </Button>
      </div>

      {/* Main content: Chat + Preview */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chat */}
        <div className="w-96 border-r flex flex-col bg-card/30">
          {/* Quick prompts */}
          {messages.length === 0 && !isStreaming && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                <span className="text-sm font-medium">Démarrage rapide</span>
              </div>
              {quickPrompts.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className="w-full text-left p-3 rounded-xl border hover:bg-accent hover:shadow-sm transition-all text-sm"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Globe className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-2 [&_code]:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streamingContent && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Globe className="h-3 w-3 text-white" />
                </div>
                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-muted">
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-2">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
                  <span className="inline-block w-2 h-4 bg-cyan-500 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Décrivez votre site web..."
                disabled={isStreaming}
                className="flex-1"
              />
              {isStreaming ? (
                <Button variant="destructive" size="icon" onClick={stopStreaming}>
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
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

        {/* Right: Preview / Code */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="border-b px-4 py-1">
              <TabsList>
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Aperçu
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs">
                  <Code2 className="h-3 w-3 mr-1" />
                  Code
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="flex-1 m-0 overflow-auto bg-gray-100 dark:bg-gray-900">
              <div className="flex justify-center p-4 min-h-full">
                <div
                  className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
                  style={{
                    width: deviceWidths[deviceMode],
                    maxWidth: '100%',
                    height: deviceMode === 'desktop' ? '100%' : deviceMode === 'tablet' ? '1024px' : '667px',
                    minHeight: '400px',
                  }}
                >
                  {extractedHtml ? (
                    <iframe
                      ref={iframeRef}
                      srcDoc={extractedHtml}
                      className="w-full h-full border-0"
                      title="Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Globe className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm">L&apos;aperçu apparaîtra ici</p>
                      <p className="text-xs mt-1">Décrivez un site web pour commencer</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 m-0 overflow-auto">
              {extractedHtml ? (
                <pre className="p-4 text-xs overflow-auto bg-muted h-full">
                  <code>{extractedHtml}</code>
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Code2 className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Le code apparaîtra ici</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
