import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { hashPassword, generateTokenPair, generateRandomToken } from '@/lib/auth'
import { formatErrorResponse, BadRequestError, ConflictError, UnauthorizedError } from '@/lib/api-errors'

// GET /api/users - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) throw new UnauthorizedError()

    // Simple token extraction for demo
    const token = authHeader.replace('Bearer ', '')
    if (!token) throw new UnauthorizedError()

    // In production, verify JWT token properly
    // For now, return a basic response
    return NextResponse.json({
      success: true,
      data: {
        id: 'current-user',
        message: 'User profile endpoint - implement JWT verification for production',
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/users - Register a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      throw new BadRequestError('Email and password are required')
    }

    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters')
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictError('User with this email already exists')

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Create email verification token
    const verificationToken = generateRandomToken()
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          user,
          tokens,
          verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
