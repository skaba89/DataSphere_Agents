'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Target,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  FileText,
  TrendingUp,
  AlertTriangle,
  Eye,
  Brain,
  RefreshCw,
  ChevronDown,
  X,
  Building2,
  User,
  Globe,
  Tag,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowRight,
  Loader2,
  Trash2,
  ExternalLink,
  Shield,
  Heart,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────

interface Prospect {
  id: string;
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  status: string;
  score: number;
  source: string | null;
  notes: string | null;
  tags: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
  activities: ProspectActivity[];
}

interface ProspectActivity {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

interface MarketInsight {
  id: string;
  type: string;
  title: string;
  summary: string;
  data: string | null;
  source: string | null;
  relevance: number;
  isRead: boolean;
  createdAt: string;
}

interface CustomerHealthRecord {
  id: string;
  customerEmail: string;
  healthScore: number;
  churnRisk: string;
  engagementLevel: string;
  lastActivityAt: string | null;
  metrics: string | null;
  recommendations: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PipelineAnalytics {
  funnel: { status: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  winLossRatio: { won: number; lost: number };
  avgDealDays: number;
  revenueForecast: { pipeline: number; weighted: number; won: number };
  totalProspects: number;
  avgScore: number;
}

// ─── Constants ──────────────────────────────────────────────────

const STATUS_COLUMNS = [
  { id: 'new', label: 'Nouveau', color: 'from-slate-400 to-slate-500', bg: 'bg-slate-50 dark:bg-slate-950/30' },
  { id: 'contacted', label: 'Contacté', color: 'from-sky-400 to-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { id: 'qualified', label: 'Qualifié', color: 'from-cyan-400 to-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  { id: 'proposal', label: 'Proposition', color: 'from-amber-400 to-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { id: 'negotiation', label: 'Négociation', color: 'from-orange-400 to-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { id: 'won', label: 'Gagné', color: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { id: 'lost', label: 'Perdu', color: 'from-red-400 to-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
];

const INDUSTRIES = [
  'Technology', 'SaaS', 'AI / ML', 'Fintech', 'Healthcare', 'E-commerce',
  'Education', 'Manufacturing', 'Real Estate', 'Consulting', 'Media', 'Other',
];

const SIZES = [
  { value: 'startup', label: 'Startup' },
  { value: 'small', label: 'PME' },
  { value: 'medium', label: 'ETI' },
  { value: 'large', label: 'Grand groupe' },
  { value: 'enterprise', label: 'Enterprise' },
];

const INSIGHT_TYPES = [
  { id: 'trend', label: 'Tendances', icon: TrendingUp, color: 'text-emerald-500' },
  { id: 'competitor', label: 'Concurrents', icon: Shield, color: 'text-orange-500' },
  { id: 'opportunity', label: 'Opportunités', icon: Sparkles, color: 'text-cyan-500' },
  { id: 'alert', label: 'Alertes', icon: AlertTriangle, color: 'text-red-500' },
];

const CHURN_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
};

const CHURN_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique',
};

const ENGAGEMENT_COLORS: Record<string, string> = {
  dormant: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  low: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  power: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
};

const ENGAGEMENT_LABELS: Record<string, string> = {
  dormant: 'Dormant',
  low: 'Faible',
  moderate: 'Modéré',
  high: 'Élevé',
  power: 'Power User',
};

// ─── Helpers ────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-cyan-600 dark:text-cyan-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  if (score >= 20) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-cyan-500';
  if (score >= 40) return 'bg-amber-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-cyan-600 dark:text-cyan-400';
  if (score >= 30) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min}m`;
  if (hr < 24) return `Il y a ${hr}h`;
  if (day < 7) return `Il y a ${day}j`;
  return formatDate(dateStr);
}

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  status_change: ArrowRight,
  score_change: Target,
};

// ─── Prospect Card (Kanban) ─────────────────────────────────────

function ProspectCard({
  prospect,
  onClick,
  isDragging,
}: {
  prospect: Prospect;
  onClick: () => void;
  isDragging?: boolean;
}) {
  return (
    <motion.div
      layout
      layoutId={prospect.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`p-3 rounded-xl border bg-card cursor-pointer transition-shadow ${
        isDragging ? 'shadow-2xl ring-2 ring-emerald-500/30 rotate-2' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{prospect.company}</p>
          {prospect.contactName && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3" />
              {prospect.contactName}
            </p>
          )}
        </div>
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${getScoreBg(prospect.score)}`}
        >
          {Math.round(prospect.score)}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {prospect.industry && (
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
            {prospect.industry}
          </Badge>
        )}
        {prospect.size && (
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
            {SIZES.find((s) => s.value === prospect.size)?.label || prospect.size}
          </Badge>
        )}
      </div>

      {prospect.lastContactAt && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Dernier contact: {timeAgo(prospect.lastContactAt)}
        </p>
      )}
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function ProspectionView() {
  const { token, logout } = useAppStore();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [customers, setCustomers] = useState<CustomerHealthRecord[]>([]);
  const [churnSummary, setChurnSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [insightFilter, setInsightFilter] = useState<string>('all');
  const [scanIndustry, setScanIndustry] = useState('');
  const [scanning, setScanning] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // New prospect form
  const [newProspect, setNewProspect] = useState({
    company: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    size: '',
    notes: '',
  });

  // New activity
  const [newActivity, setNewActivity] = useState({ type: 'note', content: '' });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ─── Fetch Data ─────────────────────────────────────────────

  const fetchProspects = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/prospects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProspects(data.prospects || []);
      }
    } catch (_e) {
      // silent
    }
  }, [token, searchQuery]);

  const fetchInsights = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (insightFilter !== 'all') params.set('type', insightFilter);
      const res = await fetch(`/api/market-insights?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (_e) {
      // silent
    }
  }, [token, insightFilter]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/customer-health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setChurnSummary(data.churnSummary || null);
      }
    } catch (_e) {
      // silent
    }
  }, [token]);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/prospects/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (_e) {
      // silent
    }
  }, [token]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProspects(), fetchInsights(), fetchCustomers(), fetchAnalytics()]);
      setLoading(false);
    };
    load();
  }, [fetchProspects, fetchInsights, fetchCustomers, fetchAnalytics]);

  // ─── Prospect CRUD ──────────────────────────────────────────

  const createProspect = async () => {
    if (!newProspect.company) {
      toast.error('Le nom de l\'entreprise est requis');
      return;
    }
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProspect),
      });
      if (res.ok) {
        toast.success('Prospect créé avec succès');
        setCreateOpen(false);
        setNewProspect({ company: '', contactName: '', email: '', phone: '', website: '', industry: '', size: '', notes: '' });
        fetchProspects();
        fetchAnalytics();
      } else {
        toast.error('Erreur lors de la création');
      }
    } catch (_e) {
      toast.error('Erreur de connexion');
    }
  };

  const updateProspectStatus = async (prospectId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setProspects((prev) => prev.map((p) => (p.id === prospectId ? data.prospect : p)));
        if (selectedProspect?.id === prospectId) {
          setSelectedProspect(data.prospect);
        }
        fetchAnalytics();
      }
    } catch (_e) {
      toast.error('Erreur lors du déplacement');
    }
  };

  const deleteProspect = async (id: string) => {
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Prospect supprimé');
        setProspects((prev) => prev.filter((p) => p.id !== id));
        setDetailOpen(false);
        setSelectedProspect(null);
        fetchAnalytics();
      }
    } catch (_e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const addActivity = async () => {
    if (!selectedProspect || !newActivity.content) return;
    try {
      const res = await fetch(`/api/prospects/${selectedProspect.id}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newActivity),
      });
      if (res.ok) {
        toast.success('Activité ajoutée');
        setNewActivity({ type: 'note', content: '' });
        // Refresh prospect detail
        const detailRes = await fetch(`/api/prospects/${selectedProspect.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (detailRes.ok) {
          const data = await detailRes.json();
          setSelectedProspect(data.prospect);
        }
        fetchProspects();
      }
    } catch (_e) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  // ─── Market Scan ────────────────────────────────────────────

  const triggerMarketScan = async () => {
    if (!scanIndustry) {
      toast.error('Secteur d\'activité requis');
      return;
    }
    setScanning(true);
    try {
      const res = await fetch('/api/market-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ industry: scanIndustry }),
      });
      if (res.ok) {
        toast.success('Scan de marché lancé avec succès');
        setScanOpen(false);
        setScanIndustry('');
        fetchInsights();
      } else {
        toast.error('Erreur lors du scan');
      }
    } catch (_e) {
      toast.error('Erreur de connexion');
    } finally {
      setScanning(false);
    }
  };

  // ─── Customer Health Recalculate ────────────────────────────

  const recalculateHealth = async () => {
    setRecalculating(true);
    try {
      const res = await fetch('/api/customer-health', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setChurnSummary(data.churnSummary || null);
        toast.success(`${data.recalculated} clients recalculés`);
      }
    } catch (_e) {
      toast.error('Erreur lors du recalcul');
    } finally {
      setRecalculating(false);
    }
  };

  // ─── DnD Handlers ──────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;

    const prospectId = active.id as string;
    // The over.id is the column status
    const newStatus = over.id as string;
    const prospect = prospects.find((p) => p.id === prospectId);

    if (prospect && prospect.status !== newStatus) {
      updateProspectStatus(prospectId, newStatus);
    }
  };

  // ─── Group prospects by status ─────────────────────────────

  const prospectsByStatus = STATUS_COLUMNS.map((col) => ({
    ...col,
    prospects: prospects.filter((p) => p.status === col.id),
  }));

  // ─── Loading State ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 rounded bg-muted skeleton mb-2" />
          <div className="h-4 w-72 rounded bg-muted skeleton" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="h-3 w-20 rounded bg-muted skeleton mb-2" />
                <div className="h-7 w-16 rounded bg-muted skeleton" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 rounded-xl bg-muted/20 skeleton" />
      </div>
    );
  }

  // ─── Stats Cards ───────────────────────────────────────────

  const statsCards = [
    {
      title: 'Total Prospects',
      value: prospects.length,
      icon: Target,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40',
    },
    {
      title: 'Score Moyen',
      value: analytics?.avgScore || 0,
      icon: Brain,
      gradient: 'from-cyan-500 to-blue-600',
      bg: 'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40',
    },
    {
      title: 'Taux de Conversion',
      value: analytics && analytics.totalProspects > 0
        ? `${Math.round((analytics.winLossRatio.won / analytics.totalProspects) * 100)}%`
        : '0%',
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
    },
    {
      title: 'Pipeline Value',
      value: formatCurrency(analytics?.revenueForecast.pipeline || 0),
      icon: BarChart3,
      gradient: 'from-violet-500 to-purple-600',
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40',
    },
  ];

  // ─── Custom Recharts Tooltip ────────────────────────────────

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('fr-FR') : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Target className="h-7 w-7 text-emerald-500" />
              <span className="gradient-text">Prospection</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Pipeline CRM, intelligence marché et santé client
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau prospect
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nouveau Prospect</DialogTitle>
                  <DialogDescription>Ajoutez un prospect à votre pipeline</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company">Entreprise *</Label>
                    <Input
                      id="company"
                      value={newProspect.company}
                      onChange={(e) => setNewProspect((p) => ({ ...p, company: e.target.value }))}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="contactName">Contact</Label>
                      <Input
                        id="contactName"
                        value={newProspect.contactName}
                        onChange={(e) => setNewProspect((p) => ({ ...p, contactName: e.target.value }))}
                        placeholder="Nom du contact"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newProspect.email}
                        onChange={(e) => setNewProspect((p) => ({ ...p, email: e.target.value }))}
                        placeholder="email@company.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={newProspect.phone}
                        onChange={(e) => setNewProspect((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+33 6 00 00 00 00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="website">Site web</Label>
                      <Input
                        id="website"
                        value={newProspect.website}
                        onChange={(e) => setNewProspect((p) => ({ ...p, website: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Secteur</Label>
                      <Select
                        value={newProspect.industry}
                        onValueChange={(v) => setNewProspect((p) => ({ ...p, industry: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Secteur" /></SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((i) => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Taille</Label>
                      <Select
                        value={newProspect.size}
                        onValueChange={(v) => setNewProspect((p) => ({ ...p, size: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Taille" /></SelectTrigger>
                        <SelectContent>
                          {SIZES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newProspect.notes}
                      onChange={(e) => setNewProspect((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Notes sur ce prospect..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={createProspect}>
                    Créer le prospect
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <Card className="overflow-hidden card-hover">
                <CardContent className={`p-4 ${stat.bg}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                      <p className="text-xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-black/10`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs sm:text-sm">
            <Target className="h-4 w-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-1.5 text-xs sm:text-sm">
            <Brain className="h-4 w-4" /> Marché
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5 text-xs sm:text-sm">
            <Heart className="h-4 w-4" /> Santé Client
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Pipeline (Kanban) ──────────────────────── */}
        <TabsContent value="pipeline">
          {/* Search bar */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un prospect..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '400px' }}>
              {prospectsByStatus.map((column) => (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-[220px] sm:w-[250px]"
                >
                  {/* Column Header */}
                  <div className={`rounded-t-xl p-3 ${column.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${column.color}`} />
                        <h3 className="text-sm font-semibold">{column.label}</h3>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5 min-w-5">
                        {column.prospects.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Column Body (droppable) */}
                  <div
                    className={`rounded-b-xl border border-t-0 p-2 space-y-2 min-h-[300px] ${
                      draggingId ? 'bg-accent/30 transition-colors' : ''
                    }`}
                    data-column={column.id}
                    // Handle drop on column
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingId) {
                        updateProspectStatus(draggingId, column.id);
                      }
                    }}
                  >
                    <AnimatePresence>
                      {column.prospects.map((prospect) => (
                        <div
                          key={prospect.id}
                          draggable
                          onDragStart={() => setDraggingId(prospect.id)}
                          onDragEnd={() => setDraggingId(null)}
                        >
                          <ProspectCard
                            prospect={prospect}
                            onClick={() => {
                              setSelectedProspect(prospect);
                              setDetailOpen(true);
                            }}
                            isDragging={draggingId === prospect.id}
                          />
                        </div>
                      ))}
                    </AnimatePresence>

                    {column.prospects.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Target className="h-6 w-6 mb-1 opacity-30" />
                        <p className="text-xs">Aucun prospect</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DragOverlay>
              {draggingId ? (
                <div className="w-[230px] rotate-3 opacity-90">
                  <ProspectCard
                    prospect={prospects.find((p) => p.id === draggingId)!}
                    onClick={() => {}}
                    isDragging
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Mobile: List view fallback */}
          <div className="lg:hidden mt-4 space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Astuce: glissez-déposez les cartes entre les colonnes sur desktop
            </p>
            {prospects.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Aucun prospect dans votre pipeline</p>
                <Button
                  className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Créer votre premier prospect
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Tab 2: Market Intelligence ────────────────────── */}
        <TabsContent value="intelligence">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={insightFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={insightFilter === 'all' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                onClick={() => setInsightFilter('all')}
              >
                Tous
              </Button>
              {INSIGHT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.id}
                    variant={insightFilter === type.id ? 'default' : 'outline'}
                    size="sm"
                    className={insightFilter === type.id ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                    onClick={() => setInsightFilter(type.id)}
                  >
                    <Icon className={`h-3.5 w-3.5 mr-1 ${insightFilter !== type.id ? type.color : ''}`} />
                    {type.label}
                  </Button>
                );
              })}
            </div>
            <Dialog open={scanOpen} onOpenChange={setScanOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                  <Search className="h-4 w-4" /> Scanner le marché
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Scanner le marché</DialogTitle>
                  <DialogDescription>
                    Lancez une analyse IA sur un secteur d&apos;activité
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="grid gap-2">
                    <Label>Secteur d&apos;activité</Label>
                    <Select value={scanIndustry} onValueChange={setScanIndustry}>
                      <SelectTrigger><SelectValue placeholder="Choisir un secteur" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {scanIndustry && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        L&apos;IA va analyser les tendances, concurrents et opportunités du secteur {scanIndustry}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setScanOpen(false)}>Annuler</Button>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                    onClick={triggerMarketScan}
                    disabled={scanning}
                  >
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {scanning ? 'Analyse en cours...' : 'Lancer le scan'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Insights Grid */}
          {insights.length === 0 ? (
            <div className="text-center py-16">
              <Brain className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune donnée de marché</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Lancez un scan de marché pour découvrir les tendances, concurrents et opportunités de votre secteur.
              </p>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                onClick={() => setScanOpen(true)}
              >
                <Search className="h-4 w-4" /> Scanner le marché
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, idx) => {
                const typeInfo = INSIGHT_TYPES.find((t) => t.id === insight.type);
                const Icon = typeInfo?.icon || TrendingUp;
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  >
                    <Card className="overflow-hidden card-hover h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              insight.type === 'trend' ? 'bg-emerald-100 dark:bg-emerald-950/50' :
                              insight.type === 'competitor' ? 'bg-orange-100 dark:bg-orange-950/50' :
                              insight.type === 'opportunity' ? 'bg-cyan-100 dark:bg-cyan-950/50' :
                              'bg-red-100 dark:bg-red-950/50'
                            }`}>
                              <Icon className={`h-4 w-4 ${typeInfo?.color || 'text-emerald-500'}`} />
                            </div>
                            <Badge variant="secondary" className="text-[9px] h-4">
                              {typeInfo?.label || insight.type}
                            </Badge>
                          </div>
                          {insight.source && (
                            <Badge variant="outline" className="text-[9px] h-4">
                              {insight.source === 'web_search' ? 'Web' : 'IA'}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-sm mt-2 leading-snug">{insight.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                          {insight.summary}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] text-muted-foreground">Pertinence</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${insight.relevance * 100}%` }}
                                transition={{ duration: 0.8, delay: idx * 0.1 }}
                                className={`h-full rounded-full ${
                                  insight.relevance >= 0.8 ? 'bg-emerald-500' :
                                  insight.relevance >= 0.6 ? 'bg-cyan-500' :
                                  insight.relevance >= 0.4 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                              />
                            </div>
                            <span className="text-[10px] font-semibold">{Math.round(insight.relevance * 100)}%</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                            {timeAgo(insight.createdAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab 3: Customer Health ────────────────────────── */}
        <TabsContent value="health">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              {churnSummary && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">{churnSummary.totalCustomers}</span> clients
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{churnSummary.atRisk}</span> à risque
                  </span>
                  {churnSummary.metrics && (
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{churnSummary.metrics.dormantUsers}</span> dormants
                    </span>
                  )}
                </div>
              )}
            </div>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              onClick={recalculateHealth}
              disabled={recalculating}
            >
              {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Recalculer
            </Button>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune donnée client</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Cliquez sur &quot;Recalculer&quot; pour analyser la santé de vos clients et détecter les risques d&apos;attrition.
              </p>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                onClick={recalculateHealth}
                disabled={recalculating}
              >
                {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Analyser les clients
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((customer, idx) => {
                const recommendations = customer.recommendations
                  ? JSON.parse(customer.recommendations)
                  : [];
                const metrics = customer.metrics
                  ? JSON.parse(customer.metrics)
                  : {};

                return (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  >
                    <Card className="overflow-hidden card-hover h-full">
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
                              customer.healthScore >= 80 ? 'bg-emerald-500' :
                              customer.healthScore >= 60 ? 'bg-cyan-500' :
                              customer.healthScore >= 30 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}>
                              {Math.round(customer.healthScore)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold truncate max-w-[150px]">{customer.customerEmail}</p>
                              <p className="text-[10px] text-muted-foreground">Score de santé</p>
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge className={`text-[9px] h-5 ${CHURN_COLORS[customer.churnRisk]}`}>
                            Risque: {CHURN_LABELS[customer.churnRisk]}
                          </Badge>
                          <Badge className={`text-[9px] h-5 ${ENGAGEMENT_COLORS[customer.engagementLevel]}`}>
                            {ENGAGEMENT_LABELS[customer.engagementLevel]}
                          </Badge>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div className="p-1.5 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground">Login/fréq</p>
                            <p className="text-xs font-semibold">{metrics.loginFrequency || 0}</p>
                          </div>
                          <div className="p-1.5 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground">Fonctions</p>
                            <p className="text-xs font-semibold">{metrics.featureUsageDiversity || 0}</p>
                          </div>
                          <div className="p-1.5 rounded-lg bg-muted/50">
                            <p className="text-[10px] text-muted-foreground">Activités</p>
                            <p className="text-xs font-semibold">{metrics.totalUsageEvents || 0}</p>
                          </div>
                        </div>

                        {/* Last activity */}
                        {customer.lastActivityAt && (
                          <p className="text-[10px] text-muted-foreground mb-2">
                            Dernière activité: {timeAgo(customer.lastActivityAt)}
                          </p>
                        )}

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium w-full hover:underline">
                              <Sparkles className="h-3 w-3" />
                              {recommendations.length} recommandation(s) IA
                              <ChevronDown className="h-3 w-3 ml-auto" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 space-y-1">
                                {recommendations.map((rec: string, i: number) => (
                                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                    <ChevronRight className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <span>{rec}</span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Tab 4: Analytics ──────────────────────────────── */}
        <TabsContent value="analytics">
          {analytics ? (
            <div className="space-y-6">
              {/* Revenue Forecast */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="glass glow-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                      Prévisions de revenus
                    </CardTitle>
                    <CardDescription>Estimations basées sur le pipeline actuel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
                        <p className="text-xs text-muted-foreground mb-1">Pipeline total</p>
                        <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(analytics.revenueForecast.pipeline)}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                        <p className="text-xs text-muted-foreground mb-1">Pondéré (score)</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(analytics.revenueForecast.weighted)}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                        <p className="text-xs text-muted-foreground mb-1">Deals gagnés</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(analytics.revenueForecast.won)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline Funnel */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="glass glow-card">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        Entonnoir de conversion
                      </CardTitle>
                      <CardDescription>Répartition des prospects par statut</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.funnel.some((f) => f.count > 0) ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.funnel} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                              <YAxis
                                type="category"
                                dataKey="status"
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val: string) => {
                                  const col = STATUS_COLUMNS.find((c) => c.id === val);
                                  return col?.label || val;
                                }}
                                width={80}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="count" name="Prospects" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                {analytics.funnel.map((entry, idx) => {
                                  const col = STATUS_COLUMNS.find((c) => c.id === entry.status);
                                  const colors = ['#94a3b8', '#38bdf8', '#22d3ee', '#fbbf24', '#fb923c', '#10b981', '#ef4444'];
                                  return <Cell key={idx} fill={colors[idx % colors.length]} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                          Aucune donnée de pipeline
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Score Distribution */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="glass glow-card">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4 text-emerald-500" />
                        Distribution des scores
                      </CardTitle>
                      <CardDescription>Répartition des prospects par score lead</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.scoreDistribution.some((s) => s.count > 0) ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.scoreDistribution}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                              <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="count" name="Prospects" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                {analytics.scoreDistribution.map((_, idx) => {
                                  const colors = ['#ef4444', '#fb923c', '#fbbf24', '#22d3ee', '#10b981'];
                                  return <Cell key={idx} fill={colors[idx % colors.length]} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                          Aucune donnée de score
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Win/Loss Pie */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="glass glow-card">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4 text-emerald-500" />
                        Ratio Gagné / Perdu
                      </CardTitle>
                      <CardDescription>Conversions vs pertes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(analytics.winLossRatio.won > 0 || analytics.winLossRatio.lost > 0) ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Gagné', value: analytics.winLossRatio.won },
                                  { name: 'Perdu', value: analytics.winLossRatio.lost },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                iconSize={8}
                                formatter={(value: string) => (
                                  <span className="text-xs text-muted-foreground">{value}</span>
                                )}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                          Aucun deal gagné ou perdu
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Deal Timeline & KPIs */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <Card className="glass glow-card">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-500" />
                        Indicateurs clés
                      </CardTitle>
                      <CardDescription>Métriques de performance du pipeline</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                        <div>
                          <p className="text-xs text-muted-foreground">Durée moyenne du cycle</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {analytics.avgDealDays > 0 ? `${analytics.avgDealDays} jours` : 'N/A'}
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-emerald-500/30" />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
                        <div>
                          <p className="text-xs text-muted-foreground">Score moyen du pipeline</p>
                          <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                            {analytics.avgScore}/100
                          </p>
                        </div>
                        <Brain className="h-8 w-8 text-cyan-500/30" />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                        <div>
                          <p className="text-xs text-muted-foreground">Total prospects</p>
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            {analytics.totalProspects}
                          </p>
                        </div>
                        <Building2 className="h-8 w-8 text-amber-500/30" />
                      </div>

                      {/* Conversion rate */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Taux de conversion</span>
                          <span className="font-semibold">
                            {analytics.totalProspects > 0
                              ? `${Math.round((analytics.winLossRatio.won / analytics.totalProspects) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                        <Progress
                          value={analytics.totalProspects > 0 ? (analytics.winLossRatio.won / analytics.totalProspects) * 100 : 0}
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune donnée analytique</h3>
              <p className="text-muted-foreground">Ajoutez des prospects pour voir les analytics</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Prospect Detail Dialog ──────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProspect && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-emerald-500" />
                      {selectedProspect.company}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Prospect dans le pipeline — Score: <span className={getScoreColor(selectedProspect.score)}>{Math.round(selectedProspect.score)}/100</span>
                    </DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 h-8 w-8"
                    onClick={() => deleteProspect(selectedProspect.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 py-2">
                {selectedProspect.contactName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedProspect.contactName}</span>
                  </div>
                )}
                {selectedProspect.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{selectedProspect.email}</span>
                  </div>
                )}
                {selectedProspect.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedProspect.phone}</span>
                  </div>
                )}
                {selectedProspect.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={selectedProspect.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline truncate">
                      {selectedProspect.website}
                    </a>
                  </div>
                )}
                {selectedProspect.industry && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedProspect.industry}</span>
                  </div>
                )}
                {selectedProspect.size && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{SIZES.find((s) => s.value === selectedProspect.size)?.label || selectedProspect.size}</span>
                  </div>
                )}
              </div>

              {/* Status Selector */}
              <div className="py-2">
                <Label className="text-xs mb-1.5 block">Statut</Label>
                <Select
                  value={selectedProspect.status}
                  onValueChange={(v) => updateProspectStatus(selectedProspect.id, v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_COLUMNS.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${col.color}`} />
                          {col.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProspect.notes && (
                <div className="py-2">
                  <Label className="text-xs mb-1.5 block">Notes</Label>
                  <p className="text-sm text-muted-foreground p-3 rounded-xl bg-muted/50">{selectedProspect.notes}</p>
                </div>
              )}

              <Separator />

              {/* Add Activity */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Ajouter une activité</Label>
                <div className="flex gap-2">
                  <Select value={newActivity.type} onValueChange={(v) => setNewActivity((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">📞 Appel</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="meeting">📅 Réunion</SelectItem>
                      <SelectItem value="note">📝 Note</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Contenu de l'activité..."
                    value={newActivity.content}
                    onChange={(e) => setNewActivity((p) => ({ ...p, content: e.target.value }))}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newActivity.content) addActivity();
                    }}
                  />
                  <Button size="sm" onClick={addActivity} disabled={!newActivity.content} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Activities Timeline */}
                {selectedProspect.activities && selectedProspect.activities.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar mt-3">
                    {selectedProspect.activities.map((activity) => {
                      const ActIcon = ACTIVITY_ICONS[activity.type] || FileText;
                      return (
                        <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ActIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">{activity.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(activity.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
