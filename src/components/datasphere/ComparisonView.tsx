'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  GitCompare, Loader2, Star, Clock, Zap, ChevronDown,
  Check, X, Trophy, ArrowRight, History, Sparkles,
  MessageSquare, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '🤖', color: 'from-green-500 to-emerald-600', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'anthropic', name: 'Anthropic', icon: '🧠', color: 'from-orange-500 to-amber-600', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'] },
  { id: 'groq', name: 'Groq', icon: '⚡', color: 'from-violet-500 to-purple-600', models: ['llama-3.3-70b-versatile'] },
  { id: 'qwen', name: 'Qwen', icon: '🔮', color: 'from-cyan-500 to-blue-600', models: ['qwen-max', 'qwen-plus'] },
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐', color: 'from-rose-500 to-pink-600', models: ['meta-llama/llama-3.3-70b-instruct'] },
];

interface ComparisonResult {
  provider: string;
  providerName?: string;
  model?: string;
  response?: string;
  tokensUsed?: number;
  responseTime?: number;
  score?: number;
  error?: string;
}

interface ComparisonHistory {
  id: string;
  prompt: string;
  bestProvider: string | null;
  results: ComparisonResult[];
  createdAt: string;
}

export default function ComparisonView() {
  const { token, user } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['openai', 'anthropic']);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ComparisonResult[] | null>(null);
  const [bestProvider, setBestProvider] = useState<string | null>(null);
  const [history, setHistory] = useState<ComparisonHistory[]>([]);
  const [activeTab, setActiveTab] = useState('compare');

  useEffect(() => {
    if (token) fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/comparison', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.comparisons || []);
      }
    } catch (_e) {
      // silent
    }
  };

  const toggleProvider = (id: string) => {
    if (selectedProviders.includes(id)) {
      if (selectedProviders.length > 2) {
        setSelectedProviders(selectedProviders.filter(p => p !== id));
      }
    } else {
      setSelectedProviders([...selectedProviders, id]);
    }
  };

  const runComparison = async () => {
    if (!prompt.trim()) {
      toast.error('Veuillez entrer un prompt');
      return;
    }
    if (selectedProviders.length < 2) {
      toast.error('Sélectionnez au moins 2 providers');
      return;
    }

    setIsRunning(true);
    setResults(null);
    setBestProvider(null);

    try {
      const res = await fetch('/api/comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          providers: selectedProviders,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.quotaExceeded) {
          toast.error(data.error || 'Quota dépassé - passez au plan supérieur');
        } else {
          toast.error(data.error || 'Erreur lors de la comparaison');
        }
        return;
      }

      setResults(data.results);
      setBestProvider(data.bestProvider);
      fetchHistory();
      toast.success('Comparaison terminée !');
    } catch (_e) {
      toast.error('Erreur de connexion');
    } finally {
      setIsRunning(false);
    }
  };

  const getProviderInfo = (id: string) => PROVIDERS.find(p => p.id === id);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return '[&>div]:bg-emerald-500';
    if (score >= 60) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <GitCompare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"><span className="gradient-text">Comparaison Multi-IA</span></h1>
            <p className="text-muted-foreground text-sm">Comparez les réponses de plusieurs modèles IA en parallèle</p>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compare" className="gap-1.5">
            <GitCompare className="h-3.5 w-3.5" /> Comparer
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Historique
          </TabsTrigger>
        </TabsList>

        {/* COMPARE TAB */}
        <TabsContent value="compare" className="space-y-6">
          {/* Prompt Input */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Votre prompt
                </CardTitle>
                <CardDescription>Entrez le même prompt pour tous les modèles et comparez les résultats</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Expliquez-moi les avantages du machine learning pour une PME..."
                  className="min-h-[120px] resize-y"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Provider Selection */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Sélectionnez les providers
                  <Badge variant="secondary" className="text-[10px]">{selectedProviders.length} sélectionnés (min. 2)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {PROVIDERS.map((provider) => {
                    const isSelected = selectedProviders.includes(provider.id);
                    return (
                      <button
                        key={provider.id}
                        onClick={() => toggleProvider(provider.id)}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <span className="text-2xl">{provider.icon}</span>
                        <span className="text-xs font-medium">{provider.name}</span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Run Button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button
              onClick={runComparison}
              disabled={isRunning || !prompt.trim() || selectedProviders.length < 2}
              className="w-full h-12 text-base bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {isRunning ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Comparaison en cours...</>
              ) : (
                <><GitCompare className="h-5 w-5 mr-2" /> Lancer la comparaison ({selectedProviders.length} providers)</>
              )}
            </Button>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {results && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Résultats
                  {bestProvider && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400">
                      <Trophy className="h-3 w-3 mr-1" /> Meilleur : {getProviderInfo(bestProvider)?.name || bestProvider}
                    </Badge>
                  )}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((result, i) => {
                    const providerInfo = getProviderInfo(result.provider);
                    const isBest = result.provider === bestProvider;

                    return (
                      <motion.div
                        key={result.provider}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Card className={`h-full flex flex-col ${isBest ? 'ring-2 ring-emerald-500 border-emerald-200 dark:border-emerald-800' : ''}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{providerInfo?.icon || '🔑'}</span>
                                <div>
                                  <CardTitle className="text-sm">{providerInfo?.name || result.provider}</CardTitle>
                                  <p className="text-xs text-muted-foreground">{result.model}</p>
                                </div>
                              </div>
                              {isBest && (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400 text-[10px]">
                                  <Trophy className="h-2.5 w-2.5 mr-0.5" /> Meilleur
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            {result.error ? (
                              <div className="flex-1 flex items-center justify-center text-center p-4">
                                <div>
                                  <X className="h-8 w-8 mx-auto text-red-400 mb-2" />
                                  <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Score */}
                                {result.score !== undefined && (
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-muted-foreground">Score</span>
                                      <span className={`text-sm font-bold ${getScoreColor(result.score)}`}>{result.score}/100</span>
                                    </div>
                                    <Progress value={result.score} className={`h-2 ${getScoreBarColor(result.score)}`} />
                                  </div>
                                )}

                                {/* Response */}
                                <div className="flex-1 bg-muted/50 rounded-lg p-3 mb-3 overflow-auto max-h-[300px]">
                                  <p className="text-sm whitespace-pre-wrap">{result.response}</p>
                                </div>

                                {/* Metrics */}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {result.tokensUsed !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      <span>{result.tokensUsed} tokens</span>
                                    </div>
                                  )}
                                  {result.responseTime !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{(result.responseTime / 1000).toFixed(1)}s</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">Aucun historique de comparaison</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Lancez votre première comparaison pour voir l'historique ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{item.prompt}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.results.map((r: ComparisonResult) => (
                            <Badge key={r.provider} variant="outline" className="text-[10px]">
                              {getProviderInfo(r.provider)?.icon} {getProviderInfo(r.provider)?.name || r.provider}
                            </Badge>
                          ))}
                          {item.bestProvider && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400 text-[10px]">
                              <Trophy className="h-2.5 w-2.5 mr-0.5" /> {getProviderInfo(item.bestProvider)?.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
