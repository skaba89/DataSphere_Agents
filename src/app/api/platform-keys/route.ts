import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { createHash, randomBytes } from "crypto";

// GET /api/platform-keys — list user's platform API keys (masked)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const keys = await db.platformApiKey.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "desc" },
    });

    // Return keys without keyHash — NEVER expose the hash
    const safeKeys = keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: JSON.parse(k.permissions),
      isActive: k.isActive,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
    }));

    return NextResponse.json({ keys: safeKeys });
  } catch (error) {
    console.error("PlatformKeys list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/platform-keys — create a new platform API key
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: "Corps de la requête invalide" },
        { status: 400 }
      );
    }

    const { name, permissions, expiresAt } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Nom de la clé requis" },
        { status: 400 }
      );
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: "Permissions requises (tableau non vide)" },
        { status: 400 }
      );
    }

    // Validate permissions values
    const validPermissions = ["read", "write", "chat", "admin"];
    const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json(
        { error: `Permissions invalides: ${invalidPerms.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate expiration date if provided
    let expiresAtDate: Date | null = null;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { error: "Date d'expiration invalide" },
          { status: 400 }
        );
      }
      if (expiresAtDate <= new Date()) {
        return NextResponse.json(
          { error: "La date d'expiration doit être dans le futur" },
          { status: 400 }
        );
      }
    }

    // Generate a random API key: ds_live_<32_random_hex_chars>
    const randomHex = randomBytes(16).toString("hex"); // 32 hex chars
    const plainKey = `ds_live_${randomHex}`;
    const keyPrefix = "ds_live_";
    const keyHash = createHash("sha256").update(plainKey).digest("hex");

    // Store in database
    const record = await db.platformApiKey.create({
      data: {
        userId: payload.userId,
        name: name.trim(),
        keyHash,
        keyPrefix,
        permissions: JSON.stringify(permissions),
        expiresAt: expiresAtDate,
        isActive: true,
      },
    });

    // Record audit log
    await auditLog({
      userId: payload.userId,
      action: "platform_key.create",
      entity: "PlatformApiKey",
      entityId: record.id,
      details: {
        name: name.trim(),
        permissions,
        expiresAt: expiresAtDate,
      },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    // Return the plain text key ONLY on creation (never again)
    return NextResponse.json({
      id: record.id,
      name: record.name,
      key: plainKey, // This is the only time the full key is returned
      keyPrefix: record.keyPrefix,
      permissions,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    });
  } catch (error) {
    console.error("PlatformKey create error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/platform-keys — revoke a platform API key
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: "Corps de la requête invalide" },
        { status: 400 }
      );
    }

    const { keyId } = body;

    if (!keyId || typeof keyId !== "string") {
      return NextResponse.json(
        { error: "keyId requis" },
        { status: 400 }
      );
    }

    // Find the key and verify ownership
    const existingKey = await db.platformApiKey.findUnique({
      where: { id: keyId },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: "Clé introuvable" },
        { status: 404 }
      );
    }

    // Only allow deleting own keys
    if (existingKey.userId !== payload.userId) {
      return NextResponse.json(
        { error: "Non autorisé — vous ne pouvez supprimer que vos propres clés" },
        { status: 403 }
      );
    }

    // Delete the key
    await db.platformApiKey.delete({
      where: { id: keyId },
    });

    // Record audit log
    await auditLog({
      userId: payload.userId,
      action: "platform_key.revoke",
      entity: "PlatformApiKey",
      entityId: keyId,
      details: {
        name: existingKey.name,
        keyPrefix: existingKey.keyPrefix,
      },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Clé platform "${existingKey.name}" révoquée avec succès`,
    });
  } catch (error) {
    console.error("PlatformKey delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
