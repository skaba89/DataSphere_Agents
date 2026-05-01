/**
 * DataSphere Agents - Demo Service
 * In-memory data store that enables the full application to work without PostgreSQL.
 * Used when isDatabaseAvailable() returns false.
 * Provides the same business logic as the Prisma-backed routes.
 */

import { hashPassword, comparePassword, generateTokenPair, generateRandomToken } from '@/lib/auth'
import type { JwtPayload } from '@/lib/auth'

// ============================================================
// TYPES
// ============================================================

interface DemoUser {
  id: string
  email: string
  name: string | null
  passwordHash: string
  role: string
  avatar: string | null
  emailVerified: boolean
  twoFactorEnabled: boolean
  twoFactorSecret: string | null
  createdAt: Date
  updatedAt: Date
}

interface DemoOrganization {
  id: string
  name: string
  slug: string
  ownerId: string
  plan: string
  createdAt: Date
  updatedAt: Date
}

interface DemoOrgMember {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: Date
  updatedAt: Date
}

interface DemoAiProvider {
  id: string
  name: string
  type: string
  apiKey: string
  organizationId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface DemoAgent {
  id: string
  name: string
  description: string | null
  organizationId: string
  providerId: string
  model: string
  systemPrompt: string | null
  temperature: number
  maxTokens: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface DemoConversation {
  id: string
  agentId: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
}

interface DemoMessage {
  id: string
  conversationId: string
  role: string
  content: string
  tokens: number | null
  createdAt: Date
}

interface DemoProject {
  id: string
  name: string
  description: string | null
  organizationId: string
  status: string
  createdAt: Date
  updatedAt: Date
}

interface DemoNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: Date
}

interface DemoRefreshToken {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

interface DemoSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

interface DemoPasswordReset {
  id: string
  userId: string
  token: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

interface DemoEmailVerification {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

interface DemoSubscription {
  id: string
  userId: string
  organizationId: string | null
  stripeCustomerId: string | null
  stripePriceId: string | null
  stripeSubscriptionId: string | null
  status: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  createdAt: Date
  updatedAt: Date
}

interface DemoAuditLog {
  id: string
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  details: Record<string, unknown> | null
  ip: string | null
  createdAt: Date
}

interface DemoApiKey {
  id: string
  name: string
  key: string
  userId: string
  organizationId: string | null
  expiresAt: Date | null
  createdAt: Date
}

// ============================================================
// HELPER
// ============================================================

const uid = (): string => crypto.randomUUID()

// ============================================================
// DEMO SERVICE CLASS
// ============================================================

class DemoService {
  // In-memory data stores
  private users = new Map<string, DemoUser>()
  private organizations = new Map<string, DemoOrganization>()
  private orgMembers = new Map<string, DemoOrgMember>()
  private aiProviders = new Map<string, DemoAiProvider>()
  private agents = new Map<string, DemoAgent>()
  private conversations = new Map<string, DemoConversation>()
  private messages = new Map<string, DemoMessage>()
  private projects = new Map<string, DemoProject>()
  private notifications = new Map<string, DemoNotification>()
  private refreshTokens = new Map<string, DemoRefreshToken>()
  private sessions = new Map<string, DemoSession>()
  private passwordResets = new Map<string, DemoPasswordReset>()
  private emailVerifications = new Map<string, DemoEmailVerification>()
  private subscriptions = new Map<string, DemoSubscription>()
  private auditLogs = new Map<string, DemoAuditLog>()
  private apiKeys = new Map<string, DemoApiKey>()

  private initialized = false

  constructor() {
    this.seed()
  }

  // ============================================================
  // SEED DATA
  // ============================================================

