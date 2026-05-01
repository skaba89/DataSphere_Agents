import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

const VALID_TYPES = ["users", "agents", "conversations", "usage", "audit"] as const;
type ExportType = (typeof VALID_TYPES)[number];

// GET /api/admin/export?type=users|agents|conversations|usage|audit
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload || !isAdmin(payload.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ExportType | null;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Type invalide. Types valides : ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    let data: any;

    switch (type) {
      case "users":
        data = await db.user.findMany({
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      case "agents":
        data = await db.agent.findMany({
          select: {
            id: true,
            name: true,
            type: true,
            isDefault: true,
            isActive: true,
            avgRating: true,
            totalConversations: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      case "conversations":
        data = await db.conversation.findMany({
          select: {
            id: true,
            userId: true,
            agentId: true,
            title: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      case "usage":
        data = await db.usageEvent.findMany({
          select: {
            id: true,
            userId: true,
            eventType: true,
            tokensUsed: true,
            provider: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        break;

      case "audit":
        data = await db.auditLog.findMany({
          select: {
            id: true,
            userId: true,
            action: true,
            entity: true,
            createdAt: true,
            ipAddress: true,
          },
          orderBy: { createdAt: "desc" },
        });
        break;
    }

    // Record audit log
    await auditLog({
      userId: payload.userId,
      action: "admin.export_data",
      entity: "Export",
      details: { type, recordCount: data.length },
    });

    const date = new Date().toISOString().split("T")[0];
    const filename = `datasphere-export-${type}-${date}.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
