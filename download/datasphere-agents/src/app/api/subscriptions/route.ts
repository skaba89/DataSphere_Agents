import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError } from '@/lib/api-errors'

// GET /api/subscriptions - Get subscription info for user/organization
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    const where: Record<string, unknown> = { userId: user.userId }
    if (organizationId) where.organizationId = organizationId

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: subscriptions })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/subscriptions - Create a new subscription (checkout session)
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { priceId } = body

    if (!priceId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'priceId is required' } },
        { status: 400 }
      )
    }

    // In production, this would create a Stripe checkout session
    // For now, return a mock response
    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing/checkout?session=mock_session`,
        message: 'Stripe checkout would be initiated here',
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
