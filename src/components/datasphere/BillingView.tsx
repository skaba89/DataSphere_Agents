'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Check,
  Zap,
  Crown,
  Building2,
  Loader2,
  CreditCard,
  FileText,
  ExternalLink,
  ArrowRight,
  BarChart3,
  Bot,
  MessageSquare,
  FileUp,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlanInfo {
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  quotas: {
    maxAgents: number;
    maxConversations: number;
    maxDocuments: number;
    maxTokensPerMonth: number;
    maxTeamMembers: number;
    maxFileUploadMb: number;
    allowCustomAgents: boolean;
    allowWebBuilder: boolean;
    allowApiAccess: boolean;
    allowPriority: boolean;
    allowWhiteLabel: boolean;
  };
  popular?: boolean;
  cta: string;
}

interface UsageInfo {
  tokens: { used: number; limit: number };
  agents: { used: number; limit: number };
  documents: { used: number; limit: number };
  conversations: { used: number; limit: number };
}

interface SubscriptionInfo {
  id: string;
  status: string;
  planName: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  billingInterval: string;
}

interface BillingData {
  plans: PlanInfo[];
  currentPlan: string;
  subscription: SubscriptionInfo | null;
  usage: UsageInfo;
}

interface InvoiceInfo {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  stripeInvoiceId: string | null;
  stripeInvoiceUrl: string | null;
  paidAt: string | null;
}

const planIcons: Record<string, React.ElementType> = {
  free: Zap,
  pro: Crown,
  enterprise: Building2,
};

const planColors: Record<string, string> = {
  free: 'from-emerald-500 to-teal-600',
  pro: 'from-amber-500 to-orange-600',
  enterprise: 'from-violet-500 to-purple-600',
};

const planBorderColors: Record<string, string> = {
  free: 'border-emerald-200 dark:border-emerald-800',
  pro: 'border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/30',
  enterprise: 'border-violet-200 dark:border-violet-800',
};

