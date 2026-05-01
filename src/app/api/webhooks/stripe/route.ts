import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import Stripe from 'stripe'

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    let event: Stripe.Event

    // Verify webhook signature if Stripe is configured
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && signature) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-04-22.dahlia',
      })

      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        )
      } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 400 }
        )
      }
    } else {
      // Development mode - parse body directly
      try {
        event = JSON.parse(body) as Stripe.Event
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid payload' },
          { status: 400 }
        )
      }
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const organizationId = session.metadata?.organizationId || null

        if (userId) {
          // Create or update subscription
          await prisma.subscription.upsert({
            where: { stripeCustomerId: session.customer as string },
            create: {
              userId,
              organizationId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.line_items?.data[0]?.price?.id,
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            update: {
              status: 'ACTIVE',
              stripeSubscriptionId: session.subscription as string,
            },
          })

          // Update organization plan
          if (organizationId) {
            const priceId = session.line_items?.data[0]?.price?.id
            let plan = 'FREE'
            if (priceId === process.env.STRIPE_STARTER_PRICE_ID) plan = 'STARTER'
            else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'PRO'
            else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) plan = 'ENTERPRISE'

            await prisma.organization.update({
              where: { id: organizationId },
              data: { plan: plan as 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE' },
            })
          }

          // Create notification
          await prisma.notification.create({
            data: {
              userId,
              type: 'SUCCESS',
              title: 'Subscription activated',
              message: 'Your subscription has been activated successfully.',
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status.toUpperCase() as 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'TRIALING',
            currentPeriodStart: new Date((subscription as unknown as Record<string, unknown>).current_period_start as number * 1000),
            currentPeriodEnd: new Date((subscription as unknown as Record<string, unknown>).current_period_end as number * 1000),
            stripePriceId: subscription.items.data[0]?.price.id,
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'CANCELED' },
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const sub = await prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        })

        if (sub) {
          await prisma.invoice.create({
            data: {
              subscriptionId: sub.id,
              stripeInvoiceId: invoice.id,
              amount: invoice.amount_paid,
              status: 'PAID',
              pdfUrl: invoice.invoice_pdf || undefined,
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer as string },
          data: { status: 'PAST_DUE' },
        })
        break
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
