/**
 * Quota Enforcement Module
 * Checks and enforces SaaS plan limits before allowing actions
 */

import { db } from '@/lib/db';
import { getPlan, isUnlimited } from './plans';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
  remaining?: number;
}

/**
 * Get the user's current subscription plan
 */
export async function getUserPlan(userId: string) {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!subscription || subscription.status !== 'active') {
    // Return free plan config
    return {
      planName: 'free',
      subscription: null,
    };
  }

  return {
    planName: subscription.plan.name,
    subscription,
  };
}

/**
 * Get current month's token usage for a user
 */
export async function getMonthlyTokenUsage(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await db.usageEvent.aggregate({
    _sum: { tokensUsed: true },
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  return result._sum.tokensUsed || 0;
}

/**
 * Check if user can create a new agent
 */
export async function checkAgentQuota(userId: string): Promise<QuotaCheckResult> {
  const { planName } = await getUserPlan(userId);
  const plan = getPlan(planName);

  if (isUnlimited(plan.quotas.maxAgents)) {
    return { allowed: true, remaining: -1 };
  }

  const currentAgents = await db.agent.count({
    where: {
      OR: [{ isDefault: true }, { creatorId: userId }],
    },
  });

  const customAgents = currentAgents; // includes defaults
  const remaining = plan.quotas.maxAgents - customAgents;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Limite atteinte : ${plan.quotas.maxAgents} agents maximum sur le plan ${plan.displayName}. Passez au plan supérieur pour plus d'agents.`,
      current: customAgents,
      limit: plan.quotas.maxAgents,
      remaining: 0,
    };
  }

  return { allowed: true, current: customAgents, limit: plan.quotas.maxAgents, remaining };
}

/**
 * Check if user can create a new conversation
 */
export async function checkConversationQuota(userId: string): Promise<QuotaCheckResult> {
  const { planName } = await getUserPlan(userId);
  const plan = getPlan(planName);

  if (isUnlimited(plan.quotas.maxConversations)) {
    return { allowed: true, remaining: -1 };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const currentConversations = await db.conversation.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  const remaining = plan.quotas.maxConversations - currentConversations;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Limite atteinte : ${plan.quotas.maxConversations} conversations/mois sur le plan ${plan.displayName}.`,
      current: currentConversations,
      limit: plan.quotas.maxConversations,
      remaining: 0,
    };
  }

  return { allowed: true, current: currentConversations, limit: plan.quotas.maxConversations, remaining };
}

/**
 * Check if user can send a chat message (token quota)
 */
export async function checkTokenQuota(userId: string, estimatedTokens: number = 0): Promise<QuotaCheckResult> {
  const { planName } = await getUserPlan(userId);
  const plan = getPlan(planName);

  if (isUnlimited(plan.quotas.maxTokensPerMonth)) {
    return { allowed: true, remaining: -1 };
  }

  const usedTokens = await getMonthlyTokenUsage(userId);
  const remaining = plan.quotas.maxTokensPerMonth - usedTokens;

  if (remaining <= 0 || (estimatedTokens > 0 && remaining < estimatedTokens)) {
    return {
      allowed: false,
      reason: `Quota de tokens épuisé : ${formatNumber(usedTokens)} / ${formatNumber(plan.quotas.maxTokensPerMonth)} tokens utilisés ce mois sur le plan ${plan.displayName}.`,
      current: usedTokens,
      limit: plan.quotas.maxTokensPerMonth,
      remaining: Math.max(0, remaining),
    };
  }

  return { allowed: true, current: usedTokens, limit: plan.quotas.maxTokensPerMonth, remaining };
}

/**
 * Check if user can upload a document
 */
export async function checkDocumentQuota(userId: string): Promise<QuotaCheckResult> {
  const { planName } = await getUserPlan(userId);
  const plan = getPlan(planName);

  if (isUnlimited(plan.quotas.maxDocuments)) {
    return { allowed: true, remaining: -1 };
  }

  const currentDocs = await db.document.count({
    where: { userId },
  });

  const remaining = plan.quotas.maxDocuments - currentDocs;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Limite atteinte : ${plan.quotas.maxDocuments} documents sur le plan ${plan.displayName}.`,
      current: currentDocs,
      limit: plan.quotas.maxDocuments,
      remaining: 0,
    };
  }

  return { allowed: true, current: currentDocs, limit: plan.quotas.maxDocuments, remaining };
}

/**
 * Check if a feature is allowed for the user's plan
 */
export async function checkFeatureAccess(userId: string, feature: keyof typeof import('./plans').PLANS.free.quotas): Promise<QuotaCheckResult> {
  const { planName } = await getUserPlan(userId);
  const plan = getPlan(planName);
  const allowed = plan.quotas[feature] as boolean;

  if (!allowed) {
    return {
      allowed: false,
      reason: `Cette fonctionnalité n'est pas disponible sur le plan ${plan.displayName}. Passez au plan supérieur pour y accéder.`,
    };
  }

  return { allowed: true };
}

/**
 * Record a usage event
 */
export async function recordUsage(params: {
  userId: string;
  eventType: string;
  tokensUsed?: number;
  provider?: string;
  agentId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.usageEvent.create({
      data: {
        userId: params.userId,
        eventType: params.eventType,
        tokensUsed: params.tokensUsed || 0,
        provider: params.provider || 'auto',
        agentId: params.agentId,
        metadata: JSON.stringify(params.metadata || {}),
      },
    });
  } catch (_e) {
    // Don't block the main flow if usage recording fails
    console.error('[Usage] Failed to record usage event:', _e);
  }
}

/**
 * Get comprehensive usage stats for a user
 */
export async function getUserUsageStats(userId: string) {
  const { planName, subscription } = await getUserPlan(userId);
  const plan = getPlan(planName);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [tokenUsage, agentCount, docCount, convCount] = await Promise.all([
    getMonthlyTokenUsage(userId),
    db.agent.count({ where: { OR: [{ isDefault: true }, { creatorId: userId }] } }),
    db.document.count({ where: { userId } }),
    db.conversation.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
  ]);

  return {
    planName,
    plan,
    subscription,
    usage: {
      tokens: { used: tokenUsage, limit: plan.quotas.maxTokensPerMonth },
      agents: { used: agentCount, limit: plan.quotas.maxAgents },
      documents: { used: docCount, limit: plan.quotas.maxDocuments },
      conversations: { used: convCount, limit: plan.quotas.maxConversations },
    },
  };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
