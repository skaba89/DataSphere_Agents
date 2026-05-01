import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateRandomToken } from '@/lib/auth'
import { formatErrorResponse, BadRequestError, NotFoundError } from '@/lib/api-errors'
import { forgotPasswordSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = forgotPasswordSchema.safeParse(body)
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

    const { email } = result.data

    // Find user (but don't reveal if user exists for security)
    const user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // Invalidate any existing password reset tokens
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      })

      // Create new password reset token
      const token = generateRandomToken()
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      })

      // In production, send email with reset link
      // For development, we return the token
      console.log(`Password reset token for ${email}: ${token}`)
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({
      success: true,
      data: {
        message: 'If an account with this email exists, a password reset link has been sent.',
        // In development, include the token for testing
        ...(process.env.NODE_ENV === 'development' && user ? { resetToken: (await prisma.passwordReset.findFirst({ where: { userId: user.id, used: false }, orderBy: { createdAt: 'desc' } }))?.token } : {}),
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
