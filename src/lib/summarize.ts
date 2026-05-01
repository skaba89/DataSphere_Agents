import { resolveProvider, chatCompletion } from '@/lib/ai-providers';
import { db } from '@/lib/db';

/**
 * Summarize a conversation by its messages.
 * Fetches the last 20 messages, builds a prompt, and uses the user's
 * configured AI provider (or Z-AI fallback) to generate a summary.
 * The summary is persisted in the conversation's `summary` field.
 */
export async function summarizeConversation(
  conversationId: string
): Promise<string | null> {
  // 1. Fetch the conversation with its last 20 messages
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 20,
      },
    },
  });

  if (!conversation) return null;

  // Skip if already summarized
  if (conversation.summary) return conversation.summary;

  // Need at least a few messages to summarize
  if (conversation.messages.length < 2) return null;

  // 2. Build the messages text for the prompt
  const messagesText = conversation.messages
    .map((m) => `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const summarizePrompt = `Résume cette conversation en 2-3 phrases concises en français. Capture les points clés, décisions et actions.

Conversation:
${messagesText}`;

  let summary: string | null = null;

  // 3. Try the user's configured provider first
  try {
    const providerInfo = await resolveProvider(conversation.userId);
    if (providerInfo) {
      const result = await chatCompletion({
        provider: providerInfo.provider,
        apiKey: providerInfo.apiKey,
        model: providerInfo.model,
        messages: [
          {
            role: 'system',
            content:
              'Tu es un assistant qui résume des conversations. Tu produces des résumés concis et précis en français.',
          },
          { role: 'user', content: summarizePrompt },
        ],
        temperature: 0.3,
        maxTokens: 256,
      });
      summary = result.content?.trim() || null;
    }
  } catch (err) {
    console.error('Summarize with provider failed:', err);
  }

  // 4. Fallback to Z-AI SDK
  if (!summary) {
    try {
      const { getZAI } = await import('@/lib/zai');
      const zai = await getZAI();
      const result = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Tu es un assistant qui résume des conversations. Tu produces des résumés concis et précis en français.',
          },
          { role: 'user', content: summarizePrompt },
        ],
      });
      summary =
        result.choices?.[0]?.message?.content ||
        result.text ||
        result.content ||
        '';
      if (typeof summary === 'string') {
        summary = summary.trim();
      } else {
        summary = null;
      }
    } catch (err) {
      console.error('Summarize with Z-AI failed:', err);
    }
  }

  // 5. Update the conversation's summary field in the database
  if (summary) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { summary },
    });
  }

  return summary;
}

/**
 * Batch-summarize all conversations for a user that don't have summaries yet.
 * Returns the count of summaries generated.
 */
export async function batchSummarize(userId: string): Promise<number> {
  const conversations = await db.conversation.findMany({
    where: {
      userId,
      summary: null,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1, // Just check there are messages
      },
    },
  });

  // Only summarize conversations that have at least a few messages
  const toSummarize = conversations.filter((c) => c.messages.length > 0);

  let count = 0;
  for (const conv of toSummarize) {
    try {
      const result = await summarizeConversation(conv.id);
      if (result) count++;
    } catch (err) {
      console.error(`Batch summarize failed for conversation ${conv.id}:`, err);
    }
  }

  return count;
}
