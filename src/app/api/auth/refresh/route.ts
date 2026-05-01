import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { verifyToken, generateTokenPair } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError } from '@/lib/api-errors'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const refreshToken = request.cookies.get('refresh-token')?.value 
      || (await request.json().catch(() => ({})))?.refreshToken

    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided')
    }

    // Verify the JWT
    let payload
    try {
      payload = verifyToken(refreshToken)
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token')
    }

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      const demo = getDemoService()
      const demoResult = await demo.refreshAccessToken(refreshToken)

      if (!demoResult.success) {
        throw new UnauthorizedError(demoResult.message)
      }

      const tokens = demoResult.data!.tokens
      const response = NextResponse.json({
        success: true,
        data: {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
          demoMode: true,
        },
      })

      // Set updated cookies
      response.cookies.set('access-token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
        path: '/',
      })
      response.cookies.set('refresh-token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })

      return response
    }

    // --- Database path ---
    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Token not found or expired - delete if exists
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } })
      }
      throw new UnauthorizedError('Refresh token has expired. Please log in again.')
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    })

    // Rotate refresh token (delete old, create new)
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({ where: { id: storedToken.id } })
      
      await tx.refreshToken.create({
        data: {
          userId: payload.userId,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      // Update session
      await tx.session.upsert({
        where: { token: refreshToken },
        create: {
          userId: payload.userId,
          token: tokens.accessToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        update: {
          token: tokens.accessToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      })
    })

    // Build response
    const response = NextResponse.json({
      success: true,
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    })

    // Set updated cookies
    response.cookies.set('access-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })
    response.cookies.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
