<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { generateRandomToken } from '@/lib/auth'
import { formatErrorResponse } from '@/lib/api-errors'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = forgotPasswordSchema.safeParse(body)
    if (!result.success) {
      const errors: Record<string, string[]> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path.join('.')
        if (!errors[key]) errors[key] = []
        errors[key].push(issue.message)
      })
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors } },
        { status: 422 }
      )
    }

    const { email } = result.data

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      const demo = getDemoService()
      const demoResult = await demo.forgotPassword(email)

      return NextResponse.json({
        success: true,
        data: {
          ...demoResult.data,
          demoMode: true,
        },
      })
    }

    // --- Database path ---
    // Find user (but don't reveal if user exists for security)
    const user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // Invalidate any existing password reset tokens
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      })

      // Create new password reset token
      const token = generateRandomToken()
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      })

      // In production, send email with reset link
      // For development, we return the token
      console.log(`Password reset token for ${email}: ${token}`)
    }

    // Always return success to prevent user enumeration
    return NextResponse.json({
      success: true,
      data: {
        message: 'If an account with this email exists, a password reset link has been sent.',
        // In development, include the token for testing
        ...(process.env.NODE_ENV === 'development' && user ? { resetToken: (await prisma.passwordReset.findFirst({ where: { userId: user.id, used: false }, orderBy: { createdAt: 'desc' } }))?.token } : {}),
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
=======
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SignJWT } from "jose";
import { createHash } from "crypto";
import { checkRateLimit, isValidEmail } from "@/lib/security";
import { sendEmail, emailTemplates } from "@/lib/email";
import { auditLog } from "@/lib/audit";

function getSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) {
    return new TextEncoder().encode(envSecret);
  }
  const fallbackSource = [
    process.env.DATABASE_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
    "datasphere-2024-secure-fallback",
  ].join("|");
  const hash = createHash("sha256").update(fallbackSource).digest("hex");
  return new TextEncoder().encode(hash.slice(0, 32));
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 attempts per minute
    if (!checkRateLimit(request, 3)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer dans une minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = (body.email || "").trim().slice(0, 254);

    if (!email) {
      return NextResponse.json(
        { error: "Adresse email requise" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Find user by email (always return success to prevent email enumeration)
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal that the user doesn't exist
      console.log(`[FORGOT-PASSWORD] No account found for: ${email}`);
      return NextResponse.json({
        message: "Si un compte existe avec cette adresse email, un lien de réinitialisation a été envoyé.",
      });
    }

    // Generate a reset token (JWT with 1-hour expiry)
    const secret = getSecret();
    const resetToken = await new SignJWT({
      userId: user.id,
      purpose: "password_reset",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setIssuer("datasphere-agents-reset")
      .setAudience("datasphere-password-reset")
      .sign(secret);

    // Send the email
    const template = emailTemplates.passwordReset(resetToken, user.name);
    const emailResult = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!emailResult.success) {
      console.error("[FORGOT-PASSWORD] Failed to send email:", emailResult.error);
    }

    // Store a notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: "Demande de réinitialisation",
        message: "Une demande de réinitialisation de mot de passe a été envoyée à votre adresse email.",
        type: "info",
      },
    });

    // Audit log
    await auditLog({
      userId: user.id,
      action: "user.password_reset_request",
      entity: "User",
      entityId: user.id,
    });

    console.log(`[FORGOT-PASSWORD] Reset email sent to: ${email}`);

    return NextResponse.json({
      message: "Si un compte existe avec cette adresse email, un lien de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la demande de réinitialisation" },
      { status: 500 }
    );
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
  }
}
