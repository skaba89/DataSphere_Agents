import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de l'agent requis" }, { status: 400 });
    }

    const existing = await db.agent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
    }

    // Cannot delete default agents
    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Les agents par défaut ne peuvent pas être supprimés" },
        { status: 403 }
      );
    }

    // Only creator or admin can delete
    if (existing.creatorId && existing.creatorId !== payload.userId && payload.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé à supprimer cet agent" }, { status: 403 });
    }

    await db.agent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent delete error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'agent" },
      { status: 500 }
    );
  }
}
