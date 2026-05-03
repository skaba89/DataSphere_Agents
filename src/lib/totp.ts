import { createHmac, randomBytes, createHash } from "crypto";

// ============================================
// Base32 Encoding/Decoding (RFC 4648)
// ============================================

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode a Buffer to a Base32 string (RFC 4648, no padding)
 */
function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

/**
 * Decode a Base32 string to a Buffer
 */
function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[=]+$/, "");
  let bits = "";
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// ============================================
// TOTP Implementation (RFC 6238)
// ============================================

const DEFAULT_TIME_STEP = 30; // 30 seconds
const DEFAULT_DIGITS = 6;

/**
 * Generate a random TOTP secret (20 bytes → Base32)
 */
export function generateSecret(): string {
  const bytes = randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Generate a TOTP code for the given secret and time
 *
 * Algorithm:
 * 1. Get current time step: floor(Date.now() / (timeStep * 1000))
 * 2. Convert time step to 8-byte buffer (big endian)
 * 3. HMAC-SHA1(secret_as_bytes, time_step_buffer)
 * 4. Dynamic truncation to get 6-digit code
 */
export function generateTOTP(
  secret: string,
  timeStep: number = DEFAULT_TIME_STEP,
  digits: number = DEFAULT_DIGITS
): string {
  const secretBytes = base32Decode(secret);

  // Calculate time step
  const currentTime = Math.floor(Date.now() / 1000);
  const counter = Math.floor(currentTime / timeStep);

  // Convert counter to 8-byte buffer (big endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  // HMAC-SHA1
  const hmac = createHmac("sha1", secretBytes).update(counterBuffer).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

/**
 * Verify a TOTP code with a time window
 * window=1 means check current step ±1 (3 codes total)
 */
export function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1
): boolean {
  const secretBytes = base32Decode(secret);
  const currentTime = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(currentTime / DEFAULT_TIME_STEP);

  for (let i = -window; i <= window; i++) {
    const counter = currentStep + i;
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

    const hmac = createHmac("sha1", secretBytes)
      .update(counterBuffer)
      .digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, DEFAULT_DIGITS);
    const generatedCode = otp.toString().padStart(DEFAULT_DIGITS, "0");

    if (generatedCode === code) {
      return true;
    }
  }
  return false;
}

// ============================================
// Backup Codes
// ============================================

/**
 * Generate backup codes (8-character alphanumeric codes)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(4);
    // Use alphanumeric characters (excluding confusing ones: 0, O, 1, I, l)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (const byte of bytes) {
      code += chars[byte % chars.length];
    }
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code using SHA-256
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Verify a backup code against a list of hashed codes
 * Returns the index of the matching code, or -1 if not found
 */
export function verifyBackupCode(
  hashedCodes: string[],
  code: string
): number {
  const codeHash = hashBackupCode(code);
  return hashedCodes.indexOf(codeHash);
}

/**
 * Parse hashed backup codes from the database JSON string
 */
export function parseBackupCodes(
  backupCodesJson: string | null
): string[] {
  if (!backupCodesJson) return [];
  try {
    return JSON.parse(backupCodesJson);
  } catch {
    return [];
  }
}

/**
 * Generate the otpauth:// URL for QR code generation
 */
export function generateOtpAuthUrl(
  secret: string,
  email: string,
  issuer: string = "DataSphere"
): string {
  return `otpauth://totp/${issuer}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
