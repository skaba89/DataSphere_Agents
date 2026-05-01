'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">DS</span>
              </div>
              <span className="text-xl font-bold">DataSphere Agents</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-muted rounded-full px-4 py-1.5 text-sm mb-8">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground">Phase 10 — Now in Production</span>
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                Build & Manage
                <span className="block text-primary">Intelligent AI Agents</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                DataSphere Agents is a full-stack SaaS platform for creating, deploying, and
                monitoring AI-powered agents. Connect any LLM provider, automate workflows,
                and scale with confidence.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-lg"
                >
                  Start Free Trial
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto border border-border px-8 py-3.5 rounded-lg font-medium hover:bg-muted transition-colors text-lg"
                >
                  Explore Features
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A comprehensive platform with all the tools to build, deploy, and manage AI agents at scale.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🤖',
                title: 'Multi-Provider AI',
                description: 'Connect OpenAI, Anthropic, Google, or custom LLM providers. Switch models seamlessly.',
              },
              {
                icon: '⚡',
                title: 'Real-Time Streaming',
                description: 'Server-Sent Events streaming for instant AI responses. No waiting for full completions.',
              },
              {
                icon: '🔒',
                title: 'Enterprise Security',
                description: 'JWT auth with 2FA/TOTP, role-based access, audit logging, and encryption at rest.',
              },
              {
                icon: '📊',
                title: 'Analytics Dashboard',
                description: 'Track token usage, costs, latency, and agent performance with real-time metrics.',
              },
              {
                icon: '🔄',
                title: 'Workflow Automation',
                description: 'Build multi-step agent workflows with conditional logic and parallel execution.',
              },
              {
                icon: '🔗',
                title: 'Integrations & Webhooks',
                description: 'Connect to Slack, GitHub, Jira, and more. Custom webhooks for any event.',
              },
              {
                icon: '🏢',
                title: 'Multi-Tenant',
                description: 'Organizations, teams, and role-based access control. Isolated data per tenant.',
              },
              {
                icon: '💳',
                title: 'Stripe Billing',
                description: 'Usage-based billing with Stripe. Subscriptions, invoices, and payment management.',
              },
              {
                icon: '🚀',
                title: 'Cloud Deploy',
                description: 'Deploy to Netlify + Render with one click. Docker support for self-hosting.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: '/month',
                description: 'Perfect for getting started',
                features: ['1 Agent', '100 messages/day', '1 Organization', 'Community support'],
                cta: 'Get Started',
                highlighted: false,
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                description: 'For growing teams',
                features: [
                  '10 Agents',
                  '10,000 messages/day',
                  '5 Organizations',
                  'Priority support',
                  'Analytics dashboard',
                  'Custom workflows',
                ],
                cta: 'Start Free Trial',
                highlighted: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'For large organizations',
                features: [
                  'Unlimited Agents',
                  'Unlimited messages',
                  'Unlimited Organizations',
                  '24/7 dedicated support',
                  'Custom integrations',
                  'SLA guarantee',
                  'SSO/SAML',
                ],
                cta: 'Contact Sales',
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-xl border ${
                  plan.highlighted
                    ? 'border-primary bg-primary/5 shadow-xl scale-105'
                    : 'border-border bg-card'
                }`}
              >
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 text-green-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 rounded-lg font-medium transition-opacity ${
                    plan.highlighted
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Intelligent Agents?</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join thousands of developers building AI-powered applications with DataSphere Agents.
              </p>
              <Link
                href="/register"
                className="inline-block bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-lg"
              >
                Get Started for Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">DS</span>
                </div>
                <span className="font-semibold">DataSphere</span>
              </div>
              <p className="text-muted-foreground text-sm">
                AI-Powered SaaS Platform for Intelligent Agents
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DataSphere Agents. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
