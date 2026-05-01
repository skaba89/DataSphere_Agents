import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { hashPassword, generateTokenPair, generateRandomToken } from '@/lib/auth'
import { formatErrorResponse, ConflictError } from '@/lib/api-errors'
import { registerSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = registerSchema.safeParse(body)
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

    const { name, email, password } = result.data

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictError('User with this email already exists')

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user with default organization in a transaction
    const result_data = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          passwordHash,
          emailVerified: false,
        },
      })

      // Create default organization
      const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-' + Date.now().toString(36)
      const org = await tx.organization.create({
        data: {
          name: `${user.name}'s Organization`,
          slug,
          ownerId: user.id,
          plan: 'FREE',
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      })

      // Create default AI provider (placeholder)
      const provider = await tx.aiProvider.create({
        data: {
          name: 'OpenAI (Default)',
          type: 'OPENAI',
          apiKey: 'sk-placeholder-add-your-key',
          organizationId: org.id,
          isActive: false,
        },
      })

      // Create email verification token
      const verificationToken = generateRandomToken()
      await tx.emailVerification.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      // Create welcome notification
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'INFO',
          title: 'Welcome to DataSphere Agents!',
          message: 'Your account has been created. Start by setting up an AI provider and creating your first agent.',
        },
      })

      return { user, org, provider, verificationToken }
    })

    // Generate token pair
    const tokens = generateTokenPair({
      userId: result_data.user.id,
      email: result_data.user.email,
      role: result_data.user.role,
    })

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: result_data.user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Build response
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: result_data.user.id,
          email: result_data.user.email,
          name: result_data.user.name,
          role: result_data.user.role,
          emailVerified: result_data.user.emailVerified,
        },
        organization: {
          id: result_data.org.id,
          name: result_data.org.name,
          slug: result_data.org.slug,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        verificationToken: process.env.NODE_ENV === 'development' ? result_data.verificationToken : undefined,
      },
    }, { status: 201 })

    // Set httpOnly cookies
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
