'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Sparkles,
  Key,
  Bot,
  Rocket,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  ExternalLink,
  Check,
  Headphones,
  TrendingUp,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  { id: 'welcome', title: 'Bienvenue sur DataSphere!', icon: Sparkles },
  { id: 'api-keys', title: 'Configurez vos clés API', icon: Key },
  { id: 'first-agent', title: 'Choisissez votre premier agent', icon: Bot },
  { id: 'ready', title: 'Vous êtes prêt !', icon: Rocket },
];

const agentSuggestions = [
  {
    id: 'support',
    name: 'Support Client IA',
    description: 'Répond aux questions, gère les réclamations et guide les utilisateurs.',
    icon: Headphones,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    id: 'finance',
    name: 'Analyste Financier IA',
    description: 'Analyse les données de paiement, génère des rapports et identifie les tendances.',
    icon: TrendingUp,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    id: 'data',
    name: 'Assistant Data IA',
    description: 'Expert en analyse de données et RAG. Posez des questions sur vos documents.',
    icon: Database,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
  },
];

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { token, user } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveApiKeys = async () => {
    if (!token) return;

    setSavingKeys(true);
    try {
      // Save OpenAI key if provided
      if (openaiKey.trim()) {
        await fetch('/api/apikeys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ provider: 'openai', apiKey: openaiKey.trim() }),
        });
      }

      // Save Anthropic key if provided
      if (anthropicKey.trim()) {
        await fetch('/api/apikeys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ provider: 'anthropic', apiKey: anthropicKey.trim() }),
        });
      }

      toast.success('Clés API enregistrées');
    } catch (_e) {
      // Silent error
    } finally {
      setSavingKeys(false);
    }
  };

  const handleComplete = () => {
    // Mark onboarding as complete in localStorage
    localStorage.setItem('ds_onboarding_complete', 'true');

    // Also update the user profile on the server
    if (token) {
      fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ onboardingCompleted: true }),
      }).catch(() => {
        // Silent error
      });
    }

    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('ds_onboarding_complete', 'true');
    onSkip();
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950 dark:via-gray-950 dark:to-teal-950"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/30 dark:bg-teal-800/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Skip button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Passer
          </Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: index === currentStep ? 1.1 : 1,
                  backgroundColor: index <= currentStep ? '#10b981' : '#e5e7eb',
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <span className={`text-xs font-semibold ${index === currentStep ? 'text-white' : 'text-muted-foreground'}`}>
                    {index + 1}
                  </span>
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 rounded-full transition-colors ${index < currentStep ? 'bg-emerald-500' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Main card */}
        <Card className="border-0 shadow-xl shadow-emerald-500/5 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {currentStep === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30"
                  >
                    <Sparkles className="w-10 h-10 text-white" />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold gradient-text">
                      Bienvenue sur DataSphere !
                    </h2>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                      Votre plateforme IA premium pour créer, gérer et déployer des agents intelligents.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                    {[
                      { icon: Bot, label: '8+ Agents IA' },
                      { icon: Database, label: 'Analyse RAG' },
                      { icon: TrendingUp, label: 'Analytics' },
                    ].map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="text-center p-3 rounded-xl bg-accent/50"
                      >
                        <feature.icon className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                        <p className="text-xs text-muted-foreground">{feature.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: API Keys */}
            {currentStep === 1 && (
              <motion.div
                key="api-keys"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                      <Key className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">Configurez vos clés API</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ajoutez vos clés pour accéder aux modèles IA (optionnel, vous pouvez le faire plus tard)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="openai-key" className="text-sm font-medium">OpenAI API Key</Label>
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          Obtenir une clé <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Input
                        id="openai-key"
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="anthropic-key" className="text-sm font-medium">Anthropic API Key</Label>
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          Obtenir une clé <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Input
                        id="anthropic-key"
                        type="password"
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Vos clés sont chiffrées et stockées de manière sécurisée.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Choose Agent */}
            {currentStep === 2 && (
              <motion.div
                key="first-agent"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
                      <Bot className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">Choisissez votre premier agent</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sélectionnez un agent pour commencer votre première conversation
                    </p>
                  </div>

                  <div className="space-y-3">
                    {agentSuggestions.map((agent, i) => (
                      <motion.button
                        key={agent.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.1 }}
                        onClick={() => setSelectedAgent(agent.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          selectedAgent === agent.id
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                            : 'border-transparent bg-accent/30 hover:bg-accent/60'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0`}>
                          <agent.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{agent.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
                        </div>
                        {selectedAgent === agent.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                          >
                            <Check className="h-3.5 w-3.5 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Ready */}
            {currentStep === 3 && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30"
                  >
                    <Rocket className="h-10 h-10 text-white" />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold gradient-text">
                      Vous êtes prêt !
                    </h2>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                      Tout est configuré. Commencez à explorer DataSphere et à interagir avec vos agents IA.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                    {[
                      { label: 'Agents disponibles', value: '8+' },
                      { label: 'Modèles IA', value: '5+' },
                      { label: 'Templates', value: '12+' },
                      { label: 'Fonctionnalités', value: '20+' },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="p-3 rounded-xl bg-accent/50 text-center"
                      >
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="px-8 pb-6 flex items-center justify-between">
            <div>
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  onClick={handlePrev}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={async () => {
                    // Save API keys if on step 2
                    if (currentStep === 1 && (openaiKey.trim() || anthropicKey.trim())) {
                      await handleSaveApiKeys();
                    }
                    handleNext();
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-1"
                  disabled={savingKeys}
                >
                  {savingKeys ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      Suivant
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-1"
                >
                  Commencer
                  <Rocket className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Step label */}
        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          Étape {currentStep + 1} sur {steps.length}
        </p>
      </div>
    </motion.div>
  );
}
