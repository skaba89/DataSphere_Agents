import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { getAuditLogs } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    if (!hasPermission(payload.role, PERMISSIONS.ADMIN_AUDIT_LOG)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await getAuditLogs({ userId, action, entity, limit, offset });

    return NextResponse.json(result);
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
