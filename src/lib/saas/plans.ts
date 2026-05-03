/**
 * SaaS Plans & Quotas Configuration
 * Defines the 4-tier pricing model for DataSphere Agents
 */

export interface PlanConfig {
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

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'free',
    displayName: 'Gratuit',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'eur',
    features: [
      '3 agents IA inclus',
      '50 conversations/mois',
      '5 documents stockés',
      '100K tokens/mois',
      'Web Builder basique',
      '1 utilisateur',
    ],
    quotas: {
      maxAgents: 3,
      maxConversations: 50,
      maxDocuments: 5,
      maxTokensPerMonth: 100000,
      maxTeamMembers: 1,
      maxFileUploadMb: 5,
      allowCustomAgents: false,
      allowWebBuilder: true,
      allowApiAccess: false,
      allowPriority: false,
      allowWhiteLabel: false,
    },
    cta: 'Commencer gratuitement',
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    priceMonthly: 29,
    priceYearly: 290,
    currency: 'eur',
    features: [
      'Agents IA illimités',
      'Conversations illimitées',
      '50 documents stockés',
      '1M tokens/mois',
      'Web Builder avancé',
      'Agents personnalisés',
      '5 membres d\'équipe',
      'Fichiers jusqu\'à 25 Mo',
      'Support prioritaire',
    ],
    quotas: {
      maxAgents: -1, // unlimited
      maxConversations: -1,
      maxDocuments: 50,
      maxTokensPerMonth: 1000000,
      maxTeamMembers: 5,
      maxFileUploadMb: 25,
      allowCustomAgents: true,
      allowWebBuilder: true,
      allowApiAccess: false,
      allowPriority: true,
      allowWhiteLabel: false,
    },
    popular: true,
    cta: 'Essai gratuit 14 jours',
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    priceMonthly: 79,
    priceYearly: 790,
    currency: 'eur',
    features: [
      'Tout dans Pro',
      'Documents illimités',
      '5M tokens/mois',
      'Membres d\'équipe illimités',
      'Accès API complet',
      'White-label',
      'Fichiers jusqu\'à 100 Mo',
      'SLA garanti 99.9%',
      'Account manager dédié',
    ],
    quotas: {
      maxAgents: -1,
      maxConversations: -1,
      maxDocuments: -1,
      maxTokensPerMonth: 5000000,
      maxTeamMembers: -1,
      maxFileUploadMb: 100,
      allowCustomAgents: true,
      allowWebBuilder: true,
      allowApiAccess: true,
      allowPriority: true,
      allowWhiteLabel: true,
    },
    cta: 'Contacter les ventes',
  },
};

export const PLAN_LIST = Object.values(PLANS);

/**
 * Get plan config by name
 */
export function getPlan(planName: string): PlanConfig {
  return PLANS[planName] || PLANS.free;
}

/**
 * Check if a quota is unlimited (-1)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
  return tokens.toString();
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'eur'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount);
}
