import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getUserUsageStats, getMonthlyTokenUsage } from "@/lib/saas/quotas";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const stats = await getUserUsageStats(payload.userId);

    // Get daily usage for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyUsage = await db.usageEvent.groupBy({
      by: ['eventType'],
      where: {
        userId: payload.userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { tokensUsed: true },
      _count: true,
    });

    // Get usage by day for chart
    const dailyTokens = await db.$queryRaw<Array<{ date: string; tokens: number; count: number }>>`
      SELECT date(createdAt) as date, SUM(tokensUsed) as tokens, COUNT(*) as count
      FROM UsageEvent
      WHERE userId = ${payload.userId} AND createdAt >= ${thirtyDaysAgo}
      GROUP BY date(createdAt)
      ORDER BY date(createdAt) ASC
    `;

    return NextResponse.json({
      plan: stats.planName,
      subscription: stats.subscription ? {
        status: stats.subscription.status,
        currentPeriodEnd: stats.subscription.currentPeriodEnd,
      } : null,
      usage: stats.usage,
      breakdown: dailyUsage.map(d => ({
        eventType: d.eventType,
        tokens: d._sum.tokensUsed || 0,
        count: d._count,
      })),
      dailyTokens: dailyTokens.map(d => ({
        date: d.date,
        tokens: Number(d.tokens),
        count: Number(d.count),
      })),
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des statistiques" },
      { status: 500 }
    );
  }
}
