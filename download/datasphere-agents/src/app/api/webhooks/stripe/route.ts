import { NextRequest, NextResponse } from 'next/server'

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    // In production, verify the webhook signature using Stripe SDK:
    // const signature = request.headers.get('stripe-signature')
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // For now, parse the body directly (development only)
    let event: Record<string, unknown>
    try {
      event = JSON.parse(body)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      )
    }

    const eventType = event.type as string

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data as Record<string, unknown>
        // Handle successful checkout
        console.log('Checkout completed:', session)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data as Record<string, unknown>
        // Handle subscription creation
        console.log('Subscription created:', subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data as Record<string, unknown>
        // Handle subscription update
        console.log('Subscription updated:', subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data as Record<string, unknown>
        // Handle subscription cancellation
        console.log('Subscription deleted:', subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data as Record<string, unknown>
        // Handle successful payment
        console.log('Invoice paid:', invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data as Record<string, unknown>
        // Handle failed payment
        console.log('Invoice payment failed:', invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${eventType}`)
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
