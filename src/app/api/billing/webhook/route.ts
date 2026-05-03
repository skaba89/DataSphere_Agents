import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/saas/stripe";
import type Stripe from 'stripe';

// Disable body parsing for webhook signature verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeSecret) {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
      // In development, still process the event without verification
      const event = JSON.parse(body) as Stripe.Event;
      await handleWebhookEvent(event);
      return NextResponse.json({ received: true });
    }

    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-04-30.basil',
    });

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(body, sig, stripeSecret);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    await handleWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json(
      { error: "Erreur de traitement du webhook" },
      { status: 500 }
    );
  }
}
