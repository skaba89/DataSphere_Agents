import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(request: Request) {
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

    const { name, description, type, systemPrompt, icon, color } = await request.json();

    if (!name || !description || !systemPrompt) {
      return NextResponse.json(
        { error: "Nom, description et prompt système sont requis" },
        { status: 400 }
      );
    }

    const agent = await db.agent.create({
      data: {
        name,
        description,
        type: type || "custom",
        systemPrompt,
        icon: icon || "Bot",
        color: color || "emerald",
        isDefault: false,
        creatorId: payload.userId,
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Agent create error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'agent" },
      { status: 500 }
    );
  }
}
