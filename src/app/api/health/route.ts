import { NextResponse } from 'next/server'

export async function GET() {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DataSphere Agents API',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  }

  return NextResponse.json(healthCheck, { status: 200 })
}
