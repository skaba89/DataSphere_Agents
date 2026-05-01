/**
 * Audit Log System
 * Records all significant actions for compliance and admin tracking
 */

import { db } from '@/lib/db';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record an audit log entry
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity || null,
        entityId: params.entityId || null,
        details: JSON.stringify(params.details || {}),
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (_e) {
    // Don't block the main flow if audit logging fails
    console.error('[Audit] Failed to record audit log:', _e);
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(params: {
  userId?: string;
  action?: string;
  entity?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = { contains: params.action };
  if (params.entity) where.entity = params.entity;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get action display name
 */
export function getActionDisplayName(action: string): string {
  const names: Record<string, string> = {
    'user.login': 'Connexion',
    'user.register': 'Inscription',
    'user.logout': 'Déconnexion',
    'user.update': 'Mise à jour profil',
    'user.password_change': 'Changement de mot de passe',
    'user.role_change': 'Changement de rôle',
    'user.suspend': 'Suspension de compte',
    'user.delete': 'Suppression de compte',
    'agent.create': 'Création d\'agent',
    'agent.update': 'Mise à jour d\'agent',
    'agent.delete': 'Suppression d\'agent',
    'agent.disable': 'Désactivation d\'agent',
    'conversation.create': 'Nouvelle conversation',
    'conversation.delete': 'Suppression de conversation',
    'conversation.export': 'Export de conversation',
    'marketplace.publish': 'Publication marketplace',
    'marketplace.install': 'Installation depuis marketplace',
    'billing.subscribe': 'Souscription',
    'billing.cancel': 'Annulation d\'abonnement',
    'billing.upgrade': 'Mise à niveau',
    'admin.access': 'Accès panel admin',
    'admin.export_data': 'Export de données',
    'api_key.create': 'Création clé API',
    'api_key.revoke': 'Révocation clé API',
    'comparison.run': 'Comparaison multi-IA',
  };
  return names[action] || action;
}

/**
 * Get action category color
 */
export function getActionCategoryColor(action: string): string {
  if (action.startsWith('user.')) return 'text-blue-600 dark:text-blue-400';
  if (action.startsWith('agent.')) return 'text-emerald-600 dark:text-emerald-400';
  if (action.startsWith('conversation.')) return 'text-amber-600 dark:text-amber-400';
  if (action.startsWith('marketplace.')) return 'text-purple-600 dark:text-purple-400';
  if (action.startsWith('billing.')) return 'text-rose-600 dark:text-rose-400';
  if (action.startsWith('admin.')) return 'text-violet-600 dark:text-violet-400';
  if (action.startsWith('api_key.')) return 'text-cyan-600 dark:text-cyan-400';
  if (action.startsWith('comparison.')) return 'text-orange-600 dark:text-orange-400';
  return 'text-gray-600 dark:text-gray-400';
}
