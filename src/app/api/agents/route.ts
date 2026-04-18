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

    // Get default agents + user's custom agents
    const agents = await db.agent.findMany({
      where: {
        OR: [
          { isDefault: true },
          { creatorId: payload.userId },
        ],
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Agents list error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des agents" },
      { status: 500 }
    );
  }
}
