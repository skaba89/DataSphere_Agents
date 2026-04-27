import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isValidWebhookUrl, generateWebhookSecret, WEBHOOK_EVENTS } from '@/lib/webhooks';

// GET /api/webhooks — List user's webhooks with recent delivery stats
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const webhooks = await db.webhook.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    // Get recent delivery stats for each webhook
    const webhooksStats = await Promise.all(
      webhooks.map(async (wh) => {
        const recentDeliveries = await db.webhookDelivery.findMany({
          where: { webhookId: wh.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        const successCount = await db.webhookDelivery.count({
          where: { webhookId: wh.id, success: true },
        });

        const failCount = await db.webhookDelivery.count({
          where: { webhookId: wh.id, success: false },
        });

        return {
          id: wh.id,
          url: wh.url,
          secret: wh.secret,
          events: JSON.parse(wh.events),
          isActive: wh.isActive,
          createdAt: wh.createdAt,
          updatedAt: wh.updatedAt,
          lastTriggeredAt: wh.lastTriggeredAt,
          failureCount: wh.failureCount,
          totalDeliveries: wh._count.deliveries,
          successCount,
          failCount,
          recentDeliveries: recentDeliveries.map((d) => ({
            id: d.id,
            event: d.event,
            statusCode: d.statusCode,
            success: d.success,
            createdAt: d.createdAt,
          })),
        };
      })
    );

    return NextResponse.json({ webhooks: webhooksStats });
  } catch (error) {
    console.error('Webhooks list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/webhooks — Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: 'Corps de la requête invalide' },
        { status: 400 }
      );
    }

    const { url, events } = body;

    // Validate URL
    if (!url || typeof url !== 'string' || !isValidWebhookUrl(url)) {
      return NextResponse.json(
        { error: 'URL invalide. L\'URL doit commencer par http:// ou https://' },
        { status: 400 }
      );
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un événement doit être sélectionné' },
        { status: 400 }
      );
    }

    const validEvents = WEBHOOK_EVENTS as readonly string[];
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Événements invalides: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Check webhook limit (max 10 per user)
    const existingCount = await db.webhook.count({
      where: { userId: payload.userId },
    });
    if (existingCount >= 10) {
      return NextResponse.json(
        { error: 'Limite atteinte: maximum 10 webhooks par utilisateur' },
        { status: 400 }
      );
    }

    const secret = generateWebhookSecret();

    const webhook = await db.webhook.create({
      data: {
        userId: payload.userId,
        url: url.trim(),
        secret,
        events: JSON.stringify(events),
        isActive: true,
      },
    });

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      events: JSON.parse(webhook.events),
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Webhook create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
