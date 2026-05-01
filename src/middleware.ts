import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting store (in-memory, per-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 100

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return ip
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }
  record.count++
  return record.count > RATE_LIMIT_MAX
}

// Simple JWT check for Edge Runtime (without importing jsonwebtoken)
// This only checks if the token exists and has a valid structure
// Full verification happens in the API routes
function hasValidTokenStructure(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    // Decode payload to check expiry
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) return false
    return true
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const key = getRateLimitKey(request)

    if (isRateLimited(key)) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      )
    }

    // CORS
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'http://localhost:3000',
      'https://datasphere-agents.netlify.app',
      'https://datasphere-agents.onrender.com',
    ]
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '86400')
    }

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')

    // Auth check for protected API routes
    const publicApiRoutes = [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-email',
      '/api/auth/refresh',
      '/api/webhooks/stripe',
      '/api/subscriptions/plans',
    ]

    const isPublicApi = publicApiRoutes.some(
      (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
    )

    if (!isPublicApi) {
      const authHeader = request.headers.get('authorization')
      const accessToken = request.cookies.get('access-token')?.value
      const token = authHeader?.replace('Bearer ', '') || accessToken

      if (!token || !hasValidTokenStructure(token)) {
        return new NextResponse(
          JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  // Protected page routes
  const protectedPaths = ['/dashboard', '/agents', '/conversations', '/settings', '/projects']
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath) {
    const accessToken = request.cookies.get('access-token')?.value
    if (!accessToken || !hasValidTokenStructure(accessToken)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.cookies.set('access-token', '', { maxAge: 0, path: '/' })
      redirectResponse.cookies.set('refresh-token', '', { maxAge: 0, path: '/' })
      return redirectResponse
    }
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname === path)

  if (isAuthPath) {
    const accessToken = request.cookies.get('access-token')?.value
    if (accessToken && hasValidTokenStructure(accessToken)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/agents/:path*',
    '/conversations/:path*',
    '/settings/:path*',
    '/projects/:path*',
    '/login',
    '/register',
  ],
}
