'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Plus,
  X,
  Loader2,
  Sparkles,
  Headphones,
  TrendingUp,
  Database,
  Target,
  Palette,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  icon: string;
  color: string;
  isDefault: boolean;
  creatorId?: string | null;
}

const iconOptions = [
  { value: 'Headphones', label: 'Support', Icon: Headphones },
  { value: 'TrendingUp', label: 'Finance', Icon: TrendingUp },
  { value: 'Database', label: 'Données', Icon: Database },
  { value: 'Target', label: 'Commercial', Icon: Target },
  { value: 'Bot', label: 'Robot', Icon: Bot },
];

const colorOptions = [
  { value: 'emerald', label: 'Émeraude', previewBg: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'amber', label: 'Ambre', previewBg: 'bg-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400' },
  { value: 'violet', label: 'Violet', previewBg: 'bg-violet-500', iconBg: 'bg-violet-100 dark:bg-violet-900/50', iconColor: 'text-violet-600 dark:text-violet-400' },
  { value: 'rose', label: 'Rose', previewBg: 'bg-rose-500', iconBg: 'bg-rose-100 dark:bg-rose-900/50', iconColor: 'text-rose-600 dark:text-rose-400' },
  { value: 'cyan', label: 'Cyan', previewBg: 'bg-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-900/50', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  { value: 'orange', label: 'Orange', previewBg: 'bg-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/50', iconColor: 'text-orange-600 dark:text-orange-400' },
];

const typeOptions = [
  { value: 'support', label: 'Support Client' },
  { value: 'finance', label: 'Finance' },
  { value: 'data', label: 'Analyse de Données (RAG)' },
  { value: 'sales', label: 'Commercial' },
  { value: 'custom', label: 'Personnalisé' },
];

const promptTemplates: Record<string, string> = {
  support: "Tu es un agent de support client professionnel. Tu réponds en français. Tu aides les utilisateurs avec leurs questions et problèmes. Sois courtois, précis et propose des solutions concrètes.",
  finance: "Tu es un analyste financier expert. Tu réponds en français. Tu analyses les données financières, identifies les tendances et fournis des recommandations basées sur les données.",
  data: "Tu es un expert en analyse de données. Tu réponds en français. Tu analyses les documents et données fournis, extrais les informations clés et réponds aux questions basées sur le contenu.",
  sales: "Tu es un agent commercial expérimenté. Tu réponds en français. Tu aides à qualifier les prospects, proposes des solutions adaptées et accompagnes dans le processus d'achat.",
  custom: "Tu es un assistant IA polyvalent. Tu réponds en français. Tu aides l'utilisateur avec toutes sortes de questions et tâches de manière professionnelle et utile.",
};

export default function AgentBuilder({ onAgentCreated }: { onAgentCreated?: () => void }) {
  const { token } = useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('custom');
  const [systemPrompt, setSystemPrompt] = useState(promptTemplates.custom);
  const [icon, setIcon] = useState('Bot');
  const [color, setColor] = useState('emerald');

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setSystemPrompt(promptTemplates[newType] || promptTemplates.custom);
  };

  const handleCreate = async () => {
    if (!name.trim() || !description.trim() || !systemPrompt.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!token) {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type,
          systemPrompt: systemPrompt.trim(),
          icon,
          color,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création');
        return;
      }

      toast.success(`Agent "${name}" créé avec succès !`);
      setOpen(false);
      resetForm();
      onAgentCreated?.();
    } catch (err) {
      console.error('Agent creation network error:', err);
      toast.error('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('custom');
    setSystemPrompt(promptTemplates.custom);
    setIcon('Bot');
    setColor('emerald');
  };

  // Get preview styles based on selected color (static Tailwind classes)
  const getColorStyles = (colorValue: string) => {
    return colorOptions.find(c => c.value === colorValue) || colorOptions[0];
  };

  const currentColorStyles = getColorStyles(color);
  const IconComp = iconOptions.find((o) => o.value === icon)?.Icon || Bot;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25">
          <Plus className="h-4 w-4 mr-2" />
          Créer un Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Créer un Agent IA Personnalisé
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Preview Card */}
          <Card className="border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Aperçu</p>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${currentColorStyles.iconBg}`}>
                  <IconComp className={`h-6 w-6 ${currentColorStyles.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{name || 'Nom de l\'agent'}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{description || 'Description de l\'agent'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Nom de l&apos;agent *</Label>
              <Input
                id="agent-name"
                placeholder="Ex: Assistant Marketing IA"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type d&apos;agent</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="agent-desc">Description *</Label>
            <Textarea
              id="agent-desc"
              placeholder="Décrivez ce que fait votre agent..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="agent-prompt">Prompt Système *</Label>
            <Textarea
              id="agent-prompt"
              placeholder="Instructions pour l'agent IA..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Ce prompt définit le comportement et la personnalité de votre agent. Il est pré-rempli selon le type sélectionné.
            </p>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icône</Label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((opt) => {
                const OptIcon = opt.Icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setIcon(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      icon === opt.value
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-transparent bg-muted/50 hover:border-emerald-200 dark:hover:border-emerald-800'
                    }`}
                  >
                    <OptIcon className="h-4 w-4" />
                    <span className="text-sm">{opt.label}</span>
                    {icon === opt.value && <Check className="h-3 w-3 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Couleur
            </Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    color === opt.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-transparent bg-muted/50 hover:border-emerald-200 dark:hover:border-emerald-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${opt.previewBg}`} />
                  <span className="text-sm">{opt.label}</span>
                  {color === opt.value && <Check className="h-3 w-3 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Info about RAG */}
          {type === 'data' && (
            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
              <p className="text-sm text-violet-700 dark:text-violet-400">
                <strong>RAG activé :</strong> Cet agent pourra analyser les documents téléchargés par l&apos;utilisateur et répondre en se basant sur leur contenu. Les documents sont automatiquement injectés dans le contexte de la conversation.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !name.trim() || !description.trim() || !systemPrompt.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Créer l&apos;Agent
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