  private async seed() {
    if (this.initialized) return
    this.initialized = true

    // Admin user
    const adminPasswordHash = await hashPassword('admin123')
    const admin: DemoUser = {
      id: uid(), email: 'admin@datasphere.agents', name: 'Admin User',
      passwordHash: adminPasswordHash, role: 'ADMIN', avatar: null,
      emailVerified: true, twoFactorEnabled: false, twoFactorSecret: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.users.set(admin.id, admin)

    // Demo user
    const demoPasswordHash = await hashPassword('demo123')
    const demo: DemoUser = {
      id: uid(), email: 'demo@datasphere.agents', name: 'Demo User',
      passwordHash: demoPasswordHash, role: 'USER', avatar: null,
      emailVerified: true, twoFactorEnabled: false, twoFactorSecret: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.users.set(demo.id, demo)

    // Organization
    const org: DemoOrganization = {
      id: uid(), name: 'DataSphere Inc.', slug: 'datasphere',
      ownerId: admin.id, plan: 'PRO', createdAt: new Date(), updatedAt: new Date(),
    }
    this.organizations.set(org.id, org)

    // Members
    const adminMember: DemoOrgMember = {
      id: uid(), organizationId: org.id, userId: admin.id, role: 'OWNER',
      createdAt: new Date(), updatedAt: new Date(),
    }
    const demoMember: DemoOrgMember = {
      id: uid(), organizationId: org.id, userId: demo.id, role: 'MEMBER',
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.orgMembers.set(adminMember.id, adminMember)
    this.orgMembers.set(demoMember.id, demoMember)

    // AI Provider
    const provider: DemoAiProvider = {
      id: uid(), name: 'OpenAI GPT-4', type: 'OPENAI',
      apiKey: 'sk-demo-key', organizationId: org.id, isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.aiProviders.set(provider.id, provider)

    // Agents
    const agent1: DemoAgent = {
      id: uid(), name: 'Customer Support Agent',
      description: 'Handles customer support inquiries with professionalism and empathy',
      organizationId: org.id, providerId: provider.id, model: 'gpt-4',
      systemPrompt: 'You are a helpful customer support agent. Be polite and professional.',
      temperature: 0.7, maxTokens: 2048, isActive: true,
      createdAt: new Date('2025-01-15'), updatedAt: new Date(),
    }
    const agent2: DemoAgent = {
      id: uid(), name: 'Code Assistant',
      description: 'Helps with coding questions and code reviews',
      organizationId: org.id, providerId: provider.id, model: 'gpt-4',
      systemPrompt: 'You are a coding assistant. Help with programming questions and code reviews.',
      temperature: 0.3, maxTokens: 4096, isActive: true,
      createdAt: new Date('2025-02-01'), updatedAt: new Date(),
    }
    const agent3: DemoAgent = {
      id: uid(), name: 'Data Analyst',
      description: 'Analyzes data and generates insights',
      organizationId: org.id, providerId: provider.id, model: 'gpt-4',
      systemPrompt: 'You are a data analyst. Help interpret data and provide analytical insights.',
      temperature: 0.5, maxTokens: 3000, isActive: true,
      createdAt: new Date('2025-02-15'), updatedAt: new Date(),
    }
    this.agents.set(agent1.id, agent1)
    this.agents.set(agent2.id, agent2)
    this.agents.set(agent3.id, agent3)

    // Conversations
    const conv1: DemoConversation = {
      id: uid(), agentId: agent1.id, userId: demo.id,
      title: 'How to reset password', createdAt: new Date('2025-03-01'), updatedAt: new Date('2025-03-01'),
    }
    const conv2: DemoConversation = {
      id: uid(), agentId: agent2.id, userId: demo.id,
      title: 'React hooks best practices', createdAt: new Date('2025-03-05'), updatedAt: new Date('2025-03-05'),
    }
    const conv3: DemoConversation = {
      id: uid(), agentId: agent3.id, userId: admin.id,
      title: 'Q1 Sales Analysis', createdAt: new Date('2025-03-10'), updatedAt: new Date('2025-03-10'),
    }
    this.conversations.set(conv1.id, conv1)
    this.conversations.set(conv2.id, conv2)
    this.conversations.set(conv3.id, conv3)

    // Messages for conv1
    const msg1: DemoMessage = {
      id: uid(), conversationId: conv1.id, role: 'USER',
      content: 'How do I reset my password?', tokens: 8, createdAt: new Date('2025-03-01T10:00:00Z'),
    }
    const msg2: DemoMessage = {
      id: uid(), conversationId: conv1.id, role: 'ASSISTANT',
      content: 'To reset your password, go to Settings > Security > Change Password. You can also use the "Forgot Password" link on the login page. If you continue to have issues, please contact our support team.',
      tokens: 28, createdAt: new Date('2025-03-01T10:00:05Z'),
    }
    this.messages.set(msg1.id, msg1)
    this.messages.set(msg2.id, msg2)

    // Messages for conv2
    const msg3: DemoMessage = {
      id: uid(), conversationId: conv2.id, role: 'USER',
      content: 'What are the best practices for React hooks?', tokens: 10, createdAt: new Date('2025-03-05T14:00:00Z'),
    }
    const msg4: DemoMessage = {
      id: uid(), conversationId: conv2.id, role: 'ASSISTANT',
      content: 'Here are the key React hooks best practices:\n\n1. **Use the Rules of Hooks** - Only call hooks at the top level, never inside loops or conditions.\n2. **Custom hooks for reuse** - Extract common logic into custom hooks.\n3. **useEffect dependencies** - Always include all dependencies in the dependency array.\n4. **Avoid unnecessary state** - Use useMemo and useCallback for expensive computations.\n5. **Cleanup effects** - Return cleanup functions to prevent memory leaks.',
      tokens: 85, createdAt: new Date('2025-03-05T14:00:08Z'),
    }
    this.messages.set(msg3.id, msg3)
    this.messages.set(msg4.id, msg4)

    // Messages for conv3
    const msg5: DemoMessage = {
      id: uid(), conversationId: conv3.id, role: 'USER',
      content: 'Can you analyze the Q1 sales data trends?', tokens: 12, createdAt: new Date('2025-03-10T09:00:00Z'),
    }
    const msg6: DemoMessage = {
      id: uid(), conversationId: conv3.id, role: 'ASSISTANT',
      content: 'Based on the Q1 data analysis:\n\n- **Total Revenue**: $2.4M (up 18% YoY)\n- **Growth Drivers**: Enterprise segment (+32%), API usage (+45%)\n- **Key Trends**: Monthly recurring revenue showed consistent growth, with March being the strongest month at $890K.\n- **Recommendation**: Focus on enterprise upsell opportunities and expand the API tier offerings.',
      tokens: 72, createdAt: new Date('2025-03-10T09:00:12Z'),
    }
    this.messages.set(msg5.id, msg5)
    this.messages.set(msg6.id, msg6)

    // Projects
    const project1: DemoProject = {
      id: uid(), name: 'AI Assistant Project', description: 'Main AI assistant development project',
      organizationId: org.id, status: 'ACTIVE', createdAt: new Date('2025-01-10'), updatedAt: new Date(),
    }
    const project2: DemoProject = {
      id: uid(), name: 'Data Pipeline', description: 'Real-time data processing pipeline',
      organizationId: org.id, status: 'ACTIVE', createdAt: new Date('2025-02-20'), updatedAt: new Date(),
    }
    this.projects.set(project1.id, project1)
    this.projects.set(project2.id, project2)

    // Notifications
    const notif1: DemoNotification = {
      id: uid(), userId: demo.id, type: 'INFO', title: 'Welcome to DataSphere Agents!',
      message: 'Your account has been set up. Start by creating your first AI agent.', read: false, createdAt: new Date(),
    }
    const notif2: DemoNotification = {
      id: uid(), userId: admin.id, type: 'SUCCESS', title: 'Organization Created',
      message: 'Your organization "DataSphere Inc." has been created successfully.', read: true, createdAt: new Date(),
    }
    const notif3: DemoNotification = {
      id: uid(), userId: admin.id, type: 'INFO', title: 'New Agent Deployed',
      message: 'Customer Support Agent has been deployed and is ready to use.', read: false, createdAt: new Date(),
    }
    this.notifications.set(notif1.id, notif1)
    this.notifications.set(notif2.id, notif2)
    this.notifications.set(notif3.id, notif3)

    // Subscription
    const sub: DemoSubscription = {
      id: uid(), userId: admin.id, organizationId: org.id,
      stripeCustomerId: 'cus_demo', stripePriceId: 'price_pro_monthly',
      stripeSubscriptionId: 'sub_demo', status: 'ACTIVE',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.subscriptions.set(sub.id, sub)

    // API Key
    const apiKey: DemoApiKey = {
      id: uid(), name: 'Development API Key',
      key: `dsa_${uid().replace(/-/g, '')}`,
      userId: admin.id, organizationId: org.id, expiresAt: null, createdAt: new Date(),
    }
    this.apiKeys.set(apiKey.id, apiKey)

    console.log('[DemoService] Initialized with seed data')
  }

  // ============================================================
 // AUTH OPERATIONS
  // ============================================================

  async register(data: { name?: string; email: string; password: string }) {
    // Check if user exists
    for (const u of this.users.values()) {
      if (u.email === data.email) {
        return { success: false, error: 'CONFLICT', message: 'User with this email already exists' }
      }
    }

    const passwordHash = await hashPassword(data.password)
    const userId = uid()
    const user: DemoUser = {
      id: userId,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      passwordHash,
      role: 'USER',
      avatar: null,
      emailVerified: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.users.set(userId, user)

    // Create default organization
    const orgId = uid()
    const slug = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-' + Date.now().toString(36)
    const org: DemoOrganization = {
      id: orgId, name: `${user.name}'s Organization`, slug, ownerId: userId,
      plan: 'FREE', createdAt: new Date(), updatedAt: new Date(),
    }
    this.organizations.set(orgId, org)

    // Add user as owner
    const member: DemoOrgMember = {
      id: uid(), organizationId: orgId, userId, role: 'OWNER',
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.orgMembers.set(member.id, member)

    // Create default AI provider
    const provider: DemoAiProvider = {
      id: uid(), name: 'OpenAI (Default)', type: 'OPENAI',
      apiKey: 'sk-placeholder-add-your-key', organizationId: orgId, isActive: false,
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.aiProviders.set(provider.id, provider)

    // Email verification token
    const verificationToken = generateRandomToken()
    const emailVerif: DemoEmailVerification = {
      id: uid(), userId, token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), createdAt: new Date(),
    }
    this.emailVerifications.set(emailVerif.id, emailVerif)

    // Welcome notification
    const notif: DemoNotification = {
      id: uid(), userId, type: 'INFO', title: 'Welcome to DataSphere Agents!',
      message: 'Your account has been created. Start by setting up an AI provider and creating your first agent.',
      read: false, createdAt: new Date(),
    }
    this.notifications.set(notif.id, notif)

    // Generate tokens
    const tokens = generateTokenPair({ userId, email: user.email, role: user.role })
    const refreshToken: DemoRefreshToken = {
      id: uid(), userId, token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date(),
    }
    this.refreshTokens.set(refreshToken.id, refreshToken)

    return {
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified },
        organization: { id: org.id, name: org.name, slug: org.slug },
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
      },
    }
  }

  async login(email: string, password: string) {
    const user = Array.from(this.users.values()).find(u => u.email === email)
    if (!user || !user.passwordHash) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Invalid email or password' }
    }
    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Invalid email or password' }
    }

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role })

    // Store refresh token
    const refreshToken: DemoRefreshToken = {
      id: uid(), userId: user.id, token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date(),
    }
    this.refreshTokens.set(refreshToken.id, refreshToken)

    // Create session
    const session: DemoSession = {
      id: uid(), userId: user.id, token: tokens.accessToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), createdAt: new Date(), updatedAt: new Date(),
    }
    this.sessions.set(session.id, session)

    // Audit log
    const auditLog: DemoAuditLog = {
      id: uid(), userId: user.id, action: 'LOGIN', resource: 'User',
      resourceId: user.id, details: null, ip: null, createdAt: new Date(),
    }
    this.auditLogs.set(auditLog.id, auditLog)

    return {
      success: true,
      data: {
        user: {
          id: user.id, email: user.email, name: user.name, role: user.role,
          avatar: user.avatar, emailVerified: user.emailVerified, twoFactorEnabled: user.twoFactorEnabled,
        },
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      },
    }
  }

