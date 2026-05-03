// Prompt Auto-Optimization Engine
// Analyzes agent performance and suggests/automatically improves prompts

import { db } from './db';
import { getZAI } from './zai';

export interface OptimizationResult {
  improved: boolean;
  newPrompt?: string;
  changes: string[];
  confidenceScore: number;
}

// Analyze an agent's performance based on feedback
export async function analyzeAgentPerformance(agentId: string): Promise<{
  avgRating: number;
  totalRatings: number;
  commonComplaints: string[];
  suggestions: string[];
  performanceTrend: 'improving' | 'stable' | 'declining';
}> {
  // Get recent ratings for this agent
  const ratings = await db.agentRating.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Get recent learning events
  const learningEvents = await db.learningEvent.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const totalRatings = ratings.length;
  const avgRating = totalRatings > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
    : 0;

  // Extract common complaints from low ratings
  const commonComplaints: string[] = [];
  const lowRatings = ratings.filter(r => r.rating <= 2 && r.review);
  for (const r of lowRatings) {
    if (r.review) commonComplaints.push(r.review.slice(0, 200));
  }

  // Determine trend by comparing recent vs older ratings
  let performanceTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (totalRatings >= 4) {
    const half = Math.floor(totalRatings / 2);
    const recentRatings = ratings.slice(0, half);
    const olderRatings = ratings.slice(half);
    const recentAvg = recentRatings.reduce((s, r) => s + r.rating, 0) / recentRatings.length;
    const olderAvg = olderRatings.reduce((s, r) => s + r.rating, 0) / olderRatings.length;
    if (recentAvg > olderAvg + 0.3) performanceTrend = 'improving';
    else if (recentAvg < olderAvg - 0.3) performanceTrend = 'declining';
  }

  // Generate suggestions based on learning events and ratings
  const suggestions: string[] = [];

  const correctionEvents = learningEvents.filter(e => e.eventType === 'correction_applied');
  if (correctionEvents.length > 3) {
    suggestions.push('De nombreuses corrections ont été appliquées. Envisagez de clarifier les instructions pour réduire les malentendus.');
  }

  const preferenceEvents = learningEvents.filter(e => e.eventType === 'preference_learned');
  if (preferenceEvents.length > 2) {
    suggestions.push('Des préférences utilisateur ont été détectées. Intégrez-les dans le prompt système pour un meilleur confort.');
  }

  if (avgRating < 3.0 && totalRatings >= 3) {
    suggestions.push('La note moyenne est faible. Envisagez une révision complète du prompt système.');
  } else if (avgRating < 3.5 && totalRatings >= 3) {
    suggestions.push('La note moyenne pourrait être améliorée. Une optimisation du prompt est recommandée.');
  }

  if (commonComplaints.length > 0) {
    suggestions.push('Des avis négatifs récurrents indiquent des axes d\'amélioration dans la personnalisation des réponses.');
  }

  return {
    avgRating: Math.round(avgRating * 100) / 100,
    totalRatings,
    commonComplaints,
    suggestions,
    performanceTrend,
  };
}

