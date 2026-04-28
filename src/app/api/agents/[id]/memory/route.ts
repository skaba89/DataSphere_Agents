import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getRelevantMemories, storeMemory, getMemoryStats, decayMemories } from '@/lib/agent-memory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Get agent memory stats + list memories
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { id: agentId } = await params;

    const url = new URL(req.url);
    const query = url.searchParams.get('query') || '';
    const category = url.searchParams.get('category') || '';
    const search = url.searchParams.get('search') || '';

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return Response.json({ error: 'Agent non trouvé' }, { status: 404 });
    }

    // Get stats
    const stats = await getMemoryStats(agentId, payload.userId);

    // Get memories
    let memories;
    if (query) {
      // Get relevant memories based on query
      memories = await getRelevantMemories({ agentId, userId: payload.userId, query });
    } else {
      // Get all memories with optional filters
      const where: Record<string, unknown> = {
        agentId,
        userId: payload.userId,
      };

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { key: { contains: search } },
          { content: { contains: search } },
        ];
      }

      memories = await db.agentMemory.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    }

    // Run memory decay (non-blocking)
    decayMemories(agentId, payload.userId).catch(() => { /* non-critical */ });

    return Response.json({ stats, memories });
  } catch (_e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Store a new memory manually
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { id: agentId } = await params;
    const body = await req.json();
    const { category, key, content, confidence, source } = body;

    if (!category || !key || !content) {
      return Response.json({ error: 'Catégorie, clé et contenu requis' }, { status: 400 });
    }

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return Response.json({ error: 'Agent non trouvé' }, { status: 404 });
    }

    await storeMemory({
      agentId,
      userId: payload.userId,
      category,
      key,
      content,
      confidence,
      source: source || 'manual',
    });

    // Record learning event
    await db.learningEvent.create({
      data: {
        userId: payload.userId,
        agentId,
        eventType: 'preference_learned',
        data: JSON.stringify({ category, key, content }),
        impact: 0.3,
      },
    });

    return Response.json({ success: true });
  } catch (_e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE: Clear agent memories
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { id: agentId } = await params;
    const url = new URL(req.url);
    const memoryId = url.searchParams.get('memoryId');
    const category = url.searchParams.get('category');

    if (memoryId) {
      // Delete specific memory
      await db.agentMemory.deleteMany({
        where: { id: memoryId, userId: payload.userId },
      });
    } else if (category) {
      // Delete all memories of a category
      await db.agentMemory.deleteMany({
        where: { agentId, userId: payload.userId, category },
      });
    } else {
      // Delete all memories for this agent+user
      await db.agentMemory.deleteMany({
        where: { agentId, userId: payload.userId },
      });
    }

    return Response.json({ success: true });
  } catch (_e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
