<<<<<<< HEAD
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
=======
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const { id, markAll } = await req.json();

    if (markAll) {
      await db.notification.updateMany({
        where: { userId: payload.userId, read: false },
        data: { read: true },
      });
    } else if (id) {
      await db.notification.update({
        where: { id },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
  }
}
