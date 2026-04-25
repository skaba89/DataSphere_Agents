/**
 * Stripe Integration Module
 * Handles checkout sessions, webhooks, and customer portal
 */

import Stripe from 'stripe';
import { db } from '@/lib/db';
import { PLANS } from './plans';

// Initialize Stripe only if secret key is available
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: '2025-04-30.basil',
  });
}

export { getStripe };

/**
 * Create a Stripe checkout session for subscription upgrade
 */
export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  planName: string;
  billingInterval: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { url: null, error: 'Stripe n\'est pas configuré. Veuillez contacter l\'administrateur.' };
  }

  const plan = PLANS[params.planName];
  if (!plan) {
    return { url: null, error: 'Plan invalide' };
  }

  const priceId = params.billingInterval === 'yearly'
    ? plan.stripePriceIdYearly
    : plan.stripePriceId;

  if (!priceId) {
    return { url: null, error: 'Ce plan n\'est pas encore disponible à l\'achat. Veuillez contacter l\'équipe commerciale.' };
  }

  try {
    // Check if user already has a Stripe customer ID
    let customerId: string | undefined;
    const existingSub = await db.subscription.findUnique({
      where: { userId: params.userId },
    });

    if (existingSub?.stripeCustomerId) {
      customerId = existingSub.stripeCustomerId;
    }

    // Create or reuse customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: params.userEmail,
        metadata: { userId: params.userId },
      });
      customerId = customer.id;
    }

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
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        planName: params.planName,
        billingInterval: params.billingInterval,
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
          planName: params.planName,
        },
        trial_period_days: params.planName === 'pro' ? 14 : undefined,
      },
      allow_promotion_codes: true,
    });

    return { url: session.url };
  } catch (error: any) {
    console.error('[Stripe] Checkout session error:', error.message);
    return { url: null, error: `Erreur Stripe: ${error.message}` };
  }
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession(params: {
  userId: string;
  returnUrl: string;
}): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { url: null, error: 'Stripe n\'est pas configuré.' };
  }

  try {
    const subscription = await db.subscription.findUnique({
      where: { userId: params.userId },
    });

    if (!subscription?.stripeCustomerId) {
      return { url: null, error: 'Aucun client Stripe trouvé. Veuillez d\'abord souscrire à un plan.' };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: params.returnUrl,
    });

    return { url: session.url };
  } catch (error: any) {
    console.error('[Stripe] Portal session error:', error.message);
    return { url: null, error: `Erreur Stripe: ${error.message}` };
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDelete(subscription);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoiceFailed(invoice);
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planName = session.metadata?.planName;
  const billingInterval = session.metadata?.billingInterval as 'monthly' | 'yearly';

  if (!userId || !planName) {
    console.error('[Stripe Webhook] Missing metadata in checkout session');
    return;
  }

  // Find or create the plan in DB
  const plan = await db.plan.findUnique({ where: { name: planName } });
  if (!plan) {
    console.error(`[Stripe Webhook] Plan not found: ${planName}`);
    return;
  }

  // Get subscription details from Stripe
  const stripe = getStripe();
  if (!stripe) return;

  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Upsert subscription
  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId: plan.id,
      status: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubId: stripeSubscription.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      billingInterval: billingInterval || 'monthly',
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
    },
    update: {
      planId: plan.id,
      status: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubId: stripeSubscription.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      billingInterval: billingInterval || 'monthly',
    },
  });

  console.log(`[Stripe Webhook] Subscription activated for user ${userId}, plan: ${planName}`);
}

