import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError } from '@/lib/api-errors'

// GET /api/conversations - List conversations for the user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      const result = await demo.listConversations(user.userId, agentId || undefined, limit, skip)

      return NextResponse.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.pagination.total,
          totalPages: Math.ceil(result.pagination.total / limit),
        },
        demoMode: true,
      })
    }

    const where: Record<string, unknown> = { userId: user.userId }
    if (agentId) where.agentId = agentId

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          agent: {
            select: { id: true, name: true, model: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { agentId, title } = body

    if (!agentId) throw new BadRequestError('agentId is required')

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()

      // Verify agent exists and user has access
      const agent = await demo.getAgent(agentId)
      if (!agent) throw new BadRequestError('Agent not found')

      const membership = await demo.getOrgMembership(user.userId, agent.organizationId as string)
      if (!membership) throw new BadRequestError('Not a member of this organization')

      const conversation = await demo.createConversation(agentId, user.userId, title || `Chat with ${(agent as Record<string, unknown>).name}`)

      return NextResponse.json({ success: true, data: conversation, demoMode: true }, { status: 201 })
    }

    // Verify agent exists and user has access
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { organization: { include: { members: true } } },
    })

    if (!agent) throw new BadRequestError('Agent not found')

    const isMember = agent.organization.members.some(
      (m) => m.userId === user.userId
    )
    if (!isMember) throw new BadRequestError('Not a member of this organization')

    const conversation = await prisma.conversation.create({
      data: {
        agentId,
        userId: user.userId,
        title: title || `Chat with ${agent.name}`,
      },
      include: {
        agent: {
          select: { id: true, name: true, model: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: conversation }, { status: 201 })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
