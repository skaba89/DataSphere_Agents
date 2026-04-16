import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET /api/conversations/messages?conversationId=xxx
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "ID de conversation requis" }, { status: 400 });
    }

    // Verify ownership
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== payload.userId) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const messages = await db.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      messages,
      conversation,
    });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des messages" },
      { status: 500 }
    );
  }
}
