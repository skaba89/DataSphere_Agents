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
}