  async logout(userId: string) {
    // Remove all refresh tokens and sessions
    for (const [id, rt] of this.refreshTokens) {
      if (rt.userId === userId) this.refreshTokens.delete(id)
    }
    for (const [id, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(id)
    }
    const auditLog: DemoAuditLog = {
      id: uid(), userId, action: 'LOGOUT', resource: 'User',
      resourceId: userId, details: null, ip: null, createdAt: new Date(),
    }
    this.auditLogs.set(auditLog.id, auditLog)
    return { success: true, data: { message: 'Logged out successfully' } }
  }

  async refreshAccessToken(refreshTokenStr: string) {
    const stored = Array.from(this.refreshTokens.values()).find(rt => rt.token === refreshTokenStr)
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) this.refreshTokens.delete(stored.id)
      return { success: false, error: 'UNAUTHORIZED', message: 'Refresh token has expired. Please log in again.' }
    }

    const { verifyToken } = await import('@/lib/auth')
    let payload: JwtPayload
    try {
      payload = verifyToken(refreshTokenStr)
    } catch {
      return { success: false, error: 'UNAUTHORIZED', message: 'Invalid refresh token' }
    }

    const tokens = generateTokenPair({ userId: payload.userId, email: payload.email, role: payload.role })

    // Remove old, create new refresh token
    this.refreshTokens.delete(stored.id)
    const newRT: DemoRefreshToken = {
      id: uid(), userId: payload.userId, token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdAt: new Date(),
    }
    this.refreshTokens.set(newRT.id, newRT)

