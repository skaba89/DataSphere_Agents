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
}
