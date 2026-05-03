import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

// GET /api/admin/agents-manage — List all agents with stats
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload || !hasPermission(payload.role, PERMISSIONS.AGENTS_LIST)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const agents = await db.agent.findMany({
      include: {
        _count: { select: { conversations: true, ratings: true } },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agents });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH /api/admin/agents-manage — Toggle agent active status
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload || !hasPermission(payload.role, PERMISSIONS.AGENTS_DISABLE)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { agentId, isActive } = await req.json();
    if (!agentId) {
      return NextResponse.json({ error: "Agent ID requis" }, { status: 400 });
    }

    const agent = await db.agent.update({
      where: { id: agentId },
      data: { isActive: isActive !== undefined ? isActive : true },
    });

    await auditLog({
      userId: payload.userId,
      action: isActive ? "agent.update" : "agent.disable",
      entity: "Agent",
      entityId: agentId,
      details: { name: agent.name, isActive },
    });

    return NextResponse.json({ agent });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/admin/agents-manage — Delete an agent
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload || !hasPermission(payload.role, PERMISSIONS.AGENTS_DELETE)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
    }

    // Delete related data
    await db.agentRating.deleteMany({ where: { agentId: id } });
    await db.chatMessage.deleteMany({ where: { conversation: { agentId: id } } });
    await db.conversation.deleteMany({ where: { agentId: id } });
    await db.agent.delete({ where: { id } });

    await auditLog({
      userId: payload.userId,
      action: "agent.delete",
      entity: "Agent",
      entityId: id,
      details: { name: agent.name },
    });

    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
