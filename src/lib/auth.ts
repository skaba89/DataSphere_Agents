<<<<<<< HEAD
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
=======
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";

// Generate a secure secret from env vars or fallback
function getSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) {
    return new TextEncoder().encode(envSecret);
  }
  // Fallback: derive a hash from other env vars for better security than a hardcoded string
  const fallbackSource = [
    process.env.DATABASE_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
    "datasphere-2024-secure-fallback",
  ].join("|");
  const hash = createHash("sha256").update(fallbackSource).digest("hex");
  return new TextEncoder().encode(hash.slice(0, 32));
}

const secret = getSecret();

// Rate limiting for token verification
const verificationAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 20;
const WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = verificationAttempts.get(identifier);

  if (!record || now - record.lastAttempt > WINDOW_MS) {
    verificationAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  record.lastAttempt = now;
  return true;
}

// Clean up rate limit entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of verificationAttempts.entries()) {
      if (now - record.lastAttempt > WINDOW_MS * 2) {
        verificationAttempts.delete(key);
      }
    }
  }, 60 * 1000);
}

export async function signToken(payload: { userId: string; email: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("datasphere-agents")
    .setAudience("datasphere-users")
    .sign(secret);
}

/**
 * Sign a short-lived temp token for 2FA verification (5 minutes)
 */
export async function signTempToken(payload: { userId: string; email: string; twoFactorPending: true }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer("datasphere-agents-2fa")
    .setAudience("datasphere-2fa-verify")
    .sign(secret);
}

/**
 * Verify a temp token for 2FA verification
 */
export async function verifyTempToken(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex").slice(0, 16);
  if (!checkRateLimit(tokenHash)) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "datasphere-agents-2fa",
      audience: "datasphere-2fa-verify",
    });

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload as { userId: string; email: string; twoFactorPending: boolean };
  } catch (_e) {
    return null;
  }
}

export async function verifyToken(token: string) {
  // Rate limit by token hash
  const tokenHash = createHash("sha256").update(token).digest("hex").slice(0, 16);
  if (!checkRateLimit(tokenHash)) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "datasphere-agents",
      audience: "datasphere-users",
    });

    // Check if token is expired (extra safety beyond jose's built-in check)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload as { userId: string; email: string; role: string };
  } catch (_e) {
    return null;
  }
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
}