// Auto-optimize a prompt based on feedback patterns
export async function autoOptimizePrompt(agentId: string, currentPrompt: string): Promise<OptimizationResult> {
  const performance = await analyzeAgentPerformance(agentId);

  // Only optimize if performance is below threshold
  if (performance.avgRating >= 3.5 && performance.totalRatings >= 3) {
    return {
      improved: false,
      changes: ['Les performances sont satisfaisantes. Aucune optimisation nécessaire.'],
      confidenceScore: 0.9,
    };
  }

  // Get learning events for context
  const learningEvents = await db.learningEvent.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Get memories (preferences and corrections)
  const memories = await db.agentMemory.findMany({
    where: {
      agentId,
      category: { in: ['preference', 'correction'] },
    },
    orderBy: { confidence: 'desc' },
    take: 10,
  });

  const changes: string[] = [];

  // Build optimization context
  const memoryContext = memories.map(m => `- ${m.category}: ${m.key} = ${m.content}`).join('\n');
  const eventsContext = learningEvents.slice(0, 10).map(e => `- ${e.eventType}: ${e.data}`).join('\n');
  const complaintsContext = performance.commonComplaints.slice(0, 5).join('\n');

  // Use AI to optimize the prompt
  let newPrompt = currentPrompt;

  try {
    const zai = await getZAI();
    const optimizationPrompt = `Tu es un expert en optimisation de prompts IA. Analyse le prompt système actuel et améliore-le en tenant compte des retours utilisateurs.

PROMPT ACTUEL:
${currentPrompt}

RETOURS UTILISATEURS:
- Note moyenne: ${performance.avgRating}/5
- Tendance: ${performance.performanceTrend}
- Plaintes courantes: ${complaintsContext || 'Aucune'}

MÉMOIRES APPRISES:
${memoryContext || 'Aucune'}

ÉVÉNEMENTS D'APPRENTISSAGE:
${eventsContext || 'Aucun'}

INSTRUCTIONS:
1. Améliore le prompt pour adresser les problèmes identifiés
2. Intègre les préférences utilisateur détectées
3. Clarifie les instructions ambiguës
4. Garde le même style et ton général
5. Ajoute des directives spécifiques pour éviter les erreurs récurrentes
6. Réponds UNIQUEMENT avec le nouveau prompt optimisé, sans explications

Nouveau prompt optimisé:`;

    const result = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Tu es un expert en optimisation de prompts. Réponds uniquement avec le prompt optimisé, sans commentaires.' },
        { role: 'user', content: optimizationPrompt },
      ],
    });

    const optimizedText = result.choices?.[0]?.message?.content || result.text || result.content || '';
    if (optimizedText && optimizedText.trim().length > 50) {
      newPrompt = optimizedText.trim();
      changes.push('Prompt optimisé par IA basé sur les retours utilisateurs');
      changes.push(`Note moyenne: ${performance.avgRating}/5 → objectif: ≥3.5`);
      if (performance.commonComplaints.length > 0) {
        changes.push('Ajustements pour les plaintes récurrentes');
      }
      if (memories.length > 0) {
        changes.push('Préférences utilisateur intégrées');
      }
    }
  } catch (error) {
    console.error('AI optimization failed, using heuristic improvements:', error);

    // Fallback: heuristic improvements
    const improvements: string[] = [];

    if (performance.commonComplaints.some(c => c.toLowerCase().includes('long') || c.toLowerCase().includes('verbose'))) {
      improvements.push('\n\nINSTRUCTION: Sois concis dans tes réponses. Va droit au but.');
      changes.push('Ajout: directive de concision');
    }

    if (performance.commonComplaints.some(c => c.toLowerCase().includes('vague') || c.toLowerCase().includes('imprécis'))) {
      improvements.push('\n\nINSTRUCTION: Sois précis et spécifique. Donne des exemples concrets et des chiffres quand possible.');
      changes.push('Ajout: directive de précision');
    }

    if (memories.some(m => m.key === 'format_prefere' && m.content.includes('concis'))) {
      improvements.push('\n\nINSTRUCTION: L\'utilisateur préfère les réponses courtes. Résume tes points essentiels.');
      changes.push('Ajout: préférence concision détectée');
    }

    if (improvements.length > 0) {
      newPrompt = currentPrompt + improvements.join('');
    }
  }

  if (newPrompt === currentPrompt) {
    return {
      improved: false,
      changes: changes.length > 0 ? changes : ['Aucune amélioration identifiée'],
      confidenceScore: 0.3,
    };
  }

  // Create a new prompt version
  const versionResult = await createPromptVariant(agentId, newPrompt);
  changes.push(`Nouvelle version: v${versionResult}`);

  return {
    improved: true,
    newPrompt,
    changes,
    confidenceScore: Math.min(0.85, 0.5 + (performance.totalRatings / 20)),
  };
}

// A/B test a prompt variant - creates a new version, sets it active
export async function createPromptVariant(agentId: string, newPrompt: string): Promise<string> {
  // Get the latest version number
  const latestVersion = await db.promptVersion.findFirst({
    where: { agentId },
    orderBy: { version: 'desc' },
  });

  const newVersion = (latestVersion?.version || 0) + 1;

  // Deactivate previous versions
  await db.promptVersion.updateMany({
    where: { agentId, isActive: true },
    data: { isActive: false },
  });

  // Create new version
  await db.promptVersion.create({
    data: {
      agentId,
      version: newVersion,
      systemPrompt: newPrompt,
      isActive: true,
    },
  });

  // Update the agent's system prompt
  await db.agent.update({
    where: { id: agentId },
    data: { systemPrompt: newPrompt },
  });

  return newVersion.toString();
}

// Rollback to previous prompt version
export async function rollbackPrompt(agentId: string, version: number): Promise<void> {
  const targetVersion = await db.promptVersion.findUnique({
    where: { agentId_version: { agentId, version } },
  });

  if (!targetVersion) {
    throw new Error(`Version ${version} non trouvée pour l'agent ${agentId}`);
  }

  // Deactivate all current versions
  await db.promptVersion.updateMany({
    where: { agentId, isActive: true },
    data: { isActive: false },
  });

  // Activate the target version
  await db.promptVersion.update({
    where: { id: targetVersion.id },
    data: { isActive: true },
  });

  // Update the agent's system prompt
  await db.agent.update({
    where: { id: agentId },
    data: { systemPrompt: targetVersion.systemPrompt },
  });
}

// Get prompt version history
export async function getPromptHistory(agentId: string) {
  return db.promptVersion.findMany({
    where: { agentId },
    orderBy: { version: 'desc' },
  });
}
