import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('Health Check API', () => {
  it('should return a valid status code', async () => {
    const response = await GET()
    expect([200, 503]).toContain(response.status)
  })

  it('should return ok or degraded status', async () => {
    const response = await GET()
    const data = await response.json()
    expect(['ok', 'degraded']).toContain(data.status)
  })

  it('should include database status', async () => {
    const response = await GET()
    const data = await response.json()
    expect(['connected', 'unavailable']).toContain(data.database)
  })

  it('should include service name', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.service).toBe('DataSphere Agents API')
  })

  it('should include version', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.version).toBe('1.0.0')
  })

  it('should include timestamp', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.timestamp).toBeDefined()
    expect(new Date(data.timestamp).getTime()).not.toBeNaN()
  })

  it('should include uptime', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.uptime).toBeTypeOf('number')
    expect(data.uptime).toBeGreaterThan(0)
  })

  it('should include environment', async () => {
    const response = await GET()
    const data = await response.json()
    expect(data.environment).toBeDefined()
  })
})
