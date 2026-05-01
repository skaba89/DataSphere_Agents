import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError, ForbiddenError } from '@/lib/api-errors'

// GET /api/projects - List projects for an organization
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const status = searchParams.get('status')

    if (!organizationId) throw new BadRequestError('organizationId is required')

    // Verify membership
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
    if (status) where.status = status

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { name, description, organizationId } = body

    if (!name || !organizationId) throw new BadRequestError('name and organizationId are required')

    // Verify membership
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.userId,
        },
      },
    })
    if (!membership) throw new ForbiddenError('Not a member of this organization')

    const project = await prisma.project.create({
      data: { name, description, organizationId },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_PROJECT',
        resource: 'Project',
        resourceId: project.id,
        details: { name, organizationId },
      },
    })

    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
