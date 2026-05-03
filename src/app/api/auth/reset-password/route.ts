<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { formatErrorResponse, BadRequestError } from '@/lib/api-errors'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = resetPasswordSchema.safeParse(body)
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

    const { token, password } = result.data

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      const demo = getDemoService()
      const demoResult = await demo.resetPassword(token, password)

      if (!demoResult.success) {
        throw new BadRequestError(demoResult.message || 'Invalid or expired reset token')
      }

      return NextResponse.json({
        success: true,
        data: {
          ...demoResult.data,
          demoMode: true,
        },
      })
    }

    // --- Database path ---
    // Find the reset token
    const resetToken = await prisma.passwordReset.findUnique({ where: { token } })
    if (!resetToken) {
      throw new BadRequestError('Invalid or expired reset token')
    }

    // Check if token is expired or already used
    if (resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestError('Reset token has expired. Please request a new one.')
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update user password and mark token as used in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      })

      await tx.passwordReset.update({
        where: { id: resetToken.id },
        data: { used: true },
      })

      // Invalidate all refresh tokens (force re-login)
      await tx.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      })

      // Delete all sessions
      await tx.session.deleteMany({
        where: { userId: resetToken.userId },
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: resetToken.userId,
          action: 'PASSWORD_RESET',
          resource: 'User',
          resourceId: resetToken.userId,
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Password has been reset successfully. Please log in with your new password.' },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
=======
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jwtVerify } from "jose";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { isStrongPassword } from "@/lib/security";
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
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Jeton et nouveau mot de passe requis" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordCheck = isStrongPassword(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    // Verify the reset token
    const secret = getSecret();
    let payload: { userId: string; purpose: string };

    try {
      const { payload: decoded } = await jwtVerify(token, secret, {
        issuer: "datasphere-agents-reset",
        audience: "datasphere-password-reset",
      });
      payload = decoded as { userId: string; purpose: string };
    } catch (_e) {
      return NextResponse.json(
        { error: "Le lien de réinitialisation est invalide ou a expiré" },
        { status: 400 }
      );
    }

    // Verify purpose
    if (payload.purpose !== "password_reset") {
      return NextResponse.json(
        { error: "Jeton invalide" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Hash and update the password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Store notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: "Mot de passe modifié",
        message: "Votre mot de passe a été modifié avec succès. Si vous n'êtes pas à l'origine de cette action, contactez immédiatement le support.",
        type: "warning",
      },
    });

    // Audit log
    await auditLog({
      userId: user.id,
      action: "user.password_reset_complete",
      entity: "User",
      entityId: user.id,
    });

    console.log(`[RESET-PASSWORD] Password reset completed for user: ${user.email}`);

    return NextResponse.json({
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe" },
      { status: 500 }
    );
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
  }
}
