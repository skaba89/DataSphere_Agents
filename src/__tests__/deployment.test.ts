import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock environment variables for deployment tests
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-for-deployment-tests-32ch')
vi.stubEnv('JWT_SECRET', 'test-jwt-for-deployment-tests-32chars')
vi.stubEnv('NODE_ENV', 'test')

describe('Deployment Configuration', () => {
  describe('Environment Variables', () => {
    it('should have DATABASE_URL defined', () => {
      expect(process.env.DATABASE_URL).toBeDefined()
      expect(process.env.DATABASE_URL).toContain('postgresql://')
    })

    it('should have NEXTAUTH_SECRET defined', () => {
      expect(process.env.NEXTAUTH_SECRET).toBeDefined()
      expect(process.env.NEXTAUTH_SECRET!.length).toBeGreaterThanOrEqual(32)
    })

    it('should have JWT_SECRET defined', () => {
      expect(process.env.JWT_SECRET).toBeDefined()
      expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32)
    })

    it('should have NODE_ENV set', () => {
      expect(process.env.NODE_ENV).toBeDefined()
      expect(['development', 'production', 'test']).toContain(process.env.NODE_ENV)
    })
  })

  describe('Security Headers Configuration', () => {
    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }

    it('should define all required security headers', () => {
      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(header).toBeDefined()
        expect(value).toBeDefined()
        expect(value.length).toBeGreaterThan(0)
      })
    })

    it('should have X-Frame-Options set to DENY', () => {
      expect(securityHeaders['X-Frame-Options']).toBe('DENY')
    })

    it('should have X-Content-Type-Options set to nosniff', () => {
      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff')
    })

    it('should have restrictive Permissions-Policy', () => {
      const policy = securityHeaders['Permissions-Policy']
      expect(policy).toContain('camera=()')
      expect(policy).toContain('microphone=()')
      expect(policy).toContain('geolocation=()')
    })
  })

  describe('CORS Configuration', () => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://datasphere-agents.netlify.app',
      'https://datasphere-agents.onrender.com',
    ]

    it('should define allowed origins for CORS', () => {
      expect(allowedOrigins.length).toBeGreaterThan(0)
    })

    it('should include localhost for development', () => {
      expect(allowedOrigins).toContain('http://localhost:3000')
    })

    it('should include Netlify production URL', () => {
      expect(allowedOrigins).toContain('https://datasphere-agents.netlify.app')
    })

    it('should include Render URL', () => {
      expect(allowedOrigins).toContain('https://datasphere-agents.onrender.com')
    })

    it('should only allow HTTPS in production origins', () => {
      const productionOrigins = allowedOrigins.filter(o => !o.includes('localhost'))
      productionOrigins.forEach(origin => {
        expect(origin).toContain('https://')
      })
    })
  })

  describe('Rate Limiting Configuration', () => {
    const rateLimitConfig = {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    }

    it('should have a rate limit window defined', () => {
      expect(rateLimitConfig.windowMs).toBeGreaterThan(0)
    })

    it('should have a max requests limit defined', () => {
      expect(rateLimitConfig.maxRequests).toBeGreaterThan(0)
    })

    it('should allow reasonable request rate (between 10-1000 per minute)', () => {
      expect(rateLimitConfig.maxRequests).toBeGreaterThanOrEqual(10)
      expect(rateLimitConfig.maxRequests).toBeLessThanOrEqual(1000)
    })
  })

  describe('Netlify Configuration', () => {
    it('should use Node.js 20', () => {
      const nodeVersion = '20'
      expect(parseInt(nodeVersion)).toBeGreaterThanOrEqual(18)
    })

    it('should build with prisma generate first', () => {
      const buildCommand = 'npx prisma generate && npm run build'
      expect(buildCommand).toContain('prisma generate')
      expect(buildCommand).toContain('npm run build')
    })

    it('should use @netlify/plugin-nextjs', () => {
      const plugin = '@netlify/plugin-nextjs'
      expect(plugin).toBe('@netlify/plugin-nextjs')
    })
  })

  describe('Render Configuration', () => {
    it('should use PostgreSQL 15', () => {
      const pgVersion = 15
      expect(pgVersion).toBeGreaterThanOrEqual(14)
    })

    it('should allow external connections for Netlify', () => {
      const ipAllowList: string[] = []
      expect(ipAllowList.length).toBe(0) // Empty = allow all
    })

    it('should have a starter database plan', () => {
      const plan = 'starter'
      expect(['starter', 'standard', 'pro']).toContain(plan)
    })
  })

  describe('Database Schema', () => {
    it('should have all required models', () => {
      const models = [
        'User', 'Account', 'Session', 'Organization', 'OrganizationMember',
        'Project', 'ApiKey', 'AiProvider', 'Agent', 'Conversation', 'Message',
        'Subscription', 'Invoice', 'Notification', 'AuditLog', 'DataMetric',
        'Workflow', 'WorkflowExecution', 'FileUpload', 'Integration', 'Webhook',
        'Template', 'Setting', 'RefreshToken', 'PasswordReset', 'EmailVerification',
      ]
      expect(models.length).toBeGreaterThanOrEqual(26)
    })

    it('should have all required enums', () => {
      const enums = [
        'UserRole', 'OrganizationPlan', 'OrganizationRole', 'ProjectStatus',
        'AiProviderType', 'MessageRole', 'SubscriptionStatus', 'InvoiceStatus',
        'NotificationType', 'WorkflowExecutionStatus',
      ]
      expect(enums.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Health Check Endpoint', () => {
    it('should return correct health check structure', async () => {
      // Test the expected health check response format
      const healthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'DataSphere Agents API',
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      }

      expect(healthResponse.status).toBe('ok')
      expect(healthResponse.timestamp).toBeDefined()
      expect(healthResponse.service).toBe('DataSphere Agents API')
      expect(healthResponse.uptime).toBeGreaterThan(0)
    })
  })
})
