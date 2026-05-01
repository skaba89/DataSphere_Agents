import { NextResponse } from 'next/server'

// Pricing plans configuration
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_FREE_PRICE_ID || null,
    features: [
      '1 Agent',
      '100 messages/day',
      '1 Organization',
      'Community support',
      'Basic analytics',
    ],
    limits: {
      agents: 1,
      messagesPerDay: 100,
      organizations: 1,
      teamMembers: 1,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    features: [
      '5 Agents',
      '5,000 messages/day',
      '3 Organizations',
      'Email support',
      'Analytics dashboard',
      'Custom workflows',
      'API access',
    ],
    limits: {
      agents: 5,
      messagesPerDay: 5000,
      organizations: 3,
      teamMembers: 5,
    },
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    features: [
      '25 Agents',
      '50,000 messages/day',
      '10 Organizations',
      'Priority support',
      'Advanced analytics',
      'Custom workflows',
      'API access',
      'SSO integration',
      'Audit logs',
    ],
    limits: {
      agents: 25,
      messagesPerDay: 50000,
      organizations: 10,
      teamMembers: 25,
    },
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    currency: 'usd',
    interval: 'month',
    stripePriceId: null,
    features: [
      'Unlimited Agents',
      'Unlimited messages',
      'Unlimited Organizations',
      '24/7 dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'SSO/SAML',
      'On-premise deployment',
      'Custom training',
    ],
    limits: {
      agents: -1,
      messagesPerDay: -1,
      organizations: -1,
      teamMembers: -1,
    },
  },
]

// GET /api/subscriptions/plans - Get available pricing plans
export async function GET() {
  return NextResponse.json({
    success: true,
    data: PLANS,
  })
}
