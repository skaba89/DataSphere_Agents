<<<<<<< HEAD
import { NextResponse } from 'next/server'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'

export async function GET() {
  const dbAvailable = await isDatabaseAvailable()
  const demo = getDemoService()
  const demoStatus = demo.getStatus()

  return NextResponse.json({
    status: dbAvailable ? 'ok' : 'demo',
    timestamp: new Date().toISOString(),
    service: 'DataSphere Agents API',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbAvailable ? 'connected' : 'demo-mode',
    demo: dbAvailable ? undefined : demoStatus,
  }, { status: 200 })
=======
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: { name: string; status: 'healthy' | 'degraded' | 'unhealthy'; latency?: number; error?: string }[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check 1: Database connectivity
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    checks.push({
      name: 'Base de données',
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latency,
    });
  } catch (e) {
    checks.push({
      name: 'Base de données',
      status: 'unhealthy',
      error: 'Connexion échouée',
    });
    overallStatus = 'unhealthy';
  }

  // Check 2: Memory usage
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    checks.push({
      name: 'Mémoire',
      status: memPercentage < 80 ? 'healthy' : memPercentage < 95 ? 'degraded' : 'unhealthy',
      latency: heapUsedMB,
    });

    if (memPercentage >= 95) {
      overallStatus = 'unhealthy';
    } else if (memPercentage >= 80 && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  } catch (_e) {
    checks.push({
      name: 'Mémoire',
      status: 'degraded',
      error: 'Impossible de lire l\'utilisation mémoire',
    });
  }

  // Check 3: Uptime
  const uptimeSeconds = process.uptime();

  return NextResponse.json({
    status: overallStatus,
    uptime: Math.round(uptimeSeconds),
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: overallStatus === 'unhealthy' ? 503 : 200,
  });
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
}
