import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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

    // Get total revenue
    const totalResult = await db.transaction.aggregate({
      _sum: { amount: true },
      _count: true,
    });

    // Get today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResult = await db.transaction.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { createdAt: { gte: today } },
    });

    // Get monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTransactions = await db.transaction.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      orderBy: { createdAt: "asc" },
    });

    // Group by month
    const monthlyData: Record<string, number> = {};
    monthlyTransactions.forEach((t) => {
      const monthKey = t.createdAt.toISOString().slice(0, 7);
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + t.amount;
    });

    const chartData = Object.entries(monthlyData).map(([month, total]) => ({
      month,
      total: Math.round(total),
    }));

    // Get user stats
    const userCount = await db.user.count();
    const agentCount = await db.agent.count();
    const documentCount = await db.document.count();

    // Get recent transactions
    const recentTransactions = await db.transaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({
      totalRevenue: totalResult._sum.amount || 0,
      totalTransactions: totalResult._count,
      todayRevenue: todayResult._sum.amount || 0,
      todayTransactions: todayResult._count,
      chartData,
      userCount,
      agentCount,
      documentCount,
      recentTransactions,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement du dashboard" },
      { status: 500 }
    );
  }
}
