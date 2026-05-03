'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Wand2, Loader2, Copy, RotateCcw, ChevronDown, ChevronUp,
  Sparkles, Lightbulb, ArrowRight, History, Check, BookOpen,
  Target, Palette, Languages, Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

const TARGET_OPTIONS = [
  { value: 'agent-system', label: 'Agent System Prompt', icon: '🤖', desc: 'System prompts for AI agents' },
  { value: 'chat-message', label: 'Chat Message', icon: '💬', desc: 'Conversational messages' },
  { value: 'image-gen', label: 'Image Generation', icon: '🎨', desc: 'Prompts for image AI models' },
  { value: 'code-gen', label: 'Code Generation', icon: '💻', desc: 'Prompts for code generation' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400' },
  { value: 'creative', label: 'Creative', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-400' },
  { value: 'technical', label: 'Technical', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400' },
  { value: 'educational', label: 'Educational', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400' },
  { value: 'friendly', label: 'Friendly', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-400' },
];

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'bilingual', label: 'Bilingual', flag: '🌐' },
];

interface PromptVersion {
  id: string;
  enhanced: string;
  suggestions: string[];
  timestamp: Date;
  target: string;
  tone: string;
}

const TIPS_BY_TARGET: { title: string; tips: string[] }[] = [
  {
    title: 'Agent System Prompt',
    tips: [
      'Define a clear role and persona for the agent',
      'Specify output format and structure expectations',
      'Include constraints and boundaries',
      'Add examples of desired behavior',
      'Use conditional instructions (if X, then Y)',
      'Specify error handling procedures',
    ],
  },
  {
    title: 'Chat Message',
    tips: [
      'Be specific about what you want',
      'Provide context and background information',
      'Use step-by-step instructions for complex tasks',
      'Specify the desired length and format',
      'Include examples when possible',
      'Ask for reasoning before conclusions',
    ],
  },
  {
    title: 'Image Generation',
    tips: [
      'Describe the scene in vivid detail',
      'Specify the art style and medium',
      'Include lighting and color preferences',
      'Mention composition and perspective',
      'Add quality modifiers (e.g., "high detail", "4K")',
      'Specify what to avoid in the image',
    ],
  },
  {
    title: 'Code Generation',
    tips: [
      'Specify the programming language and framework',
      'Describe input/output formats clearly',
      'Mention performance requirements',
      'Include edge cases to handle',
      'Specify coding style and conventions',
      'Request error handling and validation',
    ],
  },
];

export default function PromptGeneratorView() {
  const { token } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [target, setTarget] = useState('agent-system');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('fr');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ enhanced: string; suggestions: string[] } | null>(null);
  const [history, setHistory] = useState<PromptVersion[]>([]);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Veuillez entrer un prompt ou un objectif');
      return;
    }
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/prompt-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, target, tone, language }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la génération');
        return;
      }

      setResult({ enhanced: data.enhanced, suggestions: data.suggestions || [] });
      setHistory((prev) => {
        const newVersion: PromptVersion = {
          id: Date.now().toString(),
          enhanced: data.enhanced,
          suggestions: data.suggestions || [],
          timestamp: new Date(),
          target,
          tone,
        };
        const updated = [newVersion, ...prev].slice(0, 5);
        return updated;
      });
      toast.success('Prompt amélioré avec succès !');

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (_e) {
      toast.error('Erreur de connexion');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copié dans le presse-papiers !');
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      toast.error('Échec de la copie');
    }
  };

  const handleApplyAsAgentPrompt = () => {
    if (!result) return;
    const { setCurrentView, setSelectedAgentId } = useAppStore.getState();
    setCurrentView('agents');
    toast.success('Naviguez vers les agents et créez un nouvel agent avec ce prompt système');
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const loadFromHistory = (version: PromptVersion) => {
    setResult({ enhanced: version.enhanced, suggestions: version.suggestions });
    setTarget(version.target);
    setTone(version.tone);
    toast.info('Version restaurée depuis l\'historique');
  };

  const getTargetInfo = (val: string) => TARGET_OPTIONS.find(t => t.value === val);
  const getToneInfo = (val: string) => TONE_OPTIONS.find(t => t.value === val);
  const getLanguageInfo = (val: string) => LANGUAGE_OPTIONS.find(l => l.value === val);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"><span className="gradient-text">Prompt Generator</span></h1>
            <p className="text-muted-foreground text-sm">Améliorez vos prompts avec l&apos;IA pour des résultats optimaux</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Input Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" /> Votre prompt ou objectif
                </CardTitle>
                <CardDescription>Décrivez votre idée brute et l&apos;IA la transformera en prompt professionnel</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Je veux un agent qui aide les clients à résoudre leurs problèmes techniques pour mon SaaS..."
                  className="min-h-[140px] resize-y"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{prompt.length} caractères</span>
                  {prompt.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPrompt('')}>
                      Effacer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Configuration Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" /> Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Target */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Target className="h-3 w-3" /> Cible
                    </Label>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <span>{opt.icon}</span> {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">{getTargetInfo(target)?.desc}</p>
                  </div>

                  {/* Tone */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Palette className="h-3 w-3" /> Ton
                    </Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      {TONE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setTone(opt.value)}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            tone === opt.value
                              ? 'border-foreground scale-110'
                              : 'border-transparent opacity-40 hover:opacity-70'
                          } ${opt.color.split(' ')[0]}`}
                          title={opt.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Languages className="h-3 w-3" /> Langue
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <span>{opt.flag}</span> {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Generate Button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full h-12 text-base bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Amélioration en cours...
                  <motion.div
                    className="ml-2 flex gap-0.5"
                    initial="start"
                    animate="end"
                  >
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white/60"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </motion.div>
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5 mr-2" /> Améliorer le prompt
                </>
              )}
            </Button>
          </motion.div>

          {/* Output Section */}
          <AnimatePresence>
            {result && (
              <motion.div
                ref={resultRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-violet-200 dark:border-violet-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500" /> Prompt Amélioré
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {getTargetInfo(target)?.icon} {getTargetInfo(target)?.label}
                        </Badge>
                        <Badge className={`text-[10px] ${getToneInfo(tone)?.color}`}>
                          {getToneInfo(tone)?.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Enhanced Prompt */}
                    <div className="relative">
                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-violet-100 dark:border-violet-900">
                        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{result.enhanced}</pre>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(result.enhanced)}
                        className="gap-1.5"
                      >
                        {copied ? (
                          <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copié !</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /> Copier</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyAsAgentPrompt}
                        className="gap-1.5"
                      >
                        <ArrowRight className="h-3.5 w-3.5" /> Appliquer comme prompt d&apos;agent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        className="gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Régénérer
                      </Button>
                    </div>

                    {/* Suggestions */}
                    {result.suggestions.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Suggestions d&apos;amélioration
                        </h4>
                        <div className="space-y-1.5">
                          {result.suggestions.map((suggestion, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <Zap className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-emerald-500" /> Conseils de Prompt Engineering
                      </CardTitle>
                      {tipsOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardDescription>Meilleures pratiques pour chaque type de cible</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {TIPS_BY_TARGET.map((section, i) => (
                        <div key={i} className="space-y-2">
                          <h5 className="text-sm font-semibold flex items-center gap-1.5">
                            <span>{TARGET_OPTIONS[i]?.icon}</span> {section.title}
                          </h5>
                          <ul className="space-y-1">
                            {section.tips.map((tip, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </motion.div>
        </div>

        {/* Right Column - History & Info */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-violet-500" /> Aperçu rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Cible sélectionnée</span>
                  <Badge variant="outline" className="text-[10px]">
                    {getTargetInfo(target)?.icon} {getTargetInfo(target)?.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ton</span>
                  <Badge className={`text-[10px] ${getToneInfo(tone)?.color}`}>
                    {getToneInfo(tone)?.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Langue</span>
                  <Badge variant="outline" className="text-[10px]">
                    {getLanguageInfo(language)?.flag} {getLanguageInfo(language)?.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Versions</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {history.length}/5
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Version History */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-violet-500" /> Historique des versions
                </CardTitle>
                <CardDescription className="text-[11px]">Les 5 dernières générations</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-6">
                    <History className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground">Aucun historique</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Générez votre premier prompt</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {history.map((version, i) => (
                      <motion.button
                        key={version.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => loadFromHistory(version)}
                        className="w-full text-left p-2.5 rounded-lg border hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(version.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-[8px] h-4">
                              {getTargetInfo(version.target)?.icon}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] h-4">
                              {getToneInfo(version.tone)?.label}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                          {version.enhanced.slice(0, 100)}...
                        </p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
