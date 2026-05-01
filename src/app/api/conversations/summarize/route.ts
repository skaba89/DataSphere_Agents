import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { summarizeConversation, batchSummarize } from '@/lib/summarize';
import { db } from '@/lib/db';

/**
 * POST /api/conversations/summarize
 * Summarize a specific conversation.
 * Body: { conversationId: string }
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID de conversation requis' },
        { status: 400 }
      );
    }

    // Verify the conversation belongs to the user
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation introuvable' },
        { status: 404 }
      );
    }

    if (conversation.userId !== payload.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const summary = await summarizeConversation(conversationId);

    if (!summary) {
      return NextResponse.json(
        { error: 'Impossible de générer le résumé. Vérifiez vos clés API.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarize conversation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du résumé' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations/summarize
 * Batch-summarize all user's conversations without summaries.
 * Returns the count of summaries generated.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const count = await batchSummarize(payload.userId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Batch summarize error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des résumés' },
      { status: 500 }
    );
  }
}
