import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { getUserFromRequest, verifyToken } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError } from '@/lib/api-errors'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      // Also try cookies
      const accessToken = request.cookies.get('access-token')?.value
      if (!accessToken) throw new UnauthorizedError()
    }

    // Get user ID from token or cookie
    let userId = user?.userId
    if (!userId) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try {
          const payload = verifyToken(accessToken)
          userId = payload.userId
        } catch {
          throw new UnauthorizedError()
        }
      }
    }

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable && userId) {
      const demo = getDemoService()
      demo.logout(userId)

      // Build response and clear cookies
      const response = NextResponse.json({
        success: true,
        data: { message: 'Logged out successfully', demoMode: true },
      })

      response.cookies.set('access-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      response.cookies.set('refresh-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })

      return response
    }

    // --- Database path ---
    // Delete refresh tokens
    if (userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } }).catch(() => {})
      await prisma.session.deleteMany({ where: { userId } }).catch(() => {})

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'LOGOUT',
          resource: 'User',
          resourceId: userId,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0],
        },
      }).catch(() => {})
    }

    // Build response and clear cookies
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    })

    response.cookies.set('access-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
