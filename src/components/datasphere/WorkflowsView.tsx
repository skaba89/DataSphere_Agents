'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Plus,
  Play,
  Trash2,
  Edit3,
  ChevronRight,
  Bot,
  Code2,
  Clock,
  Globe,
  Split,
  Filter,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  X,
  GripVertical,
  Zap,
  FileText,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────

interface StepDef {
  id: string;
  type: 'ai_prompt' | 'condition' | 'transform' | 'delay' | 'webhook_call' | 'parallel';
  name?: string;
  config: Record<string, unknown>;
  nextStep?: string;
  nextStepFalse?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  steps: string;
  stepCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecution?: {
    id: string;
    status: string;
    createdAt: string;
  };
}

interface ExecutionResult {
  executionId: string;
  status: string;
  output: unknown;
  error?: string;
}

// ─── Step type config ─────────────────────────────────────────────────

const STEP_TYPES = [
  { type: 'ai_prompt', label: 'Prompt IA', icon: Bot, color: 'emerald', description: 'Envoyer un prompt à un agent IA' },
  { type: 'condition', label: 'Condition', icon: Filter, color: 'amber', description: 'Branche if/else selon une valeur' },
  { type: 'transform', label: 'Transformation', icon: Code2, color: 'cyan', description: 'Transformer des données avec un template' },
  { type: 'delay', label: 'Délai', icon: Clock, color: 'purple', description: 'Attendre une durée spécifiée' },
  { type: 'webhook_call', label: 'Webhook', icon: Globe, color: 'rose', description: 'Appeler une URL externe' },
  { type: 'parallel', label: 'Parallèle', icon: Split, color: 'teal', description: 'Exécuter plusieurs étapes en parallèle' },
] as const;

function getStepTypeInfo(type: string) {
  return STEP_TYPES.find((s) => s.type === type) || STEP_TYPES[0];
}

// ─── Helper ───────────────────────────────────────────────────────────

