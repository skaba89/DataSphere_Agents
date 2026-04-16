import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

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

    const { agentId, message } = await request.json();

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "Agent ID et message requis" },
        { status: 400 }
      );
    }

    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json(
        { error: "Agent introuvable" },
        { status: 404 }
      );
    }

    // Save user message
    await db.chatMessage.create({
      data: {
        userId: payload.userId,
        agentId,
        role: "user",
        content: message,
      },
    });

    // Get recent conversation context
    const recentMessages = await db.chatMessage.findMany({
      where: { userId: payload.userId, agentId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const conversationHistory = recentMessages
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Call AI via z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: agent.systemPrompt },
        ...conversationHistory,
      ],
    });

    const assistantContent =
      completion.choices?.[0]?.message?.content ||
      "Désolé, je n'ai pas pu générer une réponse.";

    // Save assistant response
    await db.chatMessage.create({
      data: {
        userId: payload.userId,
        agentId,
        role: "assistant",
        content: assistantContent,
      },
    });

    return NextResponse.json({ response: assistantContent });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chat avec l'agent" },
      { status: 500 }
    );
  }
}
