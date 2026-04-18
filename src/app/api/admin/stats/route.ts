import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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

    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const [users, agents, conversations, transactions, documents] = await Promise.all([
      db.user.count(),
      db.agent.count(),
      db.conversation.count(),
      db.transaction.count(),
      db.document.count(),
    ]);

    const revenueResult = await db.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "success" },
    });

    return NextResponse.json({
      users,
      agents,
      conversations,
      transactions,
      documents,
      revenue: revenueResult._sum.amount || 0,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
