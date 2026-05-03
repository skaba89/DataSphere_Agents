// ============================================
// PROSPECTION ENGINE - Lead Scoring, Churn Risk, Market Intelligence
// ============================================

import { db } from './db';
import { getZAI } from './zai';

// ─── Types ──────────────────────────────────────────────────────

interface LeadScoreInput {
  industry?: string | null;
  size?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  activities?: { type: string }[];
  lastContactAt?: Date | null;
}

interface ChurnRiskResult {
  totalCustomers: number;
  atRisk: number;
  metrics: {
    dormantUsers: number;
    decliningEngagement: number;
    supportTicketSpike: number;
  };
}

// ─── Lead Scoring Algorithm ─────────────────────────────────────

const TECH_INDUSTRIES = [
  'technology', 'tech', 'saaS', 'ai', 'artificial intelligence',
  'machine learning', 'data', 'software', 'it', 'cloud', 'fintech',
  'cybersecurity', 'iot', 'blockchain', 'digital', 'web3',
  'informatique', 'intelligence artificielle', 'logiciel',
];

const SIZE_SCORES: Record<string, number> = {
  enterprise: 25,
  large: 20,
  medium: 15,
  small: 10,
  startup: 5,
};

export function calculateLeadScore(prospect: LeadScoreInput): number {
  let score = 0;

  // Contact info completeness (+15 each for email, phone)
  if (prospect.email) score += 15;
  if (prospect.phone) score += 15;

  // Company size scoring
  if (prospect.size && SIZE_SCORES[prospect.size]) {
    score += SIZE_SCORES[prospect.size];
  }

  // Industry match with AI/tech (+20)
  if (prospect.industry) {
    const industryLower = prospect.industry.toLowerCase();
    if (TECH_INDUSTRIES.some((t) => industryLower.includes(t))) {
      score += 20;
    }
  }

  // Recent contact (+10 if last 7 days)
  if (prospect.lastContactAt) {
    const daysSinceContact = (Date.now() - new Date(prospect.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact <= 7) {
      score += 10;
    } else if (daysSinceContact <= 30) {
      score += 5;
    }
  }

  // Activity count (+2 per activity, max +20)
  if (prospect.activities && prospect.activities.length > 0) {
    score += Math.min(prospect.activities.length * 2, 20);
  }

  // Has website (+10)
  if (prospect.website) score += 10;

  // Notes completeness (+5)
  if (prospect.notes && prospect.notes.length > 20) score += 5;

  // Cap at 100
  return Math.min(Math.round(score), 100);
}

// ─── Churn Risk Calculator ──────────────────────────────────────

export async function calculateChurnRisk(userId: string): Promise<ChurnRiskResult> {
  const customers = await db.customerHealth.findMany({
    where: { userId },
  });

  let dormantUsers = 0;
  let decliningEngagement = 0;
  let supportTicketSpike = 0;

  for (const customer of customers) {
    const metrics = customer.metrics ? JSON.parse(customer.metrics) : {};

    // Dormant: no activity in 30+ days
    if (customer.lastActivityAt) {
      const daysSince = (Date.now() - new Date(customer.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 30) dormantUsers++;
    } else {
      dormantUsers++;
    }

    // Declining engagement
    if (metrics.engagementTrend === 'declining') decliningEngagement++;

    // Support ticket spike
    if (metrics.supportTicketsLast30d > 5) supportTicketSpike++;
  }

  const atRisk = customers.filter(
    (c) => c.churnRisk === 'high' || c.churnRisk === 'critical'
  ).length;

  return {
    totalCustomers: customers.length,
    atRisk,
    metrics: {
      dormantUsers,
      decliningEngagement,
      supportTicketSpike,
    },
  };
}

// ─── Market Opportunity Scanner ─────────────────────────────────

export async function scanMarketOpportunities(
  userId: string,
  industry: string
): Promise<Array<{
  id: string;
  type: string;
  title: string;
  summary: string;
  data: string | null;
  source: string;
  relevance: number;
  isRead: boolean;
  createdAt: Date;
}>> {
  try {
    const zai = await getZAI();

    // Use web search to find market trends
    const searchResult = await zai.webSearch(
      `${industry} market trends 2025 opportunities growth AI technology`
    );

    const insights: Array<{
      id: string;
      type: string;
      title: string;
      summary: string;
      data: string | null;
      source: string;
      relevance: number;
      isRead: boolean;
      createdAt: Date;
    }> = [];

    // Create trend insight from search
    if (searchResult && searchResult.results && searchResult.results.length > 0) {
      const topResults = searchResult.results.slice(0, 3);
      for (const result of topResults) {
        const insight = await db.marketInsight.create({
          data: {
            userId,
            type: 'trend',
            title: `Tendance ${industry}: ${result.title || 'Nouvelle opportunité détectée'}`,
            summary: result.snippet || result.content?.slice(0, 300) || 'Analyse de marché en cours...',
            data: JSON.stringify({
              url: result.url,
              source: 'web_search',
              industry,
              searchQuery: `${industry} market trends 2025`,
            }),
            source: 'web_search',
            relevance: 0.7 + Math.random() * 0.3,
            isRead: false,
          },
        });
        insights.push(insight);
      }
    }

    // Also create an AI-analyzed opportunity insight
    try {
      const aiResponse = await zai.chat({
        messages: [
          {
            role: 'system',
            content:
              'Tu es un analyste de marché expert. Réponds en français. Génère des insights concis sur les opportunités de marché.',
          },
          {
            role: 'user',
            content: `Analyse brièvement les opportunités de marché dans le secteur "${industry}" en 2025. Donne 3 points clés concis.`,
          },
        ],
      });

      if (aiResponse?.content) {
        const aiInsight = await db.marketInsight.create({
          data: {
            userId,
            type: 'opportunity',
            title: `Opportunités IA - ${industry}`,
            summary: aiResponse.content.slice(0, 500),
            data: JSON.stringify({
              industry,
              analysisType: 'ai_generated',
            }),
            source: 'ai_analysis',
            relevance: 0.85,
            isRead: false,
          },
        });
        insights.push(aiInsight);
      }
    } catch (_e) {
      // AI analysis might fail, continue with search results
    }

    return insights;
  } catch (_e) {
    // If web search fails, create a generic insight
    const insight = await db.marketInsight.create({
      data: {
        userId,
        type: 'opportunity',
        title: `Scan marché - ${industry}`,
        summary: `Analyse du secteur ${industry} en cours. Les données seront enrichies progressivement.`,
        data: JSON.stringify({ industry, status: 'pending' }),
        source: 'ai_analysis',
        relevance: 0.5,
        isRead: false,
      },
    });

    return [insight];
  }
}

// ─── Customer Health Score Calculator ───────────────────────────

export async function calculateCustomerHealth(userId: string) {
  // Get all users (excluding current) to simulate customer health
  const allUsers = await db.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
    },
    include: {
      usageEvents: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      conversations: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    },
  });

  const results = [];

  for (const customer of allUsers.slice(0, 20)) {
    // Calculate health metrics
    const loginFrequency = customer.lastLoginAt
      ? Math.max(1, Math.floor(30 / Math.max(1, (Date.now() - new Date(customer.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))))
      : 0;

    const featureUsage = new Set(customer.usageEvents.map((e) => e.eventType)).size;
    const totalUsage = customer.usageEvents.length;
    const conversationCount = customer.conversations.length;

    // Health score calculation
    let healthScore = 30; // Base score

    // Login frequency (0-25 points)
    if (loginFrequency >= 5) healthScore += 25;
    else if (loginFrequency >= 2) healthScore += 15;
    else if (loginFrequency >= 1) healthScore += 8;

    // Feature usage diversity (0-20 points)
    healthScore += Math.min(featureUsage * 5, 20);

    // Total usage activity (0-15 points)
    if (totalUsage > 50) healthScore += 15;
    else if (totalUsage > 20) healthScore += 10;
    else if (totalUsage > 5) healthScore += 5;

    // Conversation engagement (0-10 points)
    if (conversationCount > 10) healthScore += 10;
    else if (conversationCount > 3) healthScore += 5;

    healthScore = Math.min(healthScore, 100);

    // Churn risk
    let churnRisk: string;
    if (healthScore < 30) churnRisk = 'critical';
    else if (healthScore < 50) churnRisk = 'high';
    else if (healthScore < 70) churnRisk = 'medium';
    else churnRisk = 'low';

    // Engagement level
    let engagementLevel: string;
    if (totalUsage === 0) engagementLevel = 'dormant';
    else if (totalUsage < 10) engagementLevel = 'low';
    else if (totalUsage < 30) engagementLevel = 'moderate';
    else if (totalUsage < 80) engagementLevel = 'high';
    else engagementLevel = 'power';

    // AI Recommendations
    const recommendations: string[] = [];
    if (churnRisk === 'critical' || churnRisk === 'high') {
      recommendations.push('Planifier un appel de réengagement urgent');
      recommendations.push('Proposer une offre personnalisée');
    }
    if (engagementLevel === 'dormant') {
      recommendations.push('Envoyer un email de réactivation');
      recommendations.push('Partager les nouvelles fonctionnalités');
    }
    if (featureUsage <= 2) {
      recommendations.push('Organiser une démo des fonctionnalités avancées');
    }
    if (healthScore > 80) {
      recommendations.push('Candidat potentiel pour le programme ambassadeur');
      recommendations.push('Proposer une montée en gamme');
    }

    // Upsert the customer health record
    const result = await db.customerHealth.upsert({
      where: {
        userId_customerEmail: {
          userId,
          customerEmail: customer.email,
        },
      },
      create: {
        userId,
        customerEmail: customer.email,
        healthScore,
        churnRisk,
        engagementLevel,
        lastActivityAt: customer.lastLoginAt,
        metrics: JSON.stringify({
          loginFrequency,
          featureUsageDiversity: featureUsage,
          totalUsageEvents: totalUsage,
          conversationCount,
          supportTicketsLast30d: 0,
          engagementTrend: loginFrequency > 3 ? 'growing' : loginFrequency > 1 ? 'stable' : 'declining',
        }),
        recommendations: JSON.stringify(recommendations),
      },
      update: {
        healthScore,
        churnRisk,
        engagementLevel,
        lastActivityAt: customer.lastLoginAt,
        metrics: JSON.stringify({
          loginFrequency,
          featureUsageDiversity: featureUsage,
          totalUsageEvents: totalUsage,
          conversationCount,
          supportTicketsLast30d: 0,
          engagementTrend: loginFrequency > 3 ? 'growing' : loginFrequency > 1 ? 'stable' : 'declining',
        }),
        recommendations: JSON.stringify(recommendations),
      },
    });

    results.push(result);
  }

  return results;
}

