'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Bot,
  FileText,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  query: string;
  conversations: Array<{
    id: string;
    title: string;
    agentId: string;
    agentName: string;
    updatedAt: string;
    matchedText: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    icon: string;
    color: string;
  }>;
  documents: Array<{
    id: string;
    filename: string;
    size: number;
    matchedSnippet: string;
  }>;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { token, setCurrentView, setSelectedAgentId, setActiveConversationId } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!token || q.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&types=conversations,agents,documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (_e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!query || query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query, performSearch]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
      setLoading(false);
    }
  }, [open]);

  const handleConversationClick = (conversationId: string, agentId: string) => {
    setActiveConversationId(conversationId);
    setSelectedAgentId(agentId);
    setCurrentView('chat');
    onOpenChange(false);
  };

  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId(agentId);
    setCurrentView('chat');
    onOpenChange(false);
  };

  const handleDocumentClick = () => {
    setCurrentView('documents');
    onOpenChange(false);
  };

  const hasResults = results && (
    results.conversations.length > 0 ||
    results.agents.length > 0 ||
    results.documents.length > 0
  );

  const totalResults = results
    ? results.conversations.length + results.agents.length + results.documents.length
    : 0;

  const getIconForAgent = (iconName: string) => {
    return <Bot className="h-4 w-4" />;
  };

  const getAgentColor = (color: string) => {
    const colors: Record<string, string> = {
      emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
      amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
      violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400',
      rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
      cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
    };
    return colors[color] || colors.emerald;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans conversations, agents, documents..."
            className="border-0 focus-visible:ring-0 p-0 h-auto text-base placeholder:text-muted-foreground/60"
            autoFocus
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2 flex-shrink-0" />
          )}
          {query.length >= 2 && !loading && results && (
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0 whitespace-nowrap">
              {totalResults} résultat{totalResults > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!query || query.length < 2 ? (
            <div className="py-12 text-center">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">
                Tapez au moins 2 caractères pour rechercher
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Ctrl+K pour ouvrir la recherche
              </p>
            </div>
          ) : !hasResults && !loading ? (
            <div className="py-12 text-center">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucun résultat pour &laquo; {query} &raquo;
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Essayez avec d&apos;autres termes
              </p>
            </div>
          ) : (
            <div className="py-2">
              {/* Conversations */}
              <AnimatePresence>
                {results && results.conversations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <div className="px-4 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Conversations
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                          {results.conversations.length}
                        </Badge>
                      </p>
                    </div>
                    {results.conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleConversationClick(conv.id, conv.agentId)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/80 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.agentName} &middot; {new Date(conv.updatedAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Agents */}
              <AnimatePresence>
                {results && results.agents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <div className="px-4 py-1.5 mt-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Bot className="h-3 w-3" />
                        Agents IA
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                          {results.agents.length}
                        </Badge>
                      </p>
                    </div>
                    {results.agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleAgentClick(agent.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/80 transition-colors text-left group"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getAgentColor(agent.color)}`}>
                          {getIconForAgent(agent.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{agent.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {agent.description}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Documents */}
              <AnimatePresence>
                {results && results.documents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <div className="px-4 py-1.5 mt-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        Documents
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                          {results.documents.length}
                        </Badge>
                      </p>
                    </div>
                    {results.documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={handleDocumentClick}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/80 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatFileSize(doc.size)} &middot; {doc.matchedSnippet.slice(0, 80)}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Entrée</kbd>
              Sélectionner
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Échap</kbd>
              Fermer
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
