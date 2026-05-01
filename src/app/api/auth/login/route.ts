import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { comparePassword, generateTokenPair } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, ServiceUnavailableError } from '@/lib/api-errors'
import { loginSchema } from '@/lib/validations/auth'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = loginSchema.safeParse(body)
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

    const { email, password } = result.data

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      const demo = getDemoService()
      const demoResult = await demo.login(email, password)

      if (!demoResult.success) {
        throw new UnauthorizedError(demoResult.message)
      }

      const response = NextResponse.json({
        success: true,
        data: {
          ...demoResult.data,
          demoMode: true,
        },
      })

      const tokens = demoResult.data!.tokens
      response.cookies.set('access-token', tokens.accessToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60, path: '/',
      })
      response.cookies.set('refresh-token', tokens.refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/',
      })
      return response
    }

    // --- Database path ---
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password')
    }

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role })

    await prisma.refreshToken.create({
      data: { userId: user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })
    await prisma.session.create({
      data: { userId: user.id, token: tokens.accessToken, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    })
    await prisma.auditLog.create({
      data: {
        userId: user.id, action: 'LOGIN', resource: 'User', resourceId: user.id,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip'),
      },
    })

    const response = NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, emailVerified: user.emailVerified, twoFactorEnabled: user.twoFactorEnabled },
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
      },
    })

    response.cookies.set('access-token', tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60, path: '/' })
    response.cookies.set('refresh-token', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/' })
    return response
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
