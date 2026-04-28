import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { analyzeAgentPerformance, autoOptimizePrompt, rollbackPrompt, getPromptHistory } from '@/lib/prompt-optimizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Get performance analysis + prompt history
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

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return Response.json({ error: 'Agent non trouvé' }, { status: 404 });
    }

    // Get performance analysis
    const performance = await analyzeAgentPerformance(agentId);

    // Get prompt history
    const promptHistory = await getPromptHistory(agentId);

    // Get recent learning events
    const recentEvents = await db.learningEvent.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return Response.json({
      performance,
      promptHistory,
      currentPrompt: agent.systemPrompt,
      recentEvents,
    });
  } catch (_e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Trigger auto-optimization
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

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return Response.json({ error: 'Agent non trouvé' }, { status: 404 });
    }

    // Run auto-optimization
    const result = await autoOptimizePrompt(agentId, agent.systemPrompt);

    return Response.json(result);
  } catch (_e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH: Rollback to specific version
export async function PATCH(
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
    const { version } = body;

    if (!version || typeof version !== 'number') {
      return Response.json({ error: 'Numéro de version requis' }, { status: 400 });
    }

    await rollbackPrompt(agentId, version);

    // Record learning event
    await db.learningEvent.create({
      data: {
        userId: payload.userId,
        agentId,
        eventType: 'prompt_adjusted',
        data: JSON.stringify({ action: 'rollback', version }),
        impact: 0,
      },
    });

    return Response.json({ success: true, version });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur serveur';
    return Response.json({ error: msg }, { status: 500 });
  }
}
