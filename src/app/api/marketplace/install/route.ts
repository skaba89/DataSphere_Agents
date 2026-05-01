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

    const { sharedAgentId } = await req.json();
    if (!sharedAgentId) {
      return NextResponse.json({ error: "SharedAgent ID requis" }, { status: 400 });
    }

    const shared = await db.sharedAgent.findUnique({ where: { id: sharedAgentId } });
    if (!shared) {
      return NextResponse.json({ error: "Agent non trouvé sur le marketplace" }, { status: 404 });
    }

    // Create a new agent from the shared one
    const agent = await db.agent.create({
      data: {
        name: shared.name,
        description: shared.description,
        type: shared.type,
        systemPrompt: shared.systemPrompt,
        icon: shared.icon,
        color: shared.color,
        isDefault: false,
        creatorId: payload.userId,
      },
    });

    // Increment downloads
    await db.sharedAgent.update({
      where: { id: sharedAgentId },
      data: { downloads: { increment: 1 } },
    });

    return NextResponse.json({ agent });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
