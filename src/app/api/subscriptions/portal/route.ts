import { NextRequest, NextResponse } from 'next/server'
import { isDatabaseAvailable } from '@/lib/db'
import { getUserFromRequest, verifyToken } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError } from '@/lib/api-errors'
import Stripe from 'stripe'

// POST /api/subscriptions/portal - Create a Stripe Customer Portal session
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

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      return NextResponse.json({
        success: true,
        data: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?portal=demo`,
          mode: 'demo',
        },
        demoMode: true,
      })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?portal=demo`,
          mode: 'demo',
        },
      })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
    })

    const body = await request.json().catch(() => ({}))
    const { customerId } = body

    if (!customerId) {
      throw new BadRequestError('customerId is required')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
    })

    return NextResponse.json({
      success: true,
      data: { url: session.url },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
