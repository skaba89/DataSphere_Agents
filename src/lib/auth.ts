import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production-32chars'
const JWT_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRES_IN = '7d'

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate a JWT access token
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'datasphere-agents',
    audience: 'datasphere-agents-api',
  })
}

/**
 * Generate a JWT refresh token
 */
export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'datasphere-agents',
    audience: 'datasphere-agents-refresh',
  })
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JwtPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'datasphere-agents',
    }) as JwtPayload
    return decoded
  } catch {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Generate a random token for email verification, password reset, etc.
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a TOTP secret for 2FA
 */
export function generateTwoFactorSecret(): string {
  return crypto.randomBytes(20).toString('base64')
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}

/**
 * Get user from request Authorization header
 */
export function getUserFromRequest(authHeader: string | null): JwtPayload | null {
  const token = extractBearerToken(authHeader)
  if (!token) return null

  try {
    return verifyToken(token)
  } catch {
    return null
  }
}

/**
 * Generate API key with prefix
 */
export function generateApiKey(_name: string): string {
  const prefix = 'dsa'
  const key = crypto.randomBytes(24).toString('hex')
  return `${prefix}_${key}`
}
