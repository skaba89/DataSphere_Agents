import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getUserFromRequest, verifyToken } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, NotFoundError, ForbiddenError } from '@/lib/api-errors'
import { updateAgentSchema } from '@/lib/validations/agent'

// GET /api/agents/[id] - Get agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Authenticate
    let user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try { user = verifyToken(accessToken) } catch { throw new UnauthorizedError() }
      } else {
        throw new UnauthorizedError()
      }
    }

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        provider: { select: { id: true, name: true, type: true } },
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { conversations: true } },
      },
    })

    if (!agent) throw new NotFoundError('Agent')

    // Verify access
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: agent.organizationId,
          userId: user.userId,
        },
      },
    })
    if (!membership) throw new ForbiddenError('Not a member of this organization')

    return NextResponse.json({ success: true, data: agent })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// PATCH /api/agents/[id] - Update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Authenticate
    let user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try { user = verifyToken(accessToken) } catch { throw new UnauthorizedError() }
      } else {
        throw new UnauthorizedError()
      }
    }

    const body = await request.json()
    const result = updateAgentSchema.safeParse(body)
    if (!result.success) {
      const errors: Record<string, string[]> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path.join('.')
        if (!errors[key]) errors[key] = []
        errors[key].push(issue.message)
      })
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors } },
        { status: 422 }
      )
    }

    // Verify agent exists and user has admin access
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { organization: { include: { members: true } } },
    })

    if (!agent) throw new NotFoundError('Agent')

    const membership = agent.organization.members.find((m) => m.userId === user.userId)
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new ForbiddenError('Only admins can update agents')
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: result.data,
      include: {
        provider: { select: { id: true, name: true, type: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'UPDATE_AGENT',
        resource: 'Agent',
        resourceId: id,
        details: result.data,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// DELETE /api/agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Authenticate
    let user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try { user = verifyToken(accessToken) } catch { throw new UnauthorizedError() }
      } else {
        throw new UnauthorizedError()
      }
    }

    // Verify agent exists and user has admin access
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { organization: { include: { members: true } } },
    })

    if (!agent) throw new NotFoundError('Agent')

    const membership = agent.organization.members.find((m) => m.userId === user.userId)
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new ForbiddenError('Only admins can delete agents')
    }

    await prisma.agent.delete({ where: { id } })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'DELETE_AGENT',
        resource: 'Agent',
        resourceId: id,
        details: { name: agent.name },
      },
    })

    return NextResponse.json({ success: true, data: { message: 'Agent deleted successfully' } })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