    return {
      success: true,
      data: { tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } },
    }
  }

  async forgotPassword(email: string) {
    const user = Array.from(this.users.values()).find(u => u.email === email)
    if (user) {
      // Invalidate old tokens
      for (const [id, pr] of this.passwordResets) {
        if (pr.userId === user.id && !pr.used) {
          this.passwordResets.set(id, { ...pr, used: true })
        }
      }
      const token = generateRandomToken()
      const reset: DemoPasswordReset = {
        id: uid(), userId: user.id, token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), used: false, createdAt: new Date(),
      }
      this.passwordResets.set(reset.id, reset)
      console.log(`[Demo] Password reset token for ${email}: ${token}`)
    }
    return {
      success: true,
      data: {
        message: 'If an account with this email exists, a password reset link has been sent.',
      },
    }
  }

  async resetPassword(token: string, password: string) {
    const reset = Array.from(this.passwordResets.values()).find(pr => pr.token === token)
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return { success: false, error: 'BAD_REQUEST', message: 'Invalid or expired reset token' }
    }
    const passwordHash = await hashPassword(password)
    const user = this.users.get(reset.userId)
    if (user) {
      this.users.set(reset.userId, { ...user, passwordHash, updatedAt: new Date() })
    }
    this.passwordResets.set(reset.id, { ...reset, used: true })

