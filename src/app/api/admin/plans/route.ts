import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

// GET /api/admin/plans — List all plans with subscriber counts
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload || !hasPermission(payload.role, PERMISSIONS.PLANS_MANAGE)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const plans = await db.plan.findMany({
      include: {
        _count: { select: { subscriptions: true, organizations: true } },
      },
      orderBy: { priceMonthly: "asc" },
    });

    return NextResponse.json({ plans });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
