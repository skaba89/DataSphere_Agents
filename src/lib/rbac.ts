/**
 * Role-Based Access Control (RBAC) System
 * Defines roles, permissions, and authorization helpers
 */

// ============================================
// ROLE DEFINITIONS
// ============================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ============================================
// PERMISSION DEFINITIONS
// ============================================

export const PERMISSIONS = {
  // User management
  USERS_LIST: 'users.list',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_ROLE_CHANGE: 'users.role_change',
  USERS_SUSPEND: 'users.suspend',

  // Agent management
  AGENTS_LIST: 'agents.list',
  AGENTS_CREATE: 'agents.create',
  AGENTS_UPDATE: 'agents.update',
  AGENTS_DELETE: 'agents.delete',
  AGENTS_DISABLE: 'agents.disable',
  AGENTS_TEMPLATE: 'agents.template',

  // Conversation
  CONVERSATIONS_LIST: 'conversations.list',
  CONVERSATIONS_CREATE: 'conversations.create',
  CONVERSATIONS_DELETE: 'conversations.delete',
  CONVERSATIONS_EXPORT: 'conversations.export',

  // Marketplace
  MARKETPLACE_PUBLISH: 'marketplace.publish',
  MARKETPLACE_INSTALL: 'marketplace.install',
  MARKETPLACE_RATE: 'marketplace.rate',
  MARKETPLACE_MODERATE: 'marketplace.moderate',

  // Billing & Plans
  BILLING_MANAGE: 'billing.manage',
  PLANS_MANAGE: 'plans.manage',

  // Admin
  ADMIN_ACCESS: 'admin.access',
  ADMIN_STATS: 'admin.stats',
  ADMIN_AUDIT_LOG: 'admin.audit_log',
  ADMIN_PLATFORM_KEYS: 'admin.platform_keys',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // API Access
  API_KEYS_MANAGE: 'api_keys.manage',
  API_PLATFORM_ACCESS: 'api.platform_access',

  // Documents
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_DELETE: 'documents.delete',

  // Organization
  ORG_CREATE: 'org.create',
  ORG_MANAGE: 'org.manage',
  ORG_INVITE: 'org.invite',

  // Multi-AI
  COMPARISON_USE: 'comparison.use',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================
// ROLE-PERMISSION MAPPING
// ============================================

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions

  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_LIST,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_ROLE_CHANGE,
    PERMISSIONS.USERS_SUSPEND,
    PERMISSIONS.AGENTS_LIST,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_UPDATE,
    PERMISSIONS.AGENTS_DELETE,
    PERMISSIONS.AGENTS_DISABLE,
    PERMISSIONS.AGENTS_TEMPLATE,
    PERMISSIONS.CONVERSATIONS_LIST,
    PERMISSIONS.CONVERSATIONS_CREATE,
    PERMISSIONS.CONVERSATIONS_DELETE,
    PERMISSIONS.CONVERSATIONS_EXPORT,
    PERMISSIONS.MARKETPLACE_PUBLISH,
    PERMISSIONS.MARKETPLACE_INSTALL,
    PERMISSIONS.MARKETPLACE_RATE,
    PERMISSIONS.MARKETPLACE_MODERATE,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.ADMIN_STATS,
    PERMISSIONS.ADMIN_AUDIT_LOG,
    PERMISSIONS.ADMIN_PLATFORM_KEYS,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.API_KEYS_MANAGE,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DELETE,
    PERMISSIONS.ORG_CREATE,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.ORG_INVITE,
    PERMISSIONS.COMPARISON_USE,
  ],

  [ROLES.USER]: [
    PERMISSIONS.AGENTS_LIST,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.CONVERSATIONS_LIST,
    PERMISSIONS.CONVERSATIONS_CREATE,
    PERMISSIONS.CONVERSATIONS_DELETE,
    PERMISSIONS.CONVERSATIONS_EXPORT,
    PERMISSIONS.MARKETPLACE_INSTALL,
    PERMISSIONS.MARKETPLACE_RATE,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.API_KEYS_MANAGE,
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.DOCUMENTS_DELETE,
    PERMISSIONS.COMPARISON_USE,
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const rolePerms = ROLE_PERMISSIONS[role as Role];
  if (!rolePerms) return false;
  return rolePerms.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as Role] || [];
}

/**
 * Check if user is admin (admin or super_admin)
 */
export function isAdmin(role: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

/**
 * Check if user is super_admin
 */
export function isSuperAdmin(role: string): boolean {
  return role === ROLES.SUPER_ADMIN;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const names: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrateur',
    user: 'Utilisateur',
  };
  return names[role] || role;
}

/**
 * Get role badge color class
 */
export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
    admin: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-400',
    user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return colors[role] || colors.user;
}
