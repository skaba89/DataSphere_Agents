import { NextResponse } from 'next/server'
import { isDatabaseAvailable } from '@/lib/db'

export async function GET() {
  const dbAvailable = await isDatabaseAvailable()

  const healthCheck = {
    status: dbAvailable ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'DataSphere Agents API',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbAvailable ? 'connected' : 'unavailable',
  }

  return NextResponse.json(healthCheck, { status: dbAvailable ? 200 : 503 })
}
