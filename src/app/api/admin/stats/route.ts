import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

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

    if (!hasPermission(payload.role, PERMISSIONS.ADMIN_STATS)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Core counts
    const [users, agents, conversations, transactions, documents, subscriptions, sharedAgents, platformApiKeys] = await Promise.all([
      db.user.count(),
      db.agent.count(),
      db.conversation.count(),
      db.transaction.count(),
      db.document.count(),
      db.subscription.count({ where: { status: "active" } }),
      db.sharedAgent.count(),
      db.platformApiKey.count({ where: { isActive: true } }),
    ]);

    // Revenue
    const revenueResult = await db.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "success" },
    });

    // Users by role
    const usersByRole = await db.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    // Subscriptions by plan
    const subsByPlan = await db.subscription.findMany({
      where: { status: "active" },
      include: { plan: { select: { name: true, displayName: true, priceMonthly: true } } },
    });

    const planCounts: Record<string, { count: number; displayName: string; revenue: number }> = {};
    for (const sub of subsByPlan) {
      const planName = sub.plan?.name || 'free';
      if (!planCounts[planName]) {
        planCounts[planName] = { count: 0, displayName: sub.plan?.displayName || planName, revenue: 0 };
      }
      planCounts[planName].count++;
      planCounts[planName].revenue += sub.plan?.priceMonthly || 0;
    }

    // Monthly recurring revenue
    const mrr = Object.values(planCounts).reduce((sum, p) => sum + p.revenue, 0);

    // Usage stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageByType = await db.usageEvent.groupBy({
      by: ['eventType'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _sum: { tokensUsed: true },
      _count: true,
    });

    const totalTokens30d = usageByType.reduce((sum, u) => sum + (u._sum.tokensUsed || 0), 0);
    const totalEvents30d = usageByType.reduce((sum, u) => sum + u._count, 0);

    // New users last 30 days
    const newUsers30d = await db.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // Active users last 7 days (users with at least one conversation)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers7d = await db.conversation.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // Top agents by conversations
    const topAgents = await db.agent.findMany({
      take: 5,
      include: { _count: { select: { conversations: true } } },
      orderBy: { totalConversations: 'desc' },
    });

    // Daily signups for last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailySignups = await db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT date(createdAt) as date, COUNT(*) as count
      FROM User
      WHERE createdAt >= ${fourteenDaysAgo}
      GROUP BY date(createdAt)
      ORDER BY date(createdAt) ASC
    `;

    // Daily conversations for last 14 days
    const dailyConversations = await db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT date(createdAt) as date, COUNT(*) as count
      FROM Conversation
      WHERE createdAt >= ${fourteenDaysAgo}
      GROUP BY date(createdAt)
      ORDER BY date(createdAt) ASC
    `;

    return NextResponse.json({
      // Core stats
      users,
      agents,
      conversations,
      transactions,
      documents,
      revenue: revenueResult._sum.amount || 0,

      // SaaS metrics
      activeSubscriptions: subscriptions,
      mrr,
      sharedAgents,
      platformApiKeys,

      // Breakdowns
      usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
      planCounts,
      usageByType: usageByType.map(u => ({
        eventType: u.eventType,
        tokens: u._sum.tokensUsed || 0,
        count: u._count,
      })),

      // Growth metrics
      totalTokens30d,
      totalEvents30d,
      newUsers30d,
      activeUsers7d: activeUsers7d.length,

      // Charts
      topAgents: topAgents.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        conversations: a._count.conversations,
        avgRating: a.avgRating,
        totalConversations: a.totalConversations,
      })),
      dailySignups: dailySignups.map(d => ({ date: d.date, count: Number(d.count) })),
      dailyConversations: dailyConversations.map(d => ({ date: d.date, count: Number(d.count) })),
    });
  } catch (_e) {
    console.error('Admin stats error:', _e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
