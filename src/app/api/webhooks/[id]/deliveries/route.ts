import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/webhooks/[id]/deliveries — List delivery history (paginated, last 50)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { id } = await params;

    // Verify webhook ownership
    const webhook = await db.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    if (webhook.userId !== payload.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      db.webhookDelivery.findMany({
        where: { webhookId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.webhookDelivery.count({
        where: { webhookId: id },
      }),
    ]);

    return NextResponse.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        event: d.event,
        payload: d.payload,
        statusCode: d.statusCode,
        response: d.response,
        success: d.success,
        createdAt: d.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Webhook deliveries list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
