'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Bot,
  Zap,
  Shield,
  BarChart3,
  RefreshCw,
  Link2,
  Building2,
  CreditCard,
  Rocket,
  ArrowRight,
  Check,
  ChevronRight,
  Key,
  Settings2,
  Activity,
  Github,
  Twitter,
  Star,
  Quote,
} from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'Multi-Provider AI',
    description: 'Connect OpenAI, Anthropic, Google, or custom LLM providers. Switch models seamlessly.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    icon: Zap,
    title: 'Real-Time Streaming',
    description: 'Server-Sent Events streaming for instant AI responses. No waiting for full completions.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    shadowColor: 'rgba(245, 158, 11, 0.15)',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'JWT auth with 2FA/TOTP, role-based access, audit logging, and encryption at rest.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    shadowColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track token usage, costs, latency, and agent performance with real-time metrics.',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    shadowColor: 'rgba(139, 92, 246, 0.15)',
  },
  {
    icon: RefreshCw,
    title: 'Workflow Automation',
    description: 'Build multi-step agent workflows with conditional logic and parallel execution.',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    shadowColor: 'rgba(6, 182, 212, 0.15)',
  },
  {
    icon: Link2,
    title: 'Integrations & Webhooks',
    description: 'Connect to Slack, GitHub, Jira, and more. Custom webhooks for any event.',
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    shadowColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    icon: Building2,
    title: 'Multi-Tenant',
    description: 'Organizations, teams, and role-based access control. Isolated data per tenant.',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    shadowColor: 'rgba(20, 184, 166, 0.15)',
  },
  {
    icon: CreditCard,
    title: 'Stripe Billing',
    description: 'Usage-based billing with Stripe. Subscriptions, invoices, and payment management.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    shadowColor: 'rgba(244, 63, 94, 0.15)',
  },
  {
    icon: Rocket,
    title: 'Cloud Deploy',
    description: 'Deploy to Netlify + Render with one click. Docker support for self-hosting.',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    shadowColor: 'rgba(249, 115, 22, 0.15)',
  },
]