// ─── Pipeline Analytics ─────────────────────────────────────────

export async function getPipelineAnalytics(userId: string) {
  const prospects = await db.prospect.findMany({
    where: { userId },
    include: { activities: true },
  });

  // Status distribution (funnel)
  const statusOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const funnel = statusOrder.map((status) => ({
    status,
    count: prospects.filter((p) => p.status === status).length,
  }));

  // Score distribution
  const scoreBuckets = [
    { range: '0-20', min: 0, max: 20 },
    { range: '21-40', min: 21, max: 40 },
    { range: '41-60', min: 41, max: 60 },
    { range: '61-80', min: 61, max: 80 },
    { range: '81-100', min: 81, max: 100 },
  ];

  const scoreDistribution = scoreBuckets.map((bucket) => ({
    range: bucket.range,
    count: prospects.filter((p) => p.score >= bucket.min && p.score <= bucket.max).length,
  }));

  // Win/Loss ratio
  const won = prospects.filter((p) => p.status === 'won').length;
  const lost = prospects.filter((p) => p.status === 'lost').length;

  // Average deal timeline (days between first activity and won)
  const wonProspects = prospects.filter((p) => p.status === 'won' && p.activities.length > 0);
  let avgDealDays = 0;
  if (wonProspects.length > 0) {
    const totalDays = wonProspects.reduce((sum, p) => {
      const firstActivity = new Date(p.createdAt);
      const lastActivity = new Date(p.updatedAt);
      return sum + (lastActivity.getTime() - firstActivity.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    avgDealDays = Math.round(totalDays / wonProspects.length);
  }

  // Revenue forecast (estimated based on pipeline)
  const revenueForecast = {
    pipeline: prospects.filter((p) => !['won', 'lost'].includes(p.status)).length * 5000,
    weighted: prospects
      .filter((p) => !['won', 'lost'].includes(p.status))
      .reduce((sum, p) => sum + (p.score / 100) * 5000, 0),
    won: won * 5000,
  };

  return {
    funnel,
    scoreDistribution,
    winLossRatio: { won, lost },
    avgDealDays,
    revenueForecast,
    totalProspects: prospects.length,
    avgScore: prospects.length > 0
      ? Math.round(prospects.reduce((s, p) => s + p.score, 0) / prospects.length)
      : 0,
  };
}
