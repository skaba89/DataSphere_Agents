'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2, XCircle, Loader2, User } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (password.length === 0) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' }
  if (score <= 3) return { level: 2, label: 'Medium', color: 'bg-amber-500' }
  return { level: 3, label: 'Strong', color: 'bg-emerald-500' }
}

function DecorativePanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-600 to-cyan-600">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { top: '6%', left: '20%', size: '5px', duration: '16s', delay: '1s', dx: '35px', dy: '-70px', rot: '150deg' },
          { top: '25%', left: '65%', size: '7px', duration: '19s', delay: '3s', dx: '-45px', dy: '-85px', rot: '200deg' },
          { top: '40%', left: '15%', size: '4px', duration: '21s', delay: '0s', dx: '55px', dy: '-55px', rot: '120deg' },
          { top: '55%', left: '75%', size: '6px', duration: '17s', delay: '5s', dx: '-25px', dy: '-95px', rot: '280deg' },
          { top: '70%', left: '35%', size: '5px', duration: '15s', delay: '2s', dx: '40px', dy: '-60px', rot: '330deg' },
          { top: '85%', left: '85%', size: '4px', duration: '22s', delay: '7s', dx: '-50px', dy: '-45px', rot: '60deg' },
          { top: '15%', left: '45%', size: '3px', duration: '18s', delay: '4s', dx: '20px', dy: '-80px', rot: '240deg' },
          { top: '90%', left: '55%', size: '6px', duration: '14s', delay: '6s', dx: '-35px', dy: '-70px', rot: '180deg' },
        ].map((p, i) => (
          <div
            key={i}
            className="auth-particle"
            style={{
              top: p.top,
              left: p.left,
              '--p-size': p.size,
              '--p-duration': p.duration,
              '--p-delay': p.delay,
              '--drift-x': p.dx,
              '--drift-y': p.dy,
              '--drift-rotate': p.rot,
              '--p-color': 'rgba(255,255,255,0.25)',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center px-12 w-full">
        <div className="animate-auth-slide-up max-w-md text-center">
          <div className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
            <Image src="/logo.svg" alt="DataSphere Agents" width={48} height={48} className="drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            Join DataSphere
          </h2>
          <p className="text-white/75 text-lg leading-relaxed">
            Create your account and start building intelligent AI agents that transform your data into actionable insights.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 space-y-4 text-left">
            {[
              'Free tier with 1,000 agent runs/month',
              'No credit card required to start',
              'Full access to agent templates & tools',
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-auth-slide-up"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                </div>
                <span className="text-white/85 text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <div className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-[#4285F4] leading-none">G</span>
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function ValidationIndicator({ valid, show }: { valid: boolean; show: boolean }) {
  if (!show) return null
  return (
    <div className="animate-check-pop">
      {valid ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
    </div>
  )
}

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shakeError, setShakeError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const emailValid = email.length > 0 && isValidEmail(email)
  const nameValid = name.length > 0 && name.trim().length >= 2
  const confirmValid = confirmPassword.length > 0 && password === confirmPassword
  const strength = getPasswordStrength(password)

  const triggerShake = useCallback(() => {
    setShakeError(true)
    setTimeout(() => setShakeError(false), 500)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      triggerShake()
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      triggerShake()
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword, name }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!data.success) {
        const msg = data.error?.message || 'Registration failed'
        setError(msg)
        triggerShake()
        return
      }

      // Store user data
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch {
      setError('An error occurred. Please try again.')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Decorative Panel */}
      <DecorativePanel />

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 bg-gradient-to-br from-background via-background to-muted/30 relative overflow-y-auto py-8">
        {/* Mobile background particles */}
        <div className="lg:hidden absolute inset-0 pointer-events-none overflow-hidden">
          {[
            { top: '10%', left: '20%', size: '3px', duration: '16s', delay: '0s', dx: '20px', dy: '-40px', rot: '90deg', color: 'rgba(16,185,129,0.15)' },
            { top: '50%', left: '70%', size: '4px', duration: '20s', delay: '3s', dx: '-30px', dy: '-50px', rot: '180deg', color: 'rgba(16,185,129,0.1)' },
            { top: '80%', left: '30%', size: '3px', duration: '18s', delay: '6s', dx: '25px', dy: '-35px', rot: '270deg', color: 'rgba(16,185,129,0.12)' },
          ].map((p, i) => (
            <div
              key={i}
              className="auth-particle"
              style={{
                top: p.top,
                left: p.left,
                '--p-size': p.size,
                '--p-duration': p.duration,
                '--p-delay': p.delay,
                '--drift-x': p.dx,
                '--drift-y': p.dy,
                '--drift-rotate': p.rot,
                '--p-color': p.color,
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div className={`w-full max-w-md relative z-10 ${mounted ? 'animate-auth-slide-up' : ''}`}>
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Image src="/logo.svg" alt="DS" width={24} height={24} className="brightness-0 invert" />
              </div>
              <span className="text-2xl font-bold tracking-tight">DataSphere Agents</span>
            </Link>
          </div>

          {/* Card */}
          <div className={`p-8 rounded-2xl border border-border bg-card shadow-xl shadow-black/5 ${shakeError ? 'animate-shake' : ''}`}>
            <div className="flex items-center justify-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <h1 className="text-xl font-bold">Create your account</h1>
            </div>

            {/* Error display */}
            {error && (
              <div className="animate-error-slide-in p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 overflow-hidden">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Social login */}
            <div style={{ marginTop: error ? undefined : 0 }}>
              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 text-sm font-medium transition-colors"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 text-sm font-medium transition-colors"
                >
                  <GitHubIcon />
                  Continue with GitHub
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">or</span>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="mb-1.5">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="John Doe"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ValidationIndicator valid={nameValid} show={name.length > 0} />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="mb-1.5">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="you@example.com"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ValidationIndicator valid={emailValid} show={email.length > 0} />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="mb-1.5">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className="h-1.5 rounded-full flex-1 bg-muted overflow-hidden"
                        >
                          {strength.level >= level && (
                            <div
                              className={`h-full rounded-full strength-bar ${strength.color}`}
                              style={{ width: '100%' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${
                      strength.level === 1 ? 'text-red-500' :
                      strength.level === 2 ? 'text-amber-500' :
                      'text-emerald-500'
                    }`}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword" className="mb-1.5">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !confirmValid && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{' '}
                  <a href="#" className="text-primary hover:underline font-medium">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>
                </Label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </>
                )}
              </button>
            </form>

            {/* Sign in link */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