function generateStepId() {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseSteps(stepsStr: string): StepDef[] {
  try {
    return JSON.parse(stepsStr);
  } catch {
    return [];
  }
}

// ─── Step Card Component ──────────────────────────────────────────────

function StepCard({
  step,
  index,
  isSelected,
  onSelect,
  onDelete,
  totalSteps,
}: {
  step: StepDef;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  totalSteps: number;
}) {
  const typeInfo = getStepTypeInfo(step.type);
  const Icon = typeInfo.icon;

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <div
        className={`relative flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
          isSelected
            ? colorMap[typeInfo.color] + ' shadow-md'
            : 'bg-card border-border hover:border-emerald-300 dark:hover:border-emerald-700'
        }`}
        onClick={onSelect}
      >
        {/* Step number badge */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isSelected
              ? 'bg-white/50 dark:bg-black/30'
              : 'bg-emerald-50 dark:bg-emerald-950/50'
          }`}>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
        </div>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-semibold truncate">
              {step.name || typeInfo.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {typeInfo.description}
          </p>
          {step.type === 'ai_prompt' && step.config.prompt && (
            <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-1 font-mono">
              {String(step.config.prompt).slice(0, 60)}...
            </p>
          )}
        </div>

        {/* Actions */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Arrow to next step */}
      {index < totalSteps - 1 && (
        <div className="flex justify-center py-1">
          <ArrowRight className="w-4 h-4 text-muted-foreground/40 rotate-90" />
        </div>
      )}
    </motion.div>
  );
}

// ─── Step Config Panel ────────────────────────────────────────────────

function StepConfigPanel({
  step,
  onChange,
  allSteps,
}: {
  step: StepDef;
  onChange: (updated: StepDef) => void;
  allSteps: StepDef[];
}) {
  const typeInfo = getStepTypeInfo(step.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <typeInfo.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h4 className="font-semibold text-sm">Configuration: {typeInfo.label}</h4>
      </div>

      {/* Step name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de l&apos;étape</label>
        <Input
          value={step.name || ''}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
          placeholder="Nom optionnel..."
          className="h-8 text-sm"
        />
      </div>

      {/* AI Prompt config */}
      {step.type === 'ai_prompt' && (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prompt</label>
            <Textarea
              value={String(step.config.prompt || '')}
              onChange={(e) => onChange({ ...step, config: { ...step.config, prompt: e.target.value } })}
              placeholder="Entrez le prompt... Utilisez {{input.key}} ou {{steps.stepId.output}} pour les variables"
              rows={4}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Agent ID (optionnel)</label>
            <Input
              value={String(step.config.agentId || '')}
              onChange={(e) => onChange({ ...step, config: { ...step.config, agentId: e.target.value } })}
              placeholder="ID de l'agent à utiliser"
              className="h-8 text-sm"
            />
          </div>
        </>
      )}

      {/* Condition config */}
      {step.type === 'condition' && (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Champ à vérifier</label>
            <Input
              value={String(step.config.field || '')}
              onChange={(e) => onChange({ ...step, config: { ...step.config, field: e.target.value } })}
              placeholder="ex: input.riskLevel"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Opérateur</label>
            <Select
              value={String(step.config.operator || 'equals')}
              onValueChange={(v) => onChange({ ...step, config: { ...step.config, operator: v } })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Égal à</SelectItem>
                <SelectItem value="not_equals">Différent de</SelectItem>
                <SelectItem value="contains">Contient</SelectItem>
                <SelectItem value="greater_than">Supérieur à</SelectItem>
                <SelectItem value="less_than">Inférieur à</SelectItem>
                <SelectItem value="exists">Existe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Valeur de comparaison</label>
            <Input
              value={String(step.config.value || '')}
              onChange={(e) => onChange({ ...step, config: { ...step.config, value: e.target.value } })}
              placeholder="Valeur à comparer"
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Si vrai → Étape</label>
              <Select
                value={String(step.config.trueStep || step.nextStep || '')}
                onValueChange={(v) => onChange({ ...step, config: { ...step.config, trueStep: v }, nextStep: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Prochaine étape" />
                </SelectTrigger>
                <SelectContent>
                  {allSteps.filter((s) => s.id !== step.id).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name || s.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Si faux → Étape</label>
              <Select
                value={String(step.config.falseStep || step.nextStepFalse || '')}
                onValueChange={(v) => onChange({ ...step, config: { ...step.config, falseStep: v }, nextStepFalse: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Étape alternative" />
                </SelectTrigger>
                <SelectContent>
                  {allSteps.filter((s) => s.id !== step.id).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name || s.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* Transform config */}
      {step.type === 'transform' && (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Template</label>
            <Textarea
              value={String(step.config.template || '')}
              onChange={(e) => onChange({ ...step, config: { ...step.config, template: e.target.value } })}
              placeholder="Template avec {{variables}}..."
              rows={4}
              className="text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Format de sortie</label>
            <Select
              value={String(step.config.format || 'text')}
              onValueChange={(v) => onChange({ ...step, config: { ...step.config, format: v } })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texte</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="array">Tableau</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Delay config */}
      {step.type === 'delay' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Durée</label>
            <Input
              type="number"
              value={Number(step.config.duration || 1)}
              onChange={(e) => onChange({ ...step, config: { ...step.config, duration: Number(e.target.value) } })}
              min={1}
              max={30}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Unité</label>
            <Select
              value={String(step.config.unit || 'seconds')}
              onValueChange={(v) => onChange({ ...step, config: { ...step.config, unit: v } })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Secondes</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Webhook config */}
      {step.type === 'webhook_call' && (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
            <Input
              value={String(step.config.url || '')}
              onChange={(e) => onChange({ ...step, config: { ...step.config, url: e.target.value } })}
              placeholder="https://api.example.com/webhook"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Méthode</label>
            <Select
              value={String(step.config.method || 'POST')}
              onValueChange={(v) => onChange({ ...step, config: { ...step.config, method: v } })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Corps (JSON, optionnel)</label>
            <Textarea
              value={String(step.config.body || '')}
              onChange={(e) => onChange({ ...step, config: { ...step.config, body: e.target.value } })}
              placeholder='{"key": "value"}'
              rows={3}
              className="text-sm font-mono"
            />
          </div>
        </>
      )}

      {/* Parallel config */}
      {step.type === 'parallel' && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Les étapes parallèles seront exécutées en même temps. Configurez les sous-étapes après avoir sauvegardé le workflow.
          </p>
        </div>
      )}

      {/* Next step selector for non-condition steps */}
      {step.type !== 'condition' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Prochaine étape (par défaut: séquentielle)</label>
          <Select
            value={step.nextStep || '_default'}
            onValueChange={(v) => onChange({ ...step, nextStep: v === '_default' ? undefined : v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Séquentielle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_default">Séquentielle (par défaut)</SelectItem>
              {allSteps.filter((s) => s.id !== step.id).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name || s.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ─── Status badge helper (outside component) ──────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
    completed: { icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400', label: 'Terminé' },
    running: { icon: Loader2, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400', label: 'En cours' },
    pending: { icon: Clock, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', label: 'En attente' },
    failed: { icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400', label: 'Échoué' },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <Badge variant="secondary" className={`${c.className} text-[10px] gap-1`}>
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {c.label}
    </Badge>
  );
}

// ─── Main WorkflowsView Component ─────────────────────────────────────

export default function WorkflowsView() {
  const { token } = useAppStore();
  const { toast } = useToast();

  // State
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null);
  const [view, setView] = useState<'list' | 'builder' | 'execution'>('list');

  // Builder state
  const [builderName, setBuilderName] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderSteps, setBuilderSteps] = useState<StepDef[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);

  // Execution state
  const [executionInput, setExecutionInput] = useState('{}');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);

  // Load workflows
  const loadWorkflows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workflows', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [token]);

  // Load workflows on mount
  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/workflows', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active && res.ok) {
          const data = await res.json();
          setWorkflows(data.workflows || []);
        }
      } catch {
        // silent
      }
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [token]);

  // ─── Workflow CRUD ────────────────────────────────────────────────

  const createWorkflow = async () => {
    if (!token || !builderName || builderSteps.length === 0) return;
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: builderName,
          description: builderDescription,
          steps: builderSteps,
        }),
      });
      if (res.ok) {
        toast({ title: 'Workflow créé avec succès' });
        resetBuilder();
        loadWorkflows();
        setView('list');
      } else {
        const data = await res.json();
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    }
  };

  const updateWorkflow = async () => {
    if (!token || !editingWorkflowId || !builderName) return;
    try {
      const res = await fetch(`/api/workflows/${editingWorkflowId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: builderName,
          description: builderDescription,
          steps: builderSteps,
        }),
      });
      if (res.ok) {
        toast({ title: 'Workflow mis à jour' });
        resetBuilder();
        loadWorkflows();
        setView('list');
      }
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: 'Workflow supprimé' });
        loadWorkflows();
        if (selectedWorkflow?.id === id) {
          setSelectedWorkflow(null);
          setView('list');
        }
      }
    } catch {
      toast({ title: 'Erreur réseau', variant: 'destructive' });
    }
  };

  const executeWorkflowAction = async () => {
    if (!token || !selectedWorkflow) return;
    setExecuting(true);
    setExecutionResult(null);
    try {
      let input = {};
      try {
        input = JSON.parse(executionInput);
      } catch {
        input = { query: executionInput };
      }

      const res = await fetch(`/api/workflows/${selectedWorkflow.id}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      const data = await res.json();
      setExecutionResult(data);
      if (data.status === 'completed') {
        toast({ title: 'Workflow exécuté avec succès' });
      } else {
        toast({ title: 'Workflow échoué', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erreur d\'exécution', variant: 'destructive' });
    }
    setExecuting(false);
  };

  // ─── Builder helpers ──────────────────────────────────────────────

  const resetBuilder = () => {
    setBuilderName('');
    setBuilderDescription('');
    setBuilderSteps([]);
    setSelectedStepIndex(null);
    setEditingWorkflowId(null);
  };

  const addStep = (type: StepDef['type']) => {
    const newStep: StepDef = {
      id: generateStepId(),
      type,
      name: getStepTypeInfo(type).label,
      config: {},
    };
    setBuilderSteps([...builderSteps, newStep]);
    setSelectedStepIndex(builderSteps.length);
  };

  const removeStep = (index: number) => {
    const newSteps = builderSteps.filter((_, i) => i !== index);
    setBuilderSteps(newSteps);
    if (selectedStepIndex !== null && selectedStepIndex >= newSteps.length) {
      setSelectedStepIndex(newSteps.length > 0 ? newSteps.length - 1 : null);
    }
  };

  const updateStep = (index: number, updated: StepDef) => {
    const newSteps = [...builderSteps];
    newSteps[index] = updated;
    setBuilderSteps(newSteps);
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...builderSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setBuilderSteps(newSteps);
    if (selectedStepIndex === index) setSelectedStepIndex(index - 1);
    else if (selectedStepIndex === index - 1) setSelectedStepIndex(index);
  };

  const moveStepDown = (index: number) => {
    if (index === builderSteps.length - 1) return;
    const newSteps = [...builderSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setBuilderSteps(newSteps);
    if (selectedStepIndex === index) setSelectedStepIndex(index + 1);
    else if (selectedStepIndex === index + 1) setSelectedStepIndex(index);
  };

  const loadTemplate = (templateIndex: number) => {
    // Template workflows
    const templates = [
      {
        name: 'Analyse de données',
        description: 'Recherche web → Analyse IA → Transformation des résultats',
        steps: [
          { id: generateStepId(), type: 'ai_prompt' as const, name: 'Recherche', config: { prompt: 'Recherche des informations sur: {{input.query}}. Fournis une analyse détaillée avec des données chiffrées.' } },
          { id: generateStepId(), type: 'ai_prompt' as const, name: 'Analyse', config: { prompt: 'Analyse les données suivantes et fournis des insights actionnables:\n\n{{steps.search.output}}' }, nextStep: undefined },
          { id: generateStepId(), type: 'transform' as const, name: 'Formatage', config: { template: '📊 Rapport d\'analyse\n\n🔍 Requête: {{input.query}}\n\n📝 Résultats:\n{{steps.analyze.output}}', format: 'text' } },
        ],
      },
      {
        name: 'Génération de rapport',
        description: 'Génération IA → Transformation → Révision IA',
        steps: [
          { id: generateStepId(), type: 'ai_prompt' as const, name: 'Génération', config: { prompt: 'Génère un rapport professionnel sur: {{input.topic}}. Structure avec introduction, développement et conclusion.' } },
          { id: generateStepId(), type: 'transform' as const, name: 'Mise en forme', config: { template: '═══ RAPPORT ═══\n\n{{steps.generate.output}}\n\n═══ FIN DU RAPPORT ═══', format: 'text' } },
          { id: generateStepId(), type: 'ai_prompt' as const, name: 'Révision', config: { prompt: 'Relis et améliore le rapport suivant:\n\n{{steps.transform.output}}' } },
        ],
      },
      {
        name: 'Veille concurrentielle',
        description: 'Recherche → Analyse → Condition (alerte ou résumé)',
        steps: [
          { id: generateStepId(), type: 'ai_prompt' as const, name: 'Recherche', config: { prompt: 'Analyse le marché et les concurrents pour: {{input.subject}}. Identifie les tendances clés, menaces et opportunités.' } },
          { id: generateStepId(), type: 'condition' as const, name: 'Évaluation', config: { field: 'input.riskLevel', operator: 'equals', value: 'high' }, nextStep: undefined, nextStepFalse: undefined },
          { id: generateStepId(), type: 'transform' as const, name: 'Alerte', config: { template: '🚨 ALERTE CONCURRENTIELLE 🚨\n\n{{steps.research.output}}\n\n⚠️ Risque élevé détecté', format: 'text' } },
          { id: generateStepId(), type: 'transform' as const, name: 'Résumé', config: { template: '📋 Veille Concurrentielle\n\n{{steps.research.output}}\n\n✅ Pas de risque majeur', format: 'text' } },
        ],
      },
    ];

    const t = templates[templateIndex];
    setBuilderName(t.name);
    setBuilderDescription(t.description);
    setBuilderSteps(t.steps as StepDef[]);
    setSelectedStepIndex(0);
  };

  const editWorkflow = (wf: WorkflowData) => {
    setEditingWorkflowId(wf.id);
    setBuilderName(wf.name);
    setBuilderDescription(wf.description || '');
    setBuilderSteps(parseSteps(wf.steps));
    setSelectedStepIndex(0);
    setView('builder');
  };

  const openExecution = (wf: WorkflowData) => {
    setSelectedWorkflow(wf);
    setExecutionInput('{}');
    setExecutionResult(null);
    setView('execution');
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b bg-gradient-to-r from-emerald-50/50 via-transparent to-teal-50/50 dark:from-emerald-950/30 dark:via-transparent dark:to-teal-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Workflows</h1>
              <p className="text-sm text-muted-foreground">Orchestrez vos agents IA en séquences automatisées</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadWorkflows}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </Button>
            {view === 'list' && (
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-3.5 h-3.5" />
                      Nouveau
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Créer un workflow</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <Input
                        placeholder="Nom du workflow"
                        value={builderName}
                        onChange={(e) => setBuilderName(e.target.value)}
                      />
                      <Textarea
                        placeholder="Description (optionnel)"
                        value={builderDescription}
                        onChange={(e) => setBuilderDescription(e.target.value)}
                        rows={2}
                      />
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={!builderName.trim()}
                        onClick={() => {
                          resetBuilder();
                          setView('builder');
                        }}
                      >
                        Créer et configurer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            {view !== 'list' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetBuilder();
                  setView('list');
                }}
                className="gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Retour
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* ─── LIST VIEW ──────────────────────────────────────────── */}
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 md:p-6 space-y-6"
            >
              {/* Template workflows */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { name: 'Analyse de données', icon: Search, desc: 'Recherche → IA → Transformation' },
                    { name: 'Génération de rapport', icon: FileText, desc: 'IA → Transform → Révision' },
                    { name: 'Veille concurrentielle', icon: Zap, desc: 'Recherche → Condition → Alerte' },
                  ].map((template, idx) => (
                    <Card
                      key={idx}
                      className="cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors group"
                      onClick={() => loadTemplate(idx)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                            <template.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.desc}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Existing workflows */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-500" />
                  Vos Workflows
                </h3>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : workflows.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <GitBranch className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Aucun workflow créé</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Utilisez un template ou créez un nouveau workflow
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {workflows.map((wf) => (
                      <motion.div
                        key={wf.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                  <GitBranch className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold">{wf.name}</h4>
                                  {wf.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">{wf.description}</p>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <ChevronRight className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => editWorkflow(wf)}>
                                    <Edit3 className="w-3.5 h-3.5 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openExecution(wf)}>
                                    <Play className="w-3.5 h-3.5 mr-2" />
                                    Exécuter
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteWorkflow(wf.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px]">
                                  {wf.stepCount} étape{wf.stepCount > 1 ? 's' : ''}
                                </Badge>
                                {wf.lastExecution && (
                                  <StatusBadge status={wf.lastExecution.status} />
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                                onClick={() => openExecution(wf)}
                              >
                                <Play className="w-3 h-3" />
                                Exécuter
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── BUILDER VIEW ────────────────────────────────────────── */}
          {view === 'builder' && (
            <motion.div
              key="builder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 md:p-6"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Left: Steps list */}
                <div className="flex-1 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-emerald-500" />
                        Étapes du workflow
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <AnimatePresence>
                        {builderSteps.map((step, idx) => (
                          <div key={step.id} className="flex items-center gap-1">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => moveStepUp(idx)}
                                disabled={idx === 0}
                                className="p-0.5 hover:text-emerald-600 disabled:opacity-20"
                              >
                                <ChevronRight className="w-3 h-3 -rotate-90" />
                              </button>
                              <button
                                onClick={() => moveStepDown(idx)}
                                disabled={idx === builderSteps.length - 1}
                                className="p-0.5 hover:text-emerald-600 disabled:opacity-20"
                              >
                                <ChevronRight className="w-3 h-3 rotate-90" />
                              </button>
                            </div>
                            <div className="flex-1">
                              <StepCard
                                step={step}
                                index={idx}
                                isSelected={selectedStepIndex === idx}
                                onSelect={() => setSelectedStepIndex(idx)}
                                onDelete={() => removeStep(idx)}
                                totalSteps={builderSteps.length}
                              />
                            </div>
                          </div>
                        ))}
                      </AnimatePresence>

                      {builderSteps.length === 0 && (
                        <div className="py-8 text-center">
                          <GitBranch className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">Aucune étape configurée</p>
                          <p className="text-xs text-muted-foreground/60">Ajoutez des étapes pour commencer</p>
                        </div>
                      )}

                      {/* Add step dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full gap-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          >
                            <Plus className="w-4 h-4" />
                            Ajouter une étape
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                          {STEP_TYPES.map((st) => (
                            <DropdownMenuItem
                              key={st.type}
                              onClick={() => addStep(st.type)}
                              className="gap-2 py-2"
                            >
                              <st.icon className="w-4 h-4 text-emerald-600" />
                              <div>
                                <p className="text-sm font-medium">{st.label}</p>
                                <p className="text-[10px] text-muted-foreground">{st.description}</p>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Config panel */}
                <div className="lg:w-96">
                  <Card className="sticky top-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-emerald-500" />
                        Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStepIndex !== null && builderSteps[selectedStepIndex] ? (
                        <StepConfigPanel
                          step={builderSteps[selectedStepIndex]}
                          onChange={(updated) => updateStep(selectedStepIndex, updated)}
                          allSteps={builderSteps}
                        />
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-sm text-muted-foreground">Sélectionnez une étape à configurer</p>
                        </div>
                      )}

                      <Separator className="my-4" />

                      {/* Workflow metadata */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom du workflow</label>
                          <Input
                            value={builderName}
                            onChange={(e) => setBuilderName(e.target.value)}
                            placeholder="Mon workflow"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                          <Textarea
                            value={builderDescription}
                            onChange={(e) => setBuilderDescription(e.target.value)}
                            placeholder="Description optionnelle..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={!builderName.trim() || builderSteps.length === 0}
                            onClick={editingWorkflowId ? updateWorkflow : createWorkflow}
                          >
                            <Save className="w-3.5 h-3.5" />
                            {editingWorkflowId ? 'Mettre à jour' : 'Créer le workflow'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── EXECUTION VIEW ──────────────────────────────────────── */}
          {view === 'execution' && selectedWorkflow && (
            <motion.div
              key="execution"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 md:p-6 max-w-3xl mx-auto space-y-4"
            >
              {/* Workflow info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedWorkflow.name}</h3>
                      {selectedWorkflow.description && (
                        <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {selectedWorkflow.stepCount} étape{selectedWorkflow.stepCount > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Steps preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Étapes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {parseSteps(selectedWorkflow.steps).map((step, idx) => {
                      const typeInfo = getStepTypeInfo(step.type);
                      const Icon = typeInfo.icon;
                      return (
                        <div key={step.id || idx} className="flex items-center gap-2 py-1">
                          <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {idx + 1}
                          </div>
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{step.name || typeInfo.label}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/30 ml-auto" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Input form */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-500" />
                    Données d&apos;entrée (JSON)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={executionInput}
                    onChange={(e) => setExecutionInput(e.target.value)}
                    placeholder='{"query": "votre requête ici", "topic": "sujet", "riskLevel": "high"}'
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={executeWorkflowAction}
                    disabled={executing}
                  >
                    {executing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exécution en cours...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Exécuter le workflow
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Execution result */}
              {executionResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`border-2 ${
                    executionResult.status === 'completed'
                      ? 'border-emerald-300 dark:border-emerald-700'
                      : 'border-red-300 dark:border-red-700'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {executionResult.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        Résultat
                        <StatusBadge status={executionResult.status} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {executionResult.error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg mb-3">
                          <p className="text-sm text-red-700 dark:text-red-400">{executionResult.error}</p>
                        </div>
                      )}

                      {executionResult.output && (
                        <ScrollArea className="max-h-96">
                          <pre className="text-xs font-mono bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {typeof executionResult.output === 'string'
                              ? executionResult.output
                              : JSON.stringify(executionResult.output, null, 2)}
                          </pre>
                        </ScrollArea>
                      )}

                      <p className="text-[10px] text-muted-foreground mt-2">
                        ID d&apos;exécution: {executionResult.executionId}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
