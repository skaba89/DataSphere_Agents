import { db } from '@/lib/db';
import { createHmac, randomBytes } from 'crypto';

// Event types that can trigger webhooks
export const WEBHOOK_EVENTS = [
  'chat.message_created',
  'chat.conversation_created',
  'agent.created',
  'agent.deleted',
  'marketplace.agent_published',
  'marketplace.agent_installed',
  'billing.subscription_created',
  'billing.subscription_updated',
  'billing.invoice_paid',
  'billing.invoice_failed',
  'user.registered',
  'organization.member_invited',
  'document.uploaded',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// Event categories for grouping
export const WEBHOOK_EVENT_CATEGORIES: Record<string, { label: string; events: WebhookEvent[] }> = {
  chat: {
    label: 'Chat',
    events: ['chat.message_created', 'chat.conversation_created'],
  },
  agent: {
    label: 'Agents',
    events: ['agent.created', 'agent.deleted'],
  },
  marketplace: {
    label: 'Marketplace',
    events: ['marketplace.agent_published', 'marketplace.agent_installed'],
  },
  billing: {
    label: 'Facturation',
    events: ['billing.subscription_created', 'billing.subscription_updated', 'billing.invoice_paid', 'billing.invoice_failed'],
  },
  user: {
    label: 'Utilisateur',
    events: ['user.registered'],
  },
  organization: {
    label: 'Organisation',
    events: ['organization.member_invited'],
  },
  document: {
    label: 'Documents',
    events: ['document.uploaded'],
  },
};

// Dispatch a webhook event to all matching webhooks
export async function dispatchWebhook(event: WebhookEvent, data: Record<string, any>) {
  // 1. Find all active webhooks that listen for this event
  const webhooks = await db.webhook.findMany({
    where: { isActive: true },
  });

  const matchingWebhooks = webhooks.filter((wh) => {
    try {
      const events: string[] = JSON.parse(wh.events);
      return events.includes(event);
    } catch {
      return false;
    }
  });

  if (matchingWebhooks.length === 0) return;

  // 2. For each webhook, dispatch asynchronously
  const dispatchPromises = matchingWebhooks.map(async (webhook) => {
    const deliveryId = `del_${randomBytes(8).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const payload = JSON.stringify({
      event,
      timestamp,
      delivery_id: deliveryId,
      data,
    });

    // Sign payload with HMAC-SHA256 using webhook secret
    const signature = createHmac('sha256', webhook.secret)
      .update(payload)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DataSphere-Signature': `sha256=${signature}`,
          'X-DataSphere-Event': event,
          'X-DataSphere-Delivery': deliveryId,
          'User-Agent': 'DataSphere-Webhook/1.0',
        },
        body: payload,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const responseBody = await response.text().catch(() => '');

      // Create WebhookDelivery record
      await db.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          statusCode: response.status,
          response: responseBody.slice(0, 2000), // Truncate long responses
          success: response.status >= 200 && response.status < 300,
        },
      });

      // Update webhook status
      if (response.status >= 200 && response.status < 300) {
        // Success — reset failure count
        await db.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: 0,
          },
        });
      } else {
        // Failed response
        const newFailureCount = webhook.failureCount + 1;
        await db.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: newFailureCount,
            // Auto-disable after 10 consecutive failures
            isActive: newFailureCount >= 10 ? false : true,
          },
        });
      }
    } catch (error) {
      // Network error or timeout
      const newFailureCount = webhook.failureCount + 1;

      await db.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload,
          statusCode: null,
          response: error instanceof Error ? error.message : 'Erreur inconnue',
          success: false,
        },
      });

      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: newFailureCount,
          // Auto-disable after 10 consecutive failures
          isActive: newFailureCount >= 10 ? false : true,
        },
      });
    }
  });

  // Run all dispatches concurrently but don't block the main request
  // We use allSettled to avoid one failure blocking others
  await Promise.allSettled(dispatchPromises);
}

// Validate webhook URL
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Generate webhook secret
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

// Get event display label (in French)
export function getEventLabel(event: string): string {
  const labels: Record<string, string> = {
    'chat.message_created': 'Message créé',
    'chat.conversation_created': 'Conversation créée',
    'agent.created': 'Agent créé',
    'agent.deleted': 'Agent supprimé',
    'marketplace.agent_published': 'Agent publié',
    'marketplace.agent_installed': 'Agent installé',
    'billing.subscription_created': 'Abonnement créé',
    'billing.subscription_updated': 'Abonnement mis à jour',
    'billing.invoice_paid': 'Facture payée',
    'billing.invoice_failed': 'Facture échouée',
    'user.registered': 'Utilisateur inscrit',
    'organization.member_invited': 'Membre invité',
    'document.uploaded': 'Document téléchargé',
  };
  return labels[event] || event;
}

// Get event category color
export function getEventCategoryColor(event: string): string {
  if (event.startsWith('chat.')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
  if (event.startsWith('agent.')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400';
  if (event.startsWith('marketplace.')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
  if (event.startsWith('billing.')) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400';
  if (event.startsWith('user.')) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400';
  if (event.startsWith('organization.')) return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400';
  if (event.startsWith('document.')) return 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-400';
}
