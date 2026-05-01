import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { formatErrorResponse, BadRequestError } from '@/lib/api-errors'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = resetPasswordSchema.safeParse(body)
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

    const { token, password } = result.data

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      const demo = getDemoService()
      const demoResult = await demo.resetPassword(token, password)

      if (!demoResult.success) {
        throw new BadRequestError(demoResult.message || 'Invalid or expired reset token')
      }

      return NextResponse.json({
        success: true,
        data: {
          ...demoResult.data,
          demoMode: true,
        },
      })
    }

    // --- Database path ---
    // Find the reset token
    const resetToken = await prisma.passwordReset.findUnique({ where: { token } })
    if (!resetToken) {
      throw new BadRequestError('Invalid or expired reset token')
    }

    // Check if token is expired or already used
    if (resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestError('Reset token has expired. Please request a new one.')
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update user password and mark token as used in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      })

      await tx.passwordReset.update({
        where: { id: resetToken.id },
        data: { used: true },
      })

      // Invalidate all refresh tokens (force re-login)
      await tx.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      })

      // Delete all sessions
      await tx.session.deleteMany({
        where: { userId: resetToken.userId },
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: resetToken.userId,
          action: 'PASSWORD_RESET',
          resource: 'User',
          resourceId: resetToken.userId,
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Password has been reset successfully. Please log in with your new password.' },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
