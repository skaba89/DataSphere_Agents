import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isValidWebhookUrl, WEBHOOK_EVENTS } from '@/lib/webhooks';

// GET /api/webhooks/[id] — Get webhook details + recent deliveries
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

    const webhook = await db.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    if (webhook.userId !== payload.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const successCount = await db.webhookDelivery.count({
      where: { webhookId: webhook.id, success: true },
    });
    const failCount = await db.webhookDelivery.count({
      where: { webhookId: webhook.id, success: false },
    });

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        events: JSON.parse(webhook.events),
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
        lastTriggeredAt: webhook.lastTriggeredAt,
        failureCount: webhook.failureCount,
        successCount,
        failCount,
        deliveries: webhook.deliveries.map((d) => ({
          id: d.id,
          event: d.event,
          payload: d.payload,
          statusCode: d.statusCode,
          response: d.response,
          success: d.success,
          createdAt: d.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Webhook get error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/webhooks/[id] — Update webhook (url, events, isActive)
export async function PATCH(
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

    const webhook = await db.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    if (webhook.userId !== payload.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
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

    const updateData: Record<string, any> = {};

    // Update URL if provided
    if (body.url !== undefined) {
      if (!isValidWebhookUrl(body.url)) {
        return NextResponse.json(
          { error: 'URL invalide. L\'URL doit commencer par http:// ou https://' },
          { status: 400 }
        );
      }
      updateData.url = body.url.trim();
    }

    // Update events if provided
    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json(
          { error: 'Au moins un événement doit être sélectionné' },
          { status: 400 }
        );
      }
      const validEvents = WEBHOOK_EVENTS as readonly string[];
      const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Événements invalides: ${invalidEvents.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.events = JSON.stringify(body.events);
    }

    // Update isActive if provided
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
      // When reactivating, reset failure count
      if (body.isActive === true) {
        updateData.failureCount = 0;
      }
    }

    const updated = await db.webhook.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      url: updated.url,
      events: JSON.parse(updated.events),
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
      failureCount: updated.failureCount,
    });
  } catch (error) {
    console.error('Webhook update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/webhooks/[id] — Delete webhook
export async function DELETE(
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

    const webhook = await db.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    if (webhook.userId !== payload.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await db.webhook.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Webhook supprimé avec succès',
    });
  } catch (error) {
    console.error('Webhook delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
