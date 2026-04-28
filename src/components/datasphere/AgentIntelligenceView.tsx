'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Clock,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  History,
  ArrowLeft,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Target,
  Layers,
  Activity,
  RotateCcw,
  BookOpen,
  Heart,
  Wrench,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MemoryItem {
  id: string;
  category: string;
  key: string;
  content: string;
  confidence: number;
  source: string;
  accessCount: number;
  lastAccessed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MemoryStats {
  totalMemories: number;
  byCategory: Record<string, number>;
  avgConfidence: number;
  lastUpdated: string | null;
}

interface PerformanceAnalysis {
  avgRating: number;
  totalRatings: number;
  commonComplaints: string[];
  suggestions: string[];
  performanceTrend: 'improving' | 'stable' | 'declining';
}

interface PromptVersionItem {
  id: string;
  version: number;
  systemPrompt: string;
  performance: number | null;
  messageCount: number;
  avgRating: number | null;
  createdAt: string;
  isActive: boolean;
}

interface LearningEventItem {
  id: string;
  eventType: string;
  data: string;
  impact: number;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  fact: { label: 'Faits', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  preference: { label: 'Préférences', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/50' },
  pattern: { label: 'Patterns', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  correction: { label: 'Corrections', icon: Wrench, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/50' },
  context: { label: 'Contexte', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/50' },
};

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  preference_learned: { label: 'Préférence apprise', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300', icon: Heart },
  correction_applied: { label: 'Correction appliquée', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: Wrench },
  pattern_detected: { label: 'Pattern détecté', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', icon: Activity },
  prompt_adjusted: { label: 'Prompt ajusté', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: Sparkles },
  feedback_received: { label: 'Feedback reçu', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: Star },
};

const SOURCE_LABELS: Record<string, string> = {
  interaction: 'Interaction',
  feedback: 'Feedback',
  system: 'Système',
  learned: 'Appris',
  manual: 'Manuel',
};

export default function AgentIntelligenceView() {
  const { token, agents } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceAnalysis | null>(null);
  const [promptHistory, setPromptHistory] = useState<PromptVersionItem[]>([]);
  const [learningEvents, setLearningEvents] = useState<LearningEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [optimizing, setOptimizing] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [addMemoryOpen, setAddMemoryOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({ category: 'fact', key: '', content: '' });

  const fetchData = useCallback(async () => {
    if (!token || !selectedAgentId) return;
    setLoading(true);
    try {
      const [memRes, optRes] = await Promise.all([
        fetch(`/api/agents/${selectedAgentId}/memory?category=${filterCategory !== 'all' ? filterCategory : ''}&search=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/agents/${selectedAgentId}/optimize`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (memRes.ok) {
        const memData = await memRes.json();
        setMemories(memData.memories || []);
        setMemoryStats(memData.stats || null);
      }

      if (optRes.ok) {
        const optData = await optRes.json();
        setPerformance(optData.performance || null);
        setPromptHistory(optData.promptHistory || []);
        setLearningEvents(optData.recentEvents || []);
      }
    } catch (_e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, selectedAgentId, filterCategory, searchTerm]);

  useEffect(() => {
    if (selectedAgentId) {
      fetchData();
    }
  }, [selectedAgentId, fetchData]);

  const handleAddMemory = async () => {
    if (!token || !selectedAgentId || !newMemory.key || !newMemory.content) return;
    try {
      await fetch(`/api/agents/${selectedAgentId}/memory`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMemory),
      });
      setNewMemory({ category: 'fact', key: '', content: '' });
      setAddMemoryOpen(false);
      fetchData();
    } catch (_e) {
      // silent
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!token || !selectedAgentId) return;
    try {
      await fetch(`/api/agents/${selectedAgentId}/memory?memoryId=${memoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (_e) {
      // silent
    }
  };

  const handleOptimize = async () => {
    if (!token || !selectedAgentId) return;
    setOptimizing(true);
    try {
      await fetch(`/api/agents/${selectedAgentId}/optimize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (_e) {
      // silent
    } finally {
      setOptimizing(false);
    }
  };

  const handleRollback = async (version: number) => {
    if (!token || !selectedAgentId) return;
    try {
      await fetch(`/api/agents/${selectedAgentId}/optimize`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version }),
      });
      fetchData();
    } catch (_e) {
      // silent
    }
  };

  const filteredMemories = memories.filter(m => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (searchTerm && !m.key.toLowerCase().includes(searchTerm.toLowerCase()) && !m.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Agent selection screen
  if (!selectedAgentId) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Intelligence IA</h1>
              <p className="text-sm text-muted-foreground">Mémoire, apprentissage et optimisation des agents</p>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-emerald-600" />
                Sélectionnez un agent
              </CardTitle>
              <CardDescription>Choisissez un agent pour explorer son intelligence et ses capacités d&apos;apprentissage</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <motion.button
                    key={agent.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className="text-left p-4 rounded-xl border hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all bg-card"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{agent.type}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                  </motion.button>
                ))}
              </div>
              {agents.length === 0 && (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun agent disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Rating data for charts
  const ratingData = promptHistory
    .filter(v => v.avgRating !== null)
    .map(v => ({
      version: `v${v.version}`,
      rating: v.avgRating ?? 0,
    }));

  // Feedback distribution data
  const feedbackDistribution = [
    { name: '5 ⭐', value: 0, color: '#10b981' },
    { name: '4 ⭐', value: 0, color: '#34d399' },
    { name: '3 ⭐', value: 0, color: '#fbbf24' },
    { name: '2 ⭐', value: 0, color: '#f97316' },
    { name: '1 ⭐', value: 0, color: '#ef4444' },
  ];
  if (performance) {
    const total = performance.totalRatings || 1;
    // Approximate distribution from avg rating
    const avg = performance.avgRating;
    feedbackDistribution[0].value = Math.round(total * Math.max(0, (avg - 3.5) / 1.5));
    feedbackDistribution[4].value = Math.round(total * Math.max(0, (2 - avg) / 4));
    feedbackDistribution[2].value = Math.round(total * 0.3);
    feedbackDistribution[1].value = Math.max(0, total - feedbackDistribution[0].value - feedbackDistribution[2].value - feedbackDistribution[3].value - feedbackDistribution[4].value);
  }

  // Memory by category for pie chart
  const memoryCategoryData = memoryStats
    ? Object.entries(memoryStats.byCategory).map(([key, value]) => ({
        name: CATEGORY_CONFIG[key]?.label || key,
        value,
        color: key === 'fact' ? '#3b82f6' : key === 'preference' ? '#f43f5e' : key === 'pattern' ? '#f59e0b' : key === 'correction' ? '#ef4444' : '#14b8a6',
      }))
    : [];

  const trendIcon = performance?.performanceTrend === 'improving' ? TrendingUp : performance?.performanceTrend === 'declining' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = performance?.performanceTrend === 'improving' ? 'text-emerald-600' : performance?.performanceTrend === 'declining' ? 'text-red-600' : 'text-amber-600';

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAgentId(null)} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{selectedAgent?.name || 'Agent'}</h1>
            <p className="text-sm text-muted-foreground">Intelligence & Apprentissage</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>

        {/* Stats Overview */}
        {memoryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Mémoires</p>
                      <p className="text-2xl font-bold text-emerald-600">{memoryStats.totalMemories}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Confiance</p>
                      <p className="text-2xl font-bold text-teal-600">{(memoryStats.avgConfidence * 100).toFixed(0)}%</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center">
                      <Target className="w-5 h-5 text-teal-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Note moyenne</p>
                      <p className="text-2xl font-bold text-amber-600">{performance?.avgRating || '—'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Tendance</p>
                      <div className="flex items-center gap-1.5">
                        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                        <span className={`text-sm font-semibold ${trendColor}`}>
                          {performance?.performanceTrend === 'improving' ? 'En hausse' : performance?.performanceTrend === 'declining' ? 'En baisse' : 'Stable'}
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
                      {performance?.performanceTrend === 'improving' ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : performance?.performanceTrend === 'declining' ? <TrendingDown className="w-5 h-5 text-red-600" /> : <Minus className="w-5 h-5 text-amber-600" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="memory" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="memory" className="text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 mr-1.5 hidden sm:inline" />
              Mémoire
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 mr-1.5 hidden sm:inline" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="optimize" className="text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 mr-1.5 hidden sm:inline" />
              Optimisation
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">
              <Activity className="w-4 h-4 mr-1.5 hidden sm:inline" />
              Activité
            </TabsTrigger>
          </TabsList>

          {/* MEMORY TAB */}
          <TabsContent value="memory">
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher dans les mémoires..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="fact">Faits</SelectItem>
                    <SelectItem value="preference">Préférences</SelectItem>
                    <SelectItem value="pattern">Patterns</SelectItem>
                    <SelectItem value="correction">Corrections</SelectItem>
                    <SelectItem value="context">Contexte</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={addMemoryOpen} onOpenChange={setAddMemoryOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une mémoire</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <Select value={newMemory.category} onValueChange={(v) => setNewMemory(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fact">Fait</SelectItem>
                          <SelectItem value="preference">Préférence</SelectItem>
                          <SelectItem value="pattern">Pattern</SelectItem>
                          <SelectItem value="correction">Correction</SelectItem>
                          <SelectItem value="context">Contexte</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Clé (identifiant court)"
                        value={newMemory.key}
                        onChange={(e) => setNewMemory(prev => ({ ...prev, key: e.target.value }))}
                      />
                      <Textarea
                        placeholder="Contenu de la mémoire"
                        value={newMemory.content}
                        onChange={(e) => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
                        rows={3}
                      />
                      <Button onClick={handleAddMemory} disabled={!newMemory.key || !newMemory.content} className="w-full bg-emerald-600 hover:bg-emerald-700">
                        Enregistrer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Memory Distribution Chart */}
              {memoryCategoryData.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Répartition des mémoires
                    </h3>
                    <div className="flex items-center gap-6">
                      <div className="w-32 h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={memoryCategoryData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={2}>
                              {memoryCategoryData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} stroke="transparent" />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {memoryCategoryData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Memory Cards by Category */}
              {Object.entries(CATEGORY_CONFIG).map(([catKey, catConfig]) => {
                const catMemories = filteredMemories.filter(m => m.category === catKey);
                if (catMemories.length === 0 && filterCategory !== 'all') return null;
                if (filterCategory !== 'all' && filterCategory !== catKey) return null;

                const CatIcon = catConfig.icon;

                return (
                  <Card key={catKey} className="border-0 shadow-sm">
                    <CardHeader className={`pb-3 ${catConfig.bg} rounded-t-lg`}>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
                        {catConfig.label}
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {catMemories.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      {catMemories.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Aucune mémoire dans cette catégorie</p>
                      ) : (
                        <ScrollArea className="max-h-64">
                          <div className="space-y-2">
                            {catMemories.map((memory) => (
                              <motion.div
                                key={memory.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-start gap-3 p-2.5 rounded-lg bg-accent/30 hover:bg-accent/60 transition-colors group"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold">{memory.key}</span>
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                      {SOURCE_LABELS[memory.source] || memory.source}
                                    </Badge>
                                    {memory.accessCount > 0 && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Eye className="w-2.5 h-2.5" />
                                        {memory.accessCount}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{memory.content}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <div className="flex-1">
                                      <Progress value={memory.confidence * 100} className="h-1.5" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {(memory.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteMemory(memory.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* PERFORMANCE TAB */}
          <TabsContent value="performance">
            <div className="space-y-4">
              {/* Performance Score Gauge */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Score de performance
                  </h3>
                  <div className="flex items-center justify-center gap-8">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted/20" />
                        <circle
                          cx="60" cy="60" r="50"
                          stroke={performance?.avgRating && performance.avgRating >= 3.5 ? '#10b981' : performance?.avgRating && performance.avgRating >= 2.5 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="10" fill="none"
                          strokeDasharray={`${(performance?.avgRating || 0) / 5 * 314} 314`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{performance?.avgRating?.toFixed(1) || '—'}</p>
                          <p className="text-[10px] text-muted-foreground">/5.0</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total évaluations</p>
                        <p className="text-lg font-semibold">{performance?.totalRatings || 0}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                        <span className={`text-sm font-medium ${trendColor}`}>
                          {performance?.performanceTrend === 'improving' ? 'En amélioration' : performance?.performanceTrend === 'declining' ? 'En déclin' : 'Stable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rating Trend Chart */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Tendance des notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {ratingData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={ratingData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
                          <XAxis dataKey="version" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Pas encore de données de notation</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Feedback Distribution */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      Distribution des retours
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={feedbackDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {feedbackDistribution.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Suggestions */}
              {performance && performance.suggestions.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      Suggestions d&apos;amélioration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {performance.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Common Complaints */}
              {performance && performance.commonComplaints.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 bg-red-50/50 dark:bg-red-950/20 rounded-t-lg">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Plaintes courantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ScrollArea className="max-h-40">
                      <ul className="space-y-2">
                        {performance.commonComplaints.map((complaint, i) => (
                          <li key={i} className="text-sm text-muted-foreground p-2 bg-accent/30 rounded-lg">
                            {complaint}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* OPTIMIZATION TAB */}
          <TabsContent value="optimize">
            <div className="space-y-4">
              {/* Auto Optimize Button */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-semibold">Auto-Optimisation IA</h3>
                      <p className="text-sm text-muted-foreground">
                        Analyse les retours utilisateurs et optimise automatiquement le prompt système pour améliorer les performances.
                      </p>
                    </div>
                    <Button
                      onClick={handleOptimize}
                      disabled={optimizing}
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                    >
                      {optimizing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Optimisation...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Auto-Optimiser
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Prompt Version History */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    Historique des versions du prompt
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {promptHistory.length} version{promptHistory.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {promptHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun historique de prompt</p>
                      <p className="text-xs text-muted-foreground/60">Lancez une auto-optimisation pour créer la première version</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-3">
                        {promptHistory.map((version) => (
                          <div
                            key={version.id}
                            className={`p-4 rounded-xl border transition-all ${
                              version.isActive
                                ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30'
                                : 'border-border hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={version.isActive ? 'default' : 'outline'} className={version.isActive ? 'bg-emerald-600' : ''}>
                                  v{version.version}
                                </Badge>
                                {version.isActive && (
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {version.avgRating !== null && (
                                  <div className="flex items-center gap-1 text-xs text-amber-600">
                                    <Star className="w-3 h-3" />
                                    {version.avgRating.toFixed(1)}
                                  </div>
                                )}
                                {!version.isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => handleRollback(version.version)}
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Restaurer
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Créé le {new Date(version.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="relative">
                              <p className="text-xs line-clamp-3 font-mono bg-accent/50 p-2 rounded-lg">
                                {version.systemPrompt.slice(0, 200)}...
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs mt-1 h-6"
                                onClick={() => setExpandedPrompt(expandedPrompt === version.id ? null : version.id)}
                              >
                                {expandedPrompt === version.id ? (
                                  <><ChevronUp className="w-3 h-3 mr-1" />Réduire</>
                                ) : (
                                  <><ChevronDown className="w-3 h-3 mr-1" />Voir tout</>
                                )}
                              </Button>
                              <AnimatePresence>
                                {expandedPrompt === version.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <pre className="text-xs font-mono bg-accent/50 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">
                                      {version.systemPrompt}
                                    </pre>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Fil d&apos;activité d&apos;apprentissage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {learningEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aucune activité d&apos;apprentissage</p>
                    <p className="text-xs text-muted-foreground/60">Les événements d&apos;apprentissage apparaîtront ici après des conversations</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="relative pl-6 space-y-4">
                      {/* Timeline line */}
                      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-emerald-200 dark:bg-emerald-800" />

                      {learningEvents.map((event, index) => {
                        const eventConfig = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.feedback_received;
                        const EventIcon = eventConfig.icon;
                        let eventData: Record<string, unknown> = {};
                        try {
                          eventData = JSON.parse(event.data);
                        } catch (_e) { /* ignore */ }

                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative"
                          >
                            {/* Timeline dot */}
                            <div className="absolute -left-4 top-2 w-4 h-4 rounded-full bg-card border-2 border-emerald-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            </div>

                            <div className="p-3 rounded-xl bg-accent/30 hover:bg-accent/60 transition-colors">
                              <div className="flex items-center justify-between mb-1.5">
                                <Badge className={`text-[10px] ${eventConfig.color}`}>
                                  <EventIcon className="w-3 h-3 mr-1" />
                                  {eventConfig.label}
                                </Badge>
                                <div className="flex items-center gap-1.5">
                                  {event.impact > 0 && (
                                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                      <TrendingUp className="w-3 h-3" />
                                      +{(event.impact * 100).toFixed(0)}%
                                    </span>
                                  )}
                                  {event.impact < 0 && (
                                    <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                                      <TrendingDown className="w-3 h-3" />
                                      {(event.impact * 100).toFixed(0)}%
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(event.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {eventData.key && eventData.content
                                  ? `${eventData.key}: ${eventData.content}`
                                  : eventData.rating
                                    ? `Note: ${eventData.rating}/5`
                                    : event.data.slice(0, 150)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
