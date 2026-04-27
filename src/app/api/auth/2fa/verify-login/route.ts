import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTempToken, signToken } from "@/lib/auth";
import { verifyTOTP, verifyBackupCode, parseBackupCodes } from "@/lib/totp";
import { auditLog } from "@/lib/audit";

/**
 * POST /api/auth/2fa/verify-login
 * Complete login with 2FA code after password verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempToken, code } = body as { tempToken: string; code: string };

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: "Token temporaire et code requis" },
        { status: 400 }
      );
    }

    // Verify the temp token
    const tempPayload = await verifyTempToken(tempToken);
    if (!tempPayload || !tempPayload.twoFactorPending) {
      return NextResponse.json(
        { error: "Token temporaire invalide ou expiré" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: tempPayload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA non activé pour cet utilisateur" },
        { status: 400 }
      );
    }

    let codeValid = false;
    let usedBackupCode = false;

    // Check TOTP code
    if (verifyTOTP(user.twoFactorSecret, code)) {
      codeValid = true;
    } else {
      // Check backup code
      const hashedCodes = parseBackupCodes(user.twoFactorBackupCodes);
      const backupIndex = verifyBackupCode(hashedCodes, code);
      if (backupIndex >= 0) {
        codeValid = true;
        usedBackupCode = true;
        // Remove the used backup code
        hashedCodes.splice(backupIndex, 1);
        await db.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: JSON.stringify(hashedCodes) },
        });

        await auditLog({
          userId: user.id,
          action: "user.2fa_backup_used",
          entity: "User",
          entityId: user.id,
        });
      }
    }

    if (!codeValid) {
      return NextResponse.json(
        { error: "Code invalide" },
        { status: 400 }
      );
    }

    // Update last login time
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate full auth token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Audit log for login
    await auditLog({
      userId: user.id,
      action: "user.login_2fa",
      entity: "User",
      entityId: user.id,
      details: JSON.stringify({ usedBackupCode }),
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("2FA verify-login error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification 2FA" },
      { status: 500 }
    );
  }
}
