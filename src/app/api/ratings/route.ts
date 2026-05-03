import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET /api/ratings?agentId=xxx — Get ratings for an agent
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID requis" }, { status: 400 });
    }

    const ratings = await db.agentRating.findMany({
      where: { agentId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    return NextResponse.json({ ratings, avgRating, count: ratings.length });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/ratings — Rate an agent
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const { agentId, rating, review } = await req.json();

    if (!agentId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Agent ID et note (1-5) requis" }, { status: 400 });
    }

    // Upsert rating (one per user per agent)
    const existing = await db.agentRating.findUnique({
      where: { userId_agentId: { userId: payload.userId, agentId } },
    });

    let agentRating;
    if (existing) {
      agentRating = await db.agentRating.update({
        where: { id: existing.id },
        data: { rating, review: review || null },
      });
    } else {
      agentRating = await db.agentRating.create({
        data: {
          userId: payload.userId,
          agentId,
          rating,
          review: review || null,
        },
      });
    }

    // Update agent's average rating
    const allRatings = await db.agentRating.findMany({ where: { agentId } });
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await db.agent.update({
      where: { id: agentId },
      data: {
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount: allRatings.length,
      },
    });

    return NextResponse.json({ rating: agentRating, avgRating });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