    // Invalidate sessions
    for (const [id, rt] of this.refreshTokens) {
      if (rt.userId === reset.userId) this.refreshTokens.delete(id)
    }
    for (const [id, s] of this.sessions) {
      if (s.userId === reset.userId) this.sessions.delete(id)
    }

    return { success: true, data: { message: 'Password has been reset successfully.' } }
  }

  async verifyEmail(token: string) {
    const verification = Array.from(this.emailVerifications.values()).find(ev => ev.token === token)
    if (!verification || verification.expiresAt < new Date()) {
      return { success: false, error: 'BAD_REQUEST', message: 'Invalid or expired verification token' }
    }
    const user = this.users.get(verification.userId)
    if (user) {
      this.users.set(verification.userId, { ...user, emailVerified: true, updatedAt: new Date() })
    }
    this.emailVerifications.delete(verification.id)
    return { success: true, data: { message: 'Email verified successfully.' } }
  }

  // ============================================================
 // USER OPERATIONS
  // ============================================================

  async getUser(userId: string) {
    const user = this.users.get(userId)
    if (!user) return null
    return {
      id: user.id, email: user.email, name: user.name, role: user.role,
      avatar: user.avatar, emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled, createdAt: user.createdAt, updatedAt: user.updatedAt,
    }
  }

