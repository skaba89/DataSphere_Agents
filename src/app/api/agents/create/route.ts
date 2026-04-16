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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de la requête invalide" },
        { status: 400 }
      );
    }

    const { name, description, type, systemPrompt, icon, color } = body;

    if (!name || !description || !systemPrompt) {
      return NextResponse.json(
        { error: "Nom, description et prompt système sont requis" },
        { status: 400 }
      );
    }

    // Validate string lengths
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Le nom ne doit pas dépasser 100 caractères" },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        { error: "La description ne doit pas dépasser 500 caractères" },
        { status: 400 }
      );
    }

    if (systemPrompt.length > 5000) {
      return NextResponse.json(
        { error: "Le prompt système ne doit pas dépasser 5000 caractères" },
        { status: 400 }
      );
    }

    const agent = await db.agent.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        type: type || "custom",
        systemPrompt: systemPrompt.trim(),
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
      { error: "Erreur lors de la création de l'agent. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
