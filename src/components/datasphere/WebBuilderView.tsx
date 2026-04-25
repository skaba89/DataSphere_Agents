'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const quickPrompts = [
  { label: '🏠 Landing Page', prompt: 'Crée une landing page moderne pour une startup SaaS avec hero section, features, pricing et footer' },
  { label: '💼 Portfolio', prompt: 'Crée un portfolio professionnel avec section projets, compétences et contact' },
  { label: '🛒 E-commerce', prompt: 'Crée une page d\'accueil e-commerce avec produits en vedette, catégories et promotions' },
  { label: '📊 Dashboard', prompt: 'Crée un dashboard admin moderne avec statistiques, graphiques et tableau de données' },
];

function extractHtml(text: string): string | null {
  // Try markdown code block first - handle various formats
  const patterns = [
    /```html\s*\n([\s\S]*?)```/,     // Standard ```html\n...\n```
    /```html\s*([\s\S]*?)```/,        // ```html...\n```  (no newline after html)
    /```\s*\n([\s\S]*?)```/,          // ```\n...\n``` (no language tag but HTML content)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const code = match[1].trim();
      // Verify it's actually HTML
      if (code.includes('<html') || code.includes('<!DOCTYPE') || code.includes('<head') || code.includes('<body')) {
        return code;
      }
    }
  }

  // Try to find full HTML document
  if (text.includes('<html') && text.includes('</html>')) {
    const start = text.indexOf('<html');
    const end = text.lastIndexOf('</html>') + 7;
    return text.slice(start, end);
  }

  if (text.includes('<!DOCTYPE') && text.includes('</html>')) {
    const start = text.indexOf('<!DOCTYPE');
    const end = text.lastIndexOf('</html>') + 7;
    return text.slice(start, end);
  }

  // Try <head>...</html>
  if (text.includes('<head') && text.includes('</html>')) {
    const start = text.indexOf('<head');
    const end = text.lastIndexOf('</html>') + 7;
    const beforeHead = text.slice(0, start);
    const doctypeMatch = beforeHead.match(/<!DOCTYPE[^>]*>/i);
    if (doctypeMatch) {
      return doctypeMatch[0] + '\n' + text.slice(start, end);
    }
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
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const webbuilderAgent = agents.find((a) => a.type === 'webbuilder');
  const agentId = webbuilderAgent?.id || selectedAgentId;

  // Extract HTML from streaming content in real-time
  useEffect(() => {
    if (streamingContent) {
      const html = extractHtml(streamingContent);
      if (html) {
        setExtractedHtml(html);
        // Auto-switch to preview tab when HTML is found
        if (activeTab !== 'preview') {
          setActiveTab('preview');
        }
      }
    }
  }, [streamingContent, activeTab]);

  // Extract HTML from completed messages
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant && !isStreaming) {
      const html = extractHtml(lastAssistant.content);
      if (html) setExtractedHtml(html);
    }
  }, [messages, isStreaming]);

  // Force iframe reload when extractedHtml changes
  useEffect(() => {
    if (iframeRef.current && extractedHtml) {
      // Use srcDoc to update iframe content
      iframeRef.current.srcdoc = extractedHtml;
    }
  }, [extractedHtml]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !agentId || !token || isStreaming) return;

    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setExtractedHtml(null);

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
      // Use the dedicated webbuilder route which sends htmlCode in done event
      const res = await fetch('/api/agents/webbuilder', {
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

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let serverHtmlCode = '';

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
              // The webbuilder route sends htmlCode extracted server-side
              if (parsed.htmlCode) {
                serverHtmlCode = parsed.htmlCode;
              }
              fullContent = parsed.fullResponse || fullContent;
              if (parsed.conversationId && !activeConversationId) {
                setActiveConversationId(parsed.conversationId);
              }
            } else if (parsed.type === 'error') {
              toast.error(parsed.content || 'Erreur lors de la génération');
            }
          } catch (_e) { /* skip */ }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6).trim());
            if (parsed.type === 'done' && parsed.htmlCode) {
              serverHtmlCode = parsed.htmlCode;
            }
            if (parsed.fullResponse) {
              fullContent = parsed.fullResponse;
            }
          } catch (_e) { /* skip */ }
        }
      }

      // Use server-side extracted HTML if available, otherwise try client-side extraction
      if (serverHtmlCode) {
        setExtractedHtml(serverHtmlCode);
      } else {
        const clientHtml = extractHtml(fullContent);
        if (clientHtml) setExtractedHtml(clientHtml);
      }

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: fullContent,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent('');
      // Switch to preview tab after response
      setActiveTab('preview');
      setMobileView('preview');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Try fallback with chat-stream route
        try {
          const fallbackRes = await fetch('/api/agents/chat-stream', {
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

          if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);

          const reader = fallbackRes.body?.getReader();
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
              } catch (_e) { /* skip */ }
            }
          }

          // Extract HTML client-side from the chat-stream response
          const clientHtml = extractHtml(fullContent);
          if (clientHtml) setExtractedHtml(clientHtml);

          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: fullContent,
              createdAt: new Date().toISOString(),
            },
          ]);
        } catch (_e) {
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  const deviceHeights = {
    desktop: '100%',
    tablet: '1024px',
    mobile: '667px',
  };

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

  // Chat panel content
  const chatPanel = (
    <div className="flex flex-col h-full bg-card/30">
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
  );

  // Preview panel content
  const previewPanel = (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-1 flex items-center gap-4">
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3 w-3" />
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === 'code'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-3 w-3" />
            Code
          </button>
        </div>
        {extractedHtml && (
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCode} title="Copier le code">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={downloadHtml} title="Télécharger">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="h-full bg-gray-100 dark:bg-gray-900 p-4 overflow-auto">
            <div className="flex justify-center mx-auto" style={{ maxWidth: deviceWidths[deviceMode] }}>
              <div
                className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 w-full"
                style={{
                  height: deviceHeights[deviceMode],
                  minHeight: '400px',
                }}
              >
                {extractedHtml ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={extractedHtml}
                    className="w-full h-full border-0"
                    title="Aperçu du site"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    style={{ minHeight: '400px' }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                    <Globe className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm">L&apos;aperçu apparaîtra ici</p>
                    <p className="text-xs mt-1">Décrivez un site web pour commencer</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {extractedHtml ? (
              <pre className="p-4 text-xs overflow-auto bg-muted h-full font-mono leading-relaxed">
                <code>{extractedHtml}</code>
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <Code2 className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Le code apparaîtra ici</p>
                <p className="text-xs mt-1">Décrivez un site web pour commencer</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

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
          <p className="text-[11px] text-muted-foreground">
            {isStreaming ? 'Génération en cours...' : extractedHtml ? 'Site généré ✓' : 'Créez des sites web par description'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1">
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
        <Button variant="outline" size="sm" onClick={copyCode} disabled={!extractedHtml} className="hidden sm:flex">
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copier
        </Button>
        <Button
          size="sm"
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hidden sm:flex"
          onClick={downloadHtml}
          disabled={!extractedHtml}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Télécharger
        </Button>
      </div>

      {/* Desktop layout: side by side */}
      <div className="flex-1 flex min-h-0 hidden md:flex">
        <div className="w-96 border-r flex flex-col">
          {chatPanel}
        </div>
        <div className="flex-1 min-w-0">
          {previewPanel}
        </div>
      </div>

      {/* Mobile layout: tabs */}
      <div className="flex-1 flex flex-col md:hidden">
        <div className="flex border-b">
          <button
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              mobileView === 'chat'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobileView('chat')}
          >
            <MessageSquare className="h-3.5 w-3.5 inline mr-1.5" />
            Chat
          </button>
          <button
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              mobileView === 'preview'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-muted-foreground'
            }`}
            onClick={() => setMobileView('preview')}
          >
            <Eye className="h-3.5 w-3.5 inline mr-1.5" />
            Aperçu
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {mobileView === 'chat' ? chatPanel : previewPanel}
        </div>
      </div>
    </div>
  );
}
