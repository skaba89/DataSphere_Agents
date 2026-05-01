#!/usr/bin/env tsx
/**
 * DataSphere Agents - Database Seed Script
 * Seeds the database with initial data for development/testing
 * 
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/seed.ts
 */

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const connectionString = process.env.DATABASE_URL || 'postgresql://datasphere:datasphere_dev@localhost:5432/datasphere_agents'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️  Cleaning existing data...')
    await prisma.message.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.dataMetric.deleteMany()
    await prisma.workflowExecution.deleteMany()
    await prisma.workflow.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.apiKey.deleteMany()
    await prisma.agent.deleteMany()
    await prisma.aiProvider.deleteMany()
    await prisma.project.deleteMany()
    await prisma.organizationMember.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.setting.deleteMany()
    await prisma.fileUpload.deleteMany()
    await prisma.integration.deleteMany()
    await prisma.webhook.deleteMany()
    await prisma.template.deleteMany()
    await prisma.refreshToken.deleteMany()
    await prisma.passwordReset.deleteMany()
    await prisma.emailVerification.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  }

  // Create admin user
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@datasphere.agents',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  })
  console.log(`✅ Created admin user: ${admin.email}`)

  // Create demo user
  const demoPassword = await hash('demo123', 12)
  const demo = await prisma.user.create({
    data: {
      email: 'demo@datasphere.agents',
      name: 'Demo User',
      passwordHash: demoPassword,
      role: 'USER',
      emailVerified: true,
    },
  })
  console.log(`✅ Created demo user: ${demo.email}`)

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'DataSphere Inc.',
      slug: 'datasphere',
      ownerId: admin.id,
      plan: 'PRO',
    },
  })
  console.log(`✅ Created organization: ${org.name}`)

  // Add members
  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: admin.id, role: 'OWNER' },
      { organizationId: org.id, userId: demo.id, role: 'MEMBER' },
    ],
  })

  // Create project
  const project = await prisma.project.create({
    data: {
      name: 'AI Assistant Project',
      description: 'Main AI assistant development project',
      organizationId: org.id,
    },
  })
  console.log(`✅ Created project: ${project.name}`)

  // Create AI provider
  const provider = await prisma.aiProvider.create({
    data: {
      name: 'OpenAI GPT-4',
      type: 'OPENAI',
      apiKey: 'sk-demo-key-not-real',
      organizationId: org.id,
    },
  })
  console.log(`✅ Created AI provider: ${provider.name}`)

  // Create agents
  const agent1 = await prisma.agent.create({
    data: {
      name: 'Customer Support Agent',
      description: 'Handles customer support inquiries',
      organizationId: org.id,
      providerId: provider.id,
      model: 'gpt-4',
      systemPrompt: 'You are a helpful customer support agent. Be polite and professional.',
      temperature: 0.7,
      maxTokens: 2048,
    },
  })

  const agent2 = await prisma.agent.create({
    data: {
      name: 'Code Assistant',
      description: 'Helps with coding questions',
      organizationId: org.id,
      providerId: provider.id,
      model: 'gpt-4',
      systemPrompt: 'You are a coding assistant. Help with programming questions and code reviews.',
      temperature: 0.3,
      maxTokens: 4096,
    },
  })
  console.log(`✅ Created ${2} agents`)

  // Create conversations
  const conv1 = await prisma.conversation.create({
    data: {
      agentId: agent1.id,
      userId: demo.id,
      title: 'How to reset password',
    },
  })

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        role: 'USER',
        content: 'How do I reset my password?',
        tokens: 8,
      },
      {
        conversationId: conv1.id,
        role: 'ASSISTANT',
        content: 'To reset your password, go to Settings > Security > Change Password. You can also use the "Forgot Password" link on the login page.',
        tokens: 28,
      },
    ],
  })
  console.log(`✅ Created demo conversation`)

  // Create API key
  await prisma.apiKey.create({
    data: {
      name: 'Development API Key',
      key: `dsa_${uuidv4().replace(/-/g, '')}`,
      userId: admin.id,
      organizationId: org.id,
    },
  })
  console.log(`✅ Created API key`)

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: demo.id,
        type: 'INFO',
        title: 'Welcome to DataSphere Agents!',
        message: 'Your account has been set up. Start by creating your first AI agent.',
      },
      {
        userId: admin.id,
        type: 'SUCCESS',
        title: 'Organization Created',
        message: 'Your organization "DataSphere Inc." has been created successfully.',
      },
    ],
  })

  // Create subscription
  await prisma.subscription.create({
    data: {
      userId: admin.id,
      organizationId: org.id,
      stripeCustomerId: 'cus_demo',
      stripePriceId: 'price_pro_monthly',
      stripeSubscriptionId: 'sub_demo',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // Create settings
  await prisma.setting.createMany({
    data: [
      { userId: admin.id, key: 'theme', value: 'dark' },
      { userId: admin.id, key: 'notifications_email', value: 'true' },
      { userId: demo.id, key: 'theme', value: 'light' },
    ],
  })

  console.log('\n✨ Seeding complete!')
  console.log('\n📋 Login Credentials:')
  console.log('   Admin:  admin@datasphere.agents / admin123')
  console.log('   Demo:   demo@datasphere.agents / demo123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