function formatTokens(n: number): string {
  if (n === -1) return 'Illimité';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function formatNumber(n: number): string {
  if (n === -1) return '∞';
  return n.toLocaleString('fr-FR');
}

function getUsagePercent(used: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function getUsageColor(percent: number): string {
  if (percent >= 90) return 'text-red-500';
  if (percent >= 70) return 'text-amber-500';
  return 'text-emerald-500';
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return '[&>div]:bg-red-500';
  if (percent >= 70) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-emerald-500';
}

export default function BillingView() {
  const { token } = useAppStore();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await fetch('/api/billing/plans', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (_e) {
        toast.error('Erreur lors du chargement de la facturation');
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, [token]);

  // Fetch invoices
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!token) return;
      setInvoicesLoading(true);
      try {
        const res = await fetch('/api/billing/invoices', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const result = await res.json();
          setInvoices(result.invoices || []);
        }
      } catch (_e) {
        // silent
      } finally {
        setInvoicesLoading(false);
      }
    };
    fetchInvoices();
  }, [token]);

  const handleSubscribe = async (planName: string) => {
    setCheckoutLoading(planName);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planName, billingInterval }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || 'Erreur lors de la souscription');
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (_e) {
      toast.error('Erreur de connexion au serveur de paiement');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setCheckoutLoading('portal');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || 'Erreur d\'accès au portail');
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (_e) {
      toast.error('Erreur de connexion');
    } finally {
      setCheckoutLoading('portal');
    }
  };

  if (loading || !data) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 rounded bg-muted skeleton mb-2" />
          <div className="h-4 w-64 rounded bg-muted skeleton" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 rounded-xl bg-muted skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="gradient-text">Facturation & Abonnements</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre plan, suivez votre utilisation et accédez à vos factures
        </p>
      </motion.div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="plans" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Utilisation
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Factures
          </TabsTrigger>
        </TabsList>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-6">
          {/* Current Plan Banner */}
          {data.subscription && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        Plan actuel : <span className="text-emerald-600 dark:text-emerald-400">{data.subscription.planName === 'free' ? 'Gratuit' : data.subscription.planName === 'pro' ? 'Pro' : 'Enterprise'}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {data.subscription.status === 'active' ? 'Actif' : data.subscription.status === 'trialing' ? 'Période d\'essai' : 'En attente'}
                        {data.subscription.cancelAtPeriodEnd && ' · Annulation prévue en fin de période'}
                      </p>
                    </div>
                  </div>
                  {data.subscription.planName !== 'free' && (
                    <Button variant="outline" size="sm" onClick={handlePortal} disabled={checkoutLoading === 'portal'}>
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      Gérer l'abonnement
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Billing Interval Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${billingInterval === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Mensuel
            </span>
            <button
              onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                billingInterval === 'yearly' ? 'bg-emerald-500' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
            <span className={`text-sm ${billingInterval === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Annuel
            </span>
            {billingInterval === 'yearly' && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400">
                -17%
              </Badge>
            )}
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.plans.map((plan, index) => {
              const Icon = planIcons[plan.name] || Zap;
              const isCurrent = plan.name === data.currentPlan;
              const price = billingInterval === 'yearly' ? plan.priceYearly : plan.priceMonthly;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`relative overflow-hidden h-full flex flex-col ${planBorderColors[plan.name] || ''}`}>
                    {plan.popular && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-gradient-to-l from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                          Populaire
                        </div>
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${planColors[plan.name] || planColors.free} flex items-center justify-center`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{plan.displayName}</CardTitle>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          {price === 0 ? '0 €' : `${price} €`}
                        </span>
                        {price > 0 && (
                          <span className="text-muted-foreground text-sm">
                            /{billingInterval === 'yearly' ? 'an' : 'mois'}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2.5 flex-1 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={isCurrent ? 'outline' : 'default'}
                        disabled={isCurrent || checkoutLoading === plan.name}
                        onClick={() => handleSubscribe(plan.name)}
                      >
                        {checkoutLoading === plan.name ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCurrent ? (
                          'Plan actuel'
                        ) : (
                          <>
                            {plan.cta}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* USAGE TAB */}
        <TabsContent value="usage" className="space-y-6">
          {data.usage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tokens Usage */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Tokens ce mois</p>
                        <p className={`text-2xl font-bold ${getUsageColor(getUsagePercent(data.usage.tokens.used, data.usage.tokens.limit))}`}>
                          {formatTokens(data.usage.tokens.used)}
                        </p>
                      </div>
                    </div>
                    {data.usage.tokens.limit !== -1 && (
                      <>
                        <Progress value={getUsagePercent(data.usage.tokens.used, data.usage.tokens.limit)} className={`h-2 ${getProgressColor(getUsagePercent(data.usage.tokens.used, data.usage.tokens.limit))}`} />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatTokens(data.usage.tokens.used)} / {formatTokens(data.usage.tokens.limit)} utilisés
                        </p>
                      </>
                    )}
                    {data.usage.tokens.limit === -1 && (
                      <p className="text-xs text-emerald-500 font-medium">Illimité</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Agents Usage */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Agents IA</p>
                        <p className={`text-2xl font-bold ${getUsageColor(getUsagePercent(data.usage.agents.used, data.usage.agents.limit))}`}>
                          {formatNumber(data.usage.agents.used)}
                        </p>
                      </div>
                    </div>
                    {data.usage.agents.limit !== -1 && (
                      <>
                        <Progress value={getUsagePercent(data.usage.agents.used, data.usage.agents.limit)} className={`h-2 ${getProgressColor(getUsagePercent(data.usage.agents.used, data.usage.agents.limit))}`} />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {data.usage.agents.used} / {formatNumber(data.usage.agents.limit)} agents
                        </p>
                      </>
                    )}
                    {data.usage.agents.limit === -1 && (
                      <p className="text-xs text-emerald-500 font-medium">Illimité</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Conversations Usage */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Conversations/mois</p>
                        <p className={`text-2xl font-bold ${getUsageColor(getUsagePercent(data.usage.conversations.used, data.usage.conversations.limit))}`}>
                          {formatNumber(data.usage.conversations.used)}
                        </p>
                      </div>
                    </div>
                    {data.usage.conversations.limit !== -1 && (
                      <>
                        <Progress value={getUsagePercent(data.usage.conversations.used, data.usage.conversations.limit)} className={`h-2 ${getProgressColor(getUsagePercent(data.usage.conversations.used, data.usage.conversations.limit))}`} />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {data.usage.conversations.used} / {formatNumber(data.usage.conversations.limit)} ce mois
                        </p>
                      </>
                    )}
                    {data.usage.conversations.limit === -1 && (
                      <p className="text-xs text-emerald-500 font-medium">Illimité</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Documents Usage */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                        <FileUp className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Documents</p>
                        <p className={`text-2xl font-bold ${getUsageColor(getUsagePercent(data.usage.documents.used, data.usage.documents.limit))}`}>
                          {formatNumber(data.usage.documents.used)}
                        </p>
                      </div>
                    </div>
                    {data.usage.documents.limit !== -1 && (
                      <>
                        <Progress value={getUsagePercent(data.usage.documents.used, data.usage.documents.limit)} className={`h-2 ${getProgressColor(getUsagePercent(data.usage.documents.used, data.usage.documents.limit))}`} />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {data.usage.documents.used} / {formatNumber(data.usage.documents.limit)} documents
                        </p>
                      </>
                    )}
                    {data.usage.documents.limit === -1 && (
                      <p className="text-xs text-emerald-500 font-medium">Illimité</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique de facturation</CardTitle>
              <CardDescription>Vos factures et reçus de paiement</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">Aucune facture disponible</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    Les factures apparaîtront ici après votre premier paiement
                  </p>
                  {(!data.subscription || data.subscription.planName === 'free') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleSubscribe('pro')}
                    >
                      Passer au plan Pro
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 font-medium text-muted-foreground">Montant</th>
                        <th className="pb-3 font-medium text-muted-foreground">Statut</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b last:border-0">
                          <td className="py-3">
                            {new Date(invoice.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 font-medium">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: (invoice.currency || 'eur').toUpperCase(),
                              minimumFractionDigits: 2,
                            }).format(invoice.amount)}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant="outline"
                              className={
                                invoice.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                                  : invoice.status === 'pending'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
                                  : invoice.status === 'failed'
                                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400 dark:border-gray-800'
                              }
                            >
                              {invoice.status === 'paid'
                                ? 'Payée'
                                : invoice.status === 'pending'
                                ? 'En attente'
                                : invoice.status === 'failed'
                                ? 'Échouée'
                                : 'Remboursée'}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            {invoice.stripeInvoiceUrl && (
                              <a
                                href={invoice.stripeInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Voir sur Stripe
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {invoices.length > 0 && data.subscription && data.subscription.planName !== 'free' && (
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button variant="outline" size="sm" onClick={handlePortal} disabled={checkoutLoading === 'portal'}>
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    Gérer sur Stripe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
