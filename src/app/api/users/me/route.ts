import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getUserFromRequest, verifyToken } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError } from '@/lib/api-errors'
import { updateProfileSchema } from '@/lib/validations/user'

// GET /api/users/me - Get current user profile
export async function GET(request: NextRequest) {
  try {
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

    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        organizations: {
          select: {
            id: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                _count: { select: { members: true, agents: true, projects: true } },
              },
            },
          },
        },
      },
    })

    if (!fullUser) throw new UnauthorizedError()

    return NextResponse.json({ success: true, data: fullUser })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// PATCH /api/users/me - Update current user profile
export async function PATCH(request: NextRequest) {
  try {
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
    const result = updateProfileSchema.safeParse(body)
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

    const updated = await prisma.user.update({
      where: { id: user.userId },
      data: result.data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        emailVerified: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
