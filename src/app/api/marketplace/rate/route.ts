import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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

    const { sharedAgentId, rating } = await req.json();
    if (!sharedAgentId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "sharedAgentId et note (1-5) requis" }, { status: 400 });
    }

    const shared = await db.sharedAgent.findUnique({ where: { id: sharedAgentId } });
    if (!shared) {
      return NextResponse.json({ error: "Agent non trouvé" }, { status: 404 });
    }

    const newRatingCount = shared.ratingCount + 1;
    const newRating = ((shared.rating * shared.ratingCount) + rating) / newRatingCount;

    const updated = await db.sharedAgent.update({
      where: { id: sharedAgentId },
      data: {
        rating: Math.round(newRating * 10) / 10,
        ratingCount: newRatingCount,
      },
    });

    return NextResponse.json({ agent: updated });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