async function handleSubscriptionUpdate(stripeSub: Stripe.Subscription) {
  const userId = stripeSub.metadata?.userId;
  if (!userId) return;

  const planName = stripeSub.metadata?.planName;
  if (planName) {
    const plan = await db.plan.findUnique({ where: { name: planName } });
    if (plan) {
      await db.subscription.update({
        where: { userId },
        data: {
          planId: plan.id,
          status: stripeSub.status === 'active' ? 'active' :
                  stripeSub.status === 'trialing' ? 'trialing' :
                  stripeSub.status === 'past_due' ? 'past_due' : 'canceled',
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      });
    }
  }
}

async function handleSubscriptionDelete(stripeSub: Stripe.Subscription) {
  const userId = stripeSub.metadata?.userId;
  if (!userId) return;

  // Downgrade to free plan
  const freePlan = await db.plan.findUnique({ where: { name: 'free' } });
  if (freePlan) {
    await db.subscription.update({
      where: { userId },
      data: {
        planId: freePlan.id,
        status: 'canceled',
        cancelAtPeriodEnd: false,
      },
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await db.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) return;

  // Create invoice record
  await db.invoice.create({
    data: {
      subscriptionId: subscription.id,
      amount: (invoice.amount_paid / 100), // Convert cents to EUR
      currency: invoice.currency || 'eur',
      status: 'paid',
      stripeInvoiceId: invoice.id,
      stripeInvoiceUrl: invoice.hosted_invoice_url,
      paidAt: new Date(),
    },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await db.subscription.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) return;

  // Update subscription status
  await db.subscription.update({
    where: { id: subscription.id },
    data: { status: 'past_due' },
  });

  // Create failed invoice record
  await db.invoice.create({
    data: {
      subscriptionId: subscription.id,
      amount: (invoice.amount_due / 100),
      currency: invoice.currency || 'eur',
      status: 'failed',
      stripeInvoiceId: invoice.id,
    },
  });
}

/**
 * Seed default plans into the database
 */
export async function seedPlans() {
  for (const [name, config] of Object.entries(PLANS)) {
    await db.plan.upsert({
      where: { name },
      create: {
        name: config.name,
        displayName: config.displayName,
        priceMonthly: config.priceMonthly,
        priceYearly: config.priceYearly,
        currency: config.currency,
        features: JSON.stringify(config.features),
        maxAgents: config.quotas.maxAgents,
        maxConversations: config.quotas.maxConversations,
        maxDocuments: config.quotas.maxDocuments,
        maxTokensPerMonth: config.quotas.maxTokensPerMonth,
        maxTeamMembers: config.quotas.maxTeamMembers,
        maxFileUploadMb: config.quotas.maxFileUploadMb,
        allowCustomAgents: config.quotas.allowCustomAgents,
        allowWebBuilder: config.quotas.allowWebBuilder,
        allowApiAccess: config.quotas.allowApiAccess,
        allowPriority: config.quotas.allowPriority,
        allowWhiteLabel: config.quotas.allowWhiteLabel,
      },
      update: {
        displayName: config.displayName,
        priceMonthly: config.priceMonthly,
        priceYearly: config.priceYearly,
        features: JSON.stringify(config.features),
        maxAgents: config.quotas.maxAgents,
        maxConversations: config.quotas.maxConversations,
        maxDocuments: config.quotas.maxDocuments,
        maxTokensPerMonth: config.quotas.maxTokensPerMonth,
        maxTeamMembers: config.quotas.maxTeamMembers,
        maxFileUploadMb: config.quotas.maxFileUploadMb,
        allowCustomAgents: config.quotas.allowCustomAgents,
        allowWebBuilder: config.quotas.allowWebBuilder,
        allowApiAccess: config.quotas.allowApiAccess,
        allowPriority: config.quotas.allowPriority,
        allowWhiteLabel: config.quotas.allowWhiteLabel,
      },
    });
  }

  // Create free subscription for users without one
  const freePlan = await db.plan.findUnique({ where: { name: 'free' } });
  if (freePlan) {
    const usersWithoutSub = await db.user.findMany({
      where: { subscription: null },
    });

    for (const user of usersWithoutSub) {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      await db.subscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: endOfMonth,
          billingInterval: 'monthly',
        },
      });
    }
  }
}
