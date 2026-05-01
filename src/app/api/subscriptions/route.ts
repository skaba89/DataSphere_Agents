import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'
import { getUserFromRequest, verifyToken } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError } from '@/lib/api-errors'
import { createSubscriptionSchema } from '@/lib/validations/subscription'
import Stripe from 'stripe'

// POST /api/subscriptions - Create a Stripe checkout session
export async function POST(request: NextRequest) {
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
    const result = createSubscriptionSchema.safeParse(body)
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

    const { priceId, organizationId } = result.data

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      const subResult = await demo.createSubscription(user.userId, {
        organizationId: organizationId || '',
        planId: 'pro',
      })

      return NextResponse.json({
        success: true,
        data: {
          checkoutUrl: subResult.data?.url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?checkout=demo`,
          mode: 'demo',
          message: 'Running in demo mode. No database available.',
          subscriptionId: subResult.data?.subscriptionId,
        },
        demoMode: true,
      })
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      // Demo mode - return mock checkout
      return NextResponse.json({
        success: true,
        data: {
          checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?checkout=demo`,
          mode: 'demo',
          message: 'Stripe is not configured. Running in demo mode.',
        },
      })
    }

    // Real Stripe integration
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
    })

    // Find or create Stripe customer
    let customerId: string | undefined
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId: user.userId, organizationId: organizationId || null },
    })

    if (existingSubscription?.stripeCustomerId) {
      customerId = existingSubscription.stripeCustomerId
    } else {
      // Create Stripe customer
      const fullUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { email: true, name: true },
      })
      const customer = await stripe.customers.create({
        email: fullUser?.email,
        name: fullUser?.name || undefined,
        metadata: {
          userId: user.userId,
          organizationId: organizationId || '',
        },
      })
      customerId = customer.id
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?checkout=cancelled`,
      metadata: {
        userId: user.userId,
        organizationId: organizationId || '',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// GET /api/subscriptions - Get subscription info
export async function GET(request: NextRequest) {
  try {
    let user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try { user = verifyToken(accessToken) } catch { throw new UnauthorizedError() }
      } else {
        throw new UnauthorizedError()
      }
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      let subscriptions = await demo.listSubscriptions(user.userId)
      if (organizationId) {
        subscriptions = subscriptions.filter((s: Record<string, unknown>) => s.organizationId === organizationId)
      }

      return NextResponse.json({ success: true, data: subscriptions, demoMode: true })
    }

    const where: Record<string, unknown> = { userId: user.userId }
    if (organizationId) where.organizationId = organizationId

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
        organization: { select: { id: true, name: true, plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: subscriptions })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
