import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

// GET /api/admin/users — List all users with stats
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload || !hasPermission(payload.role, PERMISSIONS.USERS_LIST)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
            documents: true,
            usageEvents: true,
          },
        },
        subscription: {
          include: { plan: { select: { name: true, displayName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH /api/admin/users — Update user (role change, suspend/activate)
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const { userId, role, isActive } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "ID utilisateur requis" }, { status: 400 });
    }

    // Prevent self-modification of role
    if (userId === payload.userId && role && role !== payload.role) {
      return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle" }, { status: 400 });
    }

    const updateData: any = {};

    // Role change
    if (role !== undefined) {
      if (!hasPermission(payload.role, PERMISSIONS.USERS_ROLE_CHANGE)) {
        return NextResponse.json({ error: "Permission insuffisante pour changer les rôles" }, { status: 403 });
      }
      if (![ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
      }
      // Only super_admin can create other super_admins
      if (role === ROLES.SUPER_ADMIN && payload.role !== ROLES.SUPER_ADMIN) {
        return NextResponse.json({ error: "Seul un Super Admin peut attribuer ce rôle" }, { status: 403 });
      }
      updateData.role = role;
    }

    // Suspend/Activate
    if (isActive !== undefined) {
      if (!hasPermission(payload.role, PERMISSIONS.USERS_SUSPEND)) {
        return NextResponse.json({ error: "Permission insuffisante pour suspendre des utilisateurs" }, { status: 403 });
      }
      updateData.isActive = isActive;
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Audit log
    if (role !== undefined) {
      await auditLog({
        userId: payload.userId,
        action: "user.role_change",
        entity: "User",
        entityId: userId,
        details: { oldRole: payload.role, newRole: role },
      });
    }
    if (isActive !== undefined) {
      await auditLog({
        userId: payload.userId,
        action: isActive ? "user.update" : "user.suspend",
        entity: "User",
        entityId: userId,
        details: { isActive },
      });
    }

    return NextResponse.json({ user });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/admin/users — Delete a user
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload || !hasPermission(payload.role, PERMISSIONS.USERS_DELETE)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    // Prevent self-deletion
    if (id === payload.userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }

    // Delete related data in order
    await db.notification.deleteMany({ where: { userId: id } });
    await db.auditLog.deleteMany({ where: { userId: id } });
    await db.agentRating.deleteMany({ where: { userId: id } });
    await db.chatMessage.deleteMany({ where: { conversation: { userId: id } } });
    await db.conversation.deleteMany({ where: { userId: id } });
    await db.document.deleteMany({ where: { userId: id } });
    await db.transaction.deleteMany({ where: { userId: id } });
    await db.usageEvent.deleteMany({ where: { userId: id } });
    await db.platformApiKey.deleteMany({ where: { userId: id } });
    await db.aiProviderKey.deleteMany({ where: { userId: id } });
    await db.subscription.deleteMany({ where: { userId: id } });
    await db.organizationMember.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });

    await auditLog({
      userId: payload.userId,
      action: "user.delete",
      entity: "User",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
