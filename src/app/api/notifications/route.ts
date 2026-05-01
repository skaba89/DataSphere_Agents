import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError } from '@/lib/api-errors'

// GET /api/notifications - List notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      const result = await demo.listNotifications(user.userId, unreadOnly, limit, skip)

      return NextResponse.json({
        success: true,
        data: result.data,
        meta: {
          unreadCount: result.unreadCount,
          pagination: {
            page,
            limit,
            total: result.pagination.total,
            totalPages: Math.ceil(result.pagination.total / limit),
          },
        },
        demoMode: true,
      })
    }

    const where: Record<string, unknown> = { userId: user.userId }
    if (unreadOnly) where.read = false

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user.userId, read: false },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: {
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { notificationIds, markAll } = body

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      await demo.markNotificationsRead(user.userId, notificationIds, markAll)

      return NextResponse.json({ success: true, message: 'Notifications updated', demoMode: true })
    }

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.userId, read: false },
        data: { read: true },
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.userId,
        },
        data: { read: true },
      })
    } else {
      throw new BadRequestError('Provide notificationIds or markAll')
    }

    return NextResponse.json({ success: true, message: 'Notifications updated' })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