  async getUserOrganizations(userId: string) {
    const memberOf = Array.from(this.orgMembers.values()).filter(m => m.userId === userId)
    return memberOf.map(m => {
      const org = this.organizations.get(m.organizationId)!
      const members = Array.from(this.orgMembers.values()).filter(om => om.organizationId === org.id).length
      const projects = Array.from(this.projects.values()).filter(p => p.organizationId === org.id).length
      const agents = Array.from(this.agents.values()).filter(a => a.organizationId === org.id).length
      return {
        ...org,
        role: m.role,
        _count: { members, projects, agents },
      }
    })
  }

  async updateUser(userId: string, data: { name?: string; avatar?: string }) {
    const user = this.users.get(userId)
    if (!user) return null
    const updated = { ...user, ...data, updatedAt: new Date() }
    this.users.set(userId, updated)
    return {
      id: updated.id, email: updated.email, name: updated.name, role: updated.role,
      avatar: updated.avatar, emailVerified: updated.emailVerified,
      twoFactorEnabled: updated.twoFactorEnabled, createdAt: updated.createdAt, updatedAt: updated.updatedAt,
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = this.users.get(userId)
    if (!user || !user.passwordHash) return { success: false, error: 'UNAUTHORIZED', message: 'Invalid current password' }
    const isValid = await comparePassword(currentPassword, user.passwordHash)
    if (!isValid) return { success: false, error: 'UNAUTHORIZED', message: 'Invalid current password' }
    const passwordHash = await hashPassword(newPassword)
    this.users.set(userId, { ...user, passwordHash, updatedAt: new Date() })
    return { success: true, data: { message: 'Password changed successfully' } }
  }

  // ============================================================
 // ORGANIZATION OPERATIONS
  // ============================================================

  async listOrganizations(userId: string) {
    const memberOf = Array.from(this.orgMembers.values()).filter(m => m.userId === userId)
    return memberOf.map(m => {
      const org = this.organizations.get(m.organizationId)!
      const memberCount = Array.from(this.orgMembers.values()).filter(om => om.organizationId === org.id).length
      const projectCount = Array.from(this.projects.values()).filter(p => p.organizationId === org.id).length
      const agentCount = Array.from(this.agents.values()).filter(a => a.organizationId === org.id).length
      return { ...org, role: m.role, _count: { members: memberCount, projects: projectCount, agents: agentCount } }
    })
  }

  async createOrganization(userId: string, name: string, slug: string) {
    // Check slug uniqueness
    for (const org of this.organizations.values()) {
      if (org.slug === slug) return { success: false, error: 'CONFLICT', message: 'Slug already taken' }
    }
    const orgId = uid()
    const org: DemoOrganization = {
      id: orgId, name, slug, ownerId: userId, plan: 'FREE',
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.organizations.set(orgId, org)
    const member: DemoOrgMember = {
      id: uid(), organizationId: orgId, userId, role: 'OWNER',
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.orgMembers.set(member.id, member)
    return { success: true, data: org }
  }

  async getOrgMembership(userId: string, orgId: string) {
    return Array.from(this.orgMembers.values()).find(m => m.userId === userId && m.organizationId === orgId) || null
  }

  // ============================================================
  // AGENT OPERATIONS
  // ============================================================

  async listAgents(organizationId: string) {
    return Array.from(this.agents.values())
      .filter(a => a.organizationId === organizationId)
      .map(a => ({
        ...a,
        provider: this.aiProviders.get(a.providerId) || null,
        _count: { conversations: Array.from(this.conversations.values()).filter(c => c.agentId === a.id).length },
      }))
  }

  async getAgent(agentId: string) {
    const agent = this.agents.get(agentId)
    if (!agent) return null
    return {
      ...agent,
      provider: this.aiProviders.get(agent.providerId) || null,
      organization: this.organizations.get(agent.organizationId) || null,
      _count: { conversations: Array.from(this.conversations.values()).filter(c => c.agentId === agentId).length },
    }
  }

  async createAgent(data: {
    name: string; description?: string; organizationId: string; providerId: string;
    model: string; systemPrompt?: string; temperature?: number; maxTokens?: number; welcomeMessage?: string
  }) {
    const agent: DemoAgent = {
      id: uid(), name: data.name, description: data.description || null,
      organizationId: data.organizationId, providerId: data.providerId, model: data.model,
      systemPrompt: data.systemPrompt || null, temperature: data.temperature ?? 0.7,
      maxTokens: data.maxTokens ?? 2048, isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.agents.set(agent.id, agent)
    return { success: true, data: agent }
  }

  async updateAgent(agentId: string, data: Record<string, unknown>) {
    const agent = this.agents.get(agentId)
    if (!agent) return null
    const updated = { ...agent, ...data, updatedAt: new Date() } as DemoAgent
    this.agents.set(agentId, updated)
    return updated
  }

  async deleteAgent(agentId: string) {
    this.agents.delete(agentId)
    // Delete related conversations
    for (const [id, c] of this.conversations) {
      if (c.agentId === agentId) {
        this.conversations.delete(id)
        // Delete messages
        for (const [mid, m] of this.messages) {
          if (m.conversationId === id) this.messages.delete(mid)
        }
      }
    }
    return true
  }

  // ============================================================
  // AI PROVIDER OPERATIONS
  // ============================================================

  async listProviders(organizationId: string) {
    return Array.from(this.aiProviders.values()).filter(p => p.organizationId === organizationId)
  }

  async getProvider(providerId: string) {
    return this.aiProviders.get(providerId) || null
  }

  // ============================================================
  // CONVERSATION OPERATIONS
  // ============================================================

  async listConversations(userId: string, agentId?: string, limit = 20, offset = 0) {
    let convs = Array.from(this.conversations.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    if (agentId) convs = convs.filter(c => c.agentId === agentId)
    const total = convs.length
    convs = convs.slice(offset, offset + limit)
    return {
      data: convs.map(c => ({
        ...c,
        agent: this.agents.get(c.agentId) ? { id: c.agentId, name: this.agents.get(c.agentId)!.name, model: this.agents.get(c.agentId)!.model } : null,
        _count: { messages: Array.from(this.messages.values()).filter(m => m.conversationId === c.id).length },
      })),
      pagination: { total, limit, offset },
    }
  }

  async getConversation(convId: string) {
    const conv = this.conversations.get(convId)
    if (!conv) return null
    const msgs = Array.from(this.messages.values())
      .filter(m => m.conversationId === convId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return {
      ...conv,
      agent: this.agents.get(conv.agentId) ? { id: conv.agentId, name: this.agents.get(conv.agentId)!.name, model: this.agents.get(conv.agentId)!.model } : null,
      messages: msgs,
    }
  }

  async createConversation(agentId: string, userId: string, title?: string) {
    const conv: DemoConversation = {
      id: uid(), agentId, userId, title: title || null,
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.conversations.set(conv.id, conv)
    return conv
  }

  async deleteConversation(convId: string) {
    this.conversations.delete(convId)
    for (const [mid, m] of this.messages) {
      if (m.conversationId === convId) this.messages.delete(mid)
    }
    return true
  }

  async addMessage(conversationId: string, role: string, content: string, tokens?: number) {
    const msg: DemoMessage = {
      id: uid(), conversationId, role, content,
      tokens: tokens || null, createdAt: new Date(),
    }
    this.messages.set(msg.id, msg)
    // Update conversation updatedAt
    const conv = this.conversations.get(conversationId)
    if (conv) this.conversations.set(conversationId, { ...conv, updatedAt: new Date() })
    return msg
  }

  async getConversationMessages(conversationId: string) {
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  // ============================================================
  // PROJECT OPERATIONS
  // ============================================================

  async listProjects(organizationId: string) {
    return Array.from(this.projects.values())
      .filter(p => p.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async createProject(data: { name: string; description?: string; organizationId: string }) {
    const project: DemoProject = {
      id: uid(), name: data.name, description: data.description || null,
      organizationId: data.organizationId, status: 'ACTIVE',
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.projects.set(project.id, project)
    return project
  }

  // ============================================================
  // NOTIFICATION OPERATIONS
  // ============================================================

  async listNotifications(userId: string, unreadOnly = false, limit = 20, offset = 0) {
    let notifs = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    if (unreadOnly) notifs = notifs.filter(n => !n.read)
    const unreadCount = notifs.filter(n => !n.read).length
    const total = notifs.length
    notifs = notifs.slice(offset, offset + limit)
    return { data: notifs, pagination: { total, limit, offset }, unreadCount }
  }

  async markNotificationsRead(userId: string, ids?: string[], markAll = false) {
    if (markAll) {
      for (const [id, n] of this.notifications) {
        if (n.userId === userId) this.notifications.set(id, { ...n, read: true })
      }
    } else if (ids) {
      for (const id of ids) {
        const n = this.notifications.get(id)
        if (n && n.userId === userId) this.notifications.set(id, { ...n, read: true })
      }
    }
    return { success: true }
  }

  // ============================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================

  async listSubscriptions(userId: string) {
    return Array.from(this.subscriptions.values())
      .filter(s => s.userId === userId)
      .map(s => ({
        ...s,
        organization: s.organizationId ? this.organizations.get(s.organizationId) : null,
      }))
  }

  async createSubscription(userId: string, data: { organizationId: string; planId: string }) {
    const planMap: Record<string, { priceId: string; name: string }> = {
      starter: { priceId: 'price_starter_monthly', name: 'Starter' },
      pro: { priceId: 'price_pro_monthly', name: 'Pro' },
      enterprise: { priceId: 'price_enterprise_monthly', name: 'Enterprise' },
    }
    const plan = planMap[data.planId] || planMap.starter
    const sub: DemoSubscription = {
      id: uid(), userId, organizationId: data.organizationId,
      stripeCustomerId: `cus_demo_${Date.now()}`, stripePriceId: plan.priceId,
      stripeSubscriptionId: `sub_demo_${Date.now()}`, status: 'ACTIVE',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(), updatedAt: new Date(),
    }
    this.subscriptions.set(sub.id, sub)

    // Update org plan
    const org = this.organizations.get(data.organizationId)
    if (org) {
      const planName = data.planId.toUpperCase() as 'STARTER' | 'PRO' | 'ENTERPRISE'
      this.organizations.set(data.organizationId, { ...org, plan: planName, updatedAt: new Date() })
    }

    return {
      success: true,
      data: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?subscription=success`, subscriptionId: sub.id },
    }
  }

  // ============================================================
  // API KEY OPERATIONS
  // ============================================================

  async listApiKeys(userId: string) {
    return Array.from(this.apiKeys.values()).filter(k => k.userId === userId)
  }

  // ============================================================
  // HEALTH
  // ============================================================

  getStatus() {
    return {
      status: 'demo',
      mode: 'Demo Mode — No Database Connected',
      userCount: this.users.size,
      agentCount: this.agents.size,
      conversationCount: this.conversations.size,
    }
  }
}

// Singleton
let _instance: DemoService | null = null

export function getDemoService(): DemoService {
  if (!_instance) _instance = new DemoService()
  return _instance
}

export default DemoService
