import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { formatErrorResponse, BadRequestError } from '@/lib/api-errors'
import { verifyEmailSchema } from '@/lib/validations/auth'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = verifyEmailSchema.safeParse(body)
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

    const { token } = result.data

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      const demo = getDemoService()
      const demoResult = await demo.verifyEmail(token)

      if (!demoResult.success) {
        throw new BadRequestError(demoResult.message || 'Invalid or expired verification token')
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
    // Find verification token
    const verification = await prisma.emailVerification.findUnique({ where: { token } })
    if (!verification) {
      throw new BadRequestError('Invalid verification token')
    }

    // Check if expired
    if (verification.expiresAt < new Date()) {
      throw new BadRequestError('Verification token has expired. Please request a new one.')
    }

    // Mark email as verified
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      })

      // Delete the verification token
      await tx.emailVerification.delete({
        where: { id: verification.id },
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: verification.userId,
          action: 'EMAIL_VERIFIED',
          resource: 'User',
          resourceId: verification.userId,
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Email verified successfully.' },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
