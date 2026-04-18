import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation || conversation.userId !== payload.userId) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 });
    }

    const agent = await db.agent.findUnique({ where: { id: conversation.agentId } });

    const lines: string[] = [
      `DataSphere Agents — Export de Conversation`,
      ``,
      `Titre : ${conversation.title}`,
      `Agent : ${agent?.name || "Inconnu"}`,
      `Date  : ${new Date(conversation.createdAt).toLocaleString("fr-FR")}`,
      ``,
    ];

    for (const msg of conversation.messages) {
      const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const sender = msg.role === "user" ? "Vous" : agent?.name || "Agent";
      lines.push(`[${time}] ${sender}:`);
      lines.push(`${msg.content}`);
      lines.push(``);
    }

    lines.push(`Exporte le ${new Date().toLocaleString("fr-FR")} depuis DataSphere Agents`);

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="conversation-${conversationId}.txt"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
