import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError, ForbiddenError } from '@/lib/api-errors'

// GET /api/agents - List agents for the user's organization
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const activeOnly = searchParams.get('active') === 'true'

    if (!organizationId) throw new BadRequestError('organizationId is required')

    // Verify user is member of organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.userId,
        },
      },
    })

    if (!membership) throw new ForbiddenError('Not a member of this organization')

    const where: Record<string, unknown> = { organizationId }
    if (activeOnly) where.isActive = true

    const agents = await prisma.agent.findMany({
      where,
      include: {
        provider: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: agents })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { name, description, organizationId, providerId, model, systemPrompt, temperature, maxTokens } = body

    if (!name || !organizationId || !providerId || !model) {
      throw new BadRequestError('name, organizationId, providerId, and model are required')
    }

    // Verify user is admin/owner of organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.userId,
        },
      },
    })

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new ForbiddenError('Only admins can create agents')
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        organizationId,
        providerId,
        model,
        systemPrompt,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 2048,
      },
      include: {
        provider: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_AGENT',
        resource: 'Agent',
        resourceId: agent.id,
        details: { name: agent.name, organizationId },
      },
    })

    return NextResponse.json({ success: true, data: agent }, { status: 201 })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