const howItWorksSteps = [
  {
    step: 1,
    icon: Key,
    title: 'Connect Your AI Provider',
    description: 'Add API keys for OpenAI, Anthropic, Google, or any OpenAI-compatible provider. Secure vault storage keeps your keys safe.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    step: 2,
    icon: Settings2,
    title: 'Create & Configure Agents',
    description: 'Set up agents with custom system prompts, model selections, temperature, and tool integrations. Define workflows visually.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    step: 3,
    icon: Activity,
    title: 'Deploy & Monitor',
    description: 'Launch agents and track performance in real-time. Monitor token usage, latency, costs, and conversation quality metrics.',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
  },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    title: 'CTO at NexaFlow',
    avatar: 'SC',
    quote: 'DataSphere Agents cut our AI integration time from weeks to hours. The multi-provider support means we\'re never locked in, and the analytics dashboard is a game-changer for cost optimization.',
    rating: 5,
  },
  {
    name: 'Marcus Rodriguez',
    title: 'Lead Engineer at Synthetix Labs',
    avatar: 'MR',
    quote: 'We migrated 12 production agents to DataSphere in a single sprint. The workflow automation and real-time monitoring have reduced our incident response time by 73%.',
    rating: 5,
  },
  {
    name: 'Aisha Patel',
    title: 'VP of Engineering at CloudScale',
    avatar: 'AP',
    quote: 'The enterprise security features and multi-tenant architecture made it an easy sell to our compliance team. Best developer experience I\'ve had with an AI platform.',
    rating: 5,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.svg"
                alt="DataSphere Agents Logo"
                width={32}
                height={32}
                className="rounded-md"
                priority
              />
              <span className="text-xl font-bold tracking-tight">DataSphere Agents</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
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
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-primary/8 animate-gradient-shift" />

          {/* Floating particles */}
          <div className="particles-container">
            <div
              className="particle"
              style={{
                left: '10%',
                top: '20%',
                '--size': '4px',
                '--duration': '14s',
                '--delay': '0s',
                '--tx': '30px',
                '--ty': '-60px',
                '--particle-color': 'rgba(59, 130, 246, 0.25)',
              } as React.CSSProperties}
            />
            <div
              className="particle"
              style={{
                left: '25%',
                top: '60%',
                '--size': '3px',
                '--duration': '18s',
                '--delay': '2s',
                '--tx': '-20px',
                '--ty': '-80px',
                '--particle-color': 'rgba(139, 92, 246, 0.2)',
              } as React.CSSProperties}
            />
            <div
              className="particle"
              style={{
                left: '45%',
                top: '30%',
                '--size': '5px',
                '--duration': '16s',
                '--delay': '4s',
                '--tx': '40px',
                '--ty': '-40px',
                '--particle-color': 'rgba(16, 185, 129, 0.2)',
              } as React.CSSProperties}
            />
            <div
              className="particle"
              style={{
                left: '65%',
                top: '50%',
                '--size': '3px',
                '--duration': '20s',
                '--delay': '1s',
                '--tx': '-30px',
                '--ty': '-70px',
                '--particle-color': 'rgba(245, 158, 11, 0.2)',
              } as React.CSSProperties}
            />
            <div
              className="particle"
              style={{
                left: '80%',
                top: '25%',
                '--size': '4px',
                '--duration': '15s',
                '--delay': '3s',
                '--tx': '20px',
                '--ty': '-50px',
                '--particle-color': 'rgba(236, 72, 153, 0.2)',
              } as React.CSSProperties}
            />
            <div
              className="particle"
              style={{
                left: '55%',
                top: '70%',
                '--size': '3px',
                '--duration': '17s',
                '--delay': '5s',
                '--tx': '-40px',
                '--ty': '-30px',
                '--particle-color': 'rgba(6, 182, 212, 0.2)',
              } as React.CSSProperties}
            />
            <div
              className="particle"
              style={{
                left: '35%',
                top: '80%',
                '--size': '4px',
                '--duration': '19s',
                '--delay': '2.5s',
                '--tx': '25px',
                '--ty': '-65px',
                '--particle-color': 'rgba(59, 130, 246, 0.15)',
              } as React.CSSProperties}
            />
            <div
              className="particle"
              style={{
                left: '90%',
                top: '45%',
                '--size': '3px',
                '--duration': '13s',
                '--delay': '1.5s',
                '--tx': '-15px',
                '--ty': '-55px',
                '--particle-color': 'rgba(139, 92, 246, 0.15)',
              } as React.CSSProperties}
            />
          </div>

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
            <div className="text-center max-w-4xl mx-auto">
              {/* Status badge */}
              <div className="animate-fade-in-up inline-flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm mb-8 border border-border/50">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground">Phase 10 — Now in Production</span>
              </div>

              {/* Hero heading */}
              <h1 className="animate-fade-in-up-delay-1 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                Build & Manage
                <span className="block text-primary mt-1">Intelligent AI Agents</span>
              </h1>

              {/* Hero description */}
              <p className="animate-fade-in-up-delay-2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                DataSphere Agents is a full-stack SaaS platform for creating, deploying, and
                monitoring AI-powered agents. Connect any LLM provider, automate workflows,
                and scale with confidence.
              </p>

              {/* CTA buttons */}
              <div className="animate-fade-in-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-medium hover:opacity-90 transition-all text-lg inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto border border-border px-8 py-3.5 rounded-lg font-medium hover:bg-muted transition-colors text-lg inline-flex items-center justify-center gap-2"
                >
                  Explore Features
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>

              {/* Social proof */}
              <div className="animate-fade-in-up-delay-4 mt-10 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {['bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-cyan-500', 'bg-rose-500'].map((bg, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 ${bg} rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white`}
                    >
                      {['S', 'M', 'A', 'J', 'K'][i]}
                    </div>
                  ))}
                </div>
                <span>Trusted by <strong className="text-foreground">2,500+</strong> developers</span>
                <div className="flex items-center gap-0.5 ml-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A comprehensive platform with all the tools to build, deploy, and manage AI agents at scale.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="feature-card p-6 rounded-xl border border-border bg-card group"
                  style={
                    {
                      '--card-glow-color': feature.glowColor,
                      '--card-shadow-color': feature.shadowColor,
                      animationDelay: `${index * 0.08}s`,
                    } as React.CSSProperties
                  }
                >
                  <div className={`w-12 h-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How it Works</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Get from zero to production in three simple steps.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30" />

              {howItWorksSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.step}
                    className="relative text-center group"
                  >
                    {/* Step number badge */}
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <div className={`w-16 h-16 rounded-2xl ${step.bg} flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-7 h-7 ${step.color}`} strokeWidth={1.5} />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-20 shadow-md">
                        {step.step}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>

                    {/* Mobile connector arrow */}
                    {index < howItWorksSteps.length - 1 && (
                      <div className="md:hidden flex justify-center my-4">
                        <ArrowRight className="w-5 h-5 text-muted-foreground/40 rotate-90" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Developers</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See what engineering teams are saying about DataSphere Agents.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="testimonial-card p-6 rounded-xl border border-border bg-card relative"
              >
                <Quote className="w-8 h-8 text-primary/15 absolute top-4 right-4" />
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Start free, scale as you grow. No hidden fees.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
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
                  className={`relative p-8 rounded-xl border ${
                    plan.highlighted
                      ? 'pricing-highlight border-primary/30 bg-primary/5 shadow-xl'
                      : 'border-border bg-card'
                  }`}
                >
                  {/* Most Popular badge */}
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0" strokeWidth={2} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block text-center py-2.5 rounded-lg font-medium transition-all ${
                      plan.highlighted
                        ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-primary/8" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Build Intelligent Agents?</h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Join thousands of developers building AI-powered applications with DataSphere Agents.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-medium hover:opacity-90 transition-all text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
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
                <Image
                  src="/logo.svg"
                  alt="DataSphere Agents Logo"
                  width={24}
                  height={24}
                  className="rounded-sm"
                />
                <span className="font-semibold">DataSphere</span>
              </div>
              <p className="text-muted-foreground text-sm">
                AI-Powered SaaS Platform for Intelligent Agents
              </p>
              {/* Social links */}
              <div className="flex items-center gap-3 mt-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Twitter / X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
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
          <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} DataSphere Agents. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
