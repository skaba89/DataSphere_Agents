import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'
import { getUserFromRequest, verifyToken, hashPassword, comparePassword } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError } from '@/lib/api-errors'
import { changePasswordSchema } from '@/lib/validations/user'

// PATCH /api/users/me/password - Change password
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
    const result = changePasswordSchema.safeParse(body)
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

    const { currentPassword, newPassword } = result.data

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      const changeResult = await demo.changePassword(user.userId, currentPassword, newPassword)

      if (!changeResult.success) {
        throw new BadRequestError(changeResult.message || 'Current password is incorrect')
      }

      return NextResponse.json({
        success: true,
        data: { message: 'Password updated successfully' },
        demoMode: true,
      })
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, passwordHash: true },
    })

    if (!fullUser?.passwordHash) {
      throw new BadRequestError('No password set for this account')
    }

    const isValid = await comparePassword(currentPassword, fullUser.passwordHash)
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect')
    }

    const newPasswordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.userId },
      data: { passwordHash: newPasswordHash },
    })

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'PASSWORD_CHANGED',
        resource: 'User',
        resourceId: user.userId,
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Password updated successfully' },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
