// Agent Memory System - Stores and retrieves contextual knowledge
// Each agent builds a knowledge base per user over time

import { db } from './db';

export interface MemoryEntry {
  id: string;
  category: string;
  key: string;
  content: string;
  confidence: number;
  source: string;
}

// Store a new memory or update existing
export async function storeMemory(params: {
  agentId: string;
  userId: string;
  category: string; // fact, preference, pattern, correction, context
  key: string;
  content: string;
  confidence?: number;
  source?: string;
}): Promise<void> {
  const { agentId, userId, category, key, content, confidence = 1.0, source = 'interaction' } = params;

  await db.agentMemory.upsert({
    where: {
      agentId_userId_key: { agentId, userId, key },
    },
    update: {
      content,
      confidence: Math.min(1.0, confidence),
      source,
      category,
      updatedAt: new Date(),
    },
    create: {
      agentId,
      userId,
      category,
      key,
      content,
      confidence: Math.min(1.0, confidence),
      source,
    },
  });
}

// Retrieve relevant memories for a conversation
export async function getRelevantMemories(params: {
  agentId: string;
  userId: string;
  query: string; // The current message
  limit?: number; // Max memories to return, default 10
}): Promise<MemoryEntry[]> {
  const { agentId, userId, query, limit = 10 } = params;

  // Get all active memories for this agent+user
  const memories = await db.agentMemory.findMany({
    where: {
      agentId,
      userId,
      confidence: { gte: 0.3 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: [
      { confidence: 'desc' },
      { accessCount: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: limit * 3, // Get more than needed for filtering
  });

  // Simple keyword-based relevance scoring
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = memories.map(memory => {
    const contentLower = memory.content.toLowerCase();
    const keyLower = memory.key.toLowerCase();
    let score = memory.confidence;

    // Boost for key match
    if (queryLower.includes(keyLower) || keyLower.includes(queryLower)) {
      score += 0.5;
    }

    // Boost for word overlap
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 0.1;
      }
      if (keyLower.includes(word)) {
        score += 0.15;
      }
    }

    // Category-based relevance
    if (memory.category === 'preference') score += 0.1;
    if (memory.category === 'correction') score += 0.15;
    if (memory.category === 'fact') score += 0.05;

    return { memory, score };
  });

  // Sort by score and take top N
  scored.sort((a, b) => b.score - a.score);
  const topMemories = scored.slice(0, limit);

  // Update access count for retrieved memories (async, non-blocking)
  Promise.all(
    topMemories.map(({ memory }) =>
      db.agentMemory.update({
        where: { id: memory.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessed: new Date(),
        },
      })
    )
  ).catch(() => { /* non-critical */ });

  return topMemories.map(({ memory }) => ({
    id: memory.id,
    category: memory.category,
    key: memory.key,
    content: memory.content,
    confidence: memory.confidence,
    source: memory.source,
  }));
}

// Build memory context string to inject into system prompt
export async function buildMemoryContext(agentId: string, userId: string, query: string): Promise<string> {
  const memories = await getRelevantMemories({ agentId, userId, query });

  if (memories.length === 0) return '';

  const categories: Record<string, string[]> = {
    preference: [],
    fact: [],
    pattern: [],
    correction: [],
    context: [],
  };

  for (const memory of memories) {
    const cat = categories[memory.category];
    if (cat) {
      cat.push(`- ${memory.key}: ${memory.content}${memory.confidence < 0.7 ? ' (incertain)' : ''}`);
    }
  }

  const parts: string[] = ['═══ MÉMOIRE DE L\'AGENT ═══'];

  if (categories.preference.length > 0) {
    parts.push(`Préférences utilisateur:\n${categories.preference.join('\n')}`);
  }
  if (categories.fact.length > 0) {
    parts.push(`Faits connus:\n${categories.fact.join('\n')}`);
  }
  if (categories.pattern.length > 0) {
    parts.push(`Patterns détectés:\n${categories.pattern.join('\n')}`);
  }
  if (categories.correction.length > 0) {
    parts.push(`Corrections appliquées:\n${categories.correction.join('\n')}`);
  }
  if (categories.context.length > 0) {
    parts.push(`Contexte:\n${categories.context.join('\n')}`);
  }

  parts.push('═══ FIN MÉMOIRE ═══');
  parts.push('IMPORTANT: Utilise ces informations pour personnaliser tes réponses. Ne mentionne pas explicitement que tu as ces mémoires, intègre-les naturellement.');

  return parts.join('\n\n');
}

// Learn from a conversation interaction using heuristics
export async function learnFromInteraction(params: {
  agentId: string;
  userId: string;
  userMessage: string;
  assistantResponse: string;
  userFeedback?: number; // 1-5 rating if provided
}): Promise<void> {
  const { agentId, userId, userMessage, assistantResponse, userFeedback } = params;
  const msgLower = userMessage.toLowerCase();

  const learningPromises: Promise<void>[] = [];

  // 1. Detect preferences (language, tone, format)
  const preferencePatterns: Array<{ pattern: RegExp; key: string; content: string; confidence: number }> = [
    { pattern: /(?:je préfère|j'aime mieux|j'aimerais|je veux|donne-moi|utilise).*(?:en anglais|in english|en français|in french)/i, key: 'langue_preferee', content: msgLower.includes('anglais') || msgLower.includes('english') ? 'Anglais' : 'Français', confidence: 0.8 },
    { pattern: /(?:je préfère|j'aime|donne-moi).*(?:réponses? courtes?|concis|bref|résumé)/i, key: 'format_prefere', content: 'Réponses courtes et concises', confidence: 0.7 },
    { pattern: /(?:je préfère|j'aime|donne-moi).*(?:réponses? détaillées?|détails|explications? complètes?)/i, key: 'format_prefere', content: 'Réponses détaillées et complètes', confidence: 0.7 },
    { pattern: /(?:je préfère|j'aime|donne-moi).*(?:tableau|table|format tabulaire)/i, key: 'format_donnees', content: 'Préfère les données en tableaux', confidence: 0.75 },
    { pattern: /(?:je préfère|j'aime|donne-moi).*(?:liste|bullet points|puces)/i, key: 'format_donnees', content: 'Préfère les listes à puces', confidence: 0.75 },
    { pattern: /(?:parle|réponds?|écris).*(?:formel|professionnel|sérieux)/i, key: 'ton_prefere', content: 'Ton formel et professionnel', confidence: 0.75 },
    { pattern: /(?:parle|réponds?|écris).*(?:décontracté|informel|casual|ami)/i, key: 'ton_prefere', content: 'Ton décontracté et amical', confidence: 0.75 },
  ];

  for (const { pattern, key, content, confidence } of preferencePatterns) {
    if (pattern.test(userMessage)) {
      learningPromises.push(
        storeMemory({ agentId, userId, category: 'preference', key, content, confidence, source: 'interaction' })
      );
      learningPromises.push(
        db.learningEvent.create({
          data: {
            userId,
            agentId,
            eventType: 'preference_learned',
            data: JSON.stringify({ key, content, from: userMessage.slice(0, 200) }),
            impact: 0.5,
          },
        }).then(() => {})
      );
    }
  }

  // 2. Detect facts (user mentions name, company, role, etc.)
  const factPatterns: Array<{ pattern: RegExp; key: string; extractContent: (match: RegExpMatchArray) => string }> = [
    { pattern: /je m'appelle\s+(\w+)/i, key: 'prenom', extractContent: (m) => m[1] },
    { pattern: /mon nom (?:est|c'est)\s+(\w+(?:\s+\w+)?)/i, key: 'nom', extractContent: (m) => m[1] },
    { pattern: /je suis\s+(?:un(e)?\s+)?(?:développeur|ingénieur|directeur|manager|chef|consultant|analyste|designer|freelance|étudiant|professeur)/i, key: 'role', extractContent: (m) => m[0].replace(/^je suis\s+(un(e)?\s+)?/i, '') },
    { pattern: /je travaille (?:chez|pour|à|en chez)\s+(\w+(?:\s+\w+)*)/i, key: 'entreprise', extractContent: (m) => m[1] },
    { pattern: /mon entreprise (?:est|c'est|s'appelle)\s+(\w+(?:\s+\w+)*)/i, key: 'entreprise', extractContent: (m) => m[1] },
    { pattern: /ma société (?:est|c'est|s'appelle)\s+(\w+(?:\s+\w+)*)/i, key: 'entreprise', extractContent: (m) => m[1] },
    { pattern: /je suis (?:basé|basée)\s+(?:à|en)\s+(\w+(?:\s+\w+)*)/i, key: 'localisation', extractContent: (m) => m[1] },
    { pattern: /j'habite\s+(?:à|en)\s+(\w+(?:\s+\w+)*)/i, key: 'localisation', extractContent: (m) => m[1] },
    { pattern: /mon (?:domaine|secteur|industrie) (?:est|c'est)\s+(\w+(?:\s+\w+)*)/i, key: 'secteur', extractContent: (m) => m[1] },
  ];

  for (const { pattern, key, extractContent } of factPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const content = extractContent(match);
      learningPromises.push(
        storeMemory({ agentId, userId, category: 'fact', key, content, confidence: 0.85, source: 'interaction' })
      );
    }
  }

  // 3. Detect corrections (when user says "no, I meant..." or "actually...")
  const correctionPatterns: Array<{ pattern: RegExp; extractInfo: (match: RegExpMatchArray) => { key: string; content: string } }> = [
    {
      pattern: /non\s*,?\s*(?:je voulais dire|je pensais à|je parle de|je veux dire)\s+(.+)/i,
      extractInfo: (m) => ({ key: 'correction_derniere', content: m[1].slice(0, 200) }),
    },
    {
      pattern: /en fait\s*,?\s*(.+)/i,
      extractInfo: (m) => ({ key: 'correction_en_fait', content: m[1].slice(0, 200) }),
    },
    {
      pattern: /(?:c'est pas ça|c'est incorrect|tu te trompes?|erreur|faux)\s*[,.]?\s*(.+)/i,
      extractInfo: (m) => ({ key: 'correction_erreur', content: m[1].slice(0, 200) }),
    },
  ];

  for (const { pattern, extractInfo } of correctionPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const { key, content } = extractInfo(match);
      learningPromises.push(
        storeMemory({ agentId, userId, category: 'correction', key, content, confidence: 0.9, source: 'interaction' })
      );
      learningPromises.push(
        db.learningEvent.create({
          data: {
            userId,
            agentId,
            eventType: 'correction_applied',
            data: JSON.stringify({ key, content, from: userMessage.slice(0, 200) }),
            impact: -0.3,
          },
        }).then(() => {})
      );
    }
  }

  // 4. Detect patterns (user always asks for tables, prefers short answers)
  // Check for recurring topics
  const topicKeywords: Record<string, string> = {
    'tableau': 'prefere_tableaux',
    'graphique': 'prefere_graphiques',
    'code': 'demande_code',
    'script': 'demande_scripts',
    'email': 'demande_emails',
    'rapport': 'demande_rapports',
    'python': 'utilise_python',
    'javascript': 'utilise_javascript',
    'sql': 'utilise_sql',
  };

  for (const [keyword, key] of Object.entries(topicKeywords)) {
    if (msgLower.includes(keyword)) {
      // Check if this pattern already exists
      const existing = await db.agentMemory.findUnique({
        where: { agentId_userId_key: { agentId, userId, key } },
      });
      if (existing) {
        // Increase confidence slightly
        learningPromises.push(
          db.agentMemory.update({
            where: { id: existing.id },
            data: {
              confidence: Math.min(1.0, existing.confidence + 0.05),
              accessCount: { increment: 1 },
            },
          }).then(() => {})
        );
      } else {
        learningPromises.push(
          storeMemory({
            agentId,
            userId,
            category: 'pattern',
            key,
            content: `Demande récurrente liée à "${keyword}"`,
            confidence: 0.5,
            source: 'learned',
          })
        );
      }
    }
  }

  // 5. Record feedback as a learning event
  if (userFeedback !== undefined) {
    learningPromises.push(
      db.learningEvent.create({
        data: {
          userId,
          agentId,
          eventType: 'feedback_received',
          data: JSON.stringify({ rating: userFeedback, message: userMessage.slice(0, 200) }),
          impact: (userFeedback - 3) / 2, // Normalize: 1=-1, 3=0, 5=1
        },
      }).then(() => {})
    );
  }

  // Execute all learning operations
  await Promise.all(learningPromises);
}

// Decay old memories (reduce confidence over time)
export async function decayMemories(agentId: string, userId: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Decay memories not accessed in 30 days
  const staleMemories = await db.agentMemory.findMany({
    where: {
      agentId,
      userId,
      lastAccessed: { lt: thirtyDaysAgo },
      confidence: { gt: 0.1 },
    },
  });

  const decayPromises = staleMemories.map(memory =>
    db.agentMemory.update({
      where: { id: memory.id },
      data: {
        confidence: Math.max(0.1, memory.confidence * 0.9), // 10% decay
      },
    })
  );

  // Delete expired memories
  await db.agentMemory.deleteMany({
    where: {
      agentId,
      userId,
      expiresAt: { lt: new Date() },
    },
  });

  await Promise.all(decayPromises);
}

// Get memory stats for an agent
export async function getMemoryStats(agentId: string, userId: string): Promise<{
  totalMemories: number;
  byCategory: Record<string, number>;
  avgConfidence: number;
  lastUpdated: Date | null;
}> {
  const memories = await db.agentMemory.findMany({
    where: { agentId, userId },
  });

  const byCategory: Record<string, number> = {};
  let totalConfidence = 0;

  for (const memory of memories) {
    byCategory[memory.category] = (byCategory[memory.category] || 0) + 1;
    totalConfidence += memory.confidence;
  }

  const lastUpdated = memories.length > 0
    ? memories.reduce((latest, m) => (m.updatedAt > latest ? m.updatedAt : latest), memories[0].updatedAt)
    : null;

  return {
    totalMemories: memories.length,
    byCategory,
    avgConfidence: memories.length > 0 ? totalConfidence / memories.length : 0,
    lastUpdated,
  };
}
