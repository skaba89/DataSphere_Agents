/**
 * Platform API Key Authentication
 * Authenticates requests using platform API keys (ds_live_*)
 */

import { db } from '@/lib/db';
import { createHash } from 'crypto';

export interface PlatformAuthResult {
  userId: string;
  permissions: string[];
  keyId: string;
}

/**
 * Authenticate a platform API key
 *
 * 1. Validate format: must start with "ds_live_"
 * 2. Hash the provided key with SHA-256
 * 3. Look up in PlatformApiKey table by keyHash
 * 4. Check if expired or inactive
 * 5. Update lastUsedAt
 * 6. Return { userId, permissions, keyId } or null
 */
export async function authenticatePlatformKey(apiKey: string): Promise<PlatformAuthResult | null> {
  // 1. Validate format
  if (!apiKey || !apiKey.startsWith('ds_live_')) {
    return null;
  }

  // 2. Hash the provided key
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  // 3. Look up in PlatformApiKey table by keyHash
  const record = await db.platformApiKey.findUnique({
    where: { keyHash },
  });

  if (!record) {
    return null;
  }

  // 4. Check if inactive
  if (!record.isActive) {
    return null;
  }

  // 4. Check if expired
  if (record.expiresAt && record.expiresAt < new Date()) {
    return null;
  }

  // 5. Update lastUsedAt (fire-and-forget)
  db.platformApiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch((err) => {
    console.error('[PlatformAuth] Failed to update lastUsedAt:', err);
  });

  // 6. Return auth result
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(record.permissions);
    if (!Array.isArray(permissions)) {
      permissions = [record.permissions];
    }
  } catch (_e) {
    permissions = [record.permissions];
  }

  return {
    userId: record.userId,
    permissions,
    keyId: record.id,
  };
}
