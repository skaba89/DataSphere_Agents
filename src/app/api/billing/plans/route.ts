import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getUserUsageStats } from "@/lib/saas/quotas";
import { PLAN_LIST } from "@/lib/saas/plans";

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

    return NextResponse.json({
      plans: PLAN_LIST,
      currentPlan: stats.planName,
      subscription: stats.subscription ? {
        id: stats.subscription.id,
        status: stats.subscription.status,
        planName: stats.subscription.plan.name,
        currentPeriodEnd: stats.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: stats.subscription.cancelAtPeriodEnd,
        billingInterval: stats.subscription.billingInterval,
      } : null,
      usage: stats.usage,
    });
  } catch (error) {
    console.error("Plans API error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des plans" },
      { status: 500 }
    );
  }
}
