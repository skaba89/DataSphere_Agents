import { NextRequest } from "next/server";

// Rate limiting (in-memory, per-IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

// Plan-based rate limiting (in-memory, per-userId)
const planRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const PLAN_RATE_LIMIT_WINDOW = 60_000; // 1 minute

const PLAN_RATE_LIMITS: Record<string, number> = {
  free: 15, // 15 messages/minute
  pro: 60, // 60 messages/minute
  enterprise: 120, // 120 messages/minute
};

export function checkRateLimit(
  req: NextRequest,
  limit: number = RATE_LIMIT_MAX
): boolean {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Check plan-based rate limit for a user.
 * Returns { allowed: boolean, retryAfter?: number (seconds) }
 */
export function checkPlanRateLimit(
  userId: string,
  planName: string
): { allowed: boolean; retryAfter?: number } {
  const limit = PLAN_RATE_LIMITS[planName] || PLAN_RATE_LIMITS.free;
  const now = Date.now();
  const entry = planRateLimitMap.get(userId);

  if (!entry || now > entry.resetTime) {
    planRateLimitMap.set(userId, { count: 1, resetTime: now + PLAN_RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Input sanitization
export function sanitizeInput(
  input: string,
  maxLength: number = 10000
): string {
  if (!input || typeof input !== "string") return "";
  // Trim whitespace
  let sanitized = input.trim();
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  // Basic XSS prevention - escape HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  return sanitized;
}

// Sanitize for LLM input (no HTML escaping, but length limit and null byte removal)
export function sanitizeForLLM(
  input: string,
  maxLength: number = 5000
): string {
  if (!input || typeof input !== "string") return "";
  let sanitized = input.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  return sanitized;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isStrongPassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 6) {
    return {
      valid: false,
      message: "Le mot de passe doit contenir au moins 6 caractères",
    };
  }
  if (password.length > 128) {
    return {
      valid: false,
      message: "Le mot de passe ne peut pas dépasser 128 caractères",
    };
  }
  return { valid: true };
}

// Validate agentId format (should be a valid string, alphanumeric + dashes)
export function isValidAgentId(agentId: string): boolean {
  if (!agentId || typeof agentId !== "string") return false;
  // Allow alphanumeric, dashes, underscores (typical cuid/uuid formats)
  return /^[a-zA-Z0-9_-]+$/.test(agentId) && agentId.length <= 64;
}

// Clean up expired rate limit entries (run periodically)
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
  for (const [userId, entry] of planRateLimitMap.entries()) {
    if (now > entry.resetTime) {
      planRateLimitMap.delete(userId);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 5 * 60_000);
}
