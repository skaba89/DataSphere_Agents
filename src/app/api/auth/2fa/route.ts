import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, signToken } from "@/lib/auth";
import {
  generateSecret,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  parseBackupCodes,
  generateOtpAuthUrl,
} from "@/lib/totp";
import { auditLog } from "@/lib/audit";

// ============================================
// POST /api/auth/2fa
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "setup":
        return await handleSetup(request, body);
      case "enable":
        return await handleEnable(request, body);
      case "verify":
        return await handleVerify(request, body);
      case "disable":
        return await handleDisable(request, body);
      case "status":
        return await handleStatus(request);
      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("2FA error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'opération 2FA" },
      { status: 500 }
    );
  }
}

/**
 * Setup 2FA: Generate a new TOTP secret for the user
 */
async function handleSetup(request: NextRequest, _body: Record<string, unknown>) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (user.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA est déjà activé" },
      { status: 400 }
    );
  }

  // Generate a new secret
  const secret = generateSecret();

  // Store the secret (but don't enable 2FA yet)
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret },
  });

  // Generate otpauth URL
  const qrCodeUrl = generateOtpAuthUrl(secret, user.email);

  return NextResponse.json({
    secret,
    qrCodeUrl,
  });
}

/**
 * Enable 2FA: Verify the first code and activate 2FA
 */
async function handleEnable(request: NextRequest, body: Record<string, unknown>) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const { code } = body as { code: string };
  if (!code) {
    return NextResponse.json(
      { error: "Code requis" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (user.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA est déjà activé" },
      { status: 400 }
    );
  }

  if (!user.twoFactorSecret) {
    return NextResponse.json(
      { error: "Veuillez d'abord configurer le 2FA" },
      { status: 400 }
    );
  }

  // Verify the code
  if (!verifyTOTP(user.twoFactorSecret, code)) {
    return NextResponse.json(
      { error: "Code invalide" },
      { status: 400 }
    );
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes(8);
  const hashedBackupCodes = backupCodes.map(hashBackupCode);

  // Enable 2FA and store backup codes
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
    },
  });

  // Audit log
  await auditLog({
    userId: user.id,
    action: "user.2fa_enabled",
    entity: "User",
    entityId: user.id,
  });

  // Return backup codes (only time they're shown)
  return NextResponse.json({
    backupCodes,
  });
}

/**
 * Verify 2FA code (used during login flow)
 */
async function handleVerify(_request: NextRequest, body: Record<string, unknown>) {
  const { code, userId } = body as { code: string; userId: string };

  if (!code || !userId) {
    return NextResponse.json(
      { error: "Code et ID utilisateur requis" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ valid: false });
  }

  // Check TOTP code
  if (verifyTOTP(user.twoFactorSecret, code)) {
    return NextResponse.json({ valid: true });
  }

  // Check backup code
  const hashedCodes = parseBackupCodes(user.twoFactorBackupCodes);
  const backupIndex = verifyBackupCode(hashedCodes, code);
  if (backupIndex >= 0) {
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

    return NextResponse.json({ valid: true, usedBackupCode: true });
  }

  return NextResponse.json({ valid: false });
}

/**
 * Disable 2FA: Requires a valid code to disable
 */
async function handleDisable(request: NextRequest, body: Record<string, unknown>) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const { code } = body as { code: string };
  if (!code) {
    return NextResponse.json(
      { error: "Code requis pour désactiver le 2FA" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (!user.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA n'est pas activé" },
      { status: 400 }
    );
  }

  // Verify the code (TOTP or backup)
  let codeValid = false;
  if (user.twoFactorSecret && verifyTOTP(user.twoFactorSecret, code)) {
    codeValid = true;
  } else {
    // Check backup code
    const hashedCodes = parseBackupCodes(user.twoFactorBackupCodes);
    if (verifyBackupCode(hashedCodes, code) >= 0) {
      codeValid = true;
    }
  }

  if (!codeValid) {
    return NextResponse.json(
      { error: "Code invalide" },
      { status: 400 }
    );
  }

  // Disable 2FA and clear secret
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    },
  });

  // Audit log
  await auditLog({
    userId: user.id,
    action: "user.2fa_disabled",
    entity: "User",
    entityId: user.id,
  });

  return NextResponse.json({ success: true });
}

/**
 * Get 2FA status for the current user
 */
async function handleStatus(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  const backupCodes = parseBackupCodes(user.twoFactorBackupCodes);

  return NextResponse.json({
    enabled: user.twoFactorEnabled,
    backupCodesRemaining: backupCodes.length,
    hasSecret: !!user.twoFactorSecret,
  });
}
