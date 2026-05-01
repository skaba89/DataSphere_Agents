import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError, ConflictError } from '@/lib/api-errors'

// GET /api/organizations - List organizations for the user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: { userId: user.userId },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
            agents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: organizations })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) throw new BadRequestError('name and slug are required')

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) throw new ConflictError('Organization slug already exists')

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        ownerId: user.userId,
        members: {
          create: {
            userId: user.userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        _count: {
          select: { members: true, projects: true, agents: true },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_ORGANIZATION',
        resource: 'Organization',
        resourceId: organization.id,
        details: { name, slug },
      },
    })

    return NextResponse.json({ success: true, data: organization }, { status: 201 })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
