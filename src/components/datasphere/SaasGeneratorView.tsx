'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Rocket, Loader2, Copy, Check, FolderTree, FileCode, Database,
  Route, Layout, BookOpen, Download, ChevronRight, ChevronDown,
  FileText, Folder, FolderOpen, X, Sparkles, Settings2, Server,
  Shield, CreditCard, Mail, Bell, Users, Upload, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FEATURES_LIST = [
  { id: 'auth', label: 'Auth', icon: Shield, color: 'text-emerald-500' },
  { id: 'billing', label: 'Billing', icon: CreditCard, color: 'text-amber-500' },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-blue-500' },
  { id: 'api', label: 'API', icon: Server, color: 'text-violet-500' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-pink-500' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-orange-500' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-red-500' },
  { id: 'multi-tenancy', label: 'Multi-tenancy', icon: Users, color: 'text-cyan-500' },
  { id: 'rbac', label: 'RBAC', icon: Shield, color: 'text-teal-500' },
  { id: 'file-upload', label: 'File Upload', icon: Upload, color: 'text-indigo-500' },
];

const TECH_STACKS = [
  { value: 'nextjs-prisma', label: 'Next.js + Prisma', icon: '▲' },
  { value: 'mern', label: 'MERN Stack', icon: '🍃' },
  { value: 'django', label: 'Django', icon: '🐍' },
  { value: 'laravel', label: 'Laravel', icon: '🔥' },
];

const DATABASES = [
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
  { value: 'mysql', label: 'MySQL', icon: '🐬' },
  { value: 'mongodb', label: 'MongoDB', icon: '🍃' },
  { value: 'sqlite', label: 'SQLite', icon: '📦' },
];

interface GeneratedContent {
  architecture: string;
  schema: string;
  routes: string;
  components: string;
  setupGuide: string;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

export default function SaasGeneratorView() {
  const { token } = useAppStore();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['auth', 'dashboard']);
  const [techStack, setTechStack] = useState('nextjs-prisma');
  const [database, setDatabase] = useState('postgresql');
  const [includeStripe, setIncludeStripe] = useState(false);
  const [includeAuth, setIncludeAuth] = useState(true);
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'app']));
  const [activeTab, setActiveTab] = useState('architecture');

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!projectName.trim()) {
      toast.error('Veuillez entrer un nom de projet');
      return;
    }
    if (!description.trim()) {
      toast.error('Veuillez entrer une description');
      return;
    }
    if (selectedFeatures.length === 0) {
      toast.error('Sélectionnez au moins une fonctionnalité');
      return;
    }

    setIsGenerating(true);
    setGeneratingProgress(0);
    setResult(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGeneratingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const res = await fetch('/api/saas-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName,
          description,
          features: selectedFeatures,
          techStack,
          database,
          options: { includeStripe, includeAuth, includeAdmin },
        }),
      });

      const data = await res.json();
      clearInterval(progressInterval);
      setGeneratingProgress(100);

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la génération');
        return;
      }

      setResult({
        architecture: data.architecture || '',
        schema: data.schema || '',
        routes: data.routes || '',
        components: data.components || '',
        setupGuide: data.setupGuide || '',
      });
      toast.success('Projet SaaS généré avec succès !');
    } catch (_e) {
      clearInterval(progressInterval);
      toast.error('Erreur de connexion');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const allContent = Object.entries(result)
      .map(([key, value]) => `=== ${key.toUpperCase()} ===\n\n${value}`)
      .join('\n\n\n');
    try {
      await navigator.clipboard.writeText(allContent);
      setCopied(true);
      toast.success('Tout le contenu copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      toast.error('Échec de la copie');
    }
  };

  const handleCopySection = async (content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${label} copié !`);
    } catch (_e) {
      toast.error('Échec de la copie');
    }
  };

  const handleDownloadZip = () => {
    if (!result) return;
    // Generate a simple text file as a download since we can't create real ZIPs on client
    const allContent = Object.entries(result)
      .map(([key, value]) => `=== ${key.toUpperCase()} ===\n\n${value}`)
      .join('\n\n\n');
    const blob = new Blob([allContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-saas-project.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier téléchargé !');
  };

  // Parse project structure from architecture text
  const parseTree = (text: string): TreeNode[] => {
    if (!text) return [];
    const lines = text.split('\n').filter(l => l.trim());
    const root: TreeNode[] = [];
    const stack: { node: TreeNode; indent: number }[] = [];

    for (const line of lines) {
      const indent = line.search(/\S/);
      const name = line.trim().replace(/^[├└│─┐┘┤┬┴┼─]+/, '').trim();
      if (!name) continue;

      const isFolder = !name.includes('.') && !name.startsWith('.');
      const node: TreeNode = { name, type: isFolder ? 'folder' : 'file', children: isFolder ? [] : undefined };

      // Find parent
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].node.children?.push(node);
      } else {
        root.push(node);
      }

      if (isFolder) {
        stack.push({ node, indent });
      }
    }

    return root;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const countFiles = (nodes: TreeNode[]): number => {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'file') count++;
      if (node.children) count += countFiles(node.children);
    }
    return count;
  };

  const renderTree = (nodes: TreeNode[], path: string = '', depth: number = 0): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    for (const node of nodes) {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      const isExpanded = expandedFolders.has(fullPath);

      if (node.type === 'folder') {
        elements.push(
          <button
            key={fullPath}
            onClick={() => toggleFolder(fullPath)}
            className="w-full flex items-center gap-1.5 py-1 px-2 rounded hover:bg-accent/50 transition-colors text-left"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            )}
            <span className="text-xs font-medium">{node.name}</span>
          </button>
        );
        if (isExpanded && node.children) {
          elements.push(...renderTree(node.children, fullPath, depth + 1));
        }
      } else {
        elements.push(
          <div
            key={fullPath}
            className="flex items-center gap-1.5 py-1 px-2"
            style={{ paddingLeft: `${depth * 16 + 24}px` }}
          >
            <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">{node.name}</span>
          </div>
        );
      }
    }
    return elements;
  };

  const treeData = parseTree(result?.architecture || '');
  const fileCount = countFiles(treeData);
  const complexityScore = Math.min(100, selectedFeatures.length * 12 + (includeStripe ? 15 : 0) + (includeAuth ? 10 : 0) + (includeAdmin ? 10 : 0));

  const renderCodeBlock = (content: string, label: string) => {
    if (!content) {
      return (
        <div className="text-center py-12">
          <FileCode className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun contenu généré pour cette section</p>
        </div>
      );
    }
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-7 z-10"
          onClick={() => handleCopySection(content, label)}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 dark:from-slate-900 dark:to-slate-950 rounded-xl p-4 overflow-auto max-h-[600px] custom-scrollbar">
          <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold"><span className="gradient-text">SaaS Generator</span></h1>
            <p className="text-muted-foreground text-sm">Générez une structure de projet SaaS complète avec l&apos;IA</p>
          </div>
        </div>
      </motion.div>

      {/* Full-screen loading overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center space-y-6">
              <motion.div
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/25"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Rocket className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold mb-2">Génération en cours...</h3>
                <p className="text-sm text-muted-foreground">Création de votre projet SaaS &quot;{projectName}&quot;</p>
              </div>
              <div className="w-64 mx-auto">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                    style={{ width: `${generatingProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{Math.round(generatingProgress)}%</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analyse des exigences et génération du code...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-4">
          {/* Project Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-emerald-500" /> Configuration du projet
                </CardTitle>
                <CardDescription>Définissez les paramètres de votre projet SaaS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nom du projet</Label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Mon Super SaaS"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Description</Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Plateforme de gestion d'équipe..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features Selection */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" /> Fonctionnalités
                  <Badge variant="secondary" className="text-[10px]">{selectedFeatures.length} sélectionnées</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {FEATURES_LIST.map(feature => {
                    const isSelected = selectedFeatures.includes(feature.id);
                    const Icon = feature.icon;
                    return (
                      <button
                        key={feature.id}
                        onClick={() => toggleFeature(feature.id)}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isSelected ? feature.color : 'text-muted-foreground'}`} />
                        <span className="text-[11px] font-medium">{feature.label}</span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tech Stack & Options */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-emerald-500" /> Stack technique & Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Stack technique</Label>
                    <Select value={techStack} onValueChange={setTechStack}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TECH_STACKS.map(ts => (
                          <SelectItem key={ts.value} value={ts.value}>
                            <span className="flex items-center gap-2">
                              <span>{ts.icon}</span> {ts.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Base de données</Label>
                    <Select value={database} onValueChange={setDatabase}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATABASES.map(db => (
                          <SelectItem key={db.value} value={db.value}>
                            <span className="flex items-center gap-2">
                              <span>{db.icon}</span> {db.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <Label className="text-xs font-medium">Options supplémentaires</Label>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-sm">Inclure Stripe</span>
                      </div>
                      <Switch checked={includeStripe} onCheckedChange={setIncludeStripe} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-sm">Inclure Auth</span>
                      </div>
                      <Switch checked={includeAuth} onCheckedChange={setIncludeAuth} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-sm">Inclure Admin Panel</span>
                      </div>
                      <Switch checked={includeAdmin} onCheckedChange={setIncludeAdmin} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Generate Button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !projectName.trim() || !description.trim()}
              className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {isGenerating ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Génération en cours...</>
              ) : (
                <><Rocket className="h-5 w-5 mr-2" /> Générer le projet SaaS</>
              )}
            </Button>
          </motion.div>

          {/* Output Tabs */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-emerald-200 dark:border-emerald-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-emerald-500" /> Résultat de la génération
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
                          {copied ? (
                            <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copié !</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Tout copier</>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadZip} className="gap-1.5">
                          <Download className="h-3.5 w-3.5" /> Télécharger
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="architecture" className="gap-1 text-xs">
                          <FolderTree className="h-3 w-3" /> Architecture
                        </TabsTrigger>
                        <TabsTrigger value="schema" className="gap-1 text-xs">
                          <Database className="h-3 w-3" /> Schema
                        </TabsTrigger>
                        <TabsTrigger value="routes" className="gap-1 text-xs">
                          <Route className="h-3 w-3" /> Routes
                        </TabsTrigger>
                        <TabsTrigger value="components" className="gap-1 text-xs">
                          <Layout className="h-3 w-3" /> Composants
                        </TabsTrigger>
                        <TabsTrigger value="setup" className="gap-1 text-xs">
                          <BookOpen className="h-3 w-3" /> Setup
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="architecture" className="mt-4">
                        {renderCodeBlock(result.architecture, 'Architecture')}
                      </TabsContent>
                      <TabsContent value="schema" className="mt-4">
                        {renderCodeBlock(result.schema, 'Database Schema')}
                      </TabsContent>
                      <TabsContent value="routes" className="mt-4">
                        {renderCodeBlock(result.routes, 'API Routes')}
                      </TabsContent>
                      <TabsContent value="components" className="mt-4">
                        {renderCodeBlock(result.components, 'Components')}
                      </TabsContent>
                      <TabsContent value="setup" className="mt-4">
                        {renderCodeBlock(result.setupGuide, 'Setup Guide')}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column - Preview & Metrics */}
        <div className="space-y-4">
          {/* Project Preview Tree */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderTree className="h-3.5 w-3.5 text-emerald-500" /> Aperçu du projet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {treeData.length === 0 ? (
                  <div className="text-center py-6">
                    <FolderTree className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground">Générez le projet pour voir l&apos;arborescence</p>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {renderTree(treeData)}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Metrics */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-500" /> Métriques estimées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Fichiers estimés
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {fileCount > 0 ? fileCount : '~' + (selectedFeatures.length * 8 + 15)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Fonctionnalités
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedFeatures.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Settings2 className="h-3 w-3" /> Complexité
                  </span>
                  <Badge className={`text-[10px] ${
                    complexityScore > 70 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400' :
                    complexityScore > 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400'
                  }`}>
                    {complexityScore > 70 ? 'Élevée' : complexityScore > 40 ? 'Moyenne' : 'Faible'}
                  </Badge>
                </div>

                {/* Complexity bar */}
                <div className="space-y-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        complexityScore > 70 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                        complexityScore > 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                        'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                      style={{ width: `${complexityScore}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">{complexityScore}%</p>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <h5 className="text-xs font-medium">Stack sélectionnée</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {TECH_STACKS.find(t => t.value === techStack) && (
                      <Badge variant="outline" className="text-[10px]">
                        {TECH_STACKS.find(t => t.value === techStack)?.icon} {TECH_STACKS.find(t => t.value === techStack)?.label}
                      </Badge>
                    )}
                    {DATABASES.find(d => d.value === database) && (
                      <Badge variant="outline" className="text-[10px]">
                        {DATABASES.find(d => d.value === database)?.icon} {DATABASES.find(d => d.value === database)?.label}
                      </Badge>
                    )}
                    {includeStripe && <Badge variant="outline" className="text-[10px]">💳 Stripe</Badge>}
                    {includeAuth && <Badge variant="outline" className="text-[10px]">🔐 Auth</Badge>}
                    {includeAdmin && <Badge variant="outline" className="text-[10px]">👥 Admin</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Selected Features Summary */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Fonctionnalités sélectionnées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFeatures.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune fonctionnalité sélectionnée</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFeatures.map(fId => {
                      const feature = FEATURES_LIST.find(f => f.id === fId);
                      if (!feature) return null;
                      const Icon = feature.icon;
                      return (
                        <Badge key={fId} variant="secondary" className="text-[10px] gap-1">
                          <Icon className={`h-2.5 w-2.5 ${feature.color}`} /> {feature.label}
                        </Badge>
                      );
                    })}
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
