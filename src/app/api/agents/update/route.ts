import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function PUT(request: Request) {
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

    const { id, name, description, type, systemPrompt, icon, color } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID de l'agent requis" }, { status: 400 });
    }

    const existing = await db.agent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
    }

    // Only creator or admin can update
    if (existing.creatorId && existing.creatorId !== payload.userId && payload.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé à modifier cet agent" }, { status: 403 });
    }

    const agent = await db.agent.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(type && { type }),
        ...(systemPrompt && { systemPrompt }),
        ...(icon && { icon }),
        ...(color && { color }),
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Agent update error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'agent" },
      { status: 500 }
    );
  }
}
