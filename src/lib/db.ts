import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let _dbAvailable: boolean | null = null

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://datasphere:datasphere_dev@localhost:5432/datasphere_agents'
  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

/**
 * Check if the database connection is available.
 * Returns true if connected, false otherwise.
 * Caches the result for 30 seconds to avoid hammering the DB on every request.
 */
let lastCheck = 0
let cachedResult: boolean | null = null
const CHECK_INTERVAL_ONLINE = 30_000 // 30 seconds when DB is online
const CHECK_INTERVAL_OFFLINE = 120_000 // 2 minutes when DB is offline (don't hammer)

export async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now()
  const interval = cachedResult === false ? CHECK_INTERVAL_OFFLINE : CHECK_INTERVAL_ONLINE
  if (cachedResult !== null && now - lastCheck < interval) {
    return cachedResult
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    cachedResult = true
    lastCheck = now
    return true
  } catch {
    cachedResult = false
    lastCheck = now
    return false
  }
}

/**
 * Force a re-check of database availability on next call.
 * Use this after a known failure to retry sooner.
 */
export function invalidateDbCheck(): void {
  cachedResult = null
  lastCheck = 0
}
